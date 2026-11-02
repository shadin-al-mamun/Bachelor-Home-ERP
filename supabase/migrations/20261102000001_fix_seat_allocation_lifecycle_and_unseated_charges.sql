-- ==============================================================================
-- Bachelor Home ERP — Migration 20261102000001
-- File: supabase/migrations/20261102000001_fix_seat_allocation_lifecycle_and_unseated_charges.sql
-- Description:
--   1. Clean up erroneous meal charges and meal selections for unseated boarders (e.g. Hashem).
--   2. Reset unseated boarders marked 'ACTIVE' to 'PENDING'.
--   3. Upgrade fn_cancel_allocation: sets boarder status to 'LEFT' and releases seat to 'AVAILABLE'.
--   4. Upgrade fn_generate_monthly_meal_charges & fn_get_monthly_meal_billing_preview:
--      Strictly require an active seat allocation (JOIN allocations a ON a.status = 'ACTIVE').
--   5. Upgrade verify_boarder_seat_status RPC to enforce strict seat-based software access.
-- ==============================================================================

-- 1. DATA FIX: REMOVE ERRONEOUS CHARGES & SELECTIONS FOR UNSEATED BOARDERS
DELETE FROM public.boarder_charges
WHERE charge_type = 'MEAL'
  AND boarder_id IN (
      SELECT b.id 
      FROM public.boarders b
      LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
      WHERE a.id IS NULL
  );

DELETE FROM public.meal_selections
WHERE boarder_id IN (
    SELECT b.id 
    FROM public.boarders b
    LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
    WHERE a.id IS NULL
);

-- 2. DATA FIX: RESET UNSEATED BOARDERS FROM 'ACTIVE' TO 'PENDING'
UPDATE public.boarders
SET status = 'PENDING',
    updated_at = timezone('Asia/Dhaka', now())
WHERE status = 'ACTIVE'
  AND id NOT IN (
      SELECT boarder_id 
      FROM public.allocations 
      WHERE status = 'ACTIVE'
  );

-- 3. UPGRADE fn_cancel_allocation RPC: GUARANTEE STATUS 'LEFT' AND REVOKE SOFTWARE ACCESS
CREATE OR REPLACE FUNCTION public.fn_cancel_allocation(
    p_allocation_id UUID,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ENDED'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alloc public.allocations%ROWTYPE;
    v_target_status public.allocation_status;
    v_user_id UUID;
BEGIN
    SELECT * INTO v_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ রেকর্ড পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_alloc.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'এই বরাদ্দটি ইতিমধ্যে সমাপ্ত বা বাতিল অবস্থায় আছে।' USING ERRCODE = 'P0001';
    END IF;

    v_target_status := p_status::public.allocation_status;

    -- A. Update allocation to ENDED or CANCELLED
    UPDATE public.allocations
    SET status = v_target_status,
        end_date = COALESCE(p_end_date, CURRENT_DATE),
        cancellation_reason = p_reason,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_allocation_id;

    -- B. Always release seat status to AVAILABLE
    UPDATE public.seats
    SET status = 'AVAILABLE',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_alloc.seat_id;

    -- C. Update boarder status to LEFT (they no longer have an active resident seat)
    SELECT user_id INTO v_user_id 
    FROM public.boarders 
    WHERE id = v_alloc.boarder_id;

    UPDATE public.boarders
    SET status = 'LEFT',
        leaving_date = COALESCE(p_end_date, CURRENT_DATE),
        remarks = COALESCE(p_reason, remarks),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_alloc.boarder_id;

    -- D. Demote linked auth profile role to APPLICANT so resident portal is locked
    IF v_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET role = 'APPLICANT',
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_user_id AND role = 'BOARDER';
    END IF;

    -- E. Record immutable history entry
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        p_allocation_id,
        v_alloc.seat_id,
        NULL,
        CASE WHEN v_target_status = 'CANCELLED' THEN 'CANCEL' ELSE 'END' END,
        COALESCE(p_end_date, CURRENT_DATE),
        p_reason,
        auth.uid()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fn_cancel_allocation(UUID, DATE, TEXT, VARCHAR) TO authenticated, service_role;

-- 4. UPGRADE fn_get_monthly_meal_billing_preview TO STRICTLY REQUIRE ACTIVE SEAT ALLOCATION
CREATE OR REPLACE FUNCTION public.fn_get_monthly_meal_billing_preview(
    p_billing_month DATE,
    p_default_min_meals NUMERIC DEFAULT 45.0,
    p_boarder_min_overrides JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_rate RECORD;
    v_b_enabled BOOLEAN := true;
    v_l_enabled BOOLEAN := true;
    v_d_enabled BOOLEAN := true;
    v_configured_min NUMERIC := 45.0;
    v_results JSONB;
BEGIN
    v_start_date := DATE_TRUNC('month', p_billing_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;

    -- Fetch active meal rates during this month
    SELECT breakfast_rate, lunch_rate, dinner_rate
    INTO v_rate
    FROM public.meal_rates
    WHERE effective_from <= v_end_date
      AND (effective_to IS NULL OR effective_to >= v_start_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        v_rate.breakfast_rate := 26.00;
        v_rate.lunch_rate := 52.00;
        v_rate.dinner_rate := 52.00;
    END IF;

    -- Fetch meal session enabled settings and default min meals
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true),
        COALESCE(min_monthly_meals, 45.0)
    INTO v_b_enabled, v_l_enabled, v_d_enabled, v_configured_min
    FROM public.meal_settings
    LIMIT 1;

    IF p_default_min_meals IS NOT NULL AND p_default_min_meals >= 0 THEN
        v_configured_min := p_default_min_meals;
    END IF;

    WITH date_series AS (
        SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
    ),
    -- Strict inner join on allocations guarantees ONLY seated active boarders are billed
    boarder_active_days AS (
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            b.phone_number,
            b.admission_date,
            f.name AS flat_name,
            a.id AS allocation_id,
            ds.day_date
        FROM public.boarders b
        JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        JOIN public.seats s ON s.id = a.seat_id
        JOIN public.rooms r ON r.id = s.room_id
        JOIN public.flats f ON f.id = r.flat_id
        CROSS JOIN date_series ds
        WHERE b.status = 'ACTIVE'
          AND ds.day_date >= GREATEST(v_start_date, COALESCE(a.start_date, b.admission_date, v_start_date))
          AND (a.end_date IS NULL OR ds.day_date <= a.end_date)
    ),
    daily_meals AS (
        SELECT 
            bad.boarder_id,
            bad.boarder_name,
            bad.boarder_code,
            bad.phone_number,
            bad.flat_name,
            bad.allocation_id,
            bad.admission_date,
            bad.day_date,
            (COALESCE(ms.breakfast, true) AND v_b_enabled) AS b_active,
            (COALESCE(ms.lunch, true) AND v_l_enabled) AS l_active,
            (COALESCE(ms.dinner, true) AND v_d_enabled) AS d_active
        FROM boarder_active_days bad
        LEFT JOIN public.meal_selections ms 
               ON ms.boarder_id = bad.boarder_id 
              AND ms.meal_date = bad.day_date
    ),
    guest_summary AS (
        SELECT 
            gmb.boarder_id,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'BREAKFAST' THEN gmb.guest_count ELSE 0 END), 0) AS guest_breakfast,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'LUNCH' THEN gmb.guest_count ELSE 0 END), 0) AS guest_lunch,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'DINNER' THEN gmb.guest_count ELSE 0 END), 0) AS guest_dinner,
            COALESCE(SUM(gmb.total_amount), 0) AS guest_amount
        FROM public.guest_meal_bookings gmb
        WHERE gmb.meal_date >= v_start_date 
          AND gmb.meal_date <= v_end_date
          AND gmb.status = 'CONFIRMED'
        GROUP BY gmb.boarder_id
    ),
    boarder_sessions AS (
        SELECT 
            dm.boarder_id,
            dm.boarder_name,
            dm.boarder_code,
            dm.phone_number,
            dm.flat_name,
            dm.allocation_id,
            dm.admission_date,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.b_active = true) + COALESCE(gs.guest_breakfast, 0)) AS breakfast_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.l_active = true) + COALESCE(gs.guest_lunch, 0)) AS lunch_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.d_active = true) + COALESCE(gs.guest_dinner, 0)) AS dinner_sessions,
            COALESCE(gs.guest_amount, 0) AS guest_amount
        FROM daily_meals dm
        LEFT JOIN guest_summary gs ON gs.boarder_id = dm.boarder_id
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.phone_number, dm.flat_name, dm.allocation_id, dm.admission_date, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner, gs.guest_amount
    ),
    boarder_calculations AS (
        SELECT 
            bs.*,
            ((bs.breakfast_sessions * 0.5) + (bs.lunch_sessions * 1.0) + (bs.dinner_sessions * 1.0)) AS total_consumed_meals,
            COALESCE((p_boarder_min_overrides->>bs.boarder_id::text)::numeric, v_configured_min) AS boarder_min_meals,
            ((bs.breakfast_sessions * v_rate.breakfast_rate) + 
             (bs.lunch_sessions * v_rate.lunch_rate) + 
             (bs.dinner_sessions * v_rate.dinner_rate) + 
             bs.guest_amount) AS actual_cost
        FROM boarder_sessions bs
    ),
    final_calculations AS (
        SELECT 
            bc.*,
            GREATEST(0.0, bc.boarder_min_meals - bc.total_consumed_meals) AS shortfall_meals,
            GREATEST(bc.total_consumed_meals, bc.boarder_min_meals) AS billable_meals,
            (GREATEST(0.0, bc.boarder_min_meals - bc.total_consumed_meals) * v_rate.lunch_rate) AS shortfall_cost,
            (bc.actual_cost + (GREATEST(0.0, bc.boarder_min_meals - bc.total_consumed_meals) * v_rate.lunch_rate)) AS total_meal_bill
        FROM boarder_calculations bc
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'boarder_id', fc.boarder_id,
            'boarder_name', fc.boarder_name,
            'boarder_code', fc.boarder_code,
            'phone_number', fc.phone_number,
            'flat_name', fc.flat_name,
            'allocation_id', fc.allocation_id,
            'admission_date', fc.admission_date,
            'breakfast_sessions', fc.breakfast_sessions,
            'lunch_sessions', fc.lunch_sessions,
            'dinner_sessions', fc.dinner_sessions,
            'consumed_meals', fc.total_consumed_meals,
            'min_meals', fc.boarder_min_meals,
            'shortfall_meals', fc.shortfall_meals,
            'billable_meals', fc.billable_meals,
            'actual_cost', ROUND(fc.actual_cost, 2),
            'shortfall_cost', ROUND(fc.shortfall_cost, 2),
            'guest_amount', ROUND(fc.guest_amount, 2),
            'total_meal_bill', ROUND(fc.total_meal_bill, 2),
            'breakfast_rate', v_rate.breakfast_rate,
            'lunch_rate', v_rate.lunch_rate,
            'dinner_rate', v_rate.dinner_rate
        )
    ), '[]'::jsonb)
    INTO v_results
    FROM final_calculations fc;

    RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_monthly_meal_billing_preview(DATE, NUMERIC, JSONB) TO authenticated, service_role;

-- 5. UPGRADE fn_generate_monthly_meal_charges TO STRICTLY REQUIRE ACTIVE SEAT ALLOCATION
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_meal_charges(
    p_billing_month DATE,
    p_due_date DATE DEFAULT NULL,
    p_default_min_meals NUMERIC DEFAULT 45.0,
    p_boarder_min_overrides JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_start_date DATE;
    v_end_date DATE;
    v_month_label TEXT;
    v_rate RECORD;
    v_b_enabled BOOLEAN := true;
    v_l_enabled BOOLEAN := true;
    v_d_enabled BOOLEAN := true;
    v_configured_min NUMERIC := 45.0;
    v_row RECORD;
    v_consumed_meals NUMERIC;
    v_min_meals NUMERIC;
    v_shortfall NUMERIC;
    v_billable_meals NUMERIC;
    v_actual_cost NUMERIC(12,2);
    v_shortfall_cost NUMERIC(12,2);
    v_total_cost NUMERIC(12,2);
    v_description TEXT;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_total_amount_billed NUMERIC(12,2) := 0.00;
    v_existing_charge RECORD;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    -- Allow SUPER_ADMIN, ADMIN, ACCOUNTANT, and MANAGER to generate meal charges
    IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন, ম্যানেজার বা একাউন্টেন্ট মিল চার্জ জেনারেট করতে পারেন।';
    END IF;

    v_start_date := DATE_TRUNC('month', p_billing_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;
    v_month_label := to_char(v_start_date, 'FMMonth YYYY');

    IF p_due_date IS NULL THEN
        p_due_date := v_start_date + INTERVAL '9 days';
    END IF;

    -- Fetch active meal rates
    SELECT breakfast_rate, lunch_rate, dinner_rate
    INTO v_rate
    FROM public.meal_rates
    WHERE effective_from <= v_end_date
      AND (effective_to IS NULL OR effective_to >= v_start_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        v_rate.breakfast_rate := 26.00;
        v_rate.lunch_rate := 52.00;
        v_rate.dinner_rate := 52.00;
    END IF;

    -- Fetch meal session settings and min meals
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true),
        COALESCE(min_monthly_meals, 45.0)
    INTO v_b_enabled, v_l_enabled, v_d_enabled, v_configured_min
    FROM public.meal_settings
    LIMIT 1;

    IF p_default_min_meals IS NOT NULL AND p_default_min_meals >= 0 THEN
        v_configured_min := p_default_min_meals;
    END IF;

    -- Loop through each genuinely SEATED active resident boarder
    FOR v_row IN
        WITH date_series AS (
            SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
        ),
        -- Strict inner join guarantees unseated boarders are never billed
        boarder_active_days AS (
            SELECT 
                b.id AS boarder_id,
                b.full_name AS boarder_name,
                b.boarder_code,
                a.id AS allocation_id,
                ds.day_date
            FROM public.boarders b
            JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
            CROSS JOIN date_series ds
            WHERE b.status = 'ACTIVE'
              AND ds.day_date >= GREATEST(v_start_date, COALESCE(a.start_date, b.admission_date, v_start_date))
              AND (a.end_date IS NULL OR ds.day_date <= a.end_date)
        ),
        daily_meals AS (
            SELECT 
                bad.boarder_id,
                bad.boarder_name,
                bad.boarder_code,
                bad.allocation_id,
                (COALESCE(ms.breakfast, true) AND v_b_enabled) AS b_active,
                (COALESCE(ms.lunch, true) AND v_l_enabled) AS l_active,
                (COALESCE(ms.dinner, true) AND v_d_enabled) AS d_active
            FROM boarder_active_days bad
            LEFT JOIN public.meal_selections ms 
                   ON ms.boarder_id = bad.boarder_id 
                  AND ms.meal_date = bad.day_date
        ),
        guest_summary AS (
            SELECT 
                gmb.boarder_id,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'BREAKFAST' THEN gmb.guest_count ELSE 0 END), 0) AS guest_breakfast,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'LUNCH' THEN gmb.guest_count ELSE 0 END), 0) AS guest_lunch,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'DINNER' THEN gmb.guest_count ELSE 0 END), 0) AS guest_dinner,
                COALESCE(SUM(gmb.total_amount), 0) AS guest_amount
            FROM public.guest_meal_bookings gmb
            WHERE gmb.meal_date >= v_start_date 
              AND gmb.meal_date <= v_end_date
              AND gmb.status = 'CONFIRMED'
            GROUP BY gmb.boarder_id
        )
        SELECT 
            dm.boarder_id,
            dm.boarder_name,
            dm.boarder_code,
            dm.allocation_id,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.b_active = true) + COALESCE(gs.guest_breakfast, 0)) AS breakfast_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.l_active = true) + COALESCE(gs.guest_lunch, 0)) AS lunch_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.d_active = true) + COALESCE(gs.guest_dinner, 0)) AS dinner_sessions,
            COALESCE(gs.guest_amount, 0) AS guest_amount
        FROM daily_meals dm
        LEFT JOIN guest_summary gs ON gs.boarder_id = dm.boarder_id
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.allocation_id, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner, gs.guest_amount
    LOOP
        v_consumed_meals := (v_row.breakfast_sessions * 0.5) + (v_row.lunch_sessions * 1.0) + (v_row.dinner_sessions * 1.0);
        v_min_meals := COALESCE((p_boarder_min_overrides->>v_row.boarder_id::text)::numeric, v_configured_min);
        v_shortfall := GREATEST(0.0, v_min_meals - v_consumed_meals);
        v_billable_meals := GREATEST(v_consumed_meals, v_min_meals);

        v_actual_cost := (v_row.breakfast_sessions * v_rate.breakfast_rate) +
                         (v_row.lunch_sessions * v_rate.lunch_rate) +
                         (v_row.dinner_sessions * v_rate.dinner_rate) +
                         v_row.guest_amount;
        v_shortfall_cost := v_shortfall * v_rate.lunch_rate;
        v_total_cost := v_actual_cost + v_shortfall_cost;

        v_description := 'খাবার বিল (' || v_month_label || ') - খাওয়া মিল: ' || v_consumed_meals || 'টি';
        IF v_shortfall > 0 THEN
            v_description := v_description || ', নূন্যতম ঘাটতি মিল: ' || v_shortfall || 'টি (মোট বিল্য: ' || v_billable_meals || 'টি মিল)';
        ELSE
            v_description := v_description || ' (মোট বিল্য: ' || v_billable_meals || 'টি মিল)';
        END IF;

        IF v_row.guest_amount > 0 THEN
            v_description := v_description || ' [মেহমান মিলসহ]';
        END IF;

        -- Check existing charge for this boarder and billing month
        SELECT id, amount, paid_amount, status
        INTO v_existing_charge
        FROM public.boarder_charges
        WHERE boarder_id = v_row.boarder_id
          AND charge_type = 'MEAL'
          AND billing_month = v_start_date
          AND status <> 'VOID';

        IF FOUND THEN
            IF v_existing_charge.paid_amount = 0 THEN
                UPDATE public.boarder_charges
                SET amount = v_total_cost,
                    due_date = p_due_date,
                    description = v_description,
                    status = 'UNPAID',
                    updated_at = timezone('Asia/Dhaka', now())
                WHERE id = v_existing_charge.id;

                v_generated := v_generated + 1;
                v_total_amount_billed := v_total_amount_billed + v_total_cost;
            ELSE
                v_skipped := v_skipped + 1;
            END IF;
        ELSE
            INSERT INTO public.boarder_charges (
                boarder_id,
                billing_month,
                charge_type,
                description,
                amount,
                paid_amount,
                due_date,
                status
            ) VALUES (
                v_row.boarder_id,
                v_start_date,
                'MEAL',
                v_description,
                v_total_cost,
                0.00,
                p_due_date,
                'UNPAID'
            );

            v_generated := v_generated + 1;
            v_total_amount_billed := v_total_amount_billed + v_total_cost;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_start_date,
        'generated_count', v_generated,
        'skipped_count', v_skipped,
        'total_amount_billed', v_total_amount_billed,
        'message', 'সফলভাবে ' || v_generated || ' জন সক্রিয় আবাসিক বর্ডারের জন্য খাবার বিল জেনারেট হয়েছে।'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_meal_charges(DATE, DATE, NUMERIC, JSONB) TO authenticated, service_role;

-- 6. UPGRADE verify_boarder_seat_status: STRICT ACCESS CONTROL
CREATE OR REPLACE FUNCTION public.verify_boarder_seat_status(
    p_user_id UUID DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    has_active_seat BOOLEAN,
    boarder_id UUID,
    boarder_name TEXT,
    boarder_code TEXT,
    boarder_status TEXT,
    seat_id UUID,
    seat_code TEXT,
    seat_name TEXT,
    room_name TEXT,
    flat_name TEXT,
    building_name TEXT,
    monthly_rent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_last_10 TEXT;
    v_bdr RECORD;
    v_alloc RECORD;
BEGIN
    IF p_phone IS NOT NULL THEN
        v_clean_phone := regexp_replace(p_phone, '[^\d]', '', 'g');
        IF length(v_clean_phone) >= 10 THEN
            v_last_10 := substring(v_clean_phone from length(v_clean_phone) - 9);
        ELSE
            v_last_10 := v_clean_phone;
        END IF;
    END IF;

    -- Look up boarder record
    SELECT b.id, b.full_name, b.boarder_code, b.status
    INTO v_bdr
    FROM public.boarders b
    WHERE (p_user_id IS NOT NULL AND b.user_id = p_user_id)
       OR (v_clean_phone IS NOT NULL AND (
           b.phone_number = p_phone
           OR regexp_replace(b.phone_number, '[^\d]', '', 'g') = v_clean_phone
           OR regexp_replace(b.phone_number, '[^\d]', '', 'g') LIKE '%' || v_last_10
       ))
       OR (p_email IS NOT NULL AND LOWER(b.email) = LOWER(p_email))
    ORDER BY b.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            false AS has_active_seat,
            NULL::UUID AS boarder_id,
            NULL::TEXT AS boarder_name,
            NULL::TEXT AS boarder_code,
            'NOT_FOUND'::TEXT AS boarder_status,
            NULL::UUID AS seat_id,
            NULL::TEXT AS seat_code,
            NULL::TEXT AS seat_name,
            NULL::TEXT AS room_name,
            NULL::TEXT AS flat_name,
            NULL::TEXT AS building_name,
            0::NUMERIC AS monthly_rent;
        RETURN;
    END IF;

    -- Strict check: An active seat allocation must exist AND boarder status must be ACTIVE
    SELECT 
        a.id AS alloc_id,
        a.monthly_rent,
        s.id AS seat_id,
        s.seat_code,
        s.seat_name,
        r.name AS room_name,
        f.name AS flat_name,
        bld.name AS building_name
    INTO v_alloc
    FROM public.allocations a
    JOIN public.seats s ON s.id = a.seat_id
    JOIN public.rooms r ON r.id = s.room_id
    JOIN public.flats f ON f.id = r.flat_id
    JOIN public.buildings bld ON bld.id = f.building_id
    WHERE a.boarder_id = v_bdr.id
      AND a.status = 'ACTIVE'
    LIMIT 1;

    IF FOUND AND v_bdr.status = 'ACTIVE' THEN
        RETURN QUERY SELECT 
            true AS has_active_seat,
            v_bdr.id AS boarder_id,
            v_bdr.full_name::TEXT AS boarder_name,
            v_bdr.boarder_code::TEXT AS boarder_code,
            v_bdr.status::TEXT AS boarder_status,
            v_alloc.seat_id AS seat_id,
            v_alloc.seat_code::TEXT AS seat_code,
            v_alloc.seat_name::TEXT AS seat_name,
            v_alloc.room_name::TEXT AS room_name,
            v_alloc.flat_name::TEXT AS flat_name,
            v_alloc.building_name::TEXT AS building_name,
            v_alloc.monthly_rent AS monthly_rent;
    ELSE
        RETURN QUERY SELECT 
            false AS has_active_seat,
            v_bdr.id AS boarder_id,
            v_bdr.full_name::TEXT AS boarder_name,
            v_bdr.boarder_code::TEXT AS boarder_code,
            v_bdr.status::TEXT AS boarder_status,
            NULL::UUID AS seat_id,
            NULL::TEXT AS seat_code,
            NULL::TEXT AS seat_name,
            NULL::TEXT AS room_name,
            NULL::TEXT AS flat_name,
            NULL::TEXT AS building_name,
            0::NUMERIC AS monthly_rent;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_boarder_seat_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_boarder_seat_status(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

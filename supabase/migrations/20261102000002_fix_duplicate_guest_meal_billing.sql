-- ==============================================================================
-- File: supabase/migrations/20261102000002_fix_duplicate_guest_meal_billing.sql
-- Description:
--   1. Fixes double counting of guest meals in fn_get_monthly_meal_billing_preview
--      and fn_generate_monthly_meal_charges. Guest meal counts are already
--      added to breakfast_sessions, lunch_sessions, and dinner_sessions.
--      Multiplying by the session meal rate already bills the guest meals.
--      Adding guest_amount on top caused duplicate billing (e.g. Maruf Billah
--      eating 23 meals + 7 shortfall = 30 meals @ 52 = 1,560 Tk was charged 1,664 Tk).
--   2. Updates existing affected meal charges (specifically correcting Maruf Billah's
--      charge from 1,664.00 to 1,560.00).
-- ==============================================================================

-- 1. UPGRADE fn_get_monthly_meal_billing_preview
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
            -- Guest meals are already included in session counts; multiplying by session rate bills them exactly once.
            ((bs.breakfast_sessions * v_rate.breakfast_rate) + 
             (bs.lunch_sessions * v_rate.lunch_rate) + 
             (bs.dinner_sessions * v_rate.dinner_rate)) AS actual_cost
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


-- 2. UPGRADE fn_generate_monthly_meal_charges
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

        -- Guest meals are already incorporated into session counts, so no duplicate guest_amount addition
        v_actual_cost := (v_row.breakfast_sessions * v_rate.breakfast_rate) +
                         (v_row.lunch_sessions * v_rate.lunch_rate) +
                         (v_row.dinner_sessions * v_rate.dinner_rate);
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
                allocation_id,
                billing_month,
                charge_type,
                description,
                amount,
                paid_amount,
                due_date,
                status
            ) VALUES (
                v_row.boarder_id,
                v_row.allocation_id,
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
        'billing_month', v_start_date,
        'generated', v_generated,
        'skipped', v_skipped,
        'total_amount_billed', v_total_amount_billed,
        'message', 'সফলভাবে ' || v_generated || ' জন বোর্ডারের খাবারের বিল জেনারেট/আপডেট সম্পন্ন হয়েছে।'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_meal_charges(DATE, DATE, NUMERIC, JSONB) TO authenticated, service_role;


-- 3. DATA REPAIR: FIX DUPLICATE GUEST CHARGES
-- Adjust all affected meal charges where duplicate guest amount was added
UPDATE public.boarder_charges bc
SET amount = GREATEST(0.0, bc.amount - g.dup_guest_amount),
    status = CASE WHEN bc.paid_amount >= (bc.amount - g.dup_guest_amount) THEN 'PAID'::charge_status ELSE bc.status END,
    updated_at = timezone('Asia/Dhaka', now())
FROM (
    SELECT 
        gmb.boarder_id,
        date_trunc('month', gmb.meal_date)::date AS b_month,
        SUM(gmb.total_amount) AS dup_guest_amount
    FROM public.guest_meal_bookings gmb
    WHERE gmb.status = 'CONFIRMED'
    GROUP BY gmb.boarder_id, date_trunc('month', gmb.meal_date)::date
) g
WHERE bc.boarder_id = g.boarder_id
  AND bc.billing_month = g.b_month
  AND bc.charge_type = 'MEAL'
  AND bc.status <> 'VOID'
  AND bc.amount >= g.dup_guest_amount
  AND (bc.amount = 1664.00 OR bc.amount > g.dup_guest_amount);

-- Specific safeguard for Maruf Billah (BDR-2026-3737)
UPDATE public.boarder_charges
SET amount = 1560.00,
    status = CASE WHEN paid_amount >= 1560.00 THEN 'PAID'::charge_status ELSE status END,
    updated_at = timezone('Asia/Dhaka', now())
WHERE boarder_id IN (
    SELECT id FROM public.boarders 
    WHERE boarder_code = 'BDR-2026-3737' OR full_name ILIKE '%মারুফ%'
)
AND charge_type = 'MEAL'
AND amount = 1664.00;

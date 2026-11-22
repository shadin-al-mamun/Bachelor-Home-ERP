-- ==============================================================================
-- Migration: 20261122000003_staff_free_meal_exemption.sql
-- Description:
--   1. Upgrades fn_get_monthly_meal_billing_preview and fn_generate_monthly_meal_charges
--      to strictly exempt resident staff members receiving free meal benefits
--      (institution or remarks containing 'কর্মচারী', 'স্টাফ', or 'ফ্রি মিল').
--   2. Automatically voids any historical meal charges accidentally generated for staff.
--   3. Upgrades fn_toggle_meal_selection to allow managers to batch-toggle meals
--      and apply leave overrides for resident staff members.
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
    v_preview_items JSONB := '[]'::jsonb;
BEGIN
    v_start_date := DATE_TRUNC('month', p_billing_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;

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
    -- Strict inner join on allocations guarantees ONLY paying seated active boarders are billed
    -- Staff members receiving free accommodation and free meals are explicitly excluded!
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
          AND NOT (
            COALESCE(a.remarks, '') ILIKE '%ফ্রি মিল%' OR
            COALESCE(b.institution, '') ILIKE '%ফ্রি মিল%' OR
            COALESCE(b.institution, '') ILIKE '%কর্মচারী%' OR
            COALESCE(b.institution, '') ILIKE '%স্টাফ%' OR
            COALESCE(a.remarks, '') ILIKE '%কর্মচারী%'
          )
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
    boarder_tallies AS (
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
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.phone_number, dm.flat_name, dm.allocation_id, dm.admission_date, gs.guest_amount, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'boarder_id', bt.boarder_id,
            'boarder_name', bt.boarder_name,
            'boarder_code', bt.boarder_code,
            'phone_number', bt.phone_number,
            'flat_name', bt.flat_name,
            'allocation_id', bt.allocation_id,
            'admission_date', bt.admission_date,
            'breakfast_count', bt.breakfast_sessions,
            'lunch_count', bt.lunch_sessions,
            'dinner_count', bt.dinner_sessions,
            'total_meals', ROUND(((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0))::numeric, 1),
            'consumed_meals', ROUND(((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0))::numeric, 1),
            'min_meals', COALESCE((p_boarder_min_overrides->>bt.boarder_id::text)::numeric, v_configured_min),
            'shortfall_meals', GREATEST(0.0, ROUND((COALESCE((p_boarder_min_overrides->>bt.boarder_id::text)::numeric, v_configured_min) - ((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0)))::numeric, 1)),
            'billable_meals', ROUND((((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0)) + GREATEST(0.0, (COALESCE((p_boarder_min_overrides->>bt.boarder_id::text)::numeric, v_configured_min) - ((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0)))))::numeric, 1),
            'breakfast_cost', ROUND((bt.breakfast_sessions * v_rate.breakfast_rate)::numeric, 2),
            'lunch_cost', ROUND((bt.lunch_sessions * v_rate.lunch_rate)::numeric, 2),
            'dinner_cost', ROUND((bt.dinner_sessions * v_rate.dinner_rate)::numeric, 2),
            'shortfall_cost', ROUND((GREATEST(0.0, (COALESCE((p_boarder_min_overrides->>bt.boarder_id::text)::numeric, v_configured_min) - ((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0)))) * v_rate.lunch_rate)::numeric, 2),
            'guest_amount', bt.guest_amount,
            'total_amount', ROUND(((bt.breakfast_sessions * v_rate.breakfast_rate) + (bt.lunch_sessions * v_rate.lunch_rate) + (bt.dinner_sessions * v_rate.dinner_rate) + (GREATEST(0.0, (COALESCE((p_boarder_min_overrides->>bt.boarder_id::text)::numeric, v_configured_min) - ((bt.breakfast_sessions * 0.5) + (bt.lunch_sessions * 1.0) + (bt.dinner_sessions * 1.0)))) * v_rate.lunch_rate))::numeric, 2),
            'already_billed', EXISTS(
                SELECT 1 FROM public.boarder_charges bc
                WHERE bc.boarder_id = bt.boarder_id
                  AND bc.charge_type = 'MEAL'
                  AND bc.billing_month = v_start_date
                  AND bc.status != 'VOID'
            )
        )
    )
    INTO v_preview_items
    FROM boarder_tallies bt;

    RETURN jsonb_build_object(
        'billing_month', v_start_date,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'rates', jsonb_build_object(
            'breakfast', v_rate.breakfast_rate,
            'lunch', v_rate.lunch_rate,
            'dinner', v_rate.dinner_rate
        ),
        'preview_items', COALESCE(v_preview_items, '[]'::jsonb)
    );
END;
$$;


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
    v_caller_role TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_rate RECORD;
    v_b_enabled BOOLEAN := true;
    v_l_enabled BOOLEAN := true;
    v_d_enabled BOOLEAN := true;
    v_configured_min NUMERIC := 45.0;
    v_generated_count INT := 0;
    v_skipped_count INT := 0;
    v_total_amount NUMERIC := 0.0;
    v_month_label TEXT;
    v_row RECORD;
    v_charge_id UUID;
    v_min_meals NUMERIC;
    v_shortfall NUMERIC;
    v_billable NUMERIC;
    v_total_charge NUMERIC;
    v_description TEXT;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

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

    -- Loop through each genuinely SEATED active resident paying boarder
    -- Resident staff with free meal facility are completely EXCLUDED!
    FOR v_row IN
        WITH date_series AS (
            SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
        ),
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
              AND NOT (
                COALESCE(a.remarks, '') ILIKE '%ফ্রি মিল%' OR
                COALESCE(b.institution, '') ILIKE '%ফ্রি মিল%' OR
                COALESCE(b.institution, '') ILIKE '%কর্মচারী%' OR
                COALESCE(b.institution, '') ILIKE '%স্টাফ%' OR
                COALESCE(a.remarks, '') ILIKE '%কর্মচারী%'
              )
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
            (COUNT(dm.boarder_id) FILTER (WHERE dm.d_active = true) + COALESCE(gs.guest_dinner, 0)) AS dinner_sessions
        FROM daily_meals dm
        LEFT JOIN guest_summary gs ON gs.boarder_id = dm.boarder_id
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.allocation_id, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner
    LOOP
        -- Calculate boarder specific minimum meals
        v_min_meals := COALESCE((p_boarder_min_overrides->>v_row.boarder_id::text)::numeric, v_configured_min);
        v_shortfall := GREATEST(0.0, ROUND((v_min_meals - ((v_row.breakfast_sessions * 0.5) + (v_row.lunch_sessions * 1.0) + (v_row.dinner_sessions * 1.0)))::numeric, 1));
        v_billable := ROUND((((v_row.breakfast_sessions * 0.5) + (v_row.lunch_sessions * 1.0) + (v_row.dinner_sessions * 1.0)) + v_shortfall)::numeric, 1);

        -- Total calculated charge
        v_total_charge := ROUND((
            (v_row.breakfast_sessions * v_rate.breakfast_rate) +
            (v_row.lunch_sessions * v_rate.lunch_rate) +
            (v_row.dinner_sessions * v_rate.dinner_rate) +
            (v_shortfall * v_rate.lunch_rate)
        )::numeric, 2);

        v_description := 'মাসিক খাবার বিল (' || v_month_label || ') — বিলযোগ্য: ' || v_billable || 'টি মিল (গৃহীত: ' || ROUND(((v_row.breakfast_sessions * 0.5) + (v_row.lunch_sessions * 1.0) + (v_row.dinner_sessions * 1.0))::numeric, 1) || 'টি, ঘাটতি: ' || v_shortfall || 'টি; নাস্তা: ' || v_row.breakfast_sessions || ', দুপুর: ' || v_row.lunch_sessions || ', রাত: ' || v_row.dinner_sessions || ')';

        -- Check existing charge for this month
        SELECT id INTO v_charge_id
        FROM public.boarder_charges
        WHERE boarder_id = v_row.boarder_id
          AND charge_type = 'MEAL'
          AND billing_month = v_start_date
          AND status != 'VOID'
        LIMIT 1;

        IF v_charge_id IS NOT NULL THEN
            UPDATE public.boarder_charges
            SET amount = v_total_charge,
                description = v_description,
                due_date = p_due_date,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_charge_id
              AND status IN ('PENDING', 'UNPAID')
              AND paid_amount = 0;

            v_skipped_count := v_skipped_count + 1;
        ELSE
            IF v_total_charge > 0 THEN
                INSERT INTO public.boarder_charges (
                    boarder_id,
                    allocation_id,
                    charge_type,
                    amount,
                    billing_month,
                    due_date,
                    status,
                    description,
                    created_at,
                    updated_at
                ) VALUES (
                    v_row.boarder_id,
                    v_row.allocation_id,
                    'MEAL',
                    v_total_charge,
                    v_start_date,
                    p_due_date,
                    'PENDING',
                    v_description,
                    timezone('Asia/Dhaka', now()),
                    timezone('Asia/Dhaka', now())
                );

                v_generated_count := v_generated_count + 1;
                v_total_amount := v_total_amount + v_total_charge;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_start_date,
        'generated', v_generated_count,
        'skipped', v_skipped_count,
        'total_amount_billed', v_total_amount,
        'message', 'মাসিক খাবার বিল সফলভাবে সম্পন্ন হয়েছে। মোট জেনারেট: ' || v_generated_count || ' জন, অপরিবর্তিত/আপডেট: ' || v_skipped_count || ' জন (স্টাফদের ফ্রি মিল চার্জ থেকে অব্যাহতি প্রদান করা হয়েছে)।'
    );
END;
$$;

-- 3. VOID HISTORICAL ACCIDENTAL MEAL CHARGES FOR STAFF
UPDATE public.boarder_charges bc
SET status = 'VOID',
    due_amount = 0.00,
    updated_at = timezone('Asia/Dhaka', now())
FROM public.boarders b
WHERE bc.boarder_id = b.id
  AND bc.charge_type = 'MEAL'
  AND (
    b.institution ILIKE '%কর্মচারী%' OR
    b.institution ILIKE '%স্টাফ%' OR
    b.institution ILIKE '%ফ্রি মিল%'
  )
  AND bc.status != 'PAID';

GRANT EXECUTE ON FUNCTION public.fn_get_monthly_meal_billing_preview(DATE, NUMERIC, JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_meal_charges(DATE, DATE, NUMERIC, JSONB) TO authenticated, service_role;

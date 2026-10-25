-- ==============================================================================
-- Migration: 20261025000001_fix_opt_out_monthly_meal_billing.sql
-- Description:
--   1. Corrects monthly meal billing calculation according to the Hostel Mess Opt-Out Policy:
--      - All active boarders have meals ON by default (3 meals/day) unless explicitly opted out.
--      - Only charges meals from the boarder's admission/allocation date onwards.
--      - Includes confirmed guest meal bookings.
--   2. Updates fn_get_monthly_meal_billing_preview and fn_generate_monthly_meal_charges.
--   3. Updates pending uncollected meal charges if regenerated to correct flawed bills.
-- ==============================================================================

-- 1. PREVIEW MONTHLY MEAL BILLING (Opt-Out Mess Engine)
CREATE OR REPLACE FUNCTION public.fn_get_monthly_meal_billing_preview(
    p_billing_month DATE
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

    -- Fetch meal session enabled settings
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true)
    INTO v_b_enabled, v_l_enabled, v_d_enabled
    FROM public.meal_settings
    LIMIT 1;

    WITH date_series AS (
        SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
    ),
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
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        LEFT JOIN public.seats s ON s.id = a.seat_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.flats f ON f.id = r.flat_id
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
            -- In an Opt-Out mess: unrecorded days default to TRUE
            (COALESCE(ms.breakfast, true) AND v_b_enabled) AS b_active,
            (COALESCE(ms.lunch, true) AND v_l_enabled) AS l_active,
            (COALESCE(ms.dinner, true) AND v_d_enabled) AS d_active
        FROM boarder_active_days bad
        LEFT JOIN public.meal_selections ms 
               ON ms.boarder_id = bad.boarder_id 
              AND ms.meal_date = bad.day_date
    ),
    boarder_resident_summary AS (
        SELECT 
            dm.boarder_id,
            dm.boarder_name,
            dm.boarder_code,
            dm.phone_number,
            dm.flat_name,
            dm.allocation_id,
            COUNT(dm.day_date) AS active_days_count,
            COUNT(dm.day_date) FILTER (WHERE dm.b_active = true) AS breakfast_count,
            COUNT(dm.day_date) FILTER (WHERE dm.l_active = true) AS lunch_count,
            COUNT(dm.day_date) FILTER (WHERE dm.d_active = true) AS dinner_count
        FROM daily_meals dm
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.phone_number, dm.flat_name, dm.allocation_id
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
    all_active_boarders AS (
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            b.phone_number,
            COALESCE(f.name, 'অনির্ধারিত') AS flat_name,
            a.id AS allocation_id
        FROM public.boarders b
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        LEFT JOIN public.seats s ON s.id = a.seat_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.flats f ON f.id = r.flat_id
        WHERE b.status = 'ACTIVE'
    ),
    final_aggregation AS (
        SELECT 
            aab.boarder_id,
            aab.boarder_name,
            aab.boarder_code,
            aab.phone_number,
            aab.flat_name,
            aab.allocation_id,
            COALESCE(brs.breakfast_count, 0) + COALESCE(gs.guest_breakfast, 0) AS breakfast_count,
            COALESCE(brs.lunch_count, 0) + COALESCE(gs.guest_lunch, 0) AS lunch_count,
            COALESCE(brs.dinner_count, 0) + COALESCE(gs.guest_dinner, 0) AS dinner_count,
            COALESCE(gs.guest_amount, 0) AS guest_amount,
            EXISTS (
                SELECT 1 FROM public.boarder_charges bc
                WHERE bc.boarder_id = aab.boarder_id
                  AND bc.charge_type = 'MEAL'
                  AND bc.billing_month = v_start_date
                  AND bc.status <> 'VOID'
            ) AS already_billed
        FROM all_active_boarders aab
        LEFT JOIN boarder_resident_summary brs ON brs.boarder_id = aab.boarder_id
        LEFT JOIN guest_summary gs ON gs.boarder_id = aab.boarder_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'boarder_id', fa.boarder_id,
            'boarder_name', fa.boarder_name,
            'boarder_code', fa.boarder_code,
            'phone_number', fa.phone_number,
            'flat_name', fa.flat_name,
            'allocation_id', fa.allocation_id,
            'breakfast_count', fa.breakfast_count,
            'lunch_count', fa.lunch_count,
            'dinner_count', fa.dinner_count,
            'total_meals', (fa.breakfast_count + fa.lunch_count + fa.dinner_count),
            'breakfast_cost', ROUND((fa.breakfast_count * v_rate.breakfast_rate)::numeric, 2),
            'lunch_cost', ROUND((fa.lunch_count * v_rate.lunch_rate)::numeric, 2),
            'dinner_cost', ROUND((fa.dinner_count * v_rate.dinner_rate)::numeric, 2),
            'total_amount', ROUND((
                fa.breakfast_count * v_rate.breakfast_rate +
                fa.lunch_count * v_rate.lunch_rate +
                fa.dinner_count * v_rate.dinner_rate +
                fa.guest_amount
            )::numeric, 2),
            'already_billed', fa.already_billed
        )
        ORDER BY fa.boarder_name ASC
    )
    INTO v_results
    FROM final_aggregation fa;

    RETURN jsonb_build_object(
        'billing_month', v_start_date,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'rates', jsonb_build_object(
            'breakfast', v_rate.breakfast_rate,
            'lunch', v_rate.lunch_rate,
            'dinner', v_rate.dinner_rate
        ),
        'preview_items', COALESCE(v_results, '[]'::jsonb)
    );
END;
$$;


-- 2. GENERATE MONTHLY MEAL CHARGES (Opt-Out Mess Engine)
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_meal_charges(
    p_billing_month DATE,
    p_due_date DATE DEFAULT NULL
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
    v_row RECORD;
    v_total_cost NUMERIC(12,2);
    v_total_meals INT;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_total_amount_billed NUMERIC(12,2) := 0.00;
    v_existing_charge RECORD;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন বা একাউন্টেন্ট মিল চার্জ জেনারেট করতে পারেন।';
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

    -- Fetch meal session settings
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true)
    INTO v_b_enabled, v_l_enabled, v_d_enabled
    FROM public.meal_settings
    LIMIT 1;

    -- Loop through each active boarder with Opt-Out mess calculation
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
            LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
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
            (COUNT(dm.boarder_id) FILTER (WHERE dm.b_active = true) + COALESCE(gs.guest_breakfast, 0)) AS breakfast_count,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.l_active = true) + COALESCE(gs.guest_lunch, 0)) AS lunch_count,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.d_active = true) + COALESCE(gs.guest_dinner, 0)) AS dinner_count,
            COALESCE(gs.guest_amount, 0) AS guest_amount
        FROM daily_meals dm
        LEFT JOIN guest_summary gs ON gs.boarder_id = dm.boarder_id
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.allocation_id, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner, gs.guest_amount
    LOOP
        v_total_meals := v_row.breakfast_count + v_row.lunch_count + v_row.dinner_count;
        v_total_cost := ROUND((
            v_row.breakfast_count * v_rate.breakfast_rate +
            v_row.lunch_count * v_rate.lunch_rate +
            v_row.dinner_count * v_rate.dinner_rate +
            v_row.guest_amount
        )::numeric, 2);

        IF v_total_cost > 0 THEN
            -- Check for existing charge for this month
            SELECT id, status, paid_amount INTO v_existing_charge
            FROM public.boarder_charges
            WHERE boarder_id = v_row.boarder_id
              AND charge_type = 'MEAL'
              AND billing_month = v_start_date
              AND status <> 'VOID'
            LIMIT 1;

            IF v_existing_charge.id IS NOT NULL THEN
                -- If charge exists and has NOT been paid yet (status = 'UNPAID' and paid_amount = 0), update it to correct bill!
                IF v_existing_charge.status = 'UNPAID' AND COALESCE(v_existing_charge.paid_amount, 0) = 0 THEN
                    UPDATE public.boarder_charges
                    SET amount = v_total_cost,
                        due_amount = v_total_cost,
                        description = format('মাসিক খাবার বিল (%s) — মোট %sটি মিল (নাস্তা: %s, দুপুর: %s, রাত: %s)', 
                            v_month_label, v_total_meals, v_row.breakfast_count, v_row.lunch_count, v_row.dinner_count),
                        due_date = p_due_date,
                        updated_at = timezone('Asia/Dhaka', now())
                    WHERE id = v_existing_charge.id;

                    v_generated := v_generated + 1;
                    v_total_amount_billed := v_total_amount_billed + v_total_cost;
                ELSE
                    -- Already paid or partially collected, do not overwrite to protect payment ledger
                    v_skipped := v_skipped + 1;
                END IF;
            ELSE
                -- Insert new charge
                INSERT INTO public.boarder_charges (
                    boarder_id,
                    allocation_id,
                    charge_type,
                    billing_month,
                    amount,
                    paid_amount,
                    due_amount,
                    status,
                    due_date,
                    description,
                    created_by
                ) VALUES (
                    v_row.boarder_id,
                    v_row.allocation_id,
                    'MEAL',
                    v_start_date,
                    v_total_cost,
                    0.00,
                    v_total_cost,
                    'UNPAID',
                    p_due_date,
                    format('মাসিক খাবার বিল (%s) — মোট %sটি মিল (নাস্তা: %s, দুপুর: %s, রাত: %s)', 
                        v_month_label, v_total_meals, v_row.breakfast_count, v_row.lunch_count, v_row.dinner_count),
                    v_caller_id
                );

                v_generated := v_generated + 1;
                v_total_amount_billed := v_total_amount_billed + v_total_cost;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_start_date,
        'generated', v_generated,
        'skipped', v_skipped,
        'total_amount_billed', v_total_amount_billed,
        'message', format('মাসিক খাবার বিল সম্পন্ন: %s টি বিল তৈরি বা আপডেট হয়েছে (মোট ৳%s), %s টি পূর্বে পরিশোধিত থাকায় অপরিবর্তিত রাখা হয়েছে।', 
            v_generated, v_total_amount_billed, v_skipped)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_monthly_meal_billing_preview(DATE) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_meal_charges(DATE, DATE) TO authenticated, service_role;

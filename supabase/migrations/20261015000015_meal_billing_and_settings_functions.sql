-- ==============================================================================
-- Bachelor Home ERP — Migration 000015: Meal Billing, Rates & Settings Procedures
-- File: supabase/migrations/20261015000015_meal_billing_and_settings_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. SAVE GLOBAL MEAL SETTINGS
CREATE OR REPLACE FUNCTION public.fn_save_meal_settings(
    p_is_meal_module_enabled BOOLEAN,
    p_breakfast_enabled BOOLEAN,
    p_lunch_enabled BOOLEAN,
    p_dinner_enabled BOOLEAN,
    p_cutoff_time TIME DEFAULT '22:00:00'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র সুপার এডমিন বা হোস্টেল এডমিন মিল সেটিংস পরিবর্তন করতে পারেন।';
    END IF;

    UPDATE public.meal_settings
    SET 
        is_meal_module_enabled = p_is_meal_module_enabled,
        breakfast_enabled = p_breakfast_enabled,
        lunch_enabled = p_lunch_enabled,
        dinner_enabled = p_dinner_enabled,
        cutoff_time = p_cutoff_time,
        updated_by = v_caller_id,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = '00000000-0000-0000-0000-000000000001';

    IF NOT FOUND THEN
        INSERT INTO public.meal_settings (
            id,
            is_meal_module_enabled,
            breakfast_enabled,
            lunch_enabled,
            dinner_enabled,
            cutoff_time,
            updated_by,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            p_is_meal_module_enabled,
            p_breakfast_enabled,
            p_lunch_enabled,
            p_dinner_enabled,
            p_cutoff_time,
            v_caller_id,
            timezone('Asia/Dhaka', now())
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'মিল সিস্টেম কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।'
    );
END;
$$;

-- 2. CREATE NEW EFFECTIVE MEAL RATE
CREATE OR REPLACE FUNCTION public.fn_create_meal_rate(
    p_effective_from DATE,
    p_breakfast_rate NUMERIC(8,2),
    p_lunch_rate NUMERIC(8,2),
    p_dinner_rate NUMERIC(8,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_rate_id UUID;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন মিলের রেট নির্ধারণ করতে পারেন।';
    END IF;

    IF p_breakfast_rate < 0 OR p_lunch_rate < 0 OR p_dinner_rate < 0 THEN
        RAISE EXCEPTION 'মিলের রেট ঋণাত্মক (negative) হতে পারে না।';
    END IF;

    -- Close any existing open-ended rate that ends before the new effective_from date
    UPDATE public.meal_rates
    SET effective_to = p_effective_from - INTERVAL '1 day'
    WHERE effective_to IS NULL AND effective_from < p_effective_from;

    -- Insert new rate schedule
    INSERT INTO public.meal_rates (
        effective_from,
        effective_to,
        breakfast_rate,
        lunch_rate,
        dinner_rate,
        created_by,
        created_at
    ) VALUES (
        p_effective_from,
        NULL,
        p_breakfast_rate,
        p_lunch_rate,
        p_dinner_rate,
        v_caller_id,
        timezone('Asia/Dhaka', now())
    )
    RETURNING id INTO v_rate_id;

    RETURN jsonb_build_object(
        'success', true,
        'rate_id', v_rate_id,
        'message', 'নতুন মিল রেট সফলভাবে কার্যকর করা হয়েছে।'
    );
END;
$$;

-- 3. PREVIEW MONTHLY MEAL BILLING (Aggregates without mutating)
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
        v_rate.breakfast_rate := 30.00;
        v_rate.lunch_rate := 65.00;
        v_rate.dinner_rate := 60.00;
    END IF;

    WITH meal_counts AS (
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            b.phone_number,
            f.name AS flat_name,
            a.id AS allocation_id,
            COUNT(ms.id) FILTER (WHERE ms.breakfast = true) AS breakfast_count,
            COUNT(ms.id) FILTER (WHERE ms.lunch = true) AS lunch_count,
            COUNT(ms.id) FILTER (WHERE ms.dinner = true) AS dinner_count
        FROM public.boarders b
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        LEFT JOIN public.seats s ON s.id = a.seat_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.flats f ON f.id = r.flat_id
        LEFT JOIN public.meal_selections ms 
               ON ms.boarder_id = b.id 
              AND ms.meal_date >= v_start_date 
              AND ms.meal_date <= v_end_date
        WHERE b.status = 'ACTIVE'
        GROUP BY b.id, b.full_name, b.boarder_code, b.phone_number, f.name, a.id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'boarder_id', mc.boarder_id,
            'boarder_name', mc.boarder_name,
            'boarder_code', mc.boarder_code,
            'phone_number', mc.phone_number,
            'flat_name', COALESCE(mc.flat_name, 'অনির্ধারিত'),
            'allocation_id', mc.allocation_id,
            'breakfast_count', mc.breakfast_count,
            'lunch_count', mc.lunch_count,
            'dinner_count', mc.dinner_count,
            'total_meals', (mc.breakfast_count + mc.lunch_count + mc.dinner_count),
            'breakfast_cost', ROUND((mc.breakfast_count * v_rate.breakfast_rate)::numeric, 2),
            'lunch_cost', ROUND((mc.lunch_count * v_rate.lunch_rate)::numeric, 2),
            'dinner_cost', ROUND((mc.dinner_count * v_rate.dinner_rate)::numeric, 2),
            'total_amount', ROUND((
                mc.breakfast_count * v_rate.breakfast_rate +
                mc.lunch_count * v_rate.lunch_rate +
                mc.dinner_count * v_rate.dinner_rate
            )::numeric, 2),
            'already_billed', EXISTS (
                SELECT 1 FROM public.boarder_charges bc
                WHERE bc.boarder_id = mc.boarder_id
                  AND bc.charge_type = 'MEAL'
                  AND bc.billing_month = v_start_date
                  AND bc.status <> 'VOID'
            )
        )
    )
    INTO v_results
    FROM meal_counts mc;

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

-- 4. ATOMIC GENERATION OF MONTHLY MEAL CHARGES
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
    v_row RECORD;
    v_total_cost NUMERIC(12,2);
    v_total_meals INT;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_total_amount_billed NUMERIC(12,2) := 0.00;
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
        v_rate.breakfast_rate := 30.00;
        v_rate.lunch_rate := 65.00;
        v_rate.dinner_rate := 60.00;
    END IF;

    -- Loop through all boarders with meals in this month
    FOR v_row IN
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            a.id AS allocation_id,
            COUNT(ms.id) FILTER (WHERE ms.breakfast = true) AS breakfast_count,
            COUNT(ms.id) FILTER (WHERE ms.lunch = true) AS lunch_count,
            COUNT(ms.id) FILTER (WHERE ms.dinner = true) AS dinner_count
        FROM public.boarders b
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        JOIN public.meal_selections ms 
          ON ms.boarder_id = b.id 
         AND ms.meal_date >= v_start_date 
         AND ms.meal_date <= v_end_date
        WHERE b.status = 'ACTIVE'
        GROUP BY b.id, b.full_name, b.boarder_code, a.id
    LOOP
        v_total_meals := v_row.breakfast_count + v_row.lunch_count + v_row.dinner_count;
        v_total_cost := ROUND((
            v_row.breakfast_count * v_rate.breakfast_rate +
            v_row.lunch_count * v_rate.lunch_rate +
            v_row.dinner_count * v_rate.dinner_rate
        )::numeric, 2);

        -- Skip if 0 meals or charge already exists
        IF v_total_cost > 0 THEN
            IF EXISTS (
                SELECT 1 FROM public.boarder_charges bc
                WHERE bc.boarder_id = v_row.boarder_id
                  AND bc.charge_type = 'MEAL'
                  AND bc.billing_month = v_start_date
                  AND bc.status <> 'VOID'
            ) THEN
                v_skipped := v_skipped + 1;
            ELSE
                INSERT INTO public.boarder_charges (
                    boarder_id,
                    allocation_id,
                    charge_type,
                    billing_month,
                    amount,
                    paid_amount,
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
        'message', format('মাসিক খাবার বিল তৈরি সম্পন্ন: %s টি বিল তৈরি হয়েছে (মোট ৳%s), %s টি পূর্বে তৈরিকৃত ছিল।', 
            v_generated, v_total_amount_billed, v_skipped)
    );
END;
$$;

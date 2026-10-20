-- Migration: 20261015000029_fix_meal_rates_rls_and_update_function.sql
-- Description: Enable proper RLS policies for meal_rates & meal_settings and fix fn_create_meal_rate to update existing rates and allow managers

-- 1. POLICIES FOR MEAL RATES
ALTER TABLE public.meal_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_rates_select_policy ON public.meal_rates;
DROP POLICY IF EXISTS meal_rates_select ON public.meal_rates;
CREATE POLICY meal_rates_select ON public.meal_rates
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS meal_rates_modify_policy ON public.meal_rates;
DROP POLICY IF EXISTS meal_rates_modify ON public.meal_rates;
CREATE POLICY meal_rates_modify ON public.meal_rates
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 2. POLICIES FOR MEAL SETTINGS
ALTER TABLE public.meal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meal_settings_select_policy ON public.meal_settings;
DROP POLICY IF EXISTS meal_settings_select ON public.meal_settings;
CREATE POLICY meal_settings_select ON public.meal_settings
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS meal_settings_modify_policy ON public.meal_settings;
DROP POLICY IF EXISTS meal_settings_modify ON public.meal_settings;
CREATE POLICY meal_settings_modify ON public.meal_settings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 3. PERMISSIVE & DETERMINISTIC fn_create_meal_rate
CREATE OR REPLACE FUNCTION public.fn_create_meal_rate(
    p_effective_from DATE,
    p_breakfast_rate NUMERIC(8,2),
    p_lunch_rate NUMERIC(8,2),
    p_dinner_rate NUMERIC(8,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_rate_id UUID;
BEGIN
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role
        FROM public.profiles
        WHERE id = v_caller_id;
    END IF;

    -- Allow SUPER_ADMIN, ADMIN, MANAGER, MEAL_OPERATOR or unassigned system caller
    IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEAL_OPERATOR') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন বা ম্যানেজার মিলের রেট পরিবর্তন করতে পারেন।';
    END IF;

    IF p_breakfast_rate < 0 OR p_lunch_rate < 0 OR p_dinner_rate < 0 THEN
        RAISE EXCEPTION 'মিলের রেট ঋণাত্মক (negative) হতে পারে না।';
    END IF;

    -- Check if a rate schedule starting on this exact date already exists
    SELECT id INTO v_rate_id
    FROM public.meal_rates
    WHERE effective_from = p_effective_from
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_rate_id IS NOT NULL THEN
        -- Update the existing record directly
        UPDATE public.meal_rates
        SET breakfast_rate = p_breakfast_rate,
            lunch_rate = p_lunch_rate,
            dinner_rate = p_dinner_rate,
            effective_to = NULL,
            created_by = COALESCE(v_caller_id, created_by),
            created_at = timezone('Asia/Dhaka', now())
        WHERE id = v_rate_id;
    ELSE
        -- Close all previous open-ended rates
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
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'rate_id', v_rate_id,
        'message', 'নতুন মিল রেট সফলভাবে কার্যকর করা হয়েছে।'
    );
END;
$$;

-- 4. UPDATE fn_save_meal_settings PERMISSIONS
CREATE OR REPLACE FUNCTION public.fn_save_meal_settings(
    p_is_meal_module_enabled BOOLEAN,
    p_breakfast_enabled BOOLEAN,
    p_lunch_enabled BOOLEAN,
    p_dinner_enabled BOOLEAN,
    p_cutoff_time TIME
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role
        FROM public.profiles
        WHERE id = v_caller_id;
    END IF;

    IF v_caller_role IS NOT NULL AND v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEAL_OPERATOR') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন বা ম্যানেজার মিল সেটিংস পরিবর্তন করতে পারেন।';
    END IF;

    UPDATE public.meal_settings
    SET is_meal_module_enabled = p_is_meal_module_enabled,
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

-- 5. GRANTS
GRANT ALL ON public.meal_rates TO authenticated, anon, service_role;
GRANT ALL ON public.meal_settings TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_create_meal_rate(DATE, NUMERIC, NUMERIC, NUMERIC) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.fn_save_meal_settings(BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TIME) TO authenticated, anon, service_role;

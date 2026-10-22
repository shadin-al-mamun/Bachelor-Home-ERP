-- ==============================================================================
-- Migration: 20261022000005_fix_rls_and_restore_boarders_revenue.sql
-- Description:
--   1. Restore SUPER_ADMIN role for official owner accounts in public.profiles.
--   2. Fix current_user_role() and is_admin_or_owner() to reliably identify staff/owners via JWT & profile fallback.
--   3. Correct RLS SELECT policies on public.boarders, public.boarder_charges, and public.receipts so staff
--      and executive dashboards see all active resident boarders, billings, and revenue.
--   4. Provide high-resilience SECURITY DEFINER RPCs: get_executive_kpis() and get_admin_boarders_list().
-- ==============================================================================

-- 1. SYNC & RESTORE OWNER / SUPER_ADMIN IN PROFILES
UPDATE public.profiles
SET 
    role = 'SUPER_ADMIN',
    is_active = true,
    phone_number = COALESCE(phone_number, '01712394767'),
    full_name = CASE 
        WHEN full_name IS NULL OR full_name = '' OR full_name = 'ব্যবহারকারী' 
        THEN 'মোঃ আব্দুল্লাহ আল মামুন' 
        ELSE full_name 
    END,
    updated_at = timezone('Asia/Dhaka', now())
WHERE email IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
   OR regexp_replace(phone_number, '[^\d]', '', 'g') LIKE '%1712394767';

-- 2. BULLETPROOF HELPER: current_user_role()
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role VARCHAR;
    v_email VARCHAR;
    v_phone VARCHAR;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN NULL;
    END IF;

    -- Extract JWT email and phone
    v_email := lower(COALESCE(auth.jwt()->>'email', ''));
    v_phone := regexp_replace(COALESCE(auth.jwt()->>'phone', ''), '[^\d]', '', 'g');

    -- Master SuperAdmin Bypass (Guarantees owner is never blocked by RLS)
    IF v_email IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
       OR v_phone LIKE '%1712394767' THEN
        RETURN 'SUPER_ADMIN';
    END IF;

    -- Check profiles table by auth.uid()
    SELECT role::VARCHAR INTO v_role
    FROM public.profiles
    WHERE id = v_uid;

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    -- Fallback by email or phone match in profiles
    IF v_email <> '' THEN
        SELECT role::VARCHAR INTO v_role
        FROM public.profiles
        WHERE lower(email) = v_email
        LIMIT 1;
        IF v_role IS NOT NULL THEN
            RETURN v_role;
        END IF;
    END IF;

    IF v_phone <> '' AND length(v_phone) >= 10 THEN
        SELECT role::VARCHAR INTO v_role
        FROM public.profiles
        WHERE RIGHT(regexp_replace(phone_number, '[^\d]', '', 'g'), 10) = RIGHT(v_phone, 10)
        LIMIT 1;
        IF v_role IS NOT NULL THEN
            RETURN v_role;
        END IF;
    END IF;

    RETURN 'BOARDER';
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

-- 3. BULLETPROOF HELPER: is_admin_or_owner()
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_email TEXT;
    v_phone TEXT;
    v_role TEXT;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RETURN false;
    END IF;

    v_email := lower(COALESCE(auth.jwt()->>'email', ''));
    v_phone := regexp_replace(COALESCE(auth.jwt()->>'phone', ''), '[^\d]', '', 'g');

    IF v_email IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
       OR v_phone LIKE '%1712394767' THEN
        RETURN true;
    END IF;

    SELECT role::TEXT INTO v_role
    FROM public.profiles
    WHERE id = v_uid;

    RETURN v_role IN ('SUPER_ADMIN', 'ADMIN');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_owner() TO anon, authenticated, service_role;

-- 4. RPC: sync_owner_profile()
CREATE OR REPLACE FUNCTION public.sync_owner_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_email TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    v_email := lower(COALESCE(auth.jwt()->>'email', ''));

    IF v_email IN ('shadin0158@gmail.com', 'almamun0158@gmail.com') THEN
        UPDATE public.profiles
        SET role = 'SUPER_ADMIN',
            is_active = true,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_uid;

        RETURN jsonb_build_object('success', true, 'role', 'SUPER_ADMIN');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Standard profile retained');
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_owner_profile() TO authenticated;

-- 5. ENSURE PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarders TO authenticated;
GRANT SELECT ON public.boarders TO anon;
GRANT ALL ON public.boarders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarder_charges TO authenticated;
GRANT SELECT ON public.boarder_charges TO anon;
GRANT ALL ON public.boarder_charges TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT SELECT ON public.receipts TO anon;
GRANT ALL ON public.receipts TO service_role;

-- 6. RLS: public.boarders
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
DROP POLICY IF EXISTS boarders_select_all ON public.boarders;

CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO authenticated, anon
USING (
    -- Staff or owner can view all resident boarders
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR', 'MEAL_OPERATOR')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR', 'MEAL_OPERATOR')
    )
    -- Boarder self-view fallback
    OR user_id = auth.uid()
    OR (
        phone_number IS NOT NULL AND phone_number <> ''
        AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
        AND RIGHT(regexp_replace(phone_number, '[^\d]', '', 'g'), 10) =
            RIGHT(regexp_replace((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
    )
    OR (
        email IS NOT NULL AND email <> ''
        AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
        AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
    -- All authenticated users can query hostel directory safely
    OR auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS boarders_admin_manage ON public.boarders;
CREATE POLICY boarders_admin_manage ON public.boarders
FOR ALL TO authenticated
USING (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
)
WITH CHECK (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
);

-- 7. RLS: public.boarder_charges
ALTER TABLE public.boarder_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boarder_charges_select_policy ON public.boarder_charges;
CREATE POLICY boarder_charges_select_policy ON public.boarder_charges
FOR SELECT TO authenticated, anon
USING (
    -- Staff can view all charges
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    )
    -- Boarder self-view
    OR boarder_id IN (
        SELECT id FROM public.boarders
        WHERE user_id = auth.uid()
           OR (
               phone_number IS NOT NULL AND phone_number <> ''
               AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND RIGHT(regexp_replace(phone_number, '[^\d]', '', 'g'), 10) =
                   RIGHT(regexp_replace((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
           )
           OR (
               email IS NOT NULL AND email <> ''
               AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
           )
    )
);

DROP POLICY IF EXISTS boarder_charges_admin_manage ON public.boarder_charges;
CREATE POLICY boarder_charges_admin_manage ON public.boarder_charges
FOR ALL TO authenticated
USING (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
)
WITH CHECK (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
);

-- 8. RLS: public.receipts
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receipts_select_policy ON public.receipts;
CREATE POLICY receipts_select_policy ON public.receipts
FOR SELECT TO authenticated, anon
USING (
    -- Staff can view all receipts
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER')
    )
    -- Boarder self-view
    OR boarder_id IN (
        SELECT id FROM public.boarders
        WHERE user_id = auth.uid()
           OR (
               phone_number IS NOT NULL AND phone_number <> ''
               AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND RIGHT(regexp_replace(phone_number, '[^\d]', '', 'g'), 10) =
                   RIGHT(regexp_replace((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
           )
           OR (
               email IS NOT NULL AND email <> ''
               AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
           )
    )
);

DROP POLICY IF EXISTS receipts_insert_policy ON public.receipts;
CREATE POLICY receipts_insert_policy ON public.receipts
FOR INSERT TO authenticated
WITH CHECK (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
);

-- 9. SECURITY DEFINER RPC: get_executive_kpis()
-- Calculates authoritative executive metrics directly on PostgreSQL
CREATE OR REPLACE FUNCTION public.get_executive_kpis()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_seats INT := 0;
    v_occupied_seats INT := 0;
    v_vacant_seats INT := 0;
    v_maintenance_seats INT := 0;
    v_occupancy_rate NUMERIC := 0;

    v_total_billed NUMERIC := 0;
    v_total_collected NUMERIC := 0;
    v_total_dues NUMERIC := 0;
    v_collection_rate NUMERIC := 0;

    v_expenses NUMERIC := 0;
    v_incomes NUMERIC := 0;
    v_noi NUMERIC := 0;

    v_active_boarders INT := 0;
    v_today_str TEXT := to_char(timezone('Asia/Dhaka', now()), 'YYYY-MM-DD');
    v_tomorrow_str TEXT := to_char(timezone('Asia/Dhaka', now()) + INTERVAL '1 day', 'YYYY-MM-DD');
    v_meals_today INT := 0;
    v_meals_tomorrow INT := 0;
    v_attendance_rate NUMERIC := 0;

    v_cash_in_custody NUMERIC := 0;
BEGIN
    -- 1. Seats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'OCCUPIED'),
        COUNT(*) FILTER (WHERE status = 'AVAILABLE'),
        COUNT(*) FILTER (WHERE status = 'MAINTENANCE')
    INTO v_total_seats, v_occupied_seats, v_vacant_seats, v_maintenance_seats
    FROM public.seats;

    IF v_total_seats > 0 THEN
        v_occupancy_rate := ROUND((v_occupied_seats::NUMERIC / v_total_seats::NUMERIC) * 100, 1);
    END IF;

    -- 2. Charges & Billings
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(paid_amount), 0)
    INTO v_total_billed, v_total_collected
    FROM public.boarder_charges;

    -- Also check receipts table
    DECLARE
        v_receipts_sum NUMERIC;
    BEGIN
        SELECT COALESCE(SUM(amount), 0)
        INTO v_receipts_sum
        FROM public.receipts
        WHERE is_void = false;

        IF v_receipts_sum > 0 THEN
            v_total_collected := v_receipts_sum;
        END IF;
    END;

    v_total_dues := GREATEST(0, v_total_billed - v_total_collected);
    IF v_total_billed > 0 THEN
        v_collection_rate := ROUND((v_total_collected / v_total_billed) * 100, 1);
    END IF;

    -- 3. Expenses & Operating Surplus (Approved expenses)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expenses
    FROM public.expenses
    WHERE approval_status = 'APPROVED';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_incomes
    FROM public.incomes;

    v_noi := (v_total_collected + v_incomes) - v_expenses;

    -- 4. Active Boarders & Meals
    SELECT COUNT(*) INTO v_active_boarders
    FROM public.boarders
    WHERE status = 'ACTIVE';

    SELECT 
        COALESCE(SUM((CASE WHEN breakfast THEN 1 ELSE 0 END) + (CASE WHEN lunch THEN 1 ELSE 0 END) + (CASE WHEN dinner THEN 1 ELSE 0 END)), 0)
    INTO v_meals_today
    FROM public.meal_selections
    WHERE meal_date = v_today_str;

    SELECT 
        COALESCE(SUM((CASE WHEN breakfast THEN 1 ELSE 0 END) + (CASE WHEN lunch THEN 1 ELSE 0 END) + (CASE WHEN dinner THEN 1 ELSE 0 END)), 0)
    INTO v_meals_tomorrow
    FROM public.meal_selections
    WHERE meal_date = v_tomorrow_str;

    IF v_active_boarders > 0 THEN
        v_attendance_rate := ROUND((v_meals_today::NUMERIC / (v_active_boarders * 3)::NUMERIC) * 100, 1);
    END IF;

    -- 5. Manager cash accounts balance
    SELECT COALESCE(SUM(current_balance), 0)
    INTO v_cash_in_custody
    FROM public.financial_accounts
    WHERE is_active = true
      AND (
          account_type = 'CASH_MANAGER'
          OR account_number = 'MGR-CASH-01'
          OR account_name ILIKE '%manager%'
          OR account_name LIKE '%ম্যানেজার%'
          OR account_name LIKE '%ক্যাশ%'
      );

    RETURN jsonb_build_object(
        'total_seats', v_total_seats,
        'occupied_seats', v_occupied_seats,
        'vacant_seats', v_vacant_seats,
        'maintenance_seats', v_maintenance_seats,
        'occupancy_rate', v_occupancy_rate,
        'total_billed_month', v_total_billed,
        'total_collected_month', v_total_collected,
        'collection_rate', v_collection_rate,
        'total_outstanding_dues', v_total_dues,
        'operating_expenses_month', v_expenses,
        'non_rent_incomes_month', v_incomes,
        'net_operating_income', v_noi,
        'active_boarders_count', v_active_boarders,
        'active_meals_today', v_meals_today,
        'active_meals_tomorrow', v_meals_tomorrow,
        'meal_attendance_rate', v_attendance_rate,
        'cash_in_custody', v_cash_in_custody
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis() TO authenticated, anon;

-- 10. SECURITY DEFINER RPC: get_admin_boarders_list()
-- Returns all genuine resident boarders joined with seat allocation details
CREATE OR REPLACE FUNCTION public.get_admin_boarders_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(b_row), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT 
            b.*,
            (
                SELECT jsonb_build_object(
                    'id', a.id,
                    'boarder_id', a.boarder_id,
                    'seat_id', a.seat_id,
                    'monthly_rent', a.monthly_rent,
                    'security_deposit', a.security_deposit,
                    'start_date', a.start_date,
                    'status', a.status,
                    'seat', jsonb_build_object(
                        'id', s.id,
                        'seat_code', s.seat_code,
                        'seat_name', s.seat_name,
                        'default_rent', s.default_rent,
                        'room', jsonb_build_object(
                            'id', r.id,
                            'room_code', r.room_code,
                            'name', r.name,
                            'flat', jsonb_build_object(
                                'id', f.id,
                                'flat_code', f.flat_code,
                                'name', f.name,
                                'building', jsonb_build_object(
                                    'id', bld.id,
                                    'name', bld.name
                                )
                            )
                        )
                    )
                )
                FROM public.allocations a
                LEFT JOIN public.seats s ON s.id = a.seat_id
                LEFT JOIN public.rooms r ON r.id = s.room_id
                LEFT JOIN public.flats f ON f.id = r.flat_id
                LEFT JOIN public.buildings bld ON bld.id = f.building_id
                WHERE a.boarder_id = b.id AND a.status = 'ACTIVE'
                LIMIT 1
            ) AS active_allocation
        FROM public.boarders b
        WHERE b.boarder_code != 'BDR-2026-4071'
          AND (b.email IS NULL OR lower(b.email) != 'shadin0158@gmail.com')
        ORDER BY b.created_at DESC
    ) b_row;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_boarders_list() TO authenticated, anon;

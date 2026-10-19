-- ==============================================================================
-- Bachelor Home ERP — Migration 000019: Separate Staff From Resident Boarders
-- File: supabase/migrations/20261015000019_cleanup_staff_from_boarders.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   1. Removes test boarder records created for administrative staff/super_admin.
--   2. Ensures SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT, MEAL_OPERATOR, AUDITOR
--      cannot be inserted or treated as resident boarders in public.boarders.
--   3. Keeps the authentic staff user profile and full admin privileges intact in public.profiles.
-- ==============================================================================

-- 1. CLEAN UP ALLOCATIONS & CHARGES LINKED TO STAFF BOARDER RECORDS
DELETE FROM public.allocations 
WHERE boarder_id IN (
    SELECT b.id 
    FROM public.boarders b
    LEFT JOIN public.profiles p ON b.user_id = p.id
    WHERE b.boarder_code = 'BDR-2026-4071'
       OR b.email = 'shadin0158@gmail.com'
       OR p.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')
);

DELETE FROM public.boarder_charges 
WHERE boarder_id IN (
    SELECT b.id 
    FROM public.boarders b
    LEFT JOIN public.profiles p ON b.user_id = p.id
    WHERE b.boarder_code = 'BDR-2026-4071'
       OR b.email = 'shadin0158@gmail.com'
       OR p.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')
);

DELETE FROM public.meal_records 
WHERE boarder_id IN (
    SELECT b.id 
    FROM public.boarders b
    LEFT JOIN public.profiles p ON b.user_id = p.id
    WHERE b.boarder_code = 'BDR-2026-4071'
       OR b.email = 'shadin0158@gmail.com'
       OR p.role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')
);

-- 2. DELETE STAFF FROM THE RESIDENT BOARDERS TABLE
-- (Note: This does NOT delete auth.users or public.profiles. Staff keep full login & admin access!)
DELETE FROM public.boarders 
WHERE boarder_code = 'BDR-2026-4071'
   OR (email = 'shadin0158@gmail.com' AND user_id IN (SELECT id FROM public.profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')))
   OR user_id IN (SELECT id FROM public.profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR'));


-- 3. UPDATE RPC FUNCTION TO STRICTLY FORBID STAFF FROM BECOMING BOARDERS
CREATE OR REPLACE FUNCTION public.submit_boarder_application(
    p_user_id UUID DEFAULT NULL,
    p_full_name VARCHAR DEFAULT '',
    p_phone_number VARCHAR DEFAULT '',
    p_email VARCHAR DEFAULT NULL,
    p_guardian_name VARCHAR DEFAULT '',
    p_guardian_phone VARCHAR DEFAULT '',
    p_guardian_relation VARCHAR DEFAULT 'অভিভাবক',
    p_permanent_address TEXT DEFAULT '',
    p_institution VARCHAR DEFAULT NULL,
    p_nid_passport_number VARCHAR DEFAULT NULL,
    p_present_address TEXT DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_student_id VARCHAR DEFAULT NULL,
    p_session VARCHAR DEFAULT NULL,
    p_nid_document_url TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_boarder_code VARCHAR;
    v_boarder_id UUID;
    v_result JSONB;
    v_effective_user_id UUID;
    v_year TEXT;
    v_user_role public.user_role;
BEGIN
    v_effective_user_id := COALESCE(auth.uid(), p_user_id);
    v_year := to_char(timezone('Asia/Dhaka', now()), 'YYYY');

    -- Check if user is already a staff member (SUPER_ADMIN, ADMIN, MANAGER, etc.)
    IF v_effective_user_id IS NOT NULL THEN
        SELECT role INTO v_user_role FROM public.profiles WHERE id = v_effective_user_id;
        IF v_user_role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR') THEN
            RAISE EXCEPTION 'কর্মকর্তা বা কর্মচারীদের (Super Admin, Admin, Manager ইত্যাদি) বোর্ডার হিসেবে নিবন্ধন করা যাবে না। তারা স্ব স্ব প্রশাসনিক পদবীধারী।';
        END IF;
    END IF;

    -- Also check if email matches an existing staff member
    IF p_email IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE lower(email) = lower(trim(p_email)) 
          AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')
    ) THEN
        RAISE EXCEPTION 'এই ইমেইলটি একজন প্রশাসনিক কর্মকর্তা বা কর্মচারীর। কর্মকর্তাদের বোর্ডার হিসেবে নিবন্ধন করা যাবে না।';
    END IF;

    -- Generate unique boarder code (e.g. BDR-2026-1234)
    LOOP
        v_boarder_code := 'BDR-' || v_year || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.boarders WHERE boarder_code = v_boarder_code);
    END LOOP;

    -- If user_id exists in auth.users but not in profiles, insert profile safely
    IF v_effective_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_effective_user_id) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_effective_user_id) THEN
        INSERT INTO public.profiles (id, email, full_name, phone_number, role, is_active, preferred_language)
        VALUES (
            v_effective_user_id,
            COALESCE(p_email, 'user_' || v_effective_user_id || '@bachelorhome.erp'),
            COALESCE(NULLIF(p_full_name, ''), 'নতুন আবেদনকারী'),
            COALESCE(p_phone_number, ''),
            'APPLICANT'::public.user_role,
            true,
            'bn'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- If user_id is still not in public.profiles, set to NULL to prevent Foreign Key constraint violation
    IF v_effective_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_effective_user_id) THEN
        v_effective_user_id := NULL;
    END IF;

    -- Insert into public.boarders with status strictly set to 'PENDING'
    INSERT INTO public.boarders (
        user_id,
        boarder_code,
        full_name,
        phone_number,
        email,
        guardian_name,
        guardian_phone,
        guardian_relation,
        present_address,
        permanent_address,
        institution,
        department,
        student_id,
        session,
        nid_passport_number,
        nid_document_url,
        status,
        remarks,
        admission_date
    ) VALUES (
        v_effective_user_id,
        v_boarder_code,
        p_full_name,
        p_phone_number,
        p_email,
        p_guardian_name,
        p_guardian_phone,
        p_guardian_relation,
        p_present_address,
        p_permanent_address,
        p_institution,
        p_department,
        p_student_id,
        p_session,
        p_nid_passport_number,
        p_nid_document_url,
        'PENDING',
        COALESCE(p_remarks, 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন জমা পড়েছে।'),
        CURRENT_DATE
    )
    RETURNING id INTO v_boarder_id;

    SELECT jsonb_build_object(
        'id', b.id,
        'boarder_code', b.boarder_code,
        'full_name', b.full_name,
        'phone_number', b.phone_number,
        'email', b.email,
        'status', b.status,
        'admission_date', b.admission_date,
        'created_at', b.created_at
    ) INTO v_result
    FROM public.boarders b
    WHERE b.id = v_boarder_id;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_boarder_application TO anon, authenticated, service_role;


-- 4. UNRESTRICTED RLS POLICIES FOR USER & STAFF MANAGEMENT
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_flat_assignments TO anon, authenticated, service_role;

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS user_flat_assignments_select ON public.user_flat_assignments;
CREATE POLICY user_flat_assignments_select ON public.user_flat_assignments
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS user_flat_assignments_all ON public.user_flat_assignments;
CREATE POLICY user_flat_assignments_all ON public.user_flat_assignments
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);


-- 5. RE-POPULATE GENUINE RESIDENT BOARDER & RESTORE PROFILES
-- Ensure the owner is strictly SUPER_ADMIN
UPDATE public.profiles 
SET role = 'SUPER_ADMIN' 
WHERE email = 'shadin0158@gmail.com';

-- Ensure non-owner accounts that were accidentally elevated are set to BOARDER
UPDATE public.profiles 
SET role = 'BOARDER' 
WHERE email != 'shadin0158@gmail.com' AND role = 'SUPER_ADMIN';

-- Ensure genuine active boarder 'আল ইমরান' exists in public.boarders
INSERT INTO public.boarders (
    boarder_code,
    full_name,
    phone_number,
    email,
    institution,
    department,
    guardian_name,
    guardian_phone,
    permanent_address,
    status,
    admission_date
)
SELECT 
    'BDR-2026-3688',
    'আল ইমরান',
    '01683877525',
    'imran@example.com',
    'নির্বাচন কমিশন সচিবালয়',
    'ব্যক্তিগত কর্মকর্তা',
    'মোবারক হোসেন',
    '01711998877',
    'ঢাকা',
    'ACTIVE',
    CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM public.boarders WHERE boarder_code = 'BDR-2026-3688' OR phone_number = '01683877525'
);

-- Ensure all pending applicants from profiles are in boarders
INSERT INTO public.boarders (
    user_id,
    boarder_code,
    full_name,
    phone_number,
    email,
    guardian_name,
    guardian_phone,
    permanent_address,
    status,
    admission_date
)
SELECT 
    p.id,
    'BDR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
    p.full_name,
    p.phone_number,
    p.email,
    'অভিভাবক',
    p.phone_number,
    'বাংলাদেশ',
    'PENDING',
    CURRENT_DATE
FROM public.profiles p
WHERE p.role = 'APPLICANT'
  AND NOT EXISTS (
      SELECT 1 FROM public.boarders b 
      WHERE b.user_id = p.id OR (b.email IS NOT NULL AND lower(b.email) = lower(p.email))
  );

-- Ensure RLS on all accommodation and billing tables is open for reading
GRANT SELECT ON public.boarders TO anon, authenticated;
GRANT SELECT ON public.allocations TO anon, authenticated;
GRANT SELECT ON public.seats TO anon, authenticated;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT ON public.flats TO anon, authenticated;
GRANT SELECT ON public.buildings TO anon, authenticated;

DROP POLICY IF EXISTS boarders_select_all ON public.boarders;
CREATE POLICY boarders_select_all ON public.boarders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS allocations_select_all ON public.allocations;
CREATE POLICY allocations_select_all ON public.allocations FOR SELECT TO anon, authenticated USING (true);



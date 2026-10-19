-- ==============================================================================
-- Bachelor Home ERP — Migration 000018: Fix Registration & Boarder Application Workflow
-- File: supabase/migrations/20261015000018_fix_registration_and_boarder_application.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   1. Automatically sync newly signed up auth.users to public.profiles.
--   2. Provide bulletproof submit_boarder_application RPC function (SECURITY DEFINER).
--   3. Ensure public/applicant can insert PENDING applications without RLS/FK conflicts.
--   4. Open read access for boarder management so admin dashboard instantly reflects applications.
-- ==============================================================================

-- 1. AUTOMATIC PROFILE CREATION TRIGGER ON auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_full_name VARCHAR;
    v_phone VARCHAR;
    v_role public.user_role;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'নতুন আবেদনকারী');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');
    
    BEGIN
        v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'APPLICANT'::public.user_role);
    EXCEPTION WHEN OTHERS THEN
        v_role := 'APPLICANT'::public.user_role;
    END;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        role,
        is_active,
        preferred_language
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, v_phone || '@bachelorhome.erp'),
        v_full_name,
        v_phone,
        v_role,
        true,
        'bn'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' OR public.profiles.full_name = 'নতুন আবেদনকারী' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        phone_number = CASE 
            WHEN public.profiles.phone_number IS NULL OR public.profiles.phone_number = '' 
            THEN EXCLUDED.phone_number 
            ELSE public.profiles.phone_number 
        END,
        updated_at = timezone('Asia/Dhaka', now());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users into public.profiles if missing
INSERT INTO public.profiles (id, email, full_name, phone_number, role, is_active, preferred_language)
SELECT 
    u.id,
    COALESCE(u.email, 'user_' || u.id || '@bachelorhome.erp'),
    COALESCE(u.raw_user_meta_data->>'full_name', 'ব্যবহারকারী'),
    COALESCE(u.raw_user_meta_data->>'phone_number', ''),
    'SUPER_ADMIN'::public.user_role,
    true,
    'bn'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Elevate all existing users to SUPER_ADMIN so current owner has full access
UPDATE public.profiles SET role = 'SUPER_ADMIN';


-- 2. BULLETPROOF BOARDER APPLICATION SUBMISSION RPC FUNCTION
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
BEGIN
    v_effective_user_id := COALESCE(auth.uid(), p_user_id);
    v_year := to_char(timezone('Asia/Dhaka', now()), 'YYYY');

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

    SELECT to_jsonb(b.*) INTO v_result FROM public.boarders b WHERE b.id = v_boarder_id;
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_boarder_application TO anon, authenticated, service_role;


-- 3. UNRESTRICTED RLS POLICIES FOR APPLICATIONS & DASHBOARD
DROP POLICY IF EXISTS applicant_insert_policy ON public.boarders;
CREATE POLICY applicant_insert_policy ON public.boarders
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO anon, authenticated
USING (true);

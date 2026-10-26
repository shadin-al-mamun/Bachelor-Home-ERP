-- ==============================================================================
-- Migration: 20261026000001_add_photo_url_to_boarder_application.sql
-- Description: Add p_photo_url parameter to submit_boarder_application RPC
-- and ensure photo_url is stored on boarders table upon registration.
-- ==============================================================================

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
    p_remarks TEXT DEFAULT NULL,
    p_photo_url TEXT DEFAULT NULL
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
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            phone_number,
            role,
            created_at,
            updated_at
        ) VALUES (
            v_effective_user_id,
            p_email,
            p_full_name,
            p_phone_number,
            'APPLICANT',
            now(),
            now()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Insert into boarders table with pending status, photo_url and nid_document_url
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
        photo_url,
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
        p_photo_url,
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
        'photo_url', b.photo_url,
        'nid_document_url', b.nid_document_url,
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

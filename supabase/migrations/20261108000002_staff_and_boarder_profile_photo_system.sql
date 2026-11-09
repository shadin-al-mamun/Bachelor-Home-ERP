-- ==============================================================================
-- Migration: 20261108000002_staff_and_boarder_profile_photo_system.sql
-- Description:
-- 1. Ensure 'avatars' bucket exists with public access for boarders and staff photos.
-- 2. Update submit_boarder_application RPC to reliably save avatar_url in profiles.
-- 3. Provide update_user_avatar RPC for officers and boarders to update their profile photo.
-- 4. Self-heal any existing records where boarders.photo_url was not copied to profiles.avatar_url.
-- ==============================================================================

-- 1. Ensure 'avatars' bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Storage RLS policies for 'avatars' bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Public Select'
    ) THEN
        CREATE POLICY "Avatars Public Select" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Public Upload'
    ) THEN
        CREATE POLICY "Avatars Public Upload" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'avatars');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Avatars Public Update'
    ) THEN
        CREATE POLICY "Avatars Public Update" ON storage.objects
        FOR UPDATE USING (bucket_id = 'avatars');
    END IF;
END $$;

-- 3. Update submit_boarder_application to set profiles.avatar_url
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

    -- Ensure profile exists and has avatar_url populated
    IF v_effective_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            phone_number,
            role,
            avatar_url,
            created_at,
            updated_at
        ) VALUES (
            v_effective_user_id,
            p_email,
            p_full_name,
            p_phone_number,
            'APPLICANT',
            p_photo_url,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
            updated_at = now();

        -- Also update profile if it already existed
        IF p_photo_url IS NOT NULL THEN
            UPDATE public.profiles
            SET avatar_url = p_photo_url,
                updated_at = now()
            WHERE id = v_effective_user_id;
        END IF;
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

-- 4. Create update_user_avatar RPC function
CREATE OR REPLACE FUNCTION public.update_user_avatar(
    p_user_id UUID,
    p_avatar_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_profile JSONB;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'ব্যবহারকারীর আইডি (user_id) আবশ্যক।';
    END IF;

    -- Update profiles table
    UPDATE public.profiles
    SET avatar_url = p_avatar_url,
        updated_at = now()
    WHERE id = p_user_id;

    -- Also sync with boarders table if this user is a boarder
    UPDATE public.boarders
    SET photo_url = p_avatar_url,
        updated_at = now()
    WHERE user_id = p_user_id;

    SELECT jsonb_build_object(
        'id', id,
        'full_name', full_name,
        'email', email,
        'phone_number', phone_number,
        'role', role,
        'avatar_url', avatar_url,
        'updated_at', updated_at
    ) INTO v_updated_profile
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'profile', v_updated_profile
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_avatar TO anon, authenticated, service_role;

-- 5. Self-heal existing records: Sync photo_url <-> profiles.avatar_url
-- Boarders with photo_url -> profiles.avatar_url
UPDATE public.profiles p
SET avatar_url = b.photo_url,
    updated_at = now()
FROM public.boarders b
WHERE b.user_id = p.id
  AND b.photo_url IS NOT NULL
  AND b.photo_url != ''
  AND (p.avatar_url IS NULL OR p.avatar_url = '');

-- Boarders matching by phone if user_id was null
UPDATE public.profiles p
SET avatar_url = b.photo_url,
    updated_at = now()
FROM public.boarders b
WHERE b.phone_number IS NOT NULL
  AND b.phone_number = p.phone_number
  AND b.photo_url IS NOT NULL
  AND b.photo_url != ''
  AND (p.avatar_url IS NULL OR p.avatar_url = '');

-- Profiles with avatar_url -> boarders.photo_url
UPDATE public.boarders b
SET photo_url = p.avatar_url,
    updated_at = now()
FROM public.profiles p
WHERE b.user_id = p.id
  AND p.avatar_url IS NOT NULL
  AND p.avatar_url != ''
  AND (b.photo_url IS NULL OR b.photo_url = '');


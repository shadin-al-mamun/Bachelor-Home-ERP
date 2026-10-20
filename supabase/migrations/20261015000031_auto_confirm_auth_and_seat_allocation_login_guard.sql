-- ==============================================================================
-- Bachelor Home ERP — Migration 000031: Auto-Confirm Auth Accounts & Seat Allocation Login Guard
-- File: supabase/migrations/20261015000031_auto_confirm_auth_and_seat_allocation_login_guard.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   1. Auto-confirms all existing unconfirmed accounts in auth.users by updating email_confirmed_at.
--      (Note: confirmed_at is a GENERATED ALWAYS column in Supabase and auto-updates).
--   2. Adds an auth.users trigger to automatically confirm all new user accounts upon creation.
--   3. Provides a public SECURITY DEFINER RPC confirm_user_account for seamless self-healing login.
--   4. Provides verify_boarder_seat_status RPC to enforce the business rule:
--      "সিট বরাদ্দ না হলে বর্ডাররা তার আইডিতে ঢুকতে পারবেনা, কিন্তু সিট বরাদ্দ থাকা অবস্থায় বর্ডার তার আইডিতে ঢুকতে পারার কথা।"
--   5. Enhances fn_allocate_seat to automatically confirm auth user and synchronize boarder role.
-- ==============================================================================

-- 1. AUTO-CONFIRM ALL EXISTING UNCONFIRMED USERS IN auth.users
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 2. CREATE TRIGGER FUNCTION TO AUTO-CONFIRM FUTURE USER SIGNUPS
CREATE OR REPLACE FUNCTION public.handle_auto_confirm_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
CREATE TRIGGER tr_auto_confirm_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_confirm_user();

-- 3. RPC FUNCTION: CONFIRM USER ACCOUNT (SELF-HEALING)
CREATE OR REPLACE FUNCTION public.confirm_user_account(
    p_email TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_affected INT := 0;
BEGIN
    -- Confirm by direct email match
    IF p_email IS NOT NULL AND p_email <> '' THEN
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE LOWER(email) = LOWER(p_email)
          AND email_confirmed_at IS NULL;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

    -- Confirm by phone number match in email or phone column
    IF v_affected = 0 AND p_phone IS NOT NULL AND p_phone <> '' THEN
        v_clean_phone := regexp_replace(p_phone, '[^\d]', '', 'g');
        IF length(v_clean_phone) >= 10 THEN
            v_clean_phone := substring(v_clean_phone from length(v_clean_phone) - 9);
        END IF;

        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE (
            email ILIKE '%' || v_clean_phone || '%'
            OR phone = p_phone
            OR phone = '+88' || p_phone
            OR phone = '88' || p_phone
        )
        AND email_confirmed_at IS NULL;
        GET DIAGNOSTICS v_affected = ROW_COUNT;
    END IF;

    RETURN v_affected > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_user_account(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_user_account(TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. RPC FUNCTION: VERIFY BOARDER SEAT ALLOCATION STATUS
-- Enforces: "সিট বরাদ্দ না হলে বর্ডাররা তার আইডিতে ঢুকতে পারবেনা, কিন্তু সিট বরাদ্দ থাকা অবস্থায় বর্ডার তার আইডিতে ঢুকতে পারার কথা।"
CREATE OR REPLACE FUNCTION public.verify_boarder_seat_status(
    p_user_id UUID DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
    has_active_seat BOOLEAN,
    boarder_id UUID,
    boarder_name TEXT,
    boarder_code TEXT,
    boarder_status TEXT,
    seat_id UUID,
    seat_code TEXT,
    seat_name TEXT,
    room_name TEXT,
    flat_name TEXT,
    building_name TEXT,
    monthly_rent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_phone TEXT;
    v_last_10 TEXT;
    v_bdr RECORD;
    v_alloc RECORD;
BEGIN
    IF p_phone IS NOT NULL THEN
        v_clean_phone := regexp_replace(p_phone, '[^\d]', '', 'g');
        IF length(v_clean_phone) >= 10 THEN
            v_last_10 := substring(v_clean_phone from length(v_clean_phone) - 9);
        ELSE
            v_last_10 := v_clean_phone;
        END IF;
    END IF;

    -- Step 1: Look up boarder in public.boarders
    SELECT b.id, b.full_name, b.boarder_code, b.status
    INTO v_bdr
    FROM public.boarders b
    WHERE (p_user_id IS NOT NULL AND b.user_id = p_user_id)
       OR (v_clean_phone IS NOT NULL AND (
           b.phone_number = p_phone
           OR regexp_replace(b.phone_number, '[^\d]', '', 'g') = v_clean_phone
           OR regexp_replace(b.phone_number, '[^\d]', '', 'g') LIKE '%' || v_last_10
       ))
       OR (p_email IS NOT NULL AND LOWER(b.email) = LOWER(p_email))
    ORDER BY b.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- Check if profile exists
        RETURN QUERY SELECT 
            false AS has_active_seat,
            NULL::UUID AS boarder_id,
            NULL::TEXT AS boarder_name,
            NULL::TEXT AS boarder_code,
            'NOT_FOUND'::TEXT AS boarder_status,
            NULL::UUID AS seat_id,
            NULL::TEXT AS seat_code,
            NULL::TEXT AS seat_name,
            NULL::TEXT AS room_name,
            NULL::TEXT AS flat_name,
            NULL::TEXT AS building_name,
            0::NUMERIC AS monthly_rent;
        RETURN;
    END IF;

    -- Step 2: Query active allocation for this boarder
    SELECT 
        a.id AS alloc_id,
        a.monthly_rent,
        s.id AS seat_id,
        s.seat_code,
        s.seat_name,
        r.name AS room_name,
        f.name AS flat_name,
        bld.name AS building_name
    INTO v_alloc
    FROM public.allocations a
    JOIN public.seats s ON s.id = a.seat_id
    JOIN public.rooms r ON r.id = s.room_id
    JOIN public.flats f ON f.id = r.flat_id
    JOIN public.buildings bld ON bld.id = f.building_id
    WHERE a.boarder_id = v_bdr.id
      AND a.status = 'ACTIVE'
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT 
            true AS has_active_seat,
            v_bdr.id AS boarder_id,
            v_bdr.full_name::TEXT AS boarder_name,
            v_bdr.boarder_code::TEXT AS boarder_code,
            v_bdr.status::TEXT AS boarder_status,
            v_alloc.seat_id AS seat_id,
            v_alloc.seat_code::TEXT AS seat_code,
            v_alloc.seat_name::TEXT AS seat_name,
            v_alloc.room_name::TEXT AS room_name,
            v_alloc.flat_name::TEXT AS flat_name,
            v_alloc.building_name::TEXT AS building_name,
            v_alloc.monthly_rent AS monthly_rent;
    ELSE
        RETURN QUERY SELECT 
            false AS has_active_seat,
            v_bdr.id AS boarder_id,
            v_bdr.full_name::TEXT AS boarder_name,
            v_bdr.boarder_code::TEXT AS boarder_code,
            v_bdr.status::TEXT AS boarder_status,
            NULL::UUID AS seat_id,
            NULL::TEXT AS seat_code,
            NULL::TEXT AS seat_name,
            NULL::TEXT AS room_name,
            NULL::TEXT AS flat_name,
            NULL::TEXT AS building_name,
            0::NUMERIC AS monthly_rent;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_boarder_seat_status(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_boarder_seat_status(UUID, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. UPGRADE fn_allocate_seat TO AUTO-CONFIRM USER AND SET ACTIVE BOARDER ROLE
CREATE OR REPLACE FUNCTION public.fn_allocate_seat(
    p_boarder_id UUID,
    p_seat_id UUID,
    p_monthly_rent NUMERIC(12,2),
    p_security_deposit NUMERIC(12,2) DEFAULT 0.00,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_seat_status public.seat_status;
    v_boarder_status public.boarder_status;
    v_existing_alloc_id UUID;
    v_new_alloc_id UUID;
    v_target_boarder_id UUID := p_boarder_id;
    v_user_id UUID;
BEGIN
    -- Check if boarder row exists
    SELECT status, user_id INTO v_boarder_status, v_user_id
    FROM public.boarders
    WHERE id = v_target_boarder_id;

    -- If boarder ID was not found in boarders table, check if it is a profile ID (self-registered applicant)
    IF v_boarder_status IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target_boarder_id) THEN
            INSERT INTO public.boarders (
                user_id,
                boarder_code,
                full_name,
                phone_number,
                email,
                status,
                admission_date,
                guardian_name,
                guardian_phone,
                permanent_address
            )
            SELECT 
                p.id,
                'BDR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
                COALESCE(NULLIF(p.full_name, ''), 'নতুন বোর্ডার'),
                COALESCE(p.phone_number, ''),
                p.email,
                'ACTIVE',
                COALESCE(p_start_date, CURRENT_DATE),
                'অভিভাবক',
                COALESCE(p.phone_number, ''),
                'ঠিকানা সংরক্ষিত'
            FROM public.profiles p
            WHERE p.id = v_target_boarder_id
            RETURNING id, status, user_id INTO v_target_boarder_id, v_boarder_status, v_user_id;

            -- Upgrade profile role to BOARDER
            UPDATE public.profiles
            SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_user_id;
        ELSE
            RAISE EXCEPTION 'বর্ডার আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    -- If boarder is in PENDING status, allocating a seat automatically makes them an ACTIVE resident
    IF v_boarder_status = 'PENDING' THEN
        UPDATE public.boarders 
        SET 
            status = 'ACTIVE', 
            admission_date = COALESCE(admission_date, p_start_date, CURRENT_DATE),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_target_boarder_id;
        v_boarder_status := 'ACTIVE';

        -- Upgrade profile role if user account is linked
        IF v_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_user_id;
        END IF;
    END IF;

    -- Ensure auth user email is confirmed upon seat allocation so login is instantaneous
    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_id AND email_confirmed_at IS NULL;
    END IF;

    IF v_boarder_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় (ACTIVE) বা অপেক্ষমান (PENDING) আবেদনকারীকে সিট বরাদ্দ দেওয়া সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    -- Ensure boarder does not already have an ACTIVE allocation
    SELECT id INTO v_existing_alloc_id
    FROM public.allocations
    WHERE boarder_id = v_target_boarder_id AND status = 'ACTIVE'
    LIMIT 1;

    IF v_existing_alloc_id IS NOT NULL THEN
        RAISE EXCEPTION 'এই বর্ডারের ইতিমধ্যে একটি সক্রিয় সিট বরাদ্দ রয়েছে।' USING ERRCODE = 'P0003';
    END IF;

    -- Concurrency check: Lock seat row and check status
    SELECT status INTO v_seat_status
    FROM public.seats
    WHERE id = p_seat_id
    FOR UPDATE;

    IF v_seat_status IS NULL THEN
        RAISE EXCEPTION 'সিট আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_seat_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'সিটটি বর্তমানে খালি নেই (স্ট্যাটাস: %)। অন্য সিট নির্বাচন করুন।', v_seat_status USING ERRCODE = 'P0004';
    END IF;

    -- Create allocation record
    INSERT INTO public.allocations (
        boarder_id,
        seat_id,
        monthly_rent,
        security_deposit,
        start_date,
        status,
        remarks,
        created_by
    ) VALUES (
        v_target_boarder_id,
        p_seat_id,
        p_monthly_rent,
        p_security_deposit,
        p_start_date,
        'ACTIVE',
        p_remarks,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Update seat status to OCCUPIED
    UPDATE public.seats
    SET status = 'OCCUPIED', updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_seat_id;

    -- Insert immutable audit history
    INSERT INTO public.allocation_history (
        allocation_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        v_new_alloc_id,
        p_seat_id,
        'INITIAL',
        p_start_date,
        COALESCE(p_remarks, 'প্রাথমিক সিট বরাদ্দ সম্পন্ন'),
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_allocate_seat(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_allocate_seat(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT) TO authenticated, service_role;

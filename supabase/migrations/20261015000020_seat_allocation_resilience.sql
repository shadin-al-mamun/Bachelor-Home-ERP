-- ==============================================================================
-- Bachelor Home ERP — Migration 000020: Seat Allocation Resilience & Auto-Activation
-- File: supabase/migrations/20261015000020_seat_allocation_resilience.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   1. Upgrades fn_allocate_seat RPC to support allocating seats to both
--      ACTIVE resident boarders and PENDING applicants (auto-activating them upon seat allocation).
--   2. Resolves applicant profile ID synthesis so allocations never throw 'Boarder ID not found'.
--   3. Synchronizes baseline resident boarders (Al Imran) and all applicant profiles.
--   4. Grants necessary SELECT/INSERT/UPDATE permissions for seamless operations.
-- ==============================================================================

-- 1. UPGRADE fn_allocate_seat WITH ATOMIC BOARDER ACTIVATION & SYNTHESIS
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
SET search_path = public, pg_temp
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

            -- Upgrade profile role
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
        COALESCE(p_start_date, CURRENT_DATE),
        'ACTIVE',
        p_remarks,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Record in immutable allocation history
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        v_new_alloc_id,
        NULL,
        p_seat_id,
        'INITIAL',
        COALESCE(p_start_date, CURRENT_DATE),
        COALESCE(p_remarks, 'সিট বরাদ্দ সম্পন্ন'),
        auth.uid()
    );

    -- Ensure seat status is explicitly OCCUPIED
    UPDATE public.seats
    SET status = 'OCCUPIED', updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_seat_id;

    RETURN v_new_alloc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_allocate_seat TO anon, authenticated, service_role;


-- 2. ENSURE BASELINE ACTIVE RESIDENT BOARDER 'আল ইমরান' EXISTS
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


-- 3. SYNC ANY PENDING APPLICANTS FROM PROFILES INTO BOARDERS
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
    COALESCE(NULLIF(p.full_name, ''), 'নতুন আবেদনকারী'),
    COALESCE(p.phone_number, ''),
    p.email,
    'অভিভাবক',
    COALESCE(p.phone_number, ''),
    'বাংলাদেশ',
    'PENDING',
    CURRENT_DATE
FROM public.profiles p
WHERE p.role = 'APPLICANT'
  AND NOT EXISTS (
      SELECT 1 FROM public.boarders b 
      WHERE b.user_id = p.id OR (b.email IS NOT NULL AND lower(b.email) = lower(p.email))
  );


-- 4. GRANT PERMISSIONS AND RLS POLICIES
GRANT SELECT, INSERT, UPDATE ON public.allocations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.boarders TO anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.seats TO anon, authenticated, service_role;

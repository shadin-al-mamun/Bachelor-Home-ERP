-- Migration: 20261104000001_seat_departure_notice_and_advance_booking.sql
-- Description: Enable future departure notices, preserve active boarder status until departure date,
--              support advance booking for soon-to-be-vacant seats, and fix boarder listing allocation resolution.

BEGIN;

-- 1. DROP RESTRICTIVE UNIQUE CONSTRAINT THAT BLOCKED FUTURE ALLOCATIONS
DROP INDEX IF EXISTS public.idx_unique_active_seat_allocation;

-- Replace with index ensuring only one OPEN-ENDED active allocation exists per seat
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_open_seat_allocation 
ON public.allocations (seat_id) 
WHERE status = 'ACTIVE' AND end_date IS NULL;

-- 2. UPGRADE fn_cancel_allocation TO SUPPORT ADVANCE DEPARTURE NOTICES
CREATE OR REPLACE FUNCTION public.fn_cancel_allocation(
    p_allocation_id UUID,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ENDED'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alloc public.allocations%ROWTYPE;
    v_target_status public.allocation_status;
    v_user_id UUID;
    v_is_future BOOLEAN;
BEGIN
    SELECT * INTO v_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ রেকর্ড পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    v_target_status := p_status::public.allocation_status;
    v_is_future := (COALESCE(p_end_date, CURRENT_DATE) > CURRENT_DATE);

    IF v_is_future THEN
        -- Future departure notice: Boarder remains active and in seat until p_end_date
        UPDATE public.allocations
        SET end_date = p_end_date,
            cancellation_reason = p_reason,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_allocation_id;

        -- Record scheduled leaving date on boarder, but keep boarder ACTIVE
        UPDATE public.boarders
        SET leaving_date = p_end_date,
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;
    ELSE
        -- Immediate departure: End allocation and set boarder status to LEFT
        UPDATE public.allocations
        SET status = v_target_status,
            end_date = COALESCE(p_end_date, CURRENT_DATE),
            cancellation_reason = p_reason,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_allocation_id;

        -- If no other active allocation exists on this seat, release to AVAILABLE
        IF NOT EXISTS (
            SELECT 1 FROM public.allocations a
            WHERE a.seat_id = v_alloc.seat_id AND a.id <> p_allocation_id AND a.status = 'ACTIVE'
        ) THEN
            UPDATE public.seats
            SET status = 'AVAILABLE',
                updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_alloc.seat_id;
        END IF;

        -- Update boarder status to LEFT
        SELECT user_id INTO v_user_id 
        FROM public.boarders 
        WHERE id = v_alloc.boarder_id;

        UPDATE public.boarders
        SET status = 'LEFT',
            leaving_date = COALESCE(p_end_date, CURRENT_DATE),
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;

        -- Demote linked auth profile role to APPLICANT only on immediate departure
        IF v_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET role = 'APPLICANT',
                updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_user_id AND role = 'BOARDER';
        END IF;
    END IF;

    -- Record immutable history entry
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        p_allocation_id,
        v_alloc.seat_id,
        NULL,
        CASE WHEN v_is_future THEN 'NOTICE' ELSE (CASE WHEN v_target_status = 'CANCELLED' THEN 'CANCEL' ELSE 'END' END) END,
        COALESCE(p_end_date, CURRENT_DATE),
        p_reason,
        auth.uid()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UPGRADE fn_allocate_seat TO ALLOW ADVANCE BOOKING ON SEATS SCHEDULED TO VACATE
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
    v_can_allocate BOOLEAN := FALSE;
BEGIN
    -- Check if boarder row exists
    SELECT status, user_id INTO v_boarder_status, v_user_id
    FROM public.boarders
    WHERE id = v_target_boarder_id;

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

            UPDATE public.profiles
            SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_user_id;
        ELSE
            RAISE EXCEPTION 'বর্ডার আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    IF v_boarder_status = 'PENDING' THEN
        UPDATE public.boarders 
        SET 
            status = 'ACTIVE', 
            admission_date = COALESCE(admission_date, p_start_date, CURRENT_DATE),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_target_boarder_id;
        v_boarder_status := 'ACTIVE';

        IF v_user_id IS NOT NULL THEN
            UPDATE public.profiles
            SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_user_id;
        END IF;
    END IF;

    IF v_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_id AND email_confirmed_at IS NULL;
    END IF;

    IF v_boarder_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় (ACTIVE) বা অপেক্ষমান (PENDING) আবেদনকারীকে সিট বরাদ্দ দেওয়া সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    -- Concurrency check: Lock seat row
    SELECT status INTO v_seat_status
    FROM public.seats
    WHERE id = p_seat_id
    FOR UPDATE;

    IF v_seat_status IS NULL THEN
        RAISE EXCEPTION 'সিট আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_seat_status = 'AVAILABLE' THEN
        v_can_allocate := TRUE;
    ELSIF v_seat_status = 'OCCUPIED' THEN
        -- Allow advance booking if current allocation ends before or on p_start_date
        IF EXISTS (
            SELECT 1 FROM public.allocations a
            WHERE a.seat_id = p_seat_id
              AND a.end_date IS NOT NULL
              AND a.end_date < COALESCE(p_start_date, CURRENT_DATE)
        ) AND NOT EXISTS (
            SELECT 1 FROM public.allocations a
            WHERE a.seat_id = p_seat_id
              AND (a.end_date IS NULL OR a.end_date >= COALESCE(p_start_date, CURRENT_DATE))
              AND (a.start_date IS NULL OR a.start_date >= COALESCE(p_start_date, CURRENT_DATE))
        ) THEN
            v_can_allocate := TRUE;
        END IF;
    END IF;

    IF NOT v_can_allocate THEN
        RAISE EXCEPTION 'সিটটি বর্তমানে খালি নেই বা নির্বাচিত তারিখে বরাদ্দযোগ্য নয়।' USING ERRCODE = 'P0004';
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

    UPDATE public.seats
    SET status = 'OCCUPIED', updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_seat_id;

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
        COALESCE(p_start_date, CURRENT_DATE),
        p_remarks,
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$;

-- 4. UPGRADE get_admin_boarders_list RPC TO RESOLVE BOTH CURRENT & UPCOMING ALLOCATIONS
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
                    'end_date', a.end_date,
                    'status', a.status,
                    'cancellation_reason', a.cancellation_reason,
                    'is_notice_pending', (a.end_date IS NOT NULL AND a.end_date >= CURRENT_DATE),
                    'is_upcoming', (a.start_date IS NOT NULL AND a.start_date > CURRENT_DATE),
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
                WHERE a.boarder_id = b.id
                  AND a.status <> 'CANCELLED'
                  AND (
                    -- 1. Currently residing today
                    ((a.start_date IS NULL OR a.start_date <= CURRENT_DATE) AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE))
                    OR
                    -- 2. Pre-booked upcoming allocation
                    (a.start_date > CURRENT_DATE)
                    OR
                    -- 3. Fallback active status
                    (a.status = 'ACTIVE')
                  )
                ORDER BY 
                  CASE 
                    WHEN (a.start_date IS NULL OR a.start_date <= CURRENT_DATE) AND (a.end_date IS NULL OR a.end_date >= CURRENT_DATE) THEN 1
                    WHEN a.start_date > CURRENT_DATE THEN 2
                    ELSE 3
                  END,
                  a.created_at DESC
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
GRANT EXECUTE ON FUNCTION public.fn_allocate_seat(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_cancel_allocation(UUID, DATE, TEXT, VARCHAR) TO authenticated, service_role;

-- 5. HEAL ANY ERRONEOUSLY ENDED ALLOCATIONS WITH FUTURE END_DATE
UPDATE public.allocations
SET status = 'ACTIVE'
WHERE status = 'ENDED'
  AND end_date IS NOT NULL
  AND end_date >= CURRENT_DATE;

UPDATE public.boarders
SET status = 'ACTIVE'
WHERE leaving_date IS NOT NULL
  AND leaving_date >= CURRENT_DATE
  AND status = 'LEFT';

COMMIT;

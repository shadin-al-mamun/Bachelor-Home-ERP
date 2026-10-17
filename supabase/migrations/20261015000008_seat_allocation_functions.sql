-- ==============================================================================
-- 20261015000008_seat_allocation_functions.sql
-- Master RPC Functions for Seat Allocation, Atomic Transfers, and Cancellations
-- Enforces concurrency protection and double-booking prevention.
-- ==============================================================================

-- 1. ATOMIC SEAT ALLOCATION
CREATE OR REPLACE FUNCTION public.fn_allocate_seat(
    p_boarder_id UUID,
    p_seat_id UUID,
    p_monthly_rent NUMERIC(12,2),
    p_security_deposit NUMERIC(12,2) DEFAULT 0.00,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_seat_status public.seat_status;
    v_boarder_status public.boarder_status;
    v_existing_alloc_id UUID;
    v_new_alloc_id UUID;
BEGIN
    -- Check boarder eligibility
    SELECT status INTO v_boarder_status
    FROM public.boarders
    WHERE id = p_boarder_id;

    IF v_boarder_status IS NULL THEN
        RAISE EXCEPTION 'বর্ডার আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_boarder_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় (ACTIVE) বর্ডারকে সিট বরাদ্দ দেওয়া সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    -- Ensure boarder does not already have an ACTIVE allocation
    SELECT id INTO v_existing_alloc_id
    FROM public.allocations
    WHERE boarder_id = p_boarder_id AND status = 'ACTIVE'
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

    -- Create allocation record (triggers seat status sync)
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
        p_boarder_id,
        p_seat_id,
        p_monthly_rent,
        p_security_deposit,
        p_start_date,
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
        p_start_date,
        COALESCE(p_remarks, 'প্রাথমিক সিট বরাদ্দ সম্পন্ন'),
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ATOMIC SEAT TRANSFER
CREATE OR REPLACE FUNCTION public.fn_transfer_seat(
    p_allocation_id UUID,
    p_new_seat_id UUID,
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_old_alloc public.allocations%ROWTYPE;
    v_new_seat_status public.seat_status;
    v_new_alloc_id UUID;
BEGIN
    -- Lock old allocation
    SELECT * INTO v_old_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_old_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_old_alloc.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় বরাদ্দ স্থানান্তর করা সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    IF v_old_alloc.seat_id = p_new_seat_id THEN
        RAISE EXCEPTION 'বর্তমান সিট এবং নতুন সিট একই হতে পারে না।' USING ERRCODE = 'P0005';
    END IF;

    -- Lock new seat and verify availability
    SELECT status INTO v_new_seat_status
    FROM public.seats
    WHERE id = p_new_seat_id
    FOR UPDATE;

    IF v_new_seat_status IS NULL THEN
        RAISE EXCEPTION 'নতুন সিট আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_new_seat_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'নতুন সিটটি বর্তমানে খালি নেই (স্ট্যাটাস: %)।', v_new_seat_status USING ERRCODE = 'P0004';
    END IF;

    -- Close old allocation
    UPDATE public.allocations
    SET status = 'TRANSFERRED',
        end_date = p_effective_date,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_allocation_id;

    -- Create new active allocation for target seat
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
        v_old_alloc.boarder_id,
        p_new_seat_id,
        v_old_alloc.monthly_rent,
        v_old_alloc.security_deposit,
        p_effective_date,
        'ACTIVE',
        p_reason,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Record transfer history
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
        v_old_alloc.seat_id,
        p_new_seat_id,
        'TRANSFER',
        p_effective_date,
        COALESCE(p_reason, 'সিট স্থানান্তর সম্পন্ন'),
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. SEAT CANCELLATION / DEPARTURE
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
BEGIN
    SELECT * INTO v_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ রেকর্ড পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_alloc.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'এই বরাদ্দটি ইতিমধ্যে সমাপ্ত বা বাতিল অবস্থায় আছে।' USING ERRCODE = 'P0001';
    END IF;

    v_target_status := p_status::public.allocation_status;

    -- Update allocation to ENDED or CANCELLED (Triggers seat status back to AVAILABLE)
    UPDATE public.allocations
    SET status = v_target_status,
        end_date = p_end_date,
        cancellation_reason = p_reason,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_allocation_id;

    -- Update boarder status to LEFT if departure
    IF v_target_status = 'ENDED' THEN
        UPDATE public.boarders
        SET status = 'LEFT',
            leaving_date = p_end_date,
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;
    END IF;

    -- Record history entry
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
        CASE WHEN v_target_status = 'CANCELLED' THEN 'CANCEL' ELSE 'END' END,
        p_end_date,
        p_reason,
        auth.uid()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- Bachelor Home ERP — Migration 20261122000002: Staff Seat Allocation & Free Rent Guarantee
-- File: supabase/migrations/20261122000002_staff_seat_allocation_and_free_rent.sql
--
-- PURPOSE:
-- 1. Support allocating seats to hostel staff/employees (e.g., cooks, cleaners, managers)
--    with 0 rent (free accommodation employment benefit).
-- 2. Staff seats MUST remain physically and statistically OCCUPIED (never shown as vacant).
-- 3. Batch monthly rent billing (fn_generate_monthly_rent_charges) MUST skip staff allocations
--    so NO rent charges, zero-taka invoices, or overdue arrears are generated.
-- 4. Guard fn_allocate_seat so allocating a seat to a staff profile does NOT downgrade
--    their profile role to 'BOARDER' (preserves STAFF, COOK, CLEANER, MANAGER, ADMIN roles).
-- ==============================================================================

BEGIN;

-- 1. UPGRADE fn_generate_monthly_rent_charges TO EXEMPT STAFF & 0-RENT ALLOCATIONS
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_rent_charges(
    p_billing_month DATE,
    p_due_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_normalized_month DATE;
    v_month_label TEXT;
    v_current_user UUID;
    v_alloc RECORD;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_exempt_staff INT := 0;
    v_exists BOOLEAN;
BEGIN
    v_current_user := auth.uid();
    v_normalized_month := DATE_TRUNC('month', p_billing_month)::DATE;
    v_month_label := to_char(v_normalized_month, 'FMMonth YYYY');

    -- Validate due date
    IF p_due_date IS NULL THEN
        p_due_date := v_normalized_month + INTERVAL '9 days'; -- Default to 10th
    END IF;

    -- Loop through all active allocations for active boarders
    FOR v_alloc IN
        SELECT 
            a.id AS allocation_id,
            a.boarder_id,
            a.monthly_rent,
            a.remarks,
            b.full_name,
            b.boarder_code,
            b.institution
        FROM public.allocations a
        JOIN public.boarders b ON b.id = a.boarder_id
        WHERE a.status = 'ACTIVE'
          AND b.status = 'ACTIVE'
    LOOP
        -- Check if staff / free accommodation (rent is 0 or remarks/institution indicate staff)
        IF COALESCE(v_alloc.monthly_rent, 0) <= 0 
           OR COALESCE(v_alloc.remarks, '') ILIKE '%স্টাফ%' 
           OR COALESCE(v_alloc.remarks, '') ILIKE '%কর্মচারী%'
           OR COALESCE(v_alloc.remarks, '') ILIKE '%staff%'
           OR COALESCE(v_alloc.institution, '') ILIKE '%কর্মচারী%'
           OR COALESCE(v_alloc.institution, '') ILIKE '%স্টাফ%'
           OR COALESCE(v_alloc.institution, '') ILIKE '%staff%' THEN
            v_exempt_staff := v_exempt_staff + 1;
            CONTINUE;
        END IF;

        -- Check if RENT charge already exists for this boarder and billing month
        SELECT EXISTS (
            SELECT 1 
            FROM public.boarder_charges bc
            WHERE bc.boarder_id = v_alloc.boarder_id
              AND bc.charge_type = 'RENT'
              AND bc.billing_month = v_normalized_month
              AND bc.status <> 'VOID'
        ) INTO v_exists;

        IF v_exists THEN
            v_skipped := v_skipped + 1;
        ELSE
            INSERT INTO public.boarder_charges (
                boarder_id,
                allocation_id,
                charge_type,
                billing_month,
                amount,
                paid_amount,
                status,
                due_date,
                description,
                created_by
            ) VALUES (
                v_alloc.boarder_id,
                v_alloc.allocation_id,
                'RENT',
                v_normalized_month,
                v_alloc.monthly_rent,
                0.00,
                'UNPAID',
                p_due_date,
                'মাসিক সিট ভাড়া (' || v_month_label || ')',
                v_current_user
            );

            v_generated := v_generated + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_normalized_month,
        'generated', v_generated,
        'skipped', v_skipped,
        'exempt_staff', v_exempt_staff,
        'message', format('মাসিক ভাড়া সফলভাবে সম্পন্ন: %s টি বিল তৈরি হয়েছে, %s টি পূর্বে তৈরিকৃত এবং %s জন কর্মচারী ফ্রি আবাসন বাবদ অব্যাহতি পেয়েছে।', v_generated, v_skipped, v_exempt_staff)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_rent_charges(DATE, DATE) TO authenticated;


-- 2. UPGRADE fn_allocate_seat TO PRESERVE STAFF ROLES AND ALLOW 0 RENT
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
    v_current_user_role TEXT;
    v_can_allocate BOOLEAN := FALSE;
BEGIN
    -- Check if boarder row exists
    SELECT status, user_id INTO v_boarder_status, v_user_id
    FROM public.boarders
    WHERE id = v_target_boarder_id;

    IF v_boarder_status IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target_boarder_id) THEN
            SELECT role INTO v_current_user_role FROM public.profiles WHERE id = v_target_boarder_id;
            
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
                permanent_address,
                institution
            )
            SELECT 
                p.id,
                CASE 
                    WHEN p.role IN ('STAFF', 'COOK', 'CLEANER', 'MANAGER') THEN 'STF-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0')
                    ELSE 'BDR-' || to_char(now(), 'YYYY') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0')
                END,
                COALESCE(NULLIF(p.full_name, ''), 'নতুন বোর্ডার'),
                COALESCE(p.phone_number, ''),
                p.email,
                'ACTIVE',
                COALESCE(p_start_date, CURRENT_DATE),
                'হোস্টেল কর্তৃপক্ষ',
                COALESCE(p.phone_number, ''),
                'হোস্টেল স্টাফ কোয়ার্টার',
                CASE 
                    WHEN p.role IN ('STAFF', 'COOK', 'CLEANER', 'MANAGER') THEN 'হোস্টেল কর্মচারী (' || p.role || ')'
                    ELSE 'সাধারণ বোর্ডার'
                END
            FROM public.profiles p
            WHERE p.id = v_target_boarder_id
            RETURNING id, status, user_id INTO v_target_boarder_id, v_boarder_status, v_user_id;

            -- Preserve staff/admin roles: DO NOT overwrite staff roles with 'BOARDER'
            IF v_current_user_role IS NULL OR v_current_user_role IN ('GUEST', 'BOARDER') THEN
                UPDATE public.profiles
                SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
                WHERE id = v_user_id;
            END IF;
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
            SELECT role INTO v_current_user_role FROM public.profiles WHERE id = v_user_id;
            IF v_current_user_role IS NULL OR v_current_user_role IN ('GUEST', 'BOARDER') THEN
                UPDATE public.profiles
                SET role = 'BOARDER', updated_at = timezone('Asia/Dhaka', now())
                WHERE id = v_user_id;
            END IF;
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

    -- Create allocation record (allows monthly_rent = 0 for staff)
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
        COALESCE(p_monthly_rent, 0.00),
        COALESCE(p_security_deposit, 0.00),
        COALESCE(p_start_date, CURRENT_DATE),
        'ACTIVE',
        p_remarks,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Set seat status to OCCUPIED so it is never shown as vacant
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

GRANT EXECUTE ON FUNCTION public.fn_allocate_seat(UUID, UUID, NUMERIC, NUMERIC, DATE, TEXT) TO authenticated, service_role;

COMMIT;

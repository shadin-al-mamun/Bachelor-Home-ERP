-- ==============================================================================
-- Bachelor Home ERP — Migration 000014: Day-End Cash Closing, Variance & Two-Party Handovers
-- File: supabase/migrations/20261015000014_day_end_and_handover_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. RLS POLICIES FOR CASH HANDOVERS & OWNER DEPOSITS

-- 1.1 Cash Handovers
DROP POLICY IF EXISTS cash_handovers_select ON public.cash_handovers;
CREATE POLICY cash_handovers_select ON public.cash_handovers
FOR SELECT TO authenticated
USING (
    sender_manager_id = auth.uid()
    OR receiver_manager_id = auth.uid()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS cash_handovers_insert ON public.cash_handovers;
CREATE POLICY cash_handovers_insert ON public.cash_handovers
FOR INSERT TO authenticated
WITH CHECK (
    sender_manager_id = auth.uid()
    AND public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

-- 1.2 Owner Deposits
DROP POLICY IF EXISTS owner_deposits_select ON public.owner_deposits;
CREATE POLICY owner_deposits_select ON public.owner_deposits
FOR SELECT TO authenticated
USING (
    manager_id = auth.uid()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS owner_deposits_insert ON public.owner_deposits;
CREATE POLICY owner_deposits_insert ON public.owner_deposits
FOR INSERT TO authenticated
WITH CHECK (
    manager_id = auth.uid()
    AND public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

-- 2. FUNCTION: fn_initiate_cash_handover
-- Initiates two-party cash transfer from one manager to another
CREATE OR REPLACE FUNCTION public.fn_initiate_cash_handover(
    p_receiver_manager_id UUID,
    p_amount NUMERIC(12,2),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_handover_no VARCHAR(50);
    v_handover_id UUID;
    v_receiver_name TEXT;
BEGIN
    -- Validation 1: Sender != Receiver
    IF v_current_user = p_receiver_manager_id THEN
        RAISE EXCEPTION 'নিজের কাছে নিজে ক্যাশ হস্তান্তর করা সম্ভব নয় (Sender and receiver cannot be the same manager).';
    END IF;

    -- Validation 2: Positive amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'হস্তান্তরের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    -- Validation 3: Reason is mandatory
    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'হস্তান্তরের সুনির্দিষ্ট কারণ উল্লেখ করা বাধ্যতামূলক (Reason is required).';
    END IF;

    -- Validate receiver exists
    SELECT full_name INTO v_receiver_name
    FROM public.profiles
    WHERE id = p_receiver_manager_id AND role IN ('MANAGER', 'SUPER_ADMIN', 'ADMIN');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'প্রাপক ম্যানেজার পাওয়া যায়নি (Recipient manager not found).';
    END IF;

    -- Generate Handover Number: HND-003001, etc.
    v_handover_no := 'HND-' || LPAD(nextval('handover_seq')::TEXT, 6, '0');

    -- Insert Handover Record
    INSERT INTO public.cash_handovers (
        handover_number,
        sender_manager_id,
        receiver_manager_id,
        amount,
        handover_reason,
        status
    )
    VALUES (
        v_handover_no,
        v_current_user,
        p_receiver_manager_id,
        p_amount,
        TRIM(p_reason),
        'PENDING'
    )
    RETURNING id INTO v_handover_id;

    RETURN jsonb_build_object(
        'success', true,
        'handover_id', v_handover_id,
        'handover_number', v_handover_no,
        'amount', p_amount,
        'receiver_name', v_receiver_name,
        'status', 'PENDING'
    );
END;
$$;

-- 3. FUNCTION: fn_record_owner_deposit
-- Records cash deposited directly to hostel owner
CREATE OR REPLACE FUNCTION public.fn_record_owner_deposit(
    p_amount NUMERIC(12,2),
    p_to_account_id UUID,
    p_payment_method VARCHAR(30) DEFAULT 'CASH',
    p_transaction_reference TEXT DEFAULT NULL,
    p_proof_attachment_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_deposit_no VARCHAR(50);
    v_deposit_id UUID;
    v_from_account_id UUID;
    v_target_account RECORD;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'জমার পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    -- Locate manager's cash account
    SELECT id INTO v_from_account_id
    FROM public.financial_accounts
    WHERE (assigned_manager_id = v_current_user OR assigned_manager_id IS NULL)
      AND account_type = 'CASH_MANAGER'
      AND is_active = true
    LIMIT 1;

    IF v_from_account_id IS NULL THEN
        -- Fallback to default cash account
        SELECT id INTO v_from_account_id
        FROM public.financial_accounts
        WHERE account_type IN ('CASH_MANAGER', 'CASH_OWNER')
        LIMIT 1;
    END IF;

    -- Validate target account
    SELECT * INTO v_target_account
    FROM public.financial_accounts
    WHERE id = p_to_account_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ওনার জমার গন্তব্য একাউন্টটি পাওয়া যায়নি (Target account not found).';
    END IF;

    -- Generate Deposit Number: DEP-002001, etc.
    v_deposit_no := 'DEP-' || LPAD(nextval('deposit_seq')::TEXT, 6, '0');

    INSERT INTO public.owner_deposits (
        deposit_number,
        manager_id,
        from_account_id,
        to_account_id,
        amount,
        payment_method,
        transaction_reference,
        proof_attachment_url,
        status
    )
    VALUES (
        v_deposit_no,
        v_current_user,
        v_from_account_id,
        p_to_account_id,
        p_amount,
        COALESCE(p_payment_method, 'CASH'),
        p_transaction_reference,
        p_proof_attachment_url,
        'PENDING'
    )
    RETURNING id INTO v_deposit_id;

    RETURN jsonb_build_object(
        'success', true,
        'deposit_id', v_deposit_id,
        'deposit_number', v_deposit_no,
        'amount', p_amount,
        'status', 'PENDING'
    );
END;
$$;

-- 4. FUNCTION: fn_reject_cash_handover
CREATE OR REPLACE FUNCTION public.fn_reject_cash_handover(
    p_handover_id UUID,
    p_rejection_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_handover RECORD;
BEGIN
    SELECT * INTO v_handover
    FROM public.cash_handovers
    WHERE id = p_handover_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'হ্যান্ডওভার রেকর্ড পাওয়া যায়নি (Handover record not found).';
    END IF;

    IF v_handover.status <> 'PENDING' THEN
        RAISE EXCEPTION 'হ্যান্ডওভারটি ইতিমধ্যেই % স্ট্যাটাসে রয়েছে।', v_handover.status;
    END IF;

    IF v_handover.receiver_manager_id <> v_current_user AND NOT public.is_admin_or_owner() THEN
        RAISE EXCEPTION 'শুধুমাত্র প্রাপক ম্যানেজার বা ওনার হ্যান্ডওভার বাতিল করতে পারবেন।';
    END IF;

    UPDATE public.cash_handovers
    SET status = 'REJECTED',
        rejection_reason = TRIM(p_rejection_reason),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_handover_id;

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
END;
$$;

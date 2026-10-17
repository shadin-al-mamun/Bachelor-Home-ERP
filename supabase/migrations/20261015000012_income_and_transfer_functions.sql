-- ==============================================================================
-- Bachelor Home ERP — Migration 000012: Non-Rent Incomes & Account Transfers
-- File: supabase/migrations/20261015000012_income_and_transfer_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. TRANSFER NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS transfer_seq START WITH 1001;

-- 2. RLS POLICIES FOR INCOMES & ACCOUNT TRANSFERS

-- 2.1 Income Categories Policies
DROP POLICY IF EXISTS income_categories_select ON public.income_categories;
CREATE POLICY income_categories_select ON public.income_categories
FOR SELECT TO authenticated USING (true);

-- 2.2 Incomes Policies
DROP POLICY IF EXISTS incomes_select ON public.incomes;
CREATE POLICY incomes_select ON public.incomes
FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND received_by = auth.uid())
);

DROP POLICY IF EXISTS incomes_insert ON public.incomes;
CREATE POLICY incomes_insert ON public.incomes
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND received_by = auth.uid()
);

DROP POLICY IF EXISTS incomes_no_direct_delete ON public.incomes;
CREATE POLICY incomes_no_direct_delete ON public.incomes
FOR DELETE TO authenticated USING (false);

-- 2.3 Account Transfers Policies
DROP POLICY IF EXISTS account_transfers_select ON public.account_transfers;
CREATE POLICY account_transfers_select ON public.account_transfers
FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER')
);

DROP POLICY IF EXISTS account_transfers_insert ON public.account_transfers;
CREATE POLICY account_transfers_insert ON public.account_transfers
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND created_by = auth.uid()
);

-- 3. FUNCTION: fn_record_income
-- Purpose: Atomically record non-rent revenues, increase destination account balance and update manager cash session if cash
CREATE OR REPLACE FUNCTION public.fn_record_income(
    p_category_id UUID,
    p_amount NUMERIC(12,2),
    p_destination_account_id UUID,
    p_building_id UUID DEFAULT NULL,
    p_flat_id UUID DEFAULT NULL,
    p_income_date DATE DEFAULT CURRENT_DATE,
    p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_voucher_no VARCHAR(50);
    v_income_id UUID;
    v_account RECORD;
    v_target_date DATE;
BEGIN
    -- Validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'আয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'আয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক (Description is required).';
    END IF;

    -- Validate Destination Account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_destination_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'জমা গ্রহণের একাউন্টটি পাওয়া যায়নি (Destination account not found).';
    END IF;

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত একাউন্টটি বর্তমানে সক্রিয় নয় (Account is inactive).';
    END IF;

    v_target_date := COALESCE(p_income_date, (timezone('Asia/Dhaka', now()))::DATE);

    -- Generate Voucher Number: INC-002001, etc.
    v_voucher_no := 'INC-' || LPAD(nextval('income_seq')::TEXT, 6, '0');

    -- Insert Income Record
    INSERT INTO public.incomes (
        income_voucher_no,
        category_id,
        amount,
        destination_account_id,
        building_id,
        flat_id,
        income_date,
        description,
        received_by
    )
    VALUES (
        v_voucher_no,
        p_category_id,
        p_amount,
        p_destination_account_id,
        p_building_id,
        p_flat_id,
        v_target_date,
        TRIM(p_description),
        v_current_user
    )
    RETURNING id INTO v_income_id;

    -- Add balance to destination financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- If destination account is manager cash custody, update manager daily cash session collections
    IF v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_current_user THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_target_date);

        UPDATE public.manager_cash_sessions
        SET cash_receipts = cash_receipts + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_target_date;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'income_id', v_income_id,
        'income_voucher_no', v_voucher_no,
        'amount', p_amount
    );
END;
$$;

-- 4. FUNCTION: fn_record_account_transfer
-- Purpose: Atomically transfer money between physical accounts (Cash/Bank/MFS).
-- Explicitly prevents double counting and ensures zero net change to total organization equity.
CREATE OR REPLACE FUNCTION public.fn_record_account_transfer(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount NUMERIC(12,2),
    p_transfer_date TIMESTAMPTZ DEFAULT timezone('Asia/Dhaka', now()),
    p_reference TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_transfer_no VARCHAR(50);
    v_transfer_id UUID;
    v_from_account RECORD;
    v_to_account RECORD;
    v_transfer_date TIMESTAMPTZ;
    v_today DATE;
BEGIN
    -- Validation 1: Accounts must be distinct
    IF p_from_account_id = p_to_account_id THEN
        RAISE EXCEPTION 'উৎস এবং গন্তব্য একই একাউন্ট হতে পারে না (Source and destination accounts must be distinct).';
    END IF;

    -- Validation 2: Amount must be positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'স্থানান্তরের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    v_transfer_date := COALESCE(p_transfer_date, timezone('Asia/Dhaka', now()));
    v_today := (timezone('Asia/Dhaka', v_transfer_date))::DATE;

    -- Lock and validate Source Account
    SELECT * INTO v_from_account
    FROM public.financial_accounts
    WHERE id = p_from_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'উৎস একাউন্টটি পাওয়া যায়নি (Source account not found).';
    END IF;

    IF NOT v_from_account.is_active THEN
        RAISE EXCEPTION 'উৎস একাউন্টটি নিষ্ক্রিয় রয়েছে (Source account is inactive).';
    END IF;

    -- Check sufficient balance
    IF v_from_account.current_balance < p_amount THEN
        RAISE EXCEPTION 'উৎস একাউন্টে পর্যাপ্ত ব্যালেন্স নেই (Insufficient funds. Current balance: ৳%, Requested: ৳%).', 
            v_from_account.current_balance, p_amount;
    END IF;

    -- Lock and validate Destination Account
    SELECT * INTO v_to_account
    FROM public.financial_accounts
    WHERE id = p_to_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'গন্তব্য একাউন্টটি পাওয়া যায়নি (Destination account not found).';
    END IF;

    IF NOT v_to_account.is_active THEN
        RAISE EXCEPTION 'গন্তব্য একাউন্টটি নিষ্ক্রিয় রয়েছে (Destination account is inactive).';
    END IF;

    -- Generate Transfer Number: TRF-001001, etc.
    v_transfer_no := 'TRF-' || LPAD(nextval('transfer_seq')::TEXT, 6, '0');

    -- Insert Transfer Record
    INSERT INTO public.account_transfers (
        transfer_number,
        from_account_id,
        to_account_id,
        amount,
        transfer_date,
        reference,
        remarks,
        created_by
    )
    VALUES (
        v_transfer_no,
        p_from_account_id,
        p_to_account_id,
        p_amount,
        v_transfer_date,
        p_reference,
        TRIM(p_remarks),
        v_current_user
    )
    RETURNING id INTO v_transfer_id;

    -- Deduct from Source Account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_from_account_id;

    -- Add to Destination Account
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_to_account_id;

    -- Track Manager Cash Session Impacts if Cash Account is involved:
    -- Case A: Manager Cash sent to Bank/Owner Deposit/MFS (Cash Out)
    IF v_from_account.account_type = 'CASH_MANAGER' OR v_from_account.assigned_manager_id = v_current_user THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

        UPDATE public.manager_cash_sessions
        SET cash_deposited_to_owner = cash_deposited_to_owner + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_today;
    END IF;

    -- Case B: Cash received into Manager Cash from Bank withdrawal (Cash In)
    IF v_to_account.account_type = 'CASH_MANAGER' OR v_to_account.assigned_manager_id = v_current_user THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

        UPDATE public.manager_cash_sessions
        SET cash_handed_over_in = cash_handed_over_in + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_today;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_no,
        'amount', p_amount,
        'from_account', v_from_account.account_name,
        'to_account', v_to_account.account_name
    );
END;
$$;

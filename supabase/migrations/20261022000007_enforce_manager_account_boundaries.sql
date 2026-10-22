-- ==============================================================================
-- Migration: 20261022000007_enforce_manager_account_boundaries.sql
-- Description:
--   1. Enforce that managers can ONLY transfer money OUT of their own manager cash custody account
--      (they cannot pull funds from Admin/Owner Account or Central Safe into Manager Cash).
--   2. Enforce that managers can ONLY record expenses paid out of their own manager cash custody account
--      (they cannot spend out of Owner/Admin Account, Bank, or other accounts).
--   3. Super Admins and Admins retain full multi-account transfer and expense privileges.
-- ==============================================================================

-- 1. Enforce Manager Boundary on fn_record_account_transfer
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

    -- Enforce Manager Boundaries:
    -- Managers can ONLY transfer OUT from their own manager cash account (CASH_MANAGER or assigned_manager_id = v_current_user).
    -- They CANNOT pull funds from Owner/Admin account or Central Vault.
    IF public.current_user_role() = 'MANAGER' AND NOT public.is_admin_or_owner() THEN
        IF v_from_account.account_type <> 'CASH_MANAGER' 
           AND (v_from_account.assigned_manager_id IS NULL OR v_from_account.assigned_manager_id <> v_current_user) THEN
            RAISE EXCEPTION 'ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকেই অর্থ স্থানান্তর করতে পারবেন (Managers can only transfer funds out of their own manager cash custody account).';
        END IF;
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

-- 2. Enforce Manager Boundary on fn_record_expense
CREATE OR REPLACE FUNCTION public.fn_record_expense(
    p_category_id UUID,
    p_amount NUMERIC(12,2),
    p_source_account_id UUID,
    p_building_id UUID DEFAULT NULL,
    p_flat_id UUID DEFAULT NULL,
    p_expense_date DATE DEFAULT CURRENT_DATE,
    p_description TEXT DEFAULT '',
    p_voucher_attachment_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_voucher_no VARCHAR(50);
    v_expense_id UUID;
    v_account RECORD;
    v_target_date DATE;
    v_resolved_category_id UUID;
    v_category_name VARCHAR(100);
BEGIN
    -- Validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'ব্যয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'ব্যয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক (Description is required).';
    END IF;

    -- Validate and safely resolve Category ID to avoid any FK violation
    SELECT id INTO v_resolved_category_id
    FROM public.expense_categories
    WHERE id = p_category_id;

    IF v_resolved_category_id IS NULL THEN
        -- Map standard known category IDs if provided
        v_category_name := CASE 
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111101'::UUID THEN 'Electric Bill'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111102'::UUID THEN 'Water & Gas'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111103'::UUID THEN 'Internet & WiFi'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111104'::UUID THEN 'Maintenance & Repairs'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111105'::UUID THEN 'Cook & Cleaner Salary'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111106'::UUID THEN 'Cleaning Supplies'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111107'::UUID THEN 'Dining & Grocery'
            WHEN p_category_id = 'a1111111-1111-4111-8111-111111111108'::UUID THEN 'Generator & Fuel'
            ELSE 'Miscellaneous'
        END;

        SELECT id INTO v_resolved_category_id
        FROM public.expense_categories
        WHERE LOWER(name) = LOWER(v_category_name)
        LIMIT 1;

        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.expense_categories (id, name, description, is_active)
            VALUES (p_category_id, v_category_name, 'Standard Expense Category', true)
            ON CONFLICT (name) DO UPDATE SET is_active = true
            RETURNING id INTO v_resolved_category_id;
        END IF;

        IF v_resolved_category_id IS NULL THEN
            SELECT id INTO v_resolved_category_id
            FROM public.expense_categories
            WHERE is_active = true
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.expense_categories (name, description, is_active)
            VALUES ('General Expense', 'সাধারণ হোস্টেল ব্যয়', true)
            RETURNING id INTO v_resolved_category_id;
        END IF;
    END IF;

    -- Validate Source Account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_source_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'অর্থ প্রদানের একাউন্টটি পাওয়া যায়নি (Financial account not found).';
    END IF;

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত একাউন্টটি বর্তমানে সক্রিয় নয় (Financial account is inactive).';
    END IF;

    -- Enforce Manager Boundaries:
    -- Managers can ONLY spend out of their own manager cash custody account (CASH_MANAGER or assigned_manager_id = v_current_user).
    IF public.current_user_role() = 'MANAGER' AND NOT public.is_admin_or_owner() THEN
        IF v_account.account_type <> 'CASH_MANAGER' 
           AND (v_account.assigned_manager_id IS NULL OR v_account.assigned_manager_id <> v_current_user) THEN
            RAISE EXCEPTION 'ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকেই খরচ করতে পারবেন (Managers can only record expenses from their own manager cash custody account).';
        END IF;
    END IF;

    v_target_date := COALESCE(p_expense_date, (timezone('Asia/Dhaka', now()))::DATE);

    -- Generate Voucher Number: EXP-005001, etc.
    v_voucher_no := 'EXP-' || LPAD(nextval('expense_seq')::TEXT, 6, '0');

    -- Insert Expense Record using verified resolved category
    INSERT INTO public.expenses (
        expense_voucher_no,
        category_id,
        amount,
        source_account_id,
        building_id,
        flat_id,
        expense_date,
        description,
        voucher_attachment_url,
        paid_by,
        approval_status
    )
    VALUES (
        v_voucher_no,
        v_resolved_category_id,
        p_amount,
        p_source_account_id,
        p_building_id,
        p_flat_id,
        v_target_date,
        TRIM(p_description),
        p_voucher_attachment_url,
        v_current_user,
        'PENDING'
    )
    RETURNING id INTO v_expense_id;

    -- Deduct balance from source financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_source_account_id;

    -- If source account is manager cash custody, update manager daily cash session expenses
    IF v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_current_user THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_target_date);

        UPDATE public.manager_cash_sessions
        SET cash_expenses = cash_expenses + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_target_date;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'voucher_number', v_voucher_no,
        'expense_voucher_no', v_voucher_no,
        'amount', p_amount,
        'category_id', v_resolved_category_id,
        'source_account_id', p_source_account_id,
        'expense_date', v_target_date,
        'approval_status', 'PENDING'
    );
END;
$$;

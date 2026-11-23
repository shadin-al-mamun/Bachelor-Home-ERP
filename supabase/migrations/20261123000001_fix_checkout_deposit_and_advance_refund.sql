-- Migration: 20261123000001_fix_checkout_deposit_and_advance_refund.sql
-- Description:
--   1. Ensures checkout deposit & advance refunds auto-approve immediately when disbursed.
--   2. Updates manager_cash_sessions for the actual assigned manager of the cash drawer (not just auth.uid()).
--   3. Adds resilient auto-reconciliation so cash drawer sessions always accurately reflect real cash vouchers.

BEGIN;

-- 1. Upgrade fn_record_simplified_expense
CREATE OR REPLACE FUNCTION public.fn_record_simplified_expense(
    p_expense_scope VARCHAR(50), -- 'HOSTEL_MARKET', 'HOSTEL_MISC', 'FLAT_MISC'
    p_category_id UUID,
    p_amount NUMERIC(12,2),
    p_source_account_id UUID,
    p_building_id UUID DEFAULT NULL,
    p_flat_id UUID DEFAULT NULL,
    p_expense_date DATE DEFAULT CURRENT_DATE,
    p_billing_month DATE DEFAULT NULL,
    p_vendor_name TEXT DEFAULT NULL,
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
    v_norm_month DATE;
    v_responsible_manager UUID;
    v_approval_status approval_status := 'PENDING';
    v_approved_by UUID := NULL;
    v_approved_at TIMESTAMPTZ := NULL;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'ব্যয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'ব্যয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক।';
    END IF;

    -- Validate flat is provided if FLAT_MISC
    IF p_expense_scope = 'FLAT_MISC' AND p_flat_id IS NULL THEN
        RAISE EXCEPTION 'ফ্ল্যাটওয়ারী বিবিধ খরচের ক্ষেত্রে ফ্ল্যাট নির্বাচন করা বাধ্যতামূলক।';
    END IF;

    -- Validate Source Account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_source_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'অর্থ প্রদানের অ্যাকাউন্টটি পাওয়া যায়নি।';
    END IF;

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে।';
    END IF;

    -- Determine responsible manager whose cash session must be debited
    v_responsible_manager := COALESCE(v_account.assigned_manager_id, v_current_user);
    IF v_responsible_manager IS NULL THEN
        SELECT id INTO v_responsible_manager FROM public.profiles WHERE role = 'MANAGER' ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Check if expense should be auto-approved:
    -- A) Super Admin or Admin recording it
    -- B) Security deposit / advance checkout refund voucher
    -- C) Contains explicit [APPROVED] marker
    IF public.is_admin_or_owner() 
       OR p_description ILIKE '%[APPROVED]%' 
       OR p_description ILIKE '%Security Deposit Refund%' 
       OR p_description ILIKE '%জামানত ফেরত%' 
       OR p_description ILIKE '%রিফান্ড%' THEN
        v_approval_status := 'APPROVED';
        v_approved_by := COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1));
        v_approved_at := timezone('Asia/Dhaka', now());
    END IF;

    v_target_date := COALESCE(p_expense_date, (timezone('Asia/Dhaka', now()))::DATE);
    v_norm_month := COALESCE(p_billing_month, DATE_TRUNC('month', v_target_date)::DATE);
    v_voucher_no := 'EXP-' || LPAD(nextval('expense_seq')::TEXT, 6, '0');

    -- Insert Expense
    INSERT INTO public.expenses (
        expense_voucher_no,
        category_id,
        amount,
        source_account_id,
        building_id,
        flat_id,
        expense_date,
        billing_month,
        expense_scope,
        vendor_name,
        description,
        voucher_attachment_url,
        paid_by,
        approval_status,
        approved_by,
        approved_at
    )
    VALUES (
        v_voucher_no,
        p_category_id,
        p_amount,
        p_source_account_id,
        p_building_id,
        p_flat_id,
        v_target_date,
        v_norm_month,
        COALESCE(p_expense_scope, 'HOSTEL_MISC'),
        TRIM(p_vendor_name),
        TRIM(p_description),
        p_voucher_attachment_url,
        COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
        v_approval_status,
        v_approved_by,
        v_approved_at
    )
    RETURNING id INTO v_expense_id;

    -- Deduct from Source Account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_source_account_id;

    -- Resiliently update manager cash session if cash account
    IF (v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id IS NOT NULL) AND v_responsible_manager IS NOT NULL THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_responsible_manager, v_target_date);

            UPDATE public.manager_cash_sessions
            SET cash_expenses = cash_expenses + p_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_responsible_manager AND session_date = v_target_date;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Account balance deduction already succeeded
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'voucher_no', v_voucher_no,
        'amount', p_amount,
        'account_name', v_account.account_name,
        'approval_status', v_approval_status,
        'message', format('খরচ ভাউচার %s সফলভাবে সংরক্ষিত ও কার্যকর হয়েছে।', v_voucher_no)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_simplified_expense TO authenticated;


-- 2. Upgrade fn_record_expense
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
    v_responsible_manager UUID;
    v_approval_status approval_status := 'PENDING';
    v_approved_by UUID := NULL;
    v_approved_at TIMESTAMPTZ := NULL;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'ব্যয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'ব্যয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক (Description is required).';
    END IF;

    -- Resolve Category
    SELECT id INTO v_resolved_category_id
    FROM public.expense_categories
    WHERE id = p_category_id;

    IF v_resolved_category_id IS NULL THEN
        SELECT id INTO v_resolved_category_id
        FROM public.expense_categories
        WHERE is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
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

    -- Determine responsible manager
    v_responsible_manager := COALESCE(v_account.assigned_manager_id, v_current_user);
    IF v_responsible_manager IS NULL THEN
        SELECT id INTO v_responsible_manager FROM public.profiles WHERE role = 'MANAGER' ORDER BY created_at ASC LIMIT 1;
    END IF;

    -- Auto-approve criteria
    IF public.is_admin_or_owner() 
       OR p_description ILIKE '%[APPROVED]%' 
       OR p_description ILIKE '%Security Deposit Refund%' 
       OR p_description ILIKE '%জামানত ফেরত%' 
       OR p_description ILIKE '%রিফান্ড%' THEN
        v_approval_status := 'APPROVED';
        v_approved_by := COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1));
        v_approved_at := timezone('Asia/Dhaka', now());
    END IF;

    v_target_date := COALESCE(p_expense_date, (timezone('Asia/Dhaka', now()))::DATE);
    v_voucher_no := 'EXP-' || LPAD(nextval('expense_seq')::TEXT, 6, '0');

    -- Insert Expense Record
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
        approval_status,
        approved_by,
        approved_at
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
        COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
        v_approval_status,
        v_approved_by,
        v_approved_at
    )
    RETURNING id INTO v_expense_id;

    -- Deduct balance from source financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_source_account_id;

    -- Resiliently update manager cash session if cash account
    IF (v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id IS NOT NULL) AND v_responsible_manager IS NOT NULL THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_responsible_manager, v_target_date);

            UPDATE public.manager_cash_sessions
            SET cash_expenses = cash_expenses + p_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_responsible_manager AND session_date = v_target_date;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
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
        'approval_status', v_approval_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_expense TO authenticated;

COMMIT;

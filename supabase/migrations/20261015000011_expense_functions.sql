-- ==============================================================================
-- Bachelor Home ERP — Migration 000011: Expense Management, Voucher Upload & Approval Functions
-- File: supabase/migrations/20261015000011_expense_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. ENSURE STORAGE BUCKET FOR EXPENSE VOUCHERS / RECEIPTS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'expense-receipts',
    'expense-receipts',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public can view expense vouchers" ON storage.objects;
CREATE POLICY "Public can view expense vouchers" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'expense-receipts');

DROP POLICY IF EXISTS "Staff can upload expense vouchers" ON storage.objects;
CREATE POLICY "Staff can upload expense vouchers" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'expense-receipts' 
    AND public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
);

-- 2. RLS UPDATE POLICY FOR EXPENSES (Admin / Super Admin review)
DROP POLICY IF EXISTS expenses_admin_update ON public.expenses;
CREATE POLICY expenses_admin_update ON public.expenses
FOR UPDATE TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- 3. FUNCTION: fn_record_expense
-- Purpose: Atomically record hostel expense, deduct account balance and update manager cash session if cash
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

        -- Attempt to find by matching name
        SELECT id INTO v_resolved_category_id
        FROM public.expense_categories
        WHERE LOWER(name) = LOWER(v_category_name)
        LIMIT 1;

        -- If still not found, insert with the given p_category_id or conflict update
        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.expense_categories (id, name, description, is_active)
            VALUES (p_category_id, v_category_name, 'Standard Expense Category', true)
            ON CONFLICT (name) DO UPDATE SET is_active = true
            RETURNING id INTO v_resolved_category_id;
        END IF;

        -- If still null, pick any active category
        IF v_resolved_category_id IS NULL THEN
            SELECT id INTO v_resolved_category_id
            FROM public.expense_categories
            WHERE is_active = true
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        -- If table was completely empty, insert a general category
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
        'expense_voucher_no', v_voucher_no,
        'amount', p_amount,
        'approval_status', 'PENDING'
    );
END;
$$;

-- 4. FUNCTION: fn_review_expense
-- Purpose: Approve or reject pending hostel expense. If rejected, safely refund source account balance
CREATE OR REPLACE FUNCTION public.fn_review_expense(
    p_expense_id UUID,
    p_status approval_status,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_expense RECORD;
    v_account RECORD;
BEGIN
    -- Only Owner or Admins can review
    IF NOT public.is_admin_or_owner() THEN
        RAISE EXCEPTION 'শুধুমাত্র অ্যাডমিন বা ওনার খরচ অনুমোদন/বাতিল করতে পারবেন।';
    END IF;

    IF p_status NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'স্ট্যাটাস শুধুমাত্র APPROVED অথবা REJECTED হতে হবে।';
    END IF;

    IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '') THEN
        RAISE EXCEPTION 'ভাউচার বাতিলের জন্য কারণ উল্লেখ করা বাধ্যতামূলক।';
    END IF;

    -- Lock and retrieve expense
    SELECT * INTO v_expense
    FROM public.expenses
    WHERE id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'খরচের ভাউচার পাওয়া যায়নি (Expense not found).';
    END IF;

    IF v_expense.approval_status = p_status THEN
        RAISE EXCEPTION 'ভাউচারটি ইতিমধ্যেই এই স্ট্যাটাসে রয়েছে।';
    END IF;

    -- Retrieve source account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = v_expense.source_account_id
    FOR UPDATE;

    -- Update expense record
    UPDATE public.expenses
    SET approval_status = p_status,
        approved_by = v_current_user,
        approved_at = timezone('Asia/Dhaka', now()),
        rejection_reason = CASE WHEN p_status = 'REJECTED' THEN TRIM(p_rejection_reason) ELSE NULL END,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_expense_id;

    -- If transitioning to REJECTED from PENDING or APPROVED, refund amount back to source account
    IF p_status = 'REJECTED' THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance + v_expense.amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_expense.source_account_id;

        -- Also restore cash session if manager cash
        IF v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_expense.paid_by THEN
            UPDATE public.manager_cash_sessions
            SET cash_expenses = GREATEST(0.00, cash_expenses - v_expense.amount),
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_expense.paid_by AND session_date = v_expense.expense_date;
        END IF;
    ELSIF p_status = 'APPROVED' AND v_expense.approval_status = 'REJECTED' THEN
        -- If re-approving a previously rejected voucher, deduct again
        UPDATE public.financial_accounts
        SET current_balance = current_balance - v_expense.amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_expense.source_account_id;

        IF v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_expense.paid_by THEN
            UPDATE public.manager_cash_sessions
            SET cash_expenses = cash_expenses + v_expense.amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_expense.paid_by AND session_date = v_expense.expense_date;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', p_expense_id,
        'approval_status', p_status,
        'rejection_reason', p_rejection_reason
    );
END;
$$;

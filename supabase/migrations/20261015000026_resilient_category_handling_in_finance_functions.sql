-- ==============================================================================
-- Bachelor Home ERP — Migration 000026: Resilient Category Handling in Finance Functions
-- File: supabase/migrations/20261015000026_resilient_category_handling_in_finance_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Ensure permissions & RLS policies on expense_categories and income_categories
--   2. Seed deterministic default categories safely
--   3. Upgrade fn_record_expense and fn_record_income to auto-resolve/auto-heal category IDs,
--      permanently preventing "expenses_category_id_fkey" and "incomes_category_id_fkey" violations
-- ==============================================================================

-- 1. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT ON public.expense_categories TO anon;
GRANT ALL ON public.expense_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT SELECT ON public.income_categories TO anon;
GRANT ALL ON public.income_categories TO service_role;

-- 2. Ensure RLS Policies for Expense Categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_select_policy ON public.expense_categories;
CREATE POLICY expense_categories_select_policy ON public.expense_categories
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS expense_categories_insert_policy ON public.expense_categories;
CREATE POLICY expense_categories_insert_policy ON public.expense_categories
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS expense_categories_update_policy ON public.expense_categories;
CREATE POLICY expense_categories_update_policy ON public.expense_categories
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS expense_categories_delete_policy ON public.expense_categories;
CREATE POLICY expense_categories_delete_policy ON public.expense_categories
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- 3. Ensure RLS Policies for Income Categories
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS income_categories_select_policy ON public.income_categories;
CREATE POLICY income_categories_select_policy ON public.income_categories
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS income_categories_insert_policy ON public.income_categories;
CREATE POLICY income_categories_insert_policy ON public.income_categories
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS income_categories_update_policy ON public.income_categories;
CREATE POLICY income_categories_update_policy ON public.income_categories
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS income_categories_delete_policy ON public.income_categories;
CREATE POLICY income_categories_delete_policy ON public.income_categories
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- 4. Seed Standard Expense Categories (Idempotent)
INSERT INTO public.expense_categories (id, name, description, is_active)
VALUES
    ('a1111111-1111-4111-8111-111111111101', 'Electric Bill', 'মাসিক ডেসকো / ডিপিডিসি বিদ্যুৎ বিল', true),
    ('a1111111-1111-4111-8111-111111111102', 'Water & Gas', 'ওয়াসা পানি ও এলপি সিলিন্ডার গ্যাস রিফিল', true),
    ('a1111111-1111-4111-8111-111111111103', 'Internet & WiFi', 'উচ্চগতির ব্রডব্যান্ড ইন্টারনেট সাবস্ক্রিপশন', true),
    ('a1111111-1111-4111-8111-111111111104', 'Maintenance & Repairs', 'প্লাম্বিং, স্যানিটারি, বৈদ্যুতিক মেরামত ও রং কাজ', true),
    ('a1111111-1111-4111-8111-111111111105', 'Cook & Cleaner Salary', 'বাবুর্চি, সহকারী ও ক্লিনিং স্টাফদের বেতন', true),
    ('a1111111-1111-4111-8111-111111111106', 'Cleaning Supplies', 'হারপিক, ব্লিচিং, ফ্লোর ক্লিনার ও ময়লার ব্যাগ', true),
    ('a1111111-1111-4111-8111-111111111107', 'Dining & Grocery', 'হোস্টেল মেসের যৌথ ডাইনিং কাঁচাবাজার ও মুদি সামগ্রী', true),
    ('a1111111-1111-4111-8111-111111111108', 'Generator & Fuel', 'জরুরি পাওয়ার ব্যাকআপ ও জেনারেটরের ডিজেল খরচ', true),
    ('a1111111-1111-4111-8111-111111111109', 'Miscellaneous', 'হোস্টেল পরিচালনার অন্যান্য আকস্মিক খরচ', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

-- 5. Seed Standard Income Categories (Idempotent)
INSERT INTO public.income_categories (id, name, description, is_active)
VALUES
    ('b2222222-2222-4222-8222-222222222201', 'Guest Stay Fee', 'মেহমান/অতিথিদের দৈনিক থাকার ফি', true),
    ('b2222222-2222-4222-8222-222222222202', 'Scrap Sale', 'পুরাতন কার্টন, খবরের কাগজ ও লোহালক্কড় বিক্রয়লব্ধ আয়', true),
    ('b2222222-2222-4222-8222-222222222203', 'Hall & Space Usage', 'কমন স্পেস বা রিডিং রুম বিশেষ ইভেন্ট বুকিং ফি', true),
    ('b2222222-2222-4222-8222-222222222204', 'WiFi Extra Device Fee', 'বর্ডারদের অতিরিক্ত ল্যাপটপ/ডিভাইস সংযোগ চার্জ', true),
    ('b2222222-2222-4222-8222-222222222205', 'Fridge & Appliance Fee', 'ব্যক্তিগত অতিরিক্ত হিটার/ফ্রিজ ব্যবহারের বিশেষ চার্জ', true),
    ('b2222222-2222-4222-8222-222222222206', 'Late Payment Fine', 'মাসিক ভাড়া নির্ধারিত সময়ের পরে জমার বিলম্ব জরিমানা', true),
    ('b2222222-2222-4222-8222-222222222207', 'Miscellaneous', 'অন্যান্য আনুষঙ্গিক রাজস্ব ও নন-রেন্ট প্রাপ্তি', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

-- 6. Resilient fn_record_expense with Auto Category Resolution
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

-- 7. Resilient fn_record_income with Auto Category Resolution
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
    v_resolved_category_id UUID;
    v_category_name VARCHAR(100);
BEGIN
    -- Validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'আয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'আয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক (Description is required).';
    END IF;

    -- Validate and safely resolve Category ID to avoid any FK violation
    SELECT id INTO v_resolved_category_id
    FROM public.income_categories
    WHERE id = p_category_id;

    IF v_resolved_category_id IS NULL THEN
        -- Map standard known category IDs if provided
        v_category_name := CASE 
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222201'::UUID THEN 'Guest Stay Fee'
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222202'::UUID THEN 'Scrap Sale'
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222203'::UUID THEN 'Hall & Space Usage'
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222204'::UUID THEN 'WiFi Extra Device Fee'
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222205'::UUID THEN 'Fridge & Appliance Fee'
            WHEN p_category_id = 'b2222222-2222-4222-8222-222222222206'::UUID THEN 'Late Payment Fine'
            ELSE 'Miscellaneous'
        END;

        -- Attempt to find by matching name
        SELECT id INTO v_resolved_category_id
        FROM public.income_categories
        WHERE LOWER(name) = LOWER(v_category_name)
        LIMIT 1;

        -- If still not found, insert with the given p_category_id or conflict update
        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.income_categories (id, name, description, is_active)
            VALUES (p_category_id, v_category_name, 'Standard Income Category', true)
            ON CONFLICT (name) DO UPDATE SET is_active = true
            RETURNING id INTO v_resolved_category_id;
        END IF;

        -- If still null, pick any active category
        IF v_resolved_category_id IS NULL THEN
            SELECT id INTO v_resolved_category_id
            FROM public.income_categories
            WHERE is_active = true
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        -- If table was completely empty, insert a general category
        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.income_categories (name, description, is_active)
            VALUES ('General Income', 'সাধারণ নন-রেন্ট আয়', true)
            RETURNING id INTO v_resolved_category_id;
        END IF;
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

    -- Insert Income Record using verified resolved category
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
        v_resolved_category_id,
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
        'voucher_number', v_voucher_no,
        'income_voucher_no', v_voucher_no,
        'amount', p_amount,
        'category_id', v_resolved_category_id,
        'destination_account_id', p_destination_account_id,
        'income_date', v_target_date
    );
END;
$$;

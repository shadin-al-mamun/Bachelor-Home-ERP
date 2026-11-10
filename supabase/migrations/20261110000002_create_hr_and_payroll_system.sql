-- ==============================================================================
-- Bachelor Home ERP — Migration 20261110000002: Human Resources & Payroll Management
-- File: supabase/migrations/20261110000002_create_hr_and_payroll_system.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency: BDT (NUMERIC(12,2))
-- ==============================================================================

-- 1. STAFF MEMBERS DIRECTORY
CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_code VARCHAR(50) UNIQUE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    emergency_contact VARCHAR(20),
    designation VARCHAR(100) NOT NULL, -- e.g. 'প্রধান বাবুর্চি', 'সহকারী বাবুর্চি', 'পরিচ্ছন্নতাকর্মী (বুয়া/খালা)', 'সিকিউরিটি গার্ড', 'ম্যানেজার'
    department VARCHAR(50) NOT NULL DEFAULT 'KITCHEN', -- 'KITCHEN', 'CLEANING', 'SECURITY', 'MAINTENANCE', 'MANAGEMENT', 'OTHER'
    nid_number VARCHAR(50),
    avatar_url TEXT,
    assigned_building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
    assigned_flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    resignation_date DATE,
    monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (monthly_salary >= 0),
    allowances JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    payment_method VARCHAR(50) DEFAULT 'CASH',
    bank_or_mfs_account VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_members_code ON public.staff_members(staff_code);
CREATE INDEX IF NOT EXISTS idx_staff_members_status ON public.staff_members(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_members_dept ON public.staff_members(department);

-- 2. STAFF ADVANCES & LOANS
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_no VARCHAR(50) UNIQUE NOT NULL,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    disbursed_from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    disbursed_by UUID REFERENCES public.profiles(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DEDUCTED', 'CANCELLED'
    deducted_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payroll_sheet_id UUID,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_advances_staff ON public.staff_advances(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_advances_status ON public.staff_advances(status);
CREATE INDEX IF NOT EXISTS idx_staff_advances_date ON public.staff_advances(advance_date);

-- 3. MONTHLY PAYROLL SHEETS
CREATE TABLE IF NOT EXISTS public.payroll_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_month VARCHAR(7) NOT NULL, -- e.g. '2026-11'
    payroll_batch_no VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'PAY-2026-11'
    total_basic_salary NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_allowances NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_bonuses NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_net_payable NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    total_paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'DISBURSED', 'CANCELLED'
    prepared_by UUID REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_payroll_sheets_month ON public.payroll_sheets(payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_sheets_status ON public.payroll_sheets(status);

-- 4. INDIVIDUAL PAYROLL ITEMS (Per Staff Calculation)
CREATE TABLE IF NOT EXISTS public.payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_sheet_id UUID NOT NULL REFERENCES public.payroll_sheets(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE RESTRICT,
    basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    allowances JSONB DEFAULT '[]'::jsonb,
    allowances_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    bonus_overtime NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    absence_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    other_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_payable NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PAID', 'PARTIALLY_PAID'
    disbursed_from_account_id UUID REFERENCES public.financial_accounts(id),
    disbursed_by UUID REFERENCES public.profiles(id),
    disbursement_date TIMESTAMPTZ,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_payroll_sheet_staff UNIQUE(payroll_sheet_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_sheet ON public.payroll_items(payroll_sheet_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_staff ON public.payroll_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_status ON public.payroll_items(payment_status);

-- Ensure dynamic allowances columns exist if tables already created previously
ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.payroll_sheets ADD COLUMN IF NOT EXISTS total_allowances NUMERIC(14,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.payroll_items ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.payroll_items ADD COLUMN IF NOT EXISTS allowances_total NUMERIC(12,2) NOT NULL DEFAULT 0.00;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

-- 5.1 Staff Members RLS
CREATE POLICY "Allow authenticated staff management"
ON public.staff_members
FOR ALL
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT', 'AUDITOR'))
)
WITH CHECK (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT'))
);

-- 5.2 Staff Advances RLS
CREATE POLICY "Allow authenticated staff advances management"
ON public.staff_advances
FOR ALL
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT', 'AUDITOR'))
)
WITH CHECK (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT'))
);

-- 5.3 Payroll Sheets RLS
CREATE POLICY "Allow authenticated payroll sheets management"
ON public.payroll_sheets
FOR ALL
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT', 'AUDITOR'))
)
WITH CHECK (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT'))
);

-- 5.4 Payroll Items RLS
CREATE POLICY "Allow authenticated payroll items management"
ON public.payroll_items
FOR ALL
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT', 'AUDITOR'))
)
WITH CHECK (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('MANAGER', 'ACCOUNTANT'))
);

-- 6. RPC: DISBURSE STAFF ADVANCE WITH INSTANT CASH ACCOUNT DEDUCTION
CREATE OR REPLACE FUNCTION public.fn_disburse_staff_advance(
    p_staff_id UUID,
    p_amount NUMERIC,
    p_disbursed_from_account_id UUID,
    p_advance_date DATE DEFAULT CURRENT_DATE,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_voucher_no TEXT;
    v_staff_name TEXT;
    v_account_balance NUMERIC;
    v_advance_id UUID;
    v_expense_id UUID;
    v_category_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'অগ্রিম বেতন অবশ্যই ০ টাকার বেশি হতে হবে।';
    END IF;

    SELECT full_name INTO v_staff_name
    FROM public.staff_members
    WHERE id = p_staff_id;

    IF v_staff_name IS NULL THEN
        RAISE EXCEPTION 'কর্মচারী খুঁজে পাওয়া যায়নি।';
    END IF;

    -- Check account balance
    SELECT current_balance INTO v_account_balance
    FROM public.financial_accounts
    WHERE id = p_disbursed_from_account_id AND is_active = true;

    IF v_account_balance IS NULL THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টটি সক্রিয় বা বিদ্যমান নয়।';
    END IF;

    IF v_account_balance < p_amount THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳%', v_account_balance;
    END IF;

    v_voucher_no := 'ADV-' || to_char(COALESCE(p_advance_date, CURRENT_DATE), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- Deduct from financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_disbursed_from_account_id;

    -- Ensure salary expense category exists
    SELECT id INTO v_category_id
    FROM public.expense_categories
    WHERE id = 'a1111111-1111-4111-8111-111111111105'
       OR name ILIKE '%বেতন%' OR name ILIKE '%Salary%'
    LIMIT 1;

    IF v_category_id IS NULL THEN
        INSERT INTO public.expense_categories (id, name, description, is_active)
        VALUES ('a1111111-1111-4111-8111-111111111105', 'স্টাফ বেতন ও ভাতা', 'কর্মকর্তা ও কর্মচারীদের বেতন, ভাতা ও অগ্রিম সংক্রান্ত ব্যয়', true)
        ON CONFLICT DO NOTHING;
        v_category_id := 'a1111111-1111-4111-8111-111111111105';
    END IF;

    -- Create linked expense voucher
    INSERT INTO public.expenses (
        expense_voucher_no,
        category_id,
        amount,
        expense_date,
        paid_by,
        source_account_id,
        description,
        approval_status
    ) VALUES (
        'EXP-' || v_voucher_no,
        v_category_id,
        p_amount,
        COALESCE(p_advance_date, CURRENT_DATE),
        COALESCE(v_user_id, (SELECT id FROM public.profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER') LIMIT 1)),
        p_disbursed_from_account_id,
        COALESCE(p_remarks, 'স্টাফ অগ্রিম প্রদান: ' || v_staff_name || ' (ভাউচার: ' || v_voucher_no || ')'),
        'APPROVED'
    ) RETURNING id INTO v_expense_id;

    -- Create staff advance record
    INSERT INTO public.staff_advances (
        voucher_no,
        staff_id,
        amount,
        advance_date,
        disbursed_from_account_id,
        disbursed_by,
        status,
        expense_id,
        remarks
    ) VALUES (
        v_voucher_no,
        p_staff_id,
        p_amount,
        COALESCE(p_advance_date, CURRENT_DATE),
        p_disbursed_from_account_id,
        v_user_id,
        'PENDING',
        v_expense_id,
        p_remarks
    ) RETURNING id INTO v_advance_id;

    RETURN jsonb_build_object(
        'success', true,
        'advance_id', v_advance_id,
        'voucher_no', v_voucher_no,
        'amount', p_amount,
        'remaining_balance', v_account_balance - p_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_disburse_staff_advance(UUID, NUMERIC, UUID, DATE, TEXT) TO authenticated;

-- 7. RPC: DISBURSE PAYROLL ITEM WITH INSTANT CASH DEDUCTION & AUTO EXPENSE
CREATE OR REPLACE FUNCTION public.fn_disburse_payroll_item(
    p_payroll_item_id UUID,
    p_disbursed_from_account_id UUID,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_item RECORD;
    v_sheet RECORD;
    v_staff RECORD;
    v_account_balance NUMERIC;
    v_payable NUMERIC;
    v_expense_id UUID;
    v_category_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_item FROM public.payroll_items WHERE id = p_payroll_item_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'বেতন শিটের আইটেমটি খুঁজে পাওয়া যায়নি।';
    END IF;

    IF v_item.payment_status = 'PAID' THEN
        RAISE EXCEPTION 'এই কর্মচারীর বেতন ইতিমধ্যে পরিশোধ করা হয়েছে।';
    END IF;

    SELECT * INTO v_sheet FROM public.payroll_sheets WHERE id = v_item.payroll_sheet_id;
    SELECT * INTO v_staff FROM public.staff_members WHERE id = v_item.staff_id;

    v_payable := v_item.net_payable;
    IF v_payable <= 0 THEN
        v_payable := 0;
    END IF;

    -- Check account balance
    SELECT current_balance INTO v_account_balance
    FROM public.financial_accounts
    WHERE id = p_disbursed_from_account_id AND is_active = true;

    IF v_account_balance IS NULL THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টটি সক্রিয় নয়।';
    END IF;

    IF v_payable > 0 AND v_account_balance < v_payable THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজনীয়: ৳%, বর্তমান: ৳%', v_payable, v_account_balance;
    END IF;

    -- Deduct from financial account if payable > 0
    IF v_payable > 0 THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance - v_payable,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_disbursed_from_account_id;

        -- Ensure salary expense category exists
        SELECT id INTO v_category_id
        FROM public.expense_categories
        WHERE id = 'a1111111-1111-4111-8111-111111111105'
           OR name ILIKE '%বেতন%' OR name ILIKE '%Salary%'
        LIMIT 1;

        IF v_category_id IS NULL THEN
            INSERT INTO public.expense_categories (id, name, description, is_active)
            VALUES ('a1111111-1111-4111-8111-111111111105', 'স্টাফ বেতন ও ভাতা', 'কর্মকর্তা ও কর্মচারীদের বেতন, ভাতা ও অগ্রিম সংক্রান্ত ব্যয়', true)
            ON CONFLICT DO NOTHING;
            v_category_id := 'a1111111-1111-4111-8111-111111111105';
        END IF;

        -- Create expense entry
        INSERT INTO public.expenses (
            expense_voucher_no,
            category_id,
            amount,
            expense_date,
            paid_by,
            source_account_id,
            description,
            approval_status
        ) VALUES (
            'EXP-' || v_sheet.payroll_batch_no || '-' || SUBSTRING(v_staff.staff_code FROM 5),
            v_category_id,
            v_payable,
            CURRENT_DATE,
            COALESCE(v_user_id, (SELECT id FROM public.profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER') LIMIT 1)),
            p_disbursed_from_account_id,
            COALESCE(p_remarks, v_sheet.payroll_month || ' মাসের বেতন পরিশোধ: ' || v_staff.full_name || ' (' || v_staff.designation || ')'),
            'APPROVED'
        ) RETURNING id INTO v_expense_id;
    END IF;

    -- Mark payroll item as PAID
    UPDATE public.payroll_items
    SET paid_amount = v_payable,
        payment_status = 'PAID',
        disbursed_from_account_id = p_disbursed_from_account_id,
        disbursed_by = v_user_id,
        disbursement_date = timezone('Asia/Dhaka', now()),
        expense_id = v_expense_id,
        remarks = COALESCE(p_remarks, remarks)
    WHERE id = p_payroll_item_id;

    -- Mark deducted staff advances as DEDUCTED
    IF v_item.advance_deduction > 0 THEN
        UPDATE public.staff_advances
        SET status = 'DEDUCTED',
            deducted_amount = amount,
            payroll_sheet_id = v_item.payroll_sheet_id
        WHERE staff_id = v_item.staff_id AND status = 'PENDING';
    END IF;

    -- Update aggregate sheet totals
    UPDATE public.payroll_sheets
    SET total_paid_amount = (
            SELECT COALESCE(SUM(paid_amount), 0)
            FROM public.payroll_items
            WHERE payroll_sheet_id = v_sheet.id
        ),
        status = CASE 
            WHEN NOT EXISTS (SELECT 1 FROM public.payroll_items WHERE payroll_sheet_id = v_sheet.id AND payment_status != 'PAID') THEN 'DISBURSED'
            ELSE 'APPROVED'
        END,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_sheet.id;

    RETURN jsonb_build_object(
        'success', true,
        'paid_amount', v_payable,
        'staff_name', v_staff.full_name,
        'remaining_account_balance', v_account_balance - v_payable
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_disburse_payroll_item(UUID, UUID, TEXT) TO authenticated;


-- ==============================================================================
-- Bachelor Home ERP — Migration 000033: Simplified Finance & Billing Engine
-- File: supabase/migrations/20261021000033_simplified_finance_and_billing_engine.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Purpose:
--   1. Dynamic Bill Heads (Seat Rent, Meal, Misc, Advance, Service Charge, Other)
--   2. Multi-head Single Receipt Collection System with Itemized Breakdown
--   3. Three-Tier Expense Hierarchy (Hostel Market, Hostel Misc, Flat Misc)
--   4. Flat-wise Monthly Expense Seat Distribution Engine (Total Flat Exp / Total Seats)
--   5. External Sales Income isolation (Manager Sales)
--   6. Financial Account Opening Balance & Full Audit Ledger
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BILLING / COLLECTION HEADS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'REGULAR', -- 'RENT', 'MEAL', 'MISC', 'ADVANCE', 'SERVICE_CHARGE', 'OTHER'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_heads TO authenticated;
GRANT SELECT ON public.billing_heads TO anon;
GRANT ALL ON public.billing_heads TO service_role;

ALTER TABLE public.billing_heads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_heads_select_policy ON public.billing_heads;
CREATE POLICY billing_heads_select_policy ON public.billing_heads
FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS billing_heads_admin_manage ON public.billing_heads;
CREATE POLICY billing_heads_admin_manage ON public.billing_heads
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- Seed Initial Standard Bill Heads
INSERT INTO public.billing_heads (code, name_bn, name_en, category, description, display_order)
VALUES 
    ('SEAT_RENT', 'সিট ভাড়া', 'Seat Rent', 'RENT', 'মাসিক নির্ধারিত রুম ও সিট ভাড়া', 1),
    ('MEAL_BILL', 'খাবার বিল', 'Meal Bill', 'MEAL', 'মাসিক ডাইনিং ও মেস খাবার চার্জ', 2),
    ('MISC_BILL', 'বিবিধ বিল', 'Miscellaneous Bill', 'MISC', 'ফ্ল্যাটভিত্তিক বিদ্যুৎ, গ্যাস, ওয়াইফাই ইত্যাদি আনুপাতিক বিল', 3),
    ('ADVANCE', 'অগ্রিম', 'Advance', 'ADVANCE', 'ভবিষ্যত মাসের জন্য বা সিট বুকিং বাবদ অগ্রিম জমা', 4),
    ('SERVICE_CHARGE', 'এককালীন সার্ভিস চার্জ', 'One-time Service Charge', 'SERVICE_CHARGE', 'হোস্টেল ভর্তি বা সিট বরাদ্দকালীন এককালীন ফি', 5),
    ('OTHER_BILL', 'অন্যান্য বোর্ডার বিল', 'Other Border Bill', 'OTHER', 'বিলম্ব জরিমানা বা অন্যান্য বোর্ডার সার্ভিস বিল', 6)
ON CONFLICT (code) DO UPDATE SET
    name_bn = EXCLUDED.name_bn,
    name_en = EXCLUDED.name_en,
    category = EXCLUDED.category,
    display_order = EXCLUDED.display_order;

-- ------------------------------------------------------------------------------
-- 2. RECEIPT ITEMS (Multi-head single receipt breakdown)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    head_code VARCHAR(50) NOT NULL,
    head_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    billing_month DATE, -- e.g. '2026-10-01'
    description TEXT,
    charge_id UUID REFERENCES public.boarder_charges(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON public.receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_charge ON public.receipt_items(charge_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_items TO authenticated;
GRANT SELECT ON public.receipt_items TO anon;
GRANT ALL ON public.receipt_items TO service_role;

ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receipt_items_select ON public.receipt_items;
CREATE POLICY receipt_items_select ON public.receipt_items
FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS receipt_items_insert ON public.receipt_items;
CREATE POLICY receipt_items_insert ON public.receipt_items
FOR INSERT TO authenticated WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. EXPENSES ENHANCEMENTS (3 Categories: HOSTEL_MARKET, HOSTEL_MISC, FLAT_MISC)
-- ------------------------------------------------------------------------------
ALTER TABLE public.expenses 
    ADD COLUMN IF NOT EXISTS expense_scope VARCHAR(50) DEFAULT 'HOSTEL_MISC',
    ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS billing_month DATE;

ALTER TABLE public.expense_categories
    ADD COLUMN IF NOT EXISTS category_scope VARCHAR(50) DEFAULT 'HOSTEL_MISC';

CREATE INDEX IF NOT EXISTS idx_expenses_scope ON public.expenses(expense_scope);
CREATE INDEX IF NOT EXISTS idx_expenses_month ON public.expenses(billing_month);

-- Seed comprehensive categories for all 3 tiers
-- Tier 1: Hostel Market Expense
INSERT INTO public.expense_categories (name, description, category_scope, is_active)
VALUES 
    ('চাল, ডাল ও তেল (Rice, Pulses, Oil)', 'হোস্টেল মেসের কেন্দ্রীয় বাজার: চাল, ডাল ও তেল', 'HOSTEL_MARKET', true),
    ('মাছ, মাংস ও ডিম (Fish, Meat, Eggs)', 'হোস্টেল মেসের কেন্দ্রীয় বাজার: মাছ, মাংস ও ডিম', 'HOSTEL_MARKET', true),
    ('শাকসবজি ও কাঁচাবাজার (Vegetables & Groceries)', 'দৈনিক কাঁচাবাজার ও শাকসবজি', 'HOSTEL_MARKET', true),
    ('মসলাপাতি ও ড্রাই বাজার (Spices & Dry Food)', 'রান্নার তেল, মসলা, পেঁয়াজ, রসুন ইত্যাদি', 'HOSTEL_MARKET', true)
ON CONFLICT (name) DO UPDATE SET category_scope = 'HOSTEL_MARKET';

-- Tier 2: Hostel Miscellaneous Expense (No flat-specific utility bills)
INSERT INTO public.expense_categories (name, description, category_scope, is_active)
VALUES 
    ('বাবুর্চির বেতন (Cook Salary)', 'হোস্টেল বাবুর্চি ও কিচেন সহকারীর মাসিক বেতন', 'HOSTEL_MISC', true),
    ('ম্যানেজারের বেতন (Manager Salary)', 'হোস্টেল ম্যানেজার ও সহকারী পরিচালকের বেতন', 'HOSTEL_MISC', true),
    ('ক্লিনার ও স্টাফ বেতন (Staff Salary)', 'ক্লিনার, দারোয়ান ও সাপোর্ট স্টাফদের বেতন', 'HOSTEL_MISC', true),
    ('মেরামত ও রক্ষণাবেক্ষণ (Repairs & Maintenance)', 'হোস্টেলের সাধারণ প্লাম্বিং, বৈদ্যুতিক ও টুকটাক মেরামত', 'HOSTEL_MISC', true),
    ('হোস্টেলের সাধারণ বিবিধ খরচ (Hostel General Misc)', 'হোস্টেল সেন্ট্রাল প্রশাসনের সাধারণ বিবিধ খরচ', 'HOSTEL_MISC', true)
ON CONFLICT (name) DO UPDATE SET category_scope = 'HOSTEL_MISC';

-- Tier 3: Flat-wise Miscellaneous Expense
INSERT INTO public.expense_categories (name, description, category_scope, is_active)
VALUES 
    ('বিদ্যুৎ বিল (Electricity Bill)', 'নির্দিষ্ট ফ্ল্যাটের মাসিক ডেসকো/ডিপিডিসি বিদ্যুৎ বিল', 'FLAT_MISC', true),
    ('পানির বিল (Water Bill)', 'নির্দিষ্ট ফ্ল্যাটের মাসিক ওয়াসা পানির বিল', 'FLAT_MISC', true),
    ('গ্যাস বিল (Gas Bill)', 'নির্দিষ্ট ফ্ল্যাটের মাসিক গ্যাস বিল বা এলপিজি সিলিন্ডার খরচ', 'FLAT_MISC', true),
    ('ময়লা বিল (Garbage Bill)', 'নির্দিষ্ট ফ্ল্যাটের মাসিক বর্জ্য ব্যবস্থাপনা ও ময়লা বিল', 'FLAT_MISC', true),
    ('ওয়াইফাই বিল (Wi-Fi Bill)', 'নির্দিষ্ট ফ্ল্যাটের মাসিক ইন্টারনেট ও ওয়াইফাই বিল', 'FLAT_MISC', true),
    ('অন্যান্য ফ্ল্যাটওয়ারী বিবিধ খরচ (Other Flat Misc)', 'নির্দিষ্ট ফ্ল্যাটের অন্যান্য আনুষঙ্গিক খরচ', 'FLAT_MISC', true)
ON CONFLICT (name) DO UPDATE SET category_scope = 'FLAT_MISC';

-- ------------------------------------------------------------------------------
-- 4. FLAT-WISE EXPENSE SEAT DISTRIBUTION ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flat_monthly_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    billing_month DATE NOT NULL, -- First day of month: '2026-10-01'
    total_expense NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    per_seat_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_billed BOOLEAN NOT NULL DEFAULT false,
    billed_at TIMESTAMPTZ,
    billed_by UUID REFERENCES public.profiles(id),
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_flat_month UNIQUE(flat_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_flat_distributions_flat ON public.flat_monthly_distributions(flat_id);
CREATE INDEX IF NOT EXISTS idx_flat_distributions_month ON public.flat_monthly_distributions(billing_month);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flat_monthly_distributions TO authenticated;
GRANT SELECT ON public.flat_monthly_distributions TO anon;
GRANT ALL ON public.flat_monthly_distributions TO service_role;

ALTER TABLE public.flat_monthly_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flat_distributions_select ON public.flat_monthly_distributions;
CREATE POLICY flat_distributions_select ON public.flat_monthly_distributions
FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS flat_distributions_all ON public.flat_monthly_distributions;
CREATE POLICY flat_distributions_all ON public.flat_monthly_distributions
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER')
    )
);

-- ------------------------------------------------------------------------------
-- 5. FINANCIAL ACCOUNTS OPENING BALANCE & BASELINE SEEDS
-- ------------------------------------------------------------------------------
ALTER TABLE public.financial_accounts
    ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS opening_balance_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS opening_balance_source VARCHAR(100) DEFAULT 'Initial Setup';

-- Ensure Primary Three Accounts exist:
-- 1. Hostel Main Account
-- 2. Manager Account
-- 3. Admin Account
INSERT INTO public.financial_accounts (
    id, 
    account_name, 
    account_type, 
    account_number, 
    bank_name, 
    opening_balance, 
    current_balance, 
    is_active
)
VALUES 
    (
        '11111111-0000-0000-0000-000000000001',
        'Hostel Main Account (মেইন একাউন্ট)',
        'CASH_OWNER',
        'MAIN-VAULT-01',
        'Hostel Central Safe / Vault',
        0.00,
        0.00,
        true
    ),
    (
        '11111111-0000-0000-0000-000000000002',
        'Manager Account (ম্যানেজার ক্যাশ)',
        'CASH_MANAGER',
        'MGR-CASH-01',
        'Manager Shift Cash Drawer',
        0.00,
        0.00,
        true
    ),
    (
        '11111111-0000-0000-0000-000000000003',
        'Admin Account (এডমিন একাউন্ট)',
        'BANK',
        'ADM-BANK-01',
        'Operating Bank Account',
        0.00,
        0.00,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    account_name = EXCLUDED.account_name,
    is_active = true;

-- ------------------------------------------------------------------------------
-- 6. STORED PROCEDURES (RPC)
-- ------------------------------------------------------------------------------

-- 6.1 RPC: fn_record_unified_collection
-- Atomically record collection with multiple bill heads in a single money receipt
CREATE OR REPLACE FUNCTION public.fn_record_unified_collection(
    p_boarder_id UUID,
    p_destination_account_id UUID,
    p_payment_method payment_method,
    p_items JSONB, -- Array of { head_code, head_name, amount, billing_month, description }
    p_collection_date TIMESTAMPTZ DEFAULT timezone('Asia/Dhaka', now()),
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
    v_receipt_id UUID;
    v_receipt_no VARCHAR(50);
    v_total_amount NUMERIC(12,2) := 0.00;
    v_item RECORD;
    v_account RECORD;
    v_today DATE;
    v_matched_charge RECORD;
BEGIN
    -- Validate boarder
    IF NOT EXISTS (SELECT 1 FROM public.boarders WHERE id = p_boarder_id) THEN
        RAISE EXCEPTION 'বোর্ডার খুঁজে পাওয়া যায়নি (Boarder not found).';
    END IF;

    -- Validate destination account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_destination_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'জমার অ্যাকাউন্টটি পাওয়া যায়নি (Destination account not found).';
    END IF;

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে (Account is inactive).';
    END IF;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'অন্তত একটি খাতের টাকা নির্ধারণ করা আবশ্যক (At least one bill head required).';
    END IF;

    -- Calculate total amount across all items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        head_code VARCHAR(50), 
        head_name VARCHAR(100), 
        amount NUMERIC(12,2),
        billing_month DATE,
        description TEXT
    )
    LOOP
        IF v_item.amount <= 0 THEN
            RAISE EXCEPTION 'বিলের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Item amount must be > 0).';
        END IF;
        v_total_amount := v_total_amount + v_item.amount;
    END LOOP;

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'মোট আদায়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।';
    END IF;

    -- Generate Unique Receipt Number
    v_receipt_no := 'RCT-' || LPAD(nextval('receipt_seq')::TEXT, 6, '0');
    v_today := (timezone('Asia/Dhaka', COALESCE(p_collection_date, now())))::DATE;

    -- Insert Single Master Receipt
    INSERT INTO public.receipts (
        receipt_number,
        boarder_id,
        received_by,
        destination_account_id,
        amount,
        payment_method,
        transaction_reference,
        receipt_date,
        remarks
    )
    VALUES (
        v_receipt_no,
        p_boarder_id,
        COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
        p_destination_account_id,
        v_total_amount,
        p_payment_method,
        p_reference,
        COALESCE(p_collection_date, timezone('Asia/Dhaka', now())),
        p_remarks
    )
    RETURNING id INTO v_receipt_id;

    -- Credit Destination Account Balance
    UPDATE public.financial_accounts
    SET current_balance = current_balance + v_total_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- Update manager cash session if cash received by manager
    IF p_payment_method = 'CASH' AND v_current_user IS NOT NULL THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

        UPDATE public.manager_cash_sessions
        SET cash_receipts = cash_receipts + v_total_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_today;
    END IF;

    -- Insert itemized breakdown and link with boarder_charges where applicable
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        head_code VARCHAR(50), 
        head_name VARCHAR(100), 
        amount NUMERIC(12,2),
        billing_month DATE,
        description TEXT
    )
    LOOP
        -- Look for unpaid charge matching this boarder and head type
        SELECT * INTO v_matched_charge
        FROM public.boarder_charges
        WHERE boarder_id = p_boarder_id
          AND status IN ('UNPAID', 'PARTIALLY_PAID')
          AND due_amount > 0
          AND (
              (v_item.head_code = 'SEAT_RENT' AND charge_type = 'RENT') OR
              (v_item.head_code = 'MEAL_BILL' AND charge_type = 'MEAL') OR
              (v_item.head_code = 'MISC_BILL' AND charge_type IN ('UTILITY', 'OTHER'))
          )
        ORDER BY due_date ASC
        LIMIT 1;

        -- Record receipt item
        INSERT INTO public.receipt_items (
            receipt_id,
            head_code,
            head_name,
            amount,
            billing_month,
            description,
            charge_id
        )
        VALUES (
            v_receipt_id,
            v_item.head_code,
            COALESCE(v_item.head_name, v_item.head_code),
            v_item.amount,
            v_item.billing_month,
            v_item.description,
            v_matched_charge.id
        );

        -- If matched charge found, also add allocation to sync charge paid amount
        IF v_matched_charge.id IS NOT NULL THEN
            INSERT INTO public.receipt_allocations (
                receipt_id,
                charge_id,
                allocated_amount
            )
            VALUES (
                v_receipt_id,
                v_matched_charge.id,
                LEAST(v_item.amount, v_matched_charge.due_amount)
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_no,
        'amount', v_total_amount,
        'payment_method', p_payment_method,
        'account_name', v_account.account_name,
        'message', format('রসিদ %s সফলভাবে তৈরি ও সংরক্ষিত হয়েছে (মোট: ৳%s)।', v_receipt_no, v_total_amount)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_unified_collection TO authenticated;

-- 6.2 RPC: fn_calculate_flat_monthly_distribution
-- Calculate total flat expenses divided by total actual seats in the flat
CREATE OR REPLACE FUNCTION public.fn_calculate_flat_monthly_distribution(
    p_flat_id UUID,
    p_billing_month DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_norm_month DATE;
    v_month_start DATE;
    v_month_end DATE;
    v_total_seats INT;
    v_total_expense NUMERIC(12,2) := 0.00;
    v_per_seat_amount NUMERIC(12,2) := 0.00;
    v_distribution_id UUID;
    v_breakdown JSONB;
BEGIN
    v_norm_month := DATE_TRUNC('month', p_billing_month)::DATE;
    v_month_start := v_norm_month;
    v_month_end := (v_norm_month + INTERVAL '1 month - 1 day')::DATE;

    -- 1. Count TOTAL actual seats in this flat across all rooms (Occupied + Available)
    SELECT COUNT(s.id) INTO v_total_seats
    FROM public.seats s
    JOIN public.rooms r ON r.id = s.room_id
    WHERE r.flat_id = p_flat_id
      AND s.status <> 'INACTIVE';

    IF v_total_seats IS NULL OR v_total_seats <= 0 THEN
        RAISE EXCEPTION 'এই ফ্ল্যাটে কোনো সক্রিয় সিট খুঁজে পাওয়া যায়নি (No active seats found in flat).';
    END IF;

    -- 2. Aggregate all flat-wise miscellaneous expenses recorded for this flat in this month
    SELECT 
        COALESCE(SUM(e.amount), 0.00),
        jsonb_agg(
            jsonb_build_object(
                'expense_id', e.id,
                'voucher_no', e.expense_voucher_no,
                'category_name', ec.name,
                'amount', e.amount,
                'expense_date', e.expense_date,
                'description', e.description
            )
        )
    INTO v_total_expense, v_breakdown
    FROM public.expenses e
    JOIN public.expense_categories ec ON ec.id = e.category_id
    WHERE e.flat_id = p_flat_id
      AND (
          (e.billing_month = v_norm_month) OR 
          (e.billing_month IS NULL AND e.expense_date >= v_month_start AND e.expense_date <= v_month_end)
      )
      AND e.approval_status <> 'REJECTED';

    -- 3. Calculate per-seat share: Total Flat Expense / Total Seats
    IF v_total_expense > 0 THEN
        v_per_seat_amount := ROUND((v_total_expense / v_total_seats)::numeric, 2);
    ELSE
        v_per_seat_amount := 0.00;
    END IF;

    -- 4. Upsert distribution record
    INSERT INTO public.flat_monthly_distributions (
        flat_id,
        billing_month,
        total_expense,
        total_seats,
        per_seat_amount,
        breakdown,
        updated_at
    )
    VALUES (
        p_flat_id,
        v_norm_month,
        v_total_expense,
        v_total_seats,
        v_per_seat_amount,
        COALESCE(v_breakdown, '[]'::jsonb),
        timezone('Asia/Dhaka', now())
    )
    ON CONFLICT (flat_id, billing_month) DO UPDATE SET
        total_expense = EXCLUDED.total_expense,
        total_seats = EXCLUDED.total_seats,
        per_seat_amount = EXCLUDED.per_seat_amount,
        breakdown = EXCLUDED.breakdown,
        updated_at = timezone('Asia/Dhaka', now())
    RETURNING id INTO v_distribution_id;

    RETURN jsonb_build_object(
        'success', true,
        'distribution_id', v_distribution_id,
        'flat_id', p_flat_id,
        'billing_month', v_norm_month,
        'total_expense', v_total_expense,
        'total_seats', v_total_seats,
        'per_seat_amount', v_per_seat_amount,
        'breakdown', COALESCE(v_breakdown, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_calculate_flat_monthly_distribution TO authenticated;

-- 6.3 RPC: fn_apply_flat_monthly_charges
-- Apply the computed per-seat flat miscellaneous share to active boarders' charges
CREATE OR REPLACE FUNCTION public.fn_apply_flat_monthly_charges(
    p_distribution_id UUID,
    p_due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_dist RECORD;
    v_flat RECORD;
    v_alloc RECORD;
    v_current_user UUID := auth.uid();
    v_generated INT := 0;
    v_skipped INT := 0;
    v_due_date DATE;
    v_month_label TEXT;
BEGIN
    SELECT * INTO v_dist
    FROM public.flat_monthly_distributions
    WHERE id = p_distribution_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ফ্ল্যাটের খরচের হিসাব পাওয়া যায়নি (Distribution not found).';
    END IF;

    IF v_dist.per_seat_amount <= 0 THEN
        RAISE EXCEPTION 'জনপ্রতি খরচের পরিমাণ ০ টাকা, কোনো চার্জ তৈরির প্রয়োজন নেই।';
    END IF;

    SELECT * INTO v_flat FROM public.flats WHERE id = v_dist.flat_id;
    v_month_label := to_char(v_dist.billing_month, 'FMMonth YYYY');
    v_due_date := COALESCE(p_due_date, v_dist.billing_month + INTERVAL '9 days');

    -- Iterate active boarders in this flat
    FOR v_alloc IN
        SELECT 
            a.id AS allocation_id,
            a.boarder_id,
            b.full_name,
            b.boarder_code
        FROM public.allocations a
        JOIN public.seats s ON s.id = a.seat_id
        JOIN public.rooms r ON r.id = s.room_id
        JOIN public.boarders b ON b.id = a.boarder_id
        WHERE r.flat_id = v_dist.flat_id
          AND a.status = 'ACTIVE'
          AND b.status = 'ACTIVE'
    LOOP
        -- Prevent duplicate utility charge for this boarder in this month
        IF EXISTS (
            SELECT 1 FROM public.boarder_charges
            WHERE boarder_id = v_alloc.boarder_id
              AND charge_type = 'UTILITY'
              AND billing_month = v_dist.billing_month
              AND status <> 'VOID'
        ) THEN
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
                'UTILITY',
                v_dist.billing_month,
                v_dist.per_seat_amount,
                0.00,
                'UNPAID',
                v_due_date,
                format('%s — মাসিক বিবিধ বিল (%s)', COALESCE(v_flat.name, 'ফ্ল্যাট'), v_month_label),
                v_current_user
            );
            v_generated := v_generated + 1;
        END IF;
    END LOOP;

    -- Mark distribution as billed
    UPDATE public.flat_monthly_distributions
    SET is_billed = true,
        billed_at = timezone('Asia/Dhaka', now()),
        billed_by = v_current_user,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_distribution_id;

    RETURN jsonb_build_object(
        'success', true,
        'generated', v_generated,
        'skipped', v_skipped,
        'per_seat_amount', v_dist.per_seat_amount,
        'message', format('ফ্ল্যাটওয়ারী বিবিধ বিল সফলভাবে যোগ করা হয়েছে: %s টি তৈরি হয়েছে, %s টি পূর্বে তৈরিকৃত ছিল।', v_generated, v_skipped)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_flat_monthly_charges TO authenticated;

-- 6.4 RPC: fn_record_simplified_expense
-- Record expense with category tier, vendor name and source account debit
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
        approval_status
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
        'PENDING'
    )
    RETURNING id INTO v_expense_id;

    -- Deduct from Source Account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_source_account_id;

    -- Update manager cash session if cash
    IF (v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_current_user) AND v_current_user IS NOT NULL THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_target_date);

        UPDATE public.manager_cash_sessions
        SET cash_expenses = cash_expenses + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_target_date;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'voucher_no', v_voucher_no,
        'amount', p_amount,
        'account_name', v_account.account_name,
        'approval_status', 'PENDING',
        'message', format('খরচ ভাউচার %s সফলভাবে সংরক্ষিত হয়েছে।', v_voucher_no)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_simplified_expense TO authenticated;

-- 6.5 RPC: fn_record_manager_sales_income
-- Record external non-border sales income credited to manager account
CREATE OR REPLACE FUNCTION public.fn_record_manager_sales_income(
    p_destination_account_id UUID,
    p_amount NUMERIC(12,2),
    p_sales_date DATE DEFAULT CURRENT_DATE,
    p_description TEXT DEFAULT '',
    p_quantity TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
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
    v_category_id UUID;
    v_account RECORD;
    v_target_date DATE;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'বিক্রয় আয়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।';
    END IF;

    IF p_description IS NULL OR TRIM(p_description) = '' THEN
        RAISE EXCEPTION 'বিক্রয়ের বিবরণ উল্লেখ করা বাধ্যতামূলক।';
    END IF;

    -- Validate Destination Account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_destination_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'জমার অ্যাকাউন্টটি পাওয়া যায়নি।';
    END IF;

    -- Ensure category exists
    SELECT id INTO v_category_id
    FROM public.income_categories
    WHERE LOWER(name) LIKE '%sales%' OR LOWER(name) LIKE '%scrap%'
    LIMIT 1;

    IF v_category_id IS NULL THEN
        INSERT INTO public.income_categories (name, description, is_active)
        VALUES ('External Sales Income', 'হোস্টেলের বাইরে পণ্য বা সেবা বিক্রয় আয়', true)
        ON CONFLICT (name) DO UPDATE SET is_active = true
        RETURNING id INTO v_category_id;
    END IF;

    v_target_date := COALESCE(p_sales_date, (timezone('Asia/Dhaka', now()))::DATE);
    v_voucher_no := 'SLS-' || LPAD(nextval('income_seq')::TEXT, 6, '0');

    -- Insert income
    INSERT INTO public.incomes (
        income_voucher_no,
        category_id,
        amount,
        destination_account_id,
        income_date,
        description,
        received_by
    )
    VALUES (
        v_voucher_no,
        v_category_id,
        p_amount,
        p_destination_account_id,
        v_target_date,
        TRIM(p_description) || CASE WHEN p_quantity IS NOT NULL AND TRIM(p_quantity) <> '' THEN ' (পরিমাণ: ' || TRIM(p_quantity) || ')' ELSE '' END,
        COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1))
    )
    RETURNING id INTO v_income_id;

    -- Credit Account
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- If manager cash, update session
    IF (v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_current_user) AND v_current_user IS NOT NULL THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_target_date);

        UPDATE public.manager_cash_sessions
        SET cash_receipts = cash_receipts + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_target_date;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'income_id', v_income_id,
        'voucher_no', v_voucher_no,
        'amount', p_amount,
        'account_name', v_account.account_name,
        'message', format('বিক্রয় আয় %s সফলভাবে ম্যানেজারের অ্যাকাউন্টে যোগ হয়েছে।', v_voucher_no)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_record_manager_sales_income TO authenticated;

COMMIT;

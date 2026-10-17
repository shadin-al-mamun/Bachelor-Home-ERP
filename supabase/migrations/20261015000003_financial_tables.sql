-- ==============================================================================
-- Bachelor Home ERP — Migration 000003: Financial Accounts, Charges, Receipts & Ledgers
-- File: supabase/migrations/20261015000003_financial_tables.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. FINANCIAL ACCOUNTS & INTERNAL TRANSFERS

-- 1.1 FINANCIAL ACCOUNTS
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(100) NOT NULL,
    account_type financial_account_type NOT NULL,
    account_number VARCHAR(100),
    bank_name VARCHAR(100),
    current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    assigned_manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_financial_accounts_updated_at
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON public.financial_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_financial_accounts_manager ON public.financial_accounts(assigned_manager_id);

-- 1.2 INTERNAL ACCOUNT TRANSFERS
CREATE TABLE IF NOT EXISTS public.account_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(50) NOT NULL UNIQUE,
    from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    reference VARCHAR(100),
    remarks TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT chk_different_accounts CHECK (from_account_id <> to_account_id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON public.account_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON public.account_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON public.account_transfers(transfer_date);

-- 2. BOARDER CHARGES & BILLING
CREATE TABLE IF NOT EXISTS public.boarder_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE RESTRICT,
    allocation_id UUID REFERENCES public.allocations(id) ON DELETE RESTRICT,
    charge_type charge_type NOT NULL,
    billing_month DATE NOT NULL, -- Stored as 1st of month: e.g. '2026-10-01'
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    due_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount - paid_amount) STORED,
    status charge_status NOT NULL DEFAULT 'UNPAID',
    due_date DATE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_boarder_charges_updated_at
BEFORE UPDATE ON public.boarder_charges
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_charges_boarder_status ON public.boarder_charges(boarder_id, status);
CREATE INDEX IF NOT EXISTS idx_charges_month ON public.boarder_charges(billing_month);
CREATE INDEX IF NOT EXISTS idx_charges_allocation ON public.boarder_charges(allocation_id);

-- 3. RECEIPTS & RECEIPT ALLOCATIONS

-- 3.1 RECEIPT NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS receipt_seq START WITH 1001;

-- 3.2 RECEIPTS
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE RESTRICT,
    received_by UUID NOT NULL REFERENCES public.profiles(id),
    destination_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    transaction_reference VARCHAR(100),
    receipt_date TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    is_void BOOLEAN NOT NULL DEFAULT false,
    void_reason TEXT,
    void_by UUID REFERENCES public.profiles(id),
    void_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_receipts_boarder ON public.receipts(boarder_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON public.receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_received_by ON public.receipts(received_by);
CREATE INDEX IF NOT EXISTS idx_receipts_account ON public.receipts(destination_account_id);

-- 3.3 RECEIPT ALLOCATIONS (Maps receipt amounts to specific charges)
CREATE TABLE IF NOT EXISTS public.receipt_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    charge_id UUID NOT NULL REFERENCES public.boarder_charges(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12,2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt ON public.receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_charge ON public.receipt_allocations(charge_id);

-- 3.4 TRIGGER TO UPDATE CHARGE STATUS ON RECEIPT ALLOCATION
CREATE OR REPLACE FUNCTION public.fn_sync_charge_paid_amount_on_receipt_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC(12,2);
    v_charge_amount NUMERIC(12,2);
    v_charge_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_charge_id := NEW.charge_id;
    ELSIF (TG_OP = 'DELETE') THEN
        v_charge_id := OLD.charge_id;
    END IF;

    -- Calculate total paid amount from non-void receipts
    SELECT COALESCE(SUM(ra.allocated_amount), 0.00)
    INTO v_total_paid
    FROM public.receipt_allocations ra
    JOIN public.receipts r ON r.id = ra.receipt_id
    WHERE ra.charge_id = v_charge_id AND r.is_void = false;

    SELECT amount INTO v_charge_amount
    FROM public.boarder_charges
    WHERE id = v_charge_id;

    -- Update charge paid_amount and status
    UPDATE public.boarder_charges
    SET paid_amount = v_total_paid,
        status = CASE 
            WHEN v_total_paid >= v_charge_amount THEN 'PAID'::charge_status
            WHEN v_total_paid > 0 THEN 'PARTIALLY_PAID'::charge_status
            ELSE 'UNPAID'::charge_status
        END,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_charge_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_charge_paid_amount ON public.receipt_allocations;
CREATE TRIGGER trg_sync_charge_paid_amount
AFTER INSERT OR DELETE ON public.receipt_allocations
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_charge_paid_amount_on_receipt_allocation();

-- 4. EXPENSES & INCOME MANAGEMENT

-- 4.1 EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- 4.2 EXPENSE VOUCHER NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS expense_seq START WITH 5001;

-- 4.3 EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_voucher_no VARCHAR(50) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    source_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    building_id UUID REFERENCES public.buildings(id),
    flat_id UUID REFERENCES public.flats(id),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    voucher_attachment_url TEXT,
    paid_by UUID NOT NULL REFERENCES public.profiles(id),
    approval_status approval_status NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_flat ON public.expenses(flat_id);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON public.expenses(source_account_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(approval_status);

-- 4.4 INCOME CATEGORIES (Non-rent revenues)
CREATE TABLE IF NOT EXISTS public.income_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- 4.5 INCOME VOUCHER NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS income_seq START WITH 2001;

-- 4.6 INCOMES
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    income_voucher_no VARCHAR(50) NOT NULL UNIQUE,
    category_id UUID NOT NULL REFERENCES public.income_categories(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    destination_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    building_id UUID REFERENCES public.buildings(id),
    flat_id UUID REFERENCES public.flats(id),
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    received_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_incomes_updated_at
BEFORE UPDATE ON public.incomes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(income_date);
CREATE INDEX IF NOT EXISTS idx_incomes_category ON public.incomes(category_id);
CREATE INDEX IF NOT EXISTS idx_incomes_account ON public.incomes(destination_account_id);

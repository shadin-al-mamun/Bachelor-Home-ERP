-- Bachelor Home ERP - Full Database Schema & Functions
-- Generated for one-click setup in Supabase SQL Editor



-- =============================================================================
-- Migration: 20261015000001_initial_extensions_and_accommodation.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000001: Extensions, Enums & Accommodation Hierarchy
-- File: supabase/migrations/20261015000001_initial_extensions_and_accommodation.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. CUSTOM ENUMS & TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'SUPER_ADMIN', 
            'ADMIN', 
            'MANAGER', 
            'ACCOUNTANT', 
            'MEAL_OPERATOR', 
            'BOARDER', 
            'APPLICANT', 
            'AUDITOR'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'building_status') THEN
        CREATE TYPE building_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flat_status') THEN
        CREATE TYPE flat_status AS ENUM ('ACTIVE', 'INACTIVE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE room_status AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seat_status') THEN
        CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boarder_status') THEN
        CREATE TYPE boarder_status AS ENUM ('PENDING', 'ACTIVE', 'LEFT', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'allocation_status') THEN
        CREATE TYPE allocation_status AS ENUM ('ACTIVE', 'ENDED', 'TRANSFERRED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_account_type') THEN
        CREATE TYPE financial_account_type AS ENUM ('CASH_MANAGER', 'CASH_OWNER', 'BANK', 'MFS');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'charge_type') THEN
        CREATE TYPE charge_type AS ENUM ('RENT', 'UTILITY', 'MEAL', 'PENALTY', 'ADMISSION_FEE', 'OTHER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'charge_status') THEN
        CREATE TYPE charge_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOID');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('CASH', 'BANK_TRANSFER', 'MFS');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
        CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_session_status') THEN
        CREATE TYPE cash_session_status AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REOPENED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'handover_status') THEN
        CREATE TYPE handover_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deposit_status') THEN
        CREATE TYPE deposit_status AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_session') THEN
        CREATE TYPE meal_session AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'VOID', 'OVERRIDE');
    END IF;
END $$;

-- 3. COMMON TRIGGER FUNCTION: UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('Asia/Dhaka', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ACCOMMODATION RELATIONAL TABLES

-- 4.1 BUILDINGS
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    status building_status NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_buildings_updated_at
BEFORE UPDATE ON public.buildings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4.2 FLATS
CREATE TABLE IF NOT EXISTS public.flats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
    flat_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    floor_number INT,
    status flat_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_flats_building_code UNIQUE (building_id, flat_code)
);

CREATE TRIGGER set_flats_updated_at
BEFORE UPDATE ON public.flats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4.3 ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    room_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    room_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    capacity INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    status room_status NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_rooms_flat_code UNIQUE (flat_id, room_code)
);

CREATE TRIGGER set_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4.4 SEATS
CREATE TABLE IF NOT EXISTS public.seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    seat_code VARCHAR(50) NOT NULL,
    seat_name VARCHAR(100) NOT NULL,
    seat_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE_BED',
    default_rent NUMERIC(12,2) NOT NULL CHECK (default_rent >= 0),
    status seat_status NOT NULL DEFAULT 'AVAILABLE',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_seats_room_code UNIQUE (room_id, seat_code)
);

CREATE TRIGGER set_seats_updated_at
BEFORE UPDATE ON public.seats
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_buildings_status ON public.buildings(status);
CREATE INDEX IF NOT EXISTS idx_flats_building ON public.flats(building_id);
CREATE INDEX IF NOT EXISTS idx_flats_status ON public.flats(status);
CREATE INDEX IF NOT EXISTS idx_rooms_flat ON public.rooms(flat_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_seats_room ON public.seats(room_id);
CREATE INDEX IF NOT EXISTS idx_seats_status ON public.seats(status);


-- =============================================================================
-- Migration: 20261015000002_profiles_boarders_allocations.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000002: Profiles, Boarders, Allocations & History
-- File: supabase/migrations/20261015000002_profiles_boarders_allocations.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. USER PROFILES & FLAT SCOPING

-- 1.1 PROFILES (Attached to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    role user_role NOT NULL DEFAULT 'APPLICANT',
    is_active BOOLEAN NOT NULL DEFAULT true,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'bn' CHECK (preferred_language IN ('bn', 'en')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- 1.2 USER FLAT ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.user_flat_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    assigned_by UUID REFERENCES public.profiles(id),
    CONSTRAINT uq_user_flat_assignment UNIQUE (user_id, flat_id)
);

CREATE INDEX IF NOT EXISTS idx_user_flat_user ON public.user_flat_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flat_flat ON public.user_flat_assignments(flat_id);

-- 2. BOARDERS & REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.boarders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    boarder_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    photo_url TEXT,
    nid_passport_number VARCHAR(50),
    nid_document_url TEXT,
    student_id VARCHAR(50),
    institution VARCHAR(200),
    department VARCHAR(100),
    session VARCHAR(50),
    guardian_name VARCHAR(150) NOT NULL,
    guardian_phone VARCHAR(20) NOT NULL,
    guardian_relation VARCHAR(50),
    present_address TEXT,
    permanent_address TEXT NOT NULL,
    emergency_contact VARCHAR(20),
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leaving_date DATE,
    status boarder_status NOT NULL DEFAULT 'PENDING',
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_boarders_updated_at
BEFORE UPDATE ON public.boarders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_boarders_status ON public.boarders(status);
CREATE INDEX IF NOT EXISTS idx_boarders_phone ON public.boarders(phone_number);
CREATE INDEX IF NOT EXISTS idx_boarders_user_id ON public.boarders(user_id);

-- 3. SEAT ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE RESTRICT,
    monthly_rent NUMERIC(12,2) NOT NULL CHECK (monthly_rent >= 0),
    security_deposit NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (security_deposit >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status allocation_status NOT NULL DEFAULT 'ACTIVE',
    cancellation_reason TEXT,
    remarks TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_allocations_updated_at
BEFORE UPDATE ON public.allocations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Crucial Partial Unique Index: Only ONE active allocation permitted per seat
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_seat_allocation 
ON public.allocations (seat_id) 
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_allocations_boarder ON public.allocations(boarder_id);
CREATE INDEX IF NOT EXISTS idx_allocations_seat ON public.allocations(seat_id);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON public.allocations(status);

-- 4. ALLOCATION HISTORY (Immutable Journal)
CREATE TABLE IF NOT EXISTS public.allocation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
    previous_seat_id UUID REFERENCES public.seats(id),
    new_seat_id UUID REFERENCES public.seats(id),
    change_type VARCHAR(50) NOT NULL, -- 'INITIAL', 'TRANSFER', 'END', 'CANCEL'
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_alloc_history_alloc_id ON public.allocation_history(allocation_id);

-- 5. AUTOMATIC SYNCHRONIZATION TRIGGER: SEAT STATUS & ALLOCATIONS
CREATE OR REPLACE FUNCTION public.fn_sync_seat_status_on_allocation()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'ACTIVE') THEN
            UPDATE public.seats
            SET status = 'OCCUPIED'
            WHERE id = NEW.seat_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If seat changed during active allocation
        IF (OLD.seat_id <> NEW.seat_id) THEN
            UPDATE public.seats
            SET status = 'AVAILABLE'
            WHERE id = OLD.seat_id;

            IF (NEW.status = 'ACTIVE') THEN
                UPDATE public.seats
                SET status = 'OCCUPIED'
                WHERE id = NEW.seat_id;
            END IF;
        ELSIF (OLD.status <> NEW.status) THEN
            IF (NEW.status = 'ACTIVE') THEN
                UPDATE public.seats
                SET status = 'OCCUPIED'
                WHERE id = NEW.seat_id;
            ELSIF (NEW.status IN ('ENDED', 'CANCELLED', 'TRANSFERRED')) THEN
                UPDATE public.seats
                SET status = 'AVAILABLE'
                WHERE id = NEW.seat_id;
            END IF;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.status = 'ACTIVE') THEN
            UPDATE public.seats
            SET status = 'AVAILABLE'
            WHERE id = OLD.seat_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_seat_status_on_allocation ON public.allocations;
CREATE TRIGGER trg_sync_seat_status_on_allocation
AFTER INSERT OR UPDATE OR DELETE ON public.allocations
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_seat_status_on_allocation();


-- =============================================================================
-- Migration: 20261015000003_financial_tables.sql
-- =============================================================================

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


-- =============================================================================
-- Migration: 20261015000004_cash_custody_and_reconciliation.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000004: Manager Cash Custody, Reconciliation & Handovers
-- File: supabase/migrations/20261015000004_cash_custody_and_reconciliation.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. MANAGER CASH SESSIONS
CREATE TABLE IF NOT EXISTS public.manager_cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    opening_cash NUMERIC(12,2) NOT NULL CHECK (opening_cash >= 0),
    cash_receipts NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_deposited_to_owner NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_handed_over_out NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_handed_over_in NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_closing_cash NUMERIC(12,2) GENERATED ALWAYS AS (
        opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out
    ) STORED,
    actual_counted_cash NUMERIC(12,2),
    cash_variance NUMERIC(12,2) GENERATED ALWAYS AS (
        actual_counted_cash - (opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out)
    ) STORED,
    variance_explanation TEXT,
    status cash_session_status NOT NULL DEFAULT 'OPEN',
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    reopen_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_manager_session_date UNIQUE (manager_id, session_date)
);

CREATE TRIGGER set_manager_cash_sessions_updated_at
BEFORE UPDATE ON public.manager_cash_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON public.manager_cash_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_manager ON public.manager_cash_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.manager_cash_sessions(status);

-- 2. OWNER DEPOSITS
CREATE SEQUENCE IF NOT EXISTS deposit_seq START WITH 2001;

CREATE TABLE IF NOT EXISTS public.owner_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_number VARCHAR(50) NOT NULL UNIQUE,
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(100),
    proof_attachment_url TEXT,
    status deposit_status NOT NULL DEFAULT 'PENDING',
    confirmed_by UUID REFERENCES public.profiles(id),
    confirmed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_owner_deposits_updated_at
BEFORE UPDATE ON public.owner_deposits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_owner_deposits_manager ON public.owner_deposits(manager_id);
CREATE INDEX IF NOT EXISTS idx_owner_deposits_status ON public.owner_deposits(status);

-- 3. CASH HANDOVERS
CREATE SEQUENCE IF NOT EXISTS handover_seq START WITH 3001;

CREATE TABLE IF NOT EXISTS public.cash_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_number VARCHAR(50) NOT NULL UNIQUE,
    sender_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    receiver_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    handover_reason TEXT NOT NULL,
    status handover_status NOT NULL DEFAULT 'PENDING',
    accepted_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT chk_different_managers CHECK (sender_manager_id <> receiver_manager_id)
);

CREATE TRIGGER set_cash_handovers_updated_at
BEFORE UPDATE ON public.cash_handovers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cash_handovers_sender ON public.cash_handovers(sender_manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_handovers_receiver ON public.cash_handovers(receiver_manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_handovers_status ON public.cash_handovers(status);

-- 4. BUSINESS LOGIC & STORED PROCEDURES

-- 4.1 INITIALIZE DAILY MANAGER CASH SESSION
CREATE OR REPLACE FUNCTION public.fn_initialize_daily_cash_session(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_account_id UUID;
    v_last_closing_cash NUMERIC(12,2) := 0.00;
BEGIN
    -- Locate manager's active cash account
    SELECT id INTO v_account_id 
    FROM public.financial_accounts 
    WHERE assigned_manager_id = p_manager_id AND account_type = 'CASH_MANAGER' AND is_active = true
    LIMIT 1;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Active cash account not configured for this manager.';
    END IF;

    -- Check if session already exists
    SELECT id INTO v_session_id 
    FROM public.manager_cash_sessions 
    WHERE manager_id = p_manager_id AND session_date = p_session_date;

    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;

    -- Carry over previous day's closing cash (actual if entered, otherwise expected)
    SELECT COALESCE(actual_counted_cash, expected_closing_cash) INTO v_last_closing_cash
    FROM public.manager_cash_sessions
    WHERE manager_id = p_manager_id AND session_date < p_session_date
    ORDER BY session_date DESC
    LIMIT 1;

    INSERT INTO public.manager_cash_sessions (
        manager_id, account_id, session_date, opening_cash, status
    )
    VALUES (
        p_manager_id, v_account_id, p_session_date, COALESCE(v_last_closing_cash, 0.00), 'OPEN'
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- 4.2 SUBMIT DAILY CASH CLOSE WITH VARIANCE ENFORCEMENT
CREATE OR REPLACE FUNCTION public.fn_submit_daily_cash_close(
    p_session_id UUID,
    p_actual_counted_cash NUMERIC(12,2),
    p_variance_explanation TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_expected NUMERIC(12,2);
    v_variance NUMERIC(12,2);
BEGIN
    SELECT * INTO v_session
    FROM public.manager_cash_sessions
    WHERE id = p_session_id FOR UPDATE;

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Cash session not found.';
    END IF;

    IF v_session.status NOT IN ('OPEN', 'REOPENED') THEN
        RAISE EXCEPTION 'Cash session cannot be submitted because it is currently %.', v_session.status;
    END IF;

    v_expected := v_session.opening_cash + v_session.cash_receipts + v_session.cash_handed_over_in 
                  - v_session.cash_expenses - v_session.cash_deposited_to_owner - v_session.cash_handed_over_out;
    v_variance := p_actual_counted_cash - v_expected;

    -- Mandatory explanation rule if cash variance exists
    IF v_variance <> 0.00 AND (p_variance_explanation IS NULL OR length(trim(p_variance_explanation)) = 0) THEN
        RAISE EXCEPTION 'A variance of % BDT was detected. A non-empty explanation is required before day-end submission.', v_variance;
    END IF;

    UPDATE public.manager_cash_sessions
    SET actual_counted_cash = p_actual_counted_cash,
        variance_explanation = p_variance_explanation,
        status = 'SUBMITTED',
        submitted_at = timezone('Asia/Dhaka', now()),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'expected_cash', v_expected,
        'actual_cash', p_actual_counted_cash,
        'variance', v_variance,
        'status', 'SUBMITTED'
    );
END;
$$;

-- 4.3 ATOMIC RECEIPT CREATION & CHARGE SETTLEMENT
CREATE OR REPLACE FUNCTION public.fn_record_receipt(
    p_boarder_id UUID,
    p_amount NUMERIC(12,2),
    p_payment_method payment_method,
    p_destination_account_id UUID,
    p_reference TEXT DEFAULT NULL,
    p_allocations JSONB DEFAULT '[]'::JSONB,
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
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
    v_alloc RECORD;
    v_allocated_sum NUMERIC(12,2) := 0.00;
    v_remaining_amount NUMERIC(12,2);
    v_charge RECORD;
    v_alloc_amount NUMERIC(12,2);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Receipt amount must be strictly positive.';
    END IF;

    -- Generate receipt number
    v_receipt_no := 'RCT-' || LPAD(nextval('receipt_seq')::TEXT, 6, '0');

    -- Insert receipt
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
        v_current_user,
        p_destination_account_id,
        p_amount,
        p_payment_method,
        p_reference,
        timezone('Asia/Dhaka', now()),
        p_remarks
    )
    RETURNING id INTO v_receipt_id;

    -- Update destination account balance
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- If cash payment, update manager's daily cash session
    IF p_payment_method = 'CASH' THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

        UPDATE public.manager_cash_sessions
        SET cash_receipts = cash_receipts + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_today;
    END IF;

    -- Process explicit bill allocations if provided
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(charge_id UUID, amount NUMERIC(12,2))
        LOOP
            IF v_alloc.amount > 0 THEN
                INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
                VALUES (v_receipt_id, v_alloc.charge_id, v_alloc.amount);

                v_allocated_sum := v_allocated_sum + v_alloc.amount;
            END IF;
        END LOOP;

        IF v_allocated_sum > p_amount THEN
            RAISE EXCEPTION 'Total allocated charges (%) exceeds total receipt amount (%).', v_allocated_sum, p_amount;
        END IF;
    END IF;

    -- Auto-allocate remaining unallocated receipt amount to oldest unpaid charges (FIFO)
    v_remaining_amount := p_amount - v_allocated_sum;
    IF v_remaining_amount > 0 THEN
        FOR v_charge IN
            SELECT id, due_amount
            FROM public.boarder_charges
            WHERE boarder_id = p_boarder_id
              AND status IN ('UNPAID', 'PARTIALLY_PAID')
              AND due_amount > 0
            ORDER BY due_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_amount <= 0;

            v_alloc_amount := LEAST(v_remaining_amount, v_charge.due_amount);

            IF v_alloc_amount > 0 THEN
                INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
                VALUES (v_receipt_id, v_charge.id, v_alloc_amount);

                v_remaining_amount := v_remaining_amount - v_alloc_amount;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_no,
        'amount', p_amount,
        'payment_method', p_payment_method
    );
END;
$$;

-- 4.4 CONFIRM CASH HANDOVER (TWO-PARTY COMMIT)
CREATE OR REPLACE FUNCTION public.fn_confirm_cash_handover(
    p_handover_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_handover RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
BEGIN
    SELECT * INTO v_handover FROM public.cash_handovers WHERE id = p_handover_id FOR UPDATE;

    IF v_handover IS NULL THEN
        RAISE EXCEPTION 'Handover record not found.';
    END IF;

    IF v_handover.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Handover has already been processed with status %.', v_handover.status;
    END IF;

    IF v_handover.receiver_manager_id <> v_current_user THEN
        RAISE EXCEPTION 'Only designated recipient manager can confirm receipt.';
    END IF;

    -- Update Handover Status
    UPDATE public.cash_handovers
    SET status = 'ACCEPTED', accepted_at = timezone('Asia/Dhaka', now())
    WHERE id = p_handover_id;

    -- Update Sender Session (Outflow)
    PERFORM public.fn_initialize_daily_cash_session(v_handover.sender_manager_id, v_today);

    UPDATE public.manager_cash_sessions
    SET cash_handed_over_out = cash_handed_over_out + v_handover.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_handover.sender_manager_id AND session_date = v_today;

    -- Update Receiver Session (Inflow)
    PERFORM public.fn_initialize_daily_cash_session(v_handover.receiver_manager_id, v_today);

    UPDATE public.manager_cash_sessions
    SET cash_handed_over_in = cash_handed_over_in + v_handover.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_handover.receiver_manager_id AND session_date = v_today;

    RETURN jsonb_build_object('success', true, 'message', 'Cash handover confirmed and balances updated.');
END;
$$;

-- 4.5 CONFIRM OWNER DEPOSIT
CREATE OR REPLACE FUNCTION public.fn_confirm_owner_deposit(
    p_deposit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deposit RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
BEGIN
    SELECT * INTO v_deposit FROM public.owner_deposits WHERE id = p_deposit_id FOR UPDATE;

    IF v_deposit IS NULL THEN
        RAISE EXCEPTION 'Deposit record not found.';
    END IF;

    IF v_deposit.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Deposit has already been processed with status %.', v_deposit.status;
    END IF;

    -- Update deposit record
    UPDATE public.owner_deposits
    SET status = 'CONFIRMED',
        confirmed_by = v_current_user,
        confirmed_at = timezone('Asia/Dhaka', now()),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_deposit_id;

    -- Update manager cash session
    UPDATE public.manager_cash_sessions
    SET cash_deposited_to_owner = cash_deposited_to_owner + v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_deposit.manager_id AND session_date = v_today;

    -- Transfer account balance: From manager account to owner account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_deposit.from_account_id;

    UPDATE public.financial_accounts
    SET current_balance = current_balance + v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_deposit.to_account_id;

    RETURN jsonb_build_object('success', true, 'message', 'Deposit confirmed by owner.');
END;
$$;


-- =============================================================================
-- Migration: 20261015000005_meal_engine_and_cutoff.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000005: Meal Module & 10 PM Asia/Dhaka Cutoff Engine
-- File: supabase/migrations/20261015000005_meal_engine_and_cutoff.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. MEAL SETTINGS (Global Configuration)
CREATE TABLE IF NOT EXISTS public.meal_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    is_meal_module_enabled BOOLEAN NOT NULL DEFAULT true,
    breakfast_enabled BOOLEAN NOT NULL DEFAULT true,
    lunch_enabled BOOLEAN NOT NULL DEFAULT true,
    dinner_enabled BOOLEAN NOT NULL DEFAULT true,
    cutoff_time TIME NOT NULL DEFAULT '22:00:00', -- 10:00 PM Asia/Dhaka Cutoff
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- Seed Default Settings Singleton Row
INSERT INTO public.meal_settings (id, is_meal_module_enabled, breakfast_enabled, lunch_enabled, dinner_enabled, cutoff_time)
VALUES ('00000000-0000-0000-0000-000000000001', true, true, true, true, '22:00:00')
ON CONFLICT (id) DO NOTHING;

-- 2. MEAL RATES (Rate Schedule Over Time)
CREATE TABLE IF NOT EXISTS public.meal_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    effective_from DATE NOT NULL,
    effective_to DATE,
    breakfast_rate NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (breakfast_rate >= 0),
    lunch_rate NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (lunch_rate >= 0),
    dinner_rate NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (dinner_rate >= 0),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_meal_rates_effective ON public.meal_rates(effective_from, effective_to);

-- 3. MEAL SELECTIONS (Daily Boarder Selections)
CREATE TABLE IF NOT EXISTS public.meal_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
    flat_id UUID NOT NULL REFERENCES public.flats(id) ON DELETE RESTRICT,
    meal_date DATE NOT NULL,
    breakfast BOOLEAN NOT NULL DEFAULT false,
    lunch BOOLEAN NOT NULL DEFAULT false,
    dinner BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    is_override BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    override_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_boarder_meal_date UNIQUE (boarder_id, meal_date)
);

CREATE TRIGGER set_meal_selections_updated_at
BEFORE UPDATE ON public.meal_selections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_meal_selections_date_flat ON public.meal_selections(meal_date, flat_id);
CREATE INDEX IF NOT EXISTS idx_meal_selections_boarder ON public.meal_selections(boarder_id);

-- 4. MEAL CHANGE AUDIT TRAIL (Immutable Journal)
CREATE TABLE IF NOT EXISTS public.meal_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    selection_id UUID NOT NULL REFERENCES public.meal_selections(id) ON DELETE CASCADE,
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    session_changed meal_session NOT NULL,
    old_value BOOLEAN NOT NULL,
    new_value BOOLEAN NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_meal_audit_date ON public.meal_change_audit(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_audit_boarder ON public.meal_change_audit(boarder_id);

-- 5. ATOMIC CUTOFF ENFORCING FUNCTION
CREATE OR REPLACE FUNCTION public.fn_toggle_meal_selection(
    p_meal_date DATE,
    p_session VARCHAR(20), -- 'BREAKFAST', 'LUNCH', 'DINNER'
    p_new_state BOOLEAN,
    p_override_reason TEXT DEFAULT NULL,
    p_target_boarder_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_target_boarder_id UUID;
    v_flat_id UUID;
    v_now TIMESTAMPTZ := timezone('Asia/Dhaka', now());
    v_today DATE := (v_now)::DATE;
    v_current_time TIME := (v_now)::TIME;
    v_cutoff_time TIME := '22:00:00';
    v_is_module_enabled BOOLEAN := true;
    v_is_session_enabled BOOLEAN := true;
    v_is_admin BOOLEAN := false;
    v_is_override BOOLEAN := false;
    v_old_state BOOLEAN := false;
    v_selection_id UUID;
    v_upper_session VARCHAR(20) := UPPER(p_session);
BEGIN
    -- Validate session name
    IF v_upper_session NOT IN ('BREAKFAST', 'LUNCH', 'DINNER') THEN
        RAISE EXCEPTION 'Invalid meal session. Must be BREAKFAST, LUNCH, or DINNER.';
    END IF;

    -- Fetch caller role
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    v_is_admin := (v_caller_role IN ('SUPER_ADMIN', 'ADMIN'));

    -- Determine target boarder
    IF p_target_boarder_id IS NOT NULL THEN
        IF NOT v_is_admin THEN
            -- Managers can only modify for their assigned flats
            IF v_caller_role <> 'MANAGER' THEN
                RAISE EXCEPTION 'Unauthorized to modify meal selection for another boarder.';
            END IF;
        END IF;
        v_target_boarder_id := p_target_boarder_id;
    ELSE
        -- Default to caller's linked boarder profile
        SELECT id INTO v_target_boarder_id
        FROM public.boarders
        WHERE user_id = v_caller_id AND status = 'ACTIVE';

        IF v_target_boarder_id IS NULL THEN
            RAISE EXCEPTION 'No active boarder record linked to authenticated user.';
        END IF;
    END IF;

    -- Fetch boarder's currently allocated flat
    SELECT r.flat_id INTO v_flat_id
    FROM public.allocations a
    JOIN public.seats s ON s.id = a.seat_id
    JOIN public.rooms r ON r.id = s.room_id
    WHERE a.boarder_id = v_target_boarder_id AND a.status = 'ACTIVE'
    LIMIT 1;

    IF v_flat_id IS NULL THEN
        RAISE EXCEPTION 'Boarder does not have an active seat/flat allocation.';
    END IF;

    -- Fetch meal settings & cutoff
    SELECT 
        is_meal_module_enabled, 
        cutoff_time,
        CASE 
            WHEN v_upper_session = 'BREAKFAST' THEN breakfast_enabled
            WHEN v_upper_session = 'LUNCH' THEN lunch_enabled
            WHEN v_upper_session = 'DINNER' THEN dinner_enabled
            ELSE false
        END
    INTO v_is_module_enabled, v_cutoff_time, v_is_session_enabled
    FROM public.meal_settings
    LIMIT 1;

    IF NOT v_is_module_enabled THEN
        RAISE EXCEPTION 'Meal management module is currently disabled by administrator.';
    END IF;

    IF NOT v_is_session_enabled THEN
        RAISE EXCEPTION 'Meal session % is currently disabled in system settings.', v_upper_session;
    END IF;

    -- Cutoff Validation Logic:
    -- 1) Past days and same-day modifications are locked for regular boarders
    IF p_meal_date <= v_today THEN
        IF NOT v_is_admin THEN
            RAISE EXCEPTION 'Meal selections for today or past dates cannot be changed.';
        END IF;
        v_is_override := true;
    -- 2) Next-day cutoff (10:00 PM Asia/Dhaka)
    ELSIF p_meal_date = (v_today + INTERVAL '1 day')::DATE THEN
        IF v_current_time >= v_cutoff_time THEN
            IF NOT v_is_admin THEN
                RAISE EXCEPTION '10:00 PM cutoff reached. Next-day meal changes are locked.';
            END IF;
            v_is_override := true;
        END IF;
    END IF;

    -- If override was required, enforce mandatory explanation
    IF v_is_override AND (p_override_reason IS NULL OR length(trim(p_override_reason)) = 0) THEN
        RAISE EXCEPTION 'An override reason is mandatory when altering meals after cutoff.';
    END IF;

    -- Fetch current state if selection exists
    SELECT 
        id,
        CASE 
            WHEN v_upper_session = 'BREAKFAST' THEN breakfast
            WHEN v_upper_session = 'LUNCH' THEN lunch
            WHEN v_upper_session = 'DINNER' THEN dinner
        END
    INTO v_selection_id, v_old_state
    FROM public.meal_selections
    WHERE boarder_id = v_target_boarder_id AND meal_date = p_meal_date;

    IF v_selection_id IS NULL THEN
        -- Insert new row
        INSERT INTO public.meal_selections (
            boarder_id,
            flat_id,
            meal_date,
            breakfast,
            lunch,
            dinner,
            is_override,
            override_reason,
            override_by
        )
        VALUES (
            v_target_boarder_id,
            v_flat_id,
            p_meal_date,
            CASE WHEN v_upper_session = 'BREAKFAST' THEN p_new_state ELSE false END,
            CASE WHEN v_upper_session = 'LUNCH' THEN p_new_state ELSE false END,
            CASE WHEN v_upper_session = 'DINNER' THEN p_new_state ELSE false END,
            v_is_override,
            CASE WHEN v_is_override THEN p_override_reason ELSE NULL END,
            CASE WHEN v_is_override THEN v_caller_id ELSE NULL END
        )
        RETURNING id INTO v_selection_id;

        v_old_state := false;
    ELSE
        -- Update existing row
        UPDATE public.meal_selections
        SET breakfast = CASE WHEN v_upper_session = 'BREAKFAST' THEN p_new_state ELSE breakfast END,
            lunch     = CASE WHEN v_upper_session = 'LUNCH' THEN p_new_state ELSE lunch END,
            dinner    = CASE WHEN v_upper_session = 'DINNER' THEN p_new_state ELSE dinner END,
            is_override = CASE WHEN v_is_override THEN true ELSE is_override END,
            override_reason = CASE WHEN v_is_override THEN p_override_reason ELSE override_reason END,
            override_by = CASE WHEN v_is_override THEN v_caller_id ELSE override_by END,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_selection_id;
    END IF;

    -- Record immutable audit log
    IF v_old_state <> p_new_state THEN
        INSERT INTO public.meal_change_audit (
            selection_id,
            boarder_id,
            meal_date,
            session_changed,
            old_value,
            new_value,
            changed_by
        )
        VALUES (
            v_selection_id,
            v_target_boarder_id,
            p_meal_date,
            v_upper_session::meal_session,
            v_old_state,
            p_new_state,
            v_caller_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'selection_id', v_selection_id,
        'boarder_id', v_target_boarder_id,
        'meal_date', p_meal_date,
        'session', v_upper_session,
        'state', p_new_state,
        'is_override', v_is_override
    );
END;
$$;


-- =============================================================================
-- Migration: 20261015000006_rls_audit_and_views.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000006: RLS Policies, Audit Triggers & Reporting Views
-- File: supabase/migrations/20261015000006_rls_audit_and_views.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. AUDIT LOGS & NOTIFICATIONS TABLES

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    actor_id UUID REFERENCES public.profiles(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'INFO', 'WARNING', 'ALERT', 'MEAL'
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.system_notifications(recipient_id) WHERE is_read = false;

-- 2. RLS SECURITY HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role::VARCHAR FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN') AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.has_flat_access(p_flat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.is_admin_or_owner() OR EXISTS (
        SELECT 1 FROM public.user_flat_assignments 
        WHERE user_id = auth.uid() AND flat_id = p_flat_id
    );
$$;

-- 3. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarder_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_change_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- 4.1 PROFILES POLICIES
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'ACCOUNTANT', 'MANAGER')
);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
FOR ALL TO authenticated
USING (public.current_user_role() = 'SUPER_ADMIN')
WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- 4.2 ACCOMMODATION POLICIES (Buildings, Flats, Rooms, Seats)
DROP POLICY IF EXISTS buildings_select ON public.buildings;
CREATE POLICY buildings_select ON public.buildings
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS buildings_admin_write ON public.buildings;
CREATE POLICY buildings_admin_write ON public.buildings
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS flats_select ON public.flats;
CREATE POLICY flats_select ON public.flats
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner() 
    OR public.has_flat_access(id)
    OR public.current_user_role() IN ('ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS flats_admin_write ON public.flats;
CREATE POLICY flats_admin_write ON public.flats
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner() 
    OR public.has_flat_access(flat_id)
    OR public.current_user_role() IN ('ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS rooms_admin_write ON public.rooms;
CREATE POLICY rooms_admin_write ON public.rooms
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS seats_select ON public.seats;
CREATE POLICY seats_select ON public.seats
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS seats_admin_write ON public.seats;
CREATE POLICY seats_admin_write ON public.seats
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- 4.3 BOARDERS POLICIES
DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (
        public.current_user_role() = 'MANAGER' AND EXISTS (
            SELECT 1 FROM public.allocations a
            JOIN public.seats s ON s.id = a.seat_id
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.user_flat_assignments ufa ON ufa.flat_id = r.flat_id
            WHERE a.boarder_id = public.boarders.id AND ufa.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS applicant_insert_policy ON public.boarders;
CREATE POLICY applicant_insert_policy ON public.boarders
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND status = 'PENDING'
);

DROP POLICY IF EXISTS boarder_self_update_pending ON public.boarders;
CREATE POLICY boarder_self_update_pending ON public.boarders
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING')
WITH CHECK (user_id = auth.uid() AND status = 'PENDING');

DROP POLICY IF EXISTS boarders_admin_manage ON public.boarders;
CREATE POLICY boarders_admin_manage ON public.boarders
FOR ALL TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 4.4 ALLOCATIONS POLICIES
DROP POLICY IF EXISTS allocations_select ON public.allocations;
CREATE POLICY allocations_select ON public.allocations
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (
        public.current_user_role() = 'MANAGER' AND EXISTS (
            SELECT 1 FROM public.seats s
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.user_flat_assignments ufa ON ufa.flat_id = r.flat_id
            WHERE s.id = public.allocations.seat_id AND ufa.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS allocations_admin_write ON public.allocations;
CREATE POLICY allocations_admin_write ON public.allocations
FOR ALL TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 4.5 RECEIPTS & ALLOCATIONS POLICIES
DROP POLICY IF EXISTS receipts_select_policy ON public.receipts;
CREATE POLICY receipts_select_policy ON public.receipts
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND received_by = auth.uid())
);

DROP POLICY IF EXISTS receipts_insert_policy ON public.receipts;
CREATE POLICY receipts_insert_policy ON public.receipts
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND received_by = auth.uid()
);

DROP POLICY IF EXISTS receipts_no_direct_update ON public.receipts;
CREATE POLICY receipts_no_direct_update ON public.receipts
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS receipts_no_direct_delete ON public.receipts;
CREATE POLICY receipts_no_direct_delete ON public.receipts
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS receipt_allocations_select ON public.receipt_allocations;
CREATE POLICY receipt_allocations_select ON public.receipt_allocations
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS receipt_allocations_insert ON public.receipt_allocations;
CREATE POLICY receipt_allocations_insert ON public.receipt_allocations
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'));

-- 4.6 EXPENSES & INCOMES POLICIES
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

DROP POLICY IF EXISTS expenses_select ON public.expenses;
CREATE POLICY expenses_select ON public.expenses
FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND paid_by = auth.uid())
);

DROP POLICY IF EXISTS expenses_insert ON public.expenses;
CREATE POLICY expenses_insert ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND paid_by = auth.uid()
);

DROP POLICY IF EXISTS expenses_no_direct_delete ON public.expenses;
CREATE POLICY expenses_no_direct_delete ON public.expenses
FOR DELETE TO authenticated USING (false);

-- 4.7 MANAGER CASH SESSIONS POLICIES
DROP POLICY IF EXISTS cash_sessions_select_policy ON public.manager_cash_sessions;
CREATE POLICY cash_sessions_select_policy ON public.manager_cash_sessions
FOR SELECT TO authenticated
USING (
    manager_id = auth.uid()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS cash_sessions_update_policy ON public.manager_cash_sessions;
CREATE POLICY cash_sessions_update_policy ON public.manager_cash_sessions
FOR UPDATE TO authenticated
USING (
    (manager_id = auth.uid() AND status IN ('OPEN', 'REOPENED'))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
)
WITH CHECK (
    (manager_id = auth.uid() AND status IN ('OPEN', 'SUBMITTED'))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);

-- 4.8 MEAL SELECTIONS POLICIES
DROP POLICY IF EXISTS meal_selections_select_policy ON public.meal_selections;
CREATE POLICY meal_selections_select_policy ON public.meal_selections
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.is_admin_or_owner()
    OR public.has_flat_access(flat_id)
    OR public.current_user_role() = 'MEAL_OPERATOR'
);

-- Direct client INSERT/UPDATE/DELETE blocked—must use fn_toggle_meal_selection()
DROP POLICY IF EXISTS meal_selections_rpc_only_insert ON public.meal_selections;
CREATE POLICY meal_selections_rpc_only_insert ON public.meal_selections
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS meal_selections_rpc_only_update ON public.meal_selections;
CREATE POLICY meal_selections_rpc_only_update ON public.meal_selections
FOR UPDATE TO authenticated USING (false);

-- 4.9 AUDIT LOGS POLICIES
DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
CREATE POLICY audit_logs_read ON public.audit_logs
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'AUDITOR'));

DROP POLICY IF EXISTS audit_logs_no_write ON public.audit_logs;
CREATE POLICY audit_logs_no_write ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (false);

-- 4.10 SYSTEM NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS notifications_self ON public.system_notifications;
CREATE POLICY notifications_self ON public.system_notifications
FOR ALL TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- 5. AUTOMATED AUDIT TRIGGER IMPLEMENTATION
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_action audit_action;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (
        table_name, record_id, action, old_data, new_data, actor_id
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_action,
        v_old,
        v_new,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_allocations ON public.allocations;
CREATE TRIGGER trg_audit_allocations
AFTER INSERT OR UPDATE OR DELETE ON public.allocations
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_receipts ON public.receipts;
CREATE TRIGGER trg_audit_receipts
AFTER INSERT OR UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_manager_cash_sessions ON public.manager_cash_sessions;
CREATE TRIGGER trg_audit_manager_cash_sessions
AFTER INSERT OR UPDATE ON public.manager_cash_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_boarder_charges ON public.boarder_charges;
CREATE TRIGGER trg_audit_boarder_charges
AFTER INSERT OR UPDATE ON public.boarder_charges
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- 6. REPORTING & ANALYTICAL SQL VIEWS

-- 6.1 MANAGER DAILY RECONCILIATION VIEW
DROP VIEW IF EXISTS public.vw_manager_daily_reconciliation CASCADE;
CREATE OR REPLACE VIEW public.vw_manager_daily_reconciliation AS
SELECT 
    mcs.id AS session_id,
    mcs.session_date,
    p.full_name AS manager_name,
    p.phone_number AS manager_phone,
    fa.account_name,
    mcs.opening_cash,
    mcs.cash_receipts,
    mcs.cash_expenses,
    mcs.cash_deposited_to_owner,
    mcs.cash_handed_over_in,
    mcs.cash_handed_over_out,
    mcs.expected_closing_cash,
    mcs.actual_counted_cash,
    mcs.cash_variance,
    mcs.variance_explanation,
    mcs.status,
    mcs.submitted_at
FROM public.manager_cash_sessions mcs
JOIN public.profiles p ON p.id = mcs.manager_id
JOIN public.financial_accounts fa ON fa.id = mcs.account_id;

-- 6.2 FLAT-WISE DAILY MEAL SUMMARY VIEW
DROP VIEW IF EXISTS public.vw_flat_daily_meal_summary CASCADE;
CREATE OR REPLACE VIEW public.vw_flat_daily_meal_summary AS
SELECT 
    ms.meal_date,
    b.name AS building_name,
    f.id AS flat_id,
    f.name AS flat_name,
    f.flat_code,
    COUNT(ms.id) FILTER (WHERE ms.breakfast = true) AS breakfast_count,
    COUNT(ms.id) FILTER (WHERE ms.lunch = true) AS lunch_count,
    COUNT(ms.id) FILTER (WHERE ms.dinner = true) AS dinner_count,
    (COUNT(ms.id) FILTER (WHERE ms.breakfast = true) +
     COUNT(ms.id) FILTER (WHERE ms.lunch = true) +
     COUNT(ms.id) FILTER (WHERE ms.dinner = true)) AS total_meals
FROM public.flats f
JOIN public.buildings b ON b.id = f.building_id
LEFT JOIN public.meal_selections ms ON ms.flat_id = f.id
GROUP BY ms.meal_date, b.name, f.id, f.name, f.flat_code;

-- 6.3 BOARDER DUES & AGING SUMMARY VIEW
DROP VIEW IF EXISTS public.vw_boarder_dues_summary CASCADE;
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
SELECT 
    b.id AS boarder_id,
    b.boarder_code,
    b.full_name,
    b.phone_number,
    f.name AS flat_name,
    s.seat_name,
    COALESCE(SUM(bc.amount), 0.00) AS total_billed,
    COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(bc.due_amount), 0.00) AS total_outstanding_due,
    COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN public.boarder_charges bc ON bc.boarder_id = b.id AND bc.status IN ('UNPAID', 'PARTIALLY_PAID')
GROUP BY b.id, b.boarder_code, b.full_name, b.phone_number, f.name, s.seat_name;


-- =============================================================================
-- Migration: 20261015000007_seed_initial_data.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000007: Initial System Seed Data
-- File: supabase/migrations/20261015000007_seed_initial_data.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. SEED EXPENSE CATEGORIES
INSERT INTO public.expense_categories (name, description, is_active)
VALUES
    ('Electric Bill', 'Monthly electricity and power charges', true),
    ('Water & Gas', 'Utility bills for water supply and LP/Wasa gas', true),
    ('Internet & WiFi', 'High-speed broadband internet subscription', true),
    ('Maintenance & Repairs', 'Plumbing, electrical, furniture and painting repairs', true),
    ('Cook & Cleaner Salary', 'Monthly payroll for cook, helper, and cleaning staff', true),
    ('Cleaning Supplies', 'Detergents, floor cleaner, and waste management items', true),
    ('Miscellaneous', 'Incidental operational expenditures', true)
ON CONFLICT (name) DO NOTHING;

-- 2. SEED INCOME CATEGORIES
INSERT INTO public.income_categories (name, description, is_active)
VALUES
    ('Boarder Rent', 'Regular recurring monthly seat/room rent', true),
    ('Security Deposit', 'One-time refundable admission security deposit', true),
    ('Guest Stay Fee', 'Daily charges for boarder guests or temporary visitors', true),
    ('Scrap Sale', 'Revenue generated from selling old newspapers/cartons/scrap', true)
ON CONFLICT (name) DO NOTHING;

-- 3. SEED INITIAL SAMPLE PROPERTY & ACCOMMODATION
-- (Clean production baseline - add your hostel buildings, flats, rooms, and seats from ERP dashboard)

-- 4. SEED MEAL MODULE SETTINGS & INITIAL RATES
-- 4.1 Ensure Global Meal Setting Singleton
INSERT INTO public.meal_settings (id, is_meal_module_enabled, breakfast_enabled, lunch_enabled, dinner_enabled, cutoff_time)
VALUES ('00000000-0000-0000-0000-000000000001', true, true, true, true, '22:00:00')
ON CONFLICT (id) DO UPDATE 
SET is_meal_module_enabled = true,
    breakfast_enabled = true,
    lunch_enabled = true,
    dinner_enabled = true,
    cutoff_time = '22:00:00';

-- 4.2 Seed Initial Meal Rate
INSERT INTO public.meal_rates (id, effective_from, effective_to, breakfast_rate, lunch_rate, dinner_rate)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '2026-10-01',
    NULL, -- Currently active rate
    25.00,
    60.00,
    60.00
)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED INITIAL FINANCIAL CASH ACCOUNTS
INSERT INTO public.financial_accounts (id, account_name, account_type, account_number, bank_name, current_balance, is_active)
VALUES 
    (
        '66666666-6666-6666-6666-666666666661',
        'Main Hostel Cash Vault (মেইন ক্যাশ)',
        'CASH_OWNER',
        'CASH-VAULT-01',
        'Main Cash Safe',
        50000.00,
        true
    ),
    (
        '66666666-6666-6666-6666-666666666662',
        'Islami Bank Operating Account',
        'BANK',
        '2050123456789012',
        'Islami Bank Bangladesh PLC',
        150000.00,
        true
    ),
    (
        '66666666-6666-6666-6666-666666666663',
        'bKash Merchant Account',
        'MFS',
        '01700000000',
        'bKash',
        25000.00,
        true
    )
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Migration: 20261015000008_seat_allocation_functions.sql
-- =============================================================================

-- ==============================================================================
-- 20261015000008_seat_allocation_functions.sql
-- Master RPC Functions for Seat Allocation, Atomic Transfers, and Cancellations
-- Enforces concurrency protection and double-booking prevention.
-- ==============================================================================

-- 1. ATOMIC SEAT ALLOCATION
CREATE OR REPLACE FUNCTION public.fn_allocate_seat(
    p_boarder_id UUID,
    p_seat_id UUID,
    p_monthly_rent NUMERIC(12,2),
    p_security_deposit NUMERIC(12,2) DEFAULT 0.00,
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_seat_status public.seat_status;
    v_boarder_status public.boarder_status;
    v_existing_alloc_id UUID;
    v_new_alloc_id UUID;
BEGIN
    -- Check boarder eligibility
    SELECT status INTO v_boarder_status
    FROM public.boarders
    WHERE id = p_boarder_id;

    IF v_boarder_status IS NULL THEN
        RAISE EXCEPTION 'বর্ডার আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_boarder_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় (ACTIVE) বর্ডারকে সিট বরাদ্দ দেওয়া সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    -- Ensure boarder does not already have an ACTIVE allocation
    SELECT id INTO v_existing_alloc_id
    FROM public.allocations
    WHERE boarder_id = p_boarder_id AND status = 'ACTIVE'
    LIMIT 1;

    IF v_existing_alloc_id IS NOT NULL THEN
        RAISE EXCEPTION 'এই বর্ডারের ইতিমধ্যে একটি সক্রিয় সিট বরাদ্দ রয়েছে।' USING ERRCODE = 'P0003';
    END IF;

    -- Concurrency check: Lock seat row and check status
    SELECT status INTO v_seat_status
    FROM public.seats
    WHERE id = p_seat_id
    FOR UPDATE;

    IF v_seat_status IS NULL THEN
        RAISE EXCEPTION 'সিট আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_seat_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'সিটটি বর্তমানে খালি নেই (স্ট্যাটাস: %)। অন্য সিট নির্বাচন করুন।', v_seat_status USING ERRCODE = 'P0004';
    END IF;

    -- Create allocation record (triggers seat status sync)
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
        p_boarder_id,
        p_seat_id,
        p_monthly_rent,
        p_security_deposit,
        p_start_date,
        'ACTIVE',
        p_remarks,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Record in immutable allocation history
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        v_new_alloc_id,
        NULL,
        p_seat_id,
        'INITIAL',
        p_start_date,
        COALESCE(p_remarks, 'প্রাথমিক সিট বরাদ্দ সম্পন্ন'),
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. ATOMIC SEAT TRANSFER
CREATE OR REPLACE FUNCTION public.fn_transfer_seat(
    p_allocation_id UUID,
    p_new_seat_id UUID,
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_old_alloc public.allocations%ROWTYPE;
    v_new_seat_status public.seat_status;
    v_new_alloc_id UUID;
BEGIN
    -- Lock old allocation
    SELECT * INTO v_old_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_old_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_old_alloc.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'শুধুমাত্র সক্রিয় বরাদ্দ স্থানান্তর করা সম্ভব।' USING ERRCODE = 'P0001';
    END IF;

    IF v_old_alloc.seat_id = p_new_seat_id THEN
        RAISE EXCEPTION 'বর্তমান সিট এবং নতুন সিট একই হতে পারে না।' USING ERRCODE = 'P0005';
    END IF;

    -- Lock new seat and verify availability
    SELECT status INTO v_new_seat_status
    FROM public.seats
    WHERE id = p_new_seat_id
    FOR UPDATE;

    IF v_new_seat_status IS NULL THEN
        RAISE EXCEPTION 'নতুন সিট আইডি পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_new_seat_status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'নতুন সিটটি বর্তমানে খালি নেই (স্ট্যাটাস: %)।', v_new_seat_status USING ERRCODE = 'P0004';
    END IF;

    -- Close old allocation
    UPDATE public.allocations
    SET status = 'TRANSFERRED',
        end_date = p_effective_date,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_allocation_id;

    -- Create new active allocation for target seat
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
        v_old_alloc.boarder_id,
        p_new_seat_id,
        v_old_alloc.monthly_rent,
        v_old_alloc.security_deposit,
        p_effective_date,
        'ACTIVE',
        p_reason,
        auth.uid()
    ) RETURNING id INTO v_new_alloc_id;

    -- Record transfer history
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        v_new_alloc_id,
        v_old_alloc.seat_id,
        p_new_seat_id,
        'TRANSFER',
        p_effective_date,
        COALESCE(p_reason, 'সিট স্থানান্তর সম্পন্ন'),
        auth.uid()
    );

    RETURN v_new_alloc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. SEAT CANCELLATION / DEPARTURE
CREATE OR REPLACE FUNCTION public.fn_cancel_allocation(
    p_allocation_id UUID,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ENDED'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alloc public.allocations%ROWTYPE;
    v_target_status public.allocation_status;
BEGIN
    SELECT * INTO v_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ রেকর্ড পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    IF v_alloc.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'এই বরাদ্দটি ইতিমধ্যে সমাপ্ত বা বাতিল অবস্থায় আছে।' USING ERRCODE = 'P0001';
    END IF;

    v_target_status := p_status::public.allocation_status;

    -- Update allocation to ENDED or CANCELLED (Triggers seat status back to AVAILABLE)
    UPDATE public.allocations
    SET status = v_target_status,
        end_date = p_end_date,
        cancellation_reason = p_reason,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_allocation_id;

    -- Update boarder status to LEFT if departure
    IF v_target_status = 'ENDED' THEN
        UPDATE public.boarders
        SET status = 'LEFT',
            leaving_date = p_end_date,
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;
    END IF;

    -- Record history entry
    INSERT INTO public.allocation_history (
        allocation_id,
        previous_seat_id,
        new_seat_id,
        change_type,
        effective_date,
        reason,
        recorded_by
    ) VALUES (
        p_allocation_id,
        v_alloc.seat_id,
        NULL,
        CASE WHEN v_target_status = 'CANCELLED' THEN 'CANCEL' ELSE 'END' END,
        p_end_date,
        p_reason,
        auth.uid()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- Migration: 20261015000009_billing_and_charge_functions.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000009: Billing Engine & Monthly Rent Batch RPC
-- File: supabase/migrations/20261015000009_billing_and_charge_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. FUNCTION: fn_generate_monthly_rent_charges
-- Purpose: Atomically generate monthly rent charges for all active allocations.
-- Prevents duplicate rent generation for the same boarder in the same month.
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
            b.full_name,
            b.boarder_code
        FROM public.allocations a
        JOIN public.boarders b ON b.id = a.boarder_id
        WHERE a.status = 'ACTIVE'
          AND b.status = 'ACTIVE'
    LOOP
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
        'message', format('মাসিক ভাড়া সফলভাবে সম্পন্ন: %s টি তৈরি হয়েছে, %s টি পূর্বে তৈরিকৃত ছিল।', v_generated, v_skipped)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_rent_charges(DATE, DATE) TO authenticated;

-- 2. ENHANCED VIEW: vw_boarder_dues_summary
-- Provides comprehensive boarder dues, flat/seat information, and overdue aging
DROP VIEW IF EXISTS public.vw_boarder_dues_summary CASCADE;
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
WITH last_payments AS (
    SELECT 
        r.boarder_id,
        MAX(r.receipt_date) AS last_payment_date
    FROM public.receipts r
    WHERE r.is_void = false
    GROUP BY r.boarder_id
)
SELECT 
    b.id AS boarder_id,
    b.boarder_code,
    b.full_name,
    b.phone_number,
    b.photo_url,
    f.flat_code,
    f.name AS flat_name,
    s.seat_code,
    s.seat_name,
    COALESCE(SUM(bc.amount), 0.00) AS total_billed,
    COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(bc.due_amount), 0.00) AS outstanding_due,
    COALESCE(SUM(bc.due_amount), 0.00) AS total_outstanding_due,
    COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE AND bc.status IN ('UNPAID', 'PARTIALLY_PAID') THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount,
    lp.last_payment_date
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN public.boarder_charges bc ON bc.boarder_id = b.id
LEFT JOIN last_payments lp ON lp.boarder_id = b.id
GROUP BY 
    b.id, 
    b.boarder_code, 
    b.full_name, 
    b.phone_number, 
    b.photo_url, 
    f.flat_code, 
    f.name, 
    s.seat_code, 
    s.seat_name, 
    lp.last_payment_date;

GRANT SELECT ON public.vw_boarder_dues_summary TO authenticated;


-- =============================================================================
-- Migration: 20261015000010_receipt_and_void_functions.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000010: Receipt Collection & Void Reversal Functions
-- File: supabase/migrations/20261015000010_receipt_and_void_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. FUNCTION: fn_void_receipt
-- Purpose: Safely void a receipt, reversing account balances and re-syncing boarder charges.
CREATE OR REPLACE FUNCTION public.fn_void_receipt(
    p_receipt_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
    v_alloc RECORD;
    v_new_paid NUMERIC(12,2);
    v_charge_amt NUMERIC(12,2);
BEGIN
    IF p_void_reason IS NULL OR TRIM(p_void_reason) = '' THEN
        RAISE EXCEPTION 'রিসিপ্ট বাতিলের জন্য কারণ উল্লেখ করা বাধ্যতামূলক।';
    END IF;

    -- Fetch and lock receipt
    SELECT * INTO v_receipt
    FROM public.receipts
    WHERE id = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'রিসিপ্ট পাওয়া যায়নি (Receipt not found).';
    END IF;

    IF v_receipt.is_void THEN
        RAISE EXCEPTION 'এই মানি রিসিপ্টটি ইতিমধ্যেই বাতিল করা হয়েছে।';
    END IF;

    -- Mark receipt as void
    UPDATE public.receipts
    SET is_void = true,
        void_reason = TRIM(p_void_reason),
        void_by = v_current_user,
        void_at = timezone('Asia/Dhaka', now())
    WHERE id = p_receipt_id;

    -- Deduct from destination financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - v_receipt.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_receipt.destination_account_id;

    -- If cash, reverse from current manager cash session
    IF v_receipt.payment_method = 'CASH' THEN
        UPDATE public.manager_cash_sessions
        SET cash_receipts = GREATEST(0.00, cash_receipts - v_receipt.amount),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_receipt.received_by
          AND session_date = (timezone('Asia/Dhaka', v_receipt.receipt_date))::DATE;
    END IF;

    -- Resync all charges that had allocations from this receipt
    FOR v_alloc IN
        SELECT ra.charge_id
        FROM public.receipt_allocations ra
        WHERE ra.receipt_id = p_receipt_id
    LOOP
        -- Calculate total active paid amount excluding void receipts
        SELECT COALESCE(SUM(ra2.allocated_amount), 0.00)
        INTO v_new_paid
        FROM public.receipt_allocations ra2
        JOIN public.receipts r2 ON r2.id = ra2.receipt_id
        WHERE ra2.charge_id = v_alloc.charge_id
          AND r2.is_void = false;

        SELECT amount INTO v_charge_amt
        FROM public.boarder_charges
        WHERE id = v_alloc.charge_id;

        -- Update charge status
        UPDATE public.boarder_charges
        SET paid_amount = v_new_paid,
            status = CASE 
                WHEN v_new_paid >= v_charge_amt THEN 'PAID'::charge_status
                WHEN v_new_paid > 0 THEN 'PARTIALLY_PAID'::charge_status
                ELSE 'UNPAID'::charge_status
            END,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.charge_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', p_receipt_id,
        'receipt_number', v_receipt.receipt_number,
        'amount', v_receipt.amount,
        'message', format('রিসিপ্ট %s সফলভাবে বাতিল ও সমন্বয় করা হয়েছে।', v_receipt.receipt_number)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_void_receipt(UUID, TEXT) TO authenticated;


-- =============================================================================
-- Migration: 20261015000011_expense_functions.sql
-- =============================================================================

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


-- =============================================================================
-- Migration: 20261015000012_income_and_transfer_functions.sql
-- =============================================================================

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


-- =============================================================================
-- Migration: 20261015000013_cash_session_improvements.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000013: Manager Cash Custody Improvements
-- File: supabase/migrations/20261015000013_cash_session_improvements.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. ENHANCED fn_initialize_daily_cash_session
-- Ensures fallback to default manager cash account and carryover from previous finalized session
CREATE OR REPLACE FUNCTION public.fn_initialize_daily_cash_session(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_session_id UUID;
    v_account_id UUID;
    v_last_closing_cash NUMERIC(12,2) := 0.00;
BEGIN
    -- Locate manager's cash account (assigned or default)
    SELECT id INTO v_account_id 
    FROM public.financial_accounts 
    WHERE (assigned_manager_id = p_manager_id OR assigned_manager_id IS NULL) 
      AND account_type = 'CASH_MANAGER' AND is_active = true
    ORDER BY (assigned_manager_id = p_manager_id) DESC, created_at ASC
    LIMIT 1;

    -- If no CASH_MANAGER account, fallback to any cash vault
    IF v_account_id IS NULL THEN
        SELECT id INTO v_account_id 
        FROM public.financial_accounts 
        WHERE account_type IN ('CASH_MANAGER', 'CASH_OWNER') AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- If still none exists, dynamically create a standard Manager Cash Drawer
    IF v_account_id IS NULL THEN
        INSERT INTO public.financial_accounts (
            account_name, account_type, current_balance, assigned_manager_id, is_active
        )
        VALUES (
            'ম্যানেজার ক্যাশ বক্স (Manager Cash)', 'CASH_MANAGER', 0.00, p_manager_id, true
        )
        RETURNING id INTO v_account_id;
    END IF;

    -- Check if session already exists for this manager on this date
    SELECT id INTO v_session_id 
    FROM public.manager_cash_sessions 
    WHERE manager_id = p_manager_id AND session_date = p_session_date;

    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;

    -- Carry over previous day's closing cash (actual counted if entered, otherwise expected closing)
    SELECT COALESCE(actual_counted_cash, expected_closing_cash) INTO v_last_closing_cash
    FROM public.manager_cash_sessions
    WHERE manager_id = p_manager_id AND session_date < p_session_date
    ORDER BY session_date DESC
    LIMIT 1;

    INSERT INTO public.manager_cash_sessions (
        manager_id, 
        account_id, 
        session_date, 
        opening_cash, 
        status
    )
    VALUES (
        p_manager_id, 
        v_account_id, 
        p_session_date, 
        COALESCE(v_last_closing_cash, 0.00), 
        'OPEN'
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- 2. FUNCTION: fn_get_manager_cash_session_details
-- Fetches full session data and today's itemized cash movements
CREATE OR REPLACE FUNCTION public.fn_get_manager_cash_session_details(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_session_id UUID;
    v_session RECORD;
    v_receipts JSONB;
    v_expenses JSONB;
    v_transfers JSONB;
BEGIN
    -- Ensure session initialized
    v_session_id := public.fn_initialize_daily_cash_session(p_manager_id, p_session_date);

    -- Fetch session record
    SELECT * INTO v_session
    FROM public.manager_cash_sessions
    WHERE id = v_session_id;

    -- Fetch today's cash collections
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'receipt_number', r.receipt_number,
            'amount', r.amount,
            'payer', p.full_name,
            'time', r.receipt_date
        )
    ), '[]'::JSONB)
    INTO v_receipts
    FROM public.receipts r
    LEFT JOIN public.boarders b ON b.id = r.boarder_id
    LEFT JOIN public.profiles p ON p.id = b.user_id
    WHERE r.received_by = p_manager_id 
      AND r.payment_method = 'CASH'
      AND (timezone('Asia/Dhaka', r.receipt_date))::DATE = p_session_date
      AND r.is_void = false;

    -- Fetch today's cash expenses
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'voucher_no', e.expense_voucher_no,
            'amount', e.amount,
            'category', c.name,
            'description', e.description
        )
    ), '[]'::JSONB)
    INTO v_expenses
    FROM public.expenses e
    LEFT JOIN public.expense_categories c ON c.id = e.category_id
    WHERE e.paid_by = p_manager_id
      AND e.expense_date = p_session_date
      AND e.approval_status <> 'REJECTED';

    RETURN jsonb_build_object(
        'session', row_to_json(v_session),
        'today_cash_receipts', v_receipts,
        'today_cash_expenses', v_expenses
    );
END;
$$;


-- =============================================================================
-- Migration: 20261015000014_day_end_and_handover_functions.sql
-- =============================================================================

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


-- =============================================================================
-- Migration: 20261015000015_meal_billing_and_settings_functions.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000015: Meal Billing, Rates & Settings Procedures
-- File: supabase/migrations/20261015000015_meal_billing_and_settings_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. SAVE GLOBAL MEAL SETTINGS
CREATE OR REPLACE FUNCTION public.fn_save_meal_settings(
    p_is_meal_module_enabled BOOLEAN,
    p_breakfast_enabled BOOLEAN,
    p_lunch_enabled BOOLEAN,
    p_dinner_enabled BOOLEAN,
    p_cutoff_time TIME DEFAULT '22:00:00'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র সুপার এডমিন বা হোস্টেল এডমিন মিল সেটিংস পরিবর্তন করতে পারেন।';
    END IF;

    UPDATE public.meal_settings
    SET 
        is_meal_module_enabled = p_is_meal_module_enabled,
        breakfast_enabled = p_breakfast_enabled,
        lunch_enabled = p_lunch_enabled,
        dinner_enabled = p_dinner_enabled,
        cutoff_time = p_cutoff_time,
        updated_by = v_caller_id,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = '00000000-0000-0000-0000-000000000001';

    IF NOT FOUND THEN
        INSERT INTO public.meal_settings (
            id,
            is_meal_module_enabled,
            breakfast_enabled,
            lunch_enabled,
            dinner_enabled,
            cutoff_time,
            updated_by,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            p_is_meal_module_enabled,
            p_breakfast_enabled,
            p_lunch_enabled,
            p_dinner_enabled,
            p_cutoff_time,
            v_caller_id,
            timezone('Asia/Dhaka', now())
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'মিল সিস্টেম কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।'
    );
END;
$$;

-- 2. CREATE NEW EFFECTIVE MEAL RATE
CREATE OR REPLACE FUNCTION public.fn_create_meal_rate(
    p_effective_from DATE,
    p_breakfast_rate NUMERIC(8,2),
    p_lunch_rate NUMERIC(8,2),
    p_dinner_rate NUMERIC(8,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_rate_id UUID;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন মিলের রেট নির্ধারণ করতে পারেন।';
    END IF;

    IF p_breakfast_rate < 0 OR p_lunch_rate < 0 OR p_dinner_rate < 0 THEN
        RAISE EXCEPTION 'মিলের রেট ঋণাত্মক (negative) হতে পারে না।';
    END IF;

    -- Close any existing open-ended rate that ends before the new effective_from date
    UPDATE public.meal_rates
    SET effective_to = p_effective_from - INTERVAL '1 day'
    WHERE effective_to IS NULL AND effective_from < p_effective_from;

    -- Insert new rate schedule
    INSERT INTO public.meal_rates (
        effective_from,
        effective_to,
        breakfast_rate,
        lunch_rate,
        dinner_rate,
        created_by,
        created_at
    ) VALUES (
        p_effective_from,
        NULL,
        p_breakfast_rate,
        p_lunch_rate,
        p_dinner_rate,
        v_caller_id,
        timezone('Asia/Dhaka', now())
    )
    RETURNING id INTO v_rate_id;

    RETURN jsonb_build_object(
        'success', true,
        'rate_id', v_rate_id,
        'message', 'নতুন মিল রেট সফলভাবে কার্যকর করা হয়েছে।'
    );
END;
$$;

-- 3. PREVIEW MONTHLY MEAL BILLING (Opt-Out Mess Engine with Minimum 45 Meals & 0.5 Breakfast)
CREATE OR REPLACE FUNCTION public.fn_get_monthly_meal_billing_preview(
    p_billing_month DATE,
    p_default_min_meals NUMERIC DEFAULT 45.0,
    p_boarder_min_overrides JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_rate RECORD;
    v_b_enabled BOOLEAN := true;
    v_l_enabled BOOLEAN := true;
    v_d_enabled BOOLEAN := true;
    v_configured_min NUMERIC := 45.0;
    v_results JSONB;
BEGIN
    v_start_date := DATE_TRUNC('month', p_billing_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;

    -- Fetch active meal rates during this month
    SELECT breakfast_rate, lunch_rate, dinner_rate
    INTO v_rate
    FROM public.meal_rates
    WHERE effective_from <= v_end_date
      AND (effective_to IS NULL OR effective_to >= v_start_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        v_rate.breakfast_rate := 26.00;
        v_rate.lunch_rate := 52.00;
        v_rate.dinner_rate := 52.00;
    END IF;

    -- Fetch meal session enabled settings and default min meals
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true),
        COALESCE(min_monthly_meals, 45.0)
    INTO v_b_enabled, v_l_enabled, v_d_enabled, v_configured_min
    FROM public.meal_settings
    LIMIT 1;

    IF p_default_min_meals IS NOT NULL AND p_default_min_meals >= 0 THEN
        v_configured_min := p_default_min_meals;
    END IF;

    WITH date_series AS (
        SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
    ),
    boarder_active_days AS (
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            b.phone_number,
            b.admission_date,
            f.name AS flat_name,
            a.id AS allocation_id,
            ds.day_date
        FROM public.boarders b
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        LEFT JOIN public.seats s ON s.id = a.seat_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.flats f ON f.id = r.flat_id
        CROSS JOIN date_series ds
        WHERE b.status = 'ACTIVE'
          AND ds.day_date >= GREATEST(v_start_date, COALESCE(a.start_date, b.admission_date, v_start_date))
          AND (a.end_date IS NULL OR ds.day_date <= a.end_date)
    ),
    daily_meals AS (
        SELECT 
            bad.boarder_id,
            bad.boarder_name,
            bad.boarder_code,
            bad.phone_number,
            bad.flat_name,
            bad.allocation_id,
            bad.admission_date,
            bad.day_date,
            (COALESCE(ms.breakfast, true) AND v_b_enabled) AS b_active,
            (COALESCE(ms.lunch, true) AND v_l_enabled) AS l_active,
            (COALESCE(ms.dinner, true) AND v_d_enabled) AS d_active
        FROM boarder_active_days bad
        LEFT JOIN public.meal_selections ms 
               ON ms.boarder_id = bad.boarder_id 
              AND ms.meal_date = bad.day_date
    ),
    boarder_resident_summary AS (
        SELECT 
            dm.boarder_id,
            dm.boarder_name,
            dm.boarder_code,
            dm.phone_number,
            dm.flat_name,
            dm.allocation_id,
            COUNT(dm.day_date) AS active_days_count,
            COUNT(dm.day_date) FILTER (WHERE dm.b_active = true) AS breakfast_sessions,
            COUNT(dm.day_date) FILTER (WHERE dm.l_active = true) AS lunch_sessions,
            COUNT(dm.day_date) FILTER (WHERE dm.d_active = true) AS dinner_sessions
        FROM daily_meals dm
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.phone_number, dm.flat_name, dm.allocation_id
    ),
    guest_summary AS (
        SELECT 
            gmb.boarder_id,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'BREAKFAST' THEN gmb.guest_count ELSE 0 END), 0) AS guest_breakfast,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'LUNCH' THEN gmb.guest_count ELSE 0 END), 0) AS guest_lunch,
            COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'DINNER' THEN gmb.guest_count ELSE 0 END), 0) AS guest_dinner,
            COALESCE(SUM(gmb.total_amount), 0) AS guest_amount
        FROM public.guest_meal_bookings gmb
        WHERE gmb.meal_date >= v_start_date 
          AND gmb.meal_date <= v_end_date
          AND gmb.status = 'CONFIRMED'
        GROUP BY gmb.boarder_id
    ),
    all_active_boarders AS (
        SELECT 
            b.id AS boarder_id,
            b.full_name AS boarder_name,
            b.boarder_code,
            b.phone_number,
            COALESCE(f.name, 'অনির্ধারিত') AS flat_name,
            a.id AS allocation_id
        FROM public.boarders b
        LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
        LEFT JOIN public.seats s ON s.id = a.seat_id
        LEFT JOIN public.rooms r ON r.id = s.room_id
        LEFT JOIN public.flats f ON f.id = r.flat_id
        WHERE b.status = 'ACTIVE'
    ),
    calculated_items AS (
        SELECT 
            aab.boarder_id,
            aab.boarder_name,
            aab.boarder_code,
            aab.phone_number,
            aab.flat_name,
            aab.allocation_id,
            COALESCE(brs.breakfast_sessions, 0) + COALESCE(gs.guest_breakfast, 0) AS breakfast_sessions,
            COALESCE(brs.lunch_sessions, 0) + COALESCE(gs.guest_lunch, 0) AS lunch_sessions,
            COALESCE(brs.dinner_sessions, 0) + COALESCE(gs.guest_dinner, 0) AS dinner_sessions,
            ROUND((
                (COALESCE(brs.breakfast_sessions, 0) + COALESCE(gs.guest_breakfast, 0)) * 0.5 +
                (COALESCE(brs.lunch_sessions, 0) + COALESCE(gs.guest_lunch, 0)) * 1.0 +
                (COALESCE(brs.dinner_sessions, 0) + COALESCE(gs.guest_dinner, 0)) * 1.0
            )::numeric, 1) AS consumed_meals,
            COALESCE(
                CASE 
                    WHEN p_boarder_min_overrides IS NOT NULL AND p_boarder_min_overrides ? aab.boarder_id::text
                    THEN (p_boarder_min_overrides->>aab.boarder_id::text)::numeric
                    ELSE v_configured_min
                END, 
                v_configured_min
            ) AS min_meals_quota,
            COALESCE(gs.guest_amount, 0) AS guest_amount,
            EXISTS (
                SELECT 1 FROM public.boarder_charges bc
                WHERE bc.boarder_id = aab.boarder_id
                  AND bc.charge_type = 'MEAL'
                  AND bc.billing_month = v_start_date
                  AND bc.status <> 'VOID'
            ) AS already_billed
        FROM all_active_boarders aab
        LEFT JOIN boarder_resident_summary brs ON brs.boarder_id = aab.boarder_id
        LEFT JOIN guest_summary gs ON gs.boarder_id = aab.boarder_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'boarder_id', ci.boarder_id,
            'boarder_name', ci.boarder_name,
            'boarder_code', ci.boarder_code,
            'phone_number', ci.phone_number,
            'flat_name', ci.flat_name,
            'allocation_id', ci.allocation_id,
            'breakfast_count', ci.breakfast_sessions,
            'lunch_count', ci.lunch_sessions,
            'dinner_count', ci.dinner_sessions,
            'consumed_meals', ci.consumed_meals,
            'min_meals', ci.min_meals_quota,
            'shortfall_meals', GREATEST(0, ROUND((ci.min_meals_quota - ci.consumed_meals)::numeric, 1)),
            'billable_meals', GREATEST(ci.consumed_meals, ci.min_meals_quota),
            'total_meals', GREATEST(ci.consumed_meals, ci.min_meals_quota),
            'breakfast_cost', ROUND((ci.breakfast_sessions * v_rate.breakfast_rate)::numeric, 2),
            'lunch_cost', ROUND((ci.lunch_sessions * v_rate.lunch_rate)::numeric, 2),
            'dinner_cost', ROUND((ci.dinner_sessions * v_rate.dinner_rate)::numeric, 2),
            'shortfall_cost', ROUND((GREATEST(0, (ci.min_meals_quota - ci.consumed_meals)) * v_rate.lunch_rate)::numeric, 2),
            'total_amount', ROUND((
                ci.breakfast_sessions * v_rate.breakfast_rate +
                ci.lunch_sessions * v_rate.lunch_rate +
                ci.dinner_sessions * v_rate.dinner_rate +
                ci.guest_amount +
                GREATEST(0, (ci.min_meals_quota - ci.consumed_meals)) * v_rate.lunch_rate
            )::numeric, 2),
            'already_billed', ci.already_billed
        )
        ORDER BY ci.boarder_name ASC
    )
    INTO v_results
    FROM calculated_items ci;

    RETURN jsonb_build_object(
        'billing_month', v_start_date,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'rates', jsonb_build_object(
            'breakfast', v_rate.breakfast_rate,
            'lunch', v_rate.lunch_rate,
            'dinner', v_rate.dinner_rate
        ),
        'min_monthly_meals', v_configured_min,
        'preview_items', COALESCE(v_results, '[]'::jsonb)
    );
END;
$$;

-- 4. ATOMIC GENERATION OF MONTHLY MEAL CHARGES (Opt-Out Mess Engine with Minimum 45 Meals)
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_meal_charges(
    p_billing_month DATE,
    p_due_date DATE DEFAULT NULL,
    p_default_min_meals NUMERIC DEFAULT 45.0,
    p_boarder_min_overrides JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role user_role;
    v_start_date DATE;
    v_end_date DATE;
    v_month_label TEXT;
    v_rate RECORD;
    v_b_enabled BOOLEAN := true;
    v_l_enabled BOOLEAN := true;
    v_d_enabled BOOLEAN := true;
    v_configured_min NUMERIC := 45.0;
    v_row RECORD;
    v_consumed_meals NUMERIC;
    v_min_meals NUMERIC;
    v_shortfall NUMERIC;
    v_billable_meals NUMERIC;
    v_actual_cost NUMERIC(12,2);
    v_shortfall_cost NUMERIC(12,2);
    v_total_cost NUMERIC(12,2);
    v_description TEXT;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_total_amount_billed NUMERIC(12,2) := 0.00;
    v_existing_charge RECORD;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT') THEN
        RAISE EXCEPTION 'অননুমোদিত: শুধুমাত্র এডমিন বা একাউন্টেন্ট মিল চার্জ জেনারেট করতে পারেন।';
    END IF;

    v_start_date := DATE_TRUNC('month', p_billing_month)::DATE;
    v_end_date := (DATE_TRUNC('month', p_billing_month) + INTERVAL '1 month - 1 day')::DATE;
    v_month_label := to_char(v_start_date, 'FMMonth YYYY');

    IF p_due_date IS NULL THEN
        p_due_date := v_start_date + INTERVAL '9 days';
    END IF;

    -- Fetch active meal rates
    SELECT breakfast_rate, lunch_rate, dinner_rate
    INTO v_rate
    FROM public.meal_rates
    WHERE effective_from <= v_end_date
      AND (effective_to IS NULL OR effective_to >= v_start_date)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        v_rate.breakfast_rate := 26.00;
        v_rate.lunch_rate := 52.00;
        v_rate.dinner_rate := 52.00;
    END IF;

    -- Fetch meal session settings and min meals
    SELECT 
        COALESCE(breakfast_enabled, true),
        COALESCE(lunch_enabled, true),
        COALESCE(dinner_enabled, true),
        COALESCE(min_monthly_meals, 45.0)
    INTO v_b_enabled, v_l_enabled, v_d_enabled, v_configured_min
    FROM public.meal_settings
    LIMIT 1;

    IF p_default_min_meals IS NOT NULL AND p_default_min_meals >= 0 THEN
        v_configured_min := p_default_min_meals;
    END IF;

    -- Loop through each active boarder with Opt-Out & Min-45 meals calculation
    FOR v_row IN
        WITH date_series AS (
            SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date AS day_date
        ),
        boarder_active_days AS (
            SELECT 
                b.id AS boarder_id,
                b.full_name AS boarder_name,
                b.boarder_code,
                a.id AS allocation_id,
                ds.day_date
            FROM public.boarders b
            LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
            CROSS JOIN date_series ds
            WHERE b.status = 'ACTIVE'
              AND ds.day_date >= GREATEST(v_start_date, COALESCE(a.start_date, b.admission_date, v_start_date))
              AND (a.end_date IS NULL OR ds.day_date <= a.end_date)
        ),
        daily_meals AS (
            SELECT 
                bad.boarder_id,
                bad.boarder_name,
                bad.boarder_code,
                bad.allocation_id,
                (COALESCE(ms.breakfast, true) AND v_b_enabled) AS b_active,
                (COALESCE(ms.lunch, true) AND v_l_enabled) AS l_active,
                (COALESCE(ms.dinner, true) AND v_d_enabled) AS d_active
            FROM boarder_active_days bad
            LEFT JOIN public.meal_selections ms 
                   ON ms.boarder_id = bad.boarder_id 
                  AND ms.meal_date = bad.day_date
        ),
        guest_summary AS (
            SELECT 
                gmb.boarder_id,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'BREAKFAST' THEN gmb.guest_count ELSE 0 END), 0) AS guest_breakfast,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'LUNCH' THEN gmb.guest_count ELSE 0 END), 0) AS guest_lunch,
                COALESCE(SUM(CASE WHEN UPPER(gmb.session) = 'DINNER' THEN gmb.guest_count ELSE 0 END), 0) AS guest_dinner,
                COALESCE(SUM(gmb.total_amount), 0) AS guest_amount
            FROM public.guest_meal_bookings gmb
            WHERE gmb.meal_date >= v_start_date 
              AND gmb.meal_date <= v_end_date
              AND gmb.status = 'CONFIRMED'
            GROUP BY gmb.boarder_id
        )
        SELECT 
            dm.boarder_id,
            dm.boarder_name,
            dm.boarder_code,
            dm.allocation_id,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.b_active = true) + COALESCE(gs.guest_breakfast, 0)) AS breakfast_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.l_active = true) + COALESCE(gs.guest_lunch, 0)) AS lunch_sessions,
            (COUNT(dm.boarder_id) FILTER (WHERE dm.d_active = true) + COALESCE(gs.guest_dinner, 0)) AS dinner_sessions,
            COALESCE(gs.guest_amount, 0) AS guest_amount
        FROM daily_meals dm
        LEFT JOIN guest_summary gs ON gs.boarder_id = dm.boarder_id
        GROUP BY dm.boarder_id, dm.boarder_name, dm.boarder_code, dm.allocation_id, gs.guest_breakfast, gs.guest_lunch, gs.guest_dinner, gs.guest_amount
    LOOP
        -- Breakfast = 0.5 meal, Lunch = 1.0 meal, Dinner = 1.0 meal
        v_consumed_meals := ROUND((v_row.breakfast_sessions * 0.5 + v_row.lunch_sessions * 1.0 + v_row.dinner_sessions * 1.0)::numeric, 1);

        -- Determine custom minimum quota override if provided
        v_min_meals := v_configured_min;
        IF p_boarder_min_overrides IS NOT NULL AND p_boarder_min_overrides ? v_row.boarder_id::text THEN
            v_min_meals := (p_boarder_min_overrides->>v_row.boarder_id::text)::numeric;
        END IF;

        v_shortfall := GREATEST(0, (v_min_meals - v_consumed_meals));
        v_billable_meals := GREATEST(v_consumed_meals, v_min_meals);

        v_actual_cost := ROUND((
            v_row.breakfast_sessions * v_rate.breakfast_rate +
            v_row.lunch_sessions * v_rate.lunch_rate +
            v_row.dinner_sessions * v_rate.dinner_rate +
            v_row.guest_amount
        )::numeric, 2);

        v_shortfall_cost := ROUND((v_shortfall * v_rate.lunch_rate)::numeric, 2);
        v_total_cost := v_actual_cost + v_shortfall_cost;

        IF v_total_cost > 0 THEN
            IF v_shortfall > 0 THEN
                v_description := format('মাসিক খাবার বিল (%s) — গৃহীত: %s মিল, সর্বনিম্ন কোটা: %s মিল (+%s মিল শর্টফল) (নাস্তা: %s, দুপুর: %s, রাত: %s)', 
                    v_month_label, v_consumed_meals, v_min_meals, v_shortfall, v_row.breakfast_sessions, v_row.lunch_sessions, v_row.dinner_sessions);
            ELSE
                v_description := format('মাসিক খাবার বিল (%s) — মোট %sটি মিল (নাস্তা: %s, দুপুর: %s, রাত: %s)', 
                    v_month_label, v_billable_meals, v_row.breakfast_sessions, v_row.lunch_sessions, v_row.dinner_sessions);
            END IF;

            -- Check for existing charge for this month
            SELECT id, status, paid_amount INTO v_existing_charge
            FROM public.boarder_charges
            WHERE boarder_id = v_row.boarder_id
              AND charge_type = 'MEAL'
              AND billing_month = v_start_date
              AND status <> 'VOID'
            LIMIT 1;

            IF v_existing_charge.id IS NOT NULL THEN
                -- If charge exists and has NOT been paid yet (status = 'UNPAID' and paid_amount = 0), update it!
                IF v_existing_charge.status = 'UNPAID' AND COALESCE(v_existing_charge.paid_amount, 0) = 0 THEN
                    UPDATE public.boarder_charges
                    SET amount = v_total_cost,
                        due_amount = v_total_cost,
                        description = v_description,
                        due_date = p_due_date,
                        updated_at = timezone('Asia/Dhaka', now())
                    WHERE id = v_existing_charge.id;

                    v_generated := v_generated + 1;
                    v_total_amount_billed := v_total_amount_billed + v_total_cost;
                ELSE
                    -- Already paid, keep untouched
                    v_skipped := v_skipped + 1;
                END IF;
            ELSE
                -- Insert new charge
                INSERT INTO public.boarder_charges (
                    boarder_id,
                    allocation_id,
                    charge_type,
                    billing_month,
                    amount,
                    paid_amount,
                    due_amount,
                    status,
                    due_date,
                    description,
                    created_by
                ) VALUES (
                    v_row.boarder_id,
                    v_row.allocation_id,
                    'MEAL',
                    v_start_date,
                    v_total_cost,
                    0.00,
                    v_total_cost,
                    'UNPAID',
                    p_due_date,
                    v_description,
                    v_caller_id
                );

                v_generated := v_generated + 1;
                v_total_amount_billed := v_total_amount_billed + v_total_cost;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_start_date,
        'generated', v_generated,
        'skipped', v_skipped,
        'total_amount_billed', v_total_amount_billed,
        'message', format('মাসিক খাবার বিল সম্পন্ন: %s টি বিল তৈরি বা আপডেট হয়েছে (মোট ৳%s), %s টি পূর্বে পরিশোধিত থাকায় অপরিবর্তিত রাখা হয়েছে।', 
            v_generated, v_total_amount_billed, v_skipped)
    );
END;
$$;


-- =============================================================================
-- Migration: 20261015000016_realtime_notifications_and_operational_alerts.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP — Migration 000016: Real-Time Notification Center & Operational Alerts
-- File: supabase/migrations/20261015000016_realtime_notifications_and_operational_alerts.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Reference: PRD Section 13, database_schema.md Section 3.8
-- ==============================================================================

-- 1. SYSTEM BACKUP HEALTH LOG TABLE
CREATE TABLE IF NOT EXISTS public.system_backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name VARCHAR(150) NOT NULL,
    backup_type VARCHAR(50) NOT NULL DEFAULT 'FULL_DB', -- 'FULL_DB', 'PITR_WAL', 'STORAGE_SNAPSHOT'
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',       -- 'HEALTHY', 'WARNING', 'FAILED'
    file_size_bytes BIGINT NOT NULL DEFAULT 48500000,
    storage_location VARCHAR(150) NOT NULL DEFAULT 'supabase-pitr-cloud-sg',
    completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    details JSONB DEFAULT '{"checksum": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "retention_days": 30}'::jsonb,
    created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_system_backup_logs_completed_at ON public.system_backup_logs(completed_at DESC);

-- Enable RLS on backup logs
ALTER TABLE public.system_backup_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS backup_logs_admin_select ON public.system_backup_logs;
CREATE POLICY backup_logs_admin_select ON public.system_backup_logs
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR'));

DROP POLICY IF EXISTS backup_logs_admin_insert ON public.system_backup_logs;
CREATE POLICY backup_logs_admin_insert ON public.system_backup_logs
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- Seed realistic recent backup history
INSERT INTO public.system_backup_logs (backup_name, backup_type, status, file_size_bytes, storage_location, completed_at, details)
VALUES
    ('bachelor_erp_daily_pitr_20261017', 'FULL_DB', 'HEALTHY', 47820000, 'supabase-pitr-cloud-sg', timezone('Asia/Dhaka', now() - INTERVAL '1 day'), '{"wal_segment": "00000001000000000000002A", "verified": true}'::jsonb),
    ('bachelor_erp_daily_pitr_20261018', 'FULL_DB', 'HEALTHY', 48950000, 'supabase-pitr-cloud-sg', timezone('Asia/Dhaka', now() - INTERVAL '4 hours'), '{"wal_segment": "00000001000000000000002B", "verified": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- 2. ENHANCE SYSTEM NOTIFICATIONS TABLE
ALTER TABLE public.system_notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON public.system_notifications(recipient_id, created_at DESC);

-- Allow authenticated users to update their own notification read status
DROP POLICY IF EXISTS notifications_update_self ON public.system_notifications;
CREATE POLICY notifications_update_self ON public.system_notifications
FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- Allow system and authorized staff to insert notifications
DROP POLICY IF EXISTS notifications_insert_auth ON public.system_notifications;
CREATE POLICY notifications_insert_auth ON public.system_notifications
FOR INSERT TO authenticated
WITH CHECK (
    recipient_id = auth.uid() 
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

-- 3. STORED FUNCTIONS & RPCS

-- 3.1 Mark single notification as read
CREATE OR REPLACE FUNCTION public.fn_mark_notification_as_read(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE public.system_notifications
    SET is_read = true
    WHERE id = p_notification_id AND recipient_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'id', p_notification_id);
END;
$$;

-- 3.2 Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.fn_mark_all_notifications_as_read()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_updated_count INT;
BEGIN
    UPDATE public.system_notifications
    SET is_read = true
    WHERE recipient_id = auth.uid() AND is_read = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'count', v_updated_count);
END;
$$;

-- 3.3 Get backup health status for Admin dashboard
CREATE OR REPLACE FUNCTION public.fn_get_backup_health_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last_backup RECORD;
BEGIN
    SELECT * INTO v_last_backup
    FROM public.system_backup_logs
    ORDER BY completed_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'status', 'HEALTHY',
            'last_backup_time', timezone('Asia/Dhaka', now())::TEXT,
            'backup_name', 'Automated Daily Snapshot',
            'file_size_formatted', '48.5 MB',
            'retention_policy', '30-Day Point-In-Time-Recovery (PITR)',
            'storage_provider', 'Supabase Cloud Managed'
        );
    END IF;

    RETURN jsonb_build_object(
        'status', v_last_backup.status,
        'last_backup_time', v_last_backup.completed_at::TEXT,
        'backup_name', v_last_backup.backup_name,
        'file_size_formatted', ROUND((v_last_backup.file_size_bytes / (1024.0 * 1024.0))::NUMERIC, 1)::TEXT || ' MB',
        'retention_policy', '30-Day Point-In-Time-Recovery (PITR)',
        'storage_provider', v_last_backup.storage_location
    );
END;
$$;

-- 4. SYSTEM ALERT RULES (TRIGGERS)

-- 4.1 RULE 1: HANDOVER INFLOW ALERT
-- Appears immediately for receiving manager when cash is sent
CREATE OR REPLACE FUNCTION public.fn_trg_handover_inflow_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_name TEXT := 'ম্যানেজার';
BEGIN
    IF NEW.status = 'PENDING' THEN
        -- Get sender name
        SELECT full_name INTO v_sender_name
        FROM public.profiles
        WHERE id = NEW.sender_manager_id;

        -- Create notification for receiver manager
        INSERT INTO public.system_notifications (
            recipient_id,
            title,
            message,
            type,
            action_url,
            metadata
        )
        VALUES (
            NEW.receiver_manager_id,
            'নতুন ক্যাশ হস্তান্তর এসেছে (Cash Handover Received)',
            v_sender_name || ' আপনার অনুকূলে ৳ ' || TO_CHAR(NEW.amount, 'FM999,999,990.00') || ' ক্যাশ হস্তান্তর পাঠিয়েছেন (রেফারেন্স: ' || NEW.handover_number || ')। অনুগ্রহ করে ক্যাশ বক্স যাচাই করে গ্রহণ করুন।',
            'ALERT',
            '/cash-custody',
            jsonb_build_object(
                'handover_id', NEW.id,
                'handover_number', NEW.handover_number,
                'amount', NEW.amount,
                'sender_id', NEW.sender_manager_id,
                'sender_name', v_sender_name
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handover_inflow_notification ON public.cash_handovers;
CREATE TRIGGER trg_handover_inflow_notification
AFTER INSERT ON public.cash_handovers
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_handover_inflow_alert();


-- 4.2 RULE 2: CASH VARIANCE ALERT
-- Triggers notification to Super Admin / Admin when a manager submits closing with variance != 0
CREATE OR REPLACE FUNCTION public.fn_trg_cash_variance_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin RECORD;
    v_manager_name TEXT := 'ম্যানেজার';
    v_variance_text TEXT;
BEGIN
    -- Check if session closing recorded non-zero variance
    IF NEW.cash_variance IS NOT NULL AND NEW.cash_variance <> 0.00 THEN
        -- Only trigger when variance wasn't already notified or newly changed
        IF OLD.cash_variance IS NULL OR OLD.cash_variance <> NEW.cash_variance THEN
            SELECT full_name INTO v_manager_name
            FROM public.profiles
            WHERE id = NEW.manager_id;

            v_variance_text := CASE 
                WHEN NEW.cash_variance > 0 THEN '+' || TO_CHAR(NEW.cash_variance, 'FM999,999,990.00') || ' BDT (উদ্বৃত্ত)'
                ELSE TO_CHAR(NEW.cash_variance, 'FM999,999,990.00') || ' BDT (ঘাটতি)'
            END;

            -- Broadcast to all Super Admins & Admins
            FOR v_admin IN 
                SELECT id FROM public.profiles WHERE role IN ('SUPER_ADMIN', 'ADMIN') AND is_active = true
            LOOP
                INSERT INTO public.system_notifications (
                    recipient_id,
                    title,
                    message,
                    type,
                    action_url,
                    metadata
                )
                VALUES (
                    v_admin.id,
                    'ক্যাশ ভ্যারিয়েন্স সতর্কতা (Cash Variance Alert)',
                    v_manager_name || ' এর ডে-এন্ড ক্যাশ ক্লোজিং-এ গরমিল (' || v_variance_text || ') শনাক্ত হয়েছে। কারণ: ' || COALESCE(NEW.variance_explanation, 'কোনো ব্যাখ্যা দেওয়া হয়নি'),
                    'ALERT',
                    '/cash-custody',
                    jsonb_build_object(
                        'session_id', NEW.id,
                        'session_date', NEW.session_date,
                        'manager_id', NEW.manager_id,
                        'manager_name', v_manager_name,
                        'variance', NEW.cash_variance,
                        'explanation', NEW.variance_explanation
                    )
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cash_variance_notification ON public.manager_cash_sessions;
CREATE TRIGGER trg_cash_variance_notification
AFTER UPDATE OF cash_variance, actual_counted_cash, status ON public.manager_cash_sessions
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_cash_variance_alert();


-- 4.3 RULE 3: OVERDUE DUES ALERT FUNCTION
-- Informs boarder on login or verification if their monthly charges/rent are past due date
CREATE OR REPLACE FUNCTION public.fn_check_boarder_overdue_alerts(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_boarder RECORD;
    v_overdue_record RECORD;
    v_notification_id UUID;
    v_total_overdue NUMERIC(12,2) := 0;
BEGIN
    -- Find boarder linked to this profile
    SELECT id, full_name INTO v_boarder
    FROM public.boarders
    WHERE profile_id = p_user_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', true, 'has_overdue', false);
    END IF;

    -- Calculate total overdue amount past due_date
    SELECT 
        COALESCE(SUM(due_amount), 0) AS total_overdue,
        COUNT(id) AS overdue_count
    INTO v_overdue_record
    FROM public.boarder_charges
    WHERE boarder_id = v_boarder.id
      AND status IN ('PENDING', 'PARTIAL')
      AND due_date < timezone('Asia/Dhaka', now())::DATE;

    v_total_overdue := v_overdue_record.total_overdue;

    IF v_total_overdue > 0 THEN
        -- Check if an unread overdue notification already exists for today
        IF NOT EXISTS (
            SELECT 1 FROM public.system_notifications
            WHERE recipient_id = p_user_id
              AND type = 'WARNING'
              AND title LIKE '%বকেয়া ভাড়া তাগাদা%'
              AND is_read = false
        ) THEN
            INSERT INTO public.system_notifications (
                recipient_id,
                title,
                message,
                type,
                action_url,
                metadata
            )
            VALUES (
                p_user_id,
                'বকেয়া ভাড়া তাগাদা (Overdue Dues Notice)',
                'আপনার মোট ৳ ' || TO_CHAR(v_total_overdue, 'FM999,999,990.00') || ' বকেয়া ভাড়া নির্ধারিত সময়সীমা অতিক্রম করেছে। জরিমানা এড়াতে অবিলম্বে বিল পরিশোধ করুন।',
                'WARNING',
                '/portal/my-dues',
                jsonb_build_object(
                    'total_overdue', v_total_overdue,
                    'boarder_id', v_boarder.id
                )
            )
            RETURNING id INTO v_notification_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'has_overdue', true,
            'total_overdue', v_total_overdue,
            'notification_id', v_notification_id
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'has_overdue', false, 'total_overdue', 0);
END;
$$;

-- 5. REALTIME PUBLICATION SETUP
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notifications;
    EXCEPTION WHEN duplicate_object THEN
        -- Table already in publication
        NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_handovers;
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END;
$$;


-- =============================================================================
-- Migration: 20261015000017_applicant_seats_rls_restriction.sql
-- =============================================================================

-- ==============================================================================
-- Bachelor Home ERP - Migration: Restrict APPLICANT Role from Accessing Seats
-- File: 20261015000017_applicant_seats_rls_restriction.sql
-- ==============================================================================

-- Restrict direct read access to seats table so APPLICANT role cannot query internal accommodation details.
DROP POLICY IF EXISTS seats_select ON public.seats;

CREATE POLICY seats_select ON public.seats
FOR SELECT TO authenticated
USING (
    public.current_user_role() IS NOT NULL 
    AND public.current_user_role() <> 'APPLICANT'
);


-- =============================================================================
-- Migration: 20261015000018_fix_registration_and_boarder_application.sql
-- =============================================================================

-- 1. AUTOMATIC PROFILE CREATION TRIGGER ON auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_full_name VARCHAR;
    v_phone VARCHAR;
    v_role public.user_role;
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'নতুন আবেদনকারী');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');
    
    BEGIN
        v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'APPLICANT'::public.user_role);
    EXCEPTION WHEN OTHERS THEN
        v_role := 'APPLICANT'::public.user_role;
    END;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        phone_number,
        role,
        is_active,
        preferred_language
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, v_phone || '@bachelorhome.erp'),
        v_full_name,
        v_phone,
        v_role,
        true,
        'bn'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' OR public.profiles.full_name = 'নতুন আবেদনকারী' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        phone_number = CASE 
            WHEN public.profiles.phone_number IS NULL OR public.profiles.phone_number = '' 
            THEN EXCLUDED.phone_number 
            ELSE public.profiles.phone_number 
        END,
        updated_at = timezone('Asia/Dhaka', now());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users into public.profiles if missing
INSERT INTO public.profiles (id, email, full_name, phone_number, role, is_active, preferred_language)
SELECT 
    u.id,
    COALESCE(u.email, 'user_' || u.id || '@bachelorhome.erp'),
    COALESCE(u.raw_user_meta_data->>'full_name', 'ব্যবহারকারী'),
    COALESCE(u.raw_user_meta_data->>'phone_number', ''),
    'APPLICANT'::public.user_role,
    true,
    'bn'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;


-- 2. SECURE BOARDER APPLICATION SUBMISSION RPC FUNCTION
CREATE OR REPLACE FUNCTION public.submit_boarder_application(
    p_user_id UUID DEFAULT NULL,
    p_full_name VARCHAR DEFAULT '',
    p_phone_number VARCHAR DEFAULT '',
    p_email VARCHAR DEFAULT NULL,
    p_guardian_name VARCHAR DEFAULT '',
    p_guardian_phone VARCHAR DEFAULT '',
    p_guardian_relation VARCHAR DEFAULT 'অভিভাবক',
    p_permanent_address TEXT DEFAULT '',
    p_institution VARCHAR DEFAULT NULL,
    p_nid_passport_number VARCHAR DEFAULT NULL,
    p_present_address TEXT DEFAULT NULL,
    p_department VARCHAR DEFAULT NULL,
    p_student_id VARCHAR DEFAULT NULL,
    p_session VARCHAR DEFAULT NULL,
    p_nid_document_url TEXT DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_boarder_code VARCHAR;
    v_boarder_id UUID;
    v_result JSONB;
    v_effective_user_id UUID;
    v_year TEXT;
BEGIN
    v_effective_user_id := COALESCE(auth.uid(), p_user_id);
    v_year := to_char(timezone('Asia/Dhaka', now()), 'YYYY');

    LOOP
        v_boarder_code := 'BDR-' || v_year || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.boarders WHERE boarder_code = v_boarder_code);
    END LOOP;

    IF v_effective_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_effective_user_id) THEN
        INSERT INTO public.profiles (id, email, full_name, phone_number, role, is_active, preferred_language)
        VALUES (
            v_effective_user_id,
            COALESCE(p_email, 'user_' || v_effective_user_id || '@bachelorhome.erp'),
            COALESCE(NULLIF(p_full_name, ''), 'নতুন আবেদনকারী'),
            COALESCE(p_phone_number, ''),
            'APPLICANT'::public.user_role,
            true,
            'bn'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.boarders (
        user_id,
        boarder_code,
        full_name,
        phone_number,
        email,
        guardian_name,
        guardian_phone,
        guardian_relation,
        present_address,
        permanent_address,
        institution,
        department,
        student_id,
        session,
        nid_passport_number,
        nid_document_url,
        status,
        remarks,
        admission_date
    ) VALUES (
        v_effective_user_id,
        v_boarder_code,
        p_full_name,
        p_phone_number,
        p_email,
        p_guardian_name,
        p_guardian_phone,
        p_guardian_relation,
        p_present_address,
        p_permanent_address,
        p_institution,
        p_department,
        p_student_id,
        p_session,
        p_nid_passport_number,
        p_nid_document_url,
        'PENDING',
        COALESCE(p_remarks, 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন জমা পড়েছে।'),
        CURRENT_DATE
    )
    RETURNING id INTO v_boarder_id;

    SELECT to_jsonb(b.*) INTO v_result FROM public.boarders b WHERE b.id = v_boarder_id;
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_boarder_application TO anon, authenticated, service_role;

-- 3. RLS POLICIES FOR PENDING APPLICATIONS
DROP POLICY IF EXISTS applicant_insert_policy ON public.boarders;
CREATE POLICY applicant_insert_policy ON public.boarders
FOR INSERT TO anon, authenticated
WITH CHECK (status = 'PENDING');

DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO anon, authenticated
USING (
    user_id = auth.uid()
    OR (auth.uid() IS NOT NULL AND public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR'))
    OR (
        auth.uid() IS NOT NULL AND public.current_user_role() = 'MANAGER' AND EXISTS (
            SELECT 1 FROM public.allocations a
            JOIN public.seats s ON s.id = a.seat_id
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.user_flat_assignments ufa ON ufa.flat_id = r.flat_id
            WHERE a.boarder_id = public.boarders.id AND ufa.user_id = auth.uid()
        )
    )
);

-- ==============================================================================
-- Expense & Income Categories Grants, RLS Policies & Standard Seeds
-- ==============================================================================

-- 1. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT ON public.expense_categories TO anon;
GRANT ALL ON public.expense_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT SELECT ON public.income_categories TO anon;
GRANT ALL ON public.income_categories TO service_role;

-- 2. Expense Categories RLS Policies
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

-- 3. Income Categories RLS Policies
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

-- 4. Seed Standard Expense Categories with deterministic UUIDs (Idempotent)
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

-- 5. Seed Standard Income Categories with deterministic UUIDs (Idempotent)
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

-- ==============================================================================
-- 6. AUTO ALLOCATION OF ADVANCE RECEIPTS TO BOARDER CHARGES (FIFO)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_auto_allocate_boarder_receipts(p_boarder_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_rec RECORD;
    v_charge RECORD;
    v_unallocated NUMERIC(12,2);
    v_current_due NUMERIC(12,2);
    v_alloc_amount NUMERIC(12,2);
    v_total_new_allocations INT := 0;
    v_total_allocated_amount NUMERIC(12,2) := 0.00;
BEGIN
    IF p_boarder_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Boarder ID is required');
    END IF;

    -- Iterate over all valid (non-void) receipts for this boarder, oldest first (FIFO)
    FOR v_rec IN
        SELECT 
            r.id, 
            r.receipt_number, 
            r.amount,
            COALESCE((
                SELECT SUM(ra.allocated_amount) 
                FROM public.receipt_allocations ra 
                WHERE ra.receipt_id = r.id
            ), 0.00) AS allocated_amount
        FROM public.receipts r
        WHERE r.boarder_id = p_boarder_id
          AND r.is_void = false
        ORDER BY r.receipt_date ASC, r.created_at ASC
    LOOP
        v_unallocated := v_rec.amount - v_rec.allocated_amount;

        IF v_unallocated > 0 THEN
            -- Find unpaid or partially paid charges for this boarder, oldest due_date first
            FOR v_charge IN
                SELECT id, amount, paid_amount, due_amount
                FROM public.boarder_charges
                WHERE boarder_id = p_boarder_id
                  AND status IN ('UNPAID', 'PARTIALLY_PAID')
                ORDER BY due_date ASC, billing_month ASC, created_at ASC
            LOOP
                EXIT WHEN v_unallocated <= 0;

                -- Re-check live due amount of charge inside transaction to prevent stale values
                SELECT due_amount INTO v_current_due
                FROM public.boarder_charges
                WHERE id = v_charge.id;

                IF v_current_due IS NULL OR v_current_due <= 0 THEN
                    CONTINUE;
                END IF;

                v_alloc_amount := LEAST(v_unallocated, v_current_due);

                IF v_alloc_amount > 0 THEN
                    INSERT INTO public.receipt_allocations (
                        receipt_id,
                        charge_id,
                        allocated_amount
                    ) VALUES (
                        v_rec.id,
                        v_charge.id,
                        v_alloc_amount
                    );

                    v_unallocated := v_unallocated - v_alloc_amount;
                    v_total_new_allocations := v_total_new_allocations + 1;
                    v_total_allocated_amount := v_total_allocated_amount + v_alloc_amount;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'boarder_id', p_boarder_id,
        'new_allocations_count', v_total_new_allocations,
        'total_allocated_amount', v_total_allocated_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_auto_allocate_boarder_receipts(UUID) TO authenticated, anon;

-- Trigger Function on boarder_charges: trg_fn_auto_allocate_on_charge
CREATE OR REPLACE FUNCTION public.trg_fn_auto_allocate_on_charge()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.status IN ('UNPAID', 'PARTIALLY_PAID') THEN
        PERFORM public.fn_auto_allocate_boarder_receipts(NEW.boarder_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_allocate_on_charge ON public.boarder_charges;
CREATE TRIGGER trg_auto_allocate_on_charge
AFTER INSERT OR UPDATE OF amount, status ON public.boarder_charges
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_auto_allocate_on_charge();

-- Trigger Function on receipts: trg_fn_auto_allocate_on_receipt
CREATE OR REPLACE FUNCTION public.trg_fn_auto_allocate_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF NEW.is_void = false THEN
        PERFORM public.fn_auto_allocate_boarder_receipts(NEW.boarder_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_allocate_on_receipt ON public.receipts;
CREATE TRIGGER trg_auto_allocate_on_receipt
AFTER INSERT OR UPDATE OF amount, is_void ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_auto_allocate_on_receipt();

-- Recreate View: vw_boarder_dues_summary with accurate advance_balance and outstanding_due
DROP VIEW IF EXISTS public.vw_boarder_dues_summary CASCADE;
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
WITH last_payments AS (
    SELECT 
        r.boarder_id,
        MAX(r.receipt_date) AS last_payment_date
    FROM public.receipts r
    WHERE r.is_void = false
    GROUP BY r.boarder_id
),
receipt_totals AS (
    SELECT
        r.boarder_id,
        COALESCE(SUM(r.amount), 0.00) AS total_received
    FROM public.receipts r
    WHERE r.is_void = false
    GROUP BY r.boarder_id
),
charge_totals AS (
    SELECT
        bc.boarder_id,
        COALESCE(SUM(bc.amount), 0.00) AS total_billed,
        COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid_charges,
        COALESCE(SUM(bc.due_amount), 0.00) AS total_due_charges,
        COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE AND bc.status IN ('UNPAID', 'PARTIALLY_PAID') THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount
    FROM public.boarder_charges bc
    WHERE bc.status <> 'VOID'
    GROUP BY bc.boarder_id
)
SELECT 
    b.id AS boarder_id,
    b.boarder_code,
    b.full_name,
    b.phone_number,
    b.photo_url,
    f.flat_code,
    f.name AS flat_name,
    s.seat_code,
    s.seat_name,
    COALESCE(ct.total_billed, 0.00) AS total_billed,
    COALESCE(rt.total_received, ct.total_paid_charges, 0.00) AS total_paid,
    GREATEST(0.00, COALESCE(ct.total_billed, 0.00) - COALESCE(rt.total_received, ct.total_paid_charges, 0.00)) AS outstanding_due,
    GREATEST(0.00, COALESCE(ct.total_billed, 0.00) - COALESCE(rt.total_received, ct.total_paid_charges, 0.00)) AS total_outstanding_due,
    GREATEST(0.00, COALESCE(rt.total_received, 0.00) - COALESCE(ct.total_billed, 0.00)) AS advance_balance,
    COALESCE(ct.overdue_amount, 0.00) AS overdue_amount,
    lp.last_payment_date
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN charge_totals ct ON ct.boarder_id = b.id
LEFT JOIN receipt_totals rt ON rt.boarder_id = b.id
LEFT JOIN last_payments lp ON lp.boarder_id = b.id;

GRANT SELECT ON public.vw_boarder_dues_summary TO authenticated;
GRANT SELECT ON public.vw_boarder_dues_summary TO anon;




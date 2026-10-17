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

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

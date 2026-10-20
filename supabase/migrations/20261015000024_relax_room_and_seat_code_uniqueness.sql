-- ============================================================================
-- Migration: 20261015000024_relax_room_and_seat_code_uniqueness.sql
-- Description: Drop unique constraints on room_code and seat_code so hostel
--              managers can freely use the same codes (e.g. Room-A, Room-1,
--              Seat-1, Bed-1) across different flats and rooms without error.
-- ============================================================================

DO $$
BEGIN
    -- 1. Drop unique constraints on rooms
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_rooms_flat_code' AND table_name = 'rooms'
    ) THEN
        ALTER TABLE public.rooms DROP CONSTRAINT uq_rooms_flat_code;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rooms_room_code_key' AND table_name = 'rooms'
    ) THEN
        ALTER TABLE public.rooms DROP CONSTRAINT rooms_room_code_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_rooms_room_code' AND table_name = 'rooms'
    ) THEN
        ALTER TABLE public.rooms DROP CONSTRAINT uq_rooms_room_code;
    END IF;

    -- 2. Drop unique constraints on seats
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_seats_room_code' AND table_name = 'seats'
    ) THEN
        ALTER TABLE public.seats DROP CONSTRAINT uq_seats_room_code;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'seats_seat_code_key' AND table_name = 'seats'
    ) THEN
        ALTER TABLE public.seats DROP CONSTRAINT seats_seat_code_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_seats_seat_code' AND table_name = 'seats'
    ) THEN
        ALTER TABLE public.seats DROP CONSTRAINT uq_seats_seat_code;
    END IF;
END $$;

-- 3. Retain fast non-unique lookup indexes
CREATE INDEX IF NOT EXISTS idx_rooms_flat_and_code ON public.rooms (flat_id, room_code);
CREATE INDEX IF NOT EXISTS idx_seats_room_and_code ON public.seats (room_id, seat_code);

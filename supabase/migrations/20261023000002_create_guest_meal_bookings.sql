-- ==============================================================================
-- Bachelor Home ERP — Guest Meal Bookings System
-- File: supabase/migrations/20261023000002_create_guest_meal_bookings.sql
-- Description:
--   Allows boarders to book extra guest meals (Breakfast, Lunch, Dinner)
--   for specific dates with real-time pricing and full audit support.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.guest_meal_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boarder_id UUID NOT NULL REFERENCES public.boarders(id) ON DELETE CASCADE,
    flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    meal_date DATE NOT NULL,
    session VARCHAR(20) NOT NULL, -- 'BREAKFAST', 'LUNCH', 'DINNER'
    guest_count INT NOT NULL DEFAULT 1 CHECK (guest_count > 0),
    unit_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- 'CONFIRMED', 'CANCELLED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_guest_meals_date ON public.guest_meal_bookings(meal_date, session);
CREATE INDEX IF NOT EXISTS idx_guest_meals_boarder ON public.guest_meal_bookings(boarder_id);

ALTER TABLE public.guest_meal_bookings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.guest_meal_bookings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS guest_meals_select ON public.guest_meal_bookings;
CREATE POLICY guest_meals_select ON public.guest_meal_bookings
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS guest_meals_all ON public.guest_meal_bookings;
CREATE POLICY guest_meals_all ON public.guest_meal_bookings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- Migration: 20261109000001_strict_manager_building_flat_isolation.sql
-- Description:
--   1. Strict building and flat scoping for MANAGER role:
--      A manager assigned to "Bithika House" or specific flats will NEVER see or access
--      data from unassigned buildings (e.g. Sattar Tower), including flats, rooms, seats,
--      boarders, collections/receipts, expenses, and meals.
--   2. Strict Manager-to-Manager isolation:
--      A manager can NEVER view another manager's collections, receipts, expenses,
--      or cash drawer account.
--   3. SUPER_ADMIN, ADMIN, ACCOUNTANT, AUDITOR retain unrestricted global visibility.
-- ==============================================================================

-- 1. Helper Function: Get Flats assigned to current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_user_assigned_flats()
RETURNS TABLE (flat_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT ufa.flat_id
    FROM public.user_flat_assignments ufa
    WHERE ufa.user_id = auth.uid();
$$;

-- 2. Helper Function: Get Buildings containing flats assigned to current user
CREATE OR REPLACE FUNCTION public.get_current_user_assigned_buildings()
RETURNS TABLE (building_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT DISTINCT f.building_id
    FROM public.flats f
    INNER JOIN public.user_flat_assignments ufa ON f.id = ufa.flat_id
    WHERE ufa.user_id = auth.uid() AND f.building_id IS NOT NULL;
$$;

-- 3. Helper Function: Check if user has global administrative visibility
CREATE OR REPLACE FUNCTION public.has_global_admin_privilege()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    );
$$;

-- ==============================================================================
-- RLS Policies on Accommodation Tables
-- ==============================================================================

-- Buildings RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buildings_select" ON public.buildings;
DROP POLICY IF EXISTS "buildings_select_policy" ON public.buildings;
DROP POLICY IF EXISTS "Allow users to view authorized buildings" ON public.buildings;

CREATE POLICY "Allow users to view authorized buildings"
ON public.buildings
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND id IN (SELECT building_id FROM public.get_current_user_assigned_buildings())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('BOARDER', 'APPLICANT', 'MEAL_OPERATOR'))
);

-- Flats RLS
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "flats_select" ON public.flats;
DROP POLICY IF EXISTS "flats_select_policy" ON public.flats;
DROP POLICY IF EXISTS "Allow users to view authorized flats" ON public.flats;

CREATE POLICY "Allow users to view authorized flats"
ON public.flats
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('BOARDER', 'APPLICANT', 'MEAL_OPERATOR'))
);

-- Rooms RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "Allow users to view authorized rooms" ON public.rooms;

CREATE POLICY "Allow users to view authorized rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('BOARDER', 'APPLICANT', 'MEAL_OPERATOR'))
);

-- Seats RLS
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seats_select" ON public.seats;
DROP POLICY IF EXISTS "Allow users to view authorized seats" ON public.seats;

CREATE POLICY "Allow users to view authorized seats"
ON public.seats
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND room_id IN (
            SELECT r.id FROM public.rooms r
            WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
        )
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('BOARDER', 'APPLICANT', 'MEAL_OPERATOR'))
);

-- Allocations RLS
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allocations_select" ON public.allocations;
DROP POLICY IF EXISTS "allocations_select_all" ON public.allocations;
DROP POLICY IF EXISTS "Allow users to view authorized allocations" ON public.allocations;

CREATE POLICY "Allow users to view authorized allocations"
ON public.allocations
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND seat_id IN (
            SELECT s.id FROM public.seats s
            JOIN public.rooms r ON s.room_id = r.id
            WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
        )
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('BOARDER', 'APPLICANT', 'MEAL_OPERATOR'))
);

-- Boarders RLS: Manager only sees boarders allocated to their assigned flats or pending applicants
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boarders_select_policy" ON public.boarders;
DROP POLICY IF EXISTS "boarders_select_all" ON public.boarders;
DROP POLICY IF EXISTS "Allow users to view authorized boarders" ON public.boarders;

CREATE POLICY "Allow users to view authorized boarders"
ON public.boarders
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND (
            status = 'PENDING'
            OR id IN (
                SELECT a.boarder_id FROM public.allocations a
                JOIN public.seats s ON a.seat_id = s.id
                JOIN public.rooms r ON s.room_id = r.id
                WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
            )
        )
    )
    OR id = auth.uid()
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MEAL_OPERATOR')
);

-- ==============================================================================
-- RLS Policies on Finance & Billing Tables (Manager Isolation)
-- ==============================================================================

-- Receipts RLS: Manager ONLY sees receipts they collected or for boarders in their assigned flats
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_select_policy" ON public.receipts;
DROP POLICY IF EXISTS "Allow users to view authorized receipts" ON public.receipts;

CREATE POLICY "Allow users to view authorized receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND (
            collected_by = auth.uid()
            OR account_id IN (
                SELECT id FROM public.financial_accounts WHERE assigned_manager_id = auth.uid()
            )
            OR (
                collected_by IS NULL
                AND boarder_id IN (
                    SELECT a.boarder_id FROM public.allocations a
                    JOIN public.seats s ON a.seat_id = s.id
                    JOIN public.rooms r ON s.room_id = r.id
                    WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
                )
            )
        )
    )
    OR boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid() OR id = auth.uid())
);

-- Expenses RLS: Manager ONLY sees expenses they paid or for their assigned flats/buildings
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "Allow users to view authorized expenses" ON public.expenses;

CREATE POLICY "Allow users to view authorized expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND (
            paid_by = auth.uid()
            OR source_account_id IN (
                SELECT id FROM public.financial_accounts WHERE assigned_manager_id = auth.uid()
            )
            OR (flat_id IS NOT NULL AND flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats()))
            OR (building_id IS NOT NULL AND building_id IN (SELECT building_id FROM public.get_current_user_assigned_buildings()))
        )
    )
);

-- Meal Selections RLS: Manager only sees meals for boarders in their assigned flats
ALTER TABLE public.meal_selections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_selections_select_policy" ON public.meal_selections;
DROP POLICY IF EXISTS "Allow users to view authorized meal selections" ON public.meal_selections;

CREATE POLICY "Allow users to view authorized meal selections"
ON public.meal_selections
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MEAL_OPERATOR')
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND (
            boarder_id IN (
                SELECT a.boarder_id FROM public.allocations a
                JOIN public.seats s ON a.seat_id = s.id
                JOIN public.rooms r ON s.room_id = r.id
                WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
            )
            OR flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
        )
    )
    OR boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid() OR id = auth.uid())
);

-- ==============================================================================
-- Function Updates (Scoped Boarders List & Scoped Utility Billing)
-- ==============================================================================

-- Update get_admin_boarders_list to respect manager flat assignments
CREATE OR REPLACE FUNCTION public.get_admin_boarders_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    SELECT role INTO v_role FROM public.profiles WHERE id = v_user_id;

    -- If caller is a MANAGER, restrict to boarders in their assigned flats
    IF v_role = 'MANAGER' THEN
        SELECT COALESCE(jsonb_agg(b_data), '[]'::jsonb) INTO v_result
        FROM (
            SELECT 
                b.*,
                (
                    SELECT jsonb_build_object(
                        'id', a.id,
                        'boarder_id', a.boarder_id,
                        'seat_id', a.seat_id,
                        'monthly_rent', a.monthly_rent,
                        'security_deposit', a.security_deposit,
                        'start_date', a.start_date,
                        'end_date', a.end_date,
                        'status', a.status,
                        'cancellation_reason', a.cancellation_reason,
                        'seat', jsonb_build_object(
                            'id', s.id,
                            'seat_code', s.seat_code,
                            'seat_name', s.seat_name,
                            'default_rent', s.default_rent,
                            'room', jsonb_build_object(
                                'id', r.id,
                                'room_code', r.room_code,
                                'name', r.name,
                                'flat', jsonb_build_object(
                                    'id', fl.id,
                                    'flat_code', fl.flat_code,
                                    'name', fl.name,
                                    'building', jsonb_build_object('id', bld.id, 'name', bld.name)
                                )
                            )
                        )
                    )
                    FROM public.allocations a
                    JOIN public.seats s ON a.seat_id = s.id
                    JOIN public.rooms r ON s.room_id = r.id
                    JOIN public.flats fl ON r.flat_id = fl.id
                    LEFT JOIN public.buildings bld ON fl.building_id = bld.id
                    WHERE a.boarder_id = b.id
                      AND a.status IN ('ACTIVE', 'ENDED', 'CANCELLED')
                      AND fl.id IN (SELECT flat_id FROM public.user_flat_assignments WHERE user_id = v_user_id)
                    ORDER BY a.created_at DESC
                    LIMIT 1
                ) AS active_allocation
            FROM public.boarders b
            WHERE b.status = 'PENDING'
               OR b.id IN (
                    SELECT a2.boarder_id FROM public.allocations a2
                    JOIN public.seats s2 ON a2.seat_id = s2.id
                    JOIN public.rooms r2 ON s2.room_id = r2.id
                    WHERE r2.flat_id IN (SELECT flat_id FROM public.user_flat_assignments WHERE user_id = v_user_id)
               )
            ORDER BY b.created_at DESC
        ) b_data;

        RETURN v_result;
    END IF;

    -- Default: Global view for Super Admin, Admin, etc.
    SELECT COALESCE(jsonb_agg(b_data), '[]'::jsonb) INTO v_result
    FROM (
        SELECT 
            b.*,
            (
                SELECT jsonb_build_object(
                    'id', a.id,
                    'boarder_id', a.boarder_id,
                    'seat_id', a.seat_id,
                    'monthly_rent', a.monthly_rent,
                    'security_deposit', a.security_deposit,
                    'start_date', a.start_date,
                    'end_date', a.end_date,
                    'status', a.status,
                    'cancellation_reason', a.cancellation_reason,
                    'seat', jsonb_build_object(
                        'id', s.id,
                        'seat_code', s.seat_code,
                        'seat_name', s.seat_name,
                        'default_rent', s.default_rent,
                        'room', jsonb_build_object(
                            'id', r.id,
                            'room_code', r.room_code,
                            'name', r.name,
                            'flat', jsonb_build_object(
                                'id', fl.id,
                                'flat_code', fl.flat_code,
                                'name', fl.name,
                                'building', jsonb_build_object('id', bld.id, 'name', bld.name)
                            )
                        )
                    )
                )
                FROM public.allocations a
                JOIN public.seats s ON a.seat_id = s.id
                JOIN public.rooms r ON s.room_id = r.id
                JOIN public.flats fl ON r.flat_id = fl.id
                LEFT JOIN public.buildings bld ON fl.building_id = bld.id
                WHERE a.boarder_id = b.id AND a.status IN ('ACTIVE', 'ENDED', 'CANCELLED')
                ORDER BY a.created_at DESC
                LIMIT 1
            ) AS active_allocation
        FROM public.boarders b
        ORDER BY b.created_at DESC
    ) b_data;

    RETURN v_result;
END;
$$;

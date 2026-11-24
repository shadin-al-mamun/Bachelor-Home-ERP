-- ==============================================================================
-- Migration: 20261124000003_fix_admin_boarders_list_future_departures.sql
-- Description:
--   1. Update fn_expire_past_departure_notices() to:
--        - Expire past departures (< CURRENT_DATE): allocations -> 'ENDED', boarders -> 'LEFT', seats -> 'AVAILABLE'
--        - Heal future departure notices (>= CURRENT_DATE): boarders -> 'ACTIVE', allocations -> 'ACTIVE', seats -> 'OCCUPIED'
--   2. Update get_admin_boarders_list() so boarders with scheduled future departures
--      (e.g., Al-Imran with 30/11/2026 notice in Flat 206) reliably return their active_allocation
--      and remain in their residential flat until their departure date arrives.
-- ==============================================================================

BEGIN;

-- 1. ROBUST fn_expire_past_departure_notices() WITH SELF-HEALING FOR FUTURE NOTICES
CREATE OR REPLACE FUNCTION public.fn_expire_past_departure_notices()
RETURNS VOID AS $$
DECLARE
    v_today DATE;
BEGIN
    v_today := (timezone('Asia/Dhaka', now()))::DATE;

    -- 1. End all allocations whose end_date has passed (< v_today) and status is ACTIVE
    UPDATE public.allocations
    SET status = 'ENDED',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE status = 'ACTIVE' 
      AND end_date IS NOT NULL 
      AND end_date < v_today;

    -- 2. Mark all boarders whose leaving_date has passed (< v_today) as LEFT
    UPDATE public.boarders
    SET status = 'LEFT',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE status = 'ACTIVE' 
      AND leaving_date IS NOT NULL 
      AND leaving_date < v_today;

    -- 3. Release any seats to AVAILABLE where there is no active occupant today
    -- and the seat is not in MAINTENANCE or INACTIVE
    UPDATE public.seats s
    SET status = 'AVAILABLE',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE s.status = 'OCCUPIED'
      AND NOT EXISTS (
          SELECT 1 
          FROM public.allocations a
          WHERE a.seat_id = s.id 
            AND (a.status = 'ACTIVE' OR (a.end_date IS NOT NULL AND a.end_date >= v_today))
            AND (a.start_date IS NULL OR a.start_date <= v_today)
            AND (a.end_date IS NULL OR a.end_date >= v_today)
      );

    -- 4. HEAL FUTURE NOTICES: Ensure residents with future departure notices (end_date >= v_today)
    -- are recognized as ACTIVE residents residing in OCCUPIED seats until their departure date
    UPDATE public.boarders b
    SET status = 'ACTIVE',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE b.status = 'LEFT'
      AND b.leaving_date IS NOT NULL
      AND b.leaving_date >= v_today;

    UPDATE public.allocations a
    SET status = 'ACTIVE',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE a.status IN ('ENDED', 'CANCELLED')
      AND a.end_date IS NOT NULL
      AND a.end_date >= v_today
      AND (a.start_date IS NULL OR a.start_date <= v_today);

    UPDATE public.seats s
    SET status = 'OCCUPIED',
        updated_at = timezone('Asia/Dhaka', now())
    WHERE s.status = 'AVAILABLE'
      AND EXISTS (
          SELECT 1 
          FROM public.allocations a
          WHERE a.seat_id = s.id 
            AND (a.status = 'ACTIVE' OR (a.end_date IS NOT NULL AND a.end_date >= v_today))
            AND (a.start_date IS NULL OR a.start_date <= v_today)
            AND (a.end_date IS NULL OR a.end_date >= v_today)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fn_expire_past_departure_notices() TO authenticated, anon, service_role;


-- 2. UPDATE get_admin_boarders_list() TO RELIABLY RETURN FUTURE DEPARTURE ALLOCATIONS
CREATE OR REPLACE FUNCTION public.get_admin_boarders_list()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
    v_result JSONB;
    v_today DATE;
BEGIN
    -- Auto-expire past departures and heal future notices first
    PERFORM public.fn_expire_past_departure_notices();
    v_today := (timezone('Asia/Dhaka', now()))::DATE;

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
                      AND (
                        -- Current active occupant (including scheduled future departure notice)
                        (
                          (a.status = 'ACTIVE' OR (a.end_date IS NOT NULL AND a.end_date >= v_today))
                          AND (a.start_date IS NULL OR a.start_date <= v_today)
                          AND (a.end_date IS NULL OR a.end_date >= v_today)
                        )
                        OR
                        -- Upcoming advance booking (starts in future)
                        (
                          a.start_date > v_today 
                          AND a.status NOT IN ('CANCELLED', 'ENDED')
                        )
                      )
                      AND fl.id IN (SELECT flat_id FROM public.user_flat_assignments WHERE user_id = v_user_id)
                    ORDER BY 
                      CASE 
                        WHEN (a.start_date IS NULL OR a.start_date <= v_today) AND (a.end_date IS NULL OR a.end_date >= v_today) THEN 1
                        WHEN a.start_date > v_today THEN 2
                        ELSE 3
                      END,
                      a.created_at DESC
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
                WHERE a.boarder_id = b.id
                  AND (
                    -- Current active occupant (including scheduled future departure notice)
                    (
                      (a.status = 'ACTIVE' OR (a.end_date IS NOT NULL AND a.end_date >= v_today))
                      AND (a.start_date IS NULL OR a.start_date <= v_today)
                      AND (a.end_date IS NULL OR a.end_date >= v_today)
                    )
                    OR
                    -- Upcoming advance booking (starts in future)
                    (
                      a.start_date > v_today 
                      AND a.status NOT IN ('CANCELLED', 'ENDED')
                    )
                  )
                ORDER BY 
                  CASE 
                    WHEN (a.start_date IS NULL OR a.start_date <= v_today) AND (a.end_date IS NULL OR a.end_date >= v_today) THEN 1
                    WHEN a.start_date > v_today THEN 2
                    ELSE 3
                  END,
                  a.created_at DESC
                    LIMIT 1
            ) AS active_allocation
        FROM public.boarders b
        ORDER BY b.created_at DESC
    ) b_data;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_boarders_list() TO authenticated, anon;

-- Run auto-expire & heal immediately
SELECT public.fn_expire_past_departure_notices();

COMMIT;

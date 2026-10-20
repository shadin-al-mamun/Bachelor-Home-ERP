-- Migration: 20261015000030_cleanup_function_overloads.sql
-- Description: Drop all conflicting overloads of fn_toggle_meal_selection and recreate the canonical function

-- 1. DROP ALL EXISTING OVERLOADS OF fn_toggle_meal_selection
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc
        WHERE proname = 'fn_toggle_meal_selection'
          AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func_signature || ' CASCADE;';
    END LOOP;
END $$;

-- 2. RECREATE SINGLE CANONICAL FUNCTION
CREATE OR REPLACE FUNCTION public.fn_toggle_meal_selection(
    p_meal_date DATE,
    p_session TEXT,
    p_new_state BOOLEAN,
    p_override_reason TEXT DEFAULT NULL,
    p_target_boarder_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
    v_old_state BOOLEAN := true; -- In Opt-Out mess policy, default state before insert is TRUE
    v_selection_id UUID;
    v_upper_session VARCHAR(20) := UPPER(p_session);
BEGIN
    -- 1. Validate session name
    IF v_upper_session NOT IN ('BREAKFAST', 'LUNCH', 'DINNER') THEN
        RAISE EXCEPTION 'Invalid meal session. Must be BREAKFAST, LUNCH, or DINNER.';
    END IF;

    -- 2. Fetch caller role if authenticated
    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role
        FROM public.profiles
        WHERE id = v_caller_id;
    END IF;

    v_is_admin := (v_caller_role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEAL_OPERATOR'));

    -- 3. Determine target boarder
    IF p_target_boarder_id IS NOT NULL THEN
        IF NOT v_is_admin THEN
            -- Regular boarders can only modify for themselves
            SELECT id INTO v_target_boarder_id
            FROM public.boarders
            WHERE user_id = v_caller_id AND id = p_target_boarder_id;
            
            IF v_target_boarder_id IS NULL THEN
                RAISE EXCEPTION 'Unauthorized: regular residents can only modify their own meals.';
            END IF;
        ELSE
            v_target_boarder_id := p_target_boarder_id;
        END IF;
    ELSE
        -- Default to caller's linked boarder profile
        IF v_caller_id IS NOT NULL THEN
            SELECT id INTO v_target_boarder_id
            FROM public.boarders
            WHERE user_id = v_caller_id AND status = 'ACTIVE'
            LIMIT 1;
        END IF;

        IF v_target_boarder_id IS NULL AND v_is_admin THEN
            -- If caller is admin/manager without their own boarder profile, pick first active boarder
            SELECT id INTO v_target_boarder_id
            FROM public.boarders
            WHERE status = 'ACTIVE'
            LIMIT 1;
        END IF;

        IF v_target_boarder_id IS NULL THEN
            RAISE EXCEPTION 'No active boarder record linked to authenticated user.';
        END IF;
    END IF;

    -- 4. Fetch boarder's currently allocated flat with resilient fallbacks
    SELECT r.flat_id INTO v_flat_id
    FROM public.allocations a
    JOIN public.seats s ON s.id = a.seat_id
    JOIN public.rooms r ON r.id = s.room_id
    WHERE a.boarder_id = v_target_boarder_id AND a.status = 'ACTIVE'
    LIMIT 1;

    IF v_flat_id IS NULL THEN
        -- Fallback 1: check any allocation for this boarder
        SELECT r.flat_id INTO v_flat_id
        FROM public.allocations a
        JOIN public.seats s ON s.id = a.seat_id
        JOIN public.rooms r ON r.id = s.room_id
        WHERE a.boarder_id = v_target_boarder_id
        ORDER BY a.created_at DESC
        LIMIT 1;

        -- Fallback 2: check any active flat in the mess
        IF v_flat_id IS NULL THEN
            SELECT id INTO v_flat_id FROM public.flats WHERE status = 'ACTIVE' LIMIT 1;
        END IF;

        -- Fallback 3: check any flat in the mess
        IF v_flat_id IS NULL THEN
            SELECT id INTO v_flat_id FROM public.flats LIMIT 1;
        END IF;
    END IF;

    IF v_flat_id IS NULL THEN
        RAISE EXCEPTION 'No flat found in system to associate meal selection.';
    END IF;

    -- 5. Fetch meal settings & cutoff
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

    IF v_is_module_enabled IS NULL THEN
        v_is_module_enabled := true;
        v_is_session_enabled := true;
        v_cutoff_time := '22:00:00';
    END IF;

    IF NOT v_is_module_enabled THEN
        RAISE EXCEPTION 'Meal management module is currently disabled by administrator.';
    END IF;

    IF NOT v_is_session_enabled THEN
        RAISE EXCEPTION 'Meal session % is currently disabled in system settings.', v_upper_session;
    END IF;

    -- 6. Cutoff Validation Logic:
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

    -- Default explanation if staff overrides without explicit note
    IF v_is_override AND (p_override_reason IS NULL OR length(trim(p_override_reason)) = 0) THEN
        p_override_reason := 'এডমিন কর্তৃক কাটঅফ পরবর্তী পরিবর্তন (Admin Staff Override)';
    END IF;

    -- 7. Fetch current state if selection exists
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
        -- Insert new row (In Opt-Out policy, the other non-toggled sessions default to TRUE!)
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
            CASE WHEN v_upper_session = 'BREAKFAST' THEN p_new_state ELSE true END,
            CASE WHEN v_upper_session = 'LUNCH' THEN p_new_state ELSE true END,
            CASE WHEN v_upper_session = 'DINNER' THEN p_new_state ELSE true END,
            v_is_override,
            CASE WHEN v_is_override THEN p_override_reason ELSE NULL END,
            CASE WHEN v_is_override THEN v_caller_id ELSE NULL END
        )
        RETURNING id INTO v_selection_id;

        v_old_state := true; -- Previous implicit default was true
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

    -- 8. Record audit log when state actually changes
    IF v_old_state IS DISTINCT FROM p_new_state THEN
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
            COALESCE(v_old_state, true),
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

-- 3. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.fn_toggle_meal_selection(DATE, TEXT, BOOLEAN, TEXT, UUID) TO authenticated, service_role, anon;

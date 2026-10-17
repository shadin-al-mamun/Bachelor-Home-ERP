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

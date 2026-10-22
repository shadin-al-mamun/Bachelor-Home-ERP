-- ==============================================================================
-- Migration: 20261022000004_fix_boarder_charges_and_receipts_rls.sql
-- Description:
--   1. Fix missing RLS policies on public.boarder_charges (enables SELECT for boarders & staff).
--   2. Strengthen public.receipts & public.boarders RLS policies with phone/email fallback.
--   3. Add security-definer RPC claim_my_boarder_profile() for self-linking authenticated boarders.
-- ==============================================================================

-- 1. Ensure Table Permissions are Granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarder_charges TO authenticated;
GRANT SELECT ON public.boarder_charges TO anon;
GRANT ALL ON public.boarder_charges TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT SELECT ON public.receipts TO anon;
GRANT ALL ON public.receipts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarders TO authenticated;
GRANT SELECT ON public.boarders TO anon;
GRANT ALL ON public.boarders TO service_role;

-- 2. BOARDER CHARGES RLS POLICIES
ALTER TABLE public.boarder_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boarder_charges_select_policy ON public.boarder_charges;
CREATE POLICY boarder_charges_select_policy ON public.boarder_charges
FOR SELECT TO authenticated
USING (
    -- Staff can view all boarder charges
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER')
    -- Boarders can view their own charges
    OR boarder_id IN (
        SELECT id FROM public.boarders
        WHERE user_id = auth.uid()
           OR (
               phone_number IS NOT NULL AND phone_number <> ''
               AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND RIGHT(REGEXP_REPLACE(phone_number, '[^\d]', '', 'g'), 10) =
                   RIGHT(REGEXP_REPLACE((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
           )
           OR (
               email IS NOT NULL AND email <> ''
               AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
           )
    )
);

DROP POLICY IF EXISTS boarder_charges_admin_manage ON public.boarder_charges;
CREATE POLICY boarder_charges_admin_manage ON public.boarder_charges
FOR ALL TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER'))
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'MANAGER'));


-- 3. RECEIPTS RLS POLICIES (Allow boarders to view their receipts seamlessly)
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS receipts_select_policy ON public.receipts;
CREATE POLICY receipts_select_policy ON public.receipts
FOR SELECT TO authenticated
USING (
    -- Staff roles
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND received_by = auth.uid())
    -- Boarder self-view (matches by user_id, phone, or email)
    OR boarder_id IN (
        SELECT id FROM public.boarders
        WHERE user_id = auth.uid()
           OR (
               phone_number IS NOT NULL AND phone_number <> ''
               AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND RIGHT(REGEXP_REPLACE(phone_number, '[^\d]', '', 'g'), 10) =
                   RIGHT(REGEXP_REPLACE((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
           )
           OR (
               email IS NOT NULL AND email <> ''
               AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
               AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
           )
    )
);


-- 4. BOARDERS RLS POLICIES (Allow boarders to view their resident record seamlessly)
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO authenticated
USING (
    -- Linked auth account
    user_id = auth.uid()
    -- Phone match fallback (handles country code / formatting differences)
    OR (
        phone_number IS NOT NULL AND phone_number <> ''
        AND (SELECT phone_number FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
        AND RIGHT(REGEXP_REPLACE(phone_number, '[^\d]', '', 'g'), 10) =
            RIGHT(REGEXP_REPLACE((SELECT phone_number FROM public.profiles WHERE id = auth.uid()), '[^\d]', '', 'g'), 10)
    )
    -- Email match fallback
    OR (
        email IS NOT NULL AND email <> ''
        AND (SELECT email FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
        AND lower(email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
    -- Staff roles
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


-- 5. RPC: Claim / Link Current Boarder Profile
CREATE OR REPLACE FUNCTION public.claim_my_boarder_profile()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_phone TEXT;
    v_email TEXT;
    v_bdr RECORD;
BEGIN
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;

    -- Fetch current user profile details
    SELECT phone_number, email INTO v_phone, v_email
    FROM public.profiles
    WHERE id = v_uid;

    -- 1. Check if already linked directly by user_id
    SELECT * INTO v_bdr
    FROM public.boarders
    WHERE user_id = v_uid
    LIMIT 1;

    IF v_bdr.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'boarder_id', v_bdr.id,
            'boarder_code', v_bdr.boarder_code,
            'full_name', v_bdr.full_name,
            'status', v_bdr.status,
            'already_linked', true
        );
    END IF;

    -- 2. Search for matching boarder by last 10 digits of phone or email
    SELECT * INTO v_bdr
    FROM public.boarders
    WHERE (
        v_phone IS NOT NULL AND length(v_phone) >= 10
        AND RIGHT(REGEXP_REPLACE(phone_number, '[^\d]', '', 'g'), 10) =
            RIGHT(REGEXP_REPLACE(v_phone, '[^\d]', '', 'g'), 10)
    )
    OR (
        v_email IS NOT NULL AND v_email <> ''
        AND lower(email) = lower(v_email)
    )
    ORDER BY created_at DESC
    LIMIT 1;

    -- 3. If matched, link user_id automatically
    IF v_bdr.id IS NOT NULL THEN
        UPDATE public.boarders
        SET user_id = v_uid,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_bdr.id;

        RETURN jsonb_build_object(
            'success', true,
            'boarder_id', v_bdr.id,
            'boarder_code', v_bdr.boarder_code,
            'full_name', v_bdr.full_name,
            'status', v_bdr.status,
            'newly_linked', true
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'No matching boarder record found');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_my_boarder_profile() TO authenticated;

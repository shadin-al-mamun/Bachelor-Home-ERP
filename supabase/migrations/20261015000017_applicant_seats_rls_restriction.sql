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

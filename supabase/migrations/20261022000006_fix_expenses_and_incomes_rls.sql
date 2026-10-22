-- ==============================================================================
-- Migration: 20261022000006_fix_expenses_and_incomes_rls.sql
-- Description:
--   1. Fix RLS SELECT policies on public.expenses and public.incomes so staff,
--      managers, accountants, and owners can view all hostel operational expenses & revenues.
--   2. Remove restrictive manager isolation (paid_by = auth.uid()) so all managers
--      can see hostel-wide expenses and vouchers.
--   3. Explicitly allow owners (by email / is_admin_or_owner / SUPER_ADMIN)
--      and staff roles to view and manage expenses and incomes.
-- ==============================================================================

-- 1. Fix expenses_select policy
DROP POLICY IF EXISTS expenses_select ON public.expenses;
CREATE POLICY expenses_select ON public.expenses
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    )
    OR paid_by = auth.uid()
);

-- 2. Fix incomes_select policy
DROP POLICY IF EXISTS incomes_select ON public.incomes;
CREATE POLICY incomes_select ON public.incomes
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    OR lower(COALESCE(auth.jwt()->>'email', '')) IN ('shadin0158@gmail.com', 'almamun0158@gmail.com')
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'MANAGER', 'MEAL_OPERATOR')
    )
    OR received_by = auth.uid()
);

-- 3. Ensure permissions are explicitly granted
GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.incomes TO authenticated;

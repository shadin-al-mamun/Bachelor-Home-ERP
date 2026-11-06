-- Migration: 20261106000001_support_two_managers_and_account_assignment.sql
-- Description: Supports two distinct manager positions with individual manager cash drawers/accounts.
--              Enables Admin to assign managers to accounts and isolates manager access to their designated accounts.

-- 1. Ensure assigned_manager_id column exists on financial_accounts
ALTER TABLE public.financial_accounts 
ADD COLUMN IF NOT EXISTS assigned_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Create index on assigned_manager_id for performant lookups
CREATE INDEX IF NOT EXISTS idx_financial_accounts_assigned_manager ON public.financial_accounts(assigned_manager_id);

-- 3. Upsert both manager accounts and assign managers
DO $$
DECLARE
    v_mgr1_id UUID;
    v_mgr2_id UUID;
    v_cash_drawer_exists BOOLEAN;
BEGIN
    -- Look for existing manager profiles or use fixed IDs
    SELECT id INTO v_mgr1_id FROM public.profiles WHERE phone_number = '01800000001' OR role = 'MANAGER' ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO v_mgr2_id FROM public.profiles WHERE phone_number = '01800000002' OR (role = 'MANAGER' AND id != v_mgr1_id) ORDER BY created_at ASC LIMIT 1;

    -- If Manager 1 cash account exists, update assigned manager
    UPDATE public.financial_accounts
    SET assigned_manager_id = v_mgr1_id
    WHERE (account_number = 'MGR-CASH-01' OR account_type = 'CASH_MANAGER' OR account_name ILIKE '%Manager Cash Box%')
      AND (assigned_manager_id IS NULL OR assigned_manager_id = v_mgr1_id);

    -- Check if second manager cash drawer exists
    SELECT EXISTS (
        SELECT 1 FROM public.financial_accounts 
        WHERE account_number = 'MGR-CASH-02' OR account_name ILIKE '%ম্যানেজার ক্যাশ ড্রয়ার%'
    ) INTO v_cash_drawer_exists;

    -- Insert second manager cash drawer if not exists
    IF NOT v_cash_drawer_exists THEN
        INSERT INTO public.financial_accounts (
            id,
            account_name,
            account_type,
            account_number,
            bank_name,
            opening_balance,
            current_balance,
            is_active,
            assigned_manager_id
        ) VALUES (
            '11111111-0000-0000-0000-000000000004'::UUID,
            'ম্যানেজার ক্যাশ ড্রয়ার',
            'CASH_MANAGER',
            'MGR-CASH-02',
            'Cash Safe',
            0,
            0,
            TRUE,
            v_mgr2_id
        )
        ON CONFLICT (id) DO UPDATE SET
            account_name = EXCLUDED.account_name,
            account_type = EXCLUDED.account_type,
            account_number = EXCLUDED.account_number,
            assigned_manager_id = COALESCE(public.financial_accounts.assigned_manager_id, EXCLUDED.assigned_manager_id);
    ELSE
        UPDATE public.financial_accounts
        SET assigned_manager_id = v_mgr2_id
        WHERE (account_number = 'MGR-CASH-02' OR account_name ILIKE '%ম্যানেজার ক্যাশ ড্রয়ার%')
          AND (assigned_manager_id IS NULL OR assigned_manager_id = v_mgr2_id);
    END IF;
END $$;

-- 4. Enable RLS policy on financial_accounts for Manager account isolation
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to view authorized financial accounts" ON public.financial_accounts;

CREATE POLICY "Allow users to view authorized financial accounts"
ON public.financial_accounts
FOR SELECT
TO authenticated
USING (
    -- Super Admin, Admin, Accountant, Auditor can view all accounts
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    )
    OR
    -- Managers can ONLY view their assigned account or legacy unassigned cash accounts
    (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'MANAGER'
        )
        AND (
            assigned_manager_id = auth.uid()
            OR (assigned_manager_id IS NULL AND account_type = 'CASH_MANAGER')
        )
    )
);

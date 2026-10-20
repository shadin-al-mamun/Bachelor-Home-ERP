-- ==============================================================================
-- Bachelor Home ERP — Migration 000023: Financial Accounts RLS Policies & Seeds
-- File: supabase/migrations/20261015000023_financial_accounts_rls_and_management.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Grant table permissions on public.financial_accounts and public.account_transfers
--   2. Add Row Level Security (RLS) policies for SELECT, INSERT, UPDATE on financial accounts
--   3. Ensure default hostel accounts (Cash, Bank, bKash, Manager) exist so bill collection is never blocked
-- ==============================================================================

-- 1. Grant table access to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT SELECT ON public.financial_accounts TO anon;
GRANT ALL ON public.financial_accounts TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.account_transfers TO authenticated;
GRANT ALL ON public.account_transfers TO service_role;

-- 2. Financial Accounts RLS Policies
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_accounts_select_policy ON public.financial_accounts;
CREATE POLICY financial_accounts_select_policy ON public.financial_accounts
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS financial_accounts_insert_policy ON public.financial_accounts;
CREATE POLICY financial_accounts_insert_policy ON public.financial_accounts
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS financial_accounts_update_policy ON public.financial_accounts;
CREATE POLICY financial_accounts_update_policy ON public.financial_accounts
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS financial_accounts_delete_policy ON public.financial_accounts;
CREATE POLICY financial_accounts_delete_policy ON public.financial_accounts
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- 3. Account Transfers RLS Policies
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_transfers_select_policy ON public.account_transfers;
CREATE POLICY account_transfers_select_policy ON public.account_transfers
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS account_transfers_insert_policy ON public.account_transfers;
CREATE POLICY account_transfers_insert_policy ON public.account_transfers
FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. Seed Standard Financial Accounts
INSERT INTO public.financial_accounts (id, account_name, account_type, account_number, bank_name, current_balance, is_active)
VALUES 
    (
        '66666666-6666-6666-6666-666666666661',
        'Main Hostel Cash Vault (মেইন ক্যাশ)',
        'CASH_OWNER',
        'CASH-VAULT-01',
        'Main Cash Safe',
        50000.00,
        true
    ),
    (
        '66666666-6666-6666-6666-666666666662',
        'Islami Bank Operating Account',
        'BANK',
        '2050123456789012',
        'Islami Bank Bangladesh PLC',
        150000.00,
        true
    ),
    (
        '66666666-6666-6666-6666-666666666663',
        'bKash Merchant / Agent Wallet',
        'MFS',
        '01712345678',
        'bKash Limited',
        35000.00,
        true
    ),
    (
        '66666666-6666-6666-6666-666666666664',
        'Manager Floor Petty Cash',
        'CASH_MANAGER',
        'CASH-MGR-01',
        'Petty Cash Drawer',
        15000.00,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    account_name = EXCLUDED.account_name,
    is_active = true;

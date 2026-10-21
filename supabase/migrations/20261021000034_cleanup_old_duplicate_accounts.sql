-- ==============================================================================
-- Bachelor Home ERP — Migration 000034: Clean Old Duplicate Financial Accounts
-- File: supabase/migrations/20261021000034_cleanup_old_duplicate_accounts.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   Keep strictly the 3 Primary Accounts required by the simplified system:
--     1. Hostel Main Account (মেইন একাউন্ট) -> 11111111-0000-0000-0000-000000000001
--     2. Manager Cash Box (ম্যানেজার ক্যাশ) -> 11111111-0000-0000-0000-000000000002
--     3. Owner/Admin Account (এডমিন একাউন্ট) -> 11111111-0000-0000-0000-000000000003
--   Remove old seed/duplicate test accounts (e.g. 66666666-...)
-- ==============================================================================

-- 1. Ensure any orphan foreign keys (if any exist) are safely nullified or removed
UPDATE public.receipts 
SET destination_account_id = '11111111-0000-0000-0000-000000000001'
WHERE destination_account_id NOT IN (
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003'
);

UPDATE public.expenses 
SET source_account_id = '11111111-0000-0000-0000-000000000002'
WHERE source_account_id NOT IN (
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003'
);

UPDATE public.incomes 
SET destination_account_id = '11111111-0000-0000-0000-000000000002'
WHERE destination_account_id NOT IN (
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003'
);

-- 2. Remove all old redundant/seed financial accounts except the 3 primary ones
DELETE FROM public.financial_accounts 
WHERE id NOT IN (
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003'
);

-- 3. Standardize Names & Types for the 3 Primary Accounts
UPDATE public.financial_accounts 
SET 
    account_name = 'Hostel Main Account (মেইন একাউন্ট)',
    account_type = 'CASH_OWNER',
    account_number = 'MAIN-VAULT-01',
    bank_name = 'Hostel Central Safe / Vault',
    is_active = true
WHERE id = '11111111-0000-0000-0000-000000000001';

UPDATE public.financial_accounts 
SET 
    account_name = 'Manager Cash Box (ম্যানেজার ক্যাশ)',
    account_type = 'CASH_MANAGER',
    account_number = 'MGR-CASH-01',
    bank_name = 'Manager Shift Cash Drawer',
    is_active = true
WHERE id = '11111111-0000-0000-0000-000000000002';

UPDATE public.financial_accounts 
SET 
    account_name = 'Owner/Admin Account (এডমিন একাউন্ট)',
    account_type = 'BANK',
    account_number = 'ADM-BANK-01',
    bank_name = 'Hostel Operating Bank Account',
    is_active = true
WHERE id = '11111111-0000-0000-0000-000000000003';

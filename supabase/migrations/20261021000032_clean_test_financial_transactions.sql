-- ==============================================================================
-- Bachelor Home ERP — Migration 000032: Clean Test Financial Transactions
-- File: supabase/migrations/20261021000032_clean_test_financial_transactions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Purpose:
--   Reset all test financial data (receipts, expenses, incomes, transfers, cash sessions)
--   for a clean, realistic baseline while strictly preserving accommodation, boarders,
--   allocations, user profiles, and system settings.
-- ==============================================================================

BEGIN;

-- 1. Purge dependent transactional details in child-to-parent order
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipt_items') THEN
        DELETE FROM public.receipt_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flat_monthly_distributions') THEN
        DELETE FROM public.flat_monthly_distributions;
    END IF;
END $$;

DELETE FROM public.receipt_allocations;
DELETE FROM public.receipts;
DELETE FROM public.expenses;
DELETE FROM public.incomes;
DELETE FROM public.account_transfers;
DELETE FROM public.owner_deposits;
DELETE FROM public.cash_handovers;
DELETE FROM public.manager_cash_sessions;

-- 4. Reset Boarder Charges status to UNPAID and paid_amount to 0
UPDATE public.boarder_charges
SET paid_amount = 0.00,
    status = 'UNPAID',
    updated_at = timezone('Asia/Dhaka', now())
WHERE status <> 'VOID';

-- 5. Reset Financial Account balances to 0.00
UPDATE public.financial_accounts
SET current_balance = 0.00,
    updated_at = timezone('Asia/Dhaka', now());

-- 6. Reset Sequences to initial starting points
ALTER SEQUENCE IF EXISTS receipt_seq RESTART WITH 1001;
ALTER SEQUENCE IF EXISTS expense_seq RESTART WITH 5001;
ALTER SEQUENCE IF EXISTS income_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS transfer_seq RESTART WITH 1001;
ALTER SEQUENCE IF EXISTS deposit_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS handover_seq RESTART WITH 3001;

COMMIT;

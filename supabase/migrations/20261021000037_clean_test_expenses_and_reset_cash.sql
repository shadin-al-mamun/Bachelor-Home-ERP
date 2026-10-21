-- ==============================================================================
-- Bachelor Home ERP — Migration 000037: Clean Test Expenses & Reset Manager Cash
-- File: supabase/migrations/20261021000037_clean_test_expenses_and_reset_cash.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Purpose:
--   1. Reset all test expenses, incomes, and open cash sessions so the Executive 
--      Owner Dashboard starts with ৳0 expenses, ৳0 cash custody, and ৳0 net deficit.
--   2. Preserves all buildings, flats, rooms, seats, boarders, and active allocations.
-- ==============================================================================

BEGIN;

-- 1. Remove all test expenses and incomes
DELETE FROM public.expenses;
DELETE FROM public.incomes;

-- 2. Remove all cash custody sessions and handovers
DELETE FROM public.cash_handovers;
DELETE FROM public.manager_cash_sessions;
DELETE FROM public.owner_deposits;
DELETE FROM public.account_transfers;

-- 3. Reset financial accounts current balances & opening balances to 0.00
UPDATE public.financial_accounts
SET current_balance = 0.00,
    opening_balance = 0.00,
    updated_at = timezone('Asia/Dhaka', now());

-- 4. Reset expense and income sequences to fresh start
ALTER SEQUENCE IF EXISTS expense_seq RESTART WITH 5001;
ALTER SEQUENCE IF EXISTS income_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS transfer_seq RESTART WITH 1001;
ALTER SEQUENCE IF EXISTS deposit_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS handover_seq RESTART WITH 3001;

COMMIT;

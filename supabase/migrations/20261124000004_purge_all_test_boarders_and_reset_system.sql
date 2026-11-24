-- ==============================================================================
-- Bachelor Home ERP — Migration 000004: Purge All Test Boarders & Reset for Live Launch
-- File: supabase/migrations/20261124000004_purge_all_test_boarders_and_reset_system.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Description:
--   1. Safely removes all experimental/test boarders and dependent records:
--      - receipts, receipt_allocations, receipt_items
--      - boarder_charges, flat_monthly_distributions
--      - meal_selections, guest_meal_bookings, meal_change_audit
--      - allocations, allocation_history
--      - boarders
--      - test boarder notifications & test boarder auth profiles (role = 'BOARDER')
--   2. Resets all seats status to 'AVAILABLE' (ready for real boarder occupancy).
--   3. Resets test financial transactions (expenses, incomes, transfers, deposits, handovers, sessions).
--   4. Resets financial accounts current_balance and opening_balance to 0.00.
--   5. Resets financial sequences (receipts, expenses, incomes, transfers, deposits, handovers).
--   6. Strictly PRESERVES:
--      - Buildings, Flats, Rooms, Seats infrastructure
--      - Super Admin, Admin, Manager, Staff profiles & permissions
--      - Organization settings, hostel rules, meal settings & rates
--      - Expense & Income categories
-- ==============================================================================

BEGIN;

-- 1. Remove all receipt details, receipts & billing records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipt_items') THEN
        DELETE FROM public.receipt_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipt_allocations') THEN
        DELETE FROM public.receipt_allocations;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        DELETE FROM public.receipts;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flat_monthly_distributions') THEN
        DELETE FROM public.flat_monthly_distributions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boarder_charges') THEN
        DELETE FROM public.boarder_charges;
    END IF;
END $$;

-- 2. Remove all test meal records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'guest_meal_bookings') THEN
        DELETE FROM public.guest_meal_bookings;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meal_change_audit') THEN
        DELETE FROM public.meal_change_audit;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meal_selections') THEN
        DELETE FROM public.meal_selections;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meal_records') THEN
        DELETE FROM public.meal_records;
    END IF;
END $$;

-- 3. Remove all seat allocations and allocation history
DELETE FROM public.allocation_history;
DELETE FROM public.allocations;

-- 4. Remove all test boarders
DELETE FROM public.boarders;

-- 5. Clean up boarder-specific notifications & test boarder user profiles
-- (Note: SUPER_ADMIN, ADMIN, MANAGER, ACCOUNTANT, MEAL_OPERATOR, AUDITOR are strictly PRESERVED)
DELETE FROM public.system_notifications 
WHERE recipient_id IN (
    SELECT id FROM public.profiles WHERE role = 'BOARDER'
);

-- Delete profiles of test boarders
DELETE FROM public.profiles 
WHERE role = 'BOARDER';

-- Also remove test boarder auth.users if accessible
DO $$
BEGIN
    DELETE FROM auth.users 
    WHERE id NOT IN (
        SELECT id FROM public.profiles 
        WHERE role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR')
    ) AND email NOT IN ('shadin0158@gmail.com', 'almamun0158@gmail.com');
EXCEPTION WHEN OTHERS THEN
    -- In case of restrictive auth schema permissions in managed platform, continue safely
    NULL;
END $$;

-- 6. Reset all seats to AVAILABLE
UPDATE public.seats
SET status = 'AVAILABLE',
    updated_at = timezone('Asia/Dhaka', now());

-- 7. Reset all test expenses, HR advances, incomes, cash sessions and transfers
DELETE FROM public.expenses;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_items') THEN
        DELETE FROM public.payroll_items;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_sheets') THEN
        DELETE FROM public.payroll_sheets;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_advances') THEN
        DELETE FROM public.staff_advances;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hostel_notices') THEN
        DELETE FROM public.hostel_notices WHERE title = '__SYSTEM_HR_CLOUD_SYNC__';
    END IF;
END $$;
DELETE FROM public.incomes;
DELETE FROM public.account_transfers;
DELETE FROM public.owner_deposits;
DELETE FROM public.cash_handovers;
DELETE FROM public.manager_cash_sessions;

-- 8. Reset financial accounts to zero baseline
UPDATE public.financial_accounts
SET current_balance = 0.00,
    opening_balance = 0.00,
    updated_at = timezone('Asia/Dhaka', now());

-- 9. Reset numbering sequences to fresh starting values
ALTER SEQUENCE IF EXISTS receipt_seq RESTART WITH 1001;
ALTER SEQUENCE IF EXISTS expense_seq RESTART WITH 5001;
ALTER SEQUENCE IF EXISTS income_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS transfer_seq RESTART WITH 1001;
ALTER SEQUENCE IF EXISTS deposit_seq RESTART WITH 2001;
ALTER SEQUENCE IF EXISTS handover_seq RESTART WITH 3001;

COMMIT;

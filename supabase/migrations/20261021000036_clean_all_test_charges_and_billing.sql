-- ==============================================================================
-- Bachelor Home ERP — Migration 000036: Clean All Test Charges & Billing Dues
-- File: supabase/migrations/20261021000036_clean_all_test_charges_and_billing.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Clean all test charges and receipts so the 1. Bill Collection page starts with ৳0 dues.
--   2. Boarders, seats, allocations, rooms, and flats are strictly PRESERVED.
-- ==============================================================================

-- 1. Remove receipt line items and allocations
DELETE FROM public.receipt_items;
DELETE FROM public.receipt_allocations;

-- 2. Remove all receipts
DELETE FROM public.receipts;

-- 3. Remove flat monthly expense distributions
DELETE FROM public.flat_monthly_distributions;

-- 4. Remove all test boarder charges (Seat Rent, Meal Bills, Utility, Misc, etc.)
DELETE FROM public.boarder_charges;

-- ==============================================================================
-- Bachelor Home ERP - pgTAP Database & RLS Integrity Test Suite
-- File: supabase/tests/rls_and_integrity_test.sql
-- Reference: test_plan.md (Section 3), PRD v3.0 (§15.1, §15.2, §15.3, §15.4)
-- ==============================================================================

BEGIN;
-- Plan the test assertions count
SELECT plan(18);

-- -----------------------------------------------------------------------------
-- 1. Structural Checks: Tables, Indexes and RLS Activation
-- -----------------------------------------------------------------------------
SELECT has_table('public', 'seats', 'Seats table must exist');
SELECT has_table('public', 'allocations', 'Allocations table must exist');
SELECT has_table('public', 'expenses', 'Expenses table must exist');
SELECT has_table('public', 'receipts', 'Receipts table must exist');
SELECT has_table('public', 'meal_selections', 'Meal selections table must exist');

SELECT table_has_rls('public', 'seats', 'Seats table must have RLS enabled');
SELECT table_has_rls('public', 'expenses', 'Expenses table must have RLS enabled');
SELECT table_has_rls('public', 'receipts', 'Receipts table must have RLS enabled');
SELECT table_has_rls('public', 'meal_selections', 'Meal selections table must have RLS enabled');

SELECT has_index(
    'public', 
    'allocations', 
    'idx_unique_active_seat_allocation', 
    'Partial unique index idx_unique_active_seat_allocation must exist on allocations(seat_id) WHERE status = ACTIVE'
);

-- -----------------------------------------------------------------------------
-- 2. Seed Mock Environment for Integrity & Constraint Testing
-- -----------------------------------------------------------------------------
INSERT INTO public.buildings (id, building_code, name, address) 
VALUES ('11111111-1111-1111-1111-111111111111', 'B1', 'Test Tower', 'Dhaka, Bangladesh');

INSERT INTO public.flats (id, building_id, flat_code, name) 
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'F1', 'Flat 101');

INSERT INTO public.rooms (id, flat_id, room_code, name) 
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'R1', 'Room A');

INSERT INTO public.seats (id, room_id, seat_code, seat_name, default_rent, status) 
VALUES 
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'S1', 'Seat 101A', 4500.00, 'AVAILABLE'),
('44444444-4444-4444-4444-444444444445', '33333333-3333-3333-3333-333333333333', 'S2', 'Seat 101B', 4500.00, 'AVAILABLE');

-- Seed Auth Users & Profiles
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'applicant@bachelor.com', '{"full_name": "Applicant User"}'::jsonb),
('b0000000-0000-0000-0000-000000000001', 'boarder1@bachelor.com', '{"full_name": "Boarder One"}'::jsonb),
('b0000000-0000-0000-0000-000000000002', 'boarder2@bachelor.com', '{"full_name": "Boarder Two"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, phone_number, role, is_active)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'applicant@bachelor.com', 'Applicant User', '01711111111', 'APPLICANT', true),
('b0000000-0000-0000-0000-000000000001', 'boarder1@bachelor.com', 'Boarder One', '01722222221', 'BOARDER', true),
('b0000000-0000-0000-0000-000000000002', 'boarder2@bachelor.com', 'Boarder Two', '01722222222', 'BOARDER', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.boarders (id, user_id, boarder_code, full_name, phone_number, guardian_name, guardian_phone, permanent_address, admission_date, status)
VALUES 
('b1111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001', 'BDR-001', 'Boarder One', '01722222221', 'Guardian 1', '01811111111', 'Dhaka', '2026-10-01', 'ACTIVE'),
('b2222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000002', 'BDR-002', 'Boarder Two', '01722222222', 'Guardian 2', '01822222222', 'Chittagong', '2026-10-01', 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 3. Test Conflict Constraint: Unique Active Seat Allocation
-- -----------------------------------------------------------------------------
-- Insert initial active allocation for Boarder 1 on Seat S1
INSERT INTO public.allocations (id, boarder_id, seat_id, monthly_rent, start_date, status)
VALUES ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 4500.00, '2026-10-01', 'ACTIVE');

-- Verify trigger automatically flips seat status to OCCUPIED
SELECT is(
    (SELECT status::text FROM public.seats WHERE id = '44444444-4444-4444-4444-444444444444'),
    'OCCUPIED',
    'Seat status must automatically transition to OCCUPIED when an ACTIVE allocation is created'
);

-- Attempting to insert a SECOND ACTIVE allocation on the exact same seat MUST trigger 23505 unique violation
SELECT throws_ok(
    $$ INSERT INTO public.allocations (id, boarder_id, seat_id, monthly_rent, start_date, status)
       VALUES ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 4500.00, '2026-10-05', 'ACTIVE') $$,
    '23505',
    NULL,
    'Conflicting second active seat allocation must trigger a unique constraint violation (23505)'
);

-- -----------------------------------------------------------------------------
-- 4. Test RLS Isolation: APPLICANT Role Access Restrictions
-- -----------------------------------------------------------------------------
-- Seed an expense row as admin
INSERT INTO public.expenses (id, expense_number, expense_category_id, amount, expense_date, paid_by, payment_method)
SELECT 'e1111111-1111-1111-1111-111111111111', 'EXP-TEST-001', id, 1200.00, CURRENT_DATE, 'b0000000-0000-0000-0000-000000000001', 'CASH'
FROM public.expense_categories LIMIT 1;

-- Switch session context to APPLICANT user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'a0000000-0000-0000-0000-000000000001';

-- An APPLICANT user must receive 0 rows when attempting to query public.seats
SELECT is(
    (SELECT count(*)::integer FROM public.seats),
    0,
    'APPLICANT user must NOT be permitted to read public.seats (RLS returns 0 rows)'
);

-- An APPLICANT user must receive 0 rows when querying public.expenses
SELECT is(
    (SELECT count(*)::integer FROM public.expenses),
    0,
    'APPLICANT user must NOT be permitted to read public.expenses (RLS returns 0 rows)'
);

-- Reset back to postgres superuser for next test segment
RESET ROLE;
RESET "request.jwt.claim.sub";

-- -----------------------------------------------------------------------------
-- 5. Test RLS Isolation: Boarder Cross-Read / Cross-Write Protections
-- -----------------------------------------------------------------------------
-- Seed financial accounts and receipts for Boarder 1 and Boarder 2
INSERT INTO public.receipts (id, receipt_number, boarder_id, account_id, amount, payment_method, payment_date, received_by)
SELECT 
    'r1111111-1111-1111-1111-111111111111', 'REC-001', 'b1111111-1111-1111-1111-111111111111', id, 4500.00, 'CASH', CURRENT_DATE, 'b0000000-0000-0000-0000-000000000001'
FROM public.financial_accounts LIMIT 1;

INSERT INTO public.receipts (id, receipt_number, boarder_id, account_id, amount, payment_method, payment_date, received_by)
SELECT 
    'r2222222-2222-2222-2222-222222222222', 'REC-002', 'b2222222-2222-2222-2222-222222222222', id, 5000.00, 'CASH', CURRENT_DATE, 'b0000000-0000-0000-0000-000000000001'
FROM public.financial_accounts LIMIT 1;

-- Seed meal selections for Boarder 1 and Boarder 2
INSERT INTO public.meal_selections (id, boarder_id, flat_id, meal_date, breakfast, lunch, dinner)
VALUES 
('m1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '2 days', true, true, true),
('m2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '2 days', false, false, true);

-- Switch session context to Boarder 1
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000001';

-- Boarder 1 must ONLY see their own receipt (REC-001) and 0 receipts belonging to Boarder 2
SELECT is(
    (SELECT count(*)::integer FROM public.receipts WHERE boarder_id = 'b2222222-2222-2222-2222-222222222222'),
    0,
    'Boarder 1 must NOT be able to view receipts belonging to Boarder 2 (RLS cross-read isolation)'
);

SELECT is(
    (SELECT count(*)::integer FROM public.receipts WHERE boarder_id = 'b1111111-1111-1111-1111-111111111111'),
    1,
    'Boarder 1 can view their own receipts'
);

-- Boarder 1 must NOT see Boarder 2's meal selections
SELECT is(
    (SELECT count(*)::integer FROM public.meal_selections WHERE boarder_id = 'b2222222-2222-2222-2222-222222222222'),
    0,
    'Boarder 1 must NOT be able to view meal selections belonging to Boarder 2'
);

-- Boarder 1 direct modification on meal_selections table is blocked (RPC-only policy)
SELECT throws_ok(
    $$ UPDATE public.meal_selections SET dinner = false WHERE boarder_id = 'b1111111-1111-1111-1111-111111111111' $$,
    '42501', -- Insufficient privilege / RLS violation
    NULL,
    'Direct UPDATE on meal_selections must be blocked by RLS (requires fn_toggle_meal_selection)'
);

-- Reset back to postgres superuser
RESET ROLE;
RESET "request.jwt.claim.sub";

-- -----------------------------------------------------------------------------
-- 6. Test Meal Cutoff Logic: fn_toggle_meal_selection
-- -----------------------------------------------------------------------------
-- Verify that attempting to modify someone else's meals without manager/admin role throws unauthorized
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000001';

SELECT throws_ok(
    $$ SELECT public.fn_toggle_meal_selection(
           CURRENT_DATE + INTERVAL '2 days',
           'DINNER',
           false,
           NULL,
           'b2222222-2222-2222-2222-222222222222'::uuid
       ) $$,
    'P0001',
    'Unauthorized to modify meal selection for another boarder.',
    'fn_toggle_meal_selection must reject cross-boarder modifications without proper privileges'
);

RESET ROLE;
RESET "request.jwt.claim.sub";

-- Verify cutoff for past/current date: Boarder cannot toggle today's meal
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'b0000000-0000-0000-0000-000000000001';

SELECT throws_ok(
    $$ SELECT public.fn_toggle_meal_selection(
           CURRENT_DATE,
           'DINNER',
           false
       ) $$,
    'P0001',
    'Meal selections for today or past dates cannot be changed.',
    'fn_toggle_meal_selection must reject same-day meal alterations for regular boarders'
);

RESET ROLE;
RESET "request.jwt.claim.sub";

-- Finish test suite and rollback test data
SELECT * FROM finish();
ROLLBACK;

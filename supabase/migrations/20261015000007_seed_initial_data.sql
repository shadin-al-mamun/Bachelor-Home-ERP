-- ==============================================================================
-- Bachelor Home ERP — Migration 000007: Initial System Seed Data
-- File: supabase/migrations/20261015000007_seed_initial_data.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. SEED EXPENSE CATEGORIES
INSERT INTO public.expense_categories (name, description, is_active)
VALUES
    ('Electric Bill', 'Monthly electricity and power charges', true),
    ('Water & Gas', 'Utility bills for water supply and LP/Wasa gas', true),
    ('Internet & WiFi', 'High-speed broadband internet subscription', true),
    ('Maintenance & Repairs', 'Plumbing, electrical, furniture and painting repairs', true),
    ('Cook & Cleaner Salary', 'Monthly payroll for cook, helper, and cleaning staff', true),
    ('Cleaning Supplies', 'Detergents, floor cleaner, and waste management items', true),
    ('Miscellaneous', 'Incidental operational expenditures', true)
ON CONFLICT (name) DO NOTHING;

-- 2. SEED INCOME CATEGORIES
INSERT INTO public.income_categories (name, description, is_active)
VALUES
    ('Boarder Rent', 'Regular recurring monthly seat/room rent', true),
    ('Security Deposit', 'One-time refundable admission security deposit', true),
    ('Guest Stay Fee', 'Daily charges for boarder guests or temporary visitors', true),
    ('Scrap Sale', 'Revenue generated from selling old newspapers/cartons/scrap', true)
ON CONFLICT (name) DO NOTHING;

-- 3. SEED INITIAL SAMPLE PROPERTY & ACCOMMODATION
-- 3.1 Initial Building
INSERT INTO public.buildings (id, building_code, name, address, status, description)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'BLD-01',
    'Sunflower Hostel (সানফ্লাওয়ার হোস্টেল)',
    'House 42, Road 11, Sector 4, Uttara, Dhaka-1230',
    'ACTIVE',
    'Primary modern hostel campus equipped with CCTV, WiFi, and dining hall.'
)
ON CONFLICT (building_code) DO NOTHING;

-- 3.2 Initial Flat
INSERT INTO public.flats (id, building_id, flat_code, name, floor_number, status)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'FLAT-2A',
    'Flat 2A (ফ্ল্যাট ২-এ)',
    2,
    'ACTIVE'
)
ON CONFLICT (building_id, flat_code) DO NOTHING;

-- 3.3 Initial Room
INSERT INTO public.rooms (id, flat_id, room_code, name, room_type, capacity, status, description)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'ROOM-101',
    'Room 101 (মাস্টার বেডরুম)',
    'DELUXE',
    3,
    'ACTIVE',
    'Spacious master bedroom with attached washroom, balcony, and personal lockers.'
)
ON CONFLICT (flat_id, room_code) DO NOTHING;

-- 3.4 Initial Seats
INSERT INTO public.seats (id, room_id, seat_code, seat_name, seat_type, default_rent, status, description)
VALUES
    (
        '44444444-4444-4444-4444-444444444441',
        '33333333-3333-3333-3333-333333333333',
        'S-101-A',
        'Seat S-101-A (উইন্ডো সিট)',
        'SINGLE_BED',
        4500.00,
        'AVAILABLE',
        'East facing window corner bed with reading lamp and power socket.'
    ),
    (
        '44444444-4444-4444-4444-444444444442',
        '33333333-3333-3333-3333-333333333333',
        'S-101-B',
        'Seat S-101-B (মিডল সিট)',
        'SINGLE_BED',
        4200.00,
        'AVAILABLE',
        'Middle single bed with dedicated under-bed storage drawer.'
    ),
    (
        '44444444-4444-4444-4444-444444444443',
        '33333333-3333-3333-3333-333333333333',
        'S-101-C',
        'Seat S-101-C (ওয়াল সাইড সিট)',
        'SINGLE_BED',
        4200.00,
        'AVAILABLE',
        'Wall side single bed with dedicated wardrobe.'
    )
ON CONFLICT (room_id, seat_code) DO NOTHING;

-- 4. SEED MEAL MODULE SETTINGS & INITIAL RATES
-- 4.1 Ensure Global Meal Setting Singleton
INSERT INTO public.meal_settings (id, is_meal_module_enabled, breakfast_enabled, lunch_enabled, dinner_enabled, cutoff_time)
VALUES ('00000000-0000-0000-0000-000000000001', true, true, true, true, '22:00:00')
ON CONFLICT (id) DO UPDATE 
SET is_meal_module_enabled = true,
    breakfast_enabled = true,
    lunch_enabled = true,
    dinner_enabled = true,
    cutoff_time = '22:00:00';

-- 4.2 Seed Initial Meal Rate
INSERT INTO public.meal_rates (id, effective_from, effective_to, breakfast_rate, lunch_rate, dinner_rate)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '2026-10-01',
    NULL, -- Currently active rate
    25.00,
    60.00,
    60.00
)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED INITIAL FINANCIAL CASH ACCOUNTS
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
        'bKash Merchant Account',
        'MFS',
        '01700000000',
        'bKash',
        25000.00,
        true
    )
ON CONFLICT (id) DO NOTHING;

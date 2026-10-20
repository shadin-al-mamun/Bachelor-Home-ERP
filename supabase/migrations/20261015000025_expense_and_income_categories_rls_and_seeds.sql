-- ==============================================================================
-- Bachelor Home ERP — Migration 000025: Expense & Income Categories RLS & Seeds
-- File: supabase/migrations/20261015000025_expense_and_income_categories_rls_and_seeds.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Grant table permissions on public.expense_categories and public.income_categories
--   2. Add Row Level Security (RLS) policies for SELECT, INSERT, UPDATE, DELETE on categories
--   3. Ensure comprehensive standard expense & income categories exist so transactions are never blocked
-- ==============================================================================

-- 1. Table Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT ON public.expense_categories TO anon;
GRANT ALL ON public.expense_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT SELECT ON public.income_categories TO anon;
GRANT ALL ON public.income_categories TO service_role;

-- 2. Expense Categories RLS Policies
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_select_policy ON public.expense_categories;
CREATE POLICY expense_categories_select_policy ON public.expense_categories
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS expense_categories_insert_policy ON public.expense_categories;
CREATE POLICY expense_categories_insert_policy ON public.expense_categories
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS expense_categories_update_policy ON public.expense_categories;
CREATE POLICY expense_categories_update_policy ON public.expense_categories
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS expense_categories_delete_policy ON public.expense_categories;
CREATE POLICY expense_categories_delete_policy ON public.expense_categories
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- 3. Income Categories RLS Policies
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS income_categories_select_policy ON public.income_categories;
CREATE POLICY income_categories_select_policy ON public.income_categories
FOR SELECT TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS income_categories_insert_policy ON public.income_categories;
CREATE POLICY income_categories_insert_policy ON public.income_categories
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS income_categories_update_policy ON public.income_categories;
CREATE POLICY income_categories_update_policy ON public.income_categories
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS income_categories_delete_policy ON public.income_categories;
CREATE POLICY income_categories_delete_policy ON public.income_categories
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

-- 4. Seed Standard Expense Categories (Idempotent)
INSERT INTO public.expense_categories (name, description, is_active)
VALUES
    ('Electric Bill', 'মাসিক ডেসকো / ডিপিডিসি বিদ্যুৎ বিল', true),
    ('Water & Gas', 'ওয়াসা পানি ও এলপি সিলিন্ডার গ্যাস রিফিল', true),
    ('Internet & WiFi', 'উচ্চগতির ব্রডব্যান্ড ইন্টারনেট সাবস্ক্রিপশন', true),
    ('Maintenance & Repairs', 'প্লাম্বিং, স্যানিটারি, বৈদ্যুতিক মেরামত ও রং কাজ', true),
    ('Cook & Cleaner Salary', 'বাবুর্চি, সহকারী ও ক্লিনিং স্টাফদের বেতন', true),
    ('Cleaning Supplies', 'হারপিক, ব্লিচিং, ফ্লোর ক্লিনার ও ময়লার ব্যাগ', true),
    ('Dining & Grocery', 'হোস্টেল মেসের যৌথ ডাইনিং কাঁচাবাজার ও মুদি সামগ্রী', true),
    ('Generator & Fuel', 'জরুরি পাওয়ার ব্যাকআপ ও জেনারেটরের ডিজেল খরচ', true),
    ('Miscellaneous', 'হোস্টেল পরিচালনার অন্যান্য আকস্মিক খরচ', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

-- 5. Seed Standard Income Categories (Idempotent)
INSERT INTO public.income_categories (name, description, is_active)
VALUES
    ('Guest Stay Fee', 'মেহমান/অতিথিদের দৈনিক থাকার ফি', true),
    ('Scrap Sale', 'পুরাতন কার্টন, খবরের কাগজ ও লোহালক্কড় বিক্রয়লব্ধ আয়', true),
    ('Hall & Space Usage', 'কমন স্পেস বা রিডিং রুম বিশেষ ইভেন্ট বুকিং ফি', true),
    ('WiFi Extra Device Fee', 'বর্ডারদের অতিরিক্ত ল্যাপটপ/ডিভাইস সংযোগ চার্জ', true),
    ('Fridge & Appliance Fee', 'ব্যক্তিগত অতিরিক্ত হিটার/ফ্রিজ ব্যবহারের বিশেষ চার্জ', true),
    ('Late Payment Fine', 'মাসিক ভাড়া নির্ধারিত সময়ের পরে জমার বিলম্ব জরিমানা', true),
    ('Miscellaneous', 'অন্যান্য আনুষঙ্গিক রাজস্ব ও নন-রেন্ট প্রাপ্তি', true)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    is_active = true;

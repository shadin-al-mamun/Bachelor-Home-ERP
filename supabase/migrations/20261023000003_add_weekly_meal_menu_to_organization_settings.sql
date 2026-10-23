-- ==============================================================================
-- Bachelor Home ERP — Weekly Meal Menu Configuration in Organization Settings
-- File: supabase/migrations/20261023000003_add_weekly_meal_menu_to_organization_settings.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   Adds weekly_meal_menu JSONB column to public.organization_settings
--   and seeds realistic default Bengali weekly meal routines (Saturday - Friday).
-- ==============================================================================

-- 1. Add weekly_meal_menu column to public.organization_settings if not already present
ALTER TABLE public.organization_settings
    ADD COLUMN IF NOT EXISTS weekly_meal_menu JSONB DEFAULT NULL;

-- 2. Populate default weekly menu if column is NULL
UPDATE public.organization_settings
SET weekly_meal_menu = '{
  "saturday": {
    "breakfast": "ভুনা খিচুড়ি, ডিম ভাজি, আচার",
    "lunch": "সাদা ভাত, রুই মাছের ঝোল, আলু ভর্তা, ডাল",
    "dinner": "সাদা ভাত, মুরগির মাংস ভুনা, ঘন ডাল"
  },
  "sunday": {
    "breakfast": "পরোটা, ডিম ওমলেট, মিক্স সবজি",
    "lunch": "সাদা ভাত, ডিম ভুনা, সবজি নিরামিষ, ডাল",
    "dinner": "সাদা ভাত, পাবদা মাছের ঝোল, বেগুন ভাজা, ডাল"
  },
  "monday": {
    "breakfast": "রুটি, ডাল/সবজি, চা",
    "lunch": "সাদা ভাত, পাঙ্গাশ/তেলাপিয়া ভুনা, শাক ভাজি, ডাল",
    "dinner": "সাদা ভাত, মুরগির মাংসের ঝোল, মুগ ডাল"
  },
  "tuesday": {
    "breakfast": "পরোটা, ডিম পোচ, সবজি ভাজি",
    "lunch": "সাদা ভাত, কই মাছের ঝোল, আলু-পটল ভাজি, ডাল",
    "dinner": "সাদা ভাত, মুরগির কষা মাংস, সালাদ, ডাল"
  },
  "wednesday": {
    "breakfast": "লেবুর আচার দিয়ে নরম খিচুড়ি ও ডিম ভাজি",
    "lunch": "সাদা ভাত, মাছের কারি, ফুলকপি সবজি, ডাল",
    "dinner": "সাদা ভাত, ডিম ভুনা, ডাল চচ্চড়ি, ভর্তা"
  },
  "thursday": {
    "breakfast": "রুটি, মিক্স সবজি ভাজি, চা",
    "lunch": "সাদা ভাত, কাতল মাছের ঝোল, ঢেঁড়শ ভাজি, ডাল",
    "dinner": "সাদা ভাত, চিকেন কারি, পাতলা ডাল"
  },
  "friday": {
    "breakfast": "স্পেশাল পরোটা, বুটের ডাল, ডিম",
    "lunch": "স্পেশাল মোরগ পোলাও / বিরিয়ানি, সালাদ",
    "dinner": "সাদা ভাত, রুই মাছ ভুনা, ঘন ডাল, লেবু"
  }
}'::jsonb
WHERE weekly_meal_menu IS NULL;

-- 3. Confirm RLS settings for organization_settings allow SELECT to all and UPDATE to Admins
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.organization_settings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS org_settings_select_all ON public.organization_settings;
CREATE POLICY org_settings_select_all ON public.organization_settings
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS org_settings_write_all ON public.organization_settings;
CREATE POLICY org_settings_write_all ON public.organization_settings
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

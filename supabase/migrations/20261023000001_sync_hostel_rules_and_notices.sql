-- ==============================================================================
-- Bachelor Home ERP — Sync Hostel Notices & Hostel Residential Rules Schema
-- File: supabase/migrations/20261023000001_sync_hostel_rules_and_notices.sql
-- Run this script in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Ensure public.hostel_notices table exists with all required columns
CREATE TABLE IF NOT EXISTS public.hostel_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO',
    target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL',
    target_flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    target_flat_name VARCHAR(150) DEFAULT NULL,
    target_boarder_id UUID REFERENCES public.boarders(id) ON DELETE SET NULL,
    target_boarder_name VARCHAR(150) DEFAULT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name VARCHAR(150) DEFAULT 'সুপারএডমিন',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- Ensure all columns exist even if table was created in an older schema
ALTER TABLE public.hostel_notices
    ADD COLUMN IF NOT EXISTS target_flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_flat_name VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS target_boarder_id UUID REFERENCES public.boarders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_boarder_name VARCHAR(150) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(150) DEFAULT 'সুপারএডমিন',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_hostel_notices_active_created ON public.hostel_notices(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hostel_notices_target_boarder ON public.hostel_notices(target_boarder_id);
CREATE INDEX IF NOT EXISTS idx_hostel_notices_target_flat ON public.hostel_notices(target_flat_id);

-- Enable RLS and setup robust policies
ALTER TABLE public.hostel_notices ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.hostel_notices TO authenticated, anon, service_role;

DROP POLICY IF EXISTS hostel_notices_select_policy ON public.hostel_notices;
DROP POLICY IF EXISTS hostel_notices_select_all ON public.hostel_notices;
CREATE POLICY hostel_notices_select_policy ON public.hostel_notices
FOR SELECT TO authenticated, anon
USING (
    is_active = true
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    )
);

DROP POLICY IF EXISTS hostel_notices_insert_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_insert_policy ON public.hostel_notices
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS hostel_notices_update_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_update_policy ON public.hostel_notices
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS hostel_notices_delete_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_delete_policy ON public.hostel_notices
FOR DELETE TO authenticated
USING (true);


-- ==============================================================================
-- 2. Ensure public.organization_settings table exists with hostel_rules
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name VARCHAR(150) NOT NULL DEFAULT 'ব্যাচেলর হোম ইআরপি',
    short_name VARCHAR(50) NOT NULL DEFAULT 'ব্যাচেলর হোম',
    tagline VARCHAR(255) DEFAULT 'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট',
    address TEXT DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    emergency_contact VARCHAR(50) DEFAULT NULL,
    receipt_footer_note TEXT DEFAULT 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।',
    receipt_prefix VARCHAR(20) DEFAULT 'RCT',
    logo_url TEXT DEFAULT '/pwa-512x512.svg',
    app_icon_url TEXT DEFAULT '/pwa-192x192.svg',
    favicon_url TEXT DEFAULT '/favicon.svg',
    primary_color VARCHAR(20) DEFAULT '#6366f1',
    hostel_rules TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

ALTER TABLE public.organization_settings
    ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT DEFAULT 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।',
    ADD COLUMN IF NOT EXISTS receipt_prefix VARCHAR(20) DEFAULT 'RCT',
    ADD COLUMN IF NOT EXISTS hostel_rules TEXT DEFAULT NULL;

-- Insert initial record if table is empty
INSERT INTO public.organization_settings (
    org_name,
    short_name,
    tagline,
    logo_url,
    app_icon_url,
    favicon_url,
    primary_color,
    hostel_rules
)
SELECT
    'ব্যাচেলর হোম ইআরপি',
    'ব্যাচেলর হোম',
    'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট',
    '/pwa-512x512.svg',
    '/pwa-192x192.svg',
    '/favicon.svg',
    '#6366f1',
    'খাবার অন/অফ প্রতিদিন রাত ১০:০০ টার মধ্যে সম্পন্ন করতে হবে।
মাসের ১০ তারিখের মধ্যে মাসিক সিট ভাড়া ও মেস বিল পরিশোধ করতে হবে।
হোস্টেলের মূল গেট রাত ১১:০০ টায় বন্ধ হয়ে যায়।
বহিরাগত মেহমান নিয়ে আসার ক্ষেত্রে পূর্বানুমতি প্রযোজ্য।'
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_settings
);

-- Enable RLS for organization_settings
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

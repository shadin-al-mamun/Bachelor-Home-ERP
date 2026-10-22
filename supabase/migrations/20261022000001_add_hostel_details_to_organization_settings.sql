-- ==============================================================================
-- Bachelor Home ERP — Organization Settings & Hostel Configuration Table
-- File: supabase/migrations/20261022000001_add_hostel_details_to_organization_settings.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   Creates the public.organization_settings table if it doesn't exist yet,
--   adds all required hostel details, contact info, and receipt settings,
--   and configures RLS security policies.
-- ==============================================================================

-- 1. Create table if it doesn't exist yet
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
    access_control_permissions JSONB DEFAULT NULL,
    hostel_rules TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- 2. If table already existed previously, ensure all new columns exist
ALTER TABLE public.organization_settings
    ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT DEFAULT 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।',
    ADD COLUMN IF NOT EXISTS receipt_prefix VARCHAR(20) DEFAULT 'RCT',
    ADD COLUMN IF NOT EXISTS hostel_rules TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS access_control_permissions JSONB DEFAULT NULL;

-- 3. Insert initial record if table is currently empty
INSERT INTO public.organization_settings (
    org_name,
    short_name,
    tagline,
    logo_url,
    app_icon_url,
    favicon_url,
    primary_color
)
SELECT
    'ব্যাচেলর হোম ইআরপি',
    'ব্যাচেলর হোম',
    'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট',
    '/pwa-512x512.svg',
    '/pwa-192x192.svg',
    '/favicon.svg',
    '#6366f1'
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_settings
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.organization_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated, service_role;

-- Public can read branding & hostel settings (needed for login page, receipt print & PWA splash)
DROP POLICY IF EXISTS org_settings_select_all ON public.organization_settings;
CREATE POLICY org_settings_select_all ON public.organization_settings
FOR SELECT TO anon, authenticated
USING (true);

-- Only SuperAdmin and Admin can update hostel settings
DROP POLICY IF EXISTS org_settings_admin_write ON public.organization_settings;
CREATE POLICY org_settings_admin_write ON public.organization_settings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN')
    )
);

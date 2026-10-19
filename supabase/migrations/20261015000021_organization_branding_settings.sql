-- ==============================================================================
-- Bachelor Home ERP — Migration 000021: Organization Branding & Logo Settings
-- File: supabase/migrations/20261015000021_organization_branding_settings.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   1. Creates public.organization_settings table to persist custom hostel logo,
--      short name, and branding across all devices.
--   2. Enables Row Level Security (RLS) with unrestricted read access for all
--      authenticated and anonymous users (so PWA and splash screens show logo).
--   3. Restricts write access to SUPER_ADMIN and ADMIN roles.
-- ==============================================================================

-- 1. CREATE TABLE
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_name VARCHAR(150) NOT NULL DEFAULT 'Bachelor Home',
    short_name VARCHAR(50) NOT NULL DEFAULT 'Bachelor Home',
    tagline VARCHAR(255) DEFAULT 'স্মার্ট হোস্টেল ও মেস ম্যানেজমেন্ট ERP',
    logo_url TEXT,
    app_icon_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

-- 2. INSERT INITIAL DEFAULT ROW IF NOT EXISTS
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
    'Bachelor Home',
    'Bachelor Home',
    'স্মার্ট হোস্টেল ও মেস ম্যানেজমেন্ট ERP',
    '/pwa-512x512.svg',
    '/pwa-192x192.svg',
    '/favicon.svg',
    '#6366f1'
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_settings
);

-- 3. ENABLE RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.organization_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated, service_role;

DROP POLICY IF EXISTS org_settings_select_all ON public.organization_settings;
CREATE POLICY org_settings_select_all ON public.organization_settings
FOR SELECT TO anon, authenticated
USING (true);

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

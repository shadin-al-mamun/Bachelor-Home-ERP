-- ==============================================================================
-- Bachelor Home ERP — Migration 000022: Add Hostel Details to Organization Settings
-- File: supabase/migrations/20261022000001_add_hostel_details_to_organization_settings.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Description:
--   Adds address, hotline/phone, email, emergency contact, and receipt footer notes
--   to public.organization_settings so they can be configured by SUPER_ADMIN
--   and displayed dynamically on receipts, vouchers, reports, and headers.
-- ==============================================================================

ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT 'ধানমন্ডি, ঢাকা-১২০৫',
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '০১৭৪৪-০০০০০০',
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT 'info@bachelorhome.com',
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50) DEFAULT '০১৭১১-০০০০০০',
  ADD COLUMN IF NOT EXISTS receipt_footer_note TEXT DEFAULT 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।',
  ADD COLUMN IF NOT EXISTS receipt_prefix VARCHAR(20) DEFAULT 'RCT';

-- Update existing default record if fields are null
UPDATE public.organization_settings
SET
  address = COALESCE(address, 'ধানমন্ডি, ঢাকা-১২০৫'),
  phone = COALESCE(phone, '০১৭৪৪-০০০০০০'),
  email = COALESCE(email, 'info@bachelorhome.com'),
  emergency_contact = COALESCE(emergency_contact, '০১৭১১-০০০০০০'),
  receipt_footer_note = COALESCE(receipt_footer_note, 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।'),
  receipt_prefix = COALESCE(receipt_prefix, 'RCT')
WHERE id IS NOT NULL;

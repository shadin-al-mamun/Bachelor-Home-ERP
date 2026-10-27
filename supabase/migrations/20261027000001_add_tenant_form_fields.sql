-- Migration: Add Police Verification / DMP Tenant Registration Form fields to public.boarders
-- Date: 2026-10-27

ALTER TABLE public.boarders 
ADD COLUMN IF NOT EXISTS father_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) DEFAULT 'অবিবাহিত',
ADD COLUMN IF NOT EXISTS religion VARCHAR(50) DEFAULT 'ইসলাম',
ADD COLUMN IF NOT EXISTS educational_qualification VARCHAR(150),
ADD COLUMN IF NOT EXISTS occupation VARCHAR(150),
ADD COLUMN IF NOT EXISTS workplace_address TEXT,
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150),
ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
ADD COLUMN IF NOT EXISTS emergency_contact_address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);

COMMENT ON COLUMN public.boarders.father_name IS 'Tenant father name for police verification form';
COMMENT ON COLUMN public.boarders.date_of_birth IS 'Tenant birth date for police verification form';
COMMENT ON COLUMN public.boarders.marital_status IS 'Tenant marital status (e.g. অবিবাহিত, বিবাহিত)';
COMMENT ON COLUMN public.boarders.religion IS 'Tenant religion (e.g. ইসলাম, হিন্দু)';
COMMENT ON COLUMN public.boarders.educational_qualification IS 'Tenant highest education level';
COMMENT ON COLUMN public.boarders.occupation IS 'Tenant profession / occupation';
COMMENT ON COLUMN public.boarders.workplace_address IS 'Tenant institution or office address';
COMMENT ON COLUMN public.boarders.passport_number IS 'Tenant passport number if available';
COMMENT ON COLUMN public.boarders.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN public.boarders.emergency_contact_relation IS 'Relationship with emergency contact';
COMMENT ON COLUMN public.boarders.emergency_contact_address IS 'Emergency contact address';
COMMENT ON COLUMN public.boarders.emergency_contact_phone IS 'Emergency contact phone number';

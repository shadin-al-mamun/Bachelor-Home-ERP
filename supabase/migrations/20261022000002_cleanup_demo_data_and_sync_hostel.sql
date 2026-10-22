-- Migration: Cleanup Demo Data and Sync Hostel Details
-- Description:
-- 1. Updates building name in public.buildings from old demo 'Sunflower Hostel' to the real hostel name configured in organization_settings
-- 2. Provides cleanup for demo boarder 'আল ইমরান' (BDR-2026-3688) so real boarders take precedence

DO $$
DECLARE
    v_real_hostel_name TEXT;
BEGIN
    -- 1. Fetch real hostel name from organization_settings if present
    SELECT org_name INTO v_real_hostel_name
    FROM public.organization_settings
    LIMIT 1;

    IF v_real_hostel_name IS NOT NULL AND v_real_hostel_name <> '' THEN
        -- Update building name to match real hostel name
        UPDATE public.buildings
        SET name = v_real_hostel_name,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE name ILIKE '%Sunflower%' OR name ILIKE '%সানফ্লাওয়ার%';
    ELSE
        -- Fallback to clean name
        UPDATE public.buildings
        SET name = 'হোস্টেল মেইন ভবন',
            updated_at = timezone('Asia/Dhaka', now())
        WHERE name ILIKE '%Sunflower%' OR name ILIKE '%সানফ্লাওয়ার%';
    END IF;

    -- Clean up generic demo flat names if any
    UPDATE public.flats
    SET name = 'ফ্ল্যাট ১'
    WHERE name = 'ফ্ল্যাট';

    -- Clean up generic demo room names if any
    UPDATE public.rooms
    SET name = 'রুম ১০১'
    WHERE name = 'রুম';

END $$;

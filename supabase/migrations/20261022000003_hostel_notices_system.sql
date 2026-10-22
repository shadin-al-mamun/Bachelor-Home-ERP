-- ==============================================================================
-- Bachelor Home ERP — Migration 000003: Hostel Notices & Announcements System
-- File: supabase/migrations/20261022000003_hostel_notices_system.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- ==============================================================================

-- 1. Create hostel_notices table
CREATE TABLE IF NOT EXISTS public.hostel_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'INFO', -- 'INFO', 'ALERT', 'WARNING', 'MEAL'
    target_audience VARCHAR(50) NOT NULL DEFAULT 'ALL', -- 'ALL', 'FLAT', 'SPECIFIC'
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

ALTER TABLE public.hostel_notices
    ADD COLUMN IF NOT EXISTS target_flat_id UUID REFERENCES public.flats(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_flat_name VARCHAR(150) DEFAULT NULL;

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_hostel_notices_active_created ON public.hostel_notices(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hostel_notices_target_boarder ON public.hostel_notices(target_boarder_id);
CREATE INDEX IF NOT EXISTS idx_hostel_notices_target_flat ON public.hostel_notices(target_flat_id);

-- Enable RLS
ALTER TABLE public.hostel_notices ENABLE ROW LEVEL SECURITY;

-- Select policy: Staff can see all notices; Boarders can see active notices addressed to ALL, to their FLAT, or to themselves
DROP POLICY IF EXISTS hostel_notices_select_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_select_policy ON public.hostel_notices
FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'AUDITOR')
    OR (
        is_active = true
        AND (
            target_audience = 'ALL'
            OR target_boarder_id IN (
                SELECT id FROM public.boarders WHERE user_id = auth.uid() OR phone_number IN (
                    SELECT phone_number FROM public.profiles WHERE id = auth.uid()
                )
            )
            OR (
                target_audience = 'FLAT'
                AND target_flat_id IN (
                    SELECT r.flat_id
                    FROM public.boarder_allocations ba
                    JOIN public.seats s ON s.id = ba.seat_id
                    JOIN public.rooms r ON r.id = s.room_id
                    JOIN public.boarders b ON b.id = ba.boarder_id
                    WHERE ba.status = 'ACTIVE'
                    AND (b.user_id = auth.uid() OR b.phone_number IN (
                        SELECT phone_number FROM public.profiles WHERE id = auth.uid()
                    ))
                )
            )
        )
    )
);

-- Insert policy: SuperAdmin, Admin, and Manager can create notices
DROP POLICY IF EXISTS hostel_notices_insert_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_insert_policy ON public.hostel_notices
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

-- Update/Delete policy: Staff can update/delete notices
DROP POLICY IF EXISTS hostel_notices_update_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_update_policy ON public.hostel_notices
FOR UPDATE TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
)
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

DROP POLICY IF EXISTS hostel_notices_delete_policy ON public.hostel_notices;
CREATE POLICY hostel_notices_delete_policy ON public.hostel_notices
FOR DELETE TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
);

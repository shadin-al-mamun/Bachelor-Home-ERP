-- ==============================================================================
-- Bachelor Home ERP — Migration 000006: RLS Policies, Audit Triggers & Reporting Views
-- File: supabase/migrations/20261015000006_rls_audit_and_views.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. AUDIT LOGS & NOTIFICATIONS TABLES

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    actor_id UUID REFERENCES public.profiles(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'INFO', 'WARNING', 'ALERT', 'MEAL'
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.system_notifications(recipient_id) WHERE is_read = false;

-- 2. RLS SECURITY HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role::VARCHAR FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'ADMIN') AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.has_flat_access(p_flat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT public.is_admin_or_owner() OR EXISTS (
        SELECT 1 FROM public.user_flat_assignments 
        WHERE user_id = auth.uid() AND flat_id = p_flat_id
    );
$$;

-- 3. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boarder_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_change_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- 4.1 PROFILES POLICIES
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT TO authenticated
USING (
    id = auth.uid() 
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'AUDITOR', 'ACCOUNTANT', 'MANAGER')
);

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
FOR ALL TO authenticated
USING (public.current_user_role() = 'SUPER_ADMIN')
WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

-- 4.2 ACCOMMODATION POLICIES (Buildings, Flats, Rooms, Seats)
DROP POLICY IF EXISTS buildings_select ON public.buildings;
CREATE POLICY buildings_select ON public.buildings
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS buildings_admin_write ON public.buildings;
CREATE POLICY buildings_admin_write ON public.buildings
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS flats_select ON public.flats;
CREATE POLICY flats_select ON public.flats
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner() 
    OR public.has_flat_access(id)
    OR public.current_user_role() IN ('ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS flats_admin_write ON public.flats;
CREATE POLICY flats_admin_write ON public.flats
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
FOR SELECT TO authenticated
USING (
    public.is_admin_or_owner() 
    OR public.has_flat_access(flat_id)
    OR public.current_user_role() IN ('ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS rooms_admin_write ON public.rooms;
CREATE POLICY rooms_admin_write ON public.rooms
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

DROP POLICY IF EXISTS seats_select ON public.seats;
CREATE POLICY seats_select ON public.seats
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS seats_admin_write ON public.seats;
CREATE POLICY seats_admin_write ON public.seats
FOR ALL TO authenticated
USING (public.is_admin_or_owner())
WITH CHECK (public.is_admin_or_owner());

-- 4.3 BOARDERS POLICIES
DROP POLICY IF EXISTS boarders_select_policy ON public.boarders;
CREATE POLICY boarders_select_policy ON public.boarders
FOR SELECT TO authenticated
USING (
    user_id = auth.uid() 
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (
        public.current_user_role() = 'MANAGER' AND EXISTS (
            SELECT 1 FROM public.allocations a
            JOIN public.seats s ON s.id = a.seat_id
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.user_flat_assignments ufa ON ufa.flat_id = r.flat_id
            WHERE a.boarder_id = public.boarders.id AND ufa.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS applicant_insert_policy ON public.boarders;
CREATE POLICY applicant_insert_policy ON public.boarders
FOR INSERT TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND status = 'PENDING'
);

DROP POLICY IF EXISTS boarder_self_update_pending ON public.boarders;
CREATE POLICY boarder_self_update_pending ON public.boarders
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'PENDING')
WITH CHECK (user_id = auth.uid() AND status = 'PENDING');

DROP POLICY IF EXISTS boarders_admin_manage ON public.boarders;
CREATE POLICY boarders_admin_manage ON public.boarders
FOR ALL TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 4.4 ALLOCATIONS POLICIES
DROP POLICY IF EXISTS allocations_select ON public.allocations;
CREATE POLICY allocations_select ON public.allocations
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (
        public.current_user_role() = 'MANAGER' AND EXISTS (
            SELECT 1 FROM public.seats s
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.user_flat_assignments ufa ON ufa.flat_id = r.flat_id
            WHERE s.id = public.allocations.seat_id AND ufa.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS allocations_admin_write ON public.allocations;
CREATE POLICY allocations_admin_write ON public.allocations
FOR ALL TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

-- 4.5 RECEIPTS & ALLOCATIONS POLICIES
DROP POLICY IF EXISTS receipts_select_policy ON public.receipts;
CREATE POLICY receipts_select_policy ON public.receipts
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND received_by = auth.uid())
);

DROP POLICY IF EXISTS receipts_insert_policy ON public.receipts;
CREATE POLICY receipts_insert_policy ON public.receipts
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND received_by = auth.uid()
);

DROP POLICY IF EXISTS receipts_no_direct_update ON public.receipts;
CREATE POLICY receipts_no_direct_update ON public.receipts
FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS receipts_no_direct_delete ON public.receipts;
CREATE POLICY receipts_no_direct_delete ON public.receipts
FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS receipt_allocations_select ON public.receipt_allocations;
CREATE POLICY receipt_allocations_select ON public.receipt_allocations
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS receipt_allocations_insert ON public.receipt_allocations;
CREATE POLICY receipt_allocations_insert ON public.receipt_allocations
FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'));

-- 4.6 EXPENSES & INCOMES POLICIES
DROP POLICY IF EXISTS expenses_select ON public.expenses;
CREATE POLICY expenses_select ON public.expenses
FOR SELECT TO authenticated
USING (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
    OR (public.current_user_role() = 'MANAGER' AND paid_by = auth.uid())
);

DROP POLICY IF EXISTS expenses_insert ON public.expenses;
CREATE POLICY expenses_insert ON public.expenses
FOR INSERT TO authenticated
WITH CHECK (
    public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
    AND paid_by = auth.uid()
);

DROP POLICY IF EXISTS expenses_no_direct_delete ON public.expenses;
CREATE POLICY expenses_no_direct_delete ON public.expenses
FOR DELETE TO authenticated USING (false);

-- 4.7 MANAGER CASH SESSIONS POLICIES
DROP POLICY IF EXISTS cash_sessions_select_policy ON public.manager_cash_sessions;
CREATE POLICY cash_sessions_select_policy ON public.manager_cash_sessions
FOR SELECT TO authenticated
USING (
    manager_id = auth.uid()
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR')
);

DROP POLICY IF EXISTS cash_sessions_update_policy ON public.manager_cash_sessions;
CREATE POLICY cash_sessions_update_policy ON public.manager_cash_sessions
FOR UPDATE TO authenticated
USING (
    (manager_id = auth.uid() AND status IN ('OPEN', 'REOPENED'))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
)
WITH CHECK (
    (manager_id = auth.uid() AND status IN ('OPEN', 'SUBMITTED'))
    OR public.current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);

-- 4.8 MEAL SELECTIONS POLICIES
DROP POLICY IF EXISTS meal_selections_select_policy ON public.meal_selections;
CREATE POLICY meal_selections_select_policy ON public.meal_selections
FOR SELECT TO authenticated
USING (
    boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid())
    OR public.is_admin_or_owner()
    OR public.has_flat_access(flat_id)
    OR public.current_user_role() = 'MEAL_OPERATOR'
);

-- Direct client INSERT/UPDATE/DELETE blocked—must use fn_toggle_meal_selection()
DROP POLICY IF EXISTS meal_selections_rpc_only_insert ON public.meal_selections;
CREATE POLICY meal_selections_rpc_only_insert ON public.meal_selections
FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS meal_selections_rpc_only_update ON public.meal_selections;
CREATE POLICY meal_selections_rpc_only_update ON public.meal_selections
FOR UPDATE TO authenticated USING (false);

-- 4.9 AUDIT LOGS POLICIES
DROP POLICY IF EXISTS audit_logs_read ON public.audit_logs;
CREATE POLICY audit_logs_read ON public.audit_logs
FOR SELECT TO authenticated
USING (public.current_user_role() IN ('SUPER_ADMIN', 'AUDITOR'));

DROP POLICY IF EXISTS audit_logs_no_write ON public.audit_logs;
CREATE POLICY audit_logs_no_write ON public.audit_logs
FOR INSERT TO authenticated WITH CHECK (false);

-- 4.10 SYSTEM NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS notifications_self ON public.system_notifications;
CREATE POLICY notifications_self ON public.system_notifications
FOR ALL TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- 5. AUTOMATED AUDIT TRIGGER IMPLEMENTATION
CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old JSONB := NULL;
    v_new JSONB := NULL;
    v_action audit_action;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (
        table_name, record_id, action, old_data, new_data, actor_id
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_action,
        v_old,
        v_new,
        auth.uid()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_allocations ON public.allocations;
CREATE TRIGGER trg_audit_allocations
AFTER INSERT OR UPDATE OR DELETE ON public.allocations
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_receipts ON public.receipts;
CREATE TRIGGER trg_audit_receipts
AFTER INSERT OR UPDATE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_expenses ON public.expenses;
CREATE TRIGGER trg_audit_expenses
AFTER INSERT OR UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_manager_cash_sessions ON public.manager_cash_sessions;
CREATE TRIGGER trg_audit_manager_cash_sessions
AFTER INSERT OR UPDATE ON public.manager_cash_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_boarder_charges ON public.boarder_charges;
CREATE TRIGGER trg_audit_boarder_charges
AFTER INSERT OR UPDATE ON public.boarder_charges
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

-- 6. REPORTING & ANALYTICAL SQL VIEWS

-- 6.1 MANAGER DAILY RECONCILIATION VIEW
CREATE OR REPLACE VIEW public.vw_manager_daily_reconciliation AS
SELECT 
    mcs.id AS session_id,
    mcs.session_date,
    p.full_name AS manager_name,
    p.phone_number AS manager_phone,
    fa.account_name,
    mcs.opening_cash,
    mcs.cash_receipts,
    mcs.cash_expenses,
    mcs.cash_deposited_to_owner,
    mcs.cash_handed_over_in,
    mcs.cash_handed_over_out,
    mcs.expected_closing_cash,
    mcs.actual_counted_cash,
    mcs.cash_variance,
    mcs.variance_explanation,
    mcs.status,
    mcs.submitted_at
FROM public.manager_cash_sessions mcs
JOIN public.profiles p ON p.id = mcs.manager_id
JOIN public.financial_accounts fa ON fa.id = mcs.account_id;

-- 6.2 FLAT-WISE DAILY MEAL SUMMARY VIEW
CREATE OR REPLACE VIEW public.vw_flat_daily_meal_summary AS
SELECT 
    ms.meal_date,
    b.name AS building_name,
    f.id AS flat_id,
    f.name AS flat_name,
    f.flat_code,
    COUNT(ms.id) FILTER (WHERE ms.breakfast = true) AS breakfast_count,
    COUNT(ms.id) FILTER (WHERE ms.lunch = true) AS lunch_count,
    COUNT(ms.id) FILTER (WHERE ms.dinner = true) AS dinner_count,
    (COUNT(ms.id) FILTER (WHERE ms.breakfast = true) +
     COUNT(ms.id) FILTER (WHERE ms.lunch = true) +
     COUNT(ms.id) FILTER (WHERE ms.dinner = true)) AS total_meals
FROM public.flats f
JOIN public.buildings b ON b.id = f.building_id
LEFT JOIN public.meal_selections ms ON ms.flat_id = f.id
GROUP BY ms.meal_date, b.name, f.id, f.name, f.flat_code;

-- 6.3 BOARDER DUES & AGING SUMMARY VIEW
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
SELECT 
    b.id AS boarder_id,
    b.boarder_code,
    b.full_name,
    b.phone_number,
    f.name AS flat_name,
    s.seat_name,
    COALESCE(SUM(bc.amount), 0.00) AS total_billed,
    COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(bc.due_amount), 0.00) AS total_outstanding_due,
    COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN public.boarder_charges bc ON bc.boarder_id = b.id AND bc.status IN ('UNPAID', 'PARTIALLY_PAID')
GROUP BY b.id, b.boarder_code, b.full_name, b.phone_number, f.name, s.seat_name;

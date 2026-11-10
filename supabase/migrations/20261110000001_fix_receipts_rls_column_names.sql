-- ==============================================================================
-- Bachelor Home ERP — Migration 20261110000001: Fix Receipts RLS Column Names & Total Billed Calculation
-- File: supabase/migrations/20261110000001_fix_receipts_rls_column_names.sql
-- Description:
--   1. Corrects column names in receipts RLS policy:
--      Uses received_by and destination_account_id (table public.receipts has received_by and destination_account_id,
--      NOT collected_by or account_id).
--   2. Updates get_executive_kpis RPC so v_total_billed is not artificially inflated when advance payments
--      exceed billed charges, preserving true billed demand and capping collection rate at 100%.
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- ==============================================================================

-- 1. FIX RECEIPTS RLS POLICY
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to view authorized receipts" ON public.receipts;
DROP POLICY IF EXISTS "receipts_select_policy" ON public.receipts;

CREATE POLICY "Allow users to view authorized receipts"
ON public.receipts
FOR SELECT
TO authenticated
USING (
    public.has_global_admin_privilege()
    OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MANAGER')
        AND (
            received_by = auth.uid()
            OR destination_account_id IN (
                SELECT id FROM public.financial_accounts WHERE assigned_manager_id = auth.uid()
            )
            OR (
                boarder_id IN (
                    SELECT a.boarder_id FROM public.allocations a
                    JOIN public.seats s ON a.seat_id = s.id
                    JOIN public.rooms r ON s.room_id = r.id
                    WHERE r.flat_id IN (SELECT flat_id FROM public.get_current_user_assigned_flats())
                )
            )
        )
    )
    OR boarder_id IN (SELECT id FROM public.boarders WHERE user_id = auth.uid() OR id = auth.uid())
);

-- 2. UPDATE GET_EXECUTIVE_KPIS RPC
DROP FUNCTION IF EXISTS public.get_executive_kpis();
DROP FUNCTION IF EXISTS public.get_executive_kpis(TEXT);

CREATE OR REPLACE FUNCTION public.get_executive_kpis(p_month TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_total_seats INT := 0;
    v_occupied_seats INT := 0;
    v_vacant_seats INT := 0;
    v_maintenance_seats INT := 0;
    v_occupancy_rate NUMERIC := 0;

    v_total_billed NUMERIC := 0;
    v_total_collected NUMERIC := 0;
    v_total_dues NUMERIC := 0;
    v_month_dues NUMERIC := 0;
    v_collection_rate NUMERIC := 0;

    v_expenses NUMERIC := 0;
    v_incomes NUMERIC := 0;
    v_noi NUMERIC := 0;

    v_active_boarders INT := 0;
    v_today_str TEXT := to_char(timezone('Asia/Dhaka', now()), 'YYYY-MM-DD');
    v_tomorrow_str TEXT := to_char(timezone('Asia/Dhaka', now()) + INTERVAL '1 day', 'YYYY-MM-DD');
    v_meals_today NUMERIC := 0;
    v_meals_tomorrow NUMERIC := 0;
    v_attendance_rate NUMERIC := 0;

    v_cash_in_custody NUMERIC := 0;

    v_is_all BOOLEAN := false;
    v_month_start DATE;
    v_next_month_start DATE;

    v_guest_today NUMERIC := 0;
    v_guest_tomorrow NUMERIC := 0;
BEGIN
    -- Determine filter mode
    IF p_month IS NULL OR UPPER(TRIM(p_month)) = 'ALL' THEN
        v_is_all := true;
    ELSE
        BEGIN
            v_month_start := to_date(TRIM(p_month) || '-01', 'YYYY-MM-DD');
            v_next_month_start := (v_month_start + INTERVAL '1 month')::DATE;
        EXCEPTION WHEN OTHERS THEN
            v_is_all := true;
        END;
    END IF;

    -- 1. Seats (Always Live Physical Count)
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'OCCUPIED'),
        COUNT(*) FILTER (WHERE status = 'AVAILABLE'),
        COUNT(*) FILTER (WHERE status = 'MAINTENANCE')
    INTO v_total_seats, v_occupied_seats, v_vacant_seats, v_maintenance_seats
    FROM public.seats;

    IF v_total_seats > 0 THEN
        v_occupancy_rate := ROUND((v_occupied_seats::NUMERIC / v_total_seats::NUMERIC) * 100, 1);
    END IF;

    -- 2. Charges & Billings
    IF v_is_all THEN
        SELECT 
            COALESCE(SUM(amount), 0),
            COALESCE(SUM(paid_amount), 0)
        INTO v_total_billed, v_total_collected
        FROM public.boarder_charges;

        DECLARE
            v_receipts_sum NUMERIC;
        BEGIN
            SELECT COALESCE(SUM(amount), 0)
            INTO v_receipts_sum
            FROM public.receipts
            WHERE is_void = false;

            IF v_receipts_sum > 0 THEN
                v_total_collected := GREATEST(v_total_collected, v_receipts_sum);
            END IF;
        END;

        SELECT COALESCE(SUM(amount - paid_amount), 0)
        INTO v_total_dues
        FROM public.boarder_charges
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID');

        v_month_dues := v_total_dues;
    ELSE
        SELECT 
            COALESCE(SUM(amount), 0),
            COALESCE(SUM(paid_amount), 0)
        INTO v_total_billed, v_total_collected
        FROM public.boarder_charges
        WHERE billing_month = v_month_start;

        DECLARE
            v_month_receipts NUMERIC;
        BEGIN
            SELECT COALESCE(SUM(amount), 0)
            INTO v_month_receipts
            FROM public.receipts
            WHERE is_void = false
              AND (timezone('Asia/Dhaka', receipt_date))::DATE >= v_month_start
              AND (timezone('Asia/Dhaka', receipt_date))::DATE < v_next_month_start;

            IF v_month_receipts > 0 THEN
                v_total_collected := GREATEST(v_total_collected, v_month_receipts);
            END IF;
        END;

        SELECT COALESCE(SUM(amount - paid_amount), 0)
        INTO v_month_dues
        FROM public.boarder_charges
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID')
          AND billing_month = v_month_start;

        -- Also calculate overall cumulative dues across all months
        SELECT COALESCE(SUM(amount - paid_amount), 0)
        INTO v_total_dues
        FROM public.boarder_charges
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID');
    END IF;

    -- Total billed demand: Preserve true billed invoice demand if charges exist;
    -- only fallback to collected + dues if charges haven't been generated yet (v_total_billed = 0).
    IF v_total_billed = 0 THEN
        v_total_billed := v_total_collected + v_month_dues;
    END IF;

    -- Collection rate is capped logically at 100%
    IF v_total_billed > 0 THEN
        v_collection_rate := LEAST(100.0, ROUND((v_total_collected / v_total_billed) * 100, 1));
    ELSIF v_total_collected > 0 THEN
        v_collection_rate := 100.0;
    ELSE
        v_collection_rate := 0.0;
    END IF;

    -- 3. Expenses & Operating Surplus (Approved expenses)
    IF v_is_all THEN
        SELECT COALESCE(SUM(amount), 0)
        INTO v_expenses
        FROM public.expenses
        WHERE approval_status = 'APPROVED';

        SELECT COALESCE(SUM(amount), 0)
        INTO v_incomes
        FROM public.incomes;
    ELSE
        SELECT COALESCE(SUM(amount), 0)
        INTO v_expenses
        FROM public.expenses
        WHERE approval_status = 'APPROVED'
          AND expense_date >= v_month_start
          AND expense_date < v_next_month_start;

        SELECT COALESCE(SUM(amount), 0)
        INTO v_incomes
        FROM public.incomes
        WHERE income_date >= v_month_start
          AND income_date < v_next_month_start;
    END IF;

    v_noi := (v_total_collected + v_incomes) - v_expenses;

    -- 4. Active Boarders & Meals (Always Live Operational Snapshot)
    SELECT COUNT(DISTINCT a.boarder_id) INTO v_active_boarders
    FROM public.allocations a
    JOIN public.boarders b ON b.id = a.boarder_id
    WHERE (a.status = 'ACTIVE' OR (a.status IN ('ENDED', 'CANCELLED') AND a.end_date >= (timezone('Asia/Dhaka', now()))::DATE))
      AND (a.start_date IS NULL OR a.start_date <= (timezone('Asia/Dhaka', now()))::DATE)
      AND (a.end_date IS NULL OR a.end_date >= (timezone('Asia/Dhaka', now()))::DATE)
      AND (b.status = 'ACTIVE' OR (b.leaving_date IS NOT NULL AND b.leaving_date >= (timezone('Asia/Dhaka', now()))::DATE))
      AND (b.admission_date IS NULL OR b.admission_date <= (timezone('Asia/Dhaka', now()))::DATE)
      AND b.boarder_code != 'BDR-2026-4071';

    IF v_active_boarders = 0 THEN
        SELECT COUNT(*) INTO v_active_boarders
        FROM public.boarders
        WHERE (status = 'ACTIVE' OR (leaving_date IS NOT NULL AND leaving_date >= (timezone('Asia/Dhaka', now()))::DATE))
          AND (admission_date IS NULL OR admission_date <= (timezone('Asia/Dhaka', now()))::DATE)
          AND boarder_code != 'BDR-2026-4071';
    END IF;

    -- Calculate today's meals (Breakfast weight = 0.5, Lunch/Dinner = 1.0)
    SELECT 
        COALESCE(SUM(
          (CASE WHEN ms.breakfast THEN 0.5 ELSE 0 END) + 
          (CASE WHEN ms.lunch THEN 1.0 ELSE 0 END) + 
          (CASE WHEN ms.dinner THEN 1.0 ELSE 0 END)
        ), 0)
    INTO v_meals_today
    FROM public.meal_selections ms
    JOIN public.allocations a ON a.boarder_id = ms.boarder_id
      AND (a.status = 'ACTIVE' OR (a.status IN ('ENDED', 'CANCELLED') AND a.end_date >= (timezone('Asia/Dhaka', now()))::DATE))
      AND (a.start_date IS NULL OR a.start_date <= (timezone('Asia/Dhaka', now()))::DATE)
      AND (a.end_date IS NULL OR a.end_date >= (timezone('Asia/Dhaka', now()))::DATE)
    WHERE ms.meal_date = v_today_str;

    -- If no meal_selections rows exist yet for active seated boarders, opt-out mess default is 2.5 meals/day
    IF v_meals_today = 0 AND v_active_boarders > 0 THEN
        v_meals_today := v_active_boarders * 2.5;
    END IF;

    -- Calculate tomorrow's meals (Breakfast weight = 0.5, Lunch/Dinner = 1.0)
    SELECT 
        COALESCE(SUM(
          (CASE WHEN ms.breakfast THEN 0.5 ELSE 0 END) + 
          (CASE WHEN ms.lunch THEN 1.0 ELSE 0 END) + 
          (CASE WHEN ms.dinner THEN 1.0 ELSE 0 END)
        ), 0)
    INTO v_meals_tomorrow
    FROM public.meal_selections ms
    JOIN public.allocations a ON a.boarder_id = ms.boarder_id
      AND (a.status = 'ACTIVE' OR (a.status IN ('ENDED', 'CANCELLED') AND a.end_date >= (timezone('Asia/Dhaka', now()) + INTERVAL '1 day')::DATE))
      AND (a.start_date IS NULL OR a.start_date <= (timezone('Asia/Dhaka', now()) + INTERVAL '1 day')::DATE)
      AND (a.end_date IS NULL OR a.end_date >= (timezone('Asia/Dhaka', now()) + INTERVAL '1 day')::DATE)
    WHERE ms.meal_date = v_tomorrow_str;

    IF v_meals_tomorrow = 0 AND v_active_boarders > 0 THEN
        v_meals_tomorrow := v_active_boarders * 2.5;
    END IF;

    -- Include confirmed guest meal bookings
    BEGIN
        SELECT COALESCE(SUM(guest_count * (CASE WHEN session = 'BREAKFAST' THEN 0.5 ELSE 1.0 END)), 0)
        INTO v_guest_today
        FROM public.guest_meal_bookings
        WHERE meal_date = v_today_str AND status = 'CONFIRMED';

        SELECT COALESCE(SUM(guest_count * (CASE WHEN session = 'BREAKFAST' THEN 0.5 ELSE 1.0 END)), 0)
        INTO v_guest_tomorrow
        FROM public.guest_meal_bookings
        WHERE meal_date = v_tomorrow_str AND status = 'CONFIRMED';

        v_meals_today := v_meals_today + v_guest_today;
        v_meals_tomorrow := v_meals_tomorrow + v_guest_tomorrow;
    EXCEPTION WHEN OTHERS THEN
        -- Safely ignore if guest_meal_bookings table has no rows or is locked
    END;

    IF v_active_boarders > 0 THEN
        v_attendance_rate := ROUND((v_meals_today::NUMERIC / (v_active_boarders * 2.5)::NUMERIC) * 100, 1);
    END IF;

    -- 5. Manager cash accounts balance (Always Live Physical Cash Balance)
    SELECT COALESCE(SUM(current_balance), 0)
    INTO v_cash_in_custody
    FROM public.financial_accounts
    WHERE is_active = true
      AND (
          account_type = 'CASH_MANAGER'
          OR account_number = 'MGR-CASH-01'
          OR (account_type NOT IN ('CASH_OWNER', 'BANK', 'MFS') AND (account_name ILIKE '%manager cash%' OR account_name LIKE '%ম্যানেজার ক্যাশ%'))
      );

    RETURN jsonb_build_object(
        'total_seats', v_total_seats,
        'occupied_seats', v_occupied_seats,
        'vacant_seats', v_vacant_seats,
        'maintenance_seats', v_maintenance_seats,
        'occupancy_rate', v_occupancy_rate,
        'total_billed_month', v_total_billed,
        'total_collected_month', v_total_collected,
        'collection_rate', v_collection_rate,
        'total_outstanding_dues', v_total_dues,
        'month_dues', v_month_dues,
        'operating_expenses_month', v_expenses,
        'non_rent_incomes_month', v_incomes,
        'net_operating_income', v_noi,
        'active_boarders_count', v_active_boarders,
        'active_meals_today', v_meals_today,
        'active_meals_tomorrow', v_meals_tomorrow,
        'meal_attendance_rate', v_attendance_rate,
        'cash_in_custody', v_cash_in_custody,
        'selected_month', COALESCE(p_month, 'ALL')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis(TEXT) TO authenticated, anon;

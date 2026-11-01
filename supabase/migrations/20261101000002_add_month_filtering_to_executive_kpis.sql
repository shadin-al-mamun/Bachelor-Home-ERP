-- ==============================================================================
-- Migration: 20261101000002_add_month_filtering_to_executive_kpis.sql
-- Description: Adds month filtering support to get_executive_kpis(p_month TEXT DEFAULT NULL).
--              Enables financial metrics (rent collection, bills, expenses, NOI) to be filtered
--              by any calendar month (e.g. '2026-11', '2026-10') or 'ALL' for lifetime totals,
--              while keeping live physical assets (seats, meals, manager cash) live.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_executive_kpis();
DROP FUNCTION IF EXISTS public.get_executive_kpis(TEXT);

CREATE OR REPLACE FUNCTION public.get_executive_kpis(p_month TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    v_meals_today INT := 0;
    v_meals_tomorrow INT := 0;
    v_attendance_rate NUMERIC := 0;

    v_cash_in_custody NUMERIC := 0;

    v_is_all BOOLEAN := false;
    v_month_start DATE;
    v_next_month_start DATE;
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

    v_total_billed := GREATEST(v_total_billed, v_total_collected + v_month_dues);

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
    SELECT COUNT(*) INTO v_active_boarders
    FROM public.boarders
    WHERE status = 'ACTIVE';

    SELECT 
        COALESCE(SUM((CASE WHEN breakfast THEN 1 ELSE 0 END) + (CASE WHEN lunch THEN 1 ELSE 0 END) + (CASE WHEN dinner THEN 1 ELSE 0 END)), 0)
    INTO v_meals_today
    FROM public.meal_selections
    WHERE meal_date = v_today_str;

    SELECT 
        COALESCE(SUM((CASE WHEN breakfast THEN 1 ELSE 0 END) + (CASE WHEN lunch THEN 1 ELSE 0 END) + (CASE WHEN dinner THEN 1 ELSE 0 END)), 0)
    INTO v_meals_tomorrow
    FROM public.meal_selections
    WHERE meal_date = v_tomorrow_str;

    IF v_active_boarders > 0 THEN
        v_attendance_rate := ROUND((v_meals_today::NUMERIC / (v_active_boarders * 3)::NUMERIC) * 100, 1);
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

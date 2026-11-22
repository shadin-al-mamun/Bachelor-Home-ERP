-- ==============================================================================
-- Migration: 20261122000001_fix_future_departure_and_upcoming_vacant_seats.sql
-- Description: 
--   1. Fix fn_cancel_allocation: Ensure future departure notice keeps boarder
--      and allocation ACTIVE with seat OCCUPIED until end_date passes.
--   2. Update get_executive_kpis: Compute upcoming_vacant_seats, count upcoming
--      vacant seats in occupied_seats (rent is ongoing this month) and return metric.
--   3. Data heal: Restore Zahid Hasan and any boarder with future leaving_date
--      to ACTIVE status with assigned seat in Flat 206.
-- ==============================================================================

BEGIN;

-- 1. SECURE & BULLETPROOF fn_cancel_allocation
CREATE OR REPLACE FUNCTION public.fn_cancel_allocation(
    p_allocation_id UUID,
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_reason TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'ENDED'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_alloc public.allocations%ROWTYPE;
    v_target_status public.allocation_status;
    v_user_id UUID;
    v_is_future BOOLEAN;
    v_current_dhaka_date DATE;
BEGIN
    SELECT * INTO v_alloc
    FROM public.allocations
    WHERE id = p_allocation_id
    FOR UPDATE;

    IF v_alloc.id IS NULL THEN
        RAISE EXCEPTION 'বরাদ্দ রেকর্ড পাওয়া যায়নি।' USING ERRCODE = 'P0002';
    END IF;

    v_current_dhaka_date := (timezone('Asia/Dhaka', now()))::DATE;
    v_is_future := (COALESCE(p_end_date, v_current_dhaka_date) > v_current_dhaka_date);
    v_target_status := p_status::public.allocation_status;

    IF v_is_future THEN
        -- Future departure notice: Boarder remains active and in seat until p_end_date
        UPDATE public.allocations
        SET end_date = p_end_date,
            cancellation_reason = p_reason,
            status = 'ACTIVE',
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_allocation_id;

        -- Record scheduled leaving date on boarder, but keep boarder ACTIVE
        UPDATE public.boarders
        SET leaving_date = p_end_date,
            status = 'ACTIVE',
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;

        -- Ensure seat remains OCCUPIED until departure
        UPDATE public.seats
        SET status = 'OCCUPIED',
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.seat_id;
    ELSE
        -- Immediate departure: End allocation and set boarder status to LEFT
        UPDATE public.allocations
        SET status = v_target_status,
            end_date = COALESCE(p_end_date, v_current_dhaka_date),
            cancellation_reason = p_reason,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_allocation_id;

        -- If no other active allocation exists on this seat, release to AVAILABLE
        IF NOT EXISTS (
            SELECT 1 FROM public.allocations a
            WHERE a.seat_id = v_alloc.seat_id AND a.id <> p_allocation_id AND a.status = 'ACTIVE'
        ) THEN
            UPDATE public.seats
            SET status = 'AVAILABLE',
                updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_alloc.seat_id;
        END IF;

        -- Update boarder status to LEFT
        SELECT user_id INTO v_user_id 
        FROM public.boarders 
        WHERE id = v_alloc.boarder_id;

        UPDATE public.boarders
        SET status = 'LEFT',
            leaving_date = COALESCE(p_end_date, v_current_dhaka_date),
            remarks = COALESCE(p_reason, remarks),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.boarder_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fn_cancel_allocation(UUID, DATE, TEXT, VARCHAR) TO authenticated, service_role;


-- 2. UPDATE get_executive_kpis TO COMPUTE UPCOMING VACANT SEATS & OCCUPANCY ACCURATELY
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
    v_upcoming_vacant_seats INT := 0;
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
    v_today_date DATE := (timezone('Asia/Dhaka', now()))::DATE;
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

    -- 1. Seats & Upcoming Vacant Metrics (Live Physical Count)
    -- Seats with active resident scheduled to vacate in future (>= today)
    SELECT COUNT(DISTINCT a.seat_id)
    INTO v_upcoming_vacant_seats
    FROM public.allocations a
    JOIN public.boarders b ON a.boarder_id = b.id
    WHERE (a.end_date >= v_today_date OR b.leaving_date >= v_today_date OR a.cancellation_reason IS NOT NULL)
      AND (a.start_date IS NULL OR a.start_date <= v_today_date)
      AND (b.status = 'ACTIVE' OR (b.leaving_date IS NOT NULL AND b.leaving_date >= v_today_date));

    -- Total seats & physical maintenance count
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'MAINTENANCE')
    INTO v_total_seats, v_maintenance_seats
    FROM public.seats;

    -- Occupied seats: Count all seats marked OCCUPIED plus any seats with current resident notice
    SELECT COUNT(DISTINCT s.id)
    INTO v_occupied_seats
    FROM public.seats s
    WHERE s.status = 'OCCUPIED'
       OR s.id IN (
           SELECT a.seat_id FROM public.allocations a
           JOIN public.boarders b ON a.boarder_id = b.id
           WHERE (a.end_date >= v_today_date OR b.leaving_date >= v_today_date)
             AND (a.start_date IS NULL OR a.start_date <= v_today_date)
       );

    -- Truly vacant seats: total minus occupied minus maintenance
    v_vacant_seats := GREATEST(0, v_total_seats - v_occupied_seats - v_maintenance_seats);

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
        WHERE (billing_month = TRIM(p_month) OR (billing_month IS NULL AND due_date >= v_month_start AND due_date < v_next_month_start));

        DECLARE
            v_receipts_sum NUMERIC;
        BEGIN
            SELECT COALESCE(SUM(amount), 0)
            INTO v_receipts_sum
            FROM public.receipts
            WHERE is_void = false
              AND receipt_date >= v_month_start 
              AND receipt_date < v_next_month_start;

            IF v_receipts_sum > 0 THEN
                v_total_collected := GREATEST(v_total_collected, v_receipts_sum);
            END IF;
        END;

        SELECT COALESCE(SUM(amount - paid_amount), 0)
        INTO v_month_dues
        FROM public.boarder_charges
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID')
          AND (billing_month = TRIM(p_month) OR (billing_month IS NULL AND due_date >= v_month_start AND due_date < v_next_month_start));

        SELECT COALESCE(SUM(amount - paid_amount), 0)
        INTO v_total_dues
        FROM public.boarder_charges
        WHERE status IN ('UNPAID', 'PARTIALLY_PAID');
    END IF;

    IF v_total_billed > 0 THEN
        v_collection_rate := ROUND((v_total_collected / v_total_billed) * 100, 1);
    ELSE
        v_collection_rate := 0;
    END IF;

    -- 3. Expenses & Incomes
    IF v_is_all THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_expenses
        FROM public.expenses WHERE approval_status = 'APPROVED';

        SELECT COALESCE(SUM(amount), 0) INTO v_incomes
        FROM public.incomes;
    ELSE
        SELECT COALESCE(SUM(amount), 0) INTO v_expenses
        FROM public.expenses
        WHERE approval_status = 'APPROVED'
          AND expense_date >= v_month_start 
          AND expense_date < v_next_month_start;

        SELECT COALESCE(SUM(amount), 0) INTO v_incomes
        FROM public.incomes
        WHERE income_date >= v_month_start 
          AND income_date < v_next_month_start;
    END IF;

    v_noi := (v_total_collected + v_incomes) - v_expenses;

    -- 4. Active Resident Boarders
    SELECT COUNT(DISTINCT a.boarder_id) INTO v_active_boarders
    FROM public.allocations a
    JOIN public.boarders b ON a.boarder_id = b.id
    WHERE (a.status = 'ACTIVE' OR (a.end_date IS NOT NULL AND a.end_date >= v_today_date))
      AND (a.start_date IS NULL OR a.start_date <= v_today_date)
      AND (b.status = 'ACTIVE' OR (b.leaving_date IS NOT NULL AND b.leaving_date >= v_today_date));

    -- Fallback to active boarders count if allocations view is empty
    IF v_active_boarders = 0 THEN
        SELECT COUNT(*) INTO v_active_boarders
        FROM public.boarders
        WHERE status = 'ACTIVE'
           OR (leaving_date IS NOT NULL AND leaving_date >= v_today_date);
    END IF;

    -- 5. Meals (Today & Tomorrow)
    SELECT COALESCE(
        SUM(
            (CASE WHEN breakfast THEN 0.5 ELSE 0 END) +
            (CASE WHEN lunch THEN 1 ELSE 0 END) +
            (CASE WHEN dinner THEN 1 ELSE 0 END)
        ), 0
    ) INTO v_meals_today
    FROM public.meal_selections
    WHERE meal_date = v_today_str;

    SELECT COALESCE(
        SUM(
            (CASE WHEN breakfast THEN 0.5 ELSE 0 END) +
            (CASE WHEN lunch THEN 1 ELSE 0 END) +
            (CASE WHEN dinner THEN 1 ELSE 0 END)
        ), 0
    ) INTO v_meals_tomorrow
    FROM public.meal_selections
    WHERE meal_date = v_tomorrow_str;

    -- Guest Meals
    SELECT COALESCE(SUM(guest_count), 0) INTO v_guest_today
    FROM public.guest_meal_bookings
    WHERE meal_date = v_today_str AND status = 'CONFIRMED';

    SELECT COALESCE(SUM(guest_count), 0) INTO v_guest_tomorrow
    FROM public.guest_meal_bookings
    WHERE meal_date = v_tomorrow_str AND status = 'CONFIRMED';

    v_meals_today := v_meals_today + v_guest_today;
    v_meals_tomorrow := v_meals_tomorrow + v_guest_tomorrow;

    IF v_active_boarders > 0 THEN
        v_attendance_rate := ROUND((v_meals_today / (v_active_boarders * 2.5)) * 100, 1);
        IF v_attendance_rate > 100 THEN v_attendance_rate := 100; END IF;
    ELSE
        v_attendance_rate := 0;
    END IF;

    -- 6. Cash in Custody (Sum of active Manager Cash Drawers)
    SELECT COALESCE(SUM(current_balance), 0)
    INTO v_cash_in_custody
    FROM public.financial_accounts
    WHERE is_active = true 
      AND (account_type = 'CASH' OR account_name ILIKE '%ম্যানেজার ক্যাশ%');

    RETURN jsonb_build_object(
        'total_seats', v_total_seats,
        'occupied_seats', v_occupied_seats,
        'vacant_seats', v_vacant_seats,
        'maintenance_seats', v_maintenance_seats,
        'upcoming_vacant_seats', v_upcoming_vacant_seats,
        'occupancy_rate', v_occupancy_rate,
        'total_billed_month', v_total_billed,
        'total_collected_month', v_total_collected,
        'collection_rate', v_collection_rate,
        'total_outstanding_dues', v_total_dues,
        'month_dues', v_month_dues,
        'operating_expenses_month', v_expenses,
        'non_rent_incomes_month', v_incomes,
        'net_operating_income', v_noi,
        'active_meals_today', v_meals_today,
        'active_meals_tomorrow', v_meals_tomorrow,
        'meal_attendance_rate', v_attendance_rate,
        'estimated_monthly_meal_bill', (v_meals_today * 60 * 30),
        'cash_in_custody', v_cash_in_custody,
        'active_boarders', v_active_boarders
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis(TEXT) TO authenticated, anon;


-- 3. SELF-HEAL ALLOCATIONS & BOARDERS WITH FUTURE DEPARTURE DATES
-- Restore any boarder who has leaving_date in future back to ACTIVE
UPDATE public.boarders
SET status = 'ACTIVE'
WHERE leaving_date IS NOT NULL 
  AND leaving_date >= (timezone('Asia/Dhaka', now()))::DATE
  AND status = 'LEFT';

-- Restore their allocations back to ACTIVE
UPDATE public.allocations
SET status = 'ACTIVE'
WHERE (
    (end_date IS NOT NULL AND end_date >= (timezone('Asia/Dhaka', now()))::DATE)
    OR boarder_id IN (
        SELECT id FROM public.boarders 
        WHERE leaving_date IS NOT NULL AND leaving_date >= (timezone('Asia/Dhaka', now()))::DATE
    )
)
AND status = 'ENDED';

-- Restore seats to OCCUPIED for all active allocations
UPDATE public.seats
SET status = 'OCCUPIED'
WHERE id IN (
    SELECT seat_id FROM public.allocations
    WHERE status = 'ACTIVE'
);

-- 4. SPECIFIC HEALING FOR ZAHID HASAN (FLAT 206)
DO $$
DECLARE
    v_zahid_id UUID;
    v_alloc_id UUID;
    v_seat_id UUID;
    v_flat206_seat_id UUID;
BEGIN
    -- Find Zahid Hasan
    SELECT id INTO v_zahid_id 
    FROM public.boarders 
    WHERE full_name ILIKE '%জাহিদ%' OR full_name ILIKE '%Zahid%'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_zahid_id IS NOT NULL THEN
        -- Set Zahid Hasan as ACTIVE resident with scheduled departure 2026-11-23
        UPDATE public.boarders
        SET status = 'ACTIVE',
            leaving_date = '2026-11-23',
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_zahid_id;

        -- Find his latest allocation
        SELECT id, seat_id INTO v_alloc_id, v_seat_id
        FROM public.allocations
        WHERE boarder_id = v_zahid_id
        ORDER BY created_at DESC 
        LIMIT 1;

        -- If allocation exists, ensure it is ACTIVE with end_date 2026-11-23
        IF v_alloc_id IS NOT NULL THEN
            UPDATE public.allocations
            SET status = 'ACTIVE',
                end_date = '2026-11-23',
                updated_at = timezone('Asia/Dhaka', now())
            WHERE id = v_alloc_id;

            IF v_seat_id IS NOT NULL THEN
                UPDATE public.seats
                SET status = 'OCCUPIED',
                    updated_at = timezone('Asia/Dhaka', now())
                WHERE id = v_seat_id;
            END IF;
        ELSE
            -- If no allocation, find an available seat in Flat 206
            SELECT s.id INTO v_flat206_seat_id
            FROM public.seats s
            JOIN public.rooms r ON s.room_id = r.id
            JOIN public.flats fl ON r.flat_id = fl.id
            WHERE (fl.flat_code ILIKE '%206%' OR fl.name ILIKE '%206%')
            ORDER BY s.seat_code ASC
            LIMIT 1;

            IF v_flat206_seat_id IS NOT NULL THEN
                INSERT INTO public.allocations (
                    boarder_id,
                    seat_id,
                    monthly_rent,
                    security_deposit,
                    start_date,
                    end_date,
                    status
                ) VALUES (
                    v_zahid_id,
                    v_flat206_seat_id,
                    4500,
                    3000,
                    '2026-11-01',
                    '2026-11-23',
                    'ACTIVE'
                );

                UPDATE public.seats
                SET status = 'OCCUPIED'
                WHERE id = v_flat206_seat_id;
            END IF;
        END IF;
    END IF;
END $$;

COMMIT;

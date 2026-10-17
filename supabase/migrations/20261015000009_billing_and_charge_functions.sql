-- ==============================================================================
-- Bachelor Home ERP — Migration 000009: Billing Engine & Monthly Rent Batch RPC
-- File: supabase/migrations/20261015000009_billing_and_charge_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. FUNCTION: fn_generate_monthly_rent_charges
-- Purpose: Atomically generate monthly rent charges for all active allocations.
-- Prevents duplicate rent generation for the same boarder in the same month.
CREATE OR REPLACE FUNCTION public.fn_generate_monthly_rent_charges(
    p_billing_month DATE,
    p_due_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_normalized_month DATE;
    v_month_label TEXT;
    v_current_user UUID;
    v_alloc RECORD;
    v_generated INT := 0;
    v_skipped INT := 0;
    v_exists BOOLEAN;
BEGIN
    v_current_user := auth.uid();
    v_normalized_month := DATE_TRUNC('month', p_billing_month)::DATE;
    v_month_label := to_char(v_normalized_month, 'FMMonth YYYY');

    -- Validate due date
    IF p_due_date IS NULL THEN
        p_due_date := v_normalized_month + INTERVAL '9 days'; -- Default to 10th
    END IF;

    -- Loop through all active allocations for active boarders
    FOR v_alloc IN
        SELECT 
            a.id AS allocation_id,
            a.boarder_id,
            a.monthly_rent,
            b.full_name,
            b.boarder_code
        FROM public.allocations a
        JOIN public.boarders b ON b.id = a.boarder_id
        WHERE a.status = 'ACTIVE'
          AND b.status = 'ACTIVE'
    LOOP
        -- Check if RENT charge already exists for this boarder and billing month
        SELECT EXISTS (
            SELECT 1 
            FROM public.boarder_charges bc
            WHERE bc.boarder_id = v_alloc.boarder_id
              AND bc.charge_type = 'RENT'
              AND bc.billing_month = v_normalized_month
              AND bc.status <> 'VOID'
        ) INTO v_exists;

        IF v_exists THEN
            v_skipped := v_skipped + 1;
        ELSE
            INSERT INTO public.boarder_charges (
                boarder_id,
                allocation_id,
                charge_type,
                billing_month,
                amount,
                paid_amount,
                status,
                due_date,
                description,
                created_by
            ) VALUES (
                v_alloc.boarder_id,
                v_alloc.allocation_id,
                'RENT',
                v_normalized_month,
                v_alloc.monthly_rent,
                0.00,
                'UNPAID',
                p_due_date,
                'মাসিক সিট ভাড়া (' || v_month_label || ')',
                v_current_user
            );

            v_generated := v_generated + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_normalized_month,
        'generated', v_generated,
        'skipped', v_skipped,
        'message', format('মাসিক ভাড়া সফলভাবে সম্পন্ন: %s টি তৈরি হয়েছে, %s টি পূর্বে তৈরিকৃত ছিল।', v_generated, v_skipped)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_monthly_rent_charges(DATE, DATE) TO authenticated;

-- 2. ENHANCED VIEW: vw_boarder_dues_summary
-- Provides comprehensive boarder dues, flat/seat information, and overdue aging
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
WITH last_payments AS (
    SELECT 
        r.boarder_id,
        MAX(r.receipt_date) AS last_payment_date
    FROM public.receipts r
    WHERE r.is_void = false
    GROUP BY r.boarder_id
)
SELECT 
    b.id AS boarder_id,
    b.boarder_code,
    b.full_name,
    b.phone_number,
    b.photo_url,
    f.flat_code,
    f.name AS flat_name,
    s.seat_code,
    s.seat_name,
    COALESCE(SUM(bc.amount), 0.00) AS total_billed,
    COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid,
    COALESCE(SUM(bc.due_amount), 0.00) AS outstanding_due,
    COALESCE(SUM(bc.due_amount), 0.00) AS total_outstanding_due,
    COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE AND bc.status IN ('UNPAID', 'PARTIALLY_PAID') THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount,
    lp.last_payment_date
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN public.boarder_charges bc ON bc.boarder_id = b.id AND bc.status IN ('UNPAID', 'PARTIALLY_PAID')
LEFT JOIN last_payments lp ON lp.boarder_id = b.id
GROUP BY 
    b.id, 
    b.boarder_code, 
    b.full_name, 
    b.phone_number, 
    b.photo_url, 
    f.flat_code, 
    f.name, 
    s.seat_code, 
    s.seat_name, 
    lp.last_payment_date;

GRANT SELECT ON public.vw_boarder_dues_summary TO authenticated;

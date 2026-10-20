-- ==============================================================================
-- Bachelor Home ERP — Migration 000027: Fix Billing Ledger & Auto Receipt Allocations
-- File: supabase/migrations/20261015000027_fix_billing_ledger_and_receipt_allocations.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Recreate vw_boarder_dues_summary so total_billed and total_paid reflect all charges
--      (paid charges are no longer dropped from the view, eliminating ledger discrepancies).
--   2. Update fn_record_receipt to automatically allocate unallocated receipt amounts
--      to the boarder's oldest unpaid charges (FIFO), ensuring dues decrease immediately.
--   3. Retroactively allocate any existing unallocated receipts to their unpaid charges.
-- ==============================================================================

-- 1. Recreate vw_boarder_dues_summary for 100% accurate billing & dues reporting
DROP VIEW IF EXISTS public.vw_boarder_dues_summary CASCADE;
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
LEFT JOIN public.boarder_charges bc ON bc.boarder_id = b.id
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
GRANT SELECT ON public.vw_boarder_dues_summary TO anon;

-- 2. Enhanced fn_record_receipt with Auto FIFO Allocation
CREATE OR REPLACE FUNCTION public.fn_record_receipt(
    p_boarder_id UUID,
    p_amount NUMERIC(12,2),
    p_payment_method payment_method,
    p_destination_account_id UUID,
    p_reference TEXT DEFAULT NULL,
    p_allocations JSONB DEFAULT '[]'::JSONB,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_receipt_id UUID;
    v_receipt_no VARCHAR(50);
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
    v_alloc RECORD;
    v_allocated_sum NUMERIC(12,2) := 0.00;
    v_remaining_amount NUMERIC(12,2);
    v_charge RECORD;
    v_alloc_amount NUMERIC(12,2);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Receipt amount must be strictly positive.';
    END IF;

    -- Generate receipt number
    v_receipt_no := 'RCT-' || LPAD(nextval('receipt_seq')::TEXT, 6, '0');

    -- Insert receipt
    INSERT INTO public.receipts (
        receipt_number,
        boarder_id,
        received_by,
        destination_account_id,
        amount,
        payment_method,
        transaction_reference,
        receipt_date,
        remarks
    )
    VALUES (
        v_receipt_no,
        p_boarder_id,
        v_current_user,
        p_destination_account_id,
        p_amount,
        p_payment_method,
        p_reference,
        timezone('Asia/Dhaka', now()),
        p_remarks
    )
    RETURNING id INTO v_receipt_id;

    -- Update destination account balance
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- If cash payment, update manager's daily cash session
    IF p_payment_method = 'CASH' THEN
        PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

        UPDATE public.manager_cash_sessions
        SET cash_receipts = cash_receipts + p_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_current_user AND session_date = v_today;
    END IF;

    -- Process explicit bill allocations if provided
    IF p_allocations IS NOT NULL AND jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(charge_id UUID, amount NUMERIC(12,2))
        LOOP
            IF v_alloc.amount > 0 THEN
                INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
                VALUES (v_receipt_id, v_alloc.charge_id, v_alloc.amount);

                v_allocated_sum := v_allocated_sum + v_alloc.amount;
            END IF;
        END LOOP;

        IF v_allocated_sum > p_amount THEN
            RAISE EXCEPTION 'Total allocated charges (%) exceeds total receipt amount (%).', v_allocated_sum, p_amount;
        END IF;
    END IF;

    -- Auto-allocate remaining unallocated receipt amount to oldest unpaid charges (FIFO)
    v_remaining_amount := p_amount - v_allocated_sum;
    IF v_remaining_amount > 0 THEN
        FOR v_charge IN
            SELECT id, due_amount
            FROM public.boarder_charges
            WHERE boarder_id = p_boarder_id
              AND status IN ('UNPAID', 'PARTIALLY_PAID')
              AND due_amount > 0
            ORDER BY due_date ASC, created_at ASC
        LOOP
            EXIT WHEN v_remaining_amount <= 0;

            v_alloc_amount := LEAST(v_remaining_amount, v_charge.due_amount);

            IF v_alloc_amount > 0 THEN
                INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
                VALUES (v_receipt_id, v_charge.id, v_alloc_amount);

                v_remaining_amount := v_remaining_amount - v_alloc_amount;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_no,
        'amount', p_amount,
        'payment_method', p_payment_method
    );
END;
$$;

-- 3. Retroactively sync any past unallocated receipts to their boarders' unpaid charges
DO $$
DECLARE
    v_rec RECORD;
    v_charge RECORD;
    v_unallocated NUMERIC(12,2);
    v_pay_amt NUMERIC(12,2);
BEGIN
    FOR v_rec IN 
        SELECT r.id AS receipt_id, r.boarder_id, r.amount,
               COALESCE((SELECT SUM(ra.allocated_amount) FROM public.receipt_allocations ra WHERE ra.receipt_id = r.id), 0.00) AS total_allocated
        FROM public.receipts r
        WHERE r.is_void = false
    LOOP
        v_unallocated := v_rec.amount - v_rec.total_allocated;
        IF v_unallocated > 0 THEN
            FOR v_charge IN 
                SELECT id, due_amount 
                FROM public.boarder_charges
                WHERE boarder_id = v_rec.boarder_id 
                  AND status IN ('UNPAID', 'PARTIALLY_PAID')
                  AND due_amount > 0
                ORDER BY due_date ASC, created_at ASC
            LOOP
                EXIT WHEN v_unallocated <= 0;
                v_pay_amt := LEAST(v_unallocated, v_charge.due_amount);
                IF v_pay_amt > 0 THEN
                    INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
                    VALUES (v_rec.receipt_id, v_charge.id, v_pay_amt);
                    v_unallocated := v_unallocated - v_pay_amt;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- Bachelor Home ERP — Migration 000010: Receipt Collection & Void Reversal Functions
-- File: supabase/migrations/20261015000010_receipt_and_void_functions.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. FUNCTION: fn_void_receipt
-- Purpose: Safely void a receipt, reversing account balances and re-syncing boarder charges.
CREATE OR REPLACE FUNCTION public.fn_void_receipt(
    p_receipt_id UUID,
    p_void_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
    v_alloc RECORD;
    v_new_paid NUMERIC(12,2);
    v_charge_amt NUMERIC(12,2);
BEGIN
    IF p_void_reason IS NULL OR TRIM(p_void_reason) = '' THEN
        RAISE EXCEPTION 'রিসিপ্ট বাতিলের জন্য কারণ উল্লেখ করা বাধ্যতামূলক।';
    END IF;

    -- Fetch and lock receipt
    SELECT * INTO v_receipt
    FROM public.receipts
    WHERE id = p_receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'রিসিপ্ট পাওয়া যায়নি (Receipt not found).';
    END IF;

    IF v_receipt.is_void THEN
        RAISE EXCEPTION 'এই মানি রিসিপ্টটি ইতিমধ্যেই বাতিল করা হয়েছে।';
    END IF;

    -- Mark receipt as void
    UPDATE public.receipts
    SET is_void = true,
        void_reason = TRIM(p_void_reason),
        void_by = v_current_user,
        void_at = timezone('Asia/Dhaka', now())
    WHERE id = p_receipt_id;

    -- Deduct from destination financial account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - v_receipt.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_receipt.destination_account_id;

    -- If cash, reverse from current manager cash session
    IF v_receipt.payment_method = 'CASH' THEN
        UPDATE public.manager_cash_sessions
        SET cash_receipts = GREATEST(0.00, cash_receipts - v_receipt.amount),
            updated_at = timezone('Asia/Dhaka', now())
        WHERE manager_id = v_receipt.received_by
          AND session_date = (timezone('Asia/Dhaka', v_receipt.receipt_date))::DATE;
    END IF;

    -- Resync all charges that had allocations from this receipt
    FOR v_alloc IN
        SELECT ra.charge_id
        FROM public.receipt_allocations ra
        WHERE ra.receipt_id = p_receipt_id
    LOOP
        -- Calculate total active paid amount excluding void receipts
        SELECT COALESCE(SUM(ra2.allocated_amount), 0.00)
        INTO v_new_paid
        FROM public.receipt_allocations ra2
        JOIN public.receipts r2 ON r2.id = ra2.receipt_id
        WHERE ra2.charge_id = v_alloc.charge_id
          AND r2.is_void = false;

        SELECT amount INTO v_charge_amt
        FROM public.boarder_charges
        WHERE id = v_alloc.charge_id;

        -- Update charge status
        UPDATE public.boarder_charges
        SET paid_amount = v_new_paid,
            status = CASE 
                WHEN v_new_paid >= v_charge_amt THEN 'PAID'::charge_status
                WHEN v_new_paid > 0 THEN 'PARTIALLY_PAID'::charge_status
                ELSE 'UNPAID'::charge_status
            END,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = v_alloc.charge_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', p_receipt_id,
        'receipt_number', v_receipt.receipt_number,
        'amount', v_receipt.amount,
        'message', format('রিসিপ্ট %s সফলভাবে বাতিল ও সমন্বয় করা হয়েছে।', v_receipt.receipt_number)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_void_receipt(UUID, TEXT) TO authenticated;

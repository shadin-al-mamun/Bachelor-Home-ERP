-- Migration: 20261105000002_add_security_deposit_support.sql
-- Description: Adds 'SECURITY_DEPOSIT' to charge_type and 'ADJUSTMENT' to payment_method.
--              Ensures internal security deposit adjustments do NOT inflate physical financial accounts or cash drawers.

DO $$
BEGIN
    -- 1. Add 'SECURITY_DEPOSIT' to charge_type enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON t.oid = e.enumtypid 
        WHERE t.typname = 'charge_type' AND e.enumlabel = 'SECURITY_DEPOSIT'
    ) THEN
        ALTER TYPE public.charge_type ADD VALUE 'SECURITY_DEPOSIT';
    END IF;

    -- 2. Add 'ADJUSTMENT' to payment_method enum if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON t.oid = e.enumtypid 
        WHERE t.typname = 'payment_method' AND e.enumlabel = 'ADJUSTMENT'
    ) THEN
        ALTER TYPE public.payment_method ADD VALUE 'ADJUSTMENT';
    END IF;
END $$;

-- 3. Upgrade fn_record_unified_collection to isolate non-cash deposit adjustments from financial_accounts
CREATE OR REPLACE FUNCTION public.fn_record_unified_collection(
    p_boarder_id UUID,
    p_destination_account_id UUID,
    p_payment_method payment_method,
    p_items JSONB, -- Array of { head_code, head_name, amount, billing_month, description }
    p_collection_date TIMESTAMPTZ DEFAULT timezone('Asia/Dhaka', now()),
    p_reference TEXT DEFAULT NULL,
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
    v_total_amount NUMERIC(12,2) := 0.00;
    v_item RECORD;
    v_account RECORD;
    v_today DATE;
    v_is_adjustment BOOLEAN := false;
BEGIN
    -- Validate boarder
    IF NOT EXISTS (SELECT 1 FROM public.boarders WHERE id = p_boarder_id) THEN
        RAISE EXCEPTION 'বোর্ডার খুঁজে পাওয়া যায়নি (Boarder not found).';
    END IF;

    -- Validate destination account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_destination_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'জমার অ্যাকাউন্টটি পাওয়া যায়নি (Destination account not found).';
    END IF;

    -- Calculate total from items array
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        head_code VARCHAR,
        head_name VARCHAR,
        amount NUMERIC,
        billing_month DATE,
        description TEXT
    )
    LOOP
        IF v_item.amount IS NOT NULL AND v_item.amount > 0 THEN
            v_total_amount := v_total_amount + v_item.amount;
        END IF;
    END LOOP;

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'মোট আদায়ের পরিমাণ অবশ্যই ০ টাকার বেশি হতে হবে।';
    END IF;

    -- Check if this is an internal deposit adjustment (non-cash)
    IF p_payment_method::text = 'ADJUSTMENT' 
       OR COALESCE(p_remarks, '') LIKE '%[DEPOSIT_ADJUSTMENT]%' 
       OR COALESCE(p_reference, '') LIKE '%[DEPOSIT_ADJUSTMENT]%' THEN
        v_is_adjustment := true;
    END IF;

    -- Generate receipt number
    v_today := COALESCE(p_collection_date::DATE, timezone('Asia/Dhaka', now())::DATE);
    v_receipt_no := 'RCT-' || TO_CHAR(v_today, 'YYMM') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');

    -- Insert Single Master Receipt
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
        COALESCE(v_current_user, (SELECT id FROM public.profiles WHERE role = 'SUPER_ADMIN' LIMIT 1)),
        p_destination_account_id,
        v_total_amount,
        p_payment_method,
        p_reference,
        COALESCE(p_collection_date, timezone('Asia/Dhaka', now())),
        p_remarks
    )
    RETURNING id INTO v_receipt_id;

    -- Credit Destination Account Balance ONLY IF NOT an internal non-cash adjustment
    IF NOT v_is_adjustment THEN
        UPDATE public.financial_accounts
        SET current_balance = current_balance + v_total_amount,
            updated_at = timezone('Asia/Dhaka', now())
        WHERE id = p_destination_account_id;

        -- Update manager cash session if cash received by manager
        IF p_payment_method::text = 'CASH' AND v_current_user IS NOT NULL THEN
            PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

            UPDATE public.manager_cash_sessions
            SET cash_receipts = cash_receipts + v_total_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_current_user AND session_date = v_today;
        END IF;
    END IF;

    -- Insert multi-head items if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipt_items') THEN
        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
            head_code VARCHAR,
            head_name VARCHAR,
            amount NUMERIC,
            billing_month DATE,
            description TEXT
        )
        LOOP
            IF v_item.amount IS NOT NULL AND v_item.amount > 0 THEN
                INSERT INTO public.receipt_items (
                    receipt_id,
                    head_code,
                    head_name,
                    amount,
                    billing_month,
                    description
                ) VALUES (
                    v_receipt_id,
                    COALESCE(v_item.head_code, 'OTHER'),
                    COALESCE(v_item.head_name, 'অন্যান্য'),
                    v_item.amount,
                    v_item.billing_month,
                    v_item.description
                );
            END IF;
        END LOOP;
    END IF;

    -- Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_no,
        'boarder_id', p_boarder_id,
        'total_amount', v_total_amount,
        'payment_method', p_payment_method,
        'is_adjustment', v_is_adjustment,
        'collection_date', p_collection_date
    );
END;
$$;


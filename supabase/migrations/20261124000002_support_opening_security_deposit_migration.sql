-- Migration: 20261124000002_support_opening_security_deposit_migration.sql
-- Description: Adds opening security deposit support for offline boarder migration.
--              1. Ensures a dedicated 'Opening Deposit Reserve' account exists in financial_accounts.
--              2. Upgrades fn_record_unified_collection to treat [OPENING_DEPOSIT] receipts as non-cash (no phantom cash in manager till).
--              3. Updates vw_boarder_dues_summary & fn_auto_allocate_boarder_receipts to isolate security deposit from regular operating bills.

BEGIN;

-- 1. Ensure dedicated 'Opening Deposit Reserve' account exists in financial_accounts
INSERT INTO public.financial_accounts (
    account_name,
    account_type,
    account_number,
    bank_name,
    current_balance,
    is_active
) 
SELECT 
    'হোস্টেল প্রারম্ভিক জামানত রিজার্ভ (Opening Deposit Reserve)',
    'CASH_OWNER',
    'RES-OPENING-DEPOSIT',
    'হোস্টেল জামানত তহবিল',
    0.00,
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.financial_accounts 
    WHERE account_name LIKE '%প্রারম্ভিক জামানত%' OR account_number = 'RES-OPENING-DEPOSIT'
);

-- 2. Upgrade fn_record_unified_collection
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
        RAISE EXCEPTION 'মোট আদায়ের পরিমাণ অবশ্যই ০ টাকার বেশি হতে باشد।';
    END IF;

    -- Check if this is an internal deposit adjustment or offline opening deposit migration (non-cash)
    IF p_payment_method::text = 'ADJUSTMENT' 
       OR COALESCE(p_remarks, '') LIKE '%[DEPOSIT_ADJUSTMENT]%' 
       OR COALESCE(p_reference, '') LIKE '%[DEPOSIT_ADJUSTMENT]%'
       OR COALESCE(p_remarks, '') LIKE '%[OPENING_DEPOSIT]%' 
       OR COALESCE(p_reference, '') LIKE '%[OPENING_DEPOSIT]%'
       OR COALESCE(p_remarks, '') LIKE '%[OFFLINE_DEPOSIT]%' 
       OR COALESCE(p_reference, '') LIKE '%[OFFLINE_DEPOSIT]%' THEN
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

    -- Credit Destination Account Balance ONLY IF NOT an internal non-cash adjustment or opening deposit
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
                    COALESCE(v_item.head_code, 'SECURITY_DEPOSIT'),
                    COALESCE(v_item.head_name, 'জামানত সংগ্রহ (Security Deposit)'),
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

GRANT EXECUTE ON FUNCTION public.fn_record_unified_collection TO authenticated;

-- 3. Update vw_boarder_dues_summary: Exclude security deposit receipts and charges from operating rent/meal dues
DROP VIEW IF EXISTS public.vw_boarder_dues_summary CASCADE;
CREATE OR REPLACE VIEW public.vw_boarder_dues_summary AS
WITH last_payments AS (
    SELECT 
        r.boarder_id,
        MAX(r.receipt_date) AS last_payment_date
    FROM public.receipts r
    WHERE r.is_void = false
    GROUP BY r.boarder_id
),
receipt_totals AS (
    SELECT
        r.boarder_id,
        COALESCE(SUM(r.amount), 0.00) AS total_received
    FROM public.receipts r
    WHERE r.is_void = false
      AND COALESCE(r.remarks, '') NOT LIKE '%[SECURITY_DEPOSIT]%'
      AND COALESCE(r.transaction_reference, '') NOT LIKE '%[SECURITY_DEPOSIT]%'
      AND COALESCE(r.remarks, '') NOT LIKE '%[OPENING_DEPOSIT]%'
      AND COALESCE(r.transaction_reference, '') NOT LIKE '%[OPENING_DEPOSIT]%'
      AND COALESCE(r.remarks, '') NOT LIKE '%[OFFLINE_DEPOSIT]%'
      AND COALESCE(r.transaction_reference, '') NOT LIKE '%[OFFLINE_DEPOSIT]%'
    GROUP BY r.boarder_id
),
charge_totals AS (
    SELECT
        bc.boarder_id,
        COALESCE(SUM(bc.amount), 0.00) AS total_billed,
        COALESCE(SUM(bc.paid_amount), 0.00) AS total_paid_charges,
        COALESCE(SUM(bc.due_amount), 0.00) AS total_due_charges,
        COALESCE(SUM(CASE WHEN bc.due_date < CURRENT_DATE AND bc.status IN ('UNPAID', 'PARTIALLY_PAID') THEN bc.due_amount ELSE 0.00 END), 0.00) AS overdue_amount
    FROM public.boarder_charges bc
    WHERE bc.status <> 'VOID'
      AND bc.charge_type <> 'SECURITY_DEPOSIT'
    GROUP BY bc.boarder_id
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
    COALESCE(ct.total_billed, 0.00) AS total_billed,
    COALESCE(rt.total_received, ct.total_paid_charges, 0.00) AS total_paid,
    GREATEST(0.00, COALESCE(ct.total_billed, 0.00) - COALESCE(rt.total_received, ct.total_paid_charges, 0.00)) AS outstanding_due,
    GREATEST(0.00, COALESCE(ct.total_billed, 0.00) - COALESCE(rt.total_received, ct.total_paid_charges, 0.00)) AS total_outstanding_due,
    GREATEST(0.00, COALESCE(rt.total_received, 0.00) - COALESCE(ct.total_billed, 0.00)) AS advance_balance,
    COALESCE(ct.overdue_amount, 0.00) AS overdue_amount,
    lp.last_payment_date
FROM public.boarders b
LEFT JOIN public.allocations a ON a.boarder_id = b.id AND a.status = 'ACTIVE'
LEFT JOIN public.seats s ON s.id = a.seat_id
LEFT JOIN public.rooms r ON r.id = s.room_id
LEFT JOIN public.flats f ON f.id = r.flat_id
LEFT JOIN charge_totals ct ON ct.boarder_id = b.id
LEFT JOIN receipt_totals rt ON rt.boarder_id = b.id
LEFT JOIN last_payments lp ON lp.boarder_id = b.id;

GRANT SELECT ON public.vw_boarder_dues_summary TO authenticated;
GRANT SELECT ON public.vw_boarder_dues_summary TO anon;

-- 4. Update fn_auto_allocate_boarder_receipts: Exclude security deposit receipts from FIFO auto-allocation
CREATE OR REPLACE FUNCTION public.fn_auto_allocate_boarder_receipts(p_boarder_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_rec RECORD;
    v_charge RECORD;
    v_unallocated NUMERIC(12,2);
    v_current_due NUMERIC(12,2);
    v_alloc_amount NUMERIC(12,2);
    v_total_new_allocations INT := 0;
    v_total_allocated_amount NUMERIC(12,2) := 0.00;
BEGIN
    IF p_boarder_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Boarder ID is required');
    END IF;

    -- Iterate over non-security-deposit, valid receipts for this boarder, oldest first (FIFO)
    FOR v_rec IN
        SELECT 
            r.id, 
            r.receipt_number, 
            r.amount,
            COALESCE((
                SELECT SUM(ra.allocated_amount) 
                FROM public.receipt_allocations ra 
                WHERE ra.receipt_id = r.id
            ), 0.00) AS allocated_amount
        FROM public.receipts r
        WHERE r.boarder_id = p_boarder_id
          AND r.is_void = false
          AND COALESCE(r.remarks, '') NOT LIKE '%[SECURITY_DEPOSIT]%'
          AND COALESCE(r.transaction_reference, '') NOT LIKE '%[SECURITY_DEPOSIT]%'
          AND COALESCE(r.remarks, '') NOT LIKE '%[OPENING_DEPOSIT]%'
          AND COALESCE(r.transaction_reference, '') NOT LIKE '%[OPENING_DEPOSIT]%'
          AND COALESCE(r.remarks, '') NOT LIKE '%[OFFLINE_DEPOSIT]%'
          AND COALESCE(r.transaction_reference, '') NOT LIKE '%[OFFLINE_DEPOSIT]%'
        ORDER BY r.receipt_date ASC, r.created_at ASC
    LOOP
        v_unallocated := v_rec.amount - v_rec.allocated_amount;

        IF v_unallocated > 0 THEN
            -- Find unpaid or partially paid operating charges (excluding security deposit)
            FOR v_charge IN
                SELECT id, amount, paid_amount, due_amount
                FROM public.boarder_charges
                WHERE boarder_id = p_boarder_id
                  AND status IN ('UNPAID', 'PARTIALLY_PAID')
                  AND charge_type <> 'SECURITY_DEPOSIT'
                ORDER BY due_date ASC, billing_month ASC, created_at ASC
            LOOP
                EXIT WHEN v_unallocated <= 0;

                SELECT due_amount INTO v_current_due
                FROM public.boarder_charges
                WHERE id = v_charge.id;

                IF v_current_due IS NULL OR v_current_due <= 0 THEN
                    CONTINUE;
                END IF;

                v_alloc_amount := LEAST(v_unallocated, v_current_due);

                IF v_alloc_amount > 0 THEN
                    INSERT INTO public.receipt_allocations (
                        receipt_id,
                        charge_id,
                        allocated_amount
                    ) VALUES (
                        v_rec.id,
                        v_charge.id,
                        v_alloc_amount
                    );

                    v_unallocated := v_unallocated - v_alloc_amount;
                    v_total_new_allocations := v_total_new_allocations + 1;
                    v_total_allocated_amount := v_total_allocated_amount + v_alloc_amount;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'boarder_id', p_boarder_id,
        'new_allocations_count', v_total_new_allocations,
        'total_allocated_amount', v_total_allocated_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_auto_allocate_boarder_receipts(UUID) TO authenticated;

COMMIT;

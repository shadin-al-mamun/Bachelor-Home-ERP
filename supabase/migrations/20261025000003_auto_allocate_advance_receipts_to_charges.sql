-- Migration: 20261025000003_auto_allocate_advance_receipts_to_charges.sql
-- Description: Automatic allocation of unallocated receipts (advance balance) to boarder charges (FIFO)
--              Prevents new/unpaid charges from showing as due when boarder has deposited sufficient advance funds.

-- Clean up any overloaded fn_record_unified_collection signature if partially created
DROP FUNCTION IF EXISTS public.fn_record_unified_collection(UUID, UUID, payment_method, JSONB, VARCHAR, TIMESTAMPTZ, TEXT);

-- 1. Create or replace public.fn_auto_allocate_boarder_receipts
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

    -- Iterate over all valid (non-void) receipts for this boarder, oldest first (FIFO)
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
        ORDER BY r.receipt_date ASC, r.created_at ASC
    LOOP
        v_unallocated := v_rec.amount - v_rec.allocated_amount;

        IF v_unallocated > 0 THEN
            -- Find unpaid or partially paid charges for this boarder, oldest due_date first
            FOR v_charge IN
                SELECT id, amount, paid_amount, due_amount
                FROM public.boarder_charges
                WHERE boarder_id = p_boarder_id
                  AND status IN ('UNPAID', 'PARTIALLY_PAID')
                ORDER BY due_date ASC, billing_month ASC, created_at ASC
            LOOP
                EXIT WHEN v_unallocated <= 0;

                -- Re-check live due amount of charge inside transaction to prevent stale values
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

GRANT EXECUTE ON FUNCTION public.fn_auto_allocate_boarder_receipts(UUID) TO authenticated, anon;

-- 2. Trigger Function on boarder_charges: trg_fn_auto_allocate_on_charge
CREATE OR REPLACE FUNCTION public.trg_fn_auto_allocate_on_charge()
RETURNS TRIGGER AS $$
BEGIN
    -- Avoid infinite trigger recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- If a charge is inserted or updated as UNPAID or PARTIALLY_PAID, check for unallocated receipts
    IF NEW.status IN ('UNPAID', 'PARTIALLY_PAID') THEN
        PERFORM public.fn_auto_allocate_boarder_receipts(NEW.boarder_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_allocate_on_charge ON public.boarder_charges;
CREATE TRIGGER trg_auto_allocate_on_charge
AFTER INSERT OR UPDATE OF amount, status ON public.boarder_charges
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_auto_allocate_on_charge();

-- 3. Trigger Function on receipts: trg_fn_auto_allocate_on_receipt
CREATE OR REPLACE FUNCTION public.trg_fn_auto_allocate_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
    -- Avoid infinite trigger recursion
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- When a new valid receipt is inserted or unvoided, allocate to any pending unpaid charges
    IF NEW.is_void = false THEN
        PERFORM public.fn_auto_allocate_boarder_receipts(NEW.boarder_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_allocate_on_receipt ON public.receipts;
CREATE TRIGGER trg_auto_allocate_on_receipt
AFTER INSERT OR UPDATE OF amount, is_void ON public.receipts
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_auto_allocate_on_receipt();

-- 4. Recreate View: vw_boarder_dues_summary with accurate advance_balance and outstanding_due
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

-- 5. Retroactively run auto-allocation for all existing boarders (including Maruf Billah)
DO $$
DECLARE
    v_b RECORD;
BEGIN
    FOR v_b IN SELECT id FROM public.boarders
    LOOP
        PERFORM public.fn_auto_allocate_boarder_receipts(v_b.id);
    END LOOP;
END $$;

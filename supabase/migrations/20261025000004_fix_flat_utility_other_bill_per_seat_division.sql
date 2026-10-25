-- Migration: 20261025000004_fix_flat_utility_other_bill_per_seat_division.sql
-- Description: Fix flat utility batch generation so that 'other_bill' (অন্যান্য বিল) is divided by total_seats before adding to grand total per head

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_generate_batch_flat_utility_bills(
    p_billing_month DATE,
    p_due_date DATE DEFAULT NULL,
    p_flat_configs JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_norm_month DATE;
    v_due_date DATE;
    v_month_label TEXT;
    v_current_user UUID := auth.uid();
    v_flat_item RECORD;
    v_alloc RECORD;
    v_flat RECORD;
    v_generated INT := 0;
    v_updated INT := 0;
    v_skipped INT := 0;
    v_total_flats INT := 0;
    v_total_boarders INT := 0;
    v_total_amount_billed NUMERIC(12,2) := 0.00;
    v_description TEXT;
    v_existing_charge_id UUID;
    v_existing_status charge_status;
    v_effective_utility NUMERIC(12,2);
    v_effective_other NUMERIC(12,2);
    v_effective_grand_total NUMERIC(12,2);
    v_total_seats INT;
BEGIN
    v_norm_month := DATE_TRUNC('month', COALESCE(p_billing_month, CURRENT_DATE))::DATE;
    v_month_label := to_char(v_norm_month, 'FMMonth YYYY');
    v_due_date := COALESCE(p_due_date, v_norm_month + INTERVAL '9 days');

    IF p_flat_configs IS NULL OR jsonb_array_length(p_flat_configs) = 0 THEN
        RAISE EXCEPTION 'কোনো ফ্ল্যাট কনফিগারেশন পাওয়া যায়নি (Flat configuration array is empty).';
    END IF;

    -- Iterate over each flat's calculation config
    FOR v_flat_item IN SELECT * FROM jsonb_to_recordset(p_flat_configs) AS x(
        flat_id UUID,
        total_seats INT,
        total_voucher_amount NUMERIC(12,2),
        utility_per_head NUMERIC(12,2),
        cook_bill NUMERIC(12,2),
        other_bill NUMERIC(12,2),
        other_bill_per_head NUMERIC(12,2),
        grand_total_per_head NUMERIC(12,2)
    )
    LOOP
        v_total_flats := v_total_flats + 1;

        SELECT * INTO v_flat FROM public.flats WHERE id = v_flat_item.flat_id;
        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        v_total_seats := GREATEST(1, COALESCE(v_flat_item.total_seats, 1));
        v_effective_utility := ROUND(COALESCE(v_flat_item.utility_per_head, 0.00));
        
        -- অন্যান্য বিল ফ্ল্যাটের মোট সিট সংখ্যা দিয়ে ভাগ হয়ে মাথাপিছু যোগ হবে
        IF v_flat_item.other_bill_per_head IS NOT NULL AND v_flat_item.other_bill_per_head > 0 THEN
            v_effective_other := ROUND(v_flat_item.other_bill_per_head);
        ELSE
            v_effective_other := ROUND(COALESCE(v_flat_item.other_bill, 0.00) / v_total_seats);
        END IF;

        -- Grand total per head calculation
        IF COALESCE(v_flat_item.grand_total_per_head, 0.00) > 0 THEN
            v_effective_grand_total := v_flat_item.grand_total_per_head;
        ELSE
            v_effective_grand_total := v_effective_utility + COALESCE(v_flat_item.cook_bill, 0.00) + v_effective_other;
        END IF;

        -- Record/Update Flat Monthly Distribution for permanent audit trail
        INSERT INTO public.flat_monthly_distributions (
            flat_id,
            billing_month,
            total_expense,
            total_seats,
            per_seat_amount,
            is_billed,
            billed_at,
            billed_by,
            breakdown,
            updated_at
        )
        VALUES (
            v_flat_item.flat_id,
            v_norm_month,
            COALESCE(v_flat_item.total_voucher_amount, 0.00),
            v_total_seats,
            v_effective_grand_total,
            true,
            timezone('Asia/Dhaka', now()),
            v_current_user,
            jsonb_build_object(
                'vouchers_total', COALESCE(v_flat_item.total_voucher_amount, 0.00),
                'utility_per_head', v_effective_utility,
                'cook_bill', COALESCE(v_flat_item.cook_bill, 0.00),
                'other_bill', COALESCE(v_flat_item.other_bill, 0.00),
                'other_bill_per_head', v_effective_other,
                'grand_total_per_head', v_effective_grand_total
            ),
            timezone('Asia/Dhaka', now())
        )
        ON CONFLICT (flat_id, billing_month) DO UPDATE SET
            total_expense = EXCLUDED.total_expense,
            total_seats = EXCLUDED.total_seats,
            per_seat_amount = EXCLUDED.per_seat_amount,
            is_billed = true,
            billed_at = timezone('Asia/Dhaka', now()),
            billed_by = v_current_user,
            breakdown = EXCLUDED.breakdown,
            updated_at = timezone('Asia/Dhaka', now());

        -- If per-head amount <= 0, no charges need to be created for this flat
        IF v_effective_grand_total <= 0 THEN
            CONTINUE;
        END IF;

        -- Build human-friendly Bangla description with individual per-head other bill
        v_description := format(
            '%s — %s বিবিধ বিল (ইউটিলিটি: ৳%s, বাবুর্চি: ৳%s%s)',
            v_month_label,
            COALESCE(v_flat.name, v_flat.flat_code),
            ROUND(v_effective_utility, 0),
            ROUND(COALESCE(v_flat_item.cook_bill, 0.00), 0),
            CASE WHEN v_effective_other > 0 
                 THEN format(', অন্যান্য: ৳%s', ROUND(v_effective_other, 0)) 
                 ELSE '' 
            END
        );

        -- Iterate all active boarders assigned to seats in this flat
        FOR v_alloc IN
            SELECT 
                a.id AS allocation_id,
                a.boarder_id,
                b.full_name,
                b.boarder_code
            FROM public.allocations a
            JOIN public.seats s ON s.id = a.seat_id
            JOIN public.rooms r ON r.id = s.room_id
            JOIN public.boarders b ON b.id = a.boarder_id
            WHERE r.flat_id = v_flat_item.flat_id
              AND a.status = 'ACTIVE'
              AND b.status = 'ACTIVE'
        LOOP
            v_total_boarders := v_total_boarders + 1;

            -- Check if a UTILITY charge already exists for this boarder and billing month
            SELECT id, status INTO v_existing_charge_id, v_existing_status
            FROM public.boarder_charges
            WHERE boarder_id = v_alloc.boarder_id
              AND charge_type = 'UTILITY'
              AND billing_month = v_norm_month
              AND status <> 'VOID'
            LIMIT 1;

            IF v_existing_charge_id IS NOT NULL THEN
                -- If charge already exists and is unpaid, update with new calculated amount
                IF v_existing_status IN ('UNPAID') THEN
                    UPDATE public.boarder_charges
                    SET amount = v_effective_grand_total,
                        due_date = v_due_date,
                        description = v_description,
                        updated_at = timezone('Asia/Dhaka', now())
                    WHERE id = v_existing_charge_id;

                    v_updated := v_updated + 1;
                    v_total_amount_billed := v_total_amount_billed + v_effective_grand_total;
                ELSE
                    -- Already paid or partially paid, preserve existing ledger
                    v_skipped := v_skipped + 1;
                END IF;
            ELSE
                -- Insert fresh UTILITY charge
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
                    'UTILITY',
                    v_norm_month,
                    v_effective_grand_total,
                    0.00,
                    'UNPAID',
                    v_due_date,
                    v_description,
                    v_current_user
                );

                v_generated := v_generated + 1;
                v_total_amount_billed := v_total_amount_billed + v_effective_grand_total;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billing_month', v_norm_month,
        'due_date', v_due_date,
        'total_flats', v_total_flats,
        'total_boarders', v_total_boarders,
        'generated_count', v_generated,
        'updated_count', v_updated,
        'skipped_count', v_skipped,
        'total_amount_billed', v_total_amount_billed,
        'message', format(
            'সফলভাবে সম্পন্ন! %s জন বর্ডারের জন্য নতুন বিবিধ বিল তৈরি হয়েছে, %s জন আপডেট হয়েছে।',
            v_generated,
            v_updated
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_batch_flat_utility_bills(DATE, DATE, JSONB) TO authenticated, anon;

COMMIT;

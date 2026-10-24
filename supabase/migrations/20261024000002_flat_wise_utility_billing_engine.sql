-- ==============================================================================
-- Bachelor Home ERP — Migration 000050: Batch Flat-wise Miscellaneous Billing Engine
-- File: supabase/migrations/20261024000002_flat_wise_utility_billing_engine.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Provide authoritative preview RPC for all active flats, their seat counts,
--      active residents, and monthly flat-wise expense vouchers.
--   2. Provide atomic one-click batch generation RPC to create/update UTILITY charges
--      (per-head utility + cook bill + other bill) for all boarders across all flats.
-- ==============================================================================

BEGIN;

-- 1. Preview RPC: Fetch all flats with monthly vouchers, seats, and active residents
CREATE OR REPLACE FUNCTION public.fn_get_flat_utility_billing_preview(
    p_billing_month DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_norm_month DATE;
    v_start_date DATE;
    v_end_date DATE;
    v_result JSONB;
BEGIN
    v_norm_month := DATE_TRUNC('month', COALESCE(p_billing_month, CURRENT_DATE))::DATE;
    v_start_date := v_norm_month;
    v_end_date := (v_norm_month + INTERVAL '1 month - 1 day')::DATE;

    WITH flat_seats AS (
        SELECT 
            r.flat_id,
            COUNT(s.id) AS total_seats
        FROM public.rooms r
        JOIN public.seats s ON s.room_id = r.id
        WHERE s.status <> 'INACTIVE'
        GROUP BY r.flat_id
    ),
    flat_boarders AS (
        SELECT 
            r.flat_id,
            COUNT(DISTINCT a.boarder_id) AS active_boarders_count,
            jsonb_agg(
                jsonb_build_object(
                    'boarder_id', b.id,
                    'boarder_code', b.boarder_code,
                    'full_name', b.full_name,
                    'phone_number', b.phone_number,
                    'seat_code', s.seat_code
                ) ORDER BY s.seat_code
            ) AS boarders_list
        FROM public.allocations a
        JOIN public.seats s ON s.id = a.seat_id
        JOIN public.rooms r ON r.id = s.room_id
        JOIN public.boarders b ON b.id = a.boarder_id
        WHERE a.status = 'ACTIVE' AND b.status = 'ACTIVE'
        GROUP BY r.flat_id
    ),
    flat_vouchers AS (
        SELECT 
            e.flat_id,
            COALESCE(SUM(e.amount), 0.00) AS total_voucher_amount,
            jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'voucher_no', e.expense_voucher_no,
                    'expense_date', to_char(e.expense_date, 'DD/MM/YYYY'),
                    'category_name', COALESCE(ec.name, 'বিবিধ খরচ'),
                    'description', e.description,
                    'amount', e.amount
                ) ORDER BY e.expense_date ASC, e.created_at ASC
            ) AS vouchers
        FROM public.expenses e
        LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
        WHERE e.flat_id IS NOT NULL
          AND e.approval_status <> 'REJECTED'
          AND (
              e.billing_month = v_norm_month
              OR (e.expense_date >= v_start_date AND e.expense_date <= v_end_date)
          )
        GROUP BY e.flat_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'flat_id', f.id,
            'flat_code', f.flat_code,
            'flat_name', f.name,
            'floor_number', f.floor_number,
            'building_name', COALESCE(bld.name, 'প্রধান ভবন'),
            'total_seats', COALESCE(fs.total_seats, 0),
            'active_boarders_count', COALESCE(fb.active_boarders_count, 0),
            'boarders', COALESCE(fb.boarders_list, '[]'::jsonb),
            'total_voucher_amount', COALESCE(fv.total_voucher_amount, 0.00),
            'vouchers', COALESCE(fv.vouchers, '[]'::jsonb),
            'existing_distribution', (
                SELECT jsonb_build_object(
                    'id', fmd.id,
                    'is_billed', fmd.is_billed,
                    'per_seat_amount', fmd.per_seat_amount,
                    'cook_bill', COALESCE((fmd.breakdown->>'cook_bill')::numeric, 0.00),
                    'other_bill', COALESCE((fmd.breakdown->>'other_bill')::numeric, 0.00)
                )
                FROM public.flat_monthly_distributions fmd
                WHERE fmd.flat_id = f.id AND fmd.billing_month = v_norm_month
                LIMIT 1
            )
        ) ORDER BY f.floor_number ASC, f.flat_code ASC
    )
    INTO v_result
    FROM public.flats f
    LEFT JOIN public.buildings bld ON bld.id = f.building_id
    LEFT JOIN flat_seats fs ON fs.flat_id = f.id
    LEFT JOIN flat_boarders fb ON fb.flat_id = f.id
    LEFT JOIN flat_vouchers fv ON fv.flat_id = f.id
    WHERE f.status = 'ACTIVE';

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_flat_utility_billing_preview(DATE) TO authenticated, anon;

-- 2. One-click Batch Generator RPC: Generate/Update UTILITY charges across all flats
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
        grand_total_per_head NUMERIC(12,2)
    )
    LOOP
        v_total_flats := v_total_flats + 1;

        SELECT * INTO v_flat FROM public.flats WHERE id = v_flat_item.flat_id;
        IF NOT FOUND THEN
            CONTINUE;
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
            GREATEST(1, COALESCE(v_flat_item.total_seats, 1)),
            COALESCE(v_flat_item.grand_total_per_head, 0.00),
            true,
            timezone('Asia/Dhaka', now()),
            v_current_user,
            jsonb_build_object(
                'vouchers_total', COALESCE(v_flat_item.total_voucher_amount, 0.00),
                'utility_per_head', COALESCE(v_flat_item.utility_per_head, 0.00),
                'cook_bill', COALESCE(v_flat_item.cook_bill, 0.00),
                'other_bill', COALESCE(v_flat_item.other_bill, 0.00),
                'grand_total_per_head', COALESCE(v_flat_item.grand_total_per_head, 0.00)
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
        IF COALESCE(v_flat_item.grand_total_per_head, 0.00) <= 0 THEN
            CONTINUE;
        END IF;

        -- Build human-friendly Bangla description
        v_description := format(
            '%s — %s বিবিধ বিল (ইউটিলিটি: ৳%s, বাবুর্চি: ৳%s%s)',
            v_month_label,
            COALESCE(v_flat.name, v_flat.flat_code),
            ROUND(COALESCE(v_flat_item.utility_per_head, 0.00), 2),
            ROUND(COALESCE(v_flat_item.cook_bill, 0.00), 2),
            CASE WHEN COALESCE(v_flat_item.other_bill, 0.00) > 0 
                 THEN format(', অন্যান্য: ৳%s', ROUND(v_flat_item.other_bill, 2)) 
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
                    SET amount = v_flat_item.grand_total_per_head,
                        due_date = v_due_date,
                        description = v_description,
                        updated_at = timezone('Asia/Dhaka', now())
                    WHERE id = v_existing_charge_id;

                    v_updated := v_updated + 1;
                    v_total_amount_billed := v_total_amount_billed + v_flat_item.grand_total_per_head;
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
                    v_flat_item.grand_total_per_head,
                    0.00,
                    'UNPAID',
                    v_due_date,
                    v_description,
                    v_current_user
                );

                v_generated := v_generated + 1;
                v_total_amount_billed := v_total_amount_billed + v_flat_item.grand_total_per_head;
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

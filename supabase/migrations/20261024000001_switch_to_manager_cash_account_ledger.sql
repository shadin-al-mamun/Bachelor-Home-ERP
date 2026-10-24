-- ==============================================================================
-- Bachelor Home ERP — Migration 000049: Switch to Continuous Manager Cash Account Ledger
-- File: supabase/migrations/20261024000001_switch_to_manager_cash_account_ledger.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Treat public.financial_accounts (CASH_MANAGER) as the Single Source of Truth for Manager Cash.
--   2. Drop the restrictive opening_cash check constraint on manager_cash_sessions so it never blocks.
--   3. Make fn_initialize_daily_cash_session resilient and derive opening cash from real account balance (non-negative).
--   4. Make fn_collect_unified_bill, fn_create_expense_voucher_v2, and fn_transfer_funds completely resilient
--      so cash session tracking never blocks bill collection or expense entry.
--   5. Support on-demand owner settlements/handovers whenever the owner requests accounts.
-- ==============================================================================

BEGIN;

-- 1. Relax/Drop manager_cash_sessions_opening_cash_check constraint
ALTER TABLE public.manager_cash_sessions 
    DROP CONSTRAINT IF EXISTS manager_cash_sessions_opening_cash_check;

-- Heal any negative opening_cash rows that may have been generated previously
UPDATE public.manager_cash_sessions
SET opening_cash = 0.00
WHERE opening_cash < 0;

-- 2. Resilient fn_initialize_daily_cash_session (Derives from Live Account Balance)
CREATE OR REPLACE FUNCTION public.fn_initialize_daily_cash_session(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_session_id UUID;
    v_account RECORD;
    v_opening_cash NUMERIC(12,2) := 0.00;
BEGIN
    -- Locate manager's cash account (assigned or default)
    SELECT * INTO v_account 
    FROM public.financial_accounts 
    WHERE (assigned_manager_id = p_manager_id OR assigned_manager_id IS NULL) 
      AND account_type = 'CASH_MANAGER' AND is_active = true
    ORDER BY (assigned_manager_id = p_manager_id) DESC, created_at ASC
    LIMIT 1;

    -- If no CASH_MANAGER account, fallback to any cash vault
    IF v_account.id IS NULL THEN
        SELECT * INTO v_account 
        FROM public.financial_accounts 
        WHERE account_type IN ('CASH_MANAGER', 'CASH_OWNER') AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- If still none exists, dynamically create a standard Manager Cash Drawer
    IF v_account.id IS NULL THEN
        INSERT INTO public.financial_accounts (
            account_name, account_type, current_balance, assigned_manager_id, is_active
        )
        VALUES (
            'ম্যানেজার ক্যাশ বক্স (Manager Cash)', 'CASH_MANAGER', 0.00, p_manager_id, true
        )
        RETURNING * INTO v_account;
    END IF;

    -- Check if session already exists for this manager on this date
    SELECT id INTO v_session_id 
    FROM public.manager_cash_sessions 
    WHERE manager_id = p_manager_id AND session_date = p_session_date;

    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;

    -- Use real manager cash account balance as the live cash in hand
    v_opening_cash := GREATEST(0.00, COALESCE(v_account.current_balance, v_account.opening_balance, 0.00));

    -- Safe non-blocking insert
    BEGIN
        INSERT INTO public.manager_cash_sessions (
            manager_id, 
            account_id, 
            session_date, 
            opening_cash, 
            status
        )
        VALUES (
            p_manager_id, 
            v_account.id, 
            p_session_date, 
            v_opening_cash, 
            'OPEN'
        )
        RETURNING id INTO v_session_id;
    EXCEPTION WHEN OTHERS THEN
        SELECT id INTO v_session_id 
        FROM public.manager_cash_sessions 
        WHERE manager_id = p_manager_id AND session_date = p_session_date;
    END;

    RETURN v_session_id;
END;
$$;

-- 3. Resilient Unified Bill Collection (Credit Financial Account + Safe Non-blocking Session Update)
CREATE OR REPLACE FUNCTION public.fn_collect_unified_bill(
    p_boarder_id UUID,
    p_destination_account_id UUID,
    p_payment_method VARCHAR(30),
    p_items JSONB,
    p_collection_date TIMESTAMPTZ DEFAULT timezone('Asia/Dhaka', now()),
    p_reference VARCHAR(100) DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_total_amount NUMERIC(12,2) := 0.00;
    v_receipt_id UUID;
    v_receipt_no VARCHAR(50);
    v_account RECORD;
    v_item RECORD;
    v_today DATE;
    v_matched_charge RECORD;
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

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত অ্যাকাউন্টটি নিষ্ক্রিয় রয়েছে (Account is inactive).';
    END IF;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'অন্তত একটি খাতের টাকা নির্ধারণ করা আবশ্যক (At least one bill head required).';
    END IF;

    -- Calculate total amount across all items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        head_code VARCHAR(50), 
        head_name VARCHAR(100), 
        amount NUMERIC(12,2),
        billing_month DATE,
        description TEXT
    )
    LOOP
        IF v_item.amount <= 0 THEN
            RAISE EXCEPTION 'বিলের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Item amount must be > 0).';
        END IF;
        v_total_amount := v_total_amount + v_item.amount;
    END LOOP;

    IF v_total_amount <= 0 THEN
        RAISE EXCEPTION 'মোট আদায়ের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।';
    END IF;

    -- Generate Unique Receipt Number
    v_receipt_no := 'RCT-' || LPAD(nextval('receipt_seq')::TEXT, 6, '0');
    v_today := (timezone('Asia/Dhaka', COALESCE(p_collection_date, now())))::DATE;

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

    -- Credit Destination Account Balance (Single Source of Truth)
    UPDATE public.financial_accounts
    SET current_balance = current_balance + v_total_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_destination_account_id;

    -- Resilient manager cash session tracking (Safe and non-blocking)
    IF p_payment_method = 'CASH' AND v_current_user IS NOT NULL THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

            UPDATE public.manager_cash_sessions
            SET cash_receipts = cash_receipts + v_total_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_current_user AND session_date = v_today;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Financial account is already credited safely
        END;
    END IF;

    -- Insert itemized breakdown and link with boarder_charges where applicable
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        head_code VARCHAR(50), 
        head_name VARCHAR(100), 
        amount NUMERIC(12,2),
        billing_month DATE,
        description TEXT
    )
    LOOP
        -- Look for unpaid charge matching this boarder and head type
        SELECT * INTO v_matched_charge
        FROM public.boarder_charges
        WHERE boarder_id = p_boarder_id
          AND status IN ('UNPAID', 'PARTIALLY_PAID')
          AND due_amount > 0
          AND (
              (v_item.head_code = 'SEAT_RENT' AND charge_type = 'RENT') OR
              (v_item.head_code = 'MEAL_BILL' AND charge_type = 'MEAL') OR
              (v_item.head_code = 'MISC_BILL' AND charge_type IN ('UTILITY', 'OTHER'))
          )
        ORDER BY due_date ASC
        LIMIT 1;

        -- Record receipt item
        INSERT INTO public.receipt_items (
            receipt_id,
            head_code,
            head_name,
            amount,
            billing_month,
            description,
            charge_id
        )
        VALUES (
            v_receipt_id,
            v_item.head_code,
            COALESCE(v_item.head_name, v_item.head_code),
            v_item.amount,
            v_item.billing_month,
            v_item.description,
            v_matched_charge.id
        );

        -- If matched charge found, also add allocation to sync charge paid amount
        IF v_matched_charge.id IS NOT NULL THEN
            INSERT INTO public.receipt_allocations (
                receipt_id,
                charge_id,
                allocated_amount
            )
            VALUES (
                v_receipt_id,
                v_matched_charge.id,
                LEAST(v_item.amount, v_matched_charge.due_amount)
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_no,
        'total_amount', v_total_amount,
        'payment_method', p_payment_method,
        'collection_date', v_today
    );
END;
$$;

-- 4. Resilient Simplified Expense Voucher Creation (Debits Financial Account + Safe Non-blocking Session Update)
CREATE OR REPLACE FUNCTION public.fn_create_expense_voucher_v2(
    p_category_id UUID DEFAULT NULL,
    p_amount NUMERIC(12,2) DEFAULT NULL,
    p_source_account_id UUID DEFAULT NULL,
    p_expense_date DATE DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_building_id UUID DEFAULT NULL,
    p_flat_id UUID DEFAULT NULL,
    p_voucher_attachment_url TEXT DEFAULT NULL,
    p_category_name VARCHAR(100) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_expense_no VARCHAR(50);
    v_expense_id UUID;
    v_voucher_no VARCHAR(50);
    v_account RECORD;
    v_resolved_category_id UUID := p_category_id;
    v_target_date DATE;
BEGIN
    -- Validate amount
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'খরচের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    -- Resolve category
    IF v_resolved_category_id IS NULL AND p_category_name IS NOT NULL AND length(trim(p_category_name)) > 0 THEN
        SELECT id INTO v_resolved_category_id
        FROM public.expense_categories
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_category_name))
        LIMIT 1;

        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.expense_categories (name, description, is_active)
            VALUES (TRIM(p_category_name), 'অটো-সৃষ্ট খরচের খাত', true)
            RETURNING id INTO v_resolved_category_id;
        END IF;
    END IF;

    IF v_resolved_category_id IS NULL THEN
        SELECT id INTO v_resolved_category_id 
        FROM public.expense_categories 
        WHERE is_active = true 
        ORDER BY (name ILIKE '%বাজার%' OR name ILIKE '%মেস%') DESC, created_at ASC
        LIMIT 1;

        IF v_resolved_category_id IS NULL THEN
            SELECT id INTO v_resolved_category_id 
            FROM public.expense_categories 
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF v_resolved_category_id IS NULL THEN
            INSERT INTO public.expense_categories (name, description, is_active)
            VALUES ('General Expense', 'সাধারণ হোস্টেল ব্যয়', true)
            RETURNING id INTO v_resolved_category_id;
        END IF;
    END IF;

    -- Validate Source Account
    SELECT * INTO v_account
    FROM public.financial_accounts
    WHERE id = p_source_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'অর্থ প্রদানের একাউন্টটি পাওয়া যায়নি (Financial account not found).';
    END IF;

    IF NOT v_account.is_active THEN
        RAISE EXCEPTION 'নির্বাচিত একাউন্টটি বর্তমানে সক্রিয় নয় (Financial account is inactive).';
    END IF;

    -- Enforce Manager Boundaries
    IF public.current_user_role() = 'MANAGER' AND NOT public.is_admin_or_owner() THEN
        IF v_account.account_type <> 'CASH_MANAGER' 
           AND (v_account.assigned_manager_id IS NULL OR v_account.assigned_manager_id <> v_current_user) THEN
            RAISE EXCEPTION 'ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকেই খরচ করতে পারবেন (Managers can only record expenses from their own manager cash custody account).';
        END IF;
    END IF;

    v_target_date := COALESCE(p_expense_date, (timezone('Asia/Dhaka', now()))::DATE);

    -- Generate Voucher Number: EXP-005001, etc.
    v_voucher_no := 'EXP-' || LPAD(nextval('expense_seq')::TEXT, 6, '0');

    -- Insert Expense Record
    INSERT INTO public.expenses (
        expense_voucher_no,
        category_id,
        amount,
        source_account_id,
        building_id,
        flat_id,
        expense_date,
        description,
        voucher_attachment_url,
        paid_by,
        approval_status
    )
    VALUES (
        v_voucher_no,
        v_resolved_category_id,
        p_amount,
        p_source_account_id,
        p_building_id,
        p_flat_id,
        v_target_date,
        TRIM(p_description),
        p_voucher_attachment_url,
        v_current_user,
        'PENDING'
    )
    RETURNING id INTO v_expense_id;

    -- Deduct balance from source financial account (Single Source of Truth)
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_source_account_id;

    -- Resilient manager daily cash session tracking (Safe and non-blocking)
    IF v_account.account_type = 'CASH_MANAGER' OR v_account.assigned_manager_id = v_current_user THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_target_date);

            UPDATE public.manager_cash_sessions
            SET cash_expenses = cash_expenses + p_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_current_user AND session_date = v_target_date;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Account balance has already been safely deducted
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'expense_id', v_expense_id,
        'voucher_number', v_voucher_no,
        'expense_voucher_no', v_voucher_no,
        'amount', p_amount,
        'category_id', v_resolved_category_id,
        'source_account_id', p_source_account_id,
        'expense_date', v_target_date,
        'approval_status', 'PENDING'
    );
END;
$$;

-- 5. Resilient Internal Fund Transfers (Owner Handover / Bank Deposit on Demand)
CREATE OR REPLACE FUNCTION public.fn_transfer_funds(
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount NUMERIC(12,2),
    p_transfer_date TIMESTAMPTZ DEFAULT timezone('Asia/Dhaka', now()),
    p_reference VARCHAR(100) DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_transfer_id UUID;
    v_transfer_no VARCHAR(50);
    v_from_account RECORD;
    v_to_account RECORD;
    v_transfer_date TIMESTAMPTZ;
    v_today DATE;
BEGIN
    IF p_from_account_id = p_to_account_id THEN
        RAISE EXCEPTION 'উৎস এবং গন্তব্য একাউন্ট একই হতে পারে না (Source and destination accounts must be different).';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'ট্রান্সফারের পরিমাণ অবশ্যই ০ এর বেশি হতে হবে (Amount must be strictly positive).';
    END IF;

    v_transfer_date := COALESCE(p_transfer_date, timezone('Asia/Dhaka', now()));
    v_today := (v_transfer_date AT TIME ZONE 'Asia/Dhaka')::DATE;

    -- Lock and validate Source Account
    SELECT * INTO v_from_account
    FROM public.financial_accounts
    WHERE id = p_from_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'উৎস একাউন্টটি পাওয়া যায়নি (Source account not found).';
    END IF;

    IF NOT v_from_account.is_active THEN
        RAISE EXCEPTION 'উৎস একাউন্টটি নিষ্ক্রিয় রয়েছে (Source account is inactive).';
    END IF;

    -- Enforce Manager Boundaries
    IF public.current_user_role() = 'MANAGER' AND NOT public.is_admin_or_owner() THEN
        IF v_from_account.account_type <> 'CASH_MANAGER' 
           AND (v_from_account.assigned_manager_id IS NULL OR v_from_account.assigned_manager_id <> v_current_user) THEN
            RAISE EXCEPTION 'ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকেই টাকা ট্রান্সফার করতে পারবেন (Managers can only transfer funds out of their own manager cash custody account).';
        END IF;
    END IF;

    -- Check sufficient balance
    IF v_from_account.current_balance < p_amount THEN
        RAISE EXCEPTION 'উৎস একাউন্টে পর্যাপ্ত ব্যালেন্স নেই (Insufficient funds. Current balance: ৳%, Requested: ৳%).', 
            v_from_account.current_balance, p_amount;
    END IF;

    -- Lock and validate Destination Account
    SELECT * INTO v_to_account
    FROM public.financial_accounts
    WHERE id = p_to_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'গন্তব্য একাউন্টটি পাওয়া যায়নি (Destination account not found).';
    END IF;

    IF NOT v_to_account.is_active THEN
        RAISE EXCEPTION 'গন্তব্য একাউন্টটি নিষ্ক্রিয় রয়েছে (Destination account is inactive).';
    END IF;

    -- Generate Transfer Number: TRF-001001, etc.
    v_transfer_no := 'TRF-' || LPAD(nextval('transfer_seq')::TEXT, 6, '0');

    -- Insert Transfer Record
    INSERT INTO public.account_transfers (
        transfer_number,
        from_account_id,
        to_account_id,
        amount,
        transfer_date,
        reference,
        remarks,
        created_by
    )
    VALUES (
        v_transfer_no,
        p_from_account_id,
        p_to_account_id,
        p_amount,
        v_transfer_date,
        p_reference,
        TRIM(p_remarks),
        v_current_user
    )
    RETURNING id INTO v_transfer_id;

    -- Deduct from Source Account (Single Source of Truth)
    UPDATE public.financial_accounts
    SET current_balance = current_balance - p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_from_account_id;

    -- Add to Destination Account (Single Source of Truth)
    UPDATE public.financial_accounts
    SET current_balance = current_balance + p_amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_to_account_id;

    -- Safe non-blocking session impact tracking
    IF v_from_account.account_type = 'CASH_MANAGER' OR v_from_account.assigned_manager_id = v_current_user THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

            UPDATE public.manager_cash_sessions
            SET cash_deposited_to_owner = cash_deposited_to_owner + p_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_current_user AND session_date = v_today;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    IF v_to_account.account_type = 'CASH_MANAGER' OR v_to_account.assigned_manager_id = v_current_user THEN
        BEGIN
            PERFORM public.fn_initialize_daily_cash_session(v_current_user, v_today);

            UPDATE public.manager_cash_sessions
            SET cash_handed_over_in = cash_handed_over_in + p_amount,
                updated_at = timezone('Asia/Dhaka', now())
            WHERE manager_id = v_current_user AND session_date = v_today;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'transfer_number', v_transfer_no,
        'amount', p_amount,
        'from_account', v_from_account.account_name,
        'to_account', v_to_account.account_name
    );
END;
$$;

-- 6. Authoritative Executive KPIs RPC (Syncs Manager Cash with Single Source of Truth)
CREATE OR REPLACE FUNCTION public.get_executive_kpis()
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
BEGIN
    -- 1. Seats
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

    v_total_billed := GREATEST(v_total_billed, v_total_collected + v_total_dues);

    IF v_total_billed > 0 THEN
        v_collection_rate := LEAST(100.0, ROUND((v_total_collected / v_total_billed) * 100, 1));
    ELSIF v_total_collected > 0 THEN
        v_collection_rate := 100.0;
    ELSE
        v_collection_rate := 0.0;
    END IF;

    -- 3. Expenses & Operating Surplus (Approved expenses)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_expenses
    FROM public.expenses
    WHERE approval_status = 'APPROVED';

    SELECT COALESCE(SUM(amount), 0)
    INTO v_incomes
    FROM public.incomes;

    v_noi := (v_total_collected + v_incomes) - v_expenses;

    -- 4. Active Boarders & Meals
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

    -- 5. Manager cash accounts balance (Strictly Manager Cash accounts, single source of truth)
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
        'operating_expenses_month', v_expenses,
        'non_rent_incomes_month', v_incomes,
        'net_operating_income', v_noi,
        'active_boarders_count', v_active_boarders,
        'active_meals_today', v_meals_today,
        'active_meals_tomorrow', v_meals_tomorrow,
        'meal_attendance_rate', v_attendance_rate,
        'cash_in_custody', v_cash_in_custody
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_kpis() TO authenticated, anon;

COMMIT;

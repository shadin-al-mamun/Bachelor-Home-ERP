-- ==============================================================================
-- Bachelor Home ERP — Migration 000013: Manager Cash Custody Improvements
-- File: supabase/migrations/20261015000013_cash_session_improvements.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. ENHANCED fn_initialize_daily_cash_session
-- Ensures fallback to default manager cash account and carryover from previous finalized session
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
    v_account_id UUID;
    v_last_closing_cash NUMERIC(12,2) := 0.00;
BEGIN
    -- Locate manager's cash account (assigned or default)
    SELECT id INTO v_account_id 
    FROM public.financial_accounts 
    WHERE (assigned_manager_id = p_manager_id OR assigned_manager_id IS NULL) 
      AND account_type = 'CASH_MANAGER' AND is_active = true
    ORDER BY (assigned_manager_id = p_manager_id) DESC, created_at ASC
    LIMIT 1;

    -- If no CASH_MANAGER account, fallback to any cash vault
    IF v_account_id IS NULL THEN
        SELECT id INTO v_account_id 
        FROM public.financial_accounts 
        WHERE account_type IN ('CASH_MANAGER', 'CASH_OWNER') AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    -- If still none exists, dynamically create a standard Manager Cash Drawer
    IF v_account_id IS NULL THEN
        INSERT INTO public.financial_accounts (
            account_name, account_type, current_balance, assigned_manager_id, is_active
        )
        VALUES (
            'ম্যানেজার ক্যাশ বক্স (Manager Cash)', 'CASH_MANAGER', 0.00, p_manager_id, true
        )
        RETURNING id INTO v_account_id;
    END IF;

    -- Check if session already exists for this manager on this date
    SELECT id INTO v_session_id 
    FROM public.manager_cash_sessions 
    WHERE manager_id = p_manager_id AND session_date = p_session_date;

    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;

    -- Carry over previous day's closing cash (actual counted if entered, otherwise expected closing)
    SELECT COALESCE(actual_counted_cash, expected_closing_cash) INTO v_last_closing_cash
    FROM public.manager_cash_sessions
    WHERE manager_id = p_manager_id AND session_date < p_session_date
    ORDER BY session_date DESC
    LIMIT 1;

    INSERT INTO public.manager_cash_sessions (
        manager_id, 
        account_id, 
        session_date, 
        opening_cash, 
        status
    )
    VALUES (
        p_manager_id, 
        v_account_id, 
        p_session_date, 
        COALESCE(v_last_closing_cash, 0.00), 
        'OPEN'
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- 2. FUNCTION: fn_get_manager_cash_session_details
-- Fetches full session data and today's itemized cash movements
CREATE OR REPLACE FUNCTION public.fn_get_manager_cash_session_details(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_session_id UUID;
    v_session RECORD;
    v_receipts JSONB;
    v_expenses JSONB;
    v_transfers JSONB;
BEGIN
    -- Ensure session initialized
    v_session_id := public.fn_initialize_daily_cash_session(p_manager_id, p_session_date);

    -- Fetch session record
    SELECT * INTO v_session
    FROM public.manager_cash_sessions
    WHERE id = v_session_id;

    -- Fetch today's cash collections
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'receipt_number', r.receipt_number,
            'amount', r.amount,
            'payer', p.full_name,
            'time', r.receipt_date
        )
    ), '[]'::JSONB)
    INTO v_receipts
    FROM public.receipts r
    LEFT JOIN public.boarders b ON b.id = r.boarder_id
    LEFT JOIN public.profiles p ON p.id = b.user_id
    WHERE r.received_by = p_manager_id 
      AND r.payment_method = 'CASH'
      AND (timezone('Asia/Dhaka', r.receipt_date))::DATE = p_session_date
      AND r.is_void = false;

    -- Fetch today's cash expenses
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'voucher_no', e.expense_voucher_no,
            'amount', e.amount,
            'category', c.name,
            'description', e.description
        )
    ), '[]'::JSONB)
    INTO v_expenses
    FROM public.expenses e
    LEFT JOIN public.expense_categories c ON c.id = e.category_id
    WHERE e.paid_by = p_manager_id
      AND e.expense_date = p_session_date
      AND e.approval_status <> 'REJECTED';

    RETURN jsonb_build_object(
        'session', row_to_json(v_session),
        'today_cash_receipts', v_receipts,
        'today_cash_expenses', v_expenses
    );
END;
$$;

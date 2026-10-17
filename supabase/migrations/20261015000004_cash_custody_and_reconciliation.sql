-- ==============================================================================
-- Bachelor Home ERP — Migration 000004: Manager Cash Custody, Reconciliation & Handovers
-- File: supabase/migrations/20261015000004_cash_custody_and_reconciliation.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Currency Standard: Bangladeshi Taka (BDT, NUMERIC(12,2))
-- ==============================================================================

-- 1. MANAGER CASH SESSIONS
CREATE TABLE IF NOT EXISTS public.manager_cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    opening_cash NUMERIC(12,2) NOT NULL CHECK (opening_cash >= 0),
    cash_receipts NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_deposited_to_owner NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_handed_over_out NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_handed_over_in NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_closing_cash NUMERIC(12,2) GENERATED ALWAYS AS (
        opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out
    ) STORED,
    actual_counted_cash NUMERIC(12,2),
    cash_variance NUMERIC(12,2) GENERATED ALWAYS AS (
        actual_counted_cash - (opening_cash + cash_receipts + cash_handed_over_in - cash_expenses - cash_deposited_to_owner - cash_handed_over_out)
    ) STORED,
    variance_explanation TEXT,
    status cash_session_status NOT NULL DEFAULT 'OPEN',
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    reopen_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT uq_manager_session_date UNIQUE (manager_id, session_date)
);

CREATE TRIGGER set_manager_cash_sessions_updated_at
BEFORE UPDATE ON public.manager_cash_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON public.manager_cash_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_manager ON public.manager_cash_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON public.manager_cash_sessions(status);

-- 2. OWNER DEPOSITS
CREATE SEQUENCE IF NOT EXISTS deposit_seq START WITH 2001;

CREATE TABLE IF NOT EXISTS public.owner_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_number VARCHAR(50) NOT NULL UNIQUE,
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(100),
    proof_attachment_url TEXT,
    status deposit_status NOT NULL DEFAULT 'PENDING',
    confirmed_by UUID REFERENCES public.profiles(id),
    confirmed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now())
);

CREATE TRIGGER set_owner_deposits_updated_at
BEFORE UPDATE ON public.owner_deposits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_owner_deposits_manager ON public.owner_deposits(manager_id);
CREATE INDEX IF NOT EXISTS idx_owner_deposits_status ON public.owner_deposits(status);

-- 3. CASH HANDOVERS
CREATE SEQUENCE IF NOT EXISTS handover_seq START WITH 3001;

CREATE TABLE IF NOT EXISTS public.cash_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handover_number VARCHAR(50) NOT NULL UNIQUE,
    sender_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    receiver_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    handover_reason TEXT NOT NULL,
    status handover_status NOT NULL DEFAULT 'PENDING',
    accepted_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('Asia/Dhaka', now()),
    CONSTRAINT chk_different_managers CHECK (sender_manager_id <> receiver_manager_id)
);

CREATE TRIGGER set_cash_handovers_updated_at
BEFORE UPDATE ON public.cash_handovers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_cash_handovers_sender ON public.cash_handovers(sender_manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_handovers_receiver ON public.cash_handovers(receiver_manager_id);
CREATE INDEX IF NOT EXISTS idx_cash_handovers_status ON public.cash_handovers(status);

-- 4. BUSINESS LOGIC & STORED PROCEDURES

-- 4.1 INITIALIZE DAILY MANAGER CASH SESSION
CREATE OR REPLACE FUNCTION public.fn_initialize_daily_cash_session(
    p_manager_id UUID,
    p_session_date DATE DEFAULT (timezone('Asia/Dhaka', now()))::DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_account_id UUID;
    v_last_closing_cash NUMERIC(12,2) := 0.00;
BEGIN
    -- Locate manager's active cash account
    SELECT id INTO v_account_id 
    FROM public.financial_accounts 
    WHERE assigned_manager_id = p_manager_id AND account_type = 'CASH_MANAGER' AND is_active = true
    LIMIT 1;

    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Active cash account not configured for this manager.';
    END IF;

    -- Check if session already exists
    SELECT id INTO v_session_id 
    FROM public.manager_cash_sessions 
    WHERE manager_id = p_manager_id AND session_date = p_session_date;

    IF v_session_id IS NOT NULL THEN
        RETURN v_session_id;
    END IF;

    -- Carry over previous day's closing cash (actual if entered, otherwise expected)
    SELECT COALESCE(actual_counted_cash, expected_closing_cash) INTO v_last_closing_cash
    FROM public.manager_cash_sessions
    WHERE manager_id = p_manager_id AND session_date < p_session_date
    ORDER BY session_date DESC
    LIMIT 1;

    INSERT INTO public.manager_cash_sessions (
        manager_id, account_id, session_date, opening_cash, status
    )
    VALUES (
        p_manager_id, v_account_id, p_session_date, COALESCE(v_last_closing_cash, 0.00), 'OPEN'
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- 4.2 SUBMIT DAILY CASH CLOSE WITH VARIANCE ENFORCEMENT
CREATE OR REPLACE FUNCTION public.fn_submit_daily_cash_close(
    p_session_id UUID,
    p_actual_counted_cash NUMERIC(12,2),
    p_variance_explanation TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
    v_expected NUMERIC(12,2);
    v_variance NUMERIC(12,2);
BEGIN
    SELECT * INTO v_session
    FROM public.manager_cash_sessions
    WHERE id = p_session_id FOR UPDATE;

    IF v_session IS NULL THEN
        RAISE EXCEPTION 'Cash session not found.';
    END IF;

    IF v_session.status NOT IN ('OPEN', 'REOPENED') THEN
        RAISE EXCEPTION 'Cash session cannot be submitted because it is currently %.', v_session.status;
    END IF;

    v_expected := v_session.opening_cash + v_session.cash_receipts + v_session.cash_handed_over_in 
                  - v_session.cash_expenses - v_session.cash_deposited_to_owner - v_session.cash_handed_over_out;
    v_variance := p_actual_counted_cash - v_expected;

    -- Mandatory explanation rule if cash variance exists
    IF v_variance <> 0.00 AND (p_variance_explanation IS NULL OR length(trim(p_variance_explanation)) = 0) THEN
        RAISE EXCEPTION 'A variance of % BDT was detected. A non-empty explanation is required before day-end submission.', v_variance;
    END IF;

    UPDATE public.manager_cash_sessions
    SET actual_counted_cash = p_actual_counted_cash,
        variance_explanation = p_variance_explanation,
        status = 'SUBMITTED',
        submitted_at = timezone('Asia/Dhaka', now()),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'expected_cash', v_expected,
        'actual_cash', p_actual_counted_cash,
        'variance', v_variance,
        'status', 'SUBMITTED'
    );
END;
$$;

-- 4.3 ATOMIC RECEIPT CREATION & CHARGE SETTLEMENT
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
AS $$
DECLARE
    v_current_user UUID := auth.uid();
    v_receipt_id UUID;
    v_receipt_no VARCHAR(50);
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
    v_alloc RECORD;
    v_allocated_sum NUMERIC(12,2) := 0.00;
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

    -- Process bill allocations if provided
    IF jsonb_array_length(p_allocations) > 0 THEN
        FOR v_alloc IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(charge_id UUID, amount NUMERIC(12,2))
        LOOP
            INSERT INTO public.receipt_allocations (receipt_id, charge_id, allocated_amount)
            VALUES (v_receipt_id, v_alloc.charge_id, v_alloc.amount);

            v_allocated_sum := v_allocated_sum + v_alloc.amount;
        END LOOP;

        IF v_allocated_sum > p_amount THEN
            RAISE EXCEPTION 'Total allocated charges (%) exceeds total receipt amount (%).', v_allocated_sum, p_amount;
        END IF;
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

-- 4.4 CONFIRM CASH HANDOVER (TWO-PARTY COMMIT)
CREATE OR REPLACE FUNCTION public.fn_confirm_cash_handover(
    p_handover_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_handover RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
BEGIN
    SELECT * INTO v_handover FROM public.cash_handovers WHERE id = p_handover_id FOR UPDATE;

    IF v_handover IS NULL THEN
        RAISE EXCEPTION 'Handover record not found.';
    END IF;

    IF v_handover.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Handover has already been processed with status %.', v_handover.status;
    END IF;

    IF v_handover.receiver_manager_id <> v_current_user THEN
        RAISE EXCEPTION 'Only designated recipient manager can confirm receipt.';
    END IF;

    -- Update Handover Status
    UPDATE public.cash_handovers
    SET status = 'ACCEPTED', accepted_at = timezone('Asia/Dhaka', now())
    WHERE id = p_handover_id;

    -- Update Sender Session (Outflow)
    PERFORM public.fn_initialize_daily_cash_session(v_handover.sender_manager_id, v_today);

    UPDATE public.manager_cash_sessions
    SET cash_handed_over_out = cash_handed_over_out + v_handover.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_handover.sender_manager_id AND session_date = v_today;

    -- Update Receiver Session (Inflow)
    PERFORM public.fn_initialize_daily_cash_session(v_handover.receiver_manager_id, v_today);

    UPDATE public.manager_cash_sessions
    SET cash_handed_over_in = cash_handed_over_in + v_handover.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_handover.receiver_manager_id AND session_date = v_today;

    RETURN jsonb_build_object('success', true, 'message', 'Cash handover confirmed and balances updated.');
END;
$$;

-- 4.5 CONFIRM OWNER DEPOSIT
CREATE OR REPLACE FUNCTION public.fn_confirm_owner_deposit(
    p_deposit_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deposit RECORD;
    v_current_user UUID := auth.uid();
    v_today DATE := (timezone('Asia/Dhaka', now()))::DATE;
BEGIN
    SELECT * INTO v_deposit FROM public.owner_deposits WHERE id = p_deposit_id FOR UPDATE;

    IF v_deposit IS NULL THEN
        RAISE EXCEPTION 'Deposit record not found.';
    END IF;

    IF v_deposit.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Deposit has already been processed with status %.', v_deposit.status;
    END IF;

    -- Update deposit record
    UPDATE public.owner_deposits
    SET status = 'CONFIRMED',
        confirmed_by = v_current_user,
        confirmed_at = timezone('Asia/Dhaka', now()),
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = p_deposit_id;

    -- Update manager cash session
    UPDATE public.manager_cash_sessions
    SET cash_deposited_to_owner = cash_deposited_to_owner + v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE manager_id = v_deposit.manager_id AND session_date = v_today;

    -- Transfer account balance: From manager account to owner account
    UPDATE public.financial_accounts
    SET current_balance = current_balance - v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_deposit.from_account_id;

    UPDATE public.financial_accounts
    SET current_balance = current_balance + v_deposit.amount,
        updated_at = timezone('Asia/Dhaka', now())
    WHERE id = v_deposit.to_account_id;

    RETURN jsonb_build_object('success', true, 'message', 'Deposit confirmed by owner.');
END;
$$;

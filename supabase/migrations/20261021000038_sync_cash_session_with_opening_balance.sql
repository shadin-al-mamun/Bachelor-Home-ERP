-- ==============================================================================
-- Bachelor Home ERP — Migration 000038: Sync Manager Cash Sessions with Account Opening Balance
-- File: supabase/migrations/20261021000038_sync_cash_session_with_opening_balance.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Standard Timezone: Asia/Dhaka (UTC+6)
-- Purpose:
--   1. Synchronize open manager cash sessions with the financial account's opening balance
--      so that Dashboard 'ম্যানেজার ক্যাশ হেফাজত' and Accounts 'ম্যানেজার ক্যাশ বক্স' always match 100%.
--   2. Update fn_initialize_daily_cash_session to carry over account opening balance if no previous session exists.
-- ==============================================================================

BEGIN;

-- 1. Synchronize any currently OPEN cash session with the linked account's opening balance
UPDATE public.manager_cash_sessions s
SET opening_cash = a.opening_balance
FROM public.financial_accounts a
WHERE s.account_id = a.id
  AND s.status = 'OPEN'
  AND s.opening_cash = 0.00
  AND a.opening_balance > 0.00;

-- 2. Enhanced fn_initialize_daily_cash_session: Carry over account opening balance when starting fresh
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

    -- Carry over previous day's closing cash
    SELECT COALESCE(actual_counted_cash, expected_closing_cash) INTO v_last_closing_cash
    FROM public.manager_cash_sessions
    WHERE manager_id = p_manager_id AND session_date < p_session_date
    ORDER BY session_date DESC
    LIMIT 1;

    -- If no previous session exists, carry over the financial account's opening balance
    IF v_last_closing_cash IS NULL OR v_last_closing_cash = 0.00 THEN
        SELECT COALESCE(opening_balance, 0.00) INTO v_last_closing_cash
        FROM public.financial_accounts
        WHERE id = v_account_id;
    END IF;

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

-- 3. Trigger to keep open session opening_cash in sync whenever account opening_balance is set or edited
CREATE OR REPLACE FUNCTION public.fn_sync_cash_session_opening_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.account_type = 'CASH_MANAGER' AND NEW.opening_balance IS DISTINCT FROM OLD.opening_balance THEN
        UPDATE public.manager_cash_sessions
        SET opening_cash = NEW.opening_balance
        WHERE account_id = NEW.id
          AND status = 'OPEN';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cash_session_opening_balance ON public.financial_accounts;
CREATE TRIGGER trg_sync_cash_session_opening_balance
AFTER UPDATE OF opening_balance ON public.financial_accounts
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_cash_session_opening_balance();

COMMIT;

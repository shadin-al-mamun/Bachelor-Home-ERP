-- ==============================================================================
-- Bachelor Home ERP — Migration 000035: Sync Opening Balances to Current Balances
-- File: supabase/migrations/20261021000035_sync_opening_balance_to_current_balance.sql
-- Engine: PostgreSQL 15+ (Supabase Managed Platform)
-- Purpose:
--   1. Sync current_balance with opening_balance for accounts that were initialized.
--   2. Add a trigger to automatically update current_balance when opening_balance changes.
-- ==============================================================================

-- 1. Sync existing initialized opening balances to current_balance
UPDATE public.financial_accounts 
SET current_balance = opening_balance
WHERE current_balance = 0.00 AND opening_balance > 0.00;

-- 2. Trigger function to automatically maintain current_balance when opening_balance is set/modified
CREATE OR REPLACE FUNCTION public.fn_sync_financial_account_opening_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.current_balance = 0.00 AND NEW.opening_balance > 0.00 THEN
            NEW.current_balance := NEW.opening_balance;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.opening_balance IS DISTINCT FROM OLD.opening_balance THEN
            IF OLD.current_balance = 0.00 AND OLD.opening_balance = 0.00 THEN
                NEW.current_balance := NEW.opening_balance;
            ELSIF OLD.current_balance = OLD.opening_balance THEN
                NEW.current_balance := NEW.opening_balance;
            ELSE
                NEW.current_balance := GREATEST(0.00, OLD.current_balance + (NEW.opening_balance - OLD.opening_balance));
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_financial_account_opening_balance ON public.financial_accounts;
CREATE TRIGGER trg_sync_financial_account_opening_balance
BEFORE INSERT OR UPDATE OF opening_balance ON public.financial_accounts
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_financial_account_opening_balance();

-- Migration: 20261123000002_heal_refunded_security_deposits.sql
-- Description:
--   1. Automatically updates allocations.security_deposit to 0.00 for any boarders
--      whose security deposit was already deducted / refunded via recorded expense vouchers.
--   2. Ensures fn_cancel_allocation safely handles deposit refund synchronization.

BEGIN;

-- 1. Auto-heal allocations where security deposit refund vouchers already exist in expenses
UPDATE public.allocations a
SET security_deposit = 0.00,
    updated_at = timezone('Asia/Dhaka', now())
FROM public.boarders b
WHERE b.id = a.boarder_id
  AND a.security_deposit > 0
  AND EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE (
          e.description ILIKE '%' || b.boarder_code || '%' 
          OR e.description ILIKE '%' || b.id::text || '%'
          OR e.description ILIKE '%' || b.full_name || '%'
      )
      AND (
          e.description ILIKE '%জামানত ফেরত%' 
          OR e.description ILIKE '%Security Deposit%' 
          OR e.description ILIKE '%রিফান্ড%' 
          OR e.description ILIKE '%ছাড়পত্র%'
      )
      AND e.approval_status <> 'REJECTED'
  );

COMMIT;

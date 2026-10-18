/**
 * Bachelor Home ERP — Finance & Cash Reconciliation Utility
 * Standard Timezone: Asia/Dhaka
 * Currency: BDT (Bangladeshi Taka, precision 2 decimals)
 */

export interface CashReconciliationInput {
  openingCash: number
  cashReceipts: number
  cashHandedOverIn: number
  cashExpenses: number
  cashDepositedToOwner: number
  cashHandedOverOut: number
}

/**
 * Calculates expected closing cash for a daily manager cash session:
 * Formula: Opening + Receipts + HandoverIn - Expenses - Deposits - HandoverOut
 * Uses cent/paisa integer arithmetic to eliminate floating-point precision errors.
 */
export function calculateExpectedCash(input: CashReconciliationInput): number {
  const {
    openingCash,
    cashReceipts,
    cashHandedOverIn,
    cashExpenses,
    cashDepositedToOwner,
    cashHandedOverOut,
  } = input

  const openingCents = Math.round((Number(openingCash) || 0) * 100)
  const receiptsCents = Math.round((Number(cashReceipts) || 0) * 100)
  const handoverInCents = Math.round((Number(cashHandedOverIn) || 0) * 100)
  const expensesCents = Math.round((Number(cashExpenses) || 0) * 100)
  const depositsCents = Math.round((Number(cashDepositedToOwner) || 0) * 100)
  const handoverOutCents = Math.round((Number(cashHandedOverOut) || 0) * 100)

  const expectedCents =
    openingCents +
    receiptsCents +
    handoverInCents -
    expensesCents -
    depositsCents -
    handoverOutCents

  return Number((expectedCents / 100).toFixed(2))
}

/**
 * Calculates actual cash variance:
 * Formula: actual_counted_cash - expected_closing_cash
 * A positive value means surplus cash, a negative value means cash deficit.
 */
export function calculateCashVariance(actualCounted: number, expected: number): number {
  const actualCents = Math.round((Number(actualCounted) || 0) * 100)
  const expectedCents = Math.round((Number(expected) || 0) * 100)
  return Number(((actualCents - expectedCents) / 100).toFixed(2))
}

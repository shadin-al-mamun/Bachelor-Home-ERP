/**
 * Auto-distributes partial or full payment across oldest unpaid charges first (FIFO order).
 * Returns record mapping each charge id to the amount distributed.
 */
export interface UnpaidChargeItem {
  id: string
  due_amount: number | string
  billing_month?: string
}

export function autoDistributePayment(
  amountReceived: number,
  unpaidCharges: UnpaidChargeItem[]
): Record<string, number> {
  let remaining = Math.max(0, Number(amountReceived) || 0)
  const distribution: Record<string, number> = {}

  for (const charge of unpaidCharges) {
    if (remaining <= 0) {
      distribution[charge.id] = 0
    } else {
      const chargeDue = Math.max(0, Number(charge.due_amount) || 0)
      const toPay = Math.min(remaining, chargeDue)
      distribution[charge.id] = toPay
      remaining = Math.round((remaining - toPay) * 100) / 100
    }
  }

  return distribution
}

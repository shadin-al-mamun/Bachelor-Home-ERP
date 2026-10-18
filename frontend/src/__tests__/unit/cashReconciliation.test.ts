import { describe, it, expect } from 'vitest'
import {
  calculateExpectedCash,
  calculateCashVariance,
  type CashReconciliationInput,
} from '@/utils/finance'

describe('cashReconciliation.test.ts - Cash Reconciliation & Variance Formula', () => {
  it('accurately calculates expected cash: Opening + Receipts + HandoverIn - Expenses - Deposits - HandoverOut', () => {
    const input: CashReconciliationInput = {
      openingCash: 12500.0,
      cashReceipts: 14500.0,
      cashHandedOverIn: 3500.0,
      cashExpenses: 3250.0,
      cashDepositedToOwner: 5000.0,
      cashHandedOverOut: 1500.0,
    }

    // 12500 + 14500 + 3500 - 3250 - 5000 - 1500 = 20750.00
    const expected = calculateExpectedCash(input)
    expect(expected).toBe(20750.0)
  })

  it('matches PRD §15.1 and Test FIN-05 scenario: Expected = 15000, Counted = 14500 => Variance = -500', () => {
    const input: CashReconciliationInput = {
      openingCash: 10000,
      cashReceipts: 8000,
      cashHandedOverIn: 0,
      cashExpenses: 3000,
      cashDepositedToOwner: 0,
      cashHandedOverOut: 0,
    }

    const expected = calculateExpectedCash(input)
    expect(expected).toBe(15000.0)

    const actualCounted = 14500.0
    const variance = calculateCashVariance(actualCounted, expected)
    expect(variance).toBe(-500.0)
  })

  it('calculates zero variance when counted cash matches expected cash exactly', () => {
    const expected = 18750.0
    const actualCounted = 18750.0
    const variance = calculateCashVariance(actualCounted, expected)
    expect(variance).toBe(0.0)
  })

  it('calculates positive cash surplus variance when counted cash is higher', () => {
    const expected = 12500.0
    const actualCounted = 12750.0
    const variance = calculateCashVariance(actualCounted, expected)
    expect(variance).toBe(250.0)
  })

  it('eliminates floating-point binary rounding errors on cent/paisa fractions', () => {
    // In IEEE 754 float: 0.1 + 0.2 === 0.30000000000000004
    const input: CashReconciliationInput = {
      openingCash: 0.1,
      cashReceipts: 0.2,
      cashHandedOverIn: 0.7,
      cashExpenses: 0.4,
      cashDepositedToOwner: 0.3,
      cashHandedOverOut: 0.1,
    }

    // (0.1 + 0.2 + 0.7) - (0.4 + 0.3 + 0.1) = 1.0 - 0.8 = 0.20
    const expected = calculateExpectedCash(input)
    expect(expected).toBe(0.2)

    // Variance test with decimal cents: 0.23 - 0.20 = 0.03 exactly
    const variance = calculateCashVariance(0.23, expected)
    expect(variance).toBe(0.03)
  })

  it('handles negative or zero values safely without NaN', () => {
    const input: CashReconciliationInput = {
      openingCash: 0,
      cashReceipts: 0,
      cashHandedOverIn: 0,
      cashExpenses: 0,
      cashDepositedToOwner: 0,
      cashHandedOverOut: 0,
    }

    expect(calculateExpectedCash(input)).toBe(0.0)
    expect(calculateCashVariance(0, 0)).toBe(0.0)
  })
})

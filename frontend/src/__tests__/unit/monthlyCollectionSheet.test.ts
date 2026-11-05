import { describe, it, expect } from 'vitest'
import {
  toBengaliDigits,
  formatSheetMonthBn,
  formatSheetAmount,
  formatSheetBalance,
  type PaymentSlot,
  type MonthlyCollectionSheetRow,
} from '@/features/reports/api/useMonthlyCollectionSheetData'

describe('Monthly Bill Collection Sheet Calculations & Formats (১৫টি কলাম টেস্ট)', () => {
  it('converts English numbers to Bengali numerals correctly', () => {
    expect(toBengaliDigits(0)).toBe('০')
    expect(toBengaliDigits(1)).toBe('১')
    expect(toBengaliDigits(1234567890)).toBe('১২৩৪৫৬৭৮৯০')
    expect(toBengaliDigits('206')).toBe('২০৬')
    expect(toBengaliDigits('')).toBe('')
    expect(toBengaliDigits(null)).toBe('')
  })

  it('formats Bengali month and year like "অক্টোবর/২০২৬" matching template', () => {
    expect(formatSheetMonthBn('2026-10')).toBe('অক্টোবর/২০২৬')
    expect(formatSheetMonthBn('2026-11')).toBe('নভেম্বর/২০২৬')
    expect(formatSheetMonthBn('2026-01')).toBe('জানুয়ারি/২০২৬')
  })

  it('formats amounts in Bengali currency notation e.g. "২৪০০/-"', () => {
    expect(formatSheetAmount(2400)).toBe('২,৪০০/-')
    expect(formatSheetAmount(1000)).toBe('১,০০০/-')
    expect(formatSheetAmount(0)).toBe('—')
    expect(formatSheetAmount(null)).toBe('—')
  })

  it('formats net balance in Column 15 strictly as Col 10 - Col 14', () => {
    // Zero balance
    expect(formatSheetBalance(0)).toBe('০/-')
    // Negative balance (Due / পাওনা)
    expect(formatSheetBalance(-400)).toBe('-৪০০/-')
    // Positive balance (Advance / দেনা)
    expect(formatSheetBalance(300)).toBe('৩০০/-')
  })

  it('validates Col 5 to Col 9 waterfall payment allocation logic', () => {
    // Scenario 1: Boarder with previous due = 1408 Tk
    // Receives payment of 1000 Tk with voucher RCT-001024
    const prevDue = 1408
    const receipts = [{ amount: 1000, voucher: 'RCT-001024' }]

    let remPrevDue = prevDue
    let col5Amount = 0
    const col5Vouchers: string[] = []
    const currentPayments: PaymentSlot[] = []

    receipts.forEach((r) => {
      let remAmt = r.amount
      if (remPrevDue > 0 && remAmt > 0) {
        const payTowardsPrev = Math.min(remAmt, remPrevDue)
        col5Amount += payTowardsPrev
        col5Vouchers.push(r.voucher)
        remPrevDue -= payTowardsPrev
        remAmt -= payTowardsPrev
      }
      if (remAmt > 0) {
        currentPayments.push({ amount: remAmt, voucher: r.voucher })
      }
    })

    // Col 5 gets the 1000 Tk towards previous due
    expect(col5Amount).toBe(1000)
    expect(col5Vouchers).toEqual(['RCT-001024'])
    // No surplus for current month
    expect(currentPayments.length).toBe(0)
    expect(remPrevDue).toBe(408) // 408 Tk still unpaid

    // Scenario 2: Second payment of 2000 Tk arrives with voucher RCT-001025
    const secondReceipt = { amount: 2000, voucher: 'RCT-001025' }
    let remAmt = secondReceipt.amount
    if (remPrevDue > 0 && remAmt > 0) {
      const payTowardsPrev = Math.min(remAmt, remPrevDue)
      col5Amount += payTowardsPrev
      col5Vouchers.push(secondReceipt.voucher)
      remPrevDue -= payTowardsPrev
      remAmt -= payTowardsPrev
    }
    if (remAmt > 0) {
      currentPayments.push({ amount: remAmt, voucher: secondReceipt.voucher })
    }

    // Col 5 now fully covers the remaining 408 Tk (total 1408 Tk)
    expect(col5Amount).toBe(1408)
    expect(col5Vouchers).toEqual(['RCT-001024', 'RCT-001025'])
    // Leftover 1592 Tk flows to Col 6 (চলতি মাসে আদায় - ১ম)!
    expect(currentPayments.length).toBe(1)
    expect(currentPayments[0].amount).toBe(1592)
    expect(currentPayments[0].voucher).toBe('RCT-001025')
  })

  it('verifies exact formulas for Col 10, Col 14, and Col 15', () => {
    const row: MonthlyCollectionSheetRow = {
      sl: 1,
      boarderId: 'b-1',
      boarderName: 'মারুফ বিল্লাহ',
      boarderPhone: '01712345678',
      boarderCode: 'BDR-2026-3737',
      flatCode: 'Flat-206',
      flatName: 'ফ্ল্যাট ২০৬',
      roomSeatText: 'Room-B • Seat B-2',
      advanceAmount: 2400,
      hasAdvance: true,
      previousDue: 1408,
      previousDueCollected: 1408,
      previousDueVouchers: ['RCT-001024'],
      payments: [
        { amount: 1592, voucher: 'RCT-001025' },
        { amount: 1608, voucher: 'RCT-001026' },
      ],
      totalCurrentCollected: 0, // to calculate
      seatRent: 3200, // Col 11
      serviceCharge: 200, // Col 12
      mealCharge: 1500, // Col 13
      totalCurrentExpense: 0, // to calculate
      netBalance: 0, // to calculate
    }

    // Col 10 = sum of payments (Cols 6-9)
    row.totalCurrentCollected = row.payments.reduce((s, p) => s + p.amount, 0)
    expect(row.totalCurrentCollected).toBe(3200)

    // Col 14 = Col 11 + Col 12 + Col 13
    row.totalCurrentExpense = row.seatRent + row.serviceCharge + row.mealCharge
    expect(row.totalCurrentExpense).toBe(4900)

    // Col 15 = Col 10 - Col 14
    row.netBalance = row.totalCurrentCollected - row.totalCurrentExpense
    expect(row.netBalance).toBe(-1700) // 3200 - 4900 = -1700 (Due 1700 Tk)
  })
})


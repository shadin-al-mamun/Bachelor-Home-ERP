import { describe, it, expect } from 'vitest'

describe('Flat Utility & Miscellaneous Billing Calculation', () => {
  // Pure calculation logic mirroring MonthlyBillGenerationPage and GenerateFlatUtilityBillsModal
  function computeFlatBilling(params: {
    totalVoucherAmount: number
    totalSeats: number
    activeBoardersCount?: number
    cookBill: number
    otherBill: number
  }) {
    const seatCount =
      params.totalSeats > 0 ? params.totalSeats : params.activeBoardersCount || 1
    const utilityPerHead = Math.round(params.totalVoucherAmount / seatCount)
    const otherBillTotal = Number(params.otherBill || 0)
    const otherBillPerHead = Math.round(otherBillTotal / seatCount)
    const grandTotalPerHead =
      utilityPerHead + Number(params.cookBill || 0) + otherBillPerHead

    return {
      seatCount,
      utilityPerHead,
      otherBillTotal,
      otherBillPerHead,
      grandTotalPerHead,
    }
  }

  it('matches exact screenshot calculation for Flat-206 with 0 other bill', () => {
    // Screenshot: Flat-206, 9 seats, 3000 Tk vouchers, 600 Tk cook bill, 0 other bill
    const res = computeFlatBilling({
      totalVoucherAmount: 3000,
      totalSeats: 9,
      cookBill: 600,
      otherBill: 0,
    })

    expect(res.utilityPerHead).toBe(333) // 3000 / 9 = 333.33 -> 333
    expect(res.otherBillPerHead).toBe(0)
    expect(res.grandTotalPerHead).toBe(933) // 333 + 600 + 0 = 933
  })

  it('divides other bill by total seats and adds to grand total per head', () => {
    // If manager enters 900 Tk in other bill for Flat-206 (9 seats)
    const res = computeFlatBilling({
      totalVoucherAmount: 3000,
      totalSeats: 9,
      cookBill: 600,
      otherBill: 900,
    })

    expect(res.utilityPerHead).toBe(333)
    expect(res.otherBillPerHead).toBe(100) // 900 / 9 = 100
    expect(res.grandTotalPerHead).toBe(1033) // 333 + 600 + 100 = 1033
  })

  it('matches screenshot calculation for Flat-207 and properly divides other bill', () => {
    // Screenshot: Flat-207, 6 seats, 1100 Tk vouchers, 600 Tk cook bill
    const resWithoutOther = computeFlatBilling({
      totalVoucherAmount: 1100,
      totalSeats: 6,
      cookBill: 600,
      otherBill: 0,
    })

    expect(resWithoutOther.utilityPerHead).toBe(183) // 1100 / 6 = 183.33 -> 183
    expect(resWithoutOther.grandTotalPerHead).toBe(783) // 183 + 600 = 783 (as seen in screenshot)

    // With 300 Tk other bill for the flat
    const resWithOther = computeFlatBilling({
      totalVoucherAmount: 1100,
      totalSeats: 6,
      cookBill: 600,
      otherBill: 300,
    })

    expect(resWithOther.otherBillPerHead).toBe(50) // 300 / 6 = 50
    expect(resWithOther.grandTotalPerHead).toBe(833) // 783 + 50 = 833
  })

  it('handles fractions cleanly using rounding', () => {
    // 500 Tk other bill divided across 9 seats = 55.55 -> 56 Tk per head
    const res = computeFlatBilling({
      totalVoucherAmount: 3000,
      totalSeats: 9,
      cookBill: 600,
      otherBill: 500,
    })

    expect(res.otherBillPerHead).toBe(56) // Math.round(500 / 9) = 56
    expect(res.grandTotalPerHead).toBe(989) // 333 + 600 + 56 = 989
  })

  it('safely guards against zero or negative seats', () => {
    const res = computeFlatBilling({
      totalVoucherAmount: 1000,
      totalSeats: 0,
      activeBoardersCount: 2,
      cookBill: 500,
      otherBill: 200,
    })

    expect(res.seatCount).toBe(2)
    expect(res.utilityPerHead).toBe(500) // 1000 / 2
    expect(res.otherBillPerHead).toBe(100) // 200 / 2
    expect(res.grandTotalPerHead).toBe(1100)
  })

  it('formats bill description showing per-head other bill', () => {
    const billingMonth = '2026-10-01'
    const effectiveUtility = 333
    const cookBill = 600
    const otherBillPerHead = 100

    const desc = `${billingMonth.slice(0, 7)} — ফ্ল্যাট বিবিধ বিল (ইউটিলিটি: ৳${effectiveUtility}, বাবুর্চি: ৳${cookBill}${
      otherBillPerHead > 0 ? `, অন্যান্য: ৳${otherBillPerHead}` : ''
    })`

    expect(desc).toBe('2026-10 — ফ্ল্যাট বিবিধ বিল (ইউটিলিটি: ৳333, বাবুর্চি: ৳600, অন্যান্য: ৳100)')
  })
})

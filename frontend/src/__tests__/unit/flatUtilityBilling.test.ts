import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveFlatUtilityInputsToStorage,
  loadFlatUtilityInputsFromStorage,
  saveFlatUtilityDistributionToStorage,
  loadFlatUtilityDistributionFromStorage,
} from '@/features/billing/api/useFlatUtilityBilling'

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

  it('matches exact October 2026 calculation for Flat-206 (9 seats, 3500 Tk vouchers, 600 Tk cook bill)', () => {
    // 5 real expense vouchers totaling 3500 Tk (200 + 1200 + 800 + 800 + 500)
    // Flat-206 has 9 seats total (6 occupied, 2 available, 1 maintenance)
    // Ceiling of 3500 / 9 = 389 Tk utility
    const res = computeFlatBilling({
      totalVoucherAmount: 3500,
      totalSeats: 9,
      cookBill: 600,
      otherBill: 0,
    })

    expect(res.seatCount).toBe(9)
    expect(res.utilityPerHead).toBe(389) // Math.round(3500 / 9) = 389
    expect(res.otherBillPerHead).toBe(0)
    expect(res.grandTotalPerHead).toBe(989) // 389 + 600 = 989
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

  describe('Storage Persistence for Previous Month Inputs & Distribution', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('saves custom other bill inputs for previous month and restores them accurately', () => {
      const month = '2026-10'
      const inputs = {
        'flat-206': {
          seatCount: 9,
          cookBill: 600,
          otherBill: 900,
        },
        'flat-207': {
          seatCount: 6,
          cookBill: 600,
          otherBill: 300,
        },
      }

      saveFlatUtilityInputsToStorage(month, inputs)
      const restored = loadFlatUtilityInputsFromStorage(month)

      expect(restored).not.toBeNull()
      expect(restored?.['flat-206']?.otherBill).toBe(900)
      expect(restored?.['flat-206']?.seatCount).toBe(9)
      expect(restored?.['flat-207']?.otherBill).toBe(300)
    })

    it('persists generated distributions across months without interference', () => {
      const octDist = {
        'flat-206': {
          flat_id: 'flat-206',
          total_seats: 9,
          total_voucher_amount: 3500,
          utility_per_head: 389,
          cook_bill: 600,
          other_bill: 900,
          other_bill_per_head: 100,
          grand_total_per_head: 1089,
          is_billed: true,
        },
      }

      const novDist = {
        'flat-206': {
          flat_id: 'flat-206',
          total_seats: 9,
          total_voucher_amount: 4000,
          utility_per_head: 444,
          cook_bill: 600,
          other_bill: 0,
          other_bill_per_head: 0,
          grand_total_per_head: 1044,
          is_billed: true,
        },
      }

      saveFlatUtilityDistributionToStorage('2026-10', octDist)
      saveFlatUtilityDistributionToStorage('2026-11', novDist)

      const octLoaded = loadFlatUtilityDistributionFromStorage('2026-10')
      const novLoaded = loadFlatUtilityDistributionFromStorage('2026-11')

      expect(octLoaded?.['flat-206']?.other_bill).toBe(900)
      expect(octLoaded?.['flat-206']?.other_bill_per_head).toBe(100)
      expect(octLoaded?.['flat-206']?.grand_total_per_head).toBe(1089)

      expect(novLoaded?.['flat-206']?.other_bill).toBe(0)
      expect(novLoaded?.['flat-206']?.grand_total_per_head).toBe(1044)
    })
  })
})

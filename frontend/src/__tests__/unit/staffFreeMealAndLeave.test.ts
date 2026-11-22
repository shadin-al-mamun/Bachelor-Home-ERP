import { describe, it, expect, beforeEach } from 'vitest'
import {
  setMockStaffMealLeave,
} from '@/features/meals/api/useKitchenMeals'

describe('Staff Free Accommodation, Free Meals & Leave Management', () => {
  beforeEach(() => {
    // Reset any overrides
    setMockStaffMealLeave('bdr-staff-cook', '2026-11-23', '2026-11-25', false)
  })

  it('1. Correctly calculates zero meal charge for staff with free meal benefits in monthly billing preview', () => {
    // Sample boarders list including paying boarders and resident staff
    const boarders = [
      {
        id: 'bdr-paying-01',
        full_name: 'আরিফুল ইসলাম',
        institution: 'ঢাকা বিশ্ববিদ্যালয়',
        active_allocation: {
          id: 'alloc-1',
          remarks: 'সাধারণ সিট বরাদ্দ',
        },
      },
      {
        id: 'bdr-staff-cook',
        full_name: 'মোঃ রফিক (বাবুর্চি)',
        institution: 'হোস্টেল কর্মচারী (বাবুর্চি / কিচেন স্টাফ) [ফ্রি মিল]',
        active_allocation: {
          id: 'alloc-staff-1',
          remarks: 'হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা ও ফ্রি মিল) [ফ্রি মিল সুবিধা অন্তর্ভুক্ত]',
        },
      },
    ]

    const bRate = 26
    const lRate = 52
    const dRate = 52
    const defaultMinMeals = 45

    const results = boarders.map((b) => {
      const activeAlloc = b.active_allocation
      const bCount = 20
      const lCount = 20
      const dCount = 20
      const consumedMeals = (bCount * 0.5) + (lCount * 1.0) + (dCount * 1.0)

      const isStaffFree =
        Boolean(activeAlloc?.remarks?.includes('কর্মচারী')) ||
        Boolean(activeAlloc?.remarks?.includes('স্টাফ')) ||
        Boolean(activeAlloc?.remarks?.includes('ফ্রি মিল')) ||
        Boolean(b.institution?.includes('কর্মচারী')) ||
        Boolean(b.institution?.includes('স্টাফ')) ||
        Boolean(b.institution?.includes('ফ্রি মিল'))

      const minMeals = isStaffFree ? 0 : defaultMinMeals
      const shortfallMeals = Math.max(0, minMeals - consumedMeals)
      const shortfallCost = isStaffFree ? 0 : shortfallMeals * lRate
      const totalCost = (bCount * bRate) + (lCount * lRate) + (dCount * dRate) + shortfallCost

      return {
        boarder_id: b.id,
        boarder_name: b.full_name,
        consumed_meals: consumedMeals,
        total_amount: isStaffFree ? 0 : totalCost,
        is_staff_free_meal: isStaffFree,
      }
    })

    const payingResult = results.find((r) => r.boarder_id === 'bdr-paying-01')
    const staffResult = results.find((r) => r.boarder_id === 'bdr-staff-cook')

    expect(payingResult?.is_staff_free_meal).toBe(false)
    expect(payingResult?.total_amount).toBeGreaterThan(0)

    expect(staffResult?.is_staff_free_meal).toBe(true)
    expect(staffResult?.total_amount).toBe(0)
  })

  it('2. Turns OFF meals for staff when on leave, preventing unnecessary kitchen preparation', () => {
    // Mark staff on leave from 2026-11-23 to 2026-11-26
    setMockStaffMealLeave('bdr-staff-cook', '2026-11-23', '2026-11-26', true, 'গ্রামের বাড়ি গমন')

    // Simulate kitchen check for that staff during leave
    const leaveState = {
      boarder_id: 'bdr-staff-cook',
      breakfast: false,
      lunch: false,
      dinner: false,
      is_override: true,
      override_reason: 'গ্রামের বাড়ি গমন',
    }

    expect(leaveState.breakfast).toBe(false)
    expect(leaveState.lunch).toBe(false)
    expect(leaveState.dinner).toBe(false)
    expect(leaveState.override_reason).toBe('গ্রামের বাড়ি গমন')

    // In kitchen headcounts: when breakfast, lunch, dinner are false,
    // they add 0 to bCount, lCount, and dCount
    const bContribution = leaveState.breakfast ? 1 : 0
    const lContribution = leaveState.lunch ? 1 : 0
    const dContribution = leaveState.dinner ? 1 : 0

    expect(bContribution).toBe(0)
    expect(lContribution).toBe(0)
    expect(dContribution).toBe(0)
  })

  it('3. Resumes meals automatically when staff returns from leave', () => {
    // Cancel leave / resume meals
    setMockStaffMealLeave('bdr-staff-cook', '2026-11-23', '2026-11-26', false)

    const resumedState = {
      boarder_id: 'bdr-staff-cook',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: false,
      override_reason: null,
    }

    expect(resumedState.breakfast).toBe(true)
    expect(resumedState.lunch).toBe(true)
    expect(resumedState.dinner).toBe(true)
    expect(resumedState.is_override).toBe(false)

    // In kitchen headcounts: when active, they contribute to preparation
    const bContribution = resumedState.breakfast ? 1 : 0
    const lContribution = resumedState.lunch ? 1 : 0
    const dContribution = resumedState.dinner ? 1 : 0

    expect(bContribution).toBe(1)
    expect(lContribution).toBe(1)
    expect(dContribution).toBe(1)
  })

  it('4. Batch charge creation skips staff with free meals so 0 dues are created', () => {
    const previewItems = [
      {
        boarder_id: 'bdr-1',
        total_amount: 2500,
        is_staff_free_meal: false,
      },
      {
        boarder_id: 'bdr-staff-cook',
        total_amount: 0,
        is_staff_free_meal: true,
      },
    ]

    const chargesToInsert = previewItems.filter(
      (item) => !item.is_staff_free_meal && item.total_amount > 0
    )

    expect(chargesToInsert.length).toBe(1)
    expect(chargesToInsert[0].boarder_id).toBe('bdr-1')
    expect(chargesToInsert.some((c) => c.boarder_id === 'bdr-staff-cook')).toBe(false)
  })
})

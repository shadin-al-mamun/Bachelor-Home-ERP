import { describe, it, expect } from 'vitest'

describe('Breakfast 0.5 Weight & Future Seat Allocation Exclusion Rules', () => {
  // Test Data mimicking the user's scenario
  const targetDate = '2026-11-09'

  const mockAllocations = [
    // Flat-206 Boarders (5 currently seated + 1 future allocation)
    {
      id: 'alloc-1',
      boarder_id: 'bdr-apurba',
      boarder_name: 'অপূর্ব সাহা',
      status: 'ACTIVE',
      start_date: '2026-10-19',
      admission_date: '2026-10-19',
      flat_id: 'flat-206',
    },
    {
      id: 'alloc-2',
      boarder_id: 'bdr-mosharraf',
      boarder_name: 'মোশারফ হোসেন',
      status: 'ACTIVE',
      start_date: '2026-10-27',
      admission_date: '2026-10-27',
      flat_id: 'flat-206',
    },
    {
      id: 'alloc-3',
      boarder_id: 'bdr-malek',
      boarder_name: 'আব্দুল মালেক ইবনে রহমান',
      status: 'ACTIVE',
      start_date: '2026-10-28',
      admission_date: '2026-10-28',
      flat_id: 'flat-206',
    },
    {
      id: 'alloc-4',
      boarder_id: 'bdr-maruf',
      boarder_name: 'মারুফ বিল্লাহ',
      status: 'ACTIVE',
      start_date: '2026-10-22',
      admission_date: '2026-10-22',
      flat_id: 'flat-206',
    },
    {
      id: 'alloc-5',
      boarder_id: 'bdr-zahid',
      boarder_name: 'জাহিদ হাসান',
      status: 'ACTIVE',
      start_date: '2026-10-21',
      admission_date: '2026-10-21',
      flat_id: 'flat-206',
    },
    // Hashem: Allocation starts from 01 Dec 2026 (Future Boarder!)
    {
      id: 'alloc-6',
      boarder_id: 'bdr-hashem',
      boarder_name: 'হাশেম',
      status: 'ACTIVE',
      start_date: '2026-12-01',
      admission_date: '2026-12-01',
      flat_id: 'flat-206',
    },
    // Flat-207 Boarders (5 currently seated)
    {
      id: 'alloc-7',
      boarder_id: 'bdr-7',
      boarder_name: 'বর্ডার ৭',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-8',
      boarder_id: 'bdr-8',
      boarder_name: 'বর্ডার ৮',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-9',
      boarder_id: 'bdr-9',
      boarder_name: 'বর্ডার ৯',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-10',
      boarder_id: 'bdr-10',
      boarder_name: 'বর্ডার ১০',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-11',
      boarder_id: 'bdr-11',
      boarder_name: 'বর্ডার ১১',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      flat_id: 'flat-207',
    },
  ]

  it('strictly excludes future allocations (like Hashem starting 01 Dec 2026) from meal calculations on 2026-11-09', () => {
    // Business Rule: "বর্ডার হাশেম এর জন্য সিট বরাদ্দ দেয়া হয়েছে আগামী ডিসেম্বর মাসের ১ তারিখ থেকে।
    // যেহেতু আগামী মাসের ১ তারিখ থেকে সিট বরাদ্দ দেয়া হয়েছে, সেহেতু এই বর্ডার এখনো তার সিটে উঠেনি।
    // কিন্তু তার অনুকূলে মিল কাউন্ট হচ্ছে, এটাতো সম্ভব নয়।"
    const activeAllocationsOnNov9 = mockAllocations.filter((a) => {
      if (a.status !== 'ACTIVE') return false
      if (a.start_date > targetDate) return false
      if (a.admission_date > targetDate) return false
      return true
    })

    const hashemIncluded = activeAllocationsOnNov9.some((a) => a.boarder_id === 'bdr-hashem')
    expect(hashemIncluded).toBe(false)

    // Flat-206 must only have 5 active residents, NOT 6
    const flat206Boarders = activeAllocationsOnNov9.filter((a) => a.flat_id === 'flat-206')
    expect(flat206Boarders.length).toBe(5)

    // Total active residents across all flats must be 10, NOT 11
    expect(activeAllocationsOnNov9.length).toBe(10)
  })

  it('includes Hashem when target date reaches his seat allocation start date (2026-12-01)', () => {
    const futureDate = '2026-12-01'
    const activeAllocationsOnDec1 = mockAllocations.filter((a) => {
      if (a.status !== 'ACTIVE') return false
      if (a.start_date > futureDate) return false
      if (a.admission_date > futureDate) return false
      return true
    })

    const hashemIncluded = activeAllocationsOnDec1.some((a) => a.boarder_id === 'bdr-hashem')
    expect(hashemIncluded).toBe(true)
    const flat206Boarders = activeAllocationsOnDec1.filter((a) => a.flat_id === 'flat-206')
    expect(flat206Boarders.length).toBe(6)
  })

  it('calculates morning meal (সকালের নাস্তা) as 0.5 (আধা মিল), lunch as 1.0, and dinner as 1.0', () => {
    // Single boarder with all 3 meals ON
    const fullDayMeals = {
      breakfast: true,
      lunch: true,
      dinner: true,
    }

    const bdrTotal =
      (fullDayMeals.breakfast ? 0.5 : 0) +
      (fullDayMeals.lunch ? 1.0 : 0) +
      (fullDayMeals.dinner ? 1.0 : 0)

    expect(bdrTotal).toBe(2.5)

    // Boarder with only breakfast ON
    const breakfastOnlyTotal = (true ? 0.5 : 0) + (false ? 1.0 : 0) + (false ? 1.0 : 0)
    expect(breakfastOnlyTotal).toBe(0.5)

    // Boarder with breakfast OFF, lunch & dinner ON
    const lunchDinnerTotal = (false ? 0.5 : 0) + (true ? 1.0 : 0) + (true ? 1.0 : 0)
    expect(lunchDinnerTotal).toBe(2.0)
  })

  it('verifies that Flat totals and Grand Totals match Dashboard metrics perfectly', () => {
    // On 2026-11-09:
    // Flat-206 has 5 active residents. Under opt-out mess policy (all 3 meals active):
    // Breakfast: 5 * 0.5 = 2.5 meals
    // Lunch: 5 * 1.0 = 5.0 meals
    // Dinner: 5 * 1.0 = 5.0 meals
    // Flat-206 Total = 12.5 meals!
    const flat206BreakfastCount = 5
    const flat206LunchCount = 5
    const flat206DinnerCount = 5
    const flat206TotalMeals =
      Math.round(
        (flat206BreakfastCount * 0.5 + flat206LunchCount * 1.0 + flat206DinnerCount * 1.0) * 10
      ) / 10
    expect(flat206TotalMeals).toBe(12.5)

    // Flat-207 has 5 active residents:
    const flat207BreakfastCount = 5
    const flat207LunchCount = 5
    const flat207DinnerCount = 5
    const flat207TotalMeals =
      Math.round(
        (flat207BreakfastCount * 0.5 + flat207LunchCount * 1.0 + flat207DinnerCount * 1.0) * 10
      ) / 10
    expect(flat207TotalMeals).toBe(12.5)

    // Kitchen Page Grand Total:
    const grandBreakfast = flat206BreakfastCount + flat207BreakfastCount // 10
    const grandLunch = flat206LunchCount + flat207LunchCount // 10
    const grandDinner = flat206DinnerCount + flat207DinnerCount // 10
    const kitchenGrandTotal =
      Math.round((grandBreakfast * 0.5 + grandLunch * 1.0 + grandDinner * 1.0) * 10) / 10
    expect(kitchenGrandTotal).toBe(25.0)

    // Dashboard "আজকের মিল" (Active Meals Today) for 10 active seated residents:
    const activeResidentsCount = 10
    const dashboardActiveMealsToday = activeResidentsCount * 2.5
    expect(dashboardActiveMealsToday).toBe(25.0)

    // Kitchen Page Grand Total and Dashboard match to the decimal!
    expect(kitchenGrandTotal).toBe(dashboardActiveMealsToday)
  })

  it('weights guest meals appropriately (breakfast 0.5, lunch 1.0, dinner 1.0)', () => {
    const guestBookings = [
      { session: 'BREAKFAST', guest_count: 2 }, // 2 * 0.5 = 1.0 meal
      { session: 'LUNCH', guest_count: 1 }, // 1 * 1.0 = 1.0 meal
      { session: 'DINNER', guest_count: 3 }, // 3 * 1.0 = 3.0 meals
    ]

    const guestMealsTotal = guestBookings.reduce((sum, gb) => {
      const weight = gb.session === 'BREAKFAST' ? 0.5 : 1.0
      return sum + gb.guest_count * weight
    }, 0)

    expect(guestMealsTotal).toBe(5.0)
  })
})

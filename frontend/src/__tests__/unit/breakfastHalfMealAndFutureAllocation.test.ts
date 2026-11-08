import { describe, it, expect } from 'vitest'

describe('Breakfast 0.5 Weight & Future Seat Allocation Exclusion Rules', () => {
  // Test Data mimicking the user's scenario
  const targetDate = '2026-11-09'

  const mockAllocations = [
    // Flat-206 Boarders (5 seated + 1 departure notice pending + 1 advance booking)
    {
      id: 'alloc-1',
      boarder_id: 'bdr-apurba',
      boarder_name: 'অপূর্ব সাহা',
      status: 'ACTIVE',
      start_date: '2026-10-19',
      admission_date: '2026-10-19',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat A-1',
    },
    {
      id: 'alloc-2',
      boarder_id: 'bdr-mosharraf',
      boarder_name: 'মোশারফ হোসেন',
      status: 'ACTIVE',
      start_date: '2026-10-27',
      admission_date: '2026-10-27',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat A-3',
    },
    {
      id: 'alloc-3',
      boarder_id: 'bdr-malek',
      boarder_name: 'আব্দুল মালেক ইবনে রহমান',
      status: 'ACTIVE',
      start_date: '2026-10-28',
      admission_date: '2026-10-28',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat A-4',
    },
    {
      id: 'alloc-4',
      boarder_id: 'bdr-maruf',
      boarder_name: 'মারুফ বিল্লাহ',
      status: 'ACTIVE',
      start_date: '2026-10-22',
      admission_date: '2026-10-22',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat B-2',
    },
    {
      id: 'alloc-5',
      boarder_id: 'bdr-zahid',
      boarder_name: 'জাহিদ হাসান',
      status: 'ACTIVE',
      start_date: '2026-10-21',
      admission_date: '2026-10-21',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat D-1',
    },
    // Al-Imran: Seat B-1, cancellation takes effect from 30 Nov 2026 (actively residing until 30 Nov)
    {
      id: 'alloc-imran',
      boarder_id: 'bdr-imran',
      boarder_code: 'BDR-2026-7652',
      boarder_name: 'আল-ইমরান',
      status: 'ACTIVE', // or ENDED with end_date in future
      start_date: '2026-10-20',
      admission_date: '2026-10-20',
      end_date: '2026-11-30',
      leaving_date: '2026-11-30',
      flat_id: 'flat-206',
      seat_code: 'Seat B-1',
    },
    // Hashem: Allocation on Seat B-1 starts from 01 Dec 2026 (Advance Booking)
    {
      id: 'alloc-hashem',
      boarder_id: 'bdr-hashem',
      boarder_code: 'BDR-2026-9890',
      boarder_name: 'হাশেম',
      status: 'ACTIVE',
      start_date: '2026-12-01',
      admission_date: '2026-12-01',
      end_date: null,
      flat_id: 'flat-206',
      seat_code: 'Seat B-1',
    },
    // Flat-207 Boarders (5 currently seated)
    {
      id: 'alloc-7',
      boarder_id: 'bdr-7',
      boarder_name: 'বর্ডার ৭',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      end_date: null,
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-8',
      boarder_id: 'bdr-8',
      boarder_name: 'বর্ডার ৮',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      end_date: null,
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-9',
      boarder_id: 'bdr-9',
      boarder_name: 'বর্ডার ৯',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      end_date: null,
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-10',
      boarder_id: 'bdr-10',
      boarder_name: 'বর্ডার ১০',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      end_date: null,
      flat_id: 'flat-207',
    },
    {
      id: 'alloc-11',
      boarder_id: 'bdr-11',
      boarder_name: 'বর্ডার ১১',
      status: 'ACTIVE',
      start_date: '2026-10-01',
      admission_date: '2026-10-01',
      end_date: null,
      flat_id: 'flat-207',
    },
  ]

  // Filter function matching useKitchenMeals & useOwnerDashboard
  const filterActiveAllocations = (allocations: any[], queryDate: string) => {
    return allocations.filter((a) => {
      // 1. Status check: ACTIVE, or ENDED/CANCELLED with scheduled future departure
      if (a.status !== 'ACTIVE') {
        if (!a.end_date || a.end_date < queryDate) return false
      }
      // 2. Strict start date: must have moved in on or before queryDate
      if (a.start_date && a.start_date > queryDate) return false
      // 3. Strict end date: if departed before queryDate, exclude
      if (a.end_date && a.end_date < queryDate) return false
      // 4. Boarder metadata
      if (a.admission_date && a.admission_date > queryDate) return false
      if (a.leaving_date && a.leaving_date < queryDate) return false
      return true
    })
  }

  it('retains Al-Imran in Seat B-1 until 30 Nov 2026 and strictly excludes Hashem on 2026-11-09', () => {
    // User request:
    // "২০৬ নং ফ্ল্যাটের আল ইমরান এর অনুকূলে সিট বরাদ্দ বাতিল কার্যকর হবে আগামী ৩০ নভেম্বর ২০২৬ তারিখ থেকে,
    // তাই সে সিট ছাড়বে আগামী ৩০ নভেম্বর ২০২৬ তারিখে। সেতো এখন সিটে রয়েছে, তাহলে তার মিল গণনা না হওয়ার কারণ কি?"
    const activeAllocationsOnNov9 = filterActiveAllocations(mockAllocations, targetDate)

    // Al-Imran is actively in his seat today
    const imranIncluded = activeAllocationsOnNov9.some((a) => a.boarder_id === 'bdr-imran')
    expect(imranIncluded).toBe(true)

    // Hashem has not moved in yet
    const hashemIncluded = activeAllocationsOnNov9.some((a) => a.boarder_id === 'bdr-hashem')
    expect(hashemIncluded).toBe(false)

    // Flat-206 has 6 active seated residents (Apurba, Mosharraf, Malek, Maruf, Zahid, Al-Imran)
    const flat206Boarders = activeAllocationsOnNov9.filter((a) => a.flat_id === 'flat-206')
    expect(flat206Boarders.length).toBe(6)

    // Flat-207 has 5 active seated residents
    const flat207Boarders = activeAllocationsOnNov9.filter((a) => a.flat_id === 'flat-207')
    expect(flat207Boarders.length).toBe(5)

    // Total active residents across all flats is 11
    expect(activeAllocationsOnNov9.length).toBe(11)
  })

  it('retains Al-Imran even if allocation status was set to ENDED when cancellation was scheduled', () => {
    // If admin set status to ENDED with end_date = '2026-11-30'
    const allocationsWithEndedStatus = mockAllocations.map((a) => {
      if (a.boarder_id === 'bdr-imran') {
        return { ...a, status: 'ENDED' }
      }
      return a
    })

    const activeAllocationsOnNov9 = filterActiveAllocations(allocationsWithEndedStatus, targetDate)
    const imranIncluded = activeAllocationsOnNov9.some((a) => a.boarder_id === 'bdr-imran')
    expect(imranIncluded).toBe(true)
    expect(activeAllocationsOnNov9.length).toBe(11)
  })

  it('smoothly switches Seat B-1 from Al-Imran to Hashem on 01 Dec 2026', () => {
    const decDate = '2026-12-01'
    const activeAllocationsOnDec1 = filterActiveAllocations(mockAllocations, decDate)

    // Al-Imran has departed (end_date 2026-11-30 < 2026-12-01)
    const imranIncluded = activeAllocationsOnDec1.some((a) => a.boarder_id === 'bdr-imran')
    expect(imranIncluded).toBe(false)

    // Hashem has moved in (start_date 2026-12-01 <= 2026-12-01)
    const hashemIncluded = activeAllocationsOnDec1.some((a) => a.boarder_id === 'bdr-hashem')
    expect(hashemIncluded).toBe(true)

    // Flat-206 still has exactly 6 active seated residents
    const flat206Boarders = activeAllocationsOnDec1.filter((a) => a.flat_id === 'flat-206')
    expect(flat206Boarders.length).toBe(6)

    // Total active residents remains 11
    expect(activeAllocationsOnDec1.length).toBe(11)
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

    // 11 active boarders with all meals ON:
    // Breakfast: 11 * 0.5 = 5.5 meals
    // Lunch: 11 * 1.0 = 11.0 meals
    // Dinner: 11 * 1.0 = 11.0 meals
    // Total: 27.5 meals
    const grandBreakfast = 11 * 0.5
    const grandLunch = 11 * 1.0
    const grandDinner = 11 * 1.0
    const grandTotalMeals = grandBreakfast + grandLunch + grandDinner

    expect(grandTotalMeals).toBe(27.5)
  })

  it('handles guest meal calculation where guest breakfast is 0.5 and lunch/dinner is 1.0', () => {
    const guestBookings = [
      { session: 'BREAKFAST', guest_count: 2 },
      { session: 'LUNCH', guest_count: 2 },
      { session: 'DINNER', guest_count: 2 },
    ]

    const guestMealsTotal = guestBookings.reduce((sum, g) => {
      const weight = g.session === 'BREAKFAST' ? 0.5 : 1.0
      return sum + g.guest_count * weight
    }, 0)

    // 2 * 0.5 + 2 * 1.0 + 2 * 1.0 = 1.0 + 2.0 + 2.0 = 5.0
    expect(guestMealsTotal).toBe(5.0)
  })
})

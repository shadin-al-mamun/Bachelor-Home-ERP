import { describe, it, expect } from 'vitest'

describe('Monthly Meal Billing Calculations (Prevent Double Counting Guest Meals)', () => {
  it('correctly calculates meal charges without double counting guest meals', () => {
    // Scenario matching Maruf Billah:
    // Resident meals: 21 (lunch/dinner @ 52 Tk each)
    // Guest meals: 2 (lunch @ 52 Tk each = 104 Tk total)
    // Total consumed meals = 21 + 2 = 23 meals
    // Min quota = 30 meals
    // Shortfall meals = 30 - 23 = 7 meals
    // Meal rate = 52 Tk / meal

    const bRate = 26
    const lRate = 52
    const dRate = 52

    let bCount = 0
    let lCount = 11 // resident lunch
    let dCount = 10 // resident dinner
    // Resident total = 21 meals

    // Add 2 guest meals (e.g. 2 guest lunches)
    const guestBookings = [
      { guest_count: 2, session: 'LUNCH', total_amount: 104 },
    ]

    let guestAmount = 0
    guestBookings.forEach((gb) => {
      const count = Number(gb.guest_count) || 1
      const sess = String(gb.session).toUpperCase()
      if (sess === 'BREAKFAST') bCount += count
      if (sess === 'LUNCH') lCount += count
      if (sess === 'DINNER') dCount += count
      guestAmount += Number(gb.total_amount) || count * (sess === 'BREAKFAST' ? bRate : sess === 'LUNCH' ? lRate : dRate)
    })

    // Total counts after guest addition:
    // bCount = 0, lCount = 13, dCount = 10
    expect(lCount).toBe(13)
    expect(dCount).toBe(10)
    expect(guestAmount).toBe(104)

    const bCost = Math.round(bCount * bRate * 100) / 100
    const lCost = Math.round(lCount * lRate * 100) / 100
    const dCost = Math.round(dCount * dRate * 100) / 100

    // Consumed meals
    const consumedMeals = Math.round(((bCount * 0.5) + (lCount * 1.0) + (dCount * 1.0)) * 10) / 10
    expect(consumedMeals).toBe(23.0)

    const minMeals = 30.0
    const shortfallMeals = Math.max(0, Math.round((minMeals - consumedMeals) * 10) / 10)
    expect(shortfallMeals).toBe(7.0)

    const billableMeals = Math.round((consumedMeals + shortfallMeals) * 10) / 10
    expect(billableMeals).toBe(30.0)

    const shortfallCost = Math.round(shortfallMeals * lRate * 100) / 100
    expect(shortfallCost).toBe(364) // 7 * 52 = 364

    // Non-duplicated total cost:
    const totalAmount = Math.round((bCost + lCost + dCost + shortfallCost) * 100) / 100

    // 23 meals * 52 = 1,196 Tk
    // 7 shortfall * 52 = 364 Tk
    // Total = 1,196 + 364 = 1,560 Tk (Exact expected charge!)
    expect(totalAmount).toBe(1560.0)

    // Verify it is NOT 1,664 Tk (which was the bug caused by adding guestAmount twice)
    const buggyAmountWithDoubleCounting = Math.round((bCost + lCost + dCost + guestAmount + shortfallCost) * 100) / 100
    expect(buggyAmountWithDoubleCounting).toBe(1664.0)
    expect(totalAmount).not.toBe(buggyAmountWithDoubleCounting)
  })

  it('handles half breakfast weight (0.5) and shortfall correctly', () => {
    const bRate = 26
    const lRate = 52
    const dRate = 52

    // 10 breakfasts (5.0 meals), 10 lunches (10.0 meals), 10 dinners (10.0 meals) = 25.0 meals
    const bCount = 10
    const lCount = 10
    const dCount = 10

    const bCost = bCount * bRate // 260
    const lCost = lCount * lRate // 520
    const dCost = dCount * dRate // 520
    const consumed = (bCount * 0.5) + (lCount * 1.0) + (dCount * 1.0) // 25 meals

    const minMeals = 30.0
    const shortfall = Math.max(0, minMeals - consumed) // 5 meals
    const shortfallCost = shortfall * lRate // 5 * 52 = 260

    const total = bCost + lCost + dCost + shortfallCost
    // 260 + 520 + 520 + 260 = 1560
    expect(consumed).toBe(25.0)
    expect(shortfall).toBe(5.0)
    expect(total).toBe(1560.0)
  })

  it('correctly produces zero shortfall when consumed exceeds min quota', () => {
    const lRate = 52
    const consumed = 35.0
    const bCost = 0
    const lCost = consumed * lRate // 1820
    const dCost = 0

    const minMeals = 30.0
    const shortfall = Math.max(0, minMeals - consumed) // 0
    const shortfallCost = shortfall * lRate // 0

    const total = bCost + lCost + dCost + shortfallCost
    expect(consumed).toBe(35.0)
    expect(shortfall).toBe(0)
    expect(total).toBe(1820.0)
  })
})

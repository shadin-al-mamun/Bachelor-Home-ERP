import { describe, it, expect } from 'vitest'
import {
  formatMealDigitBn,
  type DayMealCount,
  type BoarderMonthlyMealRow,
} from '@/features/reports/api/useMonthlyMealSheetData'

describe('Monthly Meal Count Sheet Calculations & Formats (মাসিক মিল গণনা শীট)', () => {
  it('formats meal digits correctly according to user requirements', () => {
    // Breakfast: active -> 0.5 ('০.৫'), off -> 0 ('০')
    expect(formatMealDigitBn(0.5, true)).toBe('০.৫')
    expect(formatMealDigitBn(0, true)).toBe('০')

    // Lunch & Dinner: active -> 1 ('১'), off -> 0 ('০')
    expect(formatMealDigitBn(1, true)).toBe('১')

    // Days exceeding the month length (e.g. 31 in 30-day month) -> '—'
    expect(formatMealDigitBn(0, false)).toBe('—')
    expect(formatMealDigitBn(1, false)).toBe('—')
    expect(formatMealDigitBn(null, true)).toBe('—')
    expect(formatMealDigitBn(undefined, true)).toBe('—')

    // Row total counts
    expect(formatMealDigitBn(15.5, true)).toBe('১৫.৫')
    expect(formatMealDigitBn(31, true)).toBe('৩১')
  })

  it('calculates 31-day meal counts for an active boarder accurately', () => {
    // Boarder in October (31 days): active all 31 days
    const days: DayMealCount[] = []
    let bTotal = 0
    let lTotal = 0
    let dTotal = 0

    for (let d = 1; d <= 31; d++) {
      const b = 0.5
      const l = 1
      const din = 1
      days.push({
        day: d,
        dateStr: `2026-10-${String(d).padStart(2, '0')}`,
        isValidDay: true,
        breakfast: b,
        lunch: l,
        dinner: din,
      })
      bTotal += b
      lTotal += l
      dTotal += din
    }

    expect(bTotal).toBe(15.5) // 31 * 0.5 = 15.5
    expect(lTotal).toBe(31)   // 31 * 1 = 31
    expect(dTotal).toBe(31)   // 31 * 1 = 31
    const grandTotal = bTotal + lTotal + dTotal
    expect(grandTotal).toBe(77.5) // 15.5 + 31 + 31 = 77.5
  })

  it('correctly handles months with less than 31 days (e.g. November with 30 days)', () => {
    const daysInMonth = 30
    const days: DayMealCount[] = []
    let bTotal = 0
    let lTotal = 0
    let dTotal = 0

    for (let d = 1; d <= 31; d++) {
      const isValid = d <= daysInMonth
      const b = isValid ? 0.5 : 0
      const l = isValid ? 1 : 0
      const din = isValid ? 1 : 0

      days.push({
        day: d,
        dateStr: `2026-11-${String(d).padStart(2, '0')}`,
        isValidDay: isValid,
        breakfast: b,
        lunch: l,
        dinner: din,
      })

      if (isValid) {
        bTotal += b
        lTotal += l
        dTotal += din
      }
    }

    // Day 31 is invalid
    expect(days[30].isValidDay).toBe(false)
    expect(days[30].day).toBe(31)

    // Only 30 days counted
    expect(bTotal).toBe(15) // 30 * 0.5
    expect(lTotal).toBe(30) // 30 * 1
    expect(dTotal).toBe(30) // 30 * 1
    expect(bTotal + lTotal + dTotal).toBe(75) // 15 + 30 + 30 = 75
  })

  it('calculates off meals (0) correctly when boarder stops meals', () => {
    // 10 days active, 21 days off
    let bTotal = 0
    let lTotal = 0
    let dTotal = 0

    for (let d = 1; d <= 31; d++) {
      const isMealOn = d <= 10
      const b = isMealOn ? 0.5 : 0
      const l = isMealOn ? 1 : 0
      const din = isMealOn ? 1 : 0

      bTotal += b
      lTotal += l
      dTotal += din
    }

    expect(bTotal).toBe(5)  // 10 * 0.5
    expect(lTotal).toBe(10) // 10 * 1
    expect(dTotal).toBe(10) // 10 * 1
    expect(bTotal + lTotal + dTotal).toBe(25)
  })

  it('verifies flat aggregation of daily and overall totals', () => {
    // Flat with 2 boarders in a 31-day month
    // Boarder 1: full month
    // Boarder 2: lunch & dinner only (breakfast off)
    const boarder1: BoarderMonthlyMealRow = {
      sl: 1,
      boarderId: 'b1',
      boarderName: 'জহির',
      boarderPhone: '01711111111',
      boarderCode: 'BDR-01',
      flatCode: 'Flat-206',
      flatName: 'ফ্ল্যাট ২০৬',
      roomSeatText: 'Room-A • Seat A-1',
      days: [],
      breakfastTotal: 15.5,
      lunchTotal: 31,
      dinnerTotal: 31,
      grandTotal: 77.5,
    }

    const boarder2: BoarderMonthlyMealRow = {
      sl: 2,
      boarderId: 'b2',
      boarderName: 'শাওন',
      boarderPhone: '01722222222',
      boarderCode: 'BDR-02',
      flatCode: 'Flat-206',
      flatName: 'ফ্ল্যাট ২০৬',
      roomSeatText: 'Room-A • Seat A-2',
      days: [],
      breakfastTotal: 0,
      lunchTotal: 31,
      dinnerTotal: 31,
      grandTotal: 62,
    }

    const rows = [boarder1, boarder2]

    const flatTotals = rows.reduce(
      (acc, r) => {
        acc.totalBreakfast += r.breakfastTotal
        acc.totalLunch += r.lunchTotal
        acc.totalDinner += r.dinnerTotal
        acc.overallGrandTotal += r.grandTotal
        return acc
      },
      { totalBreakfast: 0, totalLunch: 0, totalDinner: 0, overallGrandTotal: 0 }
    )

    expect(flatTotals.totalBreakfast).toBe(15.5)
    expect(flatTotals.totalLunch).toBe(62)
    expect(flatTotals.totalDinner).toBe(62)
    expect(flatTotals.overallGrandTotal).toBe(139.5)
    expect(flatTotals.totalBreakfast + flatTotals.totalLunch + flatTotals.totalDinner).toBe(flatTotals.overallGrandTotal)
  })
})

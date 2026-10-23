import { describe, it, expect } from 'vitest'
import {
  DAY_ORDER,
  DAY_METADATA,
  DEFAULT_WEEKLY_MEAL_MENU,
  getDayKeyFromDayIndex,
  getDayKeyFromDate,
  getDayKeyFromDateStr,
  type DayKey,
} from '@/app/store/useBrandingStore'

describe('Weekly Meal Menu Routine & Day Resolution', () => {
  it('contains all 7 days of the week starting from Saturday to Friday', () => {
    expect(DAY_ORDER).toEqual([
      'saturday',
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ])
    expect(DAY_ORDER.length).toBe(7)
  })

  it('provides accurate Bengali metadata for all days', () => {
    expect(DAY_METADATA.saturday.nameBn).toBe('শনিবার')
    expect(DAY_METADATA.sunday.nameBn).toBe('রবিবার')
    expect(DAY_METADATA.monday.nameBn).toBe('সোমবার')
    expect(DAY_METADATA.tuesday.nameBn).toBe('মঙ্গলবার')
    expect(DAY_METADATA.wednesday.nameBn).toBe('বুধবার')
    expect(DAY_METADATA.thursday.nameBn).toBe('বৃহস্পতিবার')
    expect(DAY_METADATA.friday.nameBn).toBe('শুক্রবার')
  })

  it('correctly maps JavaScript Date.getDay() indexes to DayKey', () => {
    expect(getDayKeyFromDayIndex(0)).toBe('sunday')
    expect(getDayKeyFromDayIndex(1)).toBe('monday')
    expect(getDayKeyFromDayIndex(2)).toBe('tuesday')
    expect(getDayKeyFromDayIndex(3)).toBe('wednesday')
    expect(getDayKeyFromDayIndex(4)).toBe('thursday')
    expect(getDayKeyFromDayIndex(5)).toBe('friday')
    expect(getDayKeyFromDayIndex(6)).toBe('saturday')
  })

  it('correctly resolves DayKey from standard date strings', () => {
    // 2026-10-24 is a Saturday
    expect(getDayKeyFromDateStr('2026-10-24')).toBe('saturday')
    // 2026-10-25 is a Sunday
    expect(getDayKeyFromDateStr('2026-10-25')).toBe('sunday')
    // 2026-10-30 is a Friday
    expect(getDayKeyFromDateStr('2026-10-30')).toBe('friday')
  })

  it('ensures each day has breakfast, lunch, and dinner entries in DEFAULT_WEEKLY_MEAL_MENU', () => {
    DAY_ORDER.forEach((dayKey: DayKey) => {
      const menu = DEFAULT_WEEKLY_MEAL_MENU[dayKey]
      expect(menu).toBeDefined()
      expect(typeof menu.breakfast).toBe('string')
      expect(menu.breakfast.length).toBeGreaterThan(0)
      expect(typeof menu.lunch).toBe('string')
      expect(menu.lunch.length).toBeGreaterThan(0)
      expect(typeof menu.dinner).toBe('string')
      expect(menu.dinner.length).toBeGreaterThan(0)
    })
  })

  it('handles tomorrow day resolution reliably', () => {
    const today = new Date('2026-10-23T12:00:00+06:00') // Friday
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1) // Saturday

    const tomorrowKey = getDayKeyFromDate(tomorrow)
    expect(tomorrowKey).toBe('saturday')
    expect(DAY_METADATA[tomorrowKey].nameBn).toBe('শনিবার')

    const tomorrowMenu = DEFAULT_WEEKLY_MEAL_MENU[tomorrowKey]
    expect(tomorrowMenu.breakfast).toContain('খিচুড়ি')
    expect(tomorrowMenu.lunch).toContain('রুই মাছ')
    expect(tomorrowMenu.dinner).toContain('মুরগির মাংস')
  })
})

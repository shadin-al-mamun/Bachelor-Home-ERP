import { describe, it, expect } from 'vitest'
import {
  isDhakaCutoffPassed,
  getRemainingCutoffSeconds,
  getDateMealStatus,
} from '@/features/meals/api/useMeals'

describe('mealCutoffTimer.test.ts - Asia/Dhaka 10:00 PM Meal Cutoff Engine', () => {
  const CUTOFF_TIME = '22:00:00'

  describe('isDhakaCutoffPassed', () => {
    it('returns FALSE before 10:00 PM (e.g. at 21:55:00 / 9:55 PM)', () => {
      // Mocking 9:55 PM (21:55)
      const mockTimeBefore = new Date('2026-10-18T21:55:00')
      const passed = isDhakaCutoffPassed(CUTOFF_TIME, mockTimeBefore)
      expect(passed).toBe(false)
    })

    it('returns TRUE at exactly 10:00:00 PM (22:00:00)', () => {
      const mockTimeExact = new Date('2026-10-18T22:00:00')
      const passed = isDhakaCutoffPassed(CUTOFF_TIME, mockTimeExact)
      expect(passed).toBe(true)
    })

    it('returns TRUE after 10:00 PM (e.g. at 22:05:00 / 10:05 PM)', () => {
      const mockTimeAfter = new Date('2026-10-18T22:05:00')
      const passed = isDhakaCutoffPassed(CUTOFF_TIME, mockTimeAfter)
      expect(passed).toBe(true)
    })

    it('returns FALSE early in the morning or afternoon', () => {
      const mockMorning = new Date('2026-10-18T10:30:00')
      expect(isDhakaCutoffPassed(CUTOFF_TIME, mockMorning)).toBe(false)
    })
  })

  describe('getRemainingCutoffSeconds', () => {
    it('returns positive seconds countdown when before 10:00 PM', () => {
      // 21:59:00 is exactly 60 seconds before 22:00:00
      const mockTime = new Date('2026-10-18T21:59:00')
      const remaining = getRemainingCutoffSeconds(CUTOFF_TIME, mockTime)
      expect(remaining).toBe(60)
    })

    it('returns 0 seconds when cutoff is passed or at 10:00 PM', () => {
      const mockTime = new Date('2026-10-18T22:01:00')
      const remaining = getRemainingCutoffSeconds(CUTOFF_TIME, mockTime)
      expect(remaining).toBe(0)
    })
  })

  describe('getDateMealStatus - Boarder Self-Service Locking', () => {
    it('locks today and past dates unconditionally for boarders', () => {
      const mockNow = new Date('2026-10-18T14:00:00')
      const statusToday = getDateMealStatus('2026-10-18', CUTOFF_TIME, mockNow)
      expect(statusToday.isToday).toBe(true)
      expect(statusToday.isLockedForBoarder).toBe(true)

      const statusPast = getDateMealStatus('2026-10-17', CUTOFF_TIME, mockNow)
      expect(statusPast.isPast).toBe(true)
      expect(statusPast.isLockedForBoarder).toBe(true)
    })

    it('allows tomorrow toggle before 10:00 PM cutoff (MEL-02)', () => {
      // Current time: 2026-10-18 21:55:00 (< 22:00)
      const mockBefore = new Date('2026-10-18T21:55:00')
      const statusTomorrow = getDateMealStatus('2026-10-19', CUTOFF_TIME, mockBefore)

      expect(statusTomorrow.isTomorrow).toBe(true)
      expect(statusTomorrow.cutoffPassed).toBe(false)
      expect(statusTomorrow.isLockedForBoarder).toBe(false)
    })

    it('strictly locks tomorrow toggle at/after 10:00 PM cutoff (MEL-03)', () => {
      // Current time: 2026-10-18 22:00:01 (>= 22:00)
      const mockAfter = new Date('2026-10-18T22:00:01')
      const statusTomorrow = getDateMealStatus('2026-10-19', CUTOFF_TIME, mockAfter)

      expect(statusTomorrow.isTomorrow).toBe(true)
      expect(statusTomorrow.cutoffPassed).toBe(true)
      expect(statusTomorrow.isLockedForBoarder).toBe(true)
    })

    it('leaves future dates beyond tomorrow open for planning', () => {
      const mockNow = new Date('2026-10-18T22:30:00')
      const statusDayAfterTomorrow = getDateMealStatus('2026-10-20', CUTOFF_TIME, mockNow)

      expect(statusDayAfterTomorrow.isFuture).toBe(true)
      expect(statusDayAfterTomorrow.isLockedForBoarder).toBe(false)
    })
  })
})

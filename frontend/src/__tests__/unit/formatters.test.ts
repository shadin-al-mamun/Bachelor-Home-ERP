import { describe, it, expect } from 'vitest'
import {
  formatBDT,
  formatDhakaDate,
  formatDateBn,
  formatCurrencyBn,
  getDhakaNow,
  DHAKA_TIMEZONE,
} from '@/utils/date'

describe('formatters.test.ts - Currency & Timezone Formatters', () => {
  describe('formatBDT & formatCurrencyBn', () => {
    it('formats positive integers to BDT currency with two decimal places', () => {
      const result = formatBDT(4500)
      expect(result).toContain('৳')
      expect(result).toMatch(/4,500\.00/)
    })

    it('formats decimal values accurately without rounding errors', () => {
      const result = formatBDT(12345.67)
      expect(result).toContain('৳')
      expect(result).toMatch(/12,345\.67/)
    })

    it('handles zero, null, and undefined values safely', () => {
      expect(formatBDT(0)).toMatch(/৳\s*0\.00/)
      expect(formatBDT(null)).toMatch(/৳\s*0\.00/)
      expect(formatBDT(undefined)).toMatch(/৳\s*0\.00/)
      expect(formatBDT('')).toMatch(/৳\s*0\.00/)
      expect(formatBDT('invalid')).toMatch(/৳\s*0\.00/)
    })

    it('formats negative amounts correctly', () => {
      const result = formatBDT(-500)
      expect(result).toContain('500.00')
      expect(result).toMatch(/-|−/)
    })

    it('formatCurrencyBn aliases formatBDT directly', () => {
      expect(formatCurrencyBn(8500)).toBe(formatBDT(8500))
    })
  })

  describe('formatDhakaDate & Timezone Conversions', () => {
    it('uses standard Asia/Dhaka timezone constant', () => {
      expect(DHAKA_TIMEZONE).toBe('Asia/Dhaka')
    })

    it('returns a valid Dayjs instance for getDhakaNow()', () => {
      const now = getDhakaNow()
      expect(now).toBeDefined()
      expect(now.isValid()).toBe(true)
    })

    it('formats UTC ISO timestamp to Asia/Dhaka (UTC+6) time correctly', () => {
      // 2026-10-18 04:00:00 UTC = 2026-10-18 10:00:00 AM Asia/Dhaka
      const utcIso = '2026-10-18T04:00:00.000Z'
      const formatted = formatDhakaDate(utcIso, 'YYYY-MM-DD hh:mm A')
      expect(formatted).toBe('2026-10-18 10:00 AM')
    })

    it('handles late night UTC cross-midnight conversion to next day in Dhaka', () => {
      // 2026-10-18 20:30:00 UTC = 2026-10-19 02:30:00 AM Asia/Dhaka
      const utcIso = '2026-10-18T20:30:00.000Z'
      const formatted = formatDhakaDate(utcIso, 'YYYY-MM-DD hh:mm A')
      expect(formatted).toBe('2026-10-19 02:30 AM')
    })

    it('returns empty string when invalid or falsy date is provided', () => {
      expect(formatDhakaDate('')).toBe('')
      expect(formatDhakaDate(null as any)).toBe('')
    })

    it('formatDateBn outputs standard DD MMM YYYY format', () => {
      const utcIso = '2026-10-18T06:00:00.000Z'
      const formatted = formatDateBn(utcIso)
      expect(formatted).toContain('18')
      expect(formatted).toContain('2026')
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  convertBengaliDigits,
  normalizePhoneNumber,
  getCorePhoneDigits,
  isPhoneMatch,
} from '@/utils/phone'

describe('phoneUtils.test.ts - Bengali Digits & Phone Normalization', () => {
  it('converts Bengali numerals to English digits accurately', () => {
    expect(convertBengaliDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678')
    expect(convertBengaliDigits('০১৬৮৩৮৭৭৫২৫')).toBe('01683877525')
    expect(convertBengaliDigits('১২৩৪৫৬৭৮৯০')).toBe('1234567890')
  })

  it('normalizes Bangladeshi phone numbers across different prefixes', () => {
    expect(normalizePhoneNumber('+8801712394767')).toBe('01712394767')
    expect(normalizePhoneNumber('8801712394767')).toBe('01712394767')
    expect(normalizePhoneNumber('01712394767')).toBe('01712394767')
    expect(normalizePhoneNumber('+880-1712-394767')).toBe('01712394767')
    expect(normalizePhoneNumber('০১৭-১২৩৯৪৭৬৭')).toBe('01712394767')
  })

  it('extracts core last 10 digits accurately', () => {
    expect(getCorePhoneDigits('+8801712394767')).toBe('1712394767')
    expect(getCorePhoneDigits('01712394767')).toBe('1712394767')
    expect(getCorePhoneDigits('1712394767')).toBe('1712394767')
  })

  it('matches phone numbers across +88, Bengali numerals, hyphens, and formats', () => {
    expect(isPhoneMatch('+8801712394767', '01712394767')).toBe(true)
    expect(isPhoneMatch('০১৭১২৩৯৪৭৬৭', '+8801712394767')).toBe(true)
    expect(isPhoneMatch('01712-394767', '01712394767')).toBe(true)
    expect(isPhoneMatch('01712394767', '01683877525')).toBe(false)
    expect(isPhoneMatch('', '01712394767')).toBe(false)
    expect(isPhoneMatch(null, undefined)).toBe(false)
  })
})

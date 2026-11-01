import { describe, it, expect } from 'vitest'
import { formatFloorBn } from '@/utils/floor'

describe('formatFloorBn - Bengali Ordinal Floor Formatting', () => {
  it('formats ground floor (0) correctly', () => {
    expect(formatFloorBn(0)).toBe('নিচতলা')
    expect(formatFloorBn('0')).toBe('নিচতলা')
    expect(formatFloorBn('০')).toBe('নিচতলা')
  })

  it('formats 1st to 10th floors correctly with correct Bengali ordinals', () => {
    expect(formatFloorBn(1)).toBe('১ম তলা')
    expect(formatFloorBn(2)).toBe('২য় তলা')
    expect(formatFloorBn('2')).toBe('২য় তলা')
    expect(formatFloorBn('২')).toBe('২য় তলা')
    expect(formatFloorBn(3)).toBe('৩য় তলা')
    expect(formatFloorBn(4)).toBe('৪র্থ তলা')
    expect(formatFloorBn(5)).toBe('৫ম তলা')
    expect(formatFloorBn(6)).toBe('৬ষ্ঠ তলা')
    expect(formatFloorBn(7)).toBe('৭ম তলা')
    expect(formatFloorBn(8)).toBe('৮ম তলা')
    expect(formatFloorBn(9)).toBe('৯ম তলা')
    expect(formatFloorBn(10)).toBe('১০ম তলা')
  })

  it('formats 11th to 19th floors with -শ suffix', () => {
    expect(formatFloorBn(11)).toBe('১১শ তলা')
    expect(formatFloorBn(12)).toBe('১২শ তলা')
    expect(formatFloorBn(14)).toBe('১৪শ তলা')
    expect(formatFloorBn(19)).toBe('১৯শ তলা')
  })

  it('formats 20th and higher floors with -তম suffix', () => {
    expect(formatFloorBn(20)).toBe('২০তম তলা')
    expect(formatFloorBn(25)).toBe('২৫তম তলা')
  })

  it('handles null, undefined, and empty string safely', () => {
    expect(formatFloorBn(null)).toBe('')
    expect(formatFloorBn(undefined)).toBe('')
    expect(formatFloorBn('')).toBe('')
  })
})

/**
 * Utility functions for Bengali digit conversion, Bangladeshi phone number normalization,
 * and robust phone number matching.
 */

export function convertBengaliDigits(val: string): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return (val || '').replace(/[০-৯]/g, (d) => String(bn.indexOf(d)))
}

export function normalizePhoneNumber(raw: string): string {
  if (!raw) return ''
  const converted = convertBengaliDigits(raw.trim())
  const cleaned = converted.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+880')) {
    return '0' + cleaned.slice(4)
  }
  if (cleaned.startsWith('880')) {
    return '0' + cleaned.slice(3)
  }
  return cleaned
}

/**
 * Returns the last 10 digits of a normalized phone number for bulletproof comparison
 * (handles variations like +8801712394767 vs 01712394767 vs 1712394767).
 */
export function getCorePhoneDigits(phone?: string | null): string {
  if (!phone) return ''
  const norm = normalizePhoneNumber(phone)
  return norm.length >= 10 ? norm.slice(-10) : norm
}

export function isPhoneMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  if (!phoneA || !phoneB) return false
  const coreA = getCorePhoneDigits(phoneA)
  const coreB = getCorePhoneDigits(phoneB)
  return Boolean(coreA && coreB && coreA === coreB)
}

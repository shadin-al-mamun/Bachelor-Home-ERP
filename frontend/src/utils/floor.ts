/**
 * Formats a floor number into standard Bengali ordinal representation
 * e.g.:
 *   0 -> নিচতলা
 *   1 -> ১ম তলা
 *   2 -> ২য় তলা
 *   3 -> ৩য় তলা
 *   4 -> ৪র্থ তলা
 *   5 -> ৫ম তলা
 *   6 -> ৬ষ্ঠ তলা
 *   7 -> ৭ম তলা
 *   8 -> ৮ম তলা
 *   9 -> ৯ম তলা
 *   10 -> ১০ম তলা
 */
export function formatFloorBn(floor: number | string | null | undefined): string {
  if (floor === null || floor === undefined || floor === '') return ''

  const str = String(floor).trim()
  const bengaliToEnglish: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  }
  const normalizedStr = str.replace(/[০-৯]/g, (match) => bengaliToEnglish[match] || match)
  const num = parseInt(normalizedStr, 10)

  if (isNaN(num)) {
    return str.includes('তলা') ? str : `${str} তলা`
  }

  const ordinals: Record<number, string> = {
    0: 'নিচতলা',
    1: '১ম তলা',
    2: '২য় তলা',
    3: '৩য় তলা',
    4: '৪র্থ তলা',
    5: '৫ম তলা',
    6: '৬ষ্ঠ তলা',
    7: '৭ম তলা',
    8: '৮ম তলা',
    9: '৯ম তলা',
    10: '১০ম তলা',
    11: '১১শ তলা',
    12: '১২শ তলা',
    13: '১৩শ তলা',
    14: '১৪শ তলা',
    15: '১৫শ তলা',
    16: '১৬শ তলা',
    17: '১৭শ তলা',
    18: '১৮শ তলা',
    19: '১৯শ তলা',
  }

  if (ordinals[num]) {
    return ordinals[num]
  }

  const englishToBengali: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
  }
  const bnNum = String(num).replace(/[0-9]/g, (m) => englishToBengali[m] || m)
  return `${bnNum}তম তলা`
}

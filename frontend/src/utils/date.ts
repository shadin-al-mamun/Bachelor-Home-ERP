import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'

dayjs.extend(utc)
dayjs.extend(timezone)

export const DHAKA_TIMEZONE = 'Asia/Dhaka'

/**
 * Returns current date-time in Asia/Dhaka timezone
 */
export function getDhakaNow(): dayjs.Dayjs {
  return dayjs().tz(DHAKA_TIMEZONE)
}

/**
 * Format a date string or object into standard display format in Asia/Dhaka timezone
 */
export function formatDhakaDate(date: string | Date | dayjs.Dayjs, formatStr = 'DD MMM YYYY, hh:mm A'): string {
  if (!date) return ''
  return dayjs(date).tz(DHAKA_TIMEZONE).format(formatStr)
}

/**
 * Formats monetary amounts into Bangladeshi Taka (BDT - ৳) format
 */
export function formatBDT(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0)
  if (isNaN(num)) return '৳ 0.00'
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num).replace('BDT', '৳')
}

export const formatDateBn = (date: string | Date | dayjs.Dayjs): string => {
  return formatDhakaDate(date, 'DD MMM YYYY')
}

export const formatCurrencyBn = (amount: number | string | null | undefined): string => {
  return formatBDT(amount)
}

export default dayjs

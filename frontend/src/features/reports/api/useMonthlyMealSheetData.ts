import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { useFlats } from '@/features/accommodation/api/useAccommodation'
import {
  toBengaliDigits,
  formatSheetMonthBn,
  getBoarderFlatInfo,
} from './useMonthlyCollectionSheetData'
import type { MealSelection } from '@/types/database'

export interface DayMealCount {
  day: number // 1 to 31
  dateStr: string // YYYY-MM-DD
  isValidDay: boolean // day <= daysInMonth
  breakfast: number // 0.5 or 0
  lunch: number // 1 or 0
  dinner: number // 1 or 0
}

export interface BoarderMonthlyMealRow {
  sl: number
  boarderId: string
  boarderName: string
  boarderPhone: string
  boarderCode: string
  flatCode: string
  flatName: string
  roomSeatText: string
  days: DayMealCount[] // 31 days (index 0 to 30)
  breakfastTotal: number
  lunchTotal: number
  dinnerTotal: number
  grandTotal: number
}

export interface DayMealTotal {
  day: number
  isValidDay: boolean
  breakfast: number
  lunch: number
  dinner: number
  dayTotal: number
}

export interface MonthlyMealSheetData {
  rows: BoarderMonthlyMealRow[]
  dayTotals: DayMealTotal[] // 31 days totals
  flatTotals: {
    totalBreakfast: number
    totalLunch: number
    totalDinner: number
    overallGrandTotal: number
  }
  daysInMonth: number
  availableFlats: { id: string; code: string; name: string }[]
  selectedFlatName: string
  selectedFlatCode: string
  selectedMonthBn: string
  isLoading: boolean
}

export function formatMealDigitBn(val: number | null | undefined, isValidDay = true): string {
  if (!isValidDay || val === null || val === undefined) return '—'
  if (val === 0.5) return '০.৫'
  if (val === 0) return '০'
  if (val === 1) return '১'
  // For totals e.g. 15.5 or 31
  const str = String(val)
  return toBengaliDigits(str)
}

export function useMonthlyMealSheetData(
  selectedMonth: string, // 'YYYY-MM' e.g. '2026-10' or '2026-11'
  selectedFlatId?: string // e.g. 'flat-206'
): MonthlyMealSheetData {
  // 1. Fetch Boarders
  const { data: boarders = [], isLoading: isLoadingBoarders } = useBoarders()

  // 2. Fetch Flats
  const { data: flats = [] } = useFlats()

  // Calculate days in the selected month
  const daysInMonth = useMemo(() => {
    const parts = (selectedMonth || '2026-11').split('-').map(Number)
    const y = parts[0] || 2026
    const m = parts[1] || 11
    return new Date(y, m, 0).getDate()
  }, [selectedMonth])

  // 3. Fetch Meal Selections for the whole month
  const { data: rawSelections = [], isLoading: isLoadingSelections } = useQuery({
    queryKey: ['month-meal-selections', selectedMonth],
    queryFn: async (): Promise<MealSelection[]> => {
      const startStr = `${selectedMonth}-01`
      const endStr = `${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`

      if (!isSupabaseConfigured) {
        return []
      }

      try {
        const { data, error } = await supabase
          .from('meal_selections')
          .select('*')
          .gte('meal_date', startStr)
          .lte('meal_date', endStr)

        if (error || !data) return []
        return data as MealSelection[]
      } catch {
        return []
      }
    },
    enabled: true,
  })

  // Build available flats list
  const availableFlats = useMemo(() => {
    const flatMap = new Map<string, { id: string; code: string; name: string }>()

    flatMap.set('flat-206', { id: 'flat-206', code: 'Flat-206', name: 'ফ্ল্যাট ২০৬ (Flat-206)' })
    flatMap.set('flat-207', { id: 'flat-207', code: 'Flat-207', name: 'ফ্ল্যাট ২০৭ (Flat-207)' })

    flats.forEach((f) => {
      const flatCode = f.flat_code || f.name
      let name = f.name || flatCode
      if (flatCode.includes('206')) name = 'ফ্ল্যাট ২০৬ (Flat-206)'
      if (flatCode.includes('207')) name = 'ফ্ল্যাট ২০৭ (Flat-207)'
      flatMap.set(f.id, { id: f.id, code: flatCode, name })
    })

    boarders.forEach((b) => {
      const f = getBoarderFlatInfo(b)
      if (f) {
        flatMap.set(f.id, { id: f.id, code: f.code, name: f.name })
      }
    })

    return Array.from(flatMap.values()).sort((a, b) => a.code.localeCompare(b.code))
  }, [flats, boarders])

  // Active Flat
  const activeFlat = useMemo(() => {
    if (!selectedFlatId || selectedFlatId === 'ALL') {
      return availableFlats[0] || { id: 'flat-206', code: 'Flat-206', name: 'ফ্ল্যাট ২০৬ (Flat-206)' }
    }
    const targetNorm = selectedFlatId.toLowerCase().replace(/[^a-z0-9]/g, '')
    const found = availableFlats.find((f) => {
      const fNorm = f.id.toLowerCase().replace(/[^a-z0-9]/g, '')
      const cNorm = f.code.toLowerCase().replace(/[^a-z0-9]/g, '')
      return f.id === selectedFlatId || fNorm === targetNorm || cNorm.includes(targetNorm)
    })
    return found || availableFlats[0] || { id: 'flat-206', code: 'Flat-206', name: 'ফ্ল্যাট ২০৬ (Flat-206)' }
  }, [selectedFlatId, availableFlats])

  // Map selections by `boarderId_mealDate`
  const selectionsMap = useMemo(() => {
    const map = new Map<string, MealSelection>()
    rawSelections.forEach((s) => {
      const key = `${s.boarder_id}_${s.meal_date}`
      map.set(key, s)
    })
    return map
  }, [rawSelections])

  // Compute 31-day meal counts for each boarder
  const rows: BoarderMonthlyMealRow[] = useMemo(() => {
    const targetFlatCode = activeFlat.code.toLowerCase()

    // Filter boarders for the active flat
    const flatBoarders = boarders.filter((b) => {
      if (b.status === 'REJECTED') return false
      const flatInfo = getBoarderFlatInfo(b)
      if (!flatInfo) return false

      if (activeFlat.id === 'ALL') return true
      if (flatInfo.id === activeFlat.id) return true
      if (flatInfo.code.toLowerCase().includes(targetFlatCode)) return true
      if (targetFlatCode.includes('206') && flatInfo.code.includes('206')) return true
      if (targetFlatCode.includes('207') && flatInfo.code.includes('207')) return true
      return false
    })

    // Sort by room and seat
    flatBoarders.sort((a, b) => {
      const roomA = a.active_allocation?.seat?.room?.name || ''
      const roomB = b.active_allocation?.seat?.room?.name || ''
      if (roomA !== roomB) return roomA.localeCompare(roomB)
      const seatA = a.active_allocation?.seat?.seat_code || ''
      const seatB = b.active_allocation?.seat?.seat_code || ''
      return seatA.localeCompare(seatB)
    })

    return flatBoarders.map((boarder, index) => {
      const seatName = boarder.active_allocation?.seat?.seat_name || boarder.active_allocation?.seat?.seat_code || ''
      const roomName = boarder.active_allocation?.seat?.room?.name || ''
      const roomSeatText = [roomName, seatName].filter(Boolean).join(' • ')

      const admissionDateStr = boarder.admission_date ? boarder.admission_date.slice(0, 10) : ''
      const leavingDateStr = (boarder as any).leaving_date ? (boarder as any).leaving_date.slice(0, 10) : ''

      let breakfastTotal = 0
      let lunchTotal = 0
      let dinnerTotal = 0

      // Compute day 1 to 31
      const days: DayMealCount[] = []
      for (let day = 1; day <= 31; day++) {
        const isValidDay = day <= daysInMonth
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`

        let breakfast = 0
        let lunch = 0
        let dinner = 0

        if (isValidDay) {
          const selKey = `${boarder.id}_${dateStr}`
          const sel = selectionsMap.get(selKey)

          if (sel) {
            breakfast = sel.breakfast ? 0.5 : 0
            lunch = sel.lunch ? 1 : 0
            dinner = sel.dinner ? 1 : 0
          } else {
            // Default active boarder status check
            const isAdmitted = !admissionDateStr || dateStr >= admissionDateStr
            const isNotLeft = !leavingDateStr || dateStr <= leavingDateStr
            const isBoarderActive = boarder.status === 'ACTIVE' && isAdmitted && isNotLeft

            if (isBoarderActive) {
              breakfast = 0.5
              lunch = 1
              dinner = 1
            } else {
              breakfast = 0
              lunch = 0
              dinner = 0
            }
          }

          breakfastTotal += breakfast
          lunchTotal += lunch
          dinnerTotal += dinner
        }

        days.push({
          day,
          dateStr,
          isValidDay,
          breakfast,
          lunch,
          dinner,
        })
      }

      const grandTotal = breakfastTotal + lunchTotal + dinnerTotal

      return {
        sl: index + 1,
        boarderId: boarder.id,
        boarderName: boarder.full_name,
        boarderPhone: boarder.phone_number || '',
        boarderCode: boarder.boarder_code || '',
        flatCode: activeFlat.code,
        flatName: activeFlat.name,
        roomSeatText,
        days,
        breakfastTotal,
        lunchTotal,
        dinnerTotal,
        grandTotal,
      }
    })
  }, [boarders, activeFlat, selectedMonth, daysInMonth, selectionsMap])

  // Daily Totals across all members in the flat
  const dayTotals: DayMealTotal[] = useMemo(() => {
    const list: DayMealTotal[] = []
    for (let day = 1; day <= 31; day++) {
      const isValidDay = day <= daysInMonth
      let bSum = 0
      let lSum = 0
      let dSum = 0

      if (isValidDay) {
        rows.forEach((r) => {
          const dCount = r.days[day - 1]
          if (dCount && dCount.isValidDay) {
            bSum += dCount.breakfast
            lSum += dCount.lunch
            dSum += dCount.dinner
          }
        })
      }

      list.push({
        day,
        isValidDay,
        breakfast: bSum,
        lunch: lSum,
        dinner: dSum,
        dayTotal: bSum + lSum + dSum,
      })
    }
    return list
  }, [rows, daysInMonth])

  // Grand flat totals
  const flatTotals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalBreakfast += r.breakfastTotal
        acc.totalLunch += r.lunchTotal
        acc.totalDinner += r.dinnerTotal
        acc.overallGrandTotal += r.grandTotal
        return acc
      },
      {
        totalBreakfast: 0,
        totalLunch: 0,
        totalDinner: 0,
        overallGrandTotal: 0,
      }
    )
  }, [rows])

  const selectedMonthBn = formatSheetMonthBn(selectedMonth)
  const selectedFlatCodeBn = toBengaliDigits(activeFlat.code.replace(/\D/g, '')) || activeFlat.code

  return {
    rows,
    dayTotals,
    flatTotals,
    daysInMonth,
    availableFlats,
    selectedFlatName: activeFlat.name,
    selectedFlatCode: selectedFlatCodeBn,
    selectedMonthBn,
    isLoading: isLoadingBoarders || isLoadingSelections,
  }
}

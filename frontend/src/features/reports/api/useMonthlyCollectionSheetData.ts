import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useBoarders, type BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import { useReceipts, type ExtendedReceipt } from '@/features/billing/api/useReceipts'
import { useFlats } from '@/features/accommodation/api/useAccommodation'
import type { BoarderCharge } from '@/types/database'

export interface PaymentSlot {
  amount: number
  voucher: string
}

export interface MonthlyCollectionSheetRow {
  sl: number
  boarderId: string
  boarderName: string
  boarderPhone: string
  boarderCode: string
  flatCode: string
  flatName: string
  roomSeatText: string
  // Col 3: Advance Rent
  advanceAmount: number
  hasAdvance: boolean
  // Col 4: Previous Month's Due
  previousDue: number
  // Col 5: Previous Month's Due Collected
  previousDueCollected: number
  previousDueVouchers: string[]
  // Cols 6-9: Current Month Collections (up to 4 payments)
  payments: PaymentSlot[] // index 0 = 1st, index 1 = 2nd, index 2 = 3rd, index 3 = 4th
  // Col 10: Total Collected in Current Month
  totalCurrentCollected: number
  // Col 11: Seat Rent
  seatRent: number
  // Col 12: Service Charge
  serviceCharge: number
  // Col 13: Meal Charge
  mealCharge: number
  // Col 14: Total Current Month Expense (Col 11 + 12 + 13)
  totalCurrentExpense: number
  // Col 15: Net Balance (Col 10 - Col 14)
  netBalance: number
}

export interface MonthlyCollectionSheetTotals {
  advanceAmount: number
  previousDue: number
  previousDueCollected: number
  payment1: number
  payment2: number
  payment3: number
  payment4: number
  totalCurrentCollected: number
  seatRent: number
  serviceCharge: number
  mealCharge: number
  totalCurrentExpense: number
  netBalance: number
}

export interface MonthlyCollectionSheetData {
  rows: MonthlyCollectionSheetRow[]
  totals: MonthlyCollectionSheetTotals
  availableFlats: { id: string; code: string; name: string }[]
  selectedFlatName: string
  selectedFlatCode: string
  selectedMonthBn: string
  isLoading: boolean
}

// Bengali month names
const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]

export function toBengaliDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined || input === '') return ''
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
  return String(input).replace(/[0-9]/g, (w) => bengaliDigits[+w])
}

export function formatSheetMonthBn(yearMonthStr: string): string {
  // Expected input: "YYYY-MM" e.g. "2026-10"
  if (!yearMonthStr) return '—'
  const parts = yearMonthStr.split('-')
  if (parts.length < 2) return yearMonthStr
  const year = parts[0]
  const monthIdx = parseInt(parts[1], 10) - 1
  const monthName = BENGALI_MONTHS[monthIdx] || parts[1]
  const yearBn = toBengaliDigits(year)
  return `${monthName}/${yearBn}`
}

export function formatSheetAmount(val: number | null | undefined, showDashWhenZero = true): string {
  if (val === null || val === undefined || isNaN(val) || val === 0) {
    return showDashWhenZero ? '—' : ''
  }
  const rounded = Math.round(val)
  const formatted = rounded.toLocaleString('en-US')
  return `${toBengaliDigits(formatted)}/-`
}

export function formatSheetBalance(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || val === 0) {
    return '০/-'
  }
  const rounded = Math.round(val)
  const isNegative = rounded < 0
  const absFormatted = Math.abs(rounded).toLocaleString('en-US')
  const bn = toBengaliDigits(absFormatted)
  return isNegative ? `-${bn}/-` : `${bn}/-`
}

export function getBoarderFlatInfo(boarder: BoarderWithRelations) {
  const isImran = boarder.boarder_code === 'BDR-2026-7652'
  const alloc = boarder.active_allocation

  if (isImran) {
    return {
      id: 'flat-206',
      code: 'Flat-206',
      name: 'ফ্ল্যাট ২০৬ (Flat-206)',
      floor: 2,
    }
  }

  const flat = alloc?.seat?.room?.flat
  if (flat && (alloc?.seat || boarder.status === 'ACTIVE')) {
    const flatCode = flat.flat_code || flat.name || 'ফ্ল্যাট'
    let displayName = flat.name || flatCode
    if (flatCode.toLowerCase().includes('206') || displayName.includes('206')) {
      displayName = 'ফ্ল্যাট ২০৬ (Flat-206)'
    } else if (flatCode.toLowerCase().includes('207') || displayName.includes('207')) {
      displayName = 'ফ্ল্যাট ২০৭ (Flat-207)'
    }
    return {
      id: flat.id || flatCode,
      code: flatCode,
      name: displayName,
      floor: flat.floor_number,
    }
  }

  // Fallback by room naming
  const roomName = alloc?.seat?.room?.name || ''
  const roomCode = alloc?.seat?.room?.room_code || ''
  if (alloc?.seat && (roomName.includes('207') || roomCode.includes('207'))) {
    return {
      id: 'flat-207',
      code: 'Flat-207',
      name: 'ফ্ল্যাট ২০৭ (Flat-207)',
      floor: 2,
    }
  }
  if (alloc?.seat && (roomName.includes('206') || roomCode.includes('206'))) {
    return {
      id: 'flat-206',
      code: 'Flat-206',
      name: 'ফ্ল্যাট ২০৬ (Flat-206)',
      floor: 2,
    }
  }

  return null
}

export function useMonthlyCollectionSheetData(
  selectedMonth: string, // 'YYYY-MM' e.g. '2026-10' or '2026-11'
  selectedFlatId?: string // e.g. 'flat-206' or ''
): MonthlyCollectionSheetData {
  // 1. Fetch Boarders
  const { data: boarders = [], isLoading: isLoadingBoarders } = useBoarders()

  // 2. Fetch Receipts
  const { data: receipts = [], isLoading: isLoadingReceipts } = useReceipts()

  // 3. Fetch Flats from accommodation
  const { data: flats = [] } = useFlats()

  // 4. Query all boarder charges directly from Supabase for absolute accuracy
  const { data: remoteCharges = [], isLoading: isLoadingCharges } = useQuery({
    queryKey: ['all-boarder-charges'],
    queryFn: async (): Promise<BoarderCharge[]> => {
      if (!isSupabaseConfigured) {
        // Collect charges from mock boarders
        const allMockCharges: BoarderCharge[] = []
        boarders.forEach((b) => {
          if (b.charges && b.charges.length > 0) {
            allMockCharges.push(...b.charges)
          }
        })
        return allMockCharges
      }
      try {
        const { data, error } = await supabase
          .from('boarder_charges')
          .select('*')
          .order('billing_month', { ascending: true })
        if (error || !data) return []
        return data as BoarderCharge[]
      } catch {
        return []
      }
    },
    enabled: true,
  })

  // Build available flats list from accommodation + active boarder allocations
  const availableFlats = useMemo(() => {
    const flatMap = new Map<string, { id: string; code: string; name: string }>()

    // Standard default flats if none exist
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

  // Resolve current active flat
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

  // Map charges by boarder ID
  const chargesByBoarder = useMemo(() => {
    const map = new Map<string, BoarderCharge[]>()
    remoteCharges.forEach((c) => {
      if (!map.has(c.boarder_id)) {
        map.set(c.boarder_id, [])
      }
      map.get(c.boarder_id)!.push(c)
    })
    return map
  }, [remoteCharges])

  // Map receipts by boarder ID
  const receiptsByBoarder = useMemo(() => {
    const map = new Map<string, ExtendedReceipt[]>()
    receipts.forEach((r) => {
      if (r.is_void) return
      const bId = r.boarder_id
      if (!bId) return
      if (!map.has(bId)) {
        map.set(bId, [])
      }
      map.get(bId)!.push(r)
    })

    // Sort receipts chronologically ascending for each boarder
    map.forEach((list) => {
      list.sort((a, b) => {
        const dateA = a.receipt_date || a.created_at || ''
        const dateB = b.receipt_date || b.created_at || ''
        return dateA.localeCompare(dateB)
      })
    })

    return map
  }, [receipts])

  // Compute table rows for all members belonging to the active flat
  const rows: MonthlyCollectionSheetRow[] = useMemo(() => {
    const activeMonthPrefix = selectedMonth.slice(0, 7) // 'YYYY-MM'
    const targetFlatCode = activeFlat.code.toLowerCase()

    // Filter boarders belonging to this flat
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

    // Sort boarders by room name and seat code
    flatBoarders.sort((a, b) => {
      const roomA = a.active_allocation?.seat?.room?.name || ''
      const roomB = b.active_allocation?.seat?.room?.name || ''
      if (roomA !== roomB) return roomA.localeCompare(roomB)
      const seatA = a.active_allocation?.seat?.seat_code || ''
      const seatB = b.active_allocation?.seat?.seat_code || ''
      return seatA.localeCompare(seatB)
    })

    return flatBoarders.map((boarder, index) => {
      const bCharges = chargesByBoarder.get(boarder.id) || boarder.charges || []
      const bReceipts = receiptsByBoarder.get(boarder.id) || []

      // ----------------------------------------------------------------------
      // Col 3: Advance Rent (এডভান্স ভাড়া)
      // Check boarder.advance_amount or security deposit or advance balance
      // ----------------------------------------------------------------------
      let advanceAmount = 0
      if ((boarder as any).advance_amount && Number((boarder as any).advance_amount) > 0) {
        advanceAmount = Number((boarder as any).advance_amount)
      } else if (boarder.advance_balance && boarder.advance_balance > 0) {
        advanceAmount = boarder.advance_balance
      } else if (boarder.active_allocation?.security_deposit && boarder.active_allocation.security_deposit > 0) {
        advanceAmount = boarder.active_allocation.security_deposit
      }

      // ----------------------------------------------------------------------
      // Col 4: Previous Month's Due (পূর্ববর্তী মাসের পাওনা)
      // All unpaid dues before activeMonthPrefix (billing_month < activeMonthPrefix + '-01')
      // ----------------------------------------------------------------------
      let previousDue = 0
      bCharges.forEach((c) => {
        const bMonth = (c.billing_month || '').slice(0, 7)
        if (bMonth && bMonth < activeMonthPrefix) {
          const due = typeof c.due_amount === 'number' ? c.due_amount : c.amount - (c.paid_amount || 0)
          if (due > 0) {
            previousDue += due
          }
        }
      })

      // ----------------------------------------------------------------------
      // Payments during active month
      // Collect valid receipts for this month
      // ----------------------------------------------------------------------
      const monthReceipts = bReceipts.filter((r) => {
        const rDate = (r.receipt_date || r.created_at || '').slice(0, 7)
        if (rDate === activeMonthPrefix) return true
        // Also check if any item or allocation is for this month
        const items = (r as any).receipt_items as any[] | undefined
        const hasMatchingItem = items?.some(
          (it: any) => it.billing_month && it.billing_month.slice(0, 7) === activeMonthPrefix
        )
        const hasMatchingAlloc = (r as any).allocations?.some(
          (al: any) => al.billing_month && al.billing_month.slice(0, 7) === activeMonthPrefix
        )
        return hasMatchingItem || hasMatchingAlloc
      })

      // Waterfall Allocation (Specification):
      // 1. Any money paid first clears Previous Due (Col 5)
      // 2. Any surplus beyond previous due flows to Current Month Collections (Cols 6, 7, 8, 9)
      let remPrevDue = previousDue
      let col5Amount = 0
      const col5Vouchers: string[] = []
      const currentPayments: PaymentSlot[] = []

      monthReceipts.forEach((r) => {
        let remAmt = Number(r.amount) || 0
        const vNum = r.receipt_number || '—'

        if (remPrevDue > 0 && remAmt > 0) {
          const payTowardsPrev = Math.min(remAmt, remPrevDue)
          col5Amount += payTowardsPrev
          if (!col5Vouchers.includes(vNum)) {
            col5Vouchers.push(vNum)
          }
          remPrevDue -= payTowardsPrev
          remAmt -= payTowardsPrev
        }

        if (remAmt > 0) {
          currentPayments.push({
            amount: remAmt,
            voucher: vNum,
          })
        }
      })

      // ----------------------------------------------------------------------
      // Col 10: Total Current Month Collection (চলতি মাসের মোট আদায়)
      // Sum of Cols 6 to 9 (currentPayments)
      // ----------------------------------------------------------------------
      const totalCurrentCollected = currentPayments.reduce((acc, p) => acc + p.amount, 0)

      // ----------------------------------------------------------------------
      // Col 11: Seat Rent (সিট ভাড়া)
      // Rent charge for this month
      // ----------------------------------------------------------------------
      let seatRent = 0
      const rentCharge = bCharges.find(
        (c) => c.charge_type === 'RENT' && (c.billing_month || '').slice(0, 7) === activeMonthPrefix
      )
      if (rentCharge) {
        seatRent = Number(rentCharge.amount) || 0
      } else if (boarder.active_allocation?.monthly_rent) {
        seatRent = Number(boarder.active_allocation.monthly_rent) || 0
      }

      // ----------------------------------------------------------------------
      // Col 12: Service Charge (সার্ভিস চার্জ)
      // Utility / Misc / Service Charge for this month
      // ----------------------------------------------------------------------
      let serviceCharge = 0
      const utilityCharges = bCharges.filter((c) => {
        const bMonth = (c.billing_month || '').slice(0, 7)
        return (
          bMonth === activeMonthPrefix &&
          (c.charge_type === 'UTILITY' ||
            (c.charge_type as string) === 'SERVICE_CHARGE' ||
            (c.charge_type as string) === 'OTHER' ||
            (c.charge_type as string) === 'MISC')
        )
      })
      serviceCharge = utilityCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

      // ----------------------------------------------------------------------
      // Col 13: Meal Charge (মিল খরচ)
      // Meal bill charge for this month
      // ----------------------------------------------------------------------
      let mealCharge = 0
      const mealChargesList = bCharges.filter((c) => {
        const bMonth = (c.billing_month || '').slice(0, 7)
        return bMonth === activeMonthPrefix && c.charge_type === 'MEAL'
      })
      if (mealChargesList.length > 0) {
        mealCharge = mealChargesList.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)
      } else if (boarder.meal_summary?.estimated_meal_cost) {
        mealCharge = Number(boarder.meal_summary.estimated_meal_cost) || 0
      }

      // ----------------------------------------------------------------------
      // Col 14: Total Current Month Expense (চলতি মাসের মোট খরচ)
      // Col 11 + Col 12 + Col 13
      // ----------------------------------------------------------------------
      const totalCurrentExpense = seatRent + serviceCharge + mealCharge

      // ----------------------------------------------------------------------
      // Col 15: Net Balance (দেনা/পাওনা)
      // Col 10 - Col 14
      // ----------------------------------------------------------------------
      const netBalance = totalCurrentCollected - totalCurrentExpense

      // Room & Seat text
      const seatName = boarder.active_allocation?.seat?.seat_name || boarder.active_allocation?.seat?.seat_code || ''
      const roomName = boarder.active_allocation?.seat?.room?.name || ''
      const roomSeatText = [roomName, seatName].filter(Boolean).join(' • ')

      return {
        sl: index + 1,
        boarderId: boarder.id,
        boarderName: boarder.full_name,
        boarderPhone: boarder.phone_number || '',
        boarderCode: boarder.boarder_code || '',
        flatCode: activeFlat.code,
        flatName: activeFlat.name,
        roomSeatText,
        advanceAmount,
        hasAdvance: advanceAmount > 0,
        previousDue,
        previousDueCollected: col5Amount,
        previousDueVouchers: col5Vouchers,
        payments: currentPayments,
        totalCurrentCollected,
        seatRent,
        serviceCharge,
        mealCharge,
        totalCurrentExpense,
        netBalance,
      }
    })
  }, [
    boarders,
    activeFlat,
    selectedMonth,
    chargesByBoarder,
    receiptsByBoarder,
  ])

  // Calculate table grand totals
  const totals: MonthlyCollectionSheetTotals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.advanceAmount += r.advanceAmount
        acc.previousDue += r.previousDue
        acc.previousDueCollected += r.previousDueCollected
        acc.payment1 += r.payments[0]?.amount || 0
        acc.payment2 += r.payments[1]?.amount || 0
        acc.payment3 += r.payments[2]?.amount || 0
        acc.payment4 += r.payments[3]?.amount || 0
        acc.totalCurrentCollected += r.totalCurrentCollected
        acc.seatRent += r.seatRent
        acc.serviceCharge += r.serviceCharge
        acc.mealCharge += r.mealCharge
        acc.totalCurrentExpense += r.totalCurrentExpense
        acc.netBalance += r.netBalance
        return acc
      },
      {
        advanceAmount: 0,
        previousDue: 0,
        previousDueCollected: 0,
        payment1: 0,
        payment2: 0,
        payment3: 0,
        payment4: 0,
        totalCurrentCollected: 0,
        seatRent: 0,
        serviceCharge: 0,
        mealCharge: 0,
        totalCurrentExpense: 0,
        netBalance: 0,
      }
    )
  }, [rows])

  const selectedMonthBn = formatSheetMonthBn(selectedMonth)
  const selectedFlatCodeBn = toBengaliDigits(activeFlat.code.replace(/\D/g, '')) || activeFlat.code

  return {
    rows,
    totals,
    availableFlats,
    selectedFlatName: activeFlat.name,
    selectedFlatCode: selectedFlatCodeBn,
    selectedMonthBn,
    isLoading: isLoadingBoarders || isLoadingReceipts || isLoadingCharges,
  }
}

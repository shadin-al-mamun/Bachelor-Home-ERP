import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import {
  getStoredActiveMealRate,
  formatDhakaDate,
  getDhakaNow,
} from './useMeals'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface KitchenFlatSummary {
  flat_id: string
  flat_name: string
  flat_code: string
  building_name: string
  floor_number: number
  total_boarders: number
  breakfast_count: number
  lunch_count: number
  dinner_count: number
  total_meals: number
}

export interface KitchenGrandTotal {
  total_flats: number
  total_boarders: number
  breakfast_count: number
  lunch_count: number
  dinner_count: number
  total_meals: number
  estimated_budget: number
}

export interface KitchenSummaryResponse {
  meal_date: string
  flats: KitchenFlatSummary[]
  grand_totals: KitchenGrandTotal
}

export interface FlatBoarderMealItem {
  boarder_id: string
  boarder_name: string
  boarder_code: string
  phone_number: string
  room_name: string
  seat_name: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  is_override: boolean
  override_reason?: string | null
}

// ==============================================================================
// Mock Data Baseline (Realistic Hostel Kitchen Layout)
// ==============================================================================

const MOCK_KITCHEN_FLATS: KitchenFlatSummary[] = [
  {
    flat_id: 'flat-2a',
    flat_name: 'ফ্ল্যাট ২-এ',
    flat_code: 'FLAT-2A',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
    floor_number: 2,
    total_boarders: 8,
    breakfast_count: 6,
    lunch_count: 8,
    dinner_count: 7,
    total_meals: 21,
  },
  {
    flat_id: 'flat-2b',
    flat_name: 'ফ্ল্যাট ২-বি',
    flat_code: 'FLAT-2B',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
    floor_number: 2,
    total_boarders: 6,
    breakfast_count: 4,
    lunch_count: 6,
    dinner_count: 6,
    total_meals: 16,
  },
  {
    flat_id: 'flat-3a',
    flat_name: 'ফ্ল্যাট ৩-এ',
    flat_code: 'FLAT-3A',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
    floor_number: 3,
    total_boarders: 10,
    breakfast_count: 8,
    lunch_count: 10,
    dinner_count: 9,
    total_meals: 27,
  },
  {
    flat_id: 'flat-3b',
    flat_name: 'ফ্ল্যাট ৩-বি',
    flat_code: 'FLAT-3B',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
    floor_number: 3,
    total_boarders: 8,
    breakfast_count: 5,
    lunch_count: 7,
    dinner_count: 8,
    total_meals: 20,
  },
  {
    flat_id: 'flat-4a',
    flat_name: 'ফ্ল্যাট ৪-এ',
    flat_code: 'FLAT-4A',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
    floor_number: 4,
    total_boarders: 8,
    breakfast_count: 7,
    lunch_count: 8,
    dinner_count: 8,
    total_meals: 23,
  },
]

const MOCK_FLAT_BOARDERS_DETAIL: Record<string, FlatBoarderMealItem[]> = {
  'flat-2a': [
    {
      boarder_id: 'bdr-101',
      boarder_name: 'তানভীর আহমেদ',
      boarder_code: 'BDR-101',
      phone_number: '01711223344',
      room_name: 'রুম ২০১',
      seat_name: 'সিট ১',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-102',
      boarder_name: 'সাকিব আল হাসান',
      boarder_code: 'BDR-102',
      phone_number: '01811998877',
      room_name: 'রুম ২০১',
      seat_name: 'সিট ২',
      breakfast: false,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-104',
      boarder_name: 'রাকিবুল ইসলাম',
      boarder_code: 'BDR-104',
      phone_number: '01611002211',
      room_name: 'রুম ২০২',
      seat_name: 'সিট ১',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-105',
      boarder_name: 'আরিফুল হক',
      boarder_code: 'BDR-105',
      phone_number: '01511334455',
      room_name: 'রুম ২০২',
      seat_name: 'সিট ২',
      breakfast: true,
      lunch: true,
      dinner: false,
      is_override: false,
    },
    {
      boarder_id: 'bdr-106',
      boarder_name: 'নাঈম হাসান',
      boarder_code: 'BDR-106',
      phone_number: '01799887766',
      room_name: 'রুম ২০৩',
      seat_name: 'সিট ১',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-107',
      boarder_name: 'জাহিদুল ইসলাম',
      boarder_code: 'BDR-107',
      phone_number: '01855443322',
      room_name: 'রুম ২০৩',
      seat_name: 'সিট ২',
      breakfast: false,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-108',
      boarder_name: 'মুস্তাফিজুর রহমান',
      boarder_code: 'BDR-108',
      phone_number: '01922331100',
      room_name: 'রুম ২০৪',
      seat_name: 'সিট ১',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: false,
    },
    {
      boarder_id: 'bdr-109',
      boarder_name: 'তাসকিন আহমেদ',
      boarder_code: 'BDR-109',
      phone_number: '01733221100',
      room_name: 'রুম ২০৪',
      seat_name: 'সিট ২',
      breakfast: true,
      lunch: true,
      dinner: true,
      is_override: true,
      override_reason: 'এডমিন কর্তৃক বিশেষ অনুমোদন',
    },
  ],
}

// ==============================================================================
// React Query Hooks
// ==============================================================================

/**
 * 1. Fetch Flat-wise Preparation Sheet & Grand Totals for a Given Date
 */
export function useKitchenMealSummary(mealDate?: string) {
  const targetDate = mealDate || formatDhakaDate(getDhakaNow())

  return useQuery({
    queryKey: ['kitchen-meals-summary', targetDate],
    queryFn: async (): Promise<KitchenSummaryResponse> => {
      if (!isSupabaseConfigured) {
        // Compute grand totals dynamically from mock flats
        const breakfastCount = MOCK_KITCHEN_FLATS.reduce((sum, f) => sum + f.breakfast_count, 0)
        const lunchCount = MOCK_KITCHEN_FLATS.reduce((sum, f) => sum + f.lunch_count, 0)
        const dinnerCount = MOCK_KITCHEN_FLATS.reduce((sum, f) => sum + f.dinner_count, 0)
        const totalMeals = breakfastCount + lunchCount + dinnerCount
        const totalBoarders = MOCK_KITCHEN_FLATS.reduce((sum, f) => sum + f.total_boarders, 0)

        const currentRates = getStoredActiveMealRate()
        const estimatedBudget =
          breakfastCount * (currentRates.breakfast_rate || 0) +
          lunchCount * (currentRates.lunch_rate || 0) +
          dinnerCount * (currentRates.dinner_rate || 0)

        return {
          meal_date: targetDate,
          flats: MOCK_KITCHEN_FLATS,
          grand_totals: {
            total_flats: MOCK_KITCHEN_FLATS.length,
            total_boarders: totalBoarders,
            breakfast_count: breakfastCount,
            lunch_count: lunchCount,
            dinner_count: dinnerCount,
            total_meals: totalMeals,
            estimated_budget: estimatedBudget,
          },
        }
      }

      // Supabase Query: Join flats with rooms, seats, and allocations
      const { data: flatsData, error: flatsErr } = await supabase
        .from('flats')
        .select(`
          id,
          name,
          flat_code,
          floor_number,
          building:buildings ( name ),
          rooms (
            id,
            seats (
              id,
              allocations (
                id,
                boarder_id,
                status
              )
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .order('floor_number', { ascending: true })

      if (flatsErr) throw new Error(flatsErr.message)

      // Fetch meal selections for today
      const { data: selectionsData, error: selErr } = await supabase
        .from('meal_selections')
        .select('*')
        .eq('meal_date', targetDate)

      if (selErr) throw new Error(selErr.message)

      const selections = selectionsData || []

      // Fetch confirmed guest meal bookings for targetDate
      let guestBookings: any[] = []
      try {
        const { data: gData } = await supabase
          .from('guest_meal_bookings')
          .select('*')
          .eq('meal_date', targetDate)
          .eq('status', 'CONFIRMED')
        guestBookings = gData || []
      } catch (err) {
        console.warn('guest_meal_bookings query in kitchen summary:', err)
      }

      // Also merge any local bookings
      try {
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('bachelor_erp_guest_meal_bookings')
          if (raw) {
            const localG = JSON.parse(raw)
            localG.forEach((lg: any) => {
              if (
                lg.meal_date === targetDate &&
                lg.status === 'CONFIRMED' &&
                !guestBookings.some((gb) => gb.id === lg.id)
              ) {
                guestBookings.push(lg)
              }
            })
          }
        }
      } catch (e) {
        // ignore
      }

      // Build flat summaries
      let grandBreakfast = 0
      let grandLunch = 0
      let grandDinner = 0
      let grandBoarders = 0

      const flatSummaries: KitchenFlatSummary[] = (flatsData || []).map((flat: any) => {
        const flatBoarderIds: string[] = (flat.rooms || [])
          .flatMap((r: any) => r.seats || [])
          .flatMap((s: any) => s.allocations || [])
          .filter((a: any) => a && (a.status === 'ACTIVE' || !a.status))
          .map((a: any) => a.boarder_id)
          .filter(Boolean)

        const uniqueBoarderIds = Array.from(new Set(flatBoarderIds))
        const flatSelections = selections.filter((s: any) => s.flat_id === flat.id)
        const flatSelMap = new Map(flatSelections.map((s: any) => [s.boarder_id, s]))

        // In an Opt-Out mess policy: for every active boarder, if no selection row, default is TRUE!
        let bCount = 0
        let lCount = 0
        let dCount = 0

        for (const bId of uniqueBoarderIds) {
          const sel: any = flatSelMap.get(bId)
          if (sel) {
            if (sel.breakfast) bCount++
            if (sel.lunch) lCount++
            if (sel.dinner) dCount++
          } else {
            // Opt-out default: meals are active unless turned off!
            bCount++
            lCount++
            dCount++
          }
        }

        // Add guest meals for this flat
        const flatGuestBookings = guestBookings.filter(
          (gb: any) => gb.flat_id === flat.id || uniqueBoarderIds.includes(gb.boarder_id)
        )
        flatGuestBookings.forEach((gb: any) => {
          const count = Number(gb.guest_count) || 0
          if (gb.session === 'BREAKFAST') bCount += count
          if (gb.session === 'LUNCH') lCount += count
          if (gb.session === 'DINNER') dCount += count
        })

        const tMeals = bCount + lCount + dCount

        grandBreakfast += bCount
        grandLunch += lCount
        grandDinner += dCount
        grandBoarders += uniqueBoarderIds.length

        return {
          flat_id: flat.id,
          flat_name: flat.name,
          flat_code: flat.flat_code,
          building_name: flat.building?.name || 'মেইন হোস্টেল',
          floor_number: flat.floor_number,
          total_boarders: uniqueBoarderIds.length,
          breakfast_count: bCount,
          lunch_count: lCount,
          dinner_count: dCount,
          total_meals: tMeals,
        }
      })

      // Add unassigned guest meals to grand totals
      const accountedGuestIds = new Set(
        (flatsData || []).flatMap((flat: any) => {
          const flatBoarderIds: string[] = (flat.rooms || [])
            .flatMap((r: any) => r.seats || [])
            .flatMap((s: any) => s.allocations || [])
            .filter((a: any) => a && (a.status === 'ACTIVE' || !a.status))
            .map((a: any) => a.boarder_id)
          return guestBookings
            .filter((gb: any) => gb.flat_id === flat.id || flatBoarderIds.includes(gb.boarder_id))
            .map((gb: any) => gb.id)
        })
      )

      guestBookings
        .filter((gb: any) => !accountedGuestIds.has(gb.id))
        .forEach((gb: any) => {
          const count = Number(gb.guest_count) || 0
          if (gb.session === 'BREAKFAST') grandBreakfast += count
          if (gb.session === 'LUNCH') grandLunch += count
          if (gb.session === 'DINNER') grandDinner += count
        })

      const totalMeals = grandBreakfast + grandLunch + grandDinner
      const currentRates = getStoredActiveMealRate()
      const estimatedBudget =
        grandBreakfast * (currentRates.breakfast_rate || 0) +
        grandLunch * (currentRates.lunch_rate || 0) +
        grandDinner * (currentRates.dinner_rate || 0)

      return {
        meal_date: targetDate,
        flats: flatSummaries,
        grand_totals: {
          total_flats: flatSummaries.length,
          total_boarders: grandBoarders,
          breakfast_count: grandBreakfast,
          lunch_count: grandLunch,
          dinner_count: grandDinner,
          total_meals: totalMeals,
          estimated_budget: estimatedBudget,
        },
      }
    },
    refetchInterval: 10000, // Background polling fallback in addition to WebSocket
  })
}

/**
 * 2. Fetch Boarder Breakdown for a Specific Flat on a Date
 */
export function useFlatBoarderMeals(flatId?: string, mealDate?: string) {
  const targetDate = mealDate || formatDhakaDate(getDhakaNow())

  return useQuery({
    queryKey: ['kitchen-flat-boarders', flatId, targetDate],
    queryFn: async (): Promise<FlatBoarderMealItem[]> => {
      if (!flatId) return []

      if (!isSupabaseConfigured) {
        return MOCK_FLAT_BOARDERS_DETAIL[flatId] || MOCK_FLAT_BOARDERS_DETAIL['flat-2a']
      }

      const { data, error } = await supabase
        .from('allocations')
        .select(`
          id,
          status,
          boarder:boarders (
            id,
            full_name,
            boarder_code,
            phone_number
          ),
          seat:seats (
            id,
            seat_name,
            room:rooms (
              id,
              name,
              flat_id
            )
          )
        `)
        .eq('status', 'ACTIVE')

      if (error) throw new Error(error.message)

      const activeInFlat = (data || []).filter(
        (row: any) => row.seat?.room?.flat_id === flatId
      )

      // Fetch meal selections for this date & flat
      const { data: selData, error: selErr } = await supabase
        .from('meal_selections')
        .select('*')
        .eq('flat_id', flatId)
        .eq('meal_date', targetDate)

      if (selErr) throw new Error(selErr.message)

      const selectionsMap = new Map((selData || []).map((s: any) => [s.boarder_id, s]))

      return (activeInFlat || []).map((row: any) => {
        const b = row.boarder
        const seat = row.seat
        const room = seat?.room
        const sel = selectionsMap.get(b?.id)

        return {
          boarder_id: b?.id,
          boarder_name: b?.full_name || 'বর্ডার',
          boarder_code: b?.boarder_code || 'BDR',
          phone_number: b?.phone_number || '',
          room_name: room?.name || 'রুম',
          seat_name: seat?.seat_name || 'সিট',
          breakfast: sel ? sel.breakfast : true, // Opt-Out: active by default
          lunch: sel ? sel.lunch : true,         // Opt-Out: active by default
          dinner: sel ? sel.dinner : true,       // Opt-Out: active by default
          is_override: sel?.is_override ?? false,
          override_reason: sel?.override_reason || null,
        }
      })
    },
    enabled: !!flatId,
  })
}

/**
 * 3. In-memory Mock sync for Staff Meal Toggles
 */
export function updateMockFlatBoarderMeal(
  boarderId: string,
  session: 'BREAKFAST' | 'LUNCH' | 'DINNER',
  newState: boolean,
  isOverride: boolean = false,
  reason?: string | null
) {
  Object.values(MOCK_FLAT_BOARDERS_DETAIL).forEach((list) => {
    const item = list.find((b) => b.boarder_id === boarderId)
    if (item) {
      if (session === 'BREAKFAST') item.breakfast = newState
      if (session === 'LUNCH') item.lunch = newState
      if (session === 'DINNER') item.dinner = newState
      if (isOverride) {
        item.is_override = true
        item.override_reason = reason || 'ম্যানেজার কর্তৃক পরিবর্তন'
      }
    }
  })
}

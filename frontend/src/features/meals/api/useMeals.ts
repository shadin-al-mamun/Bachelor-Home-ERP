import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import {
  updateOwnerDashboardMealMetrics,
  updateOwnerDashboardMealBatch,
  liveMealMetricsState,
} from '@/features/dashboard/api/useOwnerDashboard'
import type {
  MealSettings,
  MealRate,
  MealSelection,
} from '@/types/database'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export type MealSessionType = 'BREAKFAST' | 'LUNCH' | 'DINNER'

/**
 * Checks whether user has permission to manage and override boarder meals at any time
 */
export function isMealManagerRole(role?: string | null): boolean {
  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    role === 'MEAL_OPERATOR'
  )
}

/**
 * Validates whether a string is a standard UUID
 */
export function isUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export interface ExtendedMealSelection extends MealSelection {
  boarder_name?: string
  flat_name?: string
  flat_code?: string
}

export interface ToggleMealInput {
  mealDate: string // YYYY-MM-DD
  session: MealSessionType
  newState: boolean
  overrideReason?: string | null
  targetBoarderId?: string
}

export interface BatchToggleInput {
  mealDate: string
  breakfast?: boolean
  lunch?: boolean
  dinner?: boolean
  overrideReason?: string | null
  targetBoarderId?: string
}

export interface BoarderOption {
  id: string
  user_id?: string | null
  full_name: string
  boarder_code: string
  phone_number: string
  flat_id?: string
  flat_name?: string
  room_name?: string
  seat_name?: string
  seat_code?: string
  building_name?: string
  monthly_rent?: number
  admission_date?: string
  status?: string
}

// ==============================================================================
// Asia/Dhaka Time & Cutoff Utilities
// ==============================================================================

/**
 * Returns current Date in Asia/Dhaka timezone (UTC+6)
 */
export function getDhakaNow(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 3600000 * 6) // UTC+6
}

/**
 * Formats a Date object to YYYY-MM-DD in Asia/Dhaka timezone
 */
export function formatDhakaDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Test Mode: Cutoff Bypass for seamless testing across devices at any time of day
 */
export function isCutoffBypassActive(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env?.MODE === 'test') return false
  const saved = localStorage.getItem('erp_cutoff_bypass')
  // Default to true in development / demo preview so users can always test cross-device sync
  return saved === null ? true : saved === 'true'
}

export function setCutoffBypass(enabled: boolean) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('erp_cutoff_bypass', enabled ? 'true' : 'false')
    window.dispatchEvent(new Event('erp_cutoff_bypass_changed'))
  }
}

/**
 * Evaluates whether next-day cutoff has expired (10:00:00 PM Dhaka time)
 */
export function isDhakaCutoffPassed(
  cutoffTimeStr: string = '22:00:00',
  customNow?: Date | string
): boolean {
  const dhakaNow = customNow
    ? typeof customNow === 'string'
      ? new Date(customNow)
      : customNow
    : getDhakaNow()
  const [cutoffHours, cutoffMinutes] = cutoffTimeStr.split(':').map(Number)
  const cutoffToday = new Date(dhakaNow)
  cutoffToday.setHours(cutoffHours, cutoffMinutes, 0, 0)
  return dhakaNow.getTime() >= cutoffToday.getTime()
}

/**
 * Returns remaining seconds until today's 10:00 PM cutoff in Dhaka
 */
export function getRemainingCutoffSeconds(
  cutoffTimeStr: string = '22:00:00',
  customNow?: Date | string
): number {
  const dhakaNow = customNow
    ? typeof customNow === 'string'
      ? new Date(customNow)
      : customNow
    : getDhakaNow()
  const [cutoffHours, cutoffMinutes] = cutoffTimeStr.split(':').map(Number)
  const cutoffToday = new Date(dhakaNow)
  cutoffToday.setHours(cutoffHours, cutoffMinutes, 0, 0)
  const diffMs = cutoffToday.getTime() - dhakaNow.getTime()
  return diffMs > 0 ? Math.floor(diffMs / 1000) : 0
}

/**
 * Evaluates date status relative to today in Asia/Dhaka
 */
export function getDateMealStatus(
  targetDateStr: string,
  cutoffTimeStr: string = '22:00:00',
  customNow?: Date | string
) {
  const dhakaNow = customNow
    ? typeof customNow === 'string'
      ? new Date(customNow)
      : customNow
    : getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  const isToday = targetDateStr === todayStr
  const isPast = targetDateStr < todayStr
  const isTomorrow = targetDateStr === tomorrowStr
  const isFuture = targetDateStr > tomorrowStr

  const cutoffPassed = isDhakaCutoffPassed(cutoffTimeStr, dhakaNow)
  const bypassActive = isCutoffBypassActive()

  // Locked for ordinary boarders if past, today, or tomorrow after 10 PM (unless bypass is active)
  const isLockedForBoarder = isPast || isToday || (isTomorrow && cutoffPassed && !bypassActive)

  return {
    todayStr,
    tomorrowStr,
    isToday,
    isPast,
    isTomorrow,
    isFuture,
    cutoffPassed,
    isLockedForBoarder,
    isCutoffBypass: bypassActive,
  }
}

// ==============================================================================
// Mock Data Baseline (Realistic Hostel Boarders & Meals)
// ==============================================================================

export const MOCK_MEAL_SETTINGS: MealSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  is_meal_module_enabled: true,
  breakfast_enabled: true,
  lunch_enabled: true,
  dinner_enabled: true,
  cutoff_time: '22:00:00',
  updated_by: 'usr-admin1',
  updated_at: new Date().toISOString(),
}

export const MOCK_ACTIVE_RATE: MealRate = {
  id: 'rate-active-2026',
  effective_from: '2026-01-01',
  effective_to: null,
  breakfast_rate: 30.0,
  lunch_rate: 65.0,
  dinner_rate: 60.0,
  created_by: 'usr-admin1',
  created_at: '2026-01-01T00:00:00Z',
}

export const MOCK_BOARDERS_FOR_MEAL: BoarderOption[] = [
  {
    id: 'bdr-101',
    user_id: 'usr-bdr1',
    full_name: 'তানভীর আহমেদ',
    boarder_code: 'BDR-101',
    phone_number: '01711223344',
    flat_name: 'ফ্ল্যাট ২-এ',
    room_name: 'রুম ২০১ (সিট ১)',
  },
  {
    id: 'bdr-102',
    user_id: 'usr-bdr2',
    full_name: 'রাকিবুল হাসান',
    boarder_code: 'BDR-102',
    phone_number: '01912345678',
    flat_name: 'ফ্ল্যাট ৪-এ',
    room_name: 'রুম ১০২ (সিট ২)',
  },
  {
    id: 'bdr-103',
    user_id: 'usr-bdr3',
    full_name: 'সাকিব আল হাসান',
    boarder_code: 'BDR-103',
    phone_number: '01811998877',
    flat_name: 'ফ্ল্যাট ২-এ',
    room_name: 'রুম ২০১ (সিট ২)',
  },
  {
    id: 'bdr-104',
    user_id: 'usr-bdr4',
    full_name: 'মাহমুদুল্লাহ রিয়াদ',
    boarder_code: 'BDR-104',
    phone_number: '01911445566',
    flat_name: 'ফ্ল্যাট ৩-বি',
    room_name: 'রুম ৩০১ (সিট ১)',
  },
]

// Generate default meal selections for current boarder for this week
let MOCK_SELECTIONS: MealSelection[] = []

function initializeMockSelections() {
  if (MOCK_SELECTIONS.length > 0) return

  const dhakaNow = getDhakaNow()
  // Generate for past 2 days, today, and next 10 days
  for (let offset = -2; offset <= 10; offset++) {
    const d = new Date(dhakaNow)
    d.setDate(d.getDate() + offset)
    const dateStr = formatDhakaDate(d)

    MOCK_BOARDERS_FOR_MEAL.forEach((bdr) => {
      // Default: breakfast off on weekends, lunch on, dinner on
      const dayOfWeek = d.getDay()
      const isFriday = dayOfWeek === 5

      MOCK_SELECTIONS.push({
        id: `ms-${bdr.id}-${dateStr}`,
        boarder_id: bdr.id,
        flat_id: 'flat-2a',
        meal_date: dateStr,
        breakfast: !isFriday,
        lunch: true,
        dinner: true,
        is_locked: offset <= 0,
        is_override: false,
        override_reason: null,
        override_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    })
  }
}

initializeMockSelections()

// ==============================================================================
// React Query Hooks
// ==============================================================================

// 1. Fetch Meal Settings Singleton
export function useMealSettings() {
  return useQuery({
    queryKey: ['meal-settings'],
    queryFn: async (): Promise<MealSettings> => {
      if (!isSupabaseConfigured) {
        return MOCK_MEAL_SETTINGS
      }

      const { data, error } = await supabase
        .from('meal_settings')
        .select('*')
        .limit(1)
        .single()

      if (error) {
        console.warn('Fallback to mock meal settings:', error.message)
        return MOCK_MEAL_SETTINGS
      }
      return data || MOCK_MEAL_SETTINGS
    },
    staleTime: 60000,
  })
}

// 2. Fetch Active Meal Rates
export function useActiveMealRates() {
  return useQuery({
    queryKey: ['active-meal-rate'],
    queryFn: async (): Promise<MealRate> => {
      if (!isSupabaseConfigured) {
        return MOCK_ACTIVE_RATE
      }

      const todayStr = formatDhakaDate(getDhakaNow())
      const { data, error } = await supabase
        .from('meal_rates')
        .select('*')
        .lte('effective_from', todayStr)
        .or(`effective_to.is.null,effective_to.gte.${todayStr}`)
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)

      if (error || !data || data.length === 0) {
        return MOCK_ACTIVE_RATE
      }
      return data[0]
    },
    staleTime: 5000,
  })
}

// 3. Fetch Boarder Options (for Admin / Manager Switcher)
export function useMealBoardersList() {
  return useQuery({
    queryKey: ['meal-boarders-list'],
    queryFn: async (): Promise<BoarderOption[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_BOARDERS_FOR_MEAL
      }

      let { data, error } = await supabase
        .from('boarders')
        .select(`
          id,
          user_id,
          full_name,
          boarder_code,
          phone_number,
          admission_date,
          status,
          allocations(
            status,
            monthly_rent,
            start_date,
            seat:seats(
              id,
              seat_name,
              seat_code,
              default_rent,
              room:rooms(
                id,
                name,
                room_code,
                flat:flats(
                  id,
                  name,
                  flat_code,
                  building:buildings(
                    id,
                    name
                  )
                )
              )
            )
          )
        `)
        .eq('status', 'ACTIVE')
        .order('full_name')

      // Fallback query if nested relation has schema naming variance
      if (error) {
        console.warn('meal boarders nested join error, falling back to direct boarders query:', error.message)
        const simple = await supabase
          .from('boarders')
          .select('id, user_id, full_name, boarder_code, phone_number, admission_date, status')
          .eq('status', 'ACTIVE')
          .order('full_name')
        data = simple.data as any
      }

      if (!data || data.length === 0) {
        return []
      }

      return data.map((b: any) => {
        const activeAlloc = Array.isArray(b.allocations)
          ? b.allocations.find((a: any) => a.status === 'ACTIVE') || b.allocations[0]
          : b.allocations
        const seat = activeAlloc?.seat
        const room = seat?.room
        const flat = room?.flat
        const building = flat?.building

        return {
          id: b.id,
          user_id: b.user_id,
          full_name: b.full_name,
          boarder_code: b.boarder_code,
          phone_number: b.phone_number,
          monthly_rent: Number(activeAlloc?.monthly_rent ?? seat?.default_rent ?? 0),
          seat_name: seat?.seat_name || seat?.seat_code || '',
          seat_code: seat?.seat_code || '',
          room_name: room?.name || '',
          flat_id: flat?.id || '',
          flat_name: flat?.name || '',
          building_name: building?.name || '',
          admission_date: b.admission_date || activeAlloc?.start_date || '',
          status: b.status,
        }
      })
    },
  })
}

// 4. Fetch Meal Selections for a Boarder over a Date Range
export function useBoarderMealSelections(
  boarderId?: string,
  startDate?: string,
  endDate?: string
) {
  const targetBoarder = boarderId || 'bdr-101'
  const targetStart = startDate || formatDhakaDate(new Date(Date.now() - 86400000 * 2))
  const targetEnd = endDate || formatDhakaDate(new Date(Date.now() + 86400000 * 14))

  return useQuery({
    queryKey: ['boarder-meal-selections', targetBoarder, targetStart, targetEnd],
    queryFn: async (): Promise<ExtendedMealSelection[]> => {
      if (!isSupabaseConfigured) {
        try {
          const res = await fetch('/api/meals')
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.selections) && data.selections.length > 0) {
              data.selections.forEach((serverItem: any) => {
                const idx = MOCK_SELECTIONS.findIndex(
                  (s) => s.boarder_id === serverItem.boarder_id && s.meal_date === serverItem.meal_date
                )
                if (idx >= 0) {
                  MOCK_SELECTIONS[idx] = { ...MOCK_SELECTIONS[idx], ...serverItem }
                } else {
                  MOCK_SELECTIONS.push(serverItem)
                }
              })
            }
          }
        } catch {
          // offline fallback
        }

        const filtered = MOCK_SELECTIONS.filter(
          (s) =>
            s.boarder_id === targetBoarder &&
            s.meal_date >= targetStart &&
            s.meal_date <= targetEnd
        )
        return filtered
      }

      let resolvedId = targetBoarder
      if (!isUUID(resolvedId)) {
        const { data: firstBdr } = await supabase
          .from('boarders')
          .select('id')
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle()
        if (firstBdr?.id) {
          resolvedId = firstBdr.id
        } else {
          return []
        }
      }

      const { data, error } = await supabase
        .from('meal_selections')
        .select('*')
        .eq('boarder_id', resolvedId)
        .gte('meal_date', targetStart)
        .lte('meal_date', targetEnd)
        .order('meal_date', { ascending: true })

      if (error) {
        console.error('Error fetching meal selections:', error)
        throw new Error(error.message)
      }

      return data || []
    },
    refetchInterval: 2000,
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

// 1. Toggle Single Meal Session (Breakfast / Lunch / Dinner)
export function useToggleMealMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ToggleMealInput) => {
      const targetBoarder = input.targetBoarderId || 'bdr-101'
      const sessionUpper = input.session.toUpperCase() as MealSessionType

      // Validate Cutoff on Client before sending (Staff can override at any time, or if test bypass active)
      const status = getDateMealStatus(input.mealDate)
      const bypassActive = isCutoffBypassActive()
      const effectiveOverrideReason =
        input.overrideReason ||
        (bypassActive && status.cutoffPassed ? 'টেস্ট মোড কাটঅফ বাইপাস (Test Bypass)' : null) ||
        (input.targetBoarderId ? 'কর্তৃপক্ষ কর্তৃক মিল পরিবর্তন (Staff Override)' : null)

      if (status.isLockedForBoarder && !effectiveOverrideReason) {
        throw new Error('কাটঅফ সময় অতিক্রান্ত হয়েছে। আগামীকালের বা পূর্ববর্তী দিনের মিল পরিবর্তন লক করা আছে।')
      }

      if (!isSupabaseConfigured) {
        try {
          const res = await fetch('/api/meals/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boarderId: targetBoarder,
              mealDate: input.mealDate,
              session: sessionUpper,
              newState: input.newState,
              overrideReason: effectiveOverrideReason,
            }),
          })
          if (res.ok) {
            const result = await res.json()
            if (result.metrics) {
              liveMealMetricsState.active_meals_today = result.metrics.active_meals_today
              liveMealMetricsState.active_meals_tomorrow = result.metrics.active_meals_tomorrow
              liveMealMetricsState.meal_attendance_rate = result.metrics.meal_attendance_rate
            }
          }
        } catch {
          // offline fallback
        }

        let existing = MOCK_SELECTIONS.find(
          (s) => s.boarder_id === targetBoarder && s.meal_date === input.mealDate
        )

        if (!existing) {
          existing = {
            id: `ms-${targetBoarder}-${input.mealDate}`,
            boarder_id: targetBoarder,
            flat_id: 'flat-2a',
            meal_date: input.mealDate,
            breakfast: false,
            lunch: false,
            dinner: false,
            is_locked: false,
            is_override: !!effectiveOverrideReason,
            override_reason: effectiveOverrideReason || null,
            override_by: effectiveOverrideReason ? 'usr-admin1' : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          MOCK_SELECTIONS.push(existing)
        }

        if (sessionUpper === 'BREAKFAST') existing.breakfast = input.newState
        if (sessionUpper === 'LUNCH') existing.lunch = input.newState
        if (sessionUpper === 'DINNER') existing.dinner = input.newState

        if (effectiveOverrideReason) {
          existing.is_override = true
          existing.override_reason = effectiveOverrideReason
          existing.override_by = 'usr-admin1'
        }
        existing.updated_at = new Date().toISOString()

        updateOwnerDashboardMealMetrics(input.mealDate, sessionUpper, input.newState)

        return {
          success: true,
          selection_id: existing.id,
          meal_date: input.mealDate,
          session: sessionUpper,
          state: input.newState,
        }
      }

      // Resolve valid target boarder UUID for Supabase RPC
      let targetBoarderUuid: string | null = null
      if (isUUID(input.targetBoarderId)) {
        targetBoarderUuid = input.targetBoarderId!
      } else {
        const { data: activeBdr } = await supabase
          .from('boarders')
          .select('id')
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle()
        if (activeBdr?.id) {
          targetBoarderUuid = activeBdr.id
        }
      }

      // Supabase RPC Call
      const { data, error } = await supabase.rpc('fn_toggle_meal_selection', {
        p_meal_date: input.mealDate,
        p_session: sessionUpper,
        p_new_state: input.newState,
        p_override_reason: effectiveOverrideReason || null,
        p_target_boarder_id: targetBoarderUuid,
      })

      if (error) {
        throw new Error(error.message || 'মিল পরিবর্তন করতে ব্যর্থ হয়েছে।')
      }
      return data
    },

    // Optimistic Update Implementation
    onMutate: async (input) => {
      const targetBoarder = input.targetBoarderId || 'bdr-101'
      await queryClient.cancelQueries({ queryKey: ['boarder-meal-selections', targetBoarder] })

      // Snapshot prior value
      const queries = queryClient.getQueriesData<ExtendedMealSelection[]>({
        queryKey: ['boarder-meal-selections', targetBoarder],
      })

      // Optimistically update matching queries
      queries.forEach(([queryKey, oldData]) => {
        if (!oldData) return
        const updated = oldData.map((item) => {
          if (item.meal_date === input.mealDate) {
            const key = input.session.toLowerCase() as 'breakfast' | 'lunch' | 'dinner'
            return { ...item, [key]: input.newState }
          }
          return item
        })
        queryClient.setQueryData(queryKey, updated)
      })

      return { queries }
    },

    onError: (_err, _input, context) => {
      // Revert optimistic updates on error
      if (context?.queries) {
        context.queries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData)
        })
      }
    },

    onSettled: (_data, _error, input) => {
      const targetBoarder = input.targetBoarderId || 'bdr-101'
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-meal-selections', targetBoarder] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals-summary'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-flat-boarders'] })
    },
  })
}

// 2. Batch Toggle All Sessions for a Date (Quick All-ON / All-OFF)
export function useBatchToggleMealsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BatchToggleInput) => {
      const targetBoarder = input.targetBoarderId || 'bdr-101'

      const status = getDateMealStatus(input.mealDate)
      const bypassActive = isCutoffBypassActive()
      const effectiveOverrideReason =
        input.overrideReason ||
        (bypassActive && status.cutoffPassed ? 'টেস্ট মোড কাটঅফ বাইপাস (Test Bypass)' : null) ||
        (input.targetBoarderId ? 'কর্তৃপক্ষ কর্তৃক মিল পরিবর্তন (Staff Override)' : null)

      if (status.isLockedForBoarder && !effectiveOverrideReason) {
        throw new Error('কাটঅফ সময় অতিক্রান্ত হয়েছে। আগামীকালের বা পূর্ববর্তী দিনের মিল পরিবর্তন লক করা আছে।')
      }

      if (!isSupabaseConfigured) {
        try {
          const res = await fetch('/api/meals/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boarderId: targetBoarder,
              mealDate: input.mealDate,
              breakfast: input.breakfast,
              lunch: input.lunch,
              dinner: input.dinner,
              overrideReason: effectiveOverrideReason,
            }),
          })
          if (res.ok) {
            const result = await res.json()
            if (result.metrics) {
              liveMealMetricsState.active_meals_today = result.metrics.active_meals_today
              liveMealMetricsState.active_meals_tomorrow = result.metrics.active_meals_tomorrow
              liveMealMetricsState.meal_attendance_rate = result.metrics.meal_attendance_rate
            }
          }
        } catch {
          // offline fallback
        }

        let existing = MOCK_SELECTIONS.find(
          (s) => s.boarder_id === targetBoarder && s.meal_date === input.mealDate
        )

        if (!existing) {
          existing = {
            id: `ms-${targetBoarder}-${input.mealDate}`,
            boarder_id: targetBoarder,
            flat_id: 'flat-2a',
            meal_date: input.mealDate,
            breakfast: false,
            lunch: false,
            dinner: false,
            is_locked: false,
            is_override: !!effectiveOverrideReason,
            override_reason: effectiveOverrideReason || null,
            override_by: effectiveOverrideReason ? 'usr-admin1' : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          MOCK_SELECTIONS.push(existing)
        }

        let deltaMeals = 0
        if (input.breakfast !== undefined) deltaMeals += (input.breakfast ? 1 : 0) - (existing.breakfast ? 1 : 0)
        if (input.lunch !== undefined) deltaMeals += (input.lunch ? 1 : 0) - (existing.lunch ? 1 : 0)
        if (input.dinner !== undefined) deltaMeals += (input.dinner ? 1 : 0) - (existing.dinner ? 1 : 0)

        if (input.breakfast !== undefined) existing.breakfast = input.breakfast
        if (input.lunch !== undefined) existing.lunch = input.lunch
        if (input.dinner !== undefined) existing.dinner = input.dinner
        if (effectiveOverrideReason) {
          existing.is_override = true
          existing.override_reason = effectiveOverrideReason
          existing.override_by = 'usr-admin1'
        }
        existing.updated_at = new Date().toISOString()

        updateOwnerDashboardMealBatch(input.mealDate, deltaMeals)

        return { success: true }
      }

      // Resolve valid target boarder UUID for Supabase RPC
      let targetBoarderUuid: string | null = null
      if (isUUID(input.targetBoarderId)) {
        targetBoarderUuid = input.targetBoarderId!
      } else {
        const { data: activeBdr } = await supabase
          .from('boarders')
          .select('id')
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle()
        if (activeBdr?.id) {
          targetBoarderUuid = activeBdr.id
        }
      }

      // Sequential toggle calls for non-undefined sessions
      const sessionsToToggle: { session: MealSessionType; state: boolean }[] = []
      if (input.breakfast !== undefined) sessionsToToggle.push({ session: 'BREAKFAST', state: input.breakfast })
      if (input.lunch !== undefined) sessionsToToggle.push({ session: 'LUNCH', state: input.lunch })
      if (input.dinner !== undefined) sessionsToToggle.push({ session: 'DINNER', state: input.dinner })

      for (const item of sessionsToToggle) {
        const { error } = await supabase.rpc('fn_toggle_meal_selection', {
          p_meal_date: input.mealDate,
          p_session: item.session,
          p_new_state: item.state,
          p_override_reason: effectiveOverrideReason || null,
          p_target_boarder_id: targetBoarderUuid,
        })
        if (error) throw new Error(error.message)
      }

      return { success: true }
    },
    onSuccess: (_data, input) => {
      const targetBoarder = input.targetBoarderId || 'bdr-101'
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-meal-selections', targetBoarder] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals-summary'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-flat-boarders'] })
    },
  })
}

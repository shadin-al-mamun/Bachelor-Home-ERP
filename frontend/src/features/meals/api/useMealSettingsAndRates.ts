import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { MealSettings, MealRate, MealSession } from '@/types/database'
import { MOCK_MEAL_SETTINGS, MOCK_ACTIVE_RATE, getStoredActiveMealRate, saveStoredActiveMealRate } from './useMeals'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface SaveMealSettingsInput {
  isMealModuleEnabled: boolean
  breakfastEnabled: boolean
  lunchEnabled: boolean
  dinnerEnabled: boolean
  cutoffTime: string // '22:00:00'
}

export interface CreateMealRateInput {
  effectiveFrom: string // YYYY-MM-DD
  breakfastRate: number
  lunchRate: number
  dinnerRate: number
}

export interface MealBillingPreviewItem {
  boarder_id: string
  boarder_name: string
  boarder_code: string
  phone_number: string
  flat_name: string
  allocation_id?: string | null
  breakfast_count: number
  lunch_count: number
  dinner_count: number
  total_meals: number // consumed meals (kept for backwards compatibility)
  consumed_meals: number
  min_meals: number
  shortfall_meals: number
  billable_meals: number
  shortfall_cost: number
  breakfast_cost: number
  lunch_cost: number
  dinner_cost: number
  total_amount: number
  already_billed: boolean
}

export interface MealBillingPreviewResponse {
  billing_month: string
  start_date: string
  end_date: string
  rates: {
    breakfast: number
    lunch: number
    dinner: number
  }
  preview_items: MealBillingPreviewItem[]
}

export interface GenerateMealChargesInput {
  billingMonth: string // YYYY-MM-01
  dueDate?: string | null
  defaultMinMeals?: number
  boarderMinOverrides?: Record<string, number>
}

export interface MealChangeAuditItem {
  id: string
  selection_id: string
  boarder_id: string
  boarder_name: string
  boarder_code: string
  flat_name: string
  meal_date: string
  session_changed: MealSession
  old_value: boolean
  new_value: boolean
  changed_by: string
  changer_name: string
  changer_role: string
  changed_at: string
  is_override: boolean
  override_reason?: string | null
}

// ==============================================================================
// Mock Data Baseline (Realistic Audit Logs & Rate Schedules)
// ==============================================================================

let MOCK_SETTINGS_STATE: MealSettings = { ...MOCK_MEAL_SETTINGS }

let MOCK_RATES_LIST: MealRate[] = []

const MOCK_AUDIT_LOGS: MealChangeAuditItem[] = [
  {
    id: 'aud-901',
    selection_id: 'ms-bdr1-2026-10-18',
    boarder_id: 'bdr-101',
    boarder_name: 'তানভীর আহমেদ',
    boarder_code: 'BDR-101',
    flat_name: 'ফ্ল্যাট ২-এ',
    meal_date: '2026-10-18',
    session_changed: 'LUNCH',
    old_value: false,
    new_value: true,
    changed_by: 'usr-bdr1',
    changer_name: 'তানভীর আহমেদ',
    changer_role: 'BOARDER',
    changed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_override: false,
    override_reason: null,
  },
  {
    id: 'aud-902',
    selection_id: 'ms-bdr2-2026-10-18',
    boarder_id: 'bdr-102',
    boarder_name: 'সাকিব আল হাসান',
    boarder_code: 'BDR-102',
    flat_name: 'ফ্ল্যাট ২-এ',
    meal_date: '2026-10-18',
    session_changed: 'DINNER',
    old_value: true,
    new_value: false,
    changed_by: 'usr-admin1',
    changer_name: 'সুপার এডমিন (ওনার)',
    changer_role: 'SUPER_ADMIN',
    changed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_override: true,
    override_reason: 'বর্ডারের অসুস্থতাজনিত কারণে রাত ১০:০০ টার পর এডমিন ওভাররাইড করা হলো।',
  },
  {
    id: 'aud-903',
    selection_id: 'ms-bdr3-2026-10-19',
    boarder_id: 'bdr-103',
    boarder_name: 'মাহমুদুল্লাহ রিয়াদ',
    boarder_code: 'BDR-103',
    flat_name: 'ফ্ল্যাট ৩-বি',
    meal_date: '2026-10-19',
    session_changed: 'BREAKFAST',
    old_value: false,
    new_value: true,
    changed_by: 'usr-bdr3',
    changer_name: 'মাহমুদুল্লাহ রিয়াদ',
    changer_role: 'BOARDER',
    changed_at: new Date(Date.now() - 86400000).toISOString(),
    is_override: false,
    override_reason: null,
  },
]

// Mock Billing Preview Data for Current Month
const MOCK_BILLING_PREVIEW: MealBillingPreviewItem[] = [
  {
    boarder_id: 'bdr-101',
    boarder_name: 'তানভীর আহমেদ',
    boarder_code: 'BDR-101',
    phone_number: '01711223344',
    flat_name: 'ফ্ল্যাট ২-এ',
    breakfast_count: 24,
    lunch_count: 28,
    dinner_count: 27,
    total_meals: 67.0, // 24*0.5 + 28*1.0 + 27*1.0 = 67.0
    consumed_meals: 67.0,
    min_meals: 45.0,
    shortfall_meals: 0.0,
    billable_meals: 67.0,
    shortfall_cost: 0.0,
    breakfast_cost: 624.0,
    lunch_cost: 1456.0,
    dinner_cost: 1404.0,
    total_amount: 3484.0,
    already_billed: false,
  },
  {
    boarder_id: 'bdr-102',
    boarder_name: 'সাকিব আল হাসান',
    boarder_code: 'BDR-102',
    phone_number: '01811998877',
    flat_name: 'ফ্ল্যাট ২-এ',
    breakfast_count: 10,
    lunch_count: 15,
    dinner_count: 10,
    total_meals: 30.0, // 10*0.5 + 15*1.0 + 10*1.0 = 30.0
    consumed_meals: 30.0,
    min_meals: 45.0,
    shortfall_meals: 15.0,
    billable_meals: 45.0,
    shortfall_cost: 780.0, // 15.0 * 52 = 780
    breakfast_cost: 260.0,
    lunch_cost: 780.0,
    dinner_cost: 520.0,
    total_amount: 2340.0, // 1560 + 780 = 2340
    already_billed: false,
  },
  {
    boarder_id: 'bdr-103',
    boarder_name: 'মাহমুদুল্লাহ রিয়াদ',
    boarder_code: 'BDR-103',
    phone_number: '01911445566',
    flat_name: 'ফ্ল্যাট ৩-বি',
    breakfast_count: 28,
    lunch_count: 30,
    dinner_count: 29,
    total_meals: 73.0, // 28*0.5 + 30*1.0 + 29*1.0 = 73.0
    consumed_meals: 73.0,
    min_meals: 45.0,
    shortfall_meals: 0.0,
    billable_meals: 73.0,
    shortfall_cost: 0.0,
    breakfast_cost: 728.0,
    lunch_cost: 1560.0,
    dinner_cost: 1508.0,
    total_amount: 3796.0,
    already_billed: true,
  },
]

// ==============================================================================
// React Query Hooks
// ==============================================================================

// 1. Fetch Rate History
export function useMealRateHistory() {
  return useQuery({
    queryKey: ['meal-rate-history'],
    queryFn: async (): Promise<MealRate[]> => {
      if (!isSupabaseConfigured) {
        const stored = getStoredActiveMealRate()
        if (stored && stored.id !== 'rate-active-default') {
          return [stored, ...MOCK_RATES_LIST.filter((r) => r.id !== stored.id)]
        }
        return MOCK_RATES_LIST
      }

      const { data, error } = await supabase
        .from('meal_rates')
        .select('*')
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('meal rates history fetch error:', error.message)
        return MOCK_RATES_LIST
      }
      return data || []
    },
    staleTime: 5000,
  })
}

// 2. Fetch Meal Change Audit Logs
export function useMealChangeAuditLogs(limit: number = 50) {
  return useQuery({
    queryKey: ['meal-change-audit-logs', limit],
    queryFn: async (): Promise<MealChangeAuditItem[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_AUDIT_LOGS
      }

      const { data, error } = await supabase
        .from('meal_change_audit')
        .select(`
          *,
          boarder:boarder_id ( full_name, boarder_code ),
          changer:changed_by ( full_name, role ),
          selection:selection_id ( flat:flat_id ( name ), is_override, override_reason )
        `)
        .order('changed_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)

      return (data || []).map((row: any) => ({
        id: row.id,
        selection_id: row.selection_id,
        boarder_id: row.boarder_id,
        boarder_name: row.boarder?.full_name || 'বর্ডার',
        boarder_code: row.boarder?.boarder_code || 'BDR',
        flat_name: row.selection?.flat?.name || 'ফ্ল্যাট',
        meal_date: row.meal_date,
        session_changed: row.session_changed,
        old_value: row.old_value,
        new_value: row.new_value,
        changed_by: row.changed_by,
        changer_name: row.changer?.full_name || 'ইউজার',
        changer_role: row.changer?.role || 'SYSTEM',
        changed_at: row.changed_at,
        is_override: row.selection?.is_override || false,
        override_reason: row.selection?.override_reason || null,
      }))
    },
  })
}

// Helper to calculate Opt-Out Monthly Meal Billing directly from Supabase tables
export async function calculateClientOptOutBillingPreview(
  targetMonth: string,
  defaultMinMeals = 45,
  boarderMinOverrides?: Record<string, number>
): Promise<MealBillingPreviewResponse> {
  const monthPrefix = targetMonth.slice(0, 7)
  const [year, month] = monthPrefix.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startDate = `${monthPrefix}-01`
  const endDate = `${monthPrefix}-${String(daysInMonth).padStart(2, '0')}`

  // Fetch all necessary data in parallel
  const [
    boardersRes,
    ratesRes,
    settingsRes,
    selectionsRes,
    guestMealsRes,
    chargesRes,
  ] = await Promise.all([
    supabase
      .from('boarders')
      .select(`
        id,
        full_name,
        boarder_code,
        phone_number,
        admission_date,
        status,
        active_allocation:allocations(
          id,
          start_date,
          end_date,
          status,
          seat:seats(
            id,
            seat_name,
            seat_code,
            room:rooms(
              id,
              name,
              flat:flats(id, name)
            )
          )
        )
      `)
      .eq('status', 'ACTIVE')
      .order('full_name', { ascending: true }),

    supabase
      .from('meal_rates')
      .select('*')
      .lte('effective_from', endDate)
      .order('effective_from', { ascending: false })
      .limit(1),

    supabase.from('meal_settings').select('*').limit(1),

    supabase
      .from('meal_selections')
      .select('*')
      .gte('meal_date', startDate)
      .lte('meal_date', endDate),

    supabase
      .from('guest_meal_bookings')
      .select('*')
      .gte('meal_date', startDate)
      .lte('meal_date', endDate)
      .eq('status', 'CONFIRMED'),

    supabase
      .from('boarder_charges')
      .select('id, boarder_id, amount, paid_amount, status')
      .eq('charge_type', 'MEAL')
      .eq('billing_month', startDate)
      .neq('status', 'VOID'),
  ])

  // Rates
  const rateItem = ratesRes.data?.[0]
  const bRate = Number(rateItem?.breakfast_rate ?? 26)
  const lRate = Number(rateItem?.lunch_rate ?? 52)
  const dRate = Number(rateItem?.dinner_rate ?? 52)

  // Settings
  const settingsItem = settingsRes.data?.[0]
  const bEnabled = settingsItem?.breakfast_enabled ?? true
  const lEnabled = settingsItem?.lunch_enabled ?? true
  const dEnabled = settingsItem?.dinner_enabled ?? true

  // Fast lookup maps
  const selMap = new Map<string, any>()
  ;(selectionsRes.data || []).forEach((s: any) => {
    selMap.set(`${s.boarder_id}_${s.meal_date}`, s)
  })

  const guestMap = new Map<string, any[]>()
  ;(guestMealsRes.data || []).forEach((g: any) => {
    const list = guestMap.get(g.boarder_id) || []
    list.push(g)
    guestMap.set(g.boarder_id, list)
  })

  const chargeMap = new Map<string, any>()
  ;(chargesRes.data || []).forEach((c: any) => {
    chargeMap.set(c.boarder_id, c)
  })

  const previewItems: MealBillingPreviewItem[] = []

  const boardersList = boardersRes.data || []
  for (const b of boardersList) {
    const activeAlloc = Array.isArray(b.active_allocation)
      ? b.active_allocation.find((a: any) => a.status === 'ACTIVE') || b.active_allocation[0]
      : b.active_allocation

    const seatObj = Array.isArray((activeAlloc as any)?.seat)
      ? (activeAlloc as any).seat[0]
      : (activeAlloc as any)?.seat
    const roomObj = Array.isArray(seatObj?.room) ? seatObj.room[0] : seatObj?.room
    const flatObj = Array.isArray(roomObj?.flat) ? roomObj.flat[0] : roomObj?.flat

    const flatName = flatObj?.name || roomObj?.name || 'অনির্ধারিত'

    const admitDate = b.admission_date || activeAlloc?.start_date || startDate
    const allocEndDate = (activeAlloc as any)?.end_date

    // Effective meal dates in this month
    const effectiveStart = admitDate > startDate ? admitDate : startDate
    const effectiveEnd = allocEndDate && allocEndDate < endDate ? allocEndDate : endDate

    let bCount = 0
    let lCount = 0
    let dCount = 0

    if (effectiveStart <= endDate && (!allocEndDate || effectiveStart <= allocEndDate)) {
      const [stY, stM, stD] = effectiveStart.split('-').map(Number)
      const [, , enD] = effectiveEnd.split('-').map(Number)

      for (let day = stD; day <= enD; day++) {
        const dStr = `${stY}-${String(stM).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const sel = selMap.get(`${b.id}_${dStr}`)

        if (sel) {
          if (sel.breakfast && bEnabled) bCount++
          if (sel.lunch && lEnabled) lCount++
          if (sel.dinner && dEnabled) dCount++
        } else {
          // In an Opt-Out mess policy: unrecorded days default to TRUE!
          if (bEnabled) bCount++
          if (lEnabled) lCount++
          if (dEnabled) dCount++
        }
      }
    }

    // Add guest meals for this boarder
    let guestAmount = 0
    const bdrGuestBookings = guestMap.get(b.id) || []
    bdrGuestBookings.forEach((gb: any) => {
      const count = Number(gb.guest_count) || 1
      const sess = String(gb.session).toUpperCase()
      if (sess === 'BREAKFAST') bCount += count
      if (sess === 'LUNCH') lCount += count
      if (sess === 'DINNER') dCount += count
      guestAmount += Number(gb.total_amount) || count * (sess === 'BREAKFAST' ? bRate : sess === 'LUNCH' ? lRate : dRate)
    })

    const bCost = Math.round(bCount * bRate * 100) / 100
    const lCost = Math.round(lCount * lRate * 100) / 100
    const dCost = Math.round(dCount * dRate * 100) / 100

    // Meal calculation: Breakfast = 0.5, Lunch = 1.0, Dinner = 1.0 (Daily = 2.5 meals)
    const consumedMeals = Math.round(((bCount * 0.5) + (lCount * 1.0) + (dCount * 1.0)) * 10) / 10

    // Per-boarder minimum meal policy (default 45.0 or admin override)
    const minMeals = boarderMinOverrides?.[b.id] !== undefined
      ? Number(boarderMinOverrides[b.id])
      : Number(settingsItem?.min_monthly_meals ?? defaultMinMeals)

    const shortfallMeals = Math.max(0, Math.round((minMeals - consumedMeals) * 10) / 10)
    const billableMeals = Math.round((consumedMeals + shortfallMeals) * 10) / 10

    // Shortfall cost at standard meal rate (lunch rate)
    const shortfallCost = Math.round(shortfallMeals * lRate * 100) / 100
    const totalAmount = Math.round((bCost + lCost + dCost + guestAmount + shortfallCost) * 100) / 100

    const existingCharge = chargeMap.get(b.id)

    previewItems.push({
      boarder_id: b.id,
      boarder_name: b.full_name,
      boarder_code: b.boarder_code,
      phone_number: b.phone_number,
      flat_name: flatName,
      allocation_id: activeAlloc?.id || null,
      breakfast_count: bCount,
      lunch_count: lCount,
      dinner_count: dCount,
      total_meals: consumedMeals,
      consumed_meals: consumedMeals,
      min_meals: minMeals,
      shortfall_meals: shortfallMeals,
      billable_meals: billableMeals,
      shortfall_cost: shortfallCost,
      breakfast_cost: bCost,
      lunch_cost: lCost,
      dinner_cost: dCost,
      total_amount: totalAmount,
      already_billed: Boolean(existingCharge),
    })
  }

  return {
    billing_month: startDate,
    start_date: startDate,
    end_date: endDate,
    rates: {
      breakfast: bRate,
      lunch: lRate,
      dinner: dRate,
    },
    preview_items: previewItems,
  }
}

// 3. Fetch Monthly Meal Billing Preview
export function useMonthlyMealBillingPreview(
  billingMonth?: string,
  defaultMinMeals = 45,
  boarderMinOverrides?: Record<string, number>
) {
  const targetMonth = billingMonth || new Date().toISOString().slice(0, 7) + '-01'

  return useQuery({
    queryKey: ['monthly-meal-billing-preview', targetMonth, defaultMinMeals, boarderMinOverrides],
    queryFn: async (): Promise<MealBillingPreviewResponse> => {
      if (!isSupabaseConfigured) {
        const previewItems = MOCK_BILLING_PREVIEW.map((item) => {
          const minMeals = boarderMinOverrides?.[item.boarder_id] !== undefined
            ? Number(boarderMinOverrides[item.boarder_id])
            : defaultMinMeals
          const shortfallMeals = Math.max(0, Math.round((minMeals - item.consumed_meals) * 10) / 10)
          const billableMeals = Math.round((item.consumed_meals + shortfallMeals) * 10) / 10
          const shortfallCost = Math.round(shortfallMeals * MOCK_ACTIVE_RATE.lunch_rate * 100) / 100
          const baseCost = item.breakfast_cost + item.lunch_cost + item.dinner_cost
          const totalAmount = Math.round((baseCost + shortfallCost) * 100) / 100

          return {
            ...item,
            min_meals: minMeals,
            shortfall_meals: shortfallMeals,
            billable_meals: billableMeals,
            shortfall_cost: shortfallCost,
            total_amount: totalAmount,
          }
        })

        return {
          billing_month: targetMonth,
          start_date: targetMonth,
          end_date: targetMonth.slice(0, 7) + '-31',
          rates: {
            breakfast: MOCK_ACTIVE_RATE.breakfast_rate,
            lunch: MOCK_ACTIVE_RATE.lunch_rate,
            dinner: MOCK_ACTIVE_RATE.dinner_rate,
          },
          preview_items: previewItems,
        }
      }

      try {
        // Attempt database RPC first
        const { data, error } = await supabase.rpc(
          'fn_get_monthly_meal_billing_preview',
          {
            p_billing_month: targetMonth,
            p_default_min_meals: defaultMinMeals,
            p_boarder_min_overrides: boarderMinOverrides || {},
          }
        )

        // Check if database RPC returned valid data
        if (!error && data?.preview_items && Array.isArray(data.preview_items)) {
          const totalAllMeals = data.preview_items.reduce(
            (sum: number, item: any) => sum + (Number(item.billable_meals || item.total_meals) || 0),
            0
          )
          // If total meals across all residents is reasonable for an Opt-Out mess, use RPC result
          if (data.preview_items.length === 0 || totalAllMeals > 15) {
            return data
          }
        }
      } catch (err) {
        console.warn('RPC fn_get_monthly_meal_billing_preview error, falling back to client calculation:', err)
      }

      // Resilient fallback: calculate using real tables directly with Opt-Out mess logic and minimum meals
      return await calculateClientOptOutBillingPreview(targetMonth, defaultMinMeals, boarderMinOverrides)
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

// 1. Save Meal Settings
export function useSaveMealSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SaveMealSettingsInput) => {
      if (!isSupabaseConfigured) {
        MOCK_SETTINGS_STATE = {
          ...MOCK_SETTINGS_STATE,
          is_meal_module_enabled: input.isMealModuleEnabled,
          breakfast_enabled: input.breakfastEnabled,
          lunch_enabled: input.lunchEnabled,
          dinner_enabled: input.dinnerEnabled,
          cutoff_time: input.cutoffTime,
          updated_at: new Date().toISOString(),
        }
        return { success: true, message: 'সেটিংস সংরক্ষিত হয়েছে।' }
      }

      const { data, error } = await supabase.rpc('fn_save_meal_settings', {
        p_is_meal_module_enabled: input.isMealModuleEnabled,
        p_breakfast_enabled: input.breakfastEnabled,
        p_lunch_enabled: input.lunchEnabled,
        p_dinner_enabled: input.dinnerEnabled,
        p_cutoff_time: input.cutoffTime,
      })

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-settings'] })
    },
  })
}

// 2. Create Meal Rate Schedule
export function useCreateMealRateMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateMealRateInput) => {
      // 1. In-memory sync for mock and instantaneous UI responsiveness
      MOCK_ACTIVE_RATE.breakfast_rate = input.breakfastRate
      MOCK_ACTIVE_RATE.lunch_rate = input.lunchRate
      MOCK_ACTIVE_RATE.dinner_rate = input.dinnerRate
      MOCK_ACTIVE_RATE.effective_from = input.effectiveFrom

      const mockItem: MealRate = {
        id: `rate-${Date.now()}`,
        effective_from: input.effectiveFrom,
        effective_to: null,
        breakfast_rate: input.breakfastRate,
        lunch_rate: input.lunchRate,
        dinner_rate: input.dinnerRate,
        created_by: 'usr-admin1',
        created_at: new Date().toISOString(),
      }
      saveStoredActiveMealRate(mockItem)
      MOCK_RATES_LIST = [mockItem, ...MOCK_RATES_LIST.filter((r) => r.effective_from !== input.effectiveFrom)]

      if (!isSupabaseConfigured) {
        return { success: true, message: 'নতুন মিল রেট সফলভাবে কার্যকর হয়েছে।' }
      }

      // 2. Execute database RPC
      let rpcSuccess = false
      let rpcResult: any = null

      try {
        const { data, error } = await supabase.rpc('fn_create_meal_rate', {
          p_effective_from: input.effectiveFrom,
          p_breakfast_rate: input.breakfastRate,
          p_lunch_rate: input.lunchRate,
          p_dinner_rate: input.dinnerRate,
        })
        if (!error) {
          rpcSuccess = true
          rpcResult = data
        } else {
          console.warn('fn_create_meal_rate RPC warning, attempting table fallback:', error.message)
        }
      } catch (err) {
        console.warn('fn_create_meal_rate call exception:', err)
      }

      // 3. Resilient Direct Table Upsert Fallback if RPC failed or permissions restricted
      if (!rpcSuccess) {
        // Close prior open-ended rate schedules
        await supabase
          .from('meal_rates')
          .update({
            effective_to: new Date(new Date(input.effectiveFrom).getTime() - 86400000)
              .toISOString()
              .slice(0, 10),
          })
          .is('effective_to', null)
          .lt('effective_from', input.effectiveFrom)

        // Check if rate already exists starting on this exact date
        const { data: existingRate } = await supabase
          .from('meal_rates')
          .select('id')
          .eq('effective_from', input.effectiveFrom)
          .maybeSingle()

        if (existingRate?.id) {
          const { error: updErr } = await supabase
            .from('meal_rates')
            .update({
              breakfast_rate: input.breakfastRate,
              lunch_rate: input.lunchRate,
              dinner_rate: input.dinnerRate,
              effective_to: null,
              created_at: new Date().toISOString(),
            })
            .eq('id', existingRate.id)

          if (updErr) throw new Error(updErr.message)
        } else {
          const { error: insErr } = await supabase
            .from('meal_rates')
            .insert({
              effective_from: input.effectiveFrom,
              effective_to: null,
              breakfast_rate: input.breakfastRate,
              lunch_rate: input.lunchRate,
              dinner_rate: input.dinnerRate,
              created_at: new Date().toISOString(),
            })

          if (insErr) throw new Error(insErr.message)
        }
      }

      return rpcResult || { success: true, message: 'নতুন মিল রেট সফলভাবে কার্যকর হয়েছে।' }
    },
    onSuccess: (_data, variables) => {
      // Instantly prime the cache with the new active rate so every card updates immediately!
      const updatedRate: MealRate = {
        id: `rate-${Date.now()}`,
        effective_from: variables.effectiveFrom,
        effective_to: null,
        breakfast_rate: variables.breakfastRate,
        lunch_rate: variables.lunchRate,
        dinner_rate: variables.dinnerRate,
        created_at: new Date().toISOString(),
      }

      saveStoredActiveMealRate(updatedRate)
      queryClient.setQueryData(['active-meal-rate'], updatedRate)
      queryClient.setQueryData(['meal-rate-history'], (old: any) => {
        if (!Array.isArray(old)) return [updatedRate]
        return [updatedRate, ...old.filter((r: any) => r.effective_from !== variables.effectiveFrom)]
      })

      queryClient.invalidateQueries({ queryKey: ['active-meal-rate'] })
      queryClient.invalidateQueries({ queryKey: ['meal-rate-history'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals-summary'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

// 3. Generate Monthly Meal Charges
export function useGenerateMonthlyMealChargesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GenerateMealChargesInput) => {
      if (!isSupabaseConfigured) {
        MOCK_BILLING_PREVIEW.forEach((b) => {
          b.already_billed = true
        })
        return {
          success: true,
          billing_month: input.billingMonth,
          generated: 2,
          skipped: 1,
          total_amount_billed: 7800.0,
          message: 'মাসিক খাবার বিল সফলভাবে জেনারেট সম্পন্ন হয়েছে।',
        }
      }

      let rpcData: any = null
      let rpcFailed = false

      try {
        const { data, error } = await supabase.rpc('fn_generate_monthly_meal_charges', {
          p_billing_month: input.billingMonth,
          p_due_date: input.dueDate || null,
          p_default_min_meals: input.defaultMinMeals ?? 45,
          p_boarder_min_overrides: input.boarderMinOverrides || {},
        })
        if (error) {
          rpcFailed = true
        } else {
          rpcData = data
        }
      } catch {
        rpcFailed = true
      }

      // If database RPC succeeded and generated charges, return RPC result
      if (!rpcFailed && rpcData && rpcData.generated > 0) {
        return rpcData
      }

      // Fallback: If RPC generated 0 or failed, generate/update charges directly
      const preview = await calculateClientOptOutBillingPreview(
        input.billingMonth,
        input.defaultMinMeals ?? 45,
        input.boarderMinOverrides
      )
      const startDate = preview.start_date
      let generatedCount = 0
      let totalAmountBilled = 0

      const { data: existingCharges } = await supabase
        .from('boarder_charges')
        .select('id, boarder_id, status, paid_amount')
        .eq('charge_type', 'MEAL')
        .eq('billing_month', startDate)
        .neq('status', 'VOID')

      const existingMap = new Map((existingCharges || []).map((c: any) => [c.boarder_id, c]))

      for (const item of preview.preview_items) {
        if (item.total_amount <= 0) continue

        const existing: any = existingMap.get(item.boarder_id)
        const shortfallText = item.shortfall_meals > 0 ? `, শর্টফল: ${item.shortfall_meals}টি` : ''
        const desc = `মাসিক খাবার বিল (${startDate.slice(0, 7)}) — বিলযোগ্য: ${item.billable_meals}টি মিল (গৃহীত: ${item.consumed_meals}টি${shortfallText}; নাস্তা: ${item.breakfast_count}, দুপুর: ${item.lunch_count}, রাত: ${item.dinner_count})`

        if (existing) {
          if (existing.status === 'UNPAID' && Number(existing.paid_amount || 0) === 0) {
            await supabase
              .from('boarder_charges')
              .update({
                amount: item.total_amount,
                due_amount: item.total_amount,
                description: desc,
                due_date: input.dueDate || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id)

            generatedCount++
            totalAmountBilled += item.total_amount
          }
        } else {
          await supabase.from('boarder_charges').insert({
            boarder_id: item.boarder_id,
            allocation_id: item.allocation_id || null,
            charge_type: 'MEAL',
            billing_month: startDate,
            amount: item.total_amount,
            paid_amount: 0.0,
            due_amount: item.total_amount,
            status: 'UNPAID',
            due_date: input.dueDate || null,
            description: desc,
          })

          generatedCount++
          totalAmountBilled += item.total_amount
        }
      }

      return {
        success: true,
        billing_month: startDate,
        generated: generatedCount,
        skipped: preview.preview_items.length - generatedCount,
        total_amount_billed: totalAmountBilled,
        message: `মাসিক খাবার বিল সম্পন্ন: ${generatedCount} টি বিল তৈরি বা আপডেট হয়েছে (মোট ৳${totalAmountBilled.toLocaleString('en-IN')})।`,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-meal-billing-preview'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-detail-meal-selections'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

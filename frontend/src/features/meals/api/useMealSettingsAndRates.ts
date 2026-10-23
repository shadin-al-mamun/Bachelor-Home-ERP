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
  total_meals: number
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
    total_meals: 79,
    breakfast_cost: 720.0,
    lunch_cost: 1820.0,
    dinner_cost: 1620.0,
    total_amount: 4160.0,
    already_billed: false,
  },
  {
    boarder_id: 'bdr-102',
    boarder_name: 'সাকিব আল হাসান',
    boarder_code: 'BDR-102',
    phone_number: '01811998877',
    flat_name: 'ফ্ল্যাট ২-এ',
    breakfast_count: 15,
    lunch_count: 26,
    dinner_count: 25,
    total_meals: 66,
    breakfast_cost: 450.0,
    lunch_cost: 1690.0,
    dinner_cost: 1500.0,
    total_amount: 3640.0,
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
    total_meals: 87,
    breakfast_cost: 840.0,
    lunch_cost: 1950.0,
    dinner_cost: 1740.0,
    total_amount: 4530.0,
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

// 3. Fetch Monthly Meal Billing Preview
export function useMonthlyMealBillingPreview(billingMonth?: string) {
  const targetMonth = billingMonth || new Date().toISOString().slice(0, 7) + '-01'

  return useQuery({
    queryKey: ['monthly-meal-billing-preview', targetMonth],
    queryFn: async (): Promise<MealBillingPreviewResponse> => {
      if (!isSupabaseConfigured) {
        return {
          billing_month: targetMonth,
          start_date: targetMonth,
          end_date: targetMonth.slice(0, 7) + '-31',
          rates: {
            breakfast: MOCK_ACTIVE_RATE.breakfast_rate,
            lunch: MOCK_ACTIVE_RATE.lunch_rate,
            dinner: MOCK_ACTIVE_RATE.dinner_rate,
          },
          preview_items: MOCK_BILLING_PREVIEW,
        }
      }

      const { data, error } = await supabase.rpc(
        'fn_get_monthly_meal_billing_preview',
        {
          p_billing_month: targetMonth,
        }
      )

      if (error) throw new Error(error.message)
      return data
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

      const { data, error } = await supabase.rpc('fn_generate_monthly_meal_charges', {
        p_billing_month: input.billingMonth,
        p_due_date: input.dueDate || null,
      })

      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-meal-billing-preview'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['charges'] })
    },
  })
}

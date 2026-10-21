import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { BoarderCharge, ChargeType } from '@/types/database'

// ==============================================================================
// Mock Data for Boarder Dues Summary (mirrors vw_boarder_dues_summary)
// ==============================================================================

export interface BoarderDueSummary {
  boarder_id: string
  boarder_code: string
  full_name: string
  phone_number: string
  photo_url?: string | null
  flat_code?: string
  flat_name?: string
  seat_code?: string
  seat_name?: string
  total_billed: number
  total_paid: number
  outstanding_due: number
  overdue_amount: number
  last_payment_date?: string | null
}


const MOCK_DUES_SUMMARY: BoarderDueSummary[] = []
const MOCK_CHARGES: BoarderCharge[] = []

// ==============================================================================
// Hooks
// ==============================================================================

export interface DuesFilters {
  search?: string
  flatCode?: string
  overdueOnly?: boolean
}

export function useBoarderDuesSummary(filters?: DuesFilters) {
  return useQuery({
    queryKey: ['boarder-dues', filters],
    queryFn: async (): Promise<BoarderDueSummary[]> => {
      if (!isSupabaseConfigured) {
        let result = [...MOCK_DUES_SUMMARY]
        if (filters?.search?.trim()) {
          const q = filters.search.toLowerCase()
          result = result.filter(
            (d) =>
              d.full_name.toLowerCase().includes(q) ||
              d.phone_number.includes(q) ||
              d.boarder_code.toLowerCase().includes(q)
          )
        }
        if (filters?.flatCode && filters.flatCode !== 'ALL') {
          result = result.filter((d) => d.flat_code === filters.flatCode)
        }
        if (filters?.overdueOnly) {
          result = result.filter((d) => d.overdue_amount > 0)
        }
        return result
      }

      const { data, error } = await supabase
        .from('vw_boarder_dues_summary')
        .select('*')
        .order('outstanding_due', { ascending: false })

      if (error) {
        console.warn('vw_boarder_dues_summary fetch failed:', error.message)
        return []
      }

      let list = (data || []) as BoarderDueSummary[]
      if (filters?.search?.trim()) {
        const q = filters.search.toLowerCase()
        list = list.filter(
          (d) =>
            d.full_name?.toLowerCase().includes(q) ||
            d.phone_number?.includes(q) ||
            d.boarder_code?.toLowerCase().includes(q)
        )
      }
      if (filters?.flatCode && filters.flatCode !== 'ALL') {
        list = list.filter((d) => d.flat_code === filters.flatCode)
      }
      if (filters?.overdueOnly) {
        list = list.filter((d) => Number(d.overdue_amount) > 0)
      }
      return list
    },
  })
}

export function useBoarderCharges(boarderId?: string) {
  return useQuery({
    queryKey: ['boarder-charges', boarderId],
    enabled: Boolean(boarderId),
    queryFn: async (): Promise<BoarderCharge[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_CHARGES.filter((c) => c.boarder_id === boarderId)
      }

      const { data, error } = await supabase
        .from('boarder_charges')
        .select('*')
        .eq('boarder_id', boarderId!)
        .order('billing_month', { ascending: false })

      if (error) {
        console.warn('boarder_charges fetch failed:', error.message)
        return []
      }
      return (data || []) as BoarderCharge[]
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

export interface GenerateMonthlyChargesParams {
  billingMonth: string // e.g. '2026-11-01'
  dueDate: string // e.g. '2026-11-10'
}

export function useGenerateMonthlyCharges() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: GenerateMonthlyChargesParams) => {
      if (!isSupabaseConfigured) {
        // Mock: add some charges
        const newCharge: BoarderCharge = {
          id: `ch-gen-${Date.now()}`,
          boarder_id: 'b-102',
          charge_type: 'RENT',
          billing_month: params.billingMonth,
          amount: 4200,
          paid_amount: 0,
          due_amount: 4200,
          status: 'UNPAID',
          due_date: params.dueDate,
          description: `${params.billingMonth} মাসিক সিট ভাড়া (ব্যাচ জেনারেটেড)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        MOCK_CHARGES.push(newCharge)
        return { generated: 2, skipped: 0 }
      }

      // Call RPC to batch generate (or manual INSERT logic)
      const { data, error } = await supabase.rpc('fn_generate_monthly_rent_charges', {
        p_billing_month: params.billingMonth,
        p_due_date: params.dueDate,
      })

      if (error) throw new Error(error.message || 'মাসিক ভাড়া চার্জ তৈরিতে সমস্যা হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
    },
  })
}

export interface AddManualChargeParams {
  boarderId: string
  chargeType: ChargeType
  billingMonth: string
  amount: number
  dueDate: string
  description: string
}

export function useAddManualCharge() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: AddManualChargeParams) => {
      if (!isSupabaseConfigured) {
        const newCharge: BoarderCharge = {
          id: `ch-manual-${Date.now()}`,
          boarder_id: params.boarderId,
          charge_type: params.chargeType,
          billing_month: params.billingMonth,
          amount: params.amount,
          paid_amount: 0,
          due_amount: params.amount,
          status: 'UNPAID',
          due_date: params.dueDate,
          description: params.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        MOCK_CHARGES.push(newCharge)
        return { success: true, charge: newCharge }
      }

      const { data, error } = await supabase
        .from('boarder_charges')
        .insert({
          boarder_id: params.boarderId,
          charge_type: params.chargeType,
          billing_month: params.billingMonth,
          amount: params.amount,
          due_date: params.dueDate,
          description: params.description,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single()

      if (error) throw new Error(error.message || 'ম্যানুয়াল চার্জ তৈরিতে সমস্যা হয়েছে।')
      return { success: true, charge: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
    },
  })
}

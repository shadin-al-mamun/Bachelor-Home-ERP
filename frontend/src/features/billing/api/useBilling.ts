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


const MOCK_DUES_SUMMARY: BoarderDueSummary[] = [
  {
    boarder_id: 'b-101',
    boarder_code: 'BDR-2026-001',
    full_name: 'তানভীর আহমেদ',
    phone_number: '01711223344',
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    flat_code: 'FLAT-4A',
    flat_name: 'ফ্ল্যাট ৪এ',
    seat_code: '4A-101A',
    total_billed: 13500,
    total_paid: 13500,
    outstanding_due: 0,
    overdue_amount: 0,
    last_payment_date: '2026-10-05',
  },
  {
    boarder_id: 'b-102',
    boarder_code: 'BDR-2026-002',
    full_name: 'রাকিবুল হাসান',
    phone_number: '01912345678',
    photo_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    flat_code: 'FLAT-4A',
    flat_name: 'ফ্ল্যাট ৪এ',
    seat_code: '4A-101B',
    total_billed: 12600,
    total_paid: 8400,
    outstanding_due: 4200,
    overdue_amount: 4200,
    last_payment_date: '2026-09-08',
  },
]

const MOCK_CHARGES: BoarderCharge[] = [
  {
    id: 'ch-1',
    boarder_id: 'b-101',
    charge_type: 'RENT',
    billing_month: '2026-10-01',
    amount: 4500,
    paid_amount: 4500,
    due_amount: 0,
    status: 'PAID',
    due_date: '2026-10-10',
    description: 'অক্টোবর ২০২৬ মাসিক সিট ভাড়া',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-05T10:00:00Z',
  },
  {
    id: 'ch-3',
    boarder_id: 'b-102',
    charge_type: 'RENT',
    billing_month: '2026-10-01',
    amount: 4200,
    paid_amount: 0,
    due_amount: 4200,
    status: 'UNPAID',
    due_date: '2026-10-10',
    description: 'অক্টোবর ২০২৬ মাসিক সিট ভাড়া',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
]

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
        return MOCK_DUES_SUMMARY
      }
      return (data || []) as BoarderDueSummary[]
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
        return MOCK_CHARGES.filter((c) => c.boarder_id === boarderId)
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

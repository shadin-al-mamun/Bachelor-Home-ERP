import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type {
  Receipt,
  PaymentMethod,
  FinancialAccount,
  BoarderCharge,
} from '@/types/database'

// ==============================================================================
// Mock Data for Receipts & Accounts
// ==============================================================================

export interface ExtendedReceipt extends Receipt {
  boarder_name: string
  boarder_code: string
  boarder_phone?: string
  seat_code?: string
  flat_name?: string
  collector_name: string
  account_name: string
  allocations?: {
    charge_id: string
    charge_type: string
    billing_month: string
    description?: string
    amount: number
  }[]
}

export const DEFAULT_BILLING_HEADS: import('@/types/database').BillingHead[] = [
  { id: 'bh-1', code: 'SEAT_RENT', name_bn: 'সিট ভাড়া', name_en: 'Seat Rent', category: 'RENT', description: 'মাসিক নির্ধারিত রুম ও সিট ভাড়া', is_active: true, display_order: 1, created_at: '', updated_at: '' },
  { id: 'bh-2', code: 'MEAL_BILL', name_bn: 'খাবার বিল', name_en: 'Meal Bill', category: 'MEAL', description: 'মাসিক খাবার চার্জ', is_active: true, display_order: 2, created_at: '', updated_at: '' },
  { id: 'bh-3', code: 'MISC_BILL', name_bn: 'বিবিধ বিল', name_en: 'Miscellaneous Bill', category: 'MISC', description: 'ফ্ল্যাটভিত্তিক আনুপাতিক বিল', is_active: true, display_order: 3, created_at: '', updated_at: '' },
  { id: 'bh-4', code: 'ADVANCE', name_bn: 'অগ্রিম', name_en: 'Advance', category: 'ADVANCE', description: 'ভবিষ্যত মাসের জন্য অগ্রিম জমা', is_active: true, display_order: 4, created_at: '', updated_at: '' },
  { id: 'bh-5', code: 'SERVICE_CHARGE', name_bn: 'এককালীন সার্ভিস চার্জ', name_en: 'One-time Service Charge', category: 'SERVICE_CHARGE', description: 'হোস্টেল ভর্তি বা সিট বরাদ্দকালীন এককালীন ফি', is_active: true, display_order: 5, created_at: '', updated_at: '' },
  { id: 'bh-6', code: 'OTHER_BILL', name_bn: 'অন্যান্য বোর্ডার বিল', name_en: 'Other Border Bill', category: 'OTHER', description: 'বিলম্ব জরিমানা বা অন্যান্য বোর্ডার সার্ভিস বিল', is_active: true, display_order: 6, created_at: '', updated_at: '' },
]

export function useBillingHeads() {
  return useQuery({
    queryKey: ['billing-heads'],
    queryFn: async (): Promise<import('@/types/database').BillingHead[]> => {
      if (!isSupabaseConfigured) {
        return DEFAULT_BILLING_HEADS
      }
      try {
        const { data, error } = await supabase
          .from('billing_heads')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

        if (error || !data || data.length === 0) {
          return DEFAULT_BILLING_HEADS
        }
        return data as import('@/types/database').BillingHead[]
      } catch {
        return DEFAULT_BILLING_HEADS
      }
    },
  })
}

const MOCK_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'fa-1',
    account_name: 'Hostel Main Account (মেইন একাউন্ট)',
    account_type: 'CASH_OWNER',
    account_number: 'MAIN-VAULT-01',
    bank_name: 'হোস্টেল সেন্ট্রাল ক্যাশ ভল্ট',
    opening_balance: 0,
    current_balance: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'fa-2',
    account_name: 'Manager Account (ম্যানেজার ক্যাশ)',
    account_type: 'CASH_MANAGER',
    account_number: 'MGR-CASH-01',
    bank_name: 'ম্যানেজার শিফট ড্রয়ার',
    opening_balance: 0,
    current_balance: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'fa-3',
    account_name: 'Admin Account (এডমিন একাউন্ট)',
    account_type: 'BANK',
    account_number: 'ADM-BANK-01',
    bank_name: 'Dutch-Bangla Bank PLC',
    opening_balance: 0,
    current_balance: 0,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
]

// Test financial transaction data reset for fresh baseline as instructed by user
let MOCK_RECEIPTS: ExtendedReceipt[] = []

// ==============================================================================
// Hooks
// ==============================================================================

export interface ReceiptFilters {
  search?: string
  status?: 'ALL' | 'VALID' | 'VOID'
  boarderId?: string
  paymentMethod?: PaymentMethod | 'ALL'
}

export function useReceipts(filters?: ReceiptFilters) {
  return useQuery({
    queryKey: ['receipts', filters],
    queryFn: async (): Promise<ExtendedReceipt[]> => {
      if (!isSupabaseConfigured) {
        let result = [...MOCK_RECEIPTS]
        if (filters?.status === 'VALID') {
          result = result.filter((r) => !r.is_void)
        } else if (filters?.status === 'VOID') {
          result = result.filter((r) => r.is_void)
        }
        if (filters?.boarderId) {
          result = result.filter((r) => r.boarder_id === filters.boarderId)
        }
        if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
          result = result.filter((r) => r.payment_method === filters.paymentMethod)
        }
        if (filters?.search?.trim()) {
          const q = filters.search.toLowerCase()
          result = result.filter(
            (r) =>
              r.receipt_number.toLowerCase().includes(q) ||
              r.boarder_name.toLowerCase().includes(q) ||
              r.boarder_code.toLowerCase().includes(q) ||
              (r.transaction_reference && r.transaction_reference.toLowerCase().includes(q))
          )
        }
        return result
      }

      let query = supabase
        .from('receipts')
        .select(`
          *,
          boarder:boarders (full_name, boarder_code, phone_number),
          destination_account:financial_accounts (account_name),
          receipt_allocations (
            allocated_amount,
            charge:boarder_charges (id, charge_type, billing_month, description)
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.status === 'VALID') {
        query = query.eq('is_void', false)
      } else if (filters?.status === 'VOID') {
        query = query.eq('is_void', true)
      }
      if (filters?.boarderId) {
        query = query.eq('boarder_id', filters.boarderId)
      }
      if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
        query = query.eq('payment_method', filters.paymentMethod)
      }

      const { data, error } = await query
      if (error) {
        console.warn('Failed to fetch receipts from Supabase:', error.message)
        return []
      }

      return (data || []).map((r: any) => ({
        ...r,
        boarder_name: r.boarder?.full_name || 'অজানা বর্ডার',
        boarder_code: r.boarder?.boarder_code || '',
        boarder_phone: r.boarder?.phone_number || '',
        collector_name: 'ম্যানেজার',
        account_name: r.destination_account?.account_name || 'ক্যাশ একাউন্ট',
        allocations: (r.receipt_allocations || []).map((ra: any) => ({
          charge_id: ra.charge?.id,
          charge_type: ra.charge?.charge_type,
          billing_month: ra.charge?.billing_month,
          description: ra.charge?.description,
          amount: ra.allocated_amount,
        })),
      })) as ExtendedReceipt[]
    },
  })
}

export function useFinancialAccounts() {
  return useQuery({
    queryKey: ['financial-accounts'],
    queryFn: async (): Promise<FinancialAccount[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_ACCOUNTS
      }

      try {
        const { data, error } = await supabase
          .from('financial_accounts')
          .select('*')
          .eq('is_active', true)
          .order('account_type', { ascending: true })

        if (!error && Array.isArray(data) && data.length > 0) {
          return data as FinancialAccount[]
        }

        // Auto-seed default accounts into database if table is empty
        if (!error && (!data || data.length === 0)) {
          const defaultAccounts = [
            {
              account_name: 'মেইন ক্যাশ নিরাপদ ভল্ট (Main Cash)',
              account_type: 'CASH_OWNER',
              account_number: 'CASH-VAULT-01',
              bank_name: 'হোস্টেল মেইন ক্যাশ',
              current_balance: 0,
              is_active: true,
            },
            {
              account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
              account_type: 'MFS',
              account_number: '01712394767',
              bank_name: 'bKash',
              current_balance: 0,
              is_active: true,
            },
            {
              account_name: 'ব্যাংক অপারেটিং একাউন্ট (Hostel Bank)',
              account_type: 'BANK',
              account_number: '205012345678',
              bank_name: 'Islami Bank Bangladesh PLC',
              current_balance: 0,
              is_active: true,
            },
            {
              account_name: 'ম্যানেজার ক্যাশ ড্রয়ার (Manager Cash)',
              account_type: 'CASH_MANAGER',
              account_number: 'DRAWER-01',
              bank_name: 'ম্যানেজার ক্যাশ',
              current_balance: 0,
              is_active: true,
            },
          ]

          const { data: seededData } = await supabase
            .from('financial_accounts')
            .insert(defaultAccounts)
            .select('*')

          if (seededData && seededData.length > 0) {
            return seededData as FinancialAccount[]
          }
        }
      } catch (err) {
        console.warn('financial_accounts query failed, using baseline accounts:', err)
      }

      // Safe baseline fallback so receipt collection is never blocked
      return MOCK_ACCOUNTS
    },
  })
}

export function useUnpaidCharges(boarderId?: string) {
  return useQuery({
    queryKey: ['unpaid-charges', boarderId],
    enabled: Boolean(boarderId),
    queryFn: async (): Promise<BoarderCharge[]> => {
      if (!isSupabaseConfigured) {
        return [
          {
            id: 'ch-3',
            boarder_id: boarderId || 'b-102',
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
      }

      const { data, error } = await supabase
        .from('boarder_charges')
        .select('*')
        .eq('boarder_id', boarderId!)
        .in('status', ['UNPAID', 'PARTIALLY_PAID'])
        .order('due_date', { ascending: true })

      if (error) {
        console.warn('unpaid charges fetch failed:', error.message)
        return []
      }
      return (data || []) as BoarderCharge[]
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

export interface UnifiedCollectionItem {
  head_code: string
  head_name: string
  amount: number
  billing_month?: string
  description?: string
}

export interface RecordReceiptParams {
  boarderId: string
  destinationAccountId: string
  paymentMethod: PaymentMethod
  amount?: number
  collectionDate?: string
  reference?: string
  remarks?: string
  items?: UnifiedCollectionItem[]
  allocations?: {
    charge_id: string
    amount: number
  }[]
}

export function useRecordReceiptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: RecordReceiptParams) => {
      const items = params.items && params.items.length > 0 ? params.items : [
        {
          head_code: 'SEAT_RENT',
          head_name: 'সিট ভাড়া',
          amount: params.amount || 0,
          billing_month: new Date().toISOString().slice(0, 7) + '-01',
          description: params.remarks || 'নিয়মিত ভাড়া',
        }
      ]
      const totalAmount = params.amount || items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

      if (totalAmount <= 0) {
        throw new Error('মোট আদায়ের পরিমাণ অবশ্যই ০ টাকার বেশি হতে হবে।')
      }

      if (!isSupabaseConfigured) {
        const receiptNo = `RCT-${Math.floor(100000 + Math.random() * 900000)}`
        const newReceipt: ExtendedReceipt = {
          id: `rc-${Date.now()}`,
          receipt_number: receiptNo,
          boarder_id: params.boarderId,
          boarder_name: 'বোর্ডার',
          boarder_code: 'BDR-2026-XXX',
          received_by: 'mgr-current',
          collector_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          destination_account_id: params.destinationAccountId,
          account_name: 'ক্যাশ অ্যাকাউন্ট',
          amount: totalAmount,
          payment_method: params.paymentMethod,
          transaction_reference: params.reference,
          receipt_date: params.collectionDate || new Date().toISOString(),
          is_void: false,
          remarks: params.remarks,
          created_at: new Date().toISOString(),
          allocations: (params.allocations || []).map((a) => ({
            charge_id: a.charge_id,
            charge_type: 'RENT',
            billing_month: new Date().toISOString().slice(0, 7) + '-01',
            description: 'সিট ভাড়া',
            amount: a.amount,
          })),
        }
        MOCK_RECEIPTS = [newReceipt, ...MOCK_RECEIPTS]
        return {
          success: true,
          receipt_id: newReceipt.id,
          receipt_number: newReceipt.receipt_number,
          receipt: newReceipt,
        }
      }

      // Try unified multi-head collection RPC first
      try {
        const { data, error } = await supabase.rpc('fn_record_unified_collection', {
          p_boarder_id: params.boarderId,
          p_destination_account_id: params.destinationAccountId,
          p_payment_method: params.paymentMethod,
          p_items: items,
          p_collection_date: params.collectionDate || new Date().toISOString(),
          p_reference: params.reference || null,
          p_remarks: params.remarks || null,
        })

        if (!error && data) return data
      } catch (err) {
        console.warn('fn_record_unified_collection not yet available, falling back to fn_record_receipt:', err)
      }

      // Fallback to fn_record_receipt
      const { data, error } = await supabase.rpc('fn_record_receipt', {
        p_boarder_id: params.boarderId,
        p_amount: totalAmount,
        p_payment_method: params.paymentMethod,
        p_destination_account_id: params.destinationAccountId,
        p_reference: params.reference || null,
        p_allocations: params.allocations || [],
        p_remarks: params.remarks || null,
      })

      if (error) throw new Error(error.message || 'মানি রিসিপ্ট সংগ্রহে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
      queryClient.invalidateQueries({ queryKey: ['unpaid-charges'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

export interface VoidReceiptParams {
  receiptId: string
  reason: string
}

export function useVoidReceiptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: VoidReceiptParams) => {
      if (!isSupabaseConfigured) {
        MOCK_RECEIPTS = MOCK_RECEIPTS.map((r) =>
          r.id === params.receiptId
            ? {
              ...r,
              is_void: true,
              void_reason: params.reason,
              void_at: new Date().toISOString(),
            }
            : r
        )
        return { success: true, message: 'রিসিপ্ট সফলভাবে বাতিল করা হয়েছে।' }
      }

      const { data, error } = await supabase.rpc('fn_void_receipt', {
        p_receipt_id: params.receiptId,
        p_void_reason: params.reason,
      })

      if (error) throw new Error(error.message || 'রিসিপ্ট বাতিল করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
      queryClient.invalidateQueries({ queryKey: ['unpaid-charges'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

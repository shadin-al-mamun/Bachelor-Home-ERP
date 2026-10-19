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

const MOCK_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'fa-1',
    account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    account_type: 'CASH_MANAGER',
    account_number: 'CASH-01',
    bank_name: 'হোস্টেল ক্যাশ',
    current_balance: 18500,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'fa-2',
    account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    account_type: 'BANK',
    account_number: '105.120.4568',
    bank_name: 'Dutch-Bangla Bank PLC',
    current_balance: 145000,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
  {
    id: 'fa-3',
    account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
    account_type: 'MFS',
    account_number: '01800000000',
    bank_name: 'bKash Merchant',
    current_balance: 32400,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
]

let MOCK_RECEIPTS: ExtendedReceipt[] = [
  {
    id: 'rc-1001',
    receipt_number: 'RCT-001001',
    boarder_id: 'b-101',
    boarder_name: 'তানভীর আহমেদ',
    boarder_code: 'BDR-2026-001',
    boarder_phone: '01711223344',
    seat_code: '4A-101A',
    flat_name: 'ফ্ল্যাট ৪এ',
    received_by: 'mgr-1',
    collector_name: 'হোস্টেল ম্যানেজার',
    destination_account_id: 'fa-1',
    account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    amount: 4500,
    payment_method: 'CASH',
    receipt_date: '2026-10-05T11:30:00Z',
    is_void: false,
    remarks: 'নিয়মিত ভাড়া পরিশোধ',
    created_at: '2026-10-05T11:30:00Z',
    allocations: [
      {
        charge_id: 'ch-1',
        charge_type: 'RENT',
        billing_month: '2026-10-01',
        description: 'অক্টোবর ২০২৬ মাসিক সিট ভাড়া',
        amount: 4500,
      },
    ],
  },
  {
    id: 'rc-1002',
    receipt_number: 'RCT-001002',
    boarder_id: 'b-102',
    boarder_name: 'রাকিবুল হাসান',
    boarder_code: 'BDR-2026-002',
    boarder_phone: '01912345678',
    seat_code: '4A-101B',
    flat_name: 'ফ্ল্যাট ৪এ',
    received_by: 'mgr-1',
    collector_name: 'হোস্টেল ম্যানেজার',
    destination_account_id: 'fa-3',
    account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
    amount: 4200,
    payment_method: 'MFS',
    transaction_reference: 'TRX-BKASH-89942',
    receipt_date: '2026-09-08T14:15:00Z',
    is_void: false,
    remarks: 'সেপ্টেম্বর ভাড়া',
    created_at: '2026-09-08T14:15:00Z',
    allocations: [
      {
        charge_id: 'ch-2',
        charge_type: 'RENT',
        billing_month: '2026-09-01',
        description: 'সেপ্টেম্বর ২০২৬ মাসিক সিট ভাড়া',
        amount: 4200,
      },
    ],
  },
]

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

      const { data, error } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_type', { ascending: true })

      if (error) {
        console.warn('financial_accounts fetch failed:', error.message)
        return []
      }
      return (data || []) as FinancialAccount[]
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

export interface RecordReceiptParams {
  boarderId: string
  amount: number
  paymentMethod: PaymentMethod
  destinationAccountId: string
  reference?: string
  remarks?: string
  allocations: {
    charge_id: string
    amount: number
  }[]
}

export function useRecordReceiptMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: RecordReceiptParams) => {
      if (!isSupabaseConfigured) {
        const receiptNo = `RCT-${Math.floor(100000 + Math.random() * 900000)}`
        const newReceipt: ExtendedReceipt = {
          id: `rc-${Date.now()}`,
          receipt_number: receiptNo,
          boarder_id: params.boarderId,
          boarder_name: 'বর্ডার গ্রাহক',
          boarder_code: 'BDR-2026-XXX',
          received_by: 'mgr-current',
          collector_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          destination_account_id: params.destinationAccountId,
          account_name: 'ক্যাশ একাউন্ট',
          amount: params.amount,
          payment_method: params.paymentMethod,
          transaction_reference: params.reference,
          receipt_date: new Date().toISOString(),
          is_void: false,
          remarks: params.remarks,
          created_at: new Date().toISOString(),
          allocations: params.allocations.map((a) => ({
            charge_id: a.charge_id,
            charge_type: 'RENT',
            billing_month: '2026-10-01',
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

      const { data, error } = await supabase.rpc('fn_record_receipt', {
        p_boarder_id: params.boarderId,
        p_amount: params.amount,
        p_payment_method: params.paymentMethod,
        p_destination_account_id: params.destinationAccountId,
        p_reference: params.reference || null,
        p_allocations: params.allocations,
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
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
    },
  })
}

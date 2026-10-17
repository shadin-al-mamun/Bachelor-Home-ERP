import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type {
  Income,
  IncomeCategory,
  AccountTransfer,
} from '@/types/database'
import { MOCK_ACCOUNTS, MOCK_FLATS } from '@/features/expenses/api/useExpenses'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface ExtendedIncome extends Income {
  category_name: string
  destination_account_name: string
  receiver_name: string
  flat_name?: string
  flat_code?: string
  building_name?: string
}

export interface ExtendedAccountTransfer extends AccountTransfer {
  from_account_name: string
  to_account_name: string
  creator_name: string
}

export interface IncomeFilters {
  searchQuery?: string
  categoryId?: string
  accountId?: string
  flatId?: string
  dateRange?: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH'
}

export interface TransferFilters {
  searchQuery?: string
  fromAccountId?: string
  toAccountId?: string
  dateRange?: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH'
}

export interface RecordIncomeInput {
  categoryId: string
  amount: number
  destinationAccountId: string
  buildingId?: string | null
  flatId?: string | null
  incomeDate: string
  description: string
}

export interface RecordTransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  transferDate?: string
  reference?: string | null
  remarks?: string | null
}

// ==============================================================================
// Mock Data Baseline (Realistic Non-Rent Revenue & Cash Movements)
// ==============================================================================

export const MOCK_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: 'inc-cat-1', name: 'Guest Stay Fee', description: 'মেহমান/অতিথিদের দৈনিক থাকার ফি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'inc-cat-2', name: 'Scrap Sale', description: 'পুরাতন কার্টন, খবরের কাগজ ও লোহালক্কড় বিক্রয়লব্ধ আয়', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'inc-cat-3', name: 'Hall & Space Usage', description: 'কমন স্পেস বা রিডিং রুম বিশেষ ইভেন্ট বুকিং ফি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'inc-cat-4', name: 'WiFi Extra Device Fee', description: 'বর্ডারদের অতিরিক্ত ল্যাপটপ/ডিভাইস সংযোগ চার্জ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'inc-cat-5', name: 'Miscellaneous', description: 'অন্যান্য আনুষঙ্গিক রাজস্ব ও নন-রেন্ট প্রাপ্তি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

let MOCK_INCOMES: ExtendedIncome[] = [
  {
    id: 'inc-2001',
    income_voucher_no: 'INC-002001',
    category_id: 'inc-cat-1',
    category_name: 'Guest Stay Fee',
    amount: 1500,
    destination_account_id: 'fa-1',
    destination_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-2a',
    flat_name: 'ফ্ল্যাট ২-এ (২য় তলা)',
    flat_code: 'FLAT-2A',
    income_date: '2026-10-04',
    description: 'বর্ডার তানভীরের ভাইয়ের ৩ দিন রাত্রিযাপন ও খাবার চার্জ বাবদ নগদ গ্রহণ',
    received_by: 'usr-mgr1',
    receiver_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-04T12:00:00Z',
    updated_at: '2026-10-04T12:00:00Z',
  },
  {
    id: 'inc-2002',
    income_voucher_no: 'INC-002002',
    category_id: 'inc-cat-2',
    category_name: 'Scrap Sale',
    amount: 950,
    destination_account_id: 'fa-1',
    destination_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: null,
    income_date: '2026-10-08',
    description: 'স্টোর রুমের পুরাতন খবরের কাগজ, তেল ক্যান ও ভাঙা প্লাস্টিক ভাংগারি বিক্রয়',
    received_by: 'usr-mgr1',
    receiver_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-08T15:30:00Z',
    updated_at: '2026-10-08T15:30:00Z',
  },
  {
    id: 'inc-2003',
    income_voucher_no: 'INC-002003',
    category_id: 'inc-cat-1',
    category_name: 'Guest Stay Fee',
    amount: 1200,
    destination_account_id: 'fa-3',
    destination_account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-3b',
    flat_name: 'ফ্ল্যাট ৩-বি (৩য় তলা)',
    flat_code: 'FLAT-3B',
    income_date: '2026-10-11',
    description: 'ফ্ল্যাট ৩-বি এর গেস্ট থাকার ফি বিকাশ পেমেন্টে গ্রহণ (TrxID: 9BK4582)',
    received_by: 'usr-mgr1',
    receiver_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-11T19:40:00Z',
    updated_at: '2026-10-11T19:40:00Z',
  },
  {
    id: 'inc-2004',
    income_voucher_no: 'INC-002004',
    category_id: 'inc-cat-3',
    category_name: 'Hall & Space Usage',
    amount: 2500,
    destination_account_id: 'fa-2',
    destination_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: null,
    income_date: '2026-10-13',
    description: 'ইউনিভার্সিটি স্টাডি গ্রুপের বিশেষ সেমিনার রুম ব্যবহার ফি ব্যাংক ট্রান্সফারে জমা',
    received_by: 'usr-admin1',
    receiver_name: 'সুপার এডমিন (ওনার)',
    created_at: '2026-10-13T11:00:00Z',
    updated_at: '2026-10-13T11:00:00Z',
  },
  {
    id: 'inc-2005',
    income_voucher_no: 'INC-002005',
    category_id: 'inc-cat-4',
    category_name: 'WiFi Extra Device Fee',
    amount: 600,
    destination_account_id: 'fa-1',
    destination_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-4a',
    flat_name: 'ফ্ল্যাট ৪-এ (৪র্থ তলা)',
    flat_code: 'FLAT-4A',
    income_date: '2026-10-15',
    description: '২ জন বর্ডারের অতিরিক্ত ল্যাপটপ ডিভাইসের ওয়াইফাই ইন্টারনেট ফি ক্যাশ গ্রহণ',
    received_by: 'usr-mgr1',
    receiver_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-15T14:20:00Z',
    updated_at: '2026-10-15T14:20:00Z',
  },
]

let MOCK_TRANSFERS: ExtendedAccountTransfer[] = [
  {
    id: 'trf-1001',
    transfer_number: 'TRF-001001',
    from_account_id: 'fa-1',
    from_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    to_account_id: 'fa-2',
    to_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    amount: 25000,
    transfer_date: '2026-10-06T11:30:00Z',
    reference: 'DEP-SLIP-45892',
    remarks: 'ম্যানেজারের হাতে থাকা মাসিক কালেকশন উদ্বৃত্ত ব্যাংকে জমা প্রদান',
    created_by: 'usr-mgr1',
    creator_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-06T11:30:00Z',
  },
  {
    id: 'trf-1002',
    transfer_number: 'TRF-001002',
    from_account_id: 'fa-3',
    from_account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
    to_account_id: 'fa-2',
    to_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    amount: 18000,
    transfer_date: '2026-10-09T16:00:00Z',
    reference: 'B2B-SETTLE-8891',
    remarks: 'বিকাশ মার্চেন্ট একাউন্টের ফান্ড ব্যাংক একাউন্টে অটো-সেটেলমেন্ট ট্রান্সফার',
    created_by: 'usr-admin1',
    creator_name: 'সুপার এডমিন (ওনার)',
    created_at: '2026-10-09T16:00:00Z',
  },
  {
    id: 'trf-1003',
    transfer_number: 'TRF-001003',
    from_account_id: 'fa-2',
    from_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    to_account_id: 'fa-1',
    to_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    amount: 10000,
    transfer_date: '2026-10-12T10:15:00Z',
    reference: 'ATM-WDL-9921',
    remarks: 'হোস্টেলের দৈনন্দিন বাজার ও পেটি ক্যাশ খরচের জন্য ব্যাংক থেকে নগদ উত্তোলন',
    created_by: 'usr-mgr1',
    creator_name: 'হোস্টেল ম্যানেজার',
    created_at: '2026-10-12T10:15:00Z',
  },
]

// ==============================================================================
// React Query Hooks
// ==============================================================================

export function useIncomes(filters?: IncomeFilters) {
  return useQuery({
    queryKey: ['incomes', filters],
    queryFn: async (): Promise<ExtendedIncome[]> => {
      if (!isSupabaseConfigured) {
        let list = [...MOCK_INCOMES]

        if (filters?.categoryId && filters.categoryId !== 'ALL') {
          list = list.filter((i) => i.category_id === filters.categoryId)
        }

        if (filters?.accountId && filters.accountId !== 'ALL') {
          list = list.filter((i) => i.destination_account_id === filters.accountId)
        }

        if (filters?.flatId) {
          if (filters.flatId === 'GENERAL') {
            list = list.filter((i) => !i.flat_id)
          } else if (filters.flatId !== 'ALL') {
            list = list.filter((i) => i.flat_id === filters.flatId)
          }
        }

        if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase()
          list = list.filter(
            (i) =>
              i.income_voucher_no.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.category_name.toLowerCase().includes(q) ||
              i.receiver_name.toLowerCase().includes(q)
          )
        }

        if (filters?.dateRange === 'TODAY') {
          const today = new Date().toISOString().slice(0, 10)
          list = list.filter((i) => i.income_date === today)
        } else if (filters?.dateRange === 'THIS_MONTH') {
          const monthPrefix = new Date().toISOString().slice(0, 7)
          list = list.filter((i) => i.income_date.startsWith(monthPrefix))
        }

        return list.sort(
          (a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime()
        )
      }

      let query = supabase
        .from('incomes')
        .select(`
          *,
          category:category_id ( id, name ),
          destination_account:destination_account_id ( id, account_name ),
          flat:flat_id ( id, flat_code, name ),
          building:building_id ( id, name ),
          receiver:received_by ( full_name )
        `)
        .order('income_date', { ascending: false })

      if (filters?.categoryId && filters.categoryId !== 'ALL') {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters?.accountId && filters.accountId !== 'ALL') {
        query = query.eq('destination_account_id', filters.accountId)
      }

      if (filters?.flatId) {
        if (filters.flatId === 'GENERAL') {
          query = query.is('flat_id', null)
        } else if (filters.flatId !== 'ALL') {
          query = query.eq('flat_id', filters.flatId)
        }
      }

      if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
        query = query.or(
          `income_voucher_no.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching incomes:', error)
        throw new Error(error.message)
      }

      return (data || []).map((row: any) => ({
        ...row,
        category_name: row.category?.name || 'নন-রেন্ট আয়',
        destination_account_name: row.destination_account?.account_name || 'একাউন্ট',
        receiver_name: row.receiver?.full_name || 'ম্যানেজার',
        flat_name: row.flat?.name,
        flat_code: row.flat?.flat_code,
        building_name: row.building?.name,
      }))
    },
  })
}

export function useIncomeCategories() {
  return useQuery({
    queryKey: ['income-categories'],
    queryFn: async (): Promise<IncomeCategory[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_INCOME_CATEGORIES
      }

      const { data, error } = await supabase
        .from('income_categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw new Error(error.message)
      return data || []
    },
  })
}

export function useAccountTransfers(filters?: TransferFilters) {
  return useQuery({
    queryKey: ['account-transfers', filters],
    queryFn: async (): Promise<ExtendedAccountTransfer[]> => {
      if (!isSupabaseConfigured) {
        let list = [...MOCK_TRANSFERS]

        if (filters?.fromAccountId && filters.fromAccountId !== 'ALL') {
          list = list.filter((t) => t.from_account_id === filters.fromAccountId)
        }

        if (filters?.toAccountId && filters.toAccountId !== 'ALL') {
          list = list.filter((t) => t.to_account_id === filters.toAccountId)
        }

        if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase()
          list = list.filter(
            (t) =>
              t.transfer_number.toLowerCase().includes(q) ||
              (t.reference && t.reference.toLowerCase().includes(q)) ||
              (t.remarks && t.remarks.toLowerCase().includes(q)) ||
              t.from_account_name.toLowerCase().includes(q) ||
              t.to_account_name.toLowerCase().includes(q)
          )
        }

        if (filters?.dateRange === 'THIS_MONTH') {
          const monthPrefix = new Date().toISOString().slice(0, 7)
          list = list.filter((t) => t.transfer_date.startsWith(monthPrefix))
        }

        return list.sort(
          (a, b) => new Date(b.transfer_date).getTime() - new Date(a.transfer_date).getTime()
        )
      }

      let query = supabase
        .from('account_transfers')
        .select(`
          *,
          from_account:from_account_id ( id, account_name ),
          to_account:to_account_id ( id, account_name ),
          creator:created_by ( full_name )
        `)
        .order('transfer_date', { ascending: false })

      if (filters?.fromAccountId && filters.fromAccountId !== 'ALL') {
        query = query.eq('from_account_id', filters.fromAccountId)
      }

      if (filters?.toAccountId && filters.toAccountId !== 'ALL') {
        query = query.eq('to_account_id', filters.toAccountId)
      }

      if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
        query = query.or(
          `transfer_number.ilike.%${filters.searchQuery}%,reference.ilike.%${filters.searchQuery}%,remarks.ilike.%${filters.searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching account transfers:', error)
        throw new Error(error.message)
      }

      return (data || []).map((row: any) => ({
        ...row,
        from_account_name: row.from_account?.account_name || 'উৎস একাউন্ট',
        to_account_name: row.to_account?.account_name || 'গন্তব্য একাউন্ট',
        creator_name: row.creator?.full_name || 'ম্যানেজার',
      }))
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

export function useRecordIncomeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordIncomeInput) => {
      if (!isSupabaseConfigured) {
        const voucherNo = `INC-${Math.floor(2000 + MOCK_INCOMES.length + 1).toString().padStart(6, '0')}`
        const cat = MOCK_INCOME_CATEGORIES.find((c) => c.id === input.categoryId)
        const acc = MOCK_ACCOUNTS.find((a) => a.id === input.destinationAccountId)
        const flat = MOCK_FLATS.find((f) => f.id === input.flatId)

        const newIncome: ExtendedIncome = {
          id: `inc-${Date.now()}`,
          income_voucher_no: voucherNo,
          category_id: input.categoryId,
          category_name: cat?.name || 'নন-রেন্ট আয়',
          amount: input.amount,
          destination_account_id: input.destinationAccountId,
          destination_account_name: acc?.account_name || 'জমা একাউন্ট',
          building_id: input.buildingId || flat?.building_id || null,
          building_name: flat?.building?.name || 'সানফ্লাওয়ার হোস্টেল',
          flat_id: input.flatId || null,
          flat_name: flat?.name,
          flat_code: flat?.flat_code,
          income_date: input.incomeDate,
          description: input.description,
          received_by: 'usr-mgr1',
          receiver_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Add to mock account balance
        if (acc) {
          acc.current_balance += input.amount
        }

        MOCK_INCOMES = [newIncome, ...MOCK_INCOMES]

        return {
          success: true,
          income: newIncome,
          income_voucher_no: voucherNo,
        }
      }

      const { data, error } = await supabase.rpc('fn_record_income', {
        p_category_id: input.categoryId,
        p_amount: input.amount,
        p_destination_account_id: input.destinationAccountId,
        p_building_id: input.buildingId || null,
        p_flat_id: input.flatId || null,
        p_income_date: input.incomeDate,
        p_description: input.description,
      })

      if (error) {
        throw new Error(error.message || 'নন-রেন্ট আয় এন্ট্রি করতে ব্যর্থ হয়েছে।')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

export function useRecordTransferMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordTransferInput) => {
      if (!isSupabaseConfigured) {
        if (input.fromAccountId === input.toAccountId) {
          throw new Error('উৎস এবং গন্তব্য একই একাউন্ট হতে পারে না।')
        }

        const fromAcc = MOCK_ACCOUNTS.find((a) => a.id === input.fromAccountId)
        const toAcc = MOCK_ACCOUNTS.find((a) => a.id === input.toAccountId)

        if (!fromAcc || !toAcc) {
          throw new Error('একাউন্ট পাওয়া যায়নি।')
        }

        if (fromAcc.current_balance < input.amount) {
          throw new Error(`উৎস একাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${fromAcc.current_balance}`)
        }

        const transferNo = `TRF-${Math.floor(1000 + MOCK_TRANSFERS.length + 1).toString().padStart(6, '0')}`

        // Execute atomic balance update
        fromAcc.current_balance -= input.amount
        toAcc.current_balance += input.amount

        const newTransfer: ExtendedAccountTransfer = {
          id: `trf-${Date.now()}`,
          transfer_number: transferNo,
          from_account_id: input.fromAccountId,
          from_account_name: fromAcc.account_name,
          to_account_id: input.toAccountId,
          to_account_name: toAcc.account_name,
          amount: input.amount,
          transfer_date: input.transferDate || new Date().toISOString(),
          reference: input.reference || null,
          remarks: input.remarks || null,
          created_by: 'usr-mgr1',
          creator_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          created_at: new Date().toISOString(),
        }

        MOCK_TRANSFERS = [newTransfer, ...MOCK_TRANSFERS]

        return {
          success: true,
          transfer: newTransfer,
          transfer_number: transferNo,
        }
      }

      const { data, error } = await supabase.rpc('fn_record_account_transfer', {
        p_from_account_id: input.fromAccountId,
        p_to_account_id: input.toAccountId,
        p_amount: input.amount,
        p_transfer_date: input.transferDate || new Date().toISOString(),
        p_reference: input.reference || null,
        p_remarks: input.remarks || null,
      })

      if (error) {
        throw new Error(error.message || 'টাকা স্থানান্তর করতে ব্যর্থ হয়েছে।')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type {
  Income,
  IncomeCategory,
  AccountTransfer,
} from '@/types/database'
import {
  MOCK_ACCOUNTS,
  MOCK_FLATS,
  isUUID,
  generateUUID,
} from '@/features/expenses/api/useExpenses'

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

export const INCOME_CATEGORY_UUIDS = {
  GUEST_STAY_FEE: 'b2222222-2222-4222-8222-222222222201',
  SCRAP_SALE: 'b2222222-2222-4222-8222-222222222202',
  HALL_SPACE_USAGE: 'b2222222-2222-4222-8222-222222222203',
  WIFI_EXTRA_DEVICE_FEE: 'b2222222-2222-4222-8222-222222222204',
  FRIDGE_APPLIANCE_FEE: 'b2222222-2222-4222-8222-222222222205',
  LATE_PAYMENT_FINE: 'b2222222-2222-4222-8222-222222222206',
  MISCELLANEOUS: 'b2222222-2222-4222-8222-222222222207',
} as const

export const LEGACY_INCOME_MAP: Record<string, string> = {
  'inc-cat-1': INCOME_CATEGORY_UUIDS.GUEST_STAY_FEE,
  'inc-cat-2': INCOME_CATEGORY_UUIDS.SCRAP_SALE,
  'inc-cat-3': INCOME_CATEGORY_UUIDS.HALL_SPACE_USAGE,
  'inc-cat-4': INCOME_CATEGORY_UUIDS.WIFI_EXTRA_DEVICE_FEE,
  'inc-cat-5': INCOME_CATEGORY_UUIDS.FRIDGE_APPLIANCE_FEE,
  'inc-cat-6': INCOME_CATEGORY_UUIDS.LATE_PAYMENT_FINE,
  'inc-cat-7': INCOME_CATEGORY_UUIDS.MISCELLANEOUS,
}

export function toValidIncomeUUID(id: string): string {
  if (LEGACY_INCOME_MAP[id]) return LEGACY_INCOME_MAP[id]
  if (isUUID(id)) return id
  return INCOME_CATEGORY_UUIDS.MISCELLANEOUS
}

export const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: INCOME_CATEGORY_UUIDS.GUEST_STAY_FEE, name: 'Guest Stay Fee', description: 'মেহমান/অতিথিদের দৈনিক থাকার ফি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.SCRAP_SALE, name: 'Scrap Sale', description: 'পুরাতন কার্টন, খবরের কাগজ ও লোহালক্কড় বিক্রয়লব্ধ আয়', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.HALL_SPACE_USAGE, name: 'Hall & Space Usage', description: 'কমন স্পেস বা রিডিং রুম বিশেষ ইভেন্ট বুকিং ফি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.WIFI_EXTRA_DEVICE_FEE, name: 'WiFi Extra Device Fee', description: 'বর্ডারদের অতিরিক্ত ল্যাপটপ/ডিভাইস সংযোগ চার্জ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.FRIDGE_APPLIANCE_FEE, name: 'Fridge & Appliance Fee', description: 'ব্যক্তিগত অতিরিক্ত হিটার/ফ্রিজ ব্যবহারের বিশেষ চার্জ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.LATE_PAYMENT_FINE, name: 'Late Payment Fine', description: 'মাসিক ভাড়া নির্ধারিত সময়ের পরে জমার বিলম্ব জরিমানা', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: INCOME_CATEGORY_UUIDS.MISCELLANEOUS, name: 'Miscellaneous', description: 'অন্যান্য আনুষঙ্গিক রাজস্ব ও নন-রেন্ট প্রাপ্তি', is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

export const MOCK_INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES

const INCOME_CATEGORIES_STORAGE_KEY = 'erp_custom_income_categories'

export function getStoredIncomeCategories(): IncomeCategory[] {
  let customCategories: IncomeCategory[] = []
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(INCOME_CATEGORIES_STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        customCategories = parsed
          .filter((c: any) => c && c.name && !LEGACY_INCOME_MAP[c.id])
          .map((c: any) => ({
            ...c,
            id: isUUID(c.id) ? c.id : generateUUID(),
          }))
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom income categories:', err)
  }

  const existingNames = new Set(DEFAULT_INCOME_CATEGORIES.map((c) => c.name.toLowerCase()))
  const validCustom = customCategories.filter(
    (c) => c && c.name && !existingNames.has(c.name.toLowerCase())
  )

  return [...DEFAULT_INCOME_CATEGORIES, ...validCustom]
}

export function saveStoredIncomeCategory(category: IncomeCategory) {
  try {
    const validCategory: IncomeCategory = {
      ...category,
      id: isUUID(category.id) ? category.id : generateUUID(),
    }
    const raw = typeof window !== 'undefined' ? localStorage.getItem(INCOME_CATEGORIES_STORAGE_KEY) : null
    const existing: IncomeCategory[] = raw ? JSON.parse(raw) : []
    const updated = [
      ...existing.filter(
        (c) => c.id !== validCategory.id && c.name.toLowerCase() !== validCategory.name.toLowerCase()
      ),
      validCategory,
    ]
    localStorage.setItem(INCOME_CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to save income category to localStorage:', err)
  }
}

let MOCK_INCOMES: ExtendedIncome[] = []

let MOCK_TRANSFERS: ExtendedAccountTransfer[] = []


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
        return getStoredIncomeCategories()
      }

      try {
        const { data, error } = await supabase
          .from('income_categories')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (!error && data && data.length > 0) {
          const stored = getStoredIncomeCategories()
          const dbNames = new Set(data.map((d: any) => d.name.toLowerCase()))
          const extra = stored.filter((s) => !dbNames.has(s.name.toLowerCase()))
          return [...(data as IncomeCategory[]), ...extra]
        }
      } catch (err) {
        console.warn('Income categories fetch error, falling back:', err)
      }

      return getStoredIncomeCategories()
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
        const categories = getStoredIncomeCategories()
        const cat = categories.find((c) => c.id === input.categoryId)
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

      let resolvedCategoryId = toValidIncomeUUID(input.categoryId)

      if (isSupabaseConfigured) {
        // Reconcile category with Supabase to guarantee foreign key integrity
        const localCat = getStoredIncomeCategories().find(
          (c) => c.id === input.categoryId || c.id === resolvedCategoryId
        )
        const catName = localCat?.name || 'General Income'

        try {
          // If a category with the same name exists in Supabase, use its exact remote UUID
          const { data: dbCatByName } = await supabase
            .from('income_categories')
            .select('id')
            .ilike('name', catName)
            .maybeSingle()

          if (dbCatByName?.id && isUUID(dbCatByName.id)) {
            resolvedCategoryId = dbCatByName.id
          } else {
            // Check if resolvedCategoryId exists by ID in Supabase
            const { data: dbCatById } = await supabase
              .from('income_categories')
              .select('id')
              .eq('id', resolvedCategoryId)
              .maybeSingle()

            if (!dbCatById?.id) {
              const { data: upserted } = await supabase
                .from('income_categories')
                .upsert({
                  id: resolvedCategoryId,
                  name: catName,
                  description: localCat?.description || null,
                  is_active: true,
                }, { onConflict: 'id' })
                .select('id')
                .maybeSingle()

              if (upserted?.id && isUUID(upserted.id)) {
                resolvedCategoryId = upserted.id
              }
            }
          }
        } catch (e) {
          console.warn('Category reconciliation error, proceeding with resolved UUID:', e)
        }

        const { data, error } = await supabase.rpc('fn_record_income', {
          p_category_id: resolvedCategoryId,
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
      }
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

export interface CreateIncomeCategoryInput {
  name: string
  description?: string
  isActive?: boolean
}

export function useCreateIncomeCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateIncomeCategoryInput): Promise<IncomeCategory> => {
      const trimmedName = input.name.trim()
      if (!trimmedName) {
        throw new Error('ক্যাটাগরির নাম দেওয়া আবশ্যক।')
      }

      const allCategories = getStoredIncomeCategories()
      if (allCategories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`"${trimmedName}" নামের আয়ের খাত ইতিমধ্যে বিদ্যমান রয়েছে।`)
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('income_categories')
            .insert({
              name: trimmedName,
              description: input.description?.trim() || null,
              is_active: input.isActive ?? true,
            })
            .select()
            .single()

          if (!error && data) {
            saveStoredIncomeCategory(data as IncomeCategory)
            return data as IncomeCategory
          }
          if (error) {
            console.warn('Supabase income category insert error, fallback to local:', error)
          }
        } catch (err) {
          console.warn('Supabase income category insert exception:', err)
        }
      }

      const newCategory: IncomeCategory = {
        id: generateUUID(),
        name: trimmedName,
        description: input.description?.trim() || null,
        is_active: input.isActive ?? true,
        created_at: new Date().toISOString(),
      }

      saveStoredIncomeCategory(newCategory)
      return newCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] })
    },
  })
}

export interface UpdateFinancialAccountInput {
  id: string
  account_name?: string
  account_type?: any
  account_number?: string | null
  bank_name?: string | null
  opening_balance?: number
  opening_balance_date?: string
  opening_balance_source?: string | null
  current_balance?: number
}

export function useUpdateFinancialAccountMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateFinancialAccountInput) => {
      if (!isSupabaseConfigured) {
        const acc = MOCK_ACCOUNTS.find((a) => a.id === input.id)
        if (!acc) throw new Error('অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।')

        if (input.account_name !== undefined) acc.account_name = input.account_name
        if (input.account_type !== undefined) acc.account_type = input.account_type
        if (input.account_number !== undefined) acc.account_number = input.account_number
        if (input.bank_name !== undefined) acc.bank_name = input.bank_name
        if (input.opening_balance !== undefined) {
          const diff = input.opening_balance - (acc.opening_balance || 0)
          acc.opening_balance = input.opening_balance
          acc.current_balance = Math.max(0, (acc.current_balance || 0) + diff)
        }
        if (input.opening_balance_date !== undefined) acc.opening_balance_date = input.opening_balance_date
        if (input.opening_balance_source !== undefined) acc.opening_balance_source = input.opening_balance_source || undefined
        if (input.current_balance !== undefined) acc.current_balance = input.current_balance

        return acc
      }

      const updatePayload: Record<string, any> = {}
      if (input.account_name !== undefined) updatePayload.account_name = input.account_name
      if (input.account_type !== undefined) updatePayload.account_type = input.account_type
      if (input.account_number !== undefined) updatePayload.account_number = input.account_number
      if (input.bank_name !== undefined) updatePayload.bank_name = input.bank_name
      if (input.opening_balance !== undefined) updatePayload.opening_balance = input.opening_balance
      if (input.opening_balance_date !== undefined) updatePayload.opening_balance_date = input.opening_balance_date
      if (input.opening_balance_source !== undefined) updatePayload.opening_balance_source = input.opening_balance_source
      if (input.current_balance !== undefined) updatePayload.current_balance = input.current_balance

      const { data, error } = await supabase
        .from('financial_accounts')
        .update(updatePayload)
        .eq('id', input.id)
        .select('*')
        .single()

      if (error) {
        throw new Error(error.message || 'অ্যাকাউন্ট আপডেট করতে ব্যর্থ হয়েছে।')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}



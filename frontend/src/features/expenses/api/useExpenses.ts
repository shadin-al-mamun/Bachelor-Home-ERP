import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type {
  Expense,
  ExpenseCategory,
  FinancialAccount,
  ApprovalStatus,
  Flat,
  Building,
} from '@/types/database'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface ExtendedExpense extends Expense {
  category_name: string
  source_account_name: string
  payer_name: string
  approver_name?: string
  building_name?: string
  flat_name?: string
  flat_code?: string
}

export interface ExpenseFilters {
  searchQuery?: string
  status?: 'ALL' | ApprovalStatus
  categoryId?: string
  flatId?: string
  dateRange?: 'ALL' | 'TODAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'
  startDate?: string
  endDate?: string
}

export interface RecordExpenseInput {
  expenseScope?: import('@/types/database').ExpenseScope
  categoryId: string
  amount: number
  sourceAccountId: string
  buildingId?: string | null
  flatId?: string | null
  expenseDate: string
  billingMonth?: string | null
  vendorName?: string | null
  description: string
  voucherFile?: File | null
  voucherAttachmentUrl?: string | null
}

export interface ReviewExpenseInput {
  expenseId: string
  status: 'APPROVED' | 'REJECTED'
  rejectionReason?: string
}

// ==============================================================================
// Mock Data Baseline (Realistic Hostel Operations in Dhaka)
// ==============================================================================

export function isUUID(str?: string | null): boolean {
  if (!str) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const EXPENSE_CATEGORY_UUIDS = {
  ELECTRIC_BILL: 'a1111111-1111-4111-8111-111111111101',
  WATER_GAS: 'a1111111-1111-4111-8111-111111111102',
  INTERNET_WIFI: 'a1111111-1111-4111-8111-111111111103',
  MAINTENANCE_REPAIRS: 'a1111111-1111-4111-8111-111111111104',
  COOK_CLEANER_SALARY: 'a1111111-1111-4111-8111-111111111105',
  CLEANING_SUPPLIES: 'a1111111-1111-4111-8111-111111111106',
  DINING_GROCERY: 'a1111111-1111-4111-8111-111111111107',
  GENERATOR_FUEL: 'a1111111-1111-4111-8111-111111111108',
  MISCELLANEOUS: 'a1111111-1111-4111-8111-111111111109',
} as const

export const LEGACY_EXPENSE_MAP: Record<string, string> = {
  'cat-1': EXPENSE_CATEGORY_UUIDS.ELECTRIC_BILL,
  'cat-2': EXPENSE_CATEGORY_UUIDS.WATER_GAS,
  'cat-3': EXPENSE_CATEGORY_UUIDS.INTERNET_WIFI,
  'cat-4': EXPENSE_CATEGORY_UUIDS.MAINTENANCE_REPAIRS,
  'cat-5': EXPENSE_CATEGORY_UUIDS.COOK_CLEANER_SALARY,
  'cat-6': EXPENSE_CATEGORY_UUIDS.CLEANING_SUPPLIES,
  'cat-7': EXPENSE_CATEGORY_UUIDS.DINING_GROCERY,
  'cat-8': EXPENSE_CATEGORY_UUIDS.GENERATOR_FUEL,
  'cat-9': EXPENSE_CATEGORY_UUIDS.MISCELLANEOUS,
}

export function toValidExpenseUUID(id: string): string {
  if (LEGACY_EXPENSE_MAP[id]) return LEGACY_EXPENSE_MAP[id]
  if (isUUID(id)) return id
  return EXPENSE_CATEGORY_UUIDS.MISCELLANEOUS
}

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  // 1. Hostel Market Expense
  { id: 'a1111111-1111-4111-8111-111111111107', name: 'চাল, ডাল ও তেল (Rice, Pulses, Oil)', description: 'হোস্টেল মেসের কেন্দ্রীয় বাজার: চাল, ডাল ও তেল', category_scope: 'HOSTEL_MARKET', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111110', name: 'মাছ, মাংস ও ডিম (Fish, Meat, Eggs)', description: 'হোস্টেল মেসের কেন্দ্রীয় বাজার: মাছ, মাংস ও ডিম', category_scope: 'HOSTEL_MARKET', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111111', name: 'শাকসবজি ও কাঁচাবাজার (Vegetables & Groceries)', description: 'দৈনিক কাঁচাবাজার ও শাকসবজি', category_scope: 'HOSTEL_MARKET', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111112', name: 'মসলাপাতি ও ড্রাই বাজার (Spices & Dry Food)', description: 'রান্নার তেল, মসলা, পেঁয়াজ, রসুন ইত্যাদি', category_scope: 'HOSTEL_MARKET', is_active: true, created_at: '2026-01-01T00:00:00Z' },

  // 2. Hostel Miscellaneous Expense
  { id: 'a1111111-1111-4111-8111-111111111105', name: 'বাবুর্চির বেতন (Cook Salary)', description: 'বাবুর্চি ও কিচেন সহকারীর মাসিক বেতন', category_scope: 'HOSTEL_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111113', name: 'ম্যানেজারের বেতন (Manager Salary)', description: 'হোস্টেল ম্যানেজার ও সহকারী পরিচালকের বেতন', category_scope: 'HOSTEL_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111114', name: 'ক্লিনার ও স্টাফ বেতন (Staff Salary)', description: 'ক্লিনার, দারোয়ান ও সাপোর্ট স্টাফদের বেতন', category_scope: 'HOSTEL_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111104', name: 'মেরামত ও রক্ষণাবেক্ষণ (Repairs & Maintenance)', description: 'হোস্টেলের সাধারণ প্লাম্বিং, বৈদ্যুতিক ও মেরামত', category_scope: 'HOSTEL_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111109', name: 'হোস্টেলের সাধারণ খরচ (Hostel General Misc)', description: 'হোস্টেলের সাধারণ আকস্মিক ও অফিস খরচ', category_scope: 'HOSTEL_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },

  // 3. Flat-wise Miscellaneous Expense
  { id: 'a1111111-1111-4111-8111-111111111101', name: 'বিদ্যুৎ বিল (Electricity Bill)', description: 'নির্দিষ্ট ফ্ল্যাটের মাসিক ডেসকো/ডিপিডিসি বিদ্যুৎ বিল', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111102', name: 'পানির বিল (Water Bill)', description: 'নির্দিষ্ট ফ্ল্যাটের মাসিক ওয়াসা পানির বিল', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111115', name: 'গ্যাস বিল (Gas Bill)', description: 'নির্দিষ্ট ফ্ল্যাটের মাসিক গ্যাস বিল বা এলপিজি সিলিন্ডার খরচ', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111116', name: 'ময়লা বিল (Garbage Bill)', description: 'নির্দিষ্ট ফ্ল্যাটের মাসিক বর্জ্য ব্যবস্থাপনা ও ময়লা বিল', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111103', name: 'ওয়াইফাই বিল (Wi-Fi Bill)', description: 'নির্দিষ্ট ফ্ল্যাটের মাসিক ইন্টারনেট ও ওয়াইফাই বিল', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'a1111111-1111-4111-8111-111111111117', name: 'অন্যান্য ফ্ল্যাটওয়ারী বিবিধ খরচ (Other Flat Misc)', description: 'নির্দিষ্ট ফ্ল্যাটের অন্যান্য আনুষঙ্গিক খরচ', category_scope: 'FLAT_MISC', is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

export const MOCK_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES

const EXPENSE_CATEGORIES_STORAGE_KEY = 'erp_custom_expense_categories'

export function getStoredExpenseCategories(): ExpenseCategory[] {
  let customCategories: ExpenseCategory[] = []
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        customCategories = parsed
          .filter((c: any) => c && c.name && !LEGACY_EXPENSE_MAP[c.id])
          .map((c: any) => ({
            ...c,
            id: isUUID(c.id) ? c.id : generateUUID(),
          }))
      }
    }
  } catch (err) {
    console.warn('Failed to parse custom expense categories:', err)
  }

  const existingNames = new Set(DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name.toLowerCase()))
  const validCustom = customCategories.filter(
    (c) => c && c.name && !existingNames.has(c.name.toLowerCase())
  )

  return [...DEFAULT_EXPENSE_CATEGORIES, ...validCustom]
}

export function saveStoredExpenseCategory(category: ExpenseCategory) {
  try {
    const validCategory: ExpenseCategory = {
      ...category,
      id: isUUID(category.id) ? category.id : generateUUID(),
    }
    const raw = typeof window !== 'undefined' ? localStorage.getItem(EXPENSE_CATEGORIES_STORAGE_KEY) : null
    const existing: ExpenseCategory[] = raw ? JSON.parse(raw) : []
    const updated = [...existing.filter((c) => c.id !== validCategory.id && c.name.toLowerCase() !== validCategory.name.toLowerCase()), validCategory]
    localStorage.setItem(EXPENSE_CATEGORIES_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to save expense category to localStorage:', err)
  }
}

export const MOCK_ACCOUNTS: FinancialAccount[] = [
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

export const MOCK_FLATS: (Flat & { building: Building })[] = [
  {
    id: 'flat-2a',
    building_id: 'bld-1',
    flat_code: 'FLAT-2A',
    name: 'ফ্ল্যাট ২-এ (২য় তলা)',
    floor_number: 2,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    building: {
      id: 'bld-1',
      building_code: 'BLD-01',
      name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
      address: 'বাড়ি ৪২, রোড ১১, সেক্টর ৪, উত্তরা, ঢাকা',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'flat-3b',
    building_id: 'bld-1',
    flat_code: 'FLAT-3B',
    name: 'ফ্ল্যাট ৩-বি (৩য় তলা)',
    floor_number: 3,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    building: {
      id: 'bld-1',
      building_code: 'BLD-01',
      name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
      address: 'বাড়ি ৪২, রোড ১১, সেক্টর ৪, উত্তরা, ঢাকা',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'flat-4a',
    building_id: 'bld-1',
    flat_code: 'FLAT-4A',
    name: 'ফ্ল্যাট ৪-এ (৪র্থ তলা)',
    floor_number: 4,
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    building: {
      id: 'bld-1',
      building_code: 'BLD-01',
      name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
      address: 'বাড়ি ৪২, রোড ১১, সেক্টর ৪, উত্তরা, ঢাকা',
      status: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
]

// Test financial transaction data reset for fresh baseline as instructed by user
let MOCK_EXPENSES: ExtendedExpense[] = []

// ==============================================================================
// Storage Helper: Upload Voucher Receipt
// ==============================================================================

export async function uploadVoucherFile(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    // Return Object URL or base64 representation for seamless local development
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(file)
    })
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `voucher_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
  const filePath = `vouchers/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('expense-receipts')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    throw new Error(`ভাউচার ফাইল আপলোডে সমস্যা: ${uploadError.message}`)
  }

  const { data: publicUrlData } = supabase.storage
    .from('expense-receipts')
    .getPublicUrl(filePath)

  return publicUrlData.publicUrl
}

// ==============================================================================
// React Query Hooks
// ==============================================================================

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async (): Promise<ExtendedExpense[]> => {
      if (!isSupabaseConfigured) {
        let list = [...MOCK_EXPENSES]

        // Status Filter
        if (filters?.status && filters.status !== 'ALL') {
          list = list.filter((e) => e.approval_status === filters.status)
        }

        // Category Filter
        if (filters?.categoryId && filters.categoryId !== 'ALL') {
          list = list.filter((e) => e.category_id === filters.categoryId)
        }

        // Flat Filter
        if (filters?.flatId) {
          if (filters.flatId === 'GENERAL') {
            list = list.filter((e) => !e.flat_id)
          } else if (filters.flatId !== 'ALL') {
            list = list.filter((e) => e.flat_id === filters.flatId)
          }
        }

        // Search Query Filter
        if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
          const q = filters.searchQuery.toLowerCase()
          list = list.filter(
            (e) =>
              e.expense_voucher_no.toLowerCase().includes(q) ||
              e.description.toLowerCase().includes(q) ||
              e.category_name.toLowerCase().includes(q) ||
              e.payer_name.toLowerCase().includes(q) ||
              (e.flat_name && e.flat_name.toLowerCase().includes(q))
          )
        }

        // Date Range
        if (filters?.dateRange === 'TODAY') {
          const today = new Date().toISOString().slice(0, 10)
          list = list.filter((e) => e.expense_date === today)
        } else if (filters?.dateRange === 'THIS_MONTH') {
          const monthPrefix = new Date().toISOString().slice(0, 7)
          list = list.filter((e) => e.expense_date.startsWith(monthPrefix))
        }

        return list.sort(
          (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
        )
      }

      let data: any[] = []
      let joinedSuccess = false

      // 1. Try querying with foreign table joins
      try {
        let joinedQuery = supabase
          .from('expenses')
          .select(`
            *,
            category:expense_categories(id, name),
            source_account:financial_accounts(id, account_name),
            flat:flats(id, flat_code, name),
            building:buildings(id, name),
            payer:profiles!expenses_paid_by_fkey(full_name, phone_number),
            approver:profiles!expenses_approved_by_fkey(full_name)
          `)
          .order('expense_date', { ascending: false })

        if (filters?.status && filters.status !== 'ALL') {
          joinedQuery = joinedQuery.eq('approval_status', filters.status)
        }

        if (filters?.categoryId && filters.categoryId !== 'ALL') {
          joinedQuery = joinedQuery.eq('category_id', filters.categoryId)
        }

        if (filters?.flatId) {
          if (filters.flatId === 'GENERAL') {
            joinedQuery = joinedQuery.is('flat_id', null)
          } else if (filters.flatId !== 'ALL') {
            joinedQuery = joinedQuery.eq('flat_id', filters.flatId)
          }
        }

        if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
          joinedQuery = joinedQuery.or(
            `expense_voucher_no.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
          )
        }

        const res = await joinedQuery
        if (!res.error && res.data) {
          data = res.data
          joinedSuccess = true
        } else if (res.error) {
          console.warn('Joined expenses query error, falling back to base select:', res.error)
        }
      } catch (err) {
        console.warn('Joined expenses query threw, using fallback:', err)
      }

      // 2. High-resilience fallback: simple select '*' if joined query failed (e.g. relationship cache or constraint name mismatch)
      if (!joinedSuccess) {
        let fallbackQuery = supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false })

        if (filters?.status && filters.status !== 'ALL') {
          fallbackQuery = fallbackQuery.eq('approval_status', filters.status)
        }

        if (filters?.categoryId && filters.categoryId !== 'ALL') {
          fallbackQuery = fallbackQuery.eq('category_id', filters.categoryId)
        }

        if (filters?.flatId) {
          if (filters.flatId === 'GENERAL') {
            fallbackQuery = fallbackQuery.is('flat_id', null)
          } else if (filters.flatId !== 'ALL') {
            fallbackQuery = fallbackQuery.eq('flat_id', filters.flatId)
          }
        }

        if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
          fallbackQuery = fallbackQuery.or(
            `expense_voucher_no.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
          )
        }

        const fallbackRes = await fallbackQuery
        if (fallbackRes.error) {
          console.error('Fallback expenses query failed:', fallbackRes.error)
          throw new Error(fallbackRes.error.message)
        }
        data = fallbackRes.data || []
      }

      // 3. Hydrate missing lookup metadata (category names, account names, flat codes, names)
      const categoryMap = new Map<string, string>()
      const accountMap = new Map<string, string>()
      const flatMap = new Map<string, { name: string; code: string }>()
      const profileMap = new Map<string, string>()

      const needsCat = data.some((r) => (!r.category || (Array.isArray(r.category) && !r.category[0])) && r.category_id)
      const needsAcc = data.some((r) => (!r.source_account || (Array.isArray(r.source_account) && !r.source_account[0])) && r.source_account_id)
      const needsFlat = data.some((r) => (!r.flat || (Array.isArray(r.flat) && !r.flat[0])) && r.flat_id)
      const needsProfile = data.some((r) => (!r.payer || (Array.isArray(r.payer) && !r.payer[0])) && r.paid_by)

      if (needsCat || needsAcc || needsFlat || needsProfile) {
        try {
          const [catsRes, accsRes, flatsRes, profsRes] = await Promise.all([
            needsCat ? supabase.from('expense_categories').select('id, name') : Promise.resolve({ data: [] }),
            needsAcc ? supabase.from('financial_accounts').select('id, account_name') : Promise.resolve({ data: [] }),
            needsFlat ? supabase.from('flats').select('id, name, flat_code') : Promise.resolve({ data: [] }),
            needsProfile ? supabase.from('profiles').select('id, full_name') : Promise.resolve({ data: [] }),
          ])
          catsRes.data?.forEach((c: any) => categoryMap.set(c.id, c.name))
          accsRes.data?.forEach((a: any) => accountMap.set(a.id, a.account_name))
          flatsRes.data?.forEach((f: any) => flatMap.set(f.id, { name: f.name, code: f.flat_code }))
          profsRes.data?.forEach((p: any) => profileMap.set(p.id, p.full_name))
        } catch (lookupErr) {
          console.warn('Metadata lookup warning:', lookupErr)
        }
      }

      let list = data.map((row: any) => {
        const cat = Array.isArray(row.category) ? row.category[0] : row.category
        const acc = Array.isArray(row.source_account) ? row.source_account[0] : row.source_account
        const fl = Array.isArray(row.flat) ? row.flat[0] : row.flat
        const bld = Array.isArray(row.building) ? row.building[0] : row.building
        const pyr = Array.isArray(row.payer) ? row.payer[0] : row.payer
        const app = Array.isArray(row.approver) ? row.approver[0] : row.approver

        return {
          ...row,
          category_name: cat?.name || categoryMap.get(row.category_id) || 'অনির্ধারিত',
          source_account_name: acc?.account_name || accountMap.get(row.source_account_id) || 'একাউন্ট',
          payer_name: pyr?.full_name || profileMap.get(row.paid_by) || 'ম্যানেজার',
          approver_name: app?.full_name || (row.approved_by ? profileMap.get(row.approved_by) : undefined),
          flat_name: fl?.name || flatMap.get(row.flat_id)?.name,
          flat_code: fl?.flat_code || flatMap.get(row.flat_id)?.code,
          building_name: bld?.name,
        }
      })

      // 4. Date Range Filter
      if (filters?.dateRange === 'TODAY') {
        const today = new Date().toISOString().slice(0, 10)
        list = list.filter((e) => e.expense_date === today)
      } else if (filters?.dateRange === 'THIS_MONTH') {
        const monthPrefix = new Date().toISOString().slice(0, 7)
        list = list.filter((e) => e.expense_date && e.expense_date.startsWith(monthPrefix))
      }

      return list
    },
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expense-categories'],
    queryFn: async (): Promise<ExpenseCategory[]> => {
      if (!isSupabaseConfigured) {
        return getStoredExpenseCategories()
      }

      try {
        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('is_active', true)
          .order('name')

        if (!error && data && data.length > 0) {
          const stored = getStoredExpenseCategories()
          const dbNames = new Set(data.map((d: any) => d.name.toLowerCase()))
          const extra = stored.filter((s) => !dbNames.has(s.name.toLowerCase()))
          return [...(data as ExpenseCategory[]), ...extra]
        }
      } catch (err) {
        console.warn('Expense categories fetch error, falling back:', err)
      }

      return getStoredExpenseCategories()
    },
  })
}

export function useExpenseAccounts() {
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
          .order('account_type')

        if (!error && data && data.length > 0) {
          return data as FinancialAccount[]
        }
      } catch (err) {
        console.warn('Expense accounts fetch error:', err)
      }

      return MOCK_ACCOUNTS
    },
  })
}

export function useExpenseFlats() {
  return useQuery({
    queryKey: ['flats-list'],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return MOCK_FLATS
      }

      try {
        const { data, error } = await supabase
          .from('flats')
          .select('*, building:buildings(*)')
          .eq('status', 'ACTIVE')
          .order('flat_code')

        if (!error && data) {
          return data
        }
      } catch (err) {
        console.warn('Flats with building join failed, falling back to base select:', err)
      }

      const { data: baseData, error: baseErr } = await supabase
        .from('flats')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('flat_code')

      if (baseErr) throw new Error(baseErr.message)
      return baseData || []
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

export function useRecordExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordExpenseInput) => {
      let attachmentUrl = input.voucherAttachmentUrl || null

      // If user uploaded a physical file, upload to storage
      if (input.voucherFile) {
        attachmentUrl = await uploadVoucherFile(input.voucherFile)
      }

      if (!isSupabaseConfigured) {
        const voucherNo = `EXP-${Math.floor(5000 + MOCK_EXPENSES.length + 1).toString().padStart(6, '0')}`
        const categories = getStoredExpenseCategories()
        const cat = categories.find((c) => c.id === input.categoryId)
        const acc = MOCK_ACCOUNTS.find((a) => a.id === input.sourceAccountId)
        const flat = MOCK_FLATS.find((f) => f.id === input.flatId)

        const newExpense: ExtendedExpense = {
          id: `exp-${Date.now()}`,
          expense_voucher_no: voucherNo,
          category_id: input.categoryId,
          category_name: cat?.name || 'খরচ',
          amount: input.amount,
          source_account_id: input.sourceAccountId,
          source_account_name: acc?.account_name || 'ক্যাশ ড্রয়ার',
          building_id: input.buildingId || flat?.building_id || null,
          building_name: flat?.building?.name || 'সানফ্লাওয়ার হোস্টেল',
          flat_id: input.flatId || null,
          flat_name: flat?.name,
          flat_code: flat?.flat_code,
          expense_date: input.expenseDate,
          description: input.description,
          voucher_attachment_url: attachmentUrl,
          paid_by: 'usr-mgr1',
          payer_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          approval_status: 'PENDING',
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // Deduct from mock account balance
        if (acc) {
          acc.current_balance = Math.max(0, acc.current_balance - input.amount)
        }

        MOCK_EXPENSES = [newExpense, ...MOCK_EXPENSES]

        return {
          success: true,
          expense: newExpense,
          voucher_number: voucherNo,
        }
      }

      let resolvedCategoryId = toValidExpenseUUID(input.categoryId)

      if (isSupabaseConfigured) {
        // Reconcile category with Supabase to guarantee foreign key integrity
        const localCat = getStoredExpenseCategories().find(
          (c) => c.id === input.categoryId || c.id === resolvedCategoryId
        )
        const catName = localCat?.name || 'General Expense'

        try {
          // If a category with the same name exists in Supabase, use its exact remote UUID
          const { data: dbCatByName } = await supabase
            .from('expense_categories')
            .select('id')
            .ilike('name', catName)
            .maybeSingle()

          if (dbCatByName?.id && isUUID(dbCatByName.id)) {
            resolvedCategoryId = dbCatByName.id
          } else {
            // Check if resolvedCategoryId exists by ID in Supabase
            const { data: dbCatById } = await supabase
              .from('expense_categories')
              .select('id')
              .eq('id', resolvedCategoryId)
              .maybeSingle()

            if (!dbCatById?.id) {
              const { data: upserted } = await supabase
                .from('expense_categories')
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

        // Try simplified expense RPC first
        try {
          const { data, error } = await supabase.rpc('fn_record_simplified_expense', {
            p_expense_scope: input.expenseScope || 'HOSTEL_MISC',
            p_category_id: resolvedCategoryId,
            p_amount: input.amount,
            p_source_account_id: input.sourceAccountId,
            p_building_id: input.buildingId || null,
            p_flat_id: input.flatId || null,
            p_expense_date: input.expenseDate,
            p_billing_month: input.billingMonth || null,
            p_vendor_name: input.vendorName || null,
            p_description: input.description,
            p_voucher_attachment_url: attachmentUrl,
          })

          if (!error && data) return data
        } catch (err) {
          console.warn('fn_record_simplified_expense not yet present, falling back:', err)
        }

        // Fallback to fn_record_expense
        const { data, error } = await supabase.rpc('fn_record_expense', {
          p_category_id: resolvedCategoryId,
          p_amount: input.amount,
          p_source_account_id: input.sourceAccountId,
          p_building_id: input.buildingId || null,
          p_flat_id: input.flatId || null,
          p_expense_date: input.expenseDate,
          p_description: input.description,
          p_voucher_attachment_url: attachmentUrl,
        })

        if (error) {
          throw new Error(error.message || 'খরচ এন্ট্রি সম্পন্ন করতে ব্যর্থ হয়েছে।')
        }

        return data
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

export function useReviewExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ReviewExpenseInput) => {
      if (!isSupabaseConfigured) {
        MOCK_EXPENSES = MOCK_EXPENSES.map((e) => {
          if (e.id === input.expenseId) {
            const updated = {
              ...e,
              approval_status: input.status,
              approved_by: 'usr-admin1',
              approver_name: 'সুপার এডমিন (ওনার)',
              approved_at: new Date().toISOString(),
              rejection_reason: input.status === 'REJECTED' ? input.rejectionReason || null : null,
              updated_at: new Date().toISOString(),
            }

            // If rejected, restore mock account balance
            if (input.status === 'REJECTED') {
              const acc = MOCK_ACCOUNTS.find((a) => a.id === e.source_account_id)
              if (acc) {
                acc.current_balance += e.amount
              }
            }

            return updated
          }
          return e
        })

        return {
          success: true,
          expense_id: input.expenseId,
          status: input.status,
        }
      }

      const { data, error } = await supabase.rpc('fn_review_expense', {
        p_expense_id: input.expenseId,
        p_status: input.status,
        p_rejection_reason: input.rejectionReason || null,
      })

      if (error) {
        throw new Error(error.message || 'খরচ অনুমোদন/বাতিল করতে ব্যর্থ হয়েছে।')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
    },
  })
}

export interface CreateExpenseCategoryInput {
  name: string
  description?: string
  isActive?: boolean
}

export function useCreateExpenseCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateExpenseCategoryInput): Promise<ExpenseCategory> => {
      const trimmedName = input.name.trim()
      if (!trimmedName) {
        throw new Error('ক্যাটাগরির নাম দেওয়া আবশ্যক।')
      }

      const allCategories = getStoredExpenseCategories()
      if (allCategories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`"${trimmedName}" নামের ব্যয়ের খাত ইতিমধ্যে বিদ্যমান রয়েছে।`)
      }

      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('expense_categories')
            .insert({
              name: trimmedName,
              description: input.description?.trim() || null,
              is_active: input.isActive ?? true,
            })
            .select()
            .single()

          if (!error && data) {
            saveStoredExpenseCategory(data as ExpenseCategory)
            return data as ExpenseCategory
          }
          if (error) {
            console.warn('Supabase expense category insert error, fallback to local:', error)
          }
        } catch (err) {
          console.warn('Supabase expense category insert exception:', err)
        }
      }

      const newCategory: ExpenseCategory = {
        id: generateUUID(),
        name: trimmedName,
        description: input.description?.trim() || null,
        is_active: input.isActive ?? true,
        created_at: new Date().toISOString(),
      }

      saveStoredExpenseCategory(newCategory)
      return newCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
    },
  })
}

// ==============================================================================
// Flat-wise Miscellaneous Expense Seat Distribution Hooks
// ==============================================================================

export function useFlatMonthlyDistribution(flatId?: string, billingMonth?: string) {
  return useQuery({
    queryKey: ['flat-monthly-distribution', flatId, billingMonth],
    enabled: Boolean(flatId && billingMonth),
    queryFn: async () => {
      if (!isSupabaseConfigured || !flatId || !billingMonth) {
        return null
      }
      const normMonth = `${billingMonth.slice(0, 7)}-01`
      const { data, error } = await supabase
        .from('flat_monthly_distributions')
        .select('*')
        .eq('flat_id', flatId)
        .eq('billing_month', normMonth)
        .maybeSingle()

      if (error) return null
      return data
    },
  })
}

export function useCalculateFlatDistributionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ flatId, billingMonth }: { flatId: string; billingMonth: string }) => {
      const normMonth = `${billingMonth.slice(0, 7)}-01`
      if (!isSupabaseConfigured) {
        return {
          success: true,
          total_expense: 4500,
          total_seats: 10,
          per_seat_amount: 450,
          message: 'ডেমো মোডে হিসাব সম্পন্ন: ৪,৫০০ ÷ ১০ = ৪৫০ টাকা।',
        }
      }
      const { data, error } = await supabase.rpc('fn_calculate_flat_monthly_distribution', {
        p_flat_id: flatId,
        p_billing_month: normMonth,
      })
      if (error) throw new Error(error.message || 'ফ্ল্যাট বিবিধ খরচ গণনা করতে ব্যর্থ।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flat-monthly-distribution'] })
    },
  })
}

export function useApplyFlatChargesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ distributionId, dueDate }: { distributionId: string; dueDate?: string }) => {
      if (!isSupabaseConfigured) {
        return { success: true, message: 'ডেমো মোডে বর্ডার বিলে যোগ সম্পন্ন হয়েছে।' }
      }
      const { data, error } = await supabase.rpc('fn_apply_flat_monthly_charges', {
        p_distribution_id: distributionId,
        p_due_date: dueDate || null,
      })
      if (error) throw new Error(error.message || 'বর্ডার বিলে যোগ করতে ব্যর্থ।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flat-monthly-distribution'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
    },
  })
}



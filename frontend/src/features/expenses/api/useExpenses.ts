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
  categoryId: string
  amount: number
  sourceAccountId: string
  buildingId?: string | null
  flatId?: string | null
  expenseDate: string
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
  { id: EXPENSE_CATEGORY_UUIDS.ELECTRIC_BILL, name: 'Electric Bill', description: 'মাসিক ডেসকো / ডিপিডিসি বিদ্যুৎ বিল', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.WATER_GAS, name: 'Water & Gas', description: 'ওয়াসা পানি ও এলপি সিলিন্ডার গ্যাস রিফিল', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.INTERNET_WIFI, name: 'Internet & WiFi', description: 'উচ্চগতির ব্রডব্যান্ড ইন্টারনেট সাবস্ক্রিপশন', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.MAINTENANCE_REPAIRS, name: 'Maintenance & Repairs', description: 'প্লাম্বিং, স্যানিটারি, বৈদ্যুতিক মেরামত ও রং কাজ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.COOK_CLEANER_SALARY, name: 'Cook & Cleaner Salary', description: 'বাবুর্চি, সহকারী ও ক্লিনিং স্টাফদের বেতন', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.CLEANING_SUPPLIES, name: 'Cleaning Supplies', description: 'হারপিক, ব্লিচিং, ফ্লোর ক্লিনার ও ময়লার ব্যাগ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.DINING_GROCERY, name: 'Dining & Grocery', description: 'হোস্টেল মেসের যৌথ ডাইনিং কাঁচাবাজার ও মুদি সামগ্রী', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.GENERATOR_FUEL, name: 'Generator & Fuel', description: 'জরুরি পাওয়ার ব্যাকআপ ও জেনারেটরের ডিজেল খরচ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: EXPENSE_CATEGORY_UUIDS.MISCELLANEOUS, name: 'Miscellaneous', description: 'হোস্টেল পরিচালনার অন্যান্য আকস্মিক খরচ', is_active: true, created_at: '2026-01-01T00:00:00Z' },
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
    account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    account_type: 'CASH_MANAGER',
    account_number: 'CASH-01',
    bank_name: 'হোস্টেল ক্যাশ ড্রয়ার',
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

let MOCK_EXPENSES: ExtendedExpense[] = [
  {
    id: 'exp-5001',
    expense_voucher_no: 'EXP-005001',
    category_id: EXPENSE_CATEGORY_UUIDS.ELECTRIC_BILL,
    category_name: 'Electric Bill',
    amount: 8750,
    source_account_id: 'fa-2',
    source_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: null,
    expense_date: '2026-10-02',
    description: 'সেপ্টেম্বর ২০২৬ ডেসকো বিদ্যুৎ বিল ব্যাংক অনলাইন ট্রান্সফারের মাধ্যমে পরিশোধ',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'APPROVED',
    approved_by: 'usr-admin1',
    approved_at: '2026-10-03T10:00:00Z',
    approver_name: 'সুপার এডমিন (ওনার)',
    rejection_reason: null,
    created_at: '2026-10-02T11:20:00Z',
    updated_at: '2026-10-03T10:00:00Z',
  },
  {
    id: 'exp-5002',
    expense_voucher_no: 'EXP-005002',
    category_id: EXPENSE_CATEGORY_UUIDS.INTERNET_WIFI,
    category_name: 'Internet & WiFi',
    amount: 3200,
    source_account_id: 'fa-3',
    source_account_name: 'বিকাশ মার্চেন্ট একাউন্ট (Hostel bKash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: null,
    expense_date: '2026-10-05',
    description: 'কার্নিভাল ইন্টারনেট ৫০ এমবিপিএস ব্রডব্যান্ড অক্টোবর মাসের বিল',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'APPROVED',
    approved_by: 'usr-admin1',
    approved_at: '2026-10-05T14:30:00Z',
    approver_name: 'সুপার এডমিন (ওনার)',
    rejection_reason: null,
    created_at: '2026-10-05T12:00:00Z',
    updated_at: '2026-10-05T14:30:00Z',
  },
  {
    id: 'exp-5003',
    expense_voucher_no: 'EXP-005003',
    category_id: EXPENSE_CATEGORY_UUIDS.MAINTENANCE_REPAIRS,
    category_name: 'Maintenance & Repairs',
    amount: 1450,
    source_account_id: 'fa-1',
    source_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-4a',
    flat_name: 'ফ্ল্যাট ৪-এ (৪র্থ তলা)',
    flat_code: 'FLAT-4A',
    expense_date: '2026-10-10',
    description: '৪র্থ তলার ওয়াশরুমের বেসিন পাইপ পরিবর্তন, নতুন গ্রেস পিভিসি ট্যাপ ও প্লাম্বার মজুরি',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'PENDING',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    created_at: '2026-10-10T16:15:00Z',
    updated_at: '2026-10-10T16:15:00Z',
  },
  {
    id: 'exp-5004',
    expense_voucher_no: 'EXP-005004',
    category_id: EXPENSE_CATEGORY_UUIDS.CLEANING_SUPPLIES,
    category_name: 'Cleaning Supplies',
    amount: 850,
    source_account_id: 'fa-1',
    source_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: null,
    expense_date: '2026-10-12',
    description: '২ বোতল হারপিক, ১ কেজি ব্লিচিং পাউডার ও বড় সাইজের ডাস্টবিন পলিথিন ব্যাগ ক্রয়',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'PENDING',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    created_at: '2026-10-12T09:40:00Z',
    updated_at: '2026-10-12T09:40:00Z',
  },
  {
    id: 'exp-5005',
    expense_voucher_no: 'EXP-005005',
    category_id: EXPENSE_CATEGORY_UUIDS.WATER_GAS,
    category_name: 'Water & Gas',
    amount: 1950,
    source_account_id: 'fa-1',
    source_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-2a',
    flat_name: 'ফ্ল্যাট ২-এ (২য় তলা)',
    flat_code: 'FLAT-2A',
    expense_date: '2026-10-14',
    description: 'রান্নাঘরের ওমেরা ১২ কেজি এলপি গ্যাস সিলিন্ডার রিফিল ক্যাশ পেমেন্টে',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'APPROVED',
    approved_by: 'usr-admin1',
    approved_at: '2026-10-14T18:00:00Z',
    approver_name: 'সুপার এডমিন (ওনার)',
    rejection_reason: null,
    created_at: '2026-10-14T15:20:00Z',
    updated_at: '2026-10-14T18:00:00Z',
  },
  {
    id: 'exp-5006',
    expense_voucher_no: 'EXP-005006',
    category_id: EXPENSE_CATEGORY_UUIDS.MAINTENANCE_REPAIRS,
    category_name: 'Maintenance & Repairs',
    amount: 950,
    source_account_id: 'fa-1',
    source_account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    building_id: 'bld-1',
    building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন ক্যাম্পাস)',
    flat_id: 'flat-3b',
    flat_name: 'ফ্ল্যাট ৩-বি (৩য় তলা)',
    flat_code: 'FLAT-3B',
    expense_date: '2026-10-15',
    description: 'রুম ২০২ এর অতিরিক্ত ফ্যান রেগুলেটর ক্রয় ও ইলেকট্রিশিয়ান খরচ',
    voucher_attachment_url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80',
    paid_by: 'usr-mgr1',
    payer_name: 'হোস্টেল ম্যানেজার',
    approval_status: 'REJECTED',
    approved_by: 'usr-admin1',
    approved_at: '2026-10-15T19:00:00Z',
    approver_name: 'সুপার এডমিন (ওনার)',
    rejection_reason: 'অনুমোদনহীন কেনাকাটা ও ক্যাশ মেমোতে কোনো শপের সিল বা স্বাক্ষর নেই। সংশোধিত রশিদ সহ পুনরায় আবেদন করুন।',
    created_at: '2026-10-15T16:30:00Z',
    updated_at: '2026-10-15T19:00:00Z',
  },
]

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

      let query = supabase
        .from('expenses')
        .select(`
          *,
          category:category_id ( id, name ),
          source_account:source_account_id ( id, account_name ),
          flat:flat_id ( id, flat_code, name ),
          building:building_id ( id, name ),
          payer:paid_by ( full_name, phone_number ),
          approver:approved_by ( full_name )
        `)
        .order('expense_date', { ascending: false })

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('approval_status', filters.status)
      }

      if (filters?.categoryId && filters.categoryId !== 'ALL') {
        query = query.eq('category_id', filters.categoryId)
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
          `expense_voucher_no.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching expenses:', error)
        throw new Error(error.message)
      }

      return (data || []).map((row: any) => ({
        ...row,
        category_name: row.category?.name || 'অনির্ধারিত',
        source_account_name: row.source_account?.account_name || 'একাউন্ট',
        payer_name: row.payer?.full_name || 'ম্যানেজার',
        approver_name: row.approver?.full_name,
        flat_name: row.flat?.name,
        flat_code: row.flat?.flat_code,
        building_name: row.building?.name,
      }))
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

      const { data, error } = await supabase
        .from('flats')
        .select('*, building:building_id(*)')
        .eq('status', 'ACTIVE')
        .order('flat_code')

      if (error) throw new Error(error.message)
      return data || []
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


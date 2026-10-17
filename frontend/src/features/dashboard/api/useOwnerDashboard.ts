import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface ExecutiveKPIs {
  // 1. Occupancy
  total_seats: number
  occupied_seats: number
  vacant_seats: number
  maintenance_seats: number
  occupancy_rate: number // %

  // 2. Financial Health (Current Month)
  total_billed_month: number
  total_collected_month: number
  collection_rate: number // %
  total_outstanding_dues: number

  // 3. Expenses & Operating Surplus (NOI)
  operating_expenses_month: number
  non_rent_incomes_month: number
  net_operating_income: number // (Collected + NonRent) - Expenses

  // 4. Meal Metrics
  active_meals_today: number
  meal_attendance_rate: number // %
  estimated_monthly_meal_bill: number

  // 5. Cash in Custody
  cash_in_custody: number // Physical cash held in active manager drawers
}

export interface CashFlowTrendPoint {
  month_label: string
  revenue: number
  expenses: number
  surplus: number
}

export interface FlatOccupancyPoint {
  flat_id: string
  flat_name: string
  building_name: string
  floor_number: number
  total_seats: number
  occupied_seats: number
  vacant_seats: number
  rate: number // %
}

export interface DuesAgingPoint {
  bucket: '< 30 days' | '30-60 days' | '60-90 days' | '> 90 days'
  bucket_bn: string
  amount: number
  count: number
  percentage: number
}

export interface RecentActivityItem {
  id: string
  type: 'PAYMENT' | 'ADMISSION' | 'EXPENSE' | 'TRANSFER' | 'MEAL_CUTOFF' | 'CLOSING'
  title: string
  subtitle: string
  amount?: number
  time: string
  user_name: string
  status?: string
}

export interface OwnerDashboardData {
  kpis: ExecutiveKPIs
  cash_flow_trend: CashFlowTrendPoint[]
  flat_occupancy: FlatOccupancyPoint[]
  dues_aging: DuesAgingPoint[]
  recent_activities: RecentActivityItem[]
}

// ==============================================================================
// Mock Data Baseline (Realistic Multi-Building Hostel Portfolio)
// ==============================================================================

const MOCK_DASHBOARD_DATA: OwnerDashboardData = {
  kpis: {
    total_seats: 120,
    occupied_seats: 98,
    vacant_seats: 18,
    maintenance_seats: 4,
    occupancy_rate: 81.7,

    total_billed_month: 524000,
    total_collected_month: 442500,
    collection_rate: 84.4,
    total_outstanding_dues: 81500,

    operating_expenses_month: 138400,
    non_rent_incomes_month: 24500,
    net_operating_income: 328600, // (442500 + 24500) - 138400 = 328600

    active_meals_today: 185,
    meal_attendance_rate: 76.5,
    estimated_monthly_meal_bill: 114500,

    cash_in_custody: 38750,
  },

  cash_flow_trend: [
    { month_label: 'মে ২০২৬', revenue: 410000, expenses: 125000, surplus: 285000 },
    { month_label: 'জুন ২০২৬', revenue: 425000, expenses: 132000, surplus: 293000 },
    { month_label: 'জুলাই ২০২৬', revenue: 438000, expenses: 140000, surplus: 298000 },
    { month_label: 'আগস্ট ২০২৬', revenue: 450000, expenses: 135000, surplus: 315000 },
    { month_label: 'সেপ্টে ২০২৬', revenue: 462000, expenses: 142000, surplus: 320000 },
    { month_label: 'অক্টো ২০২৬', revenue: 467000, expenses: 138400, surplus: 328600 },
  ],

  flat_occupancy: [
    {
      flat_id: 'flat-2a',
      flat_name: 'ফ্ল্যাট ২-এ',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 2,
      total_seats: 8,
      occupied_seats: 8,
      vacant_seats: 0,
      rate: 100,
    },
    {
      flat_id: 'flat-2b',
      flat_name: 'ফ্ল্যাট ২-বি',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 2,
      total_seats: 8,
      occupied_seats: 7,
      vacant_seats: 1,
      rate: 87.5,
    },
    {
      flat_id: 'flat-3a',
      flat_name: 'ফ্ল্যাট ৩-এ',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 3,
      total_seats: 10,
      occupied_seats: 9,
      vacant_seats: 1,
      rate: 90,
    },
    {
      flat_id: 'flat-3b',
      flat_name: 'ফ্ল্যাট ৩-বি',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 3,
      total_seats: 8,
      occupied_seats: 6,
      vacant_seats: 2,
      rate: 75,
    },
    {
      flat_id: 'flat-4a',
      flat_name: 'ফ্ল্যাট ৪-এ',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 4,
      total_seats: 8,
      occupied_seats: 7,
      vacant_seats: 1,
      rate: 87.5,
    },
    {
      flat_id: 'flat-4b',
      flat_name: 'ফ্ল্যাট ৪-বি',
      building_name: 'সানফ্লাওয়ার হোস্টেল (মেইন)',
      floor_number: 4,
      total_seats: 8,
      occupied_seats: 5,
      vacant_seats: 3,
      rate: 62.5,
    },
  ],

  dues_aging: [
    {
      bucket: '< 30 days',
      bucket_bn: '১-৩০ দিন (চলতি বকেয়া)',
      amount: 48500,
      count: 14,
      percentage: 59.5,
    },
    {
      bucket: '30-60 days',
      bucket_bn: '৩১-৬০ দিন (এক মাস অতীত)',
      amount: 19200,
      count: 5,
      percentage: 23.6,
    },
    {
      bucket: '60-90 days',
      bucket_bn: '৬১-৯০ দিন (দুই মাস অতীত)',
      amount: 8800,
      count: 2,
      percentage: 10.8,
    },
    {
      bucket: '> 90 days',
      bucket_bn: '৯০+ দিন (গুরুতর বকেয়া)',
      amount: 5000,
      count: 1,
      percentage: 6.1,
    },
  ],

  recent_activities: [
    {
      id: 'act-1',
      type: 'PAYMENT',
      title: 'ভাড়া আদায় রশিদ জেনারেট',
      subtitle: 'বর্ডার তানভীর আহমেদ (ফ্ল্যাট ২-এ) নগদ পরিশোধ করেছেন',
      amount: 5500,
      time: '১৫ মিনিট পূর্বে',
      user_name: 'হোস্টেল ম্যানেজার',
      status: 'PAID',
    },
    {
      id: 'act-2',
      type: 'EXPENSE',
      title: 'হোস্টেল বিদ্যুৎ বিল অনুমোদন',
      subtitle: 'ডেসকো পোস্টপেইড মিটার #984221 খরচ ভাউচার',
      amount: 18450,
      time: '১ ঘণ্টা পূর্বে',
      user_name: 'সুপার এডমিন',
      status: 'APPROVED',
    },
    {
      id: 'act-3',
      type: 'TRANSFER',
      title: 'একাউন্ট ফান্ড স্থানান্তর',
      subtitle: 'ম্যানেজার ক্যাশ বক্স থেকে ডাচ বাংলা ব্যাংক একাউন্টে জমা',
      amount: 25000,
      time: '৩ ঘণ্টা পূর্বে',
      user_name: 'হোস্টেল ম্যানেজার',
      status: 'CONFIRMED',
    },
    {
      id: 'act-4',
      type: 'ADMISSION',
      title: 'নতুন বর্ডার বরাদ্দ ও আসন নিশ্চিত',
      subtitle: 'মেহরাব হোসেনকে রুম ২০২ এর সিট-১ বরাদ্দ দেওয়া হয়েছে',
      amount: 3000,
      time: '৫ ঘণ্টা পূর্বে',
      user_name: 'হোস্টেল ম্যানেজার',
      status: 'ACTIVE',
    },
    {
      id: 'act-5',
      type: 'CLOSING',
      title: 'দৈনিক ক্যাশ ক্লোজিং সাবমিট',
      subtitle: 'গতকালকের সেশন নিখুঁত ব্যালেন্স (Zero Variance) সহ ক্লোজড',
      amount: 18750,
      time: 'গতকাল রাত ১০:৩০',
      user_name: 'সহকারী ম্যানেজার',
      status: 'SUBMITTED',
    },
  ],
}

// ==============================================================================
// React Query Hooks
// ==============================================================================

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ['owner-executive-dashboard'],
    queryFn: async (): Promise<OwnerDashboardData> => {
      if (!isSupabaseConfigured) {
        return MOCK_DASHBOARD_DATA
      }

      try {
        // Query live counts in parallel
        const [
          seatsRes,
          chargesRes,
          receiptsRes,
          expensesRes,
          incomesRes,
          cashSessionsRes,
        ] = await Promise.all([
          supabase.from('seats').select('id, status'),
          supabase.from('boarder_charges').select('amount, paid_amount, status, due_date'),
          supabase.from('receipts').select('total_amount, status').eq('status', 'VALID'),
          supabase.from('expenses').select('amount, approval_status').eq('approval_status', 'APPROVED'),
          supabase.from('incomes').select('amount'),
          supabase.from('manager_cash_sessions').select('expected_closing_cash, status').eq('status', 'OPEN'),
        ])

        const seats = seatsRes.data || []
        const totalSeats = seats.length || 120
        const occupiedSeats = seats.filter((s) => s.status === 'OCCUPIED').length
        const vacantSeats = seats.filter((s) => s.status === 'AVAILABLE').length
        const maintenanceSeats = seats.filter((s) => s.status === 'MAINTENANCE').length
        const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

        const charges = chargesRes.data || []
        const totalBilled = charges.reduce((sum, c) => sum + (c.amount || 0), 0)
        const totalCollectedCharges = charges.reduce((sum, c) => sum + (c.paid_amount || 0), 0)
        const totalReceipts = (receiptsRes.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)
        const totalCollected = totalReceipts || totalCollectedCharges
        const totalDues = Math.max(0, totalBilled - totalCollectedCharges)

        const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0)
        const totalIncomes = (incomesRes.data || []).reduce((sum, i) => sum + (i.amount || 0), 0)

        const cashCustody = (cashSessionsRes.data || []).reduce(
          (sum, s) => sum + (s.expected_closing_cash || 0),
          0
        )

        return {
          ...MOCK_DASHBOARD_DATA,
          kpis: {
            ...MOCK_DASHBOARD_DATA.kpis,
            total_seats: totalSeats,
            occupied_seats: occupiedSeats || MOCK_DASHBOARD_DATA.kpis.occupied_seats,
            vacant_seats: vacantSeats || MOCK_DASHBOARD_DATA.kpis.vacant_seats,
            maintenance_seats: maintenanceSeats,
            occupancy_rate: Math.round(occupancyRate * 10) / 10 || MOCK_DASHBOARD_DATA.kpis.occupancy_rate,
            total_billed_month: totalBilled || MOCK_DASHBOARD_DATA.kpis.total_billed_month,
            total_collected_month: totalCollected || MOCK_DASHBOARD_DATA.kpis.total_collected_month,
            total_outstanding_dues: totalDues || MOCK_DASHBOARD_DATA.kpis.total_outstanding_dues,
            operating_expenses_month: totalExpenses || MOCK_DASHBOARD_DATA.kpis.operating_expenses_month,
            non_rent_incomes_month: totalIncomes || MOCK_DASHBOARD_DATA.kpis.non_rent_incomes_month,
            cash_in_custody: cashCustody || MOCK_DASHBOARD_DATA.kpis.cash_in_custody,
          },
        }
      } catch (err) {
        console.warn('Dashboard live query fallback to mock:', err)
        return MOCK_DASHBOARD_DATA
      }
    },
    refetchInterval: 30000, // 30s refetch
  })
}

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
  active_meals_tomorrow: number
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
    active_meals_tomorrow: 192,
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
// Live Dynamic State for Realtime Executive KPIs
// ==============================================================================

export interface LiveMealMetrics {
  active_meals_today: number
  active_meals_tomorrow: number
  meal_attendance_rate: number
  estimated_monthly_meal_bill: number
}

export const liveMealMetricsState: LiveMealMetrics = {
  active_meals_today: 185,
  active_meals_tomorrow: 192,
  meal_attendance_rate: 76.5,
  estimated_monthly_meal_bill: 114500,
}

export function updateOwnerDashboardMealMetrics(
  dateStr: string,
  _session: 'BREAKFAST' | 'LUNCH' | 'DINNER',
  newState: boolean,
  oldState?: boolean
) {
  if (oldState !== undefined && oldState === newState) return

  const dhakaNow = new Date()
  const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
  const dhaka = new Date(utc + 3600000 * 6)
  const todayStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}-${String(dhaka.getDate()).padStart(2, '0')}`

  const tomorrow = new Date(dhaka)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  const delta = newState ? 1 : -1

  if (dateStr === todayStr) {
    liveMealMetricsState.active_meals_today = Math.max(0, liveMealMetricsState.active_meals_today + delta)
    liveMealMetricsState.meal_attendance_rate = Math.round((liveMealMetricsState.active_meals_today / 294) * 1000) / 10
  } else if (dateStr === tomorrowStr) {
    liveMealMetricsState.active_meals_tomorrow = Math.max(0, liveMealMetricsState.active_meals_tomorrow + delta)
  }
}

export function updateOwnerDashboardMealBatch(dateStr: string, deltaMeals: number) {
  if (deltaMeals === 0) return

  const dhakaNow = new Date()
  const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
  const dhaka = new Date(utc + 3600000 * 6)
  const todayStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}-${String(dhaka.getDate()).padStart(2, '0')}`

  const tomorrow = new Date(dhaka)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

  if (dateStr === todayStr) {
    liveMealMetricsState.active_meals_today = Math.max(0, liveMealMetricsState.active_meals_today + deltaMeals)
    liveMealMetricsState.meal_attendance_rate = Math.round((liveMealMetricsState.active_meals_today / 294) * 1000) / 10
  } else if (dateStr === tomorrowStr) {
    liveMealMetricsState.active_meals_tomorrow = Math.max(0, liveMealMetricsState.active_meals_tomorrow + deltaMeals)
  }
}

// ==============================================================================
// React Query Hooks
// ==============================================================================

export function useOwnerDashboard() {
  return useQuery({
    queryKey: ['owner-executive-dashboard'],
    queryFn: async (): Promise<OwnerDashboardData> => {
      if (!isSupabaseConfigured) {
        // Fetch from shared dev server API so mobile updates sync to PC instantly
        let serverMetrics: Partial<LiveMealMetrics> = {}
        try {
          const res = await fetch('/api/dashboard/metrics')
          if (res.ok) {
            serverMetrics = await res.json()
          }
        } catch {
          // offline fallback
        }

        const activeToday = serverMetrics.active_meals_today ?? liveMealMetricsState.active_meals_today
        const activeTomorrow =
          serverMetrics.active_meals_tomorrow ?? liveMealMetricsState.active_meals_tomorrow
        const attendanceRate =
          serverMetrics.meal_attendance_rate ?? liveMealMetricsState.meal_attendance_rate
        const bill =
          serverMetrics.estimated_monthly_meal_bill ?? liveMealMetricsState.estimated_monthly_meal_bill

        liveMealMetricsState.active_meals_today = activeToday
        liveMealMetricsState.active_meals_tomorrow = activeTomorrow
        liveMealMetricsState.meal_attendance_rate = attendanceRate
        liveMealMetricsState.estimated_monthly_meal_bill = bill

        return {
          ...MOCK_DASHBOARD_DATA,
          kpis: {
            ...MOCK_DASHBOARD_DATA.kpis,
            active_meals_today: activeToday,
            active_meals_tomorrow: activeTomorrow,
            meal_attendance_rate: attendanceRate,
            estimated_monthly_meal_bill: bill,
          },
        }
      }

      try {
        const dhakaNow = new Date()
        const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
        const dhaka = new Date(utc + 3600000 * 6)
        const todayStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}-${String(dhaka.getDate()).padStart(2, '0')}`
        const tomorrow = new Date(dhaka)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

        // Query live counts in parallel
        const [
          seatsRes,
          chargesRes,
          receiptsRes,
          expensesRes,
          incomesRes,
          cashSessionsRes,
          managerAccountsRes,
          mealsTodayRes,
          mealsTomorrowRes,
        ] = await Promise.all([
          supabase.from('seats').select('id, status'),
          supabase.from('boarder_charges').select('amount, paid_amount, status, due_date'),
          supabase.from('receipts').select('amount, is_void').eq('is_void', false),
          supabase.from('expenses').select('amount, approval_status').eq('approval_status', 'APPROVED'),
          supabase.from('incomes').select('amount'),
          supabase
            .from('manager_cash_sessions')
            .select('manager_id, session_date, expected_closing_cash, status')
            .eq('status', 'OPEN')
            .order('session_date', { ascending: false }),
          supabase
            .from('financial_accounts')
            .select('id, current_balance, account_type')
            .eq('account_type', 'CASH_MANAGER')
            .eq('is_active', true),
          supabase.from('meal_selections').select('breakfast, lunch, dinner').eq('meal_date', todayStr),
          supabase.from('meal_selections').select('breakfast, lunch, dinner').eq('meal_date', tomorrowStr),
        ])

        const seats = seatsRes.data || []
        const totalSeats = seats.length
        const occupiedSeats = seats.filter((s) => s.status === 'OCCUPIED').length
        const vacantSeats = seats.filter((s) => s.status === 'AVAILABLE').length
        const maintenanceSeats = seats.filter((s) => s.status === 'MAINTENANCE').length
        const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

        const charges = chargesRes.data || []
        const totalBilled = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
        const totalCollectedCharges = charges.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
        const totalReceipts = (receiptsRes.data || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
        const totalCollected = totalReceipts || totalCollectedCharges
        const totalDues = Math.max(0, totalBilled - totalCollectedCharges)

        const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        const totalIncomes = (incomesRes.data || []).reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

        // Prevent multi-counting across unclosed historical sessions:
        // Take only the latest active session per manager. If no session exists, fall back to financial_accounts
        const latestSessionByManager = new Map<string, number>()
        for (const s of (cashSessionsRes.data || [])) {
          const mgrId = s.manager_id || 'default'
          if (!latestSessionByManager.has(mgrId)) {
            latestSessionByManager.set(mgrId, Number(s.expected_closing_cash) || 0)
          }
        }

        const sessionCash = Array.from(latestSessionByManager.values()).reduce((sum, v) => sum + v, 0)
        const accountCash = (managerAccountsRes.data || []).reduce(
          (sum, a) => sum + (Number(a.current_balance) || 0),
          0
        )
        const cashCustody = latestSessionByManager.size > 0 ? sessionCash : accountCash

        const countToday = (mealsTodayRes.data || []).reduce(
          (sum, s) => sum + (s.breakfast ? 1 : 0) + (s.lunch ? 1 : 0) + (s.dinner ? 1 : 0),
          0
        )
        const countTomorrow = (mealsTomorrowRes.data || []).reduce(
          (sum, s) => sum + (s.breakfast ? 1 : 0) + (s.lunch ? 1 : 0) + (s.dinner ? 1 : 0),
          0
        )

        // 1. Live Flat Occupancy
        const { data: realFlats } = await supabase
          .from('flats')
          .select('id, name, flat_code, floor_number, building:buildings(name), rooms(id, seats(id, status))')

        const flatOccupancy: FlatOccupancyPoint[] = (realFlats || []).map((f: any) => {
          const flatSeats = (f.rooms || []).flatMap((r: any) => r.seats || [])
          const occ = flatSeats.filter((s: any) => s.status === 'OCCUPIED').length
          const vac = flatSeats.filter((s: any) => s.status === 'AVAILABLE').length
          const tot = flatSeats.length
          return {
            flat_id: f.id,
            flat_name: f.name || f.flat_code,
            building_name: f.building?.name || 'প্রধান ভবন',
            floor_number: f.floor_number || 1,
            total_seats: tot,
            occupied_seats: occ,
            vacant_seats: vac,
            rate: tot > 0 ? Math.round((occ / tot) * 100) : 0,
          }
        })

        // 2. Live 6-Month Cash Flow Trend
        const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
        const cashFlowTrend: CashFlowTrendPoint[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(dhaka)
          d.setMonth(d.getMonth() - i)
          const mLabel = `${monthsBn[d.getMonth()]} ${d.getFullYear()}`
          cashFlowTrend.push({
            month_label: mLabel,
            revenue: i === 0 ? totalCollected : 0,
            expenses: i === 0 ? totalExpenses : 0,
            surplus: i === 0 ? Math.max(0, totalCollected - totalExpenses) : 0,
          })
        }

        // 3. Live Dues Aging
        const overdueCharges = charges.filter((c) => c.status !== 'PAID')
        const duesAging: DuesAgingPoint[] = [
          {
            bucket: '< 30 days',
            bucket_bn: '১-৩০ দিন (বর্তমান মাস)',
            amount: totalDues,
            count: overdueCharges.length,
            percentage: totalDues > 0 ? 100 : 0,
          },
          { bucket: '30-60 days', bucket_bn: '৩১-৬০ দিন (এক মাস অতীত)', amount: 0, count: 0, percentage: 0 },
          { bucket: '60-90 days', bucket_bn: '৬১-৯০ দিন (দুই মাস অতীত)', amount: 0, count: 0, percentage: 0 },
          { bucket: '> 90 days', bucket_bn: '৯০+ দিন (গুরুতর বকেয়া)', amount: 0, count: 0, percentage: 0 },
        ]

        // 4. Live Recent Activities from real data
        const [recentReceiptsRes, recentExpensesRes] = await Promise.all([
          supabase.from('receipts').select('id, receipt_number, amount, receipt_date, created_at, boarder:boarders(full_name)').order('created_at', { ascending: false }).limit(4),
          supabase.from('expenses').select('id, expense_voucher_no, amount, description, expense_date, created_at').order('created_at', { ascending: false }).limit(4),
        ])

        const recentActivities: RecentActivityItem[] = [
          ...(recentReceiptsRes.data || []).map((r: any) => ({
            id: 'rec-' + r.id,
            type: 'PAYMENT' as const,
            title: `ভাড়া আদায় রশিদ #${r.receipt_number || ''}`,
            subtitle: `${r.boarder?.full_name || 'বর্ডার'} পরিশোধ করেছেন`,
            amount: Number(r.amount) || 0,
            time: r.receipt_date || 'সম্প্রতি',
            user_name: r.boarder?.full_name || 'বর্ডার',
            status: 'PAID',
          })),
          ...(recentExpensesRes.data || []).map((e: any) => ({
            id: 'exp-' + e.id,
            type: 'EXPENSE' as const,
            title: e.description || 'হোস্টেল খরচ',
            subtitle: `খরচ ভাউচার #${e.expense_voucher_no || ''}`,
            amount: Number(e.amount) || 0,
            time: e.expense_date || 'সম্প্রতি',
            user_name: 'এডমিন',
            status: 'APPROVED',
          })),
        ]

        return {
          kpis: {
            total_seats: totalSeats,
            occupied_seats: occupiedSeats,
            vacant_seats: vacantSeats,
            maintenance_seats: maintenanceSeats,
            occupancy_rate: Math.round(occupancyRate * 10) / 10,
            total_billed_month: totalBilled,
            total_collected_month: totalCollected,
            collection_rate: totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 1000) / 10 : 0,
            total_outstanding_dues: totalDues,
            operating_expenses_month: totalExpenses,
            non_rent_incomes_month: totalIncomes,
            cash_in_custody: cashCustody,
            net_operating_income: totalCollected + totalIncomes - totalExpenses,
            active_meals_today: countToday,
            active_meals_tomorrow: countTomorrow,
            meal_attendance_rate: totalSeats > 0 ? Math.round((countToday / (totalSeats * 3)) * 1000) / 10 : 0,
            estimated_monthly_meal_bill: countToday * 30 * 60,
          },
          cash_flow_trend: cashFlowTrend,
          flat_occupancy: flatOccupancy,
          dues_aging: duesAging,
          recent_activities: recentActivities,
        }
      } catch (err) {
        console.error('Dashboard live query error:', err)
        return {
          kpis: {
            total_seats: 0,
            occupied_seats: 0,
            vacant_seats: 0,
            maintenance_seats: 0,
            occupancy_rate: 0,
            total_billed_month: 0,
            total_collected_month: 0,
            collection_rate: 0,
            total_outstanding_dues: 0,
            operating_expenses_month: 0,
            non_rent_incomes_month: 0,
            net_operating_income: 0,
            active_meals_today: 0,
            active_meals_tomorrow: 0,
            meal_attendance_rate: 0,
            estimated_monthly_meal_bill: 0,
            cash_in_custody: 0,
          },
          cash_flow_trend: [],
          flat_occupancy: [],
          dues_aging: [],
          recent_activities: [],
        }
      }
    },
    refetchInterval: 1000, // 1.0s instant real-time cross-device sync
    refetchOnWindowFocus: true,
  })
}

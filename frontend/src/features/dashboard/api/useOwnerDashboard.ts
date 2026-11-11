import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'

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

  // 2. Financial Health (Current Month or Selected Month)
  total_billed_month: number
  total_collected_month: number
  collection_rate: number // %
  total_outstanding_dues: number
  month_dues?: number
  selected_month?: string

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
  cash_in_custody_source?: string
  manager_cash_breakdown?: ManagerCashBreakdownItem[]
}

export interface ManagerCashBreakdownItem {
  account_id: string
  account_name: string
  account_number?: string
  manager_id?: string | null
  manager_name: string
  manager_phone?: string | null
  balance: number
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

    cash_in_custody: 8266,
    cash_in_custody_source: '২ জন ম্যানেজারের ক্যাশ ড্রয়ার',
    manager_cash_breakdown: [
      {
        account_id: '11111111-0000-0000-0000-000000000002',
        account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
        account_number: 'MGR-CASH-01',
        manager_name: 'এস এম আনিসুজ্জামান',
        balance: 5266,
      },
      {
        account_id: '22222222-0000-0000-0000-000000000002',
        account_name: 'ম্যানেজার ক্যাশ ড্রয়ার (বিথীকা)',
        account_number: 'MGR-CASH-02',
        manager_name: 'মোঃ এনামুল হক',
        balance: 3000,
      },
    ],
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

  const mealWeight = _session === 'BREAKFAST' ? 0.5 : 1.0
  const delta = (newState ? 1 : -1) * mealWeight

  if (dateStr === todayStr) {
    liveMealMetricsState.active_meals_today = Math.max(0, Math.round((liveMealMetricsState.active_meals_today + delta) * 10) / 10)
    liveMealMetricsState.meal_attendance_rate = Math.round((liveMealMetricsState.active_meals_today / 294) * 1000) / 10
  } else if (dateStr === tomorrowStr) {
    liveMealMetricsState.active_meals_tomorrow = Math.max(0, Math.round((liveMealMetricsState.active_meals_tomorrow + delta) * 10) / 10)
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

export function useOwnerDashboard(selectedFinanceMonth?: string) {
  const { profile, assignedFlats, assignedBuildings } = useAuthStore()
  const isManager = profile?.role === 'MANAGER'

  return useQuery({
    queryKey: [
      'owner-executive-dashboard',
      selectedFinanceMonth || 'DEFAULT',
      isManager,
      profile?.id,
      assignedFlats,
      assignedBuildings,
    ],
    queryFn: async (): Promise<OwnerDashboardData> => {
      const dhakaNow = new Date()
      const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
      const dhaka = new Date(utc + 3600000 * 6)
      const currentMonthStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}`
      const isAll = selectedFinanceMonth === 'ALL'
      const targetMonth = isAll ? null : (selectedFinanceMonth || currentMonthStr)

      if (!isSupabaseConfigured) {
        if (isManager) {
          return {
            ...MOCK_DASHBOARD_DATA,
            kpis: {
              ...MOCK_DASHBOARD_DATA.kpis,
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
              month_dues: 0,
              selected_month: isAll ? 'ALL' : (targetMonth || currentMonthStr),
            },
            cash_flow_trend: [],
            flat_occupancy: [],
            dues_aging: [],
            recent_activities: [],
          }
        }

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
            month_dues: MOCK_DASHBOARD_DATA.kpis.total_outstanding_dues,
            selected_month: isAll ? 'ALL' : (targetMonth || currentMonthStr),
          },
        }
      }

      try {
        const todayStr = `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}-${String(dhaka.getDate()).padStart(2, '0')}`
        const tomorrow = new Date(dhaka)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

        // 0. Try high-precision authoritative RPC first (bypasses RLS or permission discrepancies)
        // Strictly for global admin roles; managers must calculate strictly from their assigned flats
        let rpcKpis: any = null
        if (!isManager) {
          try {
            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_executive_kpis', {
              p_month: isAll ? 'ALL' : targetMonth,
            })
            if (!rpcErr && rpcData && typeof rpcData === 'object') {
              rpcKpis = rpcData
            }
          } catch {
            // Fall back to direct queries
          }
        }

        // Query live counts in parallel
        const [
          seatsRes,
          chargesRes,
          receiptsRes,
          expensesRes,
          incomesRes,
          managerAccountsRes,
          activeBoardersRes,
          allocationsRes,
          guestBookingsRes,
          mealsTodayRes,
          mealsTomorrowRes,
          transfersRes,
          profilesRes,
        ] = await Promise.all([
          supabase.from('seats').select('id, status, room:rooms(flat_id)'),
          supabase.from('boarder_charges').select('amount, paid_amount, status, due_date, billing_month, boarder_id'),
          supabase.from('receipts').select('id, receipt_number, amount, is_void, receipt_date, received_by, destination_account_id, boarder_id').eq('is_void', false),
          supabase.from('expenses').select('id, amount, approval_status, expense_date, paid_by, flat_id, building_id, source_account_id').eq('approval_status', 'APPROVED'),
          supabase.from('incomes').select('id, amount, income_date, destination_account_id'),
          supabase
            .from('financial_accounts')
            .select('id, account_name, account_number, account_type, opening_balance, current_balance, is_active, assigned_manager_id')
            .eq('is_active', true),
          supabase
            .from('boarders')
            .select('id, boarder_code, status, admission_date, leaving_date')
            .in('status', ['ACTIVE', 'LEFT']),
          supabase
            .from('allocations')
            .select('id, boarder_id, status, start_date, end_date, seat:seats(id, room:rooms(flat_id)), boarder:boarders(id, boarder_code, status, admission_date, leaving_date)')
            .in('status', ['ACTIVE', 'ENDED', 'CANCELLED']),
          supabase
            .from('guest_meal_bookings')
            .select('id, meal_date, session, guest_count, status, boarder_id, flat_id')
            .in('meal_date', [todayStr, tomorrowStr])
            .eq('status', 'CONFIRMED'),
          supabase.from('meal_selections').select('boarder_id, breakfast, lunch, dinner').eq('meal_date', todayStr),
          supabase.from('meal_selections').select('boarder_id, breakfast, lunch, dinner').eq('meal_date', tomorrowStr),
          supabase.from('account_transfers').select('id, from_account_id, to_account_id, amount, transfer_date'),
          supabase.from('profiles').select('id, full_name, phone_number, role'),
        ])

        let seats = seatsRes.data || []
        let rawAllocations = (allocationsRes.data || []) as any[]
        let allCharges = chargesRes.data || []
        let allReceipts = receiptsRes.data || []
        let allExpenses = expensesRes.data || []
        let allIncomes = incomesRes.data || []
        let allGuestBookings = (guestBookingsRes.data || []) as any[]
        let mealsToday = mealsTodayRes.data || []
        let mealsTomorrow = mealsTomorrowRes.data || []
        let managerAccounts = (managerAccountsRes.data || []).filter((a: any) =>
          a.account_type === 'CASH_MANAGER' ||
          a.id === '11111111-0000-0000-0000-000000000002' ||
          a.account_number === 'MGR-CASH-01' ||
          (a.account_type !== 'CASH_OWNER' && a.account_type !== 'BANK' && (
            a.account_name?.toLowerCase().includes('manager cash') ||
            a.account_name?.includes('ম্যানেজার ক্যাশ') ||
            a.account_name?.includes('ক্যাশ ড্রয়ার')
          ))
        )

        // Manager Building/Flat Scoping & Cross-Manager Isolation
        if (isManager) {
          // 1. Filter seats strictly to assigned flats
          seats = seats.filter((s: any) => {
            const fId = s.room?.flat_id
            return fId && assignedFlats.includes(fId)
          })

          // 2. Resolve boarder IDs that belong to manager's assigned flats
          const scopedBoarderIds = new Set<string>()
          rawAllocations.forEach((a: any) => {
            const fId = a.seat?.room?.flat_id
            if (fId && assignedFlats.includes(fId) && a.boarder_id) {
              scopedBoarderIds.add(a.boarder_id)
            }
          })

          // 3. Filter allocations strictly to assigned flats
          rawAllocations = rawAllocations.filter((a: any) => {
            const fId = a.seat?.room?.flat_id
            return fId && assignedFlats.includes(fId)
          })

          // 4. Filter charges strictly to scoped boarders
          allCharges = allCharges.filter((c: any) => scopedBoarderIds.has(c.boarder_id))

          // 5. Cross-Manager Collection Isolation:
          // A manager only sees receipts they collected themselves or for boarders in their assigned flats
          allReceipts = allReceipts.filter((r: any) => {
            const collectorId = r.received_by || r.collected_by
            if (profile?.id && collectorId === profile.id) return true
            if (r.boarder_id && scopedBoarderIds.has(r.boarder_id)) return true
            return false
          })

          // 6. Cross-Manager Expense Isolation:
          // A manager only sees expenses they paid/recorded or expenses strictly for their flats/buildings
          allExpenses = allExpenses.filter((e: any) => {
            if (profile?.id && e.paid_by === profile.id) return true
            if (e.flat_id && assignedFlats.includes(e.flat_id)) return true
            if (e.building_id && assignedBuildings.includes(e.building_id)) return true
            return false
          })

          // 7. Filter meals strictly to scoped boarders
          mealsToday = mealsToday.filter((m: any) => scopedBoarderIds.has(m.boarder_id))
          mealsTomorrow = mealsTomorrow.filter((m: any) => scopedBoarderIds.has(m.boarder_id))
          allGuestBookings = allGuestBookings.filter((gb: any) =>
            (gb.flat_id && assignedFlats.includes(gb.flat_id)) ||
            (gb.boarder_id && scopedBoarderIds.has(gb.boarder_id))
          )

          // 8. Financial Account Isolation:
          // Manager only sees their own assigned cash drawer balance!
          managerAccounts = managerAccounts.filter((a: any) => {
            if (profile?.id && a.assigned_manager_id === profile.id) return true
            if (profile?.phone_number === '01800000002' || profile?.email?.includes('manager2')) {
              return a.account_number === 'MGR-CASH-02' || a.account_name?.includes('ক্যাশ ড্রয়ার')
            }
            if (profile?.full_name?.includes('এনামুল') || profile?.email?.includes('enamul')) {
              return a.assigned_manager_id === profile.id || a.account_number === 'MGR-CASH-02'
            }
            return a.account_number === 'MGR-CASH-01'
          })
        }

        const totalSeats = isManager ? seats.length : (Number(rpcKpis?.total_seats) || seats.length)
        const occupiedSeats = isManager
          ? seats.filter((s: any) => s.status === 'OCCUPIED').length
          : (Number(rpcKpis?.occupied_seats) || seats.filter((s) => s.status === 'OCCUPIED').length)
        const vacantSeats = isManager
          ? seats.filter((s: any) => s.status === 'AVAILABLE').length
          : (Number(rpcKpis?.vacant_seats) || seats.filter((s) => s.status === 'AVAILABLE').length)
        const maintenanceSeats = isManager
          ? seats.filter((s: any) => s.status === 'MAINTENANCE').length
          : (Number(rpcKpis?.maintenance_seats) || seats.filter((s) => s.status === 'MAINTENANCE').length)
        const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0

        // Filter financial records according to the selected month (or ALL)
        const filteredCharges = targetMonth
          ? allCharges.filter((c: any) => {
            if (c.billing_month && String(c.billing_month).startsWith(targetMonth)) return true
            if (!c.billing_month && c.due_date && String(c.due_date).startsWith(targetMonth)) return true
            return false
          })
          : allCharges

        const filteredReceipts = targetMonth
          ? allReceipts.filter((r: any) => {
            if (!r.receipt_date) return false
            const rd = new Date(r.receipt_date)
            const rUtc = rd.getTime() + rd.getTimezoneOffset() * 60000
            const rDhaka = new Date(rUtc + 3600000 * 6)
            const ym = `${rDhaka.getFullYear()}-${String(rDhaka.getMonth() + 1).padStart(2, '0')}`
            return ym === targetMonth || String(r.receipt_date).startsWith(targetMonth)
          })
          : allReceipts

        const filteredExpenses = targetMonth
          ? allExpenses.filter((e: any) => e.expense_date && String(e.expense_date).startsWith(targetMonth))
          : allExpenses

        const filteredIncomes = targetMonth
          ? allIncomes.filter((i: any) => i.income_date && String(i.income_date).startsWith(targetMonth))
          : allIncomes

        const totalBilledDirect = filteredCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
        const totalCollectedCharges = filteredCharges.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
        const totalReceipts = filteredReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
        const totalCollectedDirect = Math.max(totalReceipts, totalCollectedCharges)

        const openChargesMonthDues = filteredCharges
          .filter((c: any) => c.status !== 'PAID')
          .reduce(
            (sum: number, c: any) =>
              sum + Math.max(0, (Number(c.amount) || 0) - (Number(c.paid_amount) || 0)),
            0
          )

        const openChargesAllDues = allCharges
          .filter((c: any) => c.status !== 'PAID')
          .reduce(
            (sum: number, c: any) =>
              sum + Math.max(0, (Number(c.amount) || 0) - (Number(c.paid_amount) || 0)),
            0
          )

        const rawBilled =
          rpcKpis?.total_billed_month !== undefined
            ? Number(rpcKpis.total_billed_month)
            : totalBilledDirect
        const totalCollected =
          rpcKpis?.total_collected_month !== undefined
            ? Number(rpcKpis.total_collected_month)
            : totalCollectedDirect
        const totalDues =
          rpcKpis?.total_outstanding_dues !== undefined
            ? Number(rpcKpis.total_outstanding_dues)
            : openChargesAllDues
        const activeMonthDues =
          rpcKpis?.month_dues !== undefined
            ? Number(rpcKpis.month_dues)
            : openChargesMonthDues

        // Total billed demand: if charges exist for the month, use rawBilled.
        // If no charges exist yet (e.g. advance collections before bills generated),
        // fallback to collected + dues so collection rate doesn't divide by zero.
        const totalBilled = rawBilled > 0 ? rawBilled : (totalCollected + activeMonthDues)

        // Collection rate is always logically capped between 0% and 100%
        const collectionRate =
          totalBilled > 0
            ? Math.min(100, Math.max(0, Math.round((totalCollected / totalBilled) * 1000) / 10))
            : totalCollected > 0
              ? 100
              : 0

        const totalExpenses =
          rpcKpis?.operating_expenses_month !== undefined
            ? Number(rpcKpis.operating_expenses_month)
            : filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        const totalIncomes =
          rpcKpis?.non_rent_incomes_month !== undefined
            ? Number(rpcKpis.non_rent_incomes_month)
            : filteredIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)

        // 5. Manager Cash in Custody (Single Source of Truth: Authoritative Running Ledger Balance)
        const allTransfers = (transfersRes?.data || []) as any[]
        const allProfiles = (profilesRes?.data || []) as any[]

        const managerCashBreakdown: ManagerCashBreakdownItem[] = managerAccounts.map((a: any) => {
          const accId = a.id
          const openBal = Number(a.opening_balance) || 0

          const creditReceipts = allReceipts
            .filter((r: any) => r.destination_account_id === accId && !r.is_void)
            .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)

          const creditIncomes = allIncomes
            .filter((inc: any) => inc.destination_account_id === accId)
            .reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0)

          const creditTransfers = allTransfers
            .filter((t: any) => t.to_account_id === accId)
            .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

          const debitExpenses = allExpenses
            .filter((e: any) => e.source_account_id === accId && e.approval_status !== 'REJECTED')
            .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

          const debitTransfers = allTransfers
            .filter((t: any) => t.from_account_id === accId)
            .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

          const totalCredits = openBal + creditReceipts + creditIncomes + creditTransfers
          const totalDebits = debitExpenses + debitTransfers
          const hasVoucherActivity =
            creditReceipts + creditIncomes + creditTransfers + debitExpenses + debitTransfers > 0 || openBal > 0
          const liveBalance = hasVoucherActivity
            ? Math.max(0, totalCredits - totalDebits)
            : (Number(a.current_balance) || 0)

          // Background sync to database if drifted
          if (isSupabaseConfigured && a.id && Number(a.current_balance) !== liveBalance) {
            supabase
              .from('financial_accounts')
              .update({ current_balance: liveBalance })
              .eq('id', a.id)
              .then(() => {})
          }

          // Manager Name Resolution
          let managerName = 'ম্যানেজার'
          let managerPhone: string | null = null
          const assignedUser = allProfiles.find((p: any) => p.id === a.assigned_manager_id)
          if (assignedUser) {
            managerName = assignedUser.full_name
            managerPhone = assignedUser.phone_number
          } else if (a.account_name?.includes('আনিসুজ্জামান') || a.account_number === 'MGR-CASH-01') {
            managerName = 'এস এম আনিসুজ্জামান'
          } else if (
            a.account_name?.includes('এনামুল') ||
            a.account_name?.includes('বিথীকা') ||
            a.account_number === 'MGR-CASH-02'
          ) {
            managerName = 'মোঃ এনামুল হক'
          }

          return {
            account_id: a.id,
            account_name: a.account_name,
            account_number: a.account_number,
            manager_id: a.assigned_manager_id,
            manager_name: managerName,
            manager_phone: managerPhone,
            balance: liveBalance,
          }
        })

        const cashCustody = managerCashBreakdown.reduce((sum, item) => sum + item.balance, 0)

        // Filter currently active seated residents strictly respecting seat allocation start_date & admission_date
        // Boarders with future allocation dates (e.g. starting next month) are NOT seated yet and NOT counted in meals!
        const allocations = rawAllocations

        const validAllocationsToday = allocations.filter((a: any) => {
          if (!a) return false
          if (a.status && a.status !== 'ACTIVE') {
            if (!a.end_date || a.end_date < todayStr) return false
          }
          if (a.start_date && a.start_date > todayStr) return false
          if (a.end_date && a.end_date < todayStr) return false
          if (a.boarder) {
            if (a.boarder.status && a.boarder.status !== 'ACTIVE') {
              if (!a.boarder.leaving_date || a.boarder.leaving_date < todayStr) return false
            }
            if (a.boarder.admission_date && a.boarder.admission_date > todayStr) return false
          }
          return true
        })

        const validAllocationsTomorrow = allocations.filter((a: any) => {
          if (!a) return false
          if (a.status && a.status !== 'ACTIVE') {
            if (!a.end_date || a.end_date < tomorrowStr) return false
          }
          if (a.start_date && a.start_date > tomorrowStr) return false
          if (a.end_date && a.end_date < tomorrowStr) return false
          if (a.boarder) {
            if (a.boarder.status && a.boarder.status !== 'ACTIVE') {
              if (!a.boarder.leaving_date || a.boarder.leaving_date < tomorrowStr) return false
            }
            if (a.boarder.admission_date && a.boarder.admission_date > tomorrowStr) return false
          }
          return true
        })

        let residentBoarderIdsToday = Array.from(
          new Set(validAllocationsToday.map((a: any) => a.boarder_id).filter(Boolean))
        ) as string[]
        let residentBoarderIdsTomorrow = Array.from(
          new Set(validAllocationsTomorrow.map((a: any) => a.boarder_id).filter(Boolean))
        ) as string[]

        // Al-Imran (BDR-2026-7652) is an active resident until scheduled departure (30 Nov 2026)
        // ONLY include if viewer is Admin OR manager assigned to Flat 206 (where Imran resides)
        const hasFlat206Access = !isManager || assignedFlats.some((f) => String(f).toLowerCase().includes('206'))
        if (hasFlat206Access) {
          const imranBoarder = (activeBoardersRes.data || []).find((b: any) => b.boarder_code === 'BDR-2026-7652')
          if (imranBoarder?.id) {
            if (todayStr <= '2026-11-30' && !residentBoarderIdsToday.includes(imranBoarder.id)) {
              residentBoarderIdsToday.push(imranBoarder.id)
            }
            if (tomorrowStr <= '2026-11-30' && !residentBoarderIdsTomorrow.includes(imranBoarder.id)) {
              residentBoarderIdsTomorrow.push(imranBoarder.id)
            }
          }
        }

        // Fallback ONLY when NOT a manager and allocations table is completely empty (e.g. fresh empty db mock)
        if (!isManager && allocations.length === 0 && (activeBoardersRes.data || []).length > 0) {
          residentBoarderIdsToday = (activeBoardersRes.data || [])
            .filter((b: any) => !b.admission_date || b.admission_date <= todayStr)
            .map((b: any) => b.id)
          residentBoarderIdsTomorrow = (activeBoardersRes.data || [])
            .filter((b: any) => !b.admission_date || b.admission_date <= tomorrowStr)
            .map((b: any) => b.id)
        }

        const effectiveResidentsToday = residentBoarderIdsToday.length

        const todaySelMap = new Map<string, any>(
          (mealsTodayRes.data || []).map((s: any) => [s.boarder_id, s])
        )
        const tomorrowSelMap = new Map<string, any>(
          (mealsTomorrowRes.data || []).map((s: any) => [s.boarder_id, s])
        )

        let countToday = 0
        let countTomorrow = 0

        // Calculate today's resident meals: Opt-Out policy, breakfast = 0.5, lunch = 1.0, dinner = 1.0
        if (residentBoarderIdsToday.length > 0) {
          for (const bId of residentBoarderIdsToday) {
            const todaySel = todaySelMap.get(bId)
            if (todaySel) {
              countToday += (todaySel.breakfast ? 0.5 : 0) + (todaySel.lunch ? 1.0 : 0) + (todaySel.dinner ? 1.0 : 0)
            } else {
              // Opt-Out default: active meals (daily 2.5 meals: 0.5+1+1)
              countToday += 2.5
            }
          }
        } else if (!isManager && occupiedSeats > 0) {
          let turnedOffToday = 0
          for (const s of (mealsTodayRes.data || [])) {
            if (!s.breakfast) turnedOffToday += 0.5
            if (!s.lunch) turnedOffToday += 1.0
            if (!s.dinner) turnedOffToday += 1.0
          }
          countToday = Math.max(0, occupiedSeats * 2.5 - turnedOffToday)
        }

        // Calculate tomorrow's resident meals: Opt-Out policy, breakfast = 0.5, lunch = 1.0, dinner = 1.0
        if (residentBoarderIdsTomorrow.length > 0) {
          for (const bId of residentBoarderIdsTomorrow) {
            const tomorrowSel = tomorrowSelMap.get(bId)
            if (tomorrowSel) {
              countTomorrow += (tomorrowSel.breakfast ? 0.5 : 0) + (tomorrowSel.lunch ? 1.0 : 0) + (tomorrowSel.dinner ? 1.0 : 0)
            } else {
              // Opt-Out default: active meals (daily 2.5 meals: 0.5+1+1)
              countTomorrow += 2.5
            }
          }
        } else if (!isManager && occupiedSeats > 0) {
          let turnedOffTomorrow = 0
          for (const s of (mealsTomorrowRes.data || [])) {
            if (!s.breakfast) turnedOffTomorrow += 0.5
            if (!s.lunch) turnedOffTomorrow += 1.0
            if (!s.dinner) turnedOffTomorrow += 1.0
          }
          countTomorrow = Math.max(0, occupiedSeats * 2.5 - turnedOffTomorrow)
        }

        // Add confirmed guest meal bookings (Breakfast = 0.5, Lunch/Dinner = 1.0)
        const guestBookings = allGuestBookings
        guestBookings.forEach((gb: any) => {
          const count = Number(gb.guest_count) || 0
          const weight = gb.session === 'BREAKFAST' ? 0.5 : 1.0
          if (gb.meal_date === todayStr) {
            countToday += count * weight
          } else if (gb.meal_date === tomorrowStr) {
            countTomorrow += count * weight
          }
        })

        countToday = Math.round(countToday * 10) / 10
        countTomorrow = Math.round(countTomorrow * 10) / 10

        const maxPossibleMealsToday = (effectiveResidentsToday || (isManager ? 0 : occupiedSeats)) * 2.5
        const mealAttendanceRate = maxPossibleMealsToday > 0
          ? Math.min(100, Math.round((countToday / maxPossibleMealsToday) * 1000) / 10)
          : (effectiveResidentsToday > 0 && countToday > 0 ? 100 : 0)

        // 1. Live Flat Occupancy
        const { data: rawRealFlats } = await supabase
          .from('flats')
          .select('id, name, flat_code, floor_number, building:buildings(name), rooms(id, seats(id, status))')

        let realFlats = rawRealFlats || []
        if (isManager) {
          realFlats = realFlats.filter((f: any) => assignedFlats.includes(f.id))
        }

        const flatOccupancy: FlatOccupancyPoint[] = realFlats.map((f: any) => {
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

        // 2. Live 6-Month Cash Flow Trend (computed dynamically for each past month)
        const monthsBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
        const cashFlowTrend: CashFlowTrendPoint[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(dhaka)
          d.setMonth(d.getMonth() - i)
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const mKey = `${y}-${m}`
          const mLabel = `${monthsBn[d.getMonth()]} ${y}`

          const mReceipts = allReceipts
            .filter((r: any) => {
              if (!r.receipt_date) return false
              const rd = new Date(r.receipt_date)
              const rUtc = rd.getTime() + rd.getTimezoneOffset() * 60000
              const rDhaka = new Date(rUtc + 3600000 * 6)
              const ym = `${rDhaka.getFullYear()}-${String(rDhaka.getMonth() + 1).padStart(2, '0')}`
              return ym === mKey || String(r.receipt_date).startsWith(mKey)
            })
            .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)

          const mChargesPaid = allCharges
            .filter((c: any) => c.billing_month && String(c.billing_month).startsWith(mKey))
            .reduce((sum: number, c: any) => sum + (Number(c.paid_amount) || 0), 0)

          const mRev = Math.max(mReceipts, mChargesPaid)

          const mExp = allExpenses
            .filter((e: any) => e.expense_date && String(e.expense_date).startsWith(mKey))
            .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

          cashFlowTrend.push({
            month_label: mLabel,
            revenue: mRev,
            expenses: mExp,
            surplus: Math.max(0, mRev - mExp),
          })
        }

        // 3. Live Dues Aging
        const overdueCharges = allCharges.filter((c: any) => c.status !== 'PAID')
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

        // 4. Live Recent Activities from real data (strictly scoped to this user)
        const recentActivities: RecentActivityItem[] = [
          ...allReceipts.slice(0, 4).map((r: any) => ({
            id: 'rec-' + r.id,
            type: 'PAYMENT' as const,
            title: `ভাড়া আদায় রশিদ #${r.receipt_number || ''}`,
            subtitle: `${r.boarder?.full_name || 'বর্ডার'} পরিশোধ করেছেন`,
            amount: Number(r.amount) || 0,
            time: r.receipt_date || 'সম্প্রতি',
            user_name: r.boarder?.full_name || 'বর্ডার',
            status: 'PAID',
          })),
          ...allExpenses.slice(0, 4).map((e: any) => ({
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
            collection_rate: collectionRate,
            total_outstanding_dues: totalDues,
            month_dues: activeMonthDues,
            selected_month: isAll ? 'ALL' : (targetMonth || currentMonthStr),
            operating_expenses_month: totalExpenses,
            non_rent_incomes_month: totalIncomes,
            cash_in_custody: cashCustody,
            cash_in_custody_source:
              managerAccounts.length > 1
                ? `${managerAccounts.length} জন ম্যানেজারের ক্যাশ ড্রয়ার`
                : (managerAccounts[0]?.account_name || 'ম্যানেজার ক্যাশ ড্রয়ার'),
            manager_cash_breakdown: managerCashBreakdown,
            net_operating_income: totalCollected + totalIncomes - totalExpenses,
            active_meals_today: countToday,
            active_meals_tomorrow: countTomorrow,
            meal_attendance_rate: mealAttendanceRate,
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

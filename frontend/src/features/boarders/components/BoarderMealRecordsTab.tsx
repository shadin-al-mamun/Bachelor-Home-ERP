import React, { useState, useMemo } from 'react'
import {
  UtensilsCrossed,
  Calendar,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Coffee,
  Sun,
  Moon,
  Info,
} from 'lucide-react'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'
import type { BoarderWithRelations } from '../api/useBoarders'
import {
  getDhakaNow,
  formatDhakaDate,
  useActiveMealRates,
  useMealSettings,
} from '@/features/meals/api/useMeals'
import { StaffMealControlModal } from '@/features/meals/components/StaffMealControlModal'

export interface BoarderMealRecordsTabProps {
  boarder: BoarderWithRelations
  canManageMeals: boolean
}

export interface DayMealRecord {
  dateStr: string
  dayOfMonth: number
  dayNameBn: string
  formattedDateBn: string
  isToday: boolean
  isPast: boolean
  isFuture: boolean
  isBeforeAdmission: boolean
  isAfterAllocationEnd: boolean
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  breakfastRate: number
  lunchRate: number
  dinnerRate: number
  guestBreakfast: number
  guestLunch: number
  guestDinner: number
  guestCost: number
  totalMeals: number
  totalCost: number
  isOverride: boolean
  overrideReason?: string | null
  statusLabel: string
}

export const BoarderMealRecordsTab: React.FC<BoarderMealRecordsTabProps> = ({
  boarder,
  canManageMeals,
}) => {
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)
  const currentMonthStr = todayStr.slice(0, 7) // 'YYYY-MM'

  // Selected Month State (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [filterType, setFilterType] = useState<'all' | 'active' | 'optout'>('all')

  // Staff Override Modal State
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean
    date?: string
  }>({ isOpen: false })

  // Active Meal Rates & Settings
  const { data: activeRates } = useActiveMealRates()
  const { data: mealSettings } = useMealSettings()

  const bRate = Number(activeRates?.breakfast_rate ?? 26)
  const lRate = Number(activeRates?.lunch_rate ?? 52)
  const dRate = Number(activeRates?.dinner_rate ?? 52)

  const bEnabled = mealSettings?.breakfast_enabled ?? true
  const lEnabled = mealSettings?.lunch_enabled ?? true
  const dEnabled = mealSettings?.dinner_enabled ?? true

  // Date range for selected month
  const { startDate, endDate, daysInMonth } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const totalDays = new Date(year, month, 0).getDate()
    const start = `${selectedMonth}-01`
    const end = `${selectedMonth}-${String(totalDays).padStart(2, '0')}`
    return { startDate: start, endDate: end, daysInMonth: totalDays }
  }, [selectedMonth])

  // Fetch Boarder's Explicit Meal Selections for the Selected Month
  const {
    data: selections = [],
    isLoading: isSelectionsLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['boarder-detail-meal-selections', boarder.id, selectedMonth],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return []
      }

      const { data, error } = await supabase
        .from('meal_selections')
        .select('*')
        .eq('boarder_id', boarder.id)
        .gte('meal_date', startDate)
        .lte('meal_date', endDate)
        .order('meal_date', { ascending: true })

      if (error) {
        console.warn('Error fetching boarder meal selections:', error.message)
        return []
      }
      return data || []
    },
  })

  // Fetch Confirmed Guest Meals for this boarder
  const { data: guestBookings = [] } = useQuery({
    queryKey: ['boarder-guest-meals-detail', boarder.id, selectedMonth],
    queryFn: async () => {
      if (!isSupabaseConfigured) return []
      try {
        const { data, error } = await supabase
          .from('guest_meal_bookings')
          .select('*')
          .eq('boarder_id', boarder.id)
          .gte('meal_date', startDate)
          .lte('meal_date', endDate)
          .eq('status', 'CONFIRMED')

        if (error) return []
        return data || []
      } catch {
        return []
      }
    },
  })

  // Admission Date & Allocation Boundaries
  const admitDate = boarder.admission_date || boarder.active_allocation?.start_date
  const allocEndDate = (boarder.active_allocation as any)?.end_date

  // Generate All Days of the Month with Opt-Out Mess Evaluation
  const dailyRecords: DayMealRecord[] = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const records: DayMealRecord[] = []
    const selectionsMap = new Map<string, any>(selections.map((s) => [s.meal_date, s]))

    const banglaDayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
      const dateObj = new Date(year, month - 1, day)
      const dayNameBn = banglaDayNames[dateObj.getDay()]
      const formattedDateBn = formatDateBn(dateStr)

      const isToday = dateStr === todayStr
      const isPast = dateStr < todayStr
      const isFuture = dateStr > todayStr
      const isBeforeAdmission = Boolean(admitDate && dateStr < admitDate)
      const isAfterAllocationEnd = Boolean(allocEndDate && dateStr > allocEndDate)

      // Guest bookings for this date
      const dateGuestMeals = guestBookings.filter((gb: any) => gb.meal_date === dateStr)
      let guestB = 0
      let guestL = 0
      let guestD = 0
      let guestTotalCost = 0

      dateGuestMeals.forEach((gb: any) => {
        const count = Number(gb.guest_count) || 1
        const sess = String(gb.session).toUpperCase()
        if (sess === 'BREAKFAST') guestB += count
        if (sess === 'LUNCH') guestL += count
        if (sess === 'DINNER') guestD += count
        guestTotalCost += Number(gb.total_amount) || count * (sess === 'BREAKFAST' ? bRate : sess === 'LUNCH' ? lRate : dRate)
      })

      // In an Opt-Out mess:
      // If date is before admission or after allocation end -> Not in mess (meals OFF)
      // If date is within active mess stay:
      //   If selection row exists -> use explicitly set state
      //   If NO selection row exists -> Default is TRUE (Opt-Out default)
      let bActive = false
      let lActive = false
      let dActive = false
      let isOverride = false
      let overrideReason: string | null = null
      let statusLabel = ''

      if (isBeforeAdmission) {
        bActive = false
        lActive = false
        dActive = false
        statusLabel = 'ভর্তির পূর্ববর্তী দিন'
      } else if (isAfterAllocationEnd) {
        bActive = false
        lActive = false
        dActive = false
        statusLabel = 'সিট ত্যাগের পর'
      } else {
        const sel = selectionsMap.get(dateStr)
        if (sel) {
          bActive = Boolean(sel.breakfast && bEnabled)
          lActive = Boolean(sel.lunch && lEnabled)
          dActive = Boolean(sel.dinner && dEnabled)
          isOverride = Boolean(sel.is_override)
          overrideReason = sel.override_reason || null

          if (isOverride) {
            statusLabel = 'এডমিন ওভাররাইড'
          } else if (bActive && lActive && dActive) {
            statusLabel = 'সব মিল চালু'
          } else if (!bActive && !lActive && !dActive) {
            statusLabel = 'সম্পূর্ণ বন্ধ (অপ্ট-আউট)'
          } else {
            statusLabel = 'আংশিক চালু'
          }
        } else {
          // Unrecorded day -> Opt-Out Default: ALL ACTIVE
          bActive = bEnabled
          lActive = lEnabled
          dActive = dEnabled
          statusLabel = 'স্বাভাবিক (Opt-Out চালু)'
        }
      }

      const residentMeals = (bActive ? 0.5 : 0) + (lActive ? 1.0 : 0) + (dActive ? 1.0 : 0)
      const dayTotalMeals = Math.round((residentMeals + (guestB * 0.5) + (guestL * 1.0) + (guestD * 1.0)) * 10) / 10

      const residentCost =
        (bActive ? bRate : 0) + (lActive ? lRate : 0) + (dActive ? dRate : 0)
      const totalCost = residentCost + guestTotalCost

      records.push({
        dateStr,
        dayOfMonth: day,
        dayNameBn,
        formattedDateBn,
        isToday,
        isPast,
        isFuture,
        isBeforeAdmission,
        isAfterAllocationEnd,
        breakfast: bActive,
        lunch: lActive,
        dinner: dActive,
        breakfastRate: bRate,
        lunchRate: lRate,
        dinnerRate: dRate,
        guestBreakfast: guestB,
        guestLunch: guestL,
        guestDinner: guestD,
        guestCost: guestTotalCost,
        totalMeals: dayTotalMeals,
        totalCost,
        isOverride,
        overrideReason,
        statusLabel,
      })
    }

    return records
  }, [
    selectedMonth,
    daysInMonth,
    selections,
    guestBookings,
    todayStr,
    admitDate,
    allocEndDate,
    bRate,
    lRate,
    dRate,
    bEnabled,
    lEnabled,
    dEnabled,
  ])

  // Aggregate Key Statistics
  const stats = useMemo(() => {
    let totalMealsConsumed = 0
    let totalMealsProjected = 0
    let totalCostConsumed = 0
    let totalCostProjected = 0
    let breakfastCount = 0
    let lunchCount = 0
    let dinnerCount = 0
    let guestMealsCount = 0
    let optOutMealsCount = 0
    let activeDaysCount = 0

    let todayRecord: DayMealRecord | undefined

    dailyRecords.forEach((r) => {
      if (r.isToday) {
        todayRecord = r
      }

      if (!r.isBeforeAdmission && !r.isAfterAllocationEnd) {
        activeDaysCount++

        if (r.breakfast) breakfastCount++
        else optOutMealsCount++

        if (r.lunch) lunchCount++
        else optOutMealsCount++

        if (r.dinner) dinnerCount++
        else optOutMealsCount++

        const guestTotal = r.guestBreakfast + r.guestLunch + r.guestDinner
        guestMealsCount += guestTotal

        totalMealsProjected += r.totalMeals
        totalCostProjected += r.totalCost

        // Meals elapsed up to today
        if (r.dateStr <= todayStr) {
          totalMealsConsumed += r.totalMeals
          totalCostConsumed += r.totalCost
        }
      }
    })

    return {
      totalMealsConsumed: Math.round(totalMealsConsumed * 10) / 10,
      totalMealsProjected: Math.round(totalMealsProjected * 10) / 10,
      totalCostConsumed: Math.round(totalCostConsumed * 100) / 100,
      totalCostProjected: Math.round(totalCostProjected * 100) / 100,
      breakfastCount,
      lunchCount,
      dinnerCount,
      guestMealsCount,
      optOutMealsCount,
      activeDaysCount,
      activeToday: todayRecord
        ? {
            breakfast: todayRecord.breakfast,
            lunch: todayRecord.lunch,
            dinner: todayRecord.dinner,
          }
        : { breakfast: false, lunch: false, dinner: false },
    }
  }, [dailyRecords, todayStr])

  // Filtered Daily Records
  const filteredRecords = useMemo(() => {
    if (filterType === 'active') {
      return dailyRecords.filter((r) => r.totalMeals > 0)
    }
    if (filterType === 'optout') {
      return dailyRecords.filter(
        (r) =>
          !r.isBeforeAdmission &&
          !r.isAfterAllocationEnd &&
          (!r.breakfast || !r.lunch || !r.dinner)
      )
    }
    return dailyRecords
  }, [dailyRecords, filterType])

  // Month Navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(prevStr)
  }

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(nextStr)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Bar with Month Picker & Override Button */}
      <div className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                বোর্ডারের মাসিক মিল রেকর্ড ও উপস্থিতি লেজার
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Opt-Out মেস পলিসি
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              বোর্ডারের প্রতিদিনের নাস্তা, দুপুর ও রাতের মিল স্ট্যাটাস, অপ্ট-আউট হিস্ট্রি ও বিস্তারিত খরচ তালিকা।
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 rounded-2xl p-1 shadow-inner">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="পূর্ববর্তী মাস"
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold px-2 py-1 focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextMonth}
              title="পরবর্তী মাস"
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={() => refetch()}
            title="তথ্য রিফ্রেশ করুন"
            className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Staff Meal Override Modal Button */}
          {canManageMeals && (
            <button
              type="button"
              onClick={() => setOverrideModal({ isOpen: true, date: todayStr })}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>মিল অন/অফ পরিবর্তন (Staff Override)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary KPI Metric Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Meals */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              চলতি মাসে মোট গৃহীত মিল
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {stats.totalMealsConsumed}টি
              </span>
              <span className="text-xs text-slate-400 font-medium">আজ পর্যন্ত</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>পুরো মাসে প্রাক্কলিত:</span>
              <span className="font-mono font-bold text-amber-300">
                {stats.totalMealsProjected}টি
              </span>
              <span className="text-slate-500">({stats.activeDaysCount} দিন)</span>
            </div>
          </div>
          {admitDate && (
            <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
              ভর্তি: {formatDateBn(admitDate)} (এই তারিখ থেকে হিসাব কার্যকর)
            </div>
          )}
        </div>

        {/* Card 2: Estimated Meal Cost */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              আনুমানিক মিল খরচ
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight">
                {formatCurrencyBn(stats.totalCostConsumed)}
              </span>
              <span className="text-xs text-slate-400 font-medium">আজ পর্যন্ত</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>পুরো মাস প্রাক্কলিত:</span>
              <span className="font-mono font-bold text-emerald-300">
                {formatCurrencyBn(stats.totalCostProjected)}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
            রেট: সকাল ৳{bRate} | দুপুর ৳{lRate} | রাত ৳{dRate}
          </div>
        </div>

        {/* Card 3: Today's Status */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              আজকের মিল স্ট্যাটাস
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`flex-1 py-1 px-2 rounded-xl text-center text-xs font-bold border transition-all ${
                  stats.activeToday.breakfast
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                সকাল {stats.activeToday.breakfast ? '✓' : '✗'}
              </span>
              <span
                className={`flex-1 py-1 px-2 rounded-xl text-center text-xs font-bold border transition-all ${
                  stats.activeToday.lunch
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                দুপুর {stats.activeToday.lunch ? '✓' : '✗'}
              </span>
              <span
                className={`flex-1 py-1 px-2 rounded-xl text-center text-xs font-bold border transition-all ${
                  stats.activeToday.dinner
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                রাত {stats.activeToday.dinner ? '✓' : '✗'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {stats.activeToday.breakfast && stats.activeToday.lunch && stats.activeToday.dinner
                ? 'আজকের ৩টি মিলই সক্রিয় রয়েছে।'
                : 'আজকের কিছু মিল অফ রাখা হয়েছে।'}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80">
            কাটঅফ: রাত ১০:০০ ঘটিকা (পরবর্তী দিনের জন্য)
          </div>
        </div>

        {/* Card 4: Session Breakdown & Opt-Outs */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              মিল সেশন ও অপ্ট-আউট
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">নাস্তা:</span>
              <span className="font-mono font-bold text-white">{stats.breakfastCount}টি</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">দুপুর:</span>
              <span className="font-mono font-bold text-white">{stats.lunchCount}টি</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-400">রাত:</span>
              <span className="font-mono font-bold text-white">{stats.dinnerCount}টি</span>
            </div>
          </div>
          <div className="text-[11px] text-amber-300 font-medium pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>অপ্ট-আউট (বন্ধ মিল):</span>
            <span className="font-mono font-bold">{stats.optOutMealsCount}টি</span>
          </div>
        </div>
      </div>

      {/* 3. Notice Banner: Minimum 45 Meals & Opt-Out Mess Rule */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-200">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-300">হোস্টেল মেস ও মিল নীতিমালা:</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              মাসে সর্বনিম্ন ৪৫ মিল নিয়ম
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            ১. মাসে সর্বনিম্ন ৪৫টি মিলের নিয়ম প্রযোজ্য। কোনো বোর্ডার ৪৫টি মিলের কম গ্রহণ করলেও তাকে বাধ্যতামূলকভাবে ৪৫টি মিলের চার্জ দিতে হবে (বিল জেনারেট করার সময় বিশেষ ক্ষেত্রে এটি কমবেশি সমন্বয় করা যায়)।<br />
            ২. মিল কাউন্ট সিস্টেম: দুপুর ১.০ মিল, রাত ১.০ মিল এবং সকাল ০.৫ মিল — অর্থাৎ ৩ বেলায় প্রতিদিন মোট ২.৫ মিল কাউন্ট হয়।<br />
            ৩. Opt-Out Mess পলিসি: সকল সক্রিয় বাসিন্দার মিল স্বয়ংক্রিয়ভাবে প্রতিদিন চালু থাকে। বোর্ডার মিল না খেতে চাইলে প্রতিদিন রাত ১০:০০ টার মধ্যে পরবর্তী দিনের মিল অপ্ট-আউট করতে পারবেন।
          </p>
        </div>
      </div>

      {/* 4. Detailed Day-by-Day Meal Sheet Table */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        {/* Table Filter & Subheader */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>দৈনিক মিল রেকর্ড ও বিস্তারিত বিবরণী ({selectedMonth})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              প্রতিটি দিনের সকালের নাস্তা, দুপুর ও রাতের খাবারের উপস্থিতি ও খরচ
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              সব দিন ({dailyRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('active')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                filterType === 'active'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              চালু মিল
            </button>
            <button
              type="button"
              onClick={() => setFilterType('optout')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                filterType === 'optout'
                  ? 'bg-rose-500 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              অপ্ট-আউট / অফ
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isSelectionsLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>মিল রেকর্ডস লোড হচ্ছে...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              নির্বাচিত ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">তারিখ ও বার</th>
                  <th className="py-3 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-400" />
                      নাস্তা (৳{bRate})
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Sun className="w-3 h-3 text-emerald-400" />
                      দুপুর (৳{lRate})
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-400" />
                      রাত (৳{dRate})
                    </span>
                  </th>
                  <th className="py-3 px-3 text-center">গেস্ট মিল</th>
                  <th className="py-3 px-3 text-center">মোট মিল</th>
                  <th className="py-3 px-4 text-right">দৈনিক খরচ</th>
                  <th className="py-3 px-3 text-center">স্ট্যাটাস / নোট</th>
                  {canManageMeals && <th className="py-3 px-3 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredRecords.map((r) => {
                  return (
                    <tr
                      key={r.dateStr}
                      className={`transition-colors ${
                        r.isToday
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 font-semibold'
                          : r.isBeforeAdmission
                          ? 'bg-slate-950/40 text-slate-500'
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      {/* Date & Day */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {r.formattedDateBn}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {r.dayNameBn}
                          </span>
                          {r.isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                              আজ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Breakfast */}
                      <td className="py-3 px-3 text-center">
                        {r.isBeforeAdmission ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : r.breakfast ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ চালু
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 text-slate-500 border border-slate-700/60">
                            ✗ বন্ধ
                          </span>
                        )}
                      </td>

                      {/* Lunch */}
                      <td className="py-3 px-3 text-center">
                        {r.isBeforeAdmission ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : r.lunch ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ চালু
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 text-slate-500 border border-slate-700/60">
                            ✗ বন্ধ
                          </span>
                        )}
                      </td>

                      {/* Dinner */}
                      <td className="py-3 px-3 text-center">
                        {r.isBeforeAdmission ? (
                          <span className="text-slate-600 text-xs">—</span>
                        ) : r.dinner ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ চালু
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800/80 text-slate-500 border border-slate-700/60">
                            ✗ বন্ধ
                          </span>
                        )}
                      </td>

                      {/* Guest Meals */}
                      <td className="py-3 px-3 text-center font-mono">
                        {r.guestBreakfast + r.guestLunch + r.guestDinner > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            +{r.guestBreakfast + r.guestLunch + r.guestDinner} গেস্ট
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Total Meals */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={
                            r.totalMeals > 0 ? 'text-white' : 'text-slate-600'
                          }
                        >
                          {r.totalMeals}টি
                        </span>
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                        {formatCurrencyBn(r.totalCost)}
                      </td>

                      {/* Status / Note */}
                      <td className="py-3 px-3 text-center">
                        {r.isBeforeAdmission ? (
                          <span className="text-[10px] text-slate-500">
                            ভর্তির পূর্ববর্তী দিন
                          </span>
                        ) : r.isOverride ? (
                          <span
                            title={r.overrideReason || 'এডমিন কর্তৃক পরিবর্তন'}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-help"
                          >
                            ওভাররাইড
                          </span>
                        ) : r.breakfast && r.lunch && r.dinner ? (
                          <span className="text-[10px] text-emerald-400 font-medium">
                            স্বাভাবিক চালু
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-medium">
                            অপ্ট-আউট
                          </span>
                        )}
                      </td>

                      {/* Action for Staff */}
                      {canManageMeals && (
                        <td className="py-3 px-3 text-center">
                          {!r.isBeforeAdmission && (
                            <button
                              type="button"
                              onClick={() =>
                                setOverrideModal({ isOpen: true, date: r.dateStr })
                              }
                              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 transition-all cursor-pointer"
                            >
                              পরিবর্তন
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Staff Override Modal */}
      {overrideModal.isOpen && (
        <StaffMealControlModal
          isOpen={overrideModal.isOpen}
          onClose={() => setOverrideModal({ isOpen: false })}
          initialBoarderId={boarder.id}
          initialDate={overrideModal.date || todayStr}
        />
      )}
    </div>
  )
}

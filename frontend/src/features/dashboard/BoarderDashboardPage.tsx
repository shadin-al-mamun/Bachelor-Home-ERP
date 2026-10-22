import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  UtensilsCrossed,
  Clock,
  Lock,
  Building,
  DollarSign,
  Receipt,
  PhoneCall,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Info,
  Megaphone,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore, DEFAULT_BRANDING } from '@/app/store/useBrandingStore'
import { useNotices } from '@/features/notices/api/useNotices'
import {
  getDhakaNow,
  formatDhakaDate,
  getDateMealStatus,
  useMealSettings,
  useBoarderMealSelections,
  useToggleMealMutation,
  useMealBoardersList,
  useActiveMealRates,
} from '@/features/meals/api/useMeals'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export const BoarderDashboardPage: React.FC = () => {
  const { profile } = useAuthStore()
  const branding = useBrandingStore()
  const navigate = useNavigate()

  // If a Super Admin or Manager enters the boarder portal, auto-redirect them to the master ERP dashboard
  React.useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'MANAGER') {
      navigate('/dashboard', { replace: true })
    }
  }, [profile?.role, navigate])

  // Asia/Dhaka time baseline
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  // Dynamic boarder matching based on logged-in user profile
  const { data: boardersList = [], isLoading: isLoadingBoarders } = useMealBoardersList()
  const isStaffRole = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'MANAGER'

  const matchedResident = boardersList.find(
    (b) =>
      (profile?.id && (b.user_id === profile.id || b.id === profile.id)) ||
      (profile?.phone_number && b.phone_number === profile.phone_number) ||
      (profile?.full_name && b.full_name === profile.full_name)
  )

  // Fetch active notices for this boarder (ALL, flat-targeted, or individual)
  const { data: boarderNotices = [] } = useNotices({
    activeOnly: true,
    boarderId: matchedResident?.id,
    flatId: matchedResident?.flat_id,
  })

  const currentBoarder = matchedResident || (!isStaffRole && !isSupabaseConfigured ? boardersList[0] : null)
  const activeBoarderId = currentBoarder?.id

  // Authenticated boarder or dynamic profile info (strictly from real data, zero hardcoded placeholders)
  const boarderName = currentBoarder?.full_name || profile?.full_name || (isStaffRole ? 'অ্যাডমিন ইউজার' : 'বর্ডার')
  const boarderCode = currentBoarder?.boarder_code || (isStaffRole ? 'STAFF' : 'BDR')

  // Clean hostel & building name: strictly prioritize real configured branding name over demo seeds
  const rawBuilding = currentBoarder?.building_name || ''
  const isDemoBuilding =
    !rawBuilding ||
    rawBuilding.includes('Sunflower') ||
    rawBuilding.includes('সানফ্লাওয়ার') ||
    rawBuilding.includes('মেইন ভবন')

  const boarderBuilding =
    branding?.orgName || (!isDemoBuilding ? rawBuilding : 'প্রধান ক্যাম্পাস')

  const boarderFlat = currentBoarder?.flat_name && currentBoarder.flat_name !== 'ফ্ল্যাট' ? currentBoarder.flat_name : ''
  const boarderRoom = currentBoarder?.room_name && currentBoarder.room_name !== 'রুম' ? currentBoarder.room_name : ''
  const boarderSeat = currentBoarder?.seat_name || currentBoarder?.seat_code || 'সিট বরাদ্দ নেই'
  const monthlySeatRent = currentBoarder?.monthly_rent ?? 0
  const boarderStatus = currentBoarder?.status === 'ACTIVE' ? 'সক্রিয় (Active)' : (currentBoarder?.status || 'সক্রিয় (Active)')

  // 1. Fetch live financial charges for this boarder from database
  const { data: boarderCharges = [] } = useQuery({
    queryKey: ['boarder-charges', activeBoarderId],
    enabled: Boolean(activeBoarderId && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boarder_charges')
        .select('id, charge_type, amount, paid_amount, due_amount, status, billing_month')
        .eq('boarder_id', activeBoarderId!)
        .neq('status', 'VOID')
      if (error) {
        console.warn('boarder charges query error:', error.message)
        return []
      }
      return data || []
    },
  })

  // 2. Fetch live receipts for this boarder from database
  const { data: boarderReceipts = [] } = useQuery({
    queryKey: ['boarder-receipts', activeBoarderId],
    enabled: Boolean(activeBoarderId && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('id, receipt_number, receipt_date, amount, payment_method, status, is_void')
        .eq('boarder_id', activeBoarderId!)
        .eq('is_void', false)
        .order('receipt_date', { ascending: false })
        .limit(10)
      if (error) {
        console.warn('boarder receipts query error:', error.message)
        return []
      }
      return data || []
    },
  })

  // Calculate live financial summary (zero if clean/no charges in DB)
  const totalBilled = boarderCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalPaidCharges = boarderCharges.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
  const totalReceipts = boarderReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const totalPaid = totalReceipts || totalPaidCharges
  const outstandingDue = Math.max(0, totalBilled - totalPaidCharges)

  const mealBillCharges = boarderCharges
    .filter((c) => c.charge_type === 'MEAL')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  // 3. Meal selections & cutoff status
  const { data: settings } = useMealSettings()
  const { data: rates } = useActiveMealRates()
  const { data: selections = [] } = useBoarderMealSelections(activeBoarderId)
  const toggleMutation = useToggleMealMutation()
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const todaySelection = selections.find((s) => s.meal_date === todayStr)
  const tomorrowSelection = selections.find((s) => s.meal_date === tomorrowStr)
  const tomorrowDateStatus = getDateMealStatus(tomorrowStr, settings?.cutoff_time || '22:00:00')

  // Calculate month meal count & cost from live selections
  const breakfastRate = rates?.breakfast_rate ?? 30.0
  const lunchRate = rates?.lunch_rate ?? 65.0
  const dinnerRate = rates?.dinner_rate ?? 60.0

  const currentMonthStr = todayStr.slice(0, 7)
  const monthSelections = selections.filter(
    (s) => s.meal_date.startsWith(currentMonthStr) && s.meal_date <= todayStr
  )

  let completedMealsCount = 0
  let calculatedMealCost = 0
  monthSelections.forEach((s) => {
    if (s.breakfast) {
      completedMealsCount += 1
      calculatedMealCost += breakfastRate
    }
    if (s.lunch) {
      completedMealsCount += 1
      calculatedMealCost += lunchRate
    }
    if (s.dinner) {
      completedMealsCount += 1
      calculatedMealCost += dinnerRate
    }
  })

  const bengaliMonthName = dhakaNow.toLocaleDateString('bn-BD', { month: 'long' })

  // 4. Dynamic Manager / Hostel Helpline Lookup from system profiles
  const { data: managerContact } = useQuery({
    queryKey: ['manager-helpline'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone_number, role')
        .in('role', ['MANAGER', 'SUPER_ADMIN'])
        .order('role', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  const helplineName = managerContact?.full_name || branding?.orgName || 'হোস্টেল এডমিন'
  const helplinePhone = managerContact?.phone_number || branding?.phone || branding?.emergencyContact || ''

  const handleToggleTomorrow = async (session: 'BREAKFAST' | 'LUNCH' | 'DINNER', currentState: boolean) => {
    if (tomorrowDateStatus.isLockedForBoarder) {
      alert('রাত ১০:০০ টার কাটঅফ সময় শেষ হয়ে যাওয়ায় আগামীকালের খাবার পরিবর্তন লক করা হয়েছে। নিচে রোল বারে টেস্ট কাটঅফ বাইপাস সক্রিয় করে পরীক্ষা করতে পারেন।')
      return
    }

    try {
      await toggleMutation.mutateAsync({
        mealDate: tomorrowStr,
        session,
        newState: !currentState,
        targetBoarderId: activeBoarderId,
      })
      const sessionBn = session === 'BREAKFAST' ? 'সকালের নাস্তা' : session === 'LUNCH' ? 'দুপুরের খাবার' : 'রাতের খাবার'
      setToastMessage(`✅ আগামীকালের ${sessionBn} ${!currentState ? 'চালু (ON)' : 'বন্ধ (OFF)'} হয়েছে! কম্পিউটারের এডমিন ড্যাশবোর্ডে সিঙ্ক হচ্ছে...`)
      setTimeout(() => setToastMessage(null), 3500)
    } catch (err: any) {
      alert(err.message || 'মিল পরিবর্তন করা সম্ভব হয়নি।')
    }
  }

  // If authenticated as a resident boarder but no active allocation found
  if (!isStaffRole && !currentBoarder && isSupabaseConfigured && !isLoadingBoarders) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse">
          <Building className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-white tracking-tight">
            কোনো সক্রিয় সিট বরাদ্দ নেই
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            আপনার অ্যাকাউন্টে বর্তমানে কোনো সক্রিয় সিট বরাদ্দ পাওয়া যায়নি। সিট বরাদ্দ চূড়ান্ত হলে আপনার ব্যক্তিগত ড্যাশবোর্ড ও খাবার নিয়ন্ত্রণ অপশনটি সক্রিয় হবে।
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate('/portal/my-application')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            আবেদনের স্ট্যাটাস দেখুন
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-lg shadow-primary-500/20 transition-all"
          >
            লগইন পেজে যান
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Personalized Boarder Accommodation Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-xl shadow-indigo-600/30 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-indigo-400 font-extrabold text-xl">
                {boarderName.slice(0, 1)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  স্বাগতম, {boarderName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono">
                  {boarderCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {boarderStatus}
                </span>
              </div>

              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 pt-0.5">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  {boarderBuilding}
                </span>
                {boarderFlat && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-indigo-300 font-semibold">{boarderFlat}</span>
                  </>
                )}
                {boarderRoom && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-300 font-semibold">{boarderRoom}</span>
                  </>
                )}
                {!boarderFlat && !boarderRoom && boarderSeat && boarderSeat !== 'সিট বরাদ্দ নেই' && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-300 font-semibold">{boarderSeat}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Seat & Rent Info Box */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-2xl">
            <div className="space-y-0.5 pr-3 border-r border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">বরাদ্দকৃত সিট:</span>
              <span className="text-sm font-extrabold font-mono text-amber-400">
                {boarderSeat}
              </span>
            </div>
            <div className="space-y-0.5 pl-1">
              <span className="text-[10px] text-slate-400 block font-medium">মাসিক সিট ভাড়া:</span>
              <span className="text-sm font-extrabold font-mono text-emerald-400">
                {formatCurrencyBn(monthlySeatRent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Personal Boarder Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 🍽️ Today's Meals */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              আজকের খাবার (Today)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{todayStr}</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded-xl border ${todaySelection?.breakfast ?? true ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">সকাল 🍳</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.breakfast ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
            <div className={`p-2 rounded-xl border ${todaySelection?.lunch ?? true ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">দুপুর 🍛</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.lunch ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
            <div className={`p-2 rounded-xl border ${todaySelection?.dinner ?? true ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">রাত 🍲</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.dinner ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
          </div>
        </div>

        {/* Card 2: ⏰ 10:00 PM Cutoff Alert */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              ১০:০০ PM কাটঅফ
            </span>
            {tomorrowDateStatus.isLockedForBoarder ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                লকড
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                সক্রিয়
              </span>
            )}
          </div>

          <div className="text-base sm:text-lg font-bold text-white mt-2.5">
            {tomorrowDateStatus.isLockedForBoarder ? 'কাটঅফ সময় অতিক্রান্ত' : 'খাবার পরিবর্তন চলছে'}
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            {tomorrowDateStatus.isLockedForBoarder
              ? 'আগামীকালের মিল স্বয়ংক্রিয়ভাবে লক করা হয়েছে।'
              : 'আজ রাত ১০:০০ টার পূর্বে আগামীকালের খাবার নির্বাচন করুন।'}
          </p>

          <Link
            to="/portal/my-meals"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>সম্পূর্ণ মিল পোর্টাল খুলুন</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: 💳 My Due & Billing */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-rose-400" />
              চলতি মাসের বকেয়া
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              outstandingDue > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {outstandingDue > 0 ? 'Due' : 'পরিশোধিত'}
            </span>
          </div>

          <div className={`text-2xl sm:text-3xl font-extrabold font-mono mt-2 ${
            outstandingDue > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {formatCurrencyBn(outstandingDue)}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>পরিশোধিত: <strong className="text-emerald-400 font-mono">{formatCurrencyBn(totalPaid)}</strong></span>
            <span>মোট বিল: <strong className="text-slate-300 font-mono">{formatCurrencyBn(totalBilled)}</strong></span>
          </div>
        </div>

        {/* Card 4: 📊 Month Meal Summary */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-teal-400" />
              মিলের সারসংক্ষেপ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
              {bengaliMonthName}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-300 mt-2">
            {completedMealsCount} <span className="text-xs font-normal text-slate-400">টি মিল সম্পন্ন</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>মিল বাবদ খরচ:</span>
            <span className="text-teal-400 font-bold font-mono">
              {formatCurrencyBn(mealBillCharges || calculatedMealCost)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Tomorrow Meal Toggle & Cutoff Controller */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>আগামীকালের খাবার দ্রুত নির্ধারণ ({tomorrowStr})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              রাত ১০:০০ টার আগে অন/অফ নিশ্চিত করুন। বাবুর্চি এই তালিকা অনুযায়ী বাজার ও রান্না করবেন।
            </p>
          </div>

          {tomorrowDateStatus.isLockedForBoarder ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>লকড (কাটঅফ অতিক্রান্ত)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {tomorrowDateStatus.cutoffPassed ? '🧪 টেস্ট মোডে পরিবর্তন সক্রিয়' : 'পরিবর্তন সক্রিয় (রাত ১০:০০ PM পর্যন্ত)'}
              </span>
            </span>
          )}
        </div>

        {/* Live Toast Confirmation */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xl shadow-emerald-950/60 animate-fade-in">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {toastMessage}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">লাইভ সিঙ্ক</span>
          </div>
        )}

        {/* Test Mode Note when after 10 PM */}
        {tomorrowDateStatus.cutoffPassed && !tomorrowDateStatus.isLockedForBoarder && (
          <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-2.5 text-xs text-indigo-200">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              রাত ১০:০০ টা অতিক্রান্ত হলেও <strong>টেস্ট বাইপাস সক্রিয়</strong> থাকায় আপনি মোবাইল থেকে মিল অন/অফ পরীক্ষা করতে পারছেন। কম্পিউটারের এডমিন ড্যাশবোর্ডে সাথে সাথে সংখ্যা আপডেট হবে।
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Breakfast Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍳</span>
              <div>
                <div className="text-xs font-bold text-white">সকালের নাস্তা</div>
                <div className="text-[10px] text-slate-400">০৭:৩০ − ০৯:০০ (৳৩০)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('BREAKFAST', tomorrowSelection?.breakfast ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder || toggleMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tomorrowSelection?.breakfast ?? true
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.breakfast ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>

          {/* Lunch Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍛</span>
              <div>
                <div className="text-xs font-bold text-white">দুপুরের খাবার</div>
                <div className="text-[10px] text-slate-400">০১:০০ − ০২:৩০ (৳৬৫)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('LUNCH', tomorrowSelection?.lunch ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder || toggleMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tomorrowSelection?.lunch ?? true
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.lunch ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>

          {/* Dinner Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍲</span>
              <div>
                <div className="text-xs font-bold text-white">রাতের খাবার</div>
                <div className="text-[10px] text-slate-400">০৮:৩০ − ১০:০০ (৳৬০)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('DINNER', tomorrowSelection?.dinner ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder || toggleMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tomorrowSelection?.dinner ?? true
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-400'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.dinner ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Real Payment Receipts + Hostel Contact & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): My Official Payment Receipts */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                আমার সাম্প্রতিক পেমেন্ট রশিদ (Payment History)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              ডাটাবেসের সর্বশেষ মানি রিসিপ্ট
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">রশিদ নং</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3 text-right">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-center">মাধ্যম</th>
                  <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {boarderReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      কোনো পরিশোধিত মানি রিসিপ্ট পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  boarderReceipts.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {rec.receipt_number}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {formatDateBn(rec.receipt_date)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatCurrencyBn(rec.amount)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400">
                        {rec.payment_method === 'CASH'
                          ? 'নগদ ক্যাশ (Cash)'
                          : rec.payment_method === 'MFS'
                          ? 'মোবাইল ব্যাংকিং (MFS)'
                          : 'ব্যাংক ট্রান্সফার'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {rec.is_void ? 'বাতিল' : 'পরিশোধিত'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Hostel Rules & Dynamic Manager Contact */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Info className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              হোস্টেল সহায়তা ও নিয়মাবলী
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Dynamic Manager Helpline */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                জরুরি যোগাযোগ ও ম্যানেজার:
              </span>
              <div className="font-bold text-white text-sm">{helplineName}</div>
              <div className="flex items-center gap-1.5 text-indigo-300 font-mono text-xs pt-0.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{helplinePhone}</span>
              </div>
            </div>

            {/* Hostel Notice Board */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-400" />
                  হোস্টেল নোটিশ বোর্ড:
                </span>
                {boarderNotices.length > 0 && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                    {boarderNotices.length} টি নোটিশ
                  </span>
                )}
              </div>

              {boarderNotices.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-1">
                  বর্তমানে কোনো নতুন নোটিশ নেই।
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {boarderNotices.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-xs truncate">{n.title}</span>
                        <span className="text-[9px] text-slate-500 shrink-0">
                          {formatDateBn(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hostel Rules */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-slate-300 text-[11px]">
              <div className="font-semibold text-slate-200">আবাসিক নিয়মাবলি:</div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                {(branding.hostelRules || DEFAULT_BRANDING.hostelRules)
                  .split('\n')
                  .map((rule) => rule.trim().replace(/^[•\-\*]\s*/, ''))
                  .filter(Boolean)
                  .map((rule, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {rule}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BoarderDashboardPage

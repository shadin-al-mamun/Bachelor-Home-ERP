import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed,
  Calendar,
  Lock,
  CheckCheck,
  XCircle,
  AlertCircle,
  HelpCircle,
  Receipt,
  UserCheck,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import {
  getDhakaNow,
  formatDhakaDate,
  getDateMealStatus,
  useMealSettings,
  useActiveMealRates,
  useMealBoardersList,
  useBoarderMealSelections,
  useToggleMealMutation,
  useBatchToggleMealsMutation,
  isMealManagerRole,
} from './api/useMeals'
import type { MealSessionType } from './api/useMeals'
import { CutoffCountdownBanner } from './components/CutoffCountdownBanner'
import { MealSessionCard } from './components/MealSessionCard'
import { AdminMealOverrideModal } from './components/AdminMealOverrideModal'

export const BoarderMealPortal: React.FC = () => {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const isStaff = isMealManagerRole(profile?.role)

  // Current Dhaka Date baseline
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  // Default selected date to tomorrow (since meal planning is mostly for tomorrow)
  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr)
  const [selectedBoarderId, setSelectedBoarderId] = useState<string>('')

  // Override Modal state (for staff)
  const [overrideModal, setOverrideModal] = useState<{
    isOpen: boolean
    session: MealSessionType
    currentState: boolean
  } | null>(null)

  // API Hooks
  const { data: settings } = useMealSettings()
  const { data: rates } = useActiveMealRates()
  const { data: boarders = [] } = useMealBoardersList()
  const {
    data: selections = [],
    isLoading,
  } = useBoarderMealSelections(selectedBoarderId)

  const toggleMutation = useToggleMealMutation()
  const batchToggleMutation = useBatchToggleMealsMutation()

  React.useEffect(() => {
    if (boarders.length > 0) {
      if (profile?.role === 'BOARDER') {
        const matched = boarders.find(
          (b) =>
            b.user_id === profile.id ||
            b.id === profile.id ||
            b.phone_number === profile.phone_number ||
            b.full_name === profile.full_name
        )
        if (matched) {
          setSelectedBoarderId(matched.id)
        } else if (!isSupabaseConfigured && (!selectedBoarderId || selectedBoarderId === 'bdr-101') && boarders[0]) {
          setSelectedBoarderId(boarders[0].id)
        }
      } else {
        if ((!selectedBoarderId || selectedBoarderId === 'bdr-101') && boarders[0]) {
          setSelectedBoarderId(boarders[0].id)
        }
      }
    }
  }, [profile, boarders, selectedBoarderId])

  // Current active boarder info
  const activeBoarder = boarders.find((b) => b.id === selectedBoarderId) || (isStaff || !isSupabaseConfigured ? boarders[0] : null)

  // Date status calculation for selected date
  const dateStatus = getDateMealStatus(selectedDate, settings?.cutoff_time || '22:00:00')

  // Find meal selection for currently selected date
  const currentDaySelection = selections.find((s) => s.meal_date === selectedDate)

  const breakfastActive = currentDaySelection?.breakfast ?? true
  const lunchActive = currentDaySelection?.lunch ?? true
  const dinnerActive = currentDaySelection?.dinner ?? true

  // Rates
  const breakfastRate = rates?.breakfast_rate ?? 30.0
  const lunchRate = rates?.lunch_rate ?? 65.0
  const dinnerRate = rates?.dinner_rate ?? 60.0

  // Calculate day total cost
  const dayTotalCost =
    (breakfastActive ? breakfastRate : 0) +
    (lunchActive ? lunchRate : 0) +
    (dinnerActive ? dinnerRate : 0)

  // Generate 12-day date strip (past 1 day, today, next 10 days)
  const dateStrip = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(dhakaNow)
    d.setDate(d.getDate() - 1 + i)
    const dStr = formatDhakaDate(d)

    const sel = selections.find((s) => s.meal_date === dStr)
    // In Opt-Out mess policy, unrecorded days are ON by default
    const bOn = sel ? sel.breakfast : true
    const lOn = sel ? sel.lunch : true
    const dOn = sel ? sel.dinner : true
    const mealCount = (bOn ? 1 : 0) + (lOn ? 1 : 0) + (dOn ? 1 : 0)

    const dayNameBn = d.toLocaleDateString('bn-BD', { weekday: 'short' })
    const dayDateBn = d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })

    const isThisToday = dStr === todayStr
    const isThisTomorrow = dStr === tomorrowStr

    return {
      dateStr: dStr,
      dayNameBn,
      dayDateBn,
      isThisToday,
      isThisTomorrow,
      mealCount,
    }
  })

  // Handle single meal toggle
  const handleToggle = async (session: MealSessionType, currentState: boolean) => {
    if (dateStatus.isLockedForBoarder) {
      if (isStaff) {
        setOverrideModal({
          isOpen: true,
          session,
          currentState,
        })
        return
      }
      return
    }

    const targetId = selectedBoarderId || activeBoarder?.id
    try {
      await toggleMutation.mutateAsync({
        mealDate: selectedDate,
        session,
        newState: !currentState,
        targetBoarderId: targetId,
      })
    } catch (err: any) {
      alert(err.message || 'মিল পরিবর্তন করতে সমস্যা হয়েছে।')
    }
  }

  // Handle batch toggling (All ON / All OFF)
  const handleBatch = async (allOn: boolean) => {
    if (dateStatus.isLockedForBoarder && !isStaff) return

    const targetId = selectedBoarderId || activeBoarder?.id
    try {
      await batchToggleMutation.mutateAsync({
        mealDate: selectedDate,
        breakfast: allOn,
        lunch: allOn,
        dinner: allOn,
        targetBoarderId: targetId,
      })
    } catch (err: any) {
      alert(err.message || 'ব্যাচ পরিবর্তন করতে সমস্যা হয়েছে।')
    }
  }

  if (!isStaff && isSupabaseConfigured && !activeBoarder && !isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse">
          <UtensilsCrossed className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-white tracking-tight">
            কোনো সক্রিয় সিট বরাদ্দ নেই
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            আপনার অ্যাকাউন্টে বর্তমানে কোনো সক্রিয় সিট বরাদ্দ পাওয়া যায়নি। সিট বরাদ্দ না থাকলে মিল চালু বা বন্ধ করা সম্ভব নয়। সিট বরাদ্দের জন্য হোস্টেল কর্তৃপক্ষের সাথে যোগাযোগ করুন।
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
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 p-0.5 shadow-lg shadow-amber-600/30 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                মিল নির্বাচন ও ১০:০০ PM কাটঅফ পোর্টাল
              </h1>
              <p className="text-xs text-slate-400">
                বর্ডার সেলফ-সার্ভিস মিল অন/অফ এবং রিয়েল-টাইম বাংলাদেশ কাটঅফ মনিটরিং
              </p>
            </div>
          </div>
        </div>

        {/* Staff Switcher: Manage for any boarder */}
        {isStaff && boarders.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 px-3">
            <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-400 shrink-0">বর্ডার:</span>
            <select
              value={selectedBoarderId}
              onChange={(e) => setSelectedBoarderId(e.target.value)}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              {boarders.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.full_name} ({b.room_name || b.boarder_code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Asia/Dhaka Real-time Clock & 10:00 PM Cutoff Countdown Banner */}
      <CutoffCountdownBanner cutoffTimeStr={settings?.cutoff_time || '22:00:00'} />

      {/* Interactive Horizontal Date Strip / Week Calendar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            তারিখ নির্বাচন করুন (Date Strip):
          </span>
          <span className="text-[11px] text-slate-500">
            পরবর্তী দিনগুলোর খাবার অগ্রিম নির্বাচন করতে পারেন
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {dateStrip.map((item) => {
            const isSelected = item.dateStr === selectedDate

            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex-shrink-0 px-3.5 py-2.5 rounded-2xl border text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-400/80 shadow-lg shadow-indigo-600/30 scale-105'
                    : item.isThisToday
                    ? 'bg-slate-900/90 text-slate-200 border-amber-500/40 hover:border-amber-400'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider">
                  {item.isThisToday ? 'আজ' : item.isThisTomorrow ? 'আগামীকাল' : item.dayNameBn}
                </div>
                <div className="text-xs font-mono font-extrabold mt-0.5">
                  {item.dayDateBn}
                </div>
                <div className="text-[9px] mt-1 font-semibold flex items-center justify-center gap-0.5">
                  {item.mealCount === 3 ? (
                    <span className="text-emerald-400">🍳🍛🍲 ৩টি</span>
                  ) : item.mealCount > 0 ? (
                    <span className="text-amber-400">{item.mealCount}টি মিল</span>
                  ) : (
                    <span className="text-slate-500">বন্ধ</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Status & Batch Actions Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white">
                {dateStatus.isToday
                  ? 'আজকের মিল'
                  : dateStatus.isTomorrow
                  ? 'আগামীকালের মিল'
                  : `${selectedDate} তারিখের মিল`}
              </h2>

              {dateStatus.isLockedForBoarder ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <Lock className="w-3 h-3" />
                  <span>লকড (Locked)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>পরিবর্তন সক্রিয় (Unlocked)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              বর্ডার: <span className="text-slate-200 font-semibold">{activeBoarder?.full_name}</span>{' '}
              ({activeBoarder?.room_name})
            </p>
          </div>
        </div>

        {/* Quick Batch Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => handleBatch(true)}
            disabled={dateStatus.isLockedForBoarder && !isStaff}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>সকল মিল অন</span>
          </button>
          <button
            onClick={() => handleBatch(false)}
            disabled={dateStatus.isLockedForBoarder && !isStaff}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>সকল মিল অফ</span>
          </button>
        </div>
      </div>

      {/* 3 Meal Session Toggle Cards (Breakfast, Lunch, Dinner) */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">মিল ডেটা লোড হচ্ছে...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: 🍳 Breakfast */}
          <MealSessionCard
            session="BREAKFAST"
            isActive={breakfastActive}
            price={breakfastRate}
            mealDate={selectedDate}
            isLocked={dateStatus.isLockedForBoarder}
            lockReason={
              dateStatus.isPast
                ? 'অতীত দিনের খাবার পরিবর্তন অসম্ভব'
                : dateStatus.isToday
                ? 'আজকের খাবার পরিবর্তন লকড'
                : 'রাত ১০:০০ টা কাটঅফ অতিক্রান্ত'
            }
            canOverride={isStaff}
            onToggle={() => handleToggle('BREAKFAST', breakfastActive)}
            onOpenOverride={() =>
              setOverrideModal({
                isOpen: true,
                session: 'BREAKFAST',
                currentState: breakfastActive,
              })
            }
            isPending={toggleMutation.isPending}
          />

          {/* Card 2: 🍛 Lunch */}
          <MealSessionCard
            session="LUNCH"
            isActive={lunchActive}
            price={lunchRate}
            mealDate={selectedDate}
            isLocked={dateStatus.isLockedForBoarder}
            lockReason={
              dateStatus.isPast
                ? 'অতীত দিনের খাবার পরিবর্তন অসম্ভব'
                : dateStatus.isToday
                ? 'আজকের খাবার পরিবর্তন লকড'
                : 'রাত ১০:০০ টা কাটঅফ অতিক্রান্ত'
            }
            canOverride={isStaff}
            onToggle={() => handleToggle('LUNCH', lunchActive)}
            onOpenOverride={() =>
              setOverrideModal({
                isOpen: true,
                session: 'LUNCH',
                currentState: lunchActive,
              })
            }
            isPending={toggleMutation.isPending}
          />

          {/* Card 3: 🍲 Dinner */}
          <MealSessionCard
            session="DINNER"
            isActive={dinnerActive}
            price={dinnerRate}
            mealDate={selectedDate}
            isLocked={dateStatus.isLockedForBoarder}
            lockReason={
              dateStatus.isPast
                ? 'অতীত দিনের খাবার পরিবর্তন অসম্ভব'
                : dateStatus.isToday
                ? 'আজকের খাবার পরিবর্তন লকড'
                : 'রাত ১০:০০ টা কাটঅফ অতিক্রান্ত'
            }
            canOverride={isStaff}
            onToggle={() => handleToggle('DINNER', dinnerActive)}
            onOpenOverride={() =>
              setOverrideModal({
                isOpen: true,
                session: 'DINNER',
                currentState: dinnerActive,
              })
            }
            isPending={toggleMutation.isPending}
          />
        </div>
      )}

      {/* Daily Cost Summary & Forecast Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card A: Selected Day Cost */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-400" />
              নির্বাচিত দিনের মোট খরচ:
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-white">
              ৳{dayTotalCost.toFixed(2)}
            </div>
            <p className="text-[10px] text-slate-400">
              {breakfastActive ? 'সকাল' : ''} {lunchActive ? 'দুপুর' : ''}{' '}
              {dinnerActive ? 'রাত' : ''} ({dayTotalCost > 0 ? 'চালু আছে' : 'কোনো খাবার নেই'})
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              দৈনিক হিসাব
            </span>
          </div>
        </div>

        {/* Card B: Monthly Forecast Estimation */}
        <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-400" />
              চলতি মাসের খাবার অনুমান (Forecast):
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-300">
              ৳{(selections.length * 155).toLocaleString('en-IN')}
            </div>
            <p className="text-[10px] text-slate-400">
              মাসশেষে প্রকৃত খাওয়া মিলের সংখ্যা অনুযায়ী চূড়ান্ত বিল যুক্ত হবে
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
              মাসিক বিলিং
            </span>
          </div>
        </div>
      </div>

      {/* Hostel Meal Policy Guidelines Card */}
      <div className="p-5 rounded-3xl bg-slate-950/60 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold text-slate-200">
            হোস্টেল খাবার নীতি ও নিয়মাবলী (Meal Rules & Cutoff Guidelines):
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-400 leading-relaxed">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>রাত ১০:০০ টা কাটঅফ নীতি</span>
            </div>
            <p>
              পরদিনের বাজার ও কিচেন প্রস্তুতির সুবিধার্থে প্রতিদিন রাত ১০:০০:০০ টায় সিস্টেম স্বয়ংক্রিয়ভাবে লক হয়ে যায়। এরপর কোনো মিল পরিবর্তন গ্রহণযোগ্য নয়।
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>অগ্রিম মিল নির্ধারণ</span>
            </div>
            <p>
              বর্ডারগণ যেকোনো সময় আগামী ৭ থেকে ১৪ দিনের মিল আগে থেকেই অন অথবা অফ করে রাখতে পারেন।
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>জরুরি কাটঅফ ওভাররাইড</span>
            </div>
            <p>
              ১০:০০ টার পর আকস্মিক প্রয়োজনে শুধুমাত্র দায়িত্বরত ম্যানেজার বা এডমিন সুনির্দিষ্ট কারণ উল্লেখপূর্বক ডাটাবেস অডিট ট্রেইলে ওভাররাইড করতে পারেন।
            </p>
          </div>
        </div>
      </div>

      {/* Admin Override Modal */}
      {overrideModal && (
        <AdminMealOverrideModal
          isOpen={overrideModal.isOpen}
          onClose={() => setOverrideModal(null)}
          mealDate={selectedDate}
          session={overrideModal.session}
          currentState={overrideModal.currentState}
          targetBoarderId={selectedBoarderId}
          boarderName={activeBoarder?.full_name || 'বর্ডার'}
        />
      )}
    </div>
  )
}

export default BoarderMealPortal

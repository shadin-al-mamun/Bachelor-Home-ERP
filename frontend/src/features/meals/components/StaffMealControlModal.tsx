import React, { useState, useEffect } from 'react'
import {
  X,
  SlidersHorizontal,
  Calendar,
  Check,
  AlertTriangle,
  User,
  ShieldCheck,
  Search,
  CheckCircle2,
} from 'lucide-react'
import {
  formatDhakaDate,
  getDhakaNow,
  useMealBoardersList,
  useBoarderMealSelections,
  useBatchToggleMealsMutation,
  useActiveMealRates,
} from '../api/useMeals'
import type { MealSessionType } from '../api/useMeals'
import { updateMockFlatBoarderMeal } from '../api/useKitchenMeals'

export interface StaffMealControlModalProps {
  isOpen: boolean
  onClose: () => void
  initialBoarderId?: string
  initialDate?: string
  initialSession?: MealSessionType
}

export const StaffMealControlModal: React.FC<StaffMealControlModalProps> = ({
  isOpen,
  onClose,
  initialBoarderId,
  initialDate,
  initialSession,
}) => {
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  const dayAfter = new Date(dhakaNow)
  dayAfter.setDate(dayAfter.getDate() + 2)
  const dayAfterStr = formatDhakaDate(dayAfter)

  // State
  const [selectedBoarderId, setSelectedBoarderId] = useState<string>(initialBoarderId || 'bdr-101')
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || tomorrowStr)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [overrideReason, setOverrideReason] = useState<string>('বর্ডারের ফোন অনুরোধ')
  const [customReason, setCustomReason] = useState<string>('')
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Meal selections state for the modal
  const [breakfast, setBreakfast] = useState<boolean>(true)
  const [lunch, setLunch] = useState<boolean>(true)
  const [dinner, setDinner] = useState<boolean>(true)

  // Fetch boarders & rates & selections
  const { data: boarders = [] } = useMealBoardersList()
  const { data: rates } = useActiveMealRates()
  const { data: selections = [] } = useBoarderMealSelections(selectedBoarderId)
  const batchToggleMutation = useBatchToggleMealsMutation()

  // Find active boarder
  const activeBoarder = boarders.find((b) => b.id === selectedBoarderId) || boarders[0]

  // Filter boarders by search query
  const filteredBoarders = boarders.filter((b) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      b.full_name.toLowerCase().includes(q) ||
      b.boarder_code.toLowerCase().includes(q) ||
      b.phone_number.toLowerCase().includes(q) ||
      (b.room_name && b.room_name.toLowerCase().includes(q)) ||
      (b.flat_name && b.flat_name.toLowerCase().includes(q))
    )
  })

  // Synchronize modal state with existing meal selection
  useEffect(() => {
    if (initialBoarderId) {
      setSelectedBoarderId(initialBoarderId)
    }
  }, [initialBoarderId])

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
    }
  }, [initialDate])

  useEffect(() => {
    const current = selections.find((s) => s.meal_date === selectedDate)
    if (current) {
      setBreakfast(current.breakfast)
      setLunch(current.lunch)
      setDinner(current.dinner)
    } else {
      // Default initial states
      setBreakfast(true)
      setLunch(true)
      setDinner(true)
    }

    if (initialSession) {
      if (initialSession === 'BREAKFAST') setBreakfast((prev) => !prev)
      if (initialSession === 'LUNCH') setLunch((prev) => !prev)
      if (initialSession === 'DINNER') setDinner((prev) => !prev)
    }
  }, [selectedBoarderId, selectedDate, selections, initialSession])

  if (!isOpen) return null

  const breakfastRate = rates?.breakfast_rate ?? 30
  const lunchRate = rates?.lunch_rate ?? 65
  const dinnerRate = rates?.dinner_rate ?? 60

  const totalMealCount = (breakfast ? 1 : 0) + (lunch ? 1 : 0) + (dinner ? 1 : 0)
  const totalCost =
    (breakfast ? breakfastRate : 0) +
    (lunch ? lunchRate : 0) +
    (dinner ? dinnerRate : 0)

  const quickReasonPresets = [
    'বর্ডারের ফোন অনুরোধ',
    'জরুরি মেহমান মিল',
    'অফিস থেকে ফিরতে দেরি',
    'ভুল সংশোধন',
    'হোস্টেল বাইরে থাকার দরখাস্ত',
  ]

  const handleApply = async () => {
    setErrorToast(null)
    setSuccessToast(null)

    const finalReason = customReason.trim() || overrideReason || 'কর্তৃপক্ষ কর্তৃক মিল পরিবর্তন (Staff Override)'

    try {
      await batchToggleMutation.mutateAsync({
        mealDate: selectedDate,
        breakfast,
        lunch,
        dinner,
        targetBoarderId: selectedBoarderId,
        overrideReason: finalReason,
      })

      // Sync mock detail table if in local/mock mode
      updateMockFlatBoarderMeal(selectedBoarderId, 'BREAKFAST', breakfast, true, finalReason)
      updateMockFlatBoarderMeal(selectedBoarderId, 'LUNCH', lunch, true, finalReason)
      updateMockFlatBoarderMeal(selectedBoarderId, 'DINNER', dinner, true, finalReason)

      setSuccessToast(
        `${activeBoarder?.full_name || 'বর্ডার'} এর ${selectedDate} তারিখের মিল সফলভাবে আপডেট হয়েছে!`
      )

      setTimeout(() => {
        setSuccessToast(null)
        onClose()
      }, 1200)
    } catch (err: any) {
      setErrorToast(err?.message || 'মিল পরিবর্তন করতে সমস্যা হয়েছে।')
    }
  }

  const handleSetAll = (state: boolean) => {
    setBreakfast(state)
    setLunch(state)
    setDinner(state)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center text-white">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>বর্ডার মিল কন্ট্রোল ও এডমিন ওভাররাইড</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Staff Access
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                এডমিন বা ম্যানেজার যেকোনো বর্ডারের মিল যেকোনো সময় অন বা অফ করতে পারেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Alerts */}
        {successToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
        )}

        {errorToast && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Section 1: Boarder Selection & Search */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              বর্ডার নির্বাচন করুন:
            </span>
            <span className="text-[11px] text-slate-400">
              নির্বাচিত: <strong className="text-white">{activeBoarder?.full_name}</strong> ({activeBoarder?.boarder_code})
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="নাম, ফোন বা কোড দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Boarder Dropdown */}
            <select
              value={selectedBoarderId}
              onChange={(e) => setSelectedBoarderId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {filteredBoarders.map((b) => (
                <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                  {b.full_name} — {b.boarder_code} ({b.room_name || b.flat_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 2: Date Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              মিল তারিখ নির্বাচন:
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  selectedDate === todayStr
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                আজ
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  selectedDate === tomorrowStr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                আগামীকাল
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(dayAfterStr)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  selectedDate === dayAfterStr
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                পরশু
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Section 3: Cutoff Bypass Badge Notice */}
        <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-2.5 text-xs text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            <span className="font-bold text-white">এডমিন/ম্যানেজার কাটঅফ বাইপাস সক্রিয়:</span> রাত ১০:০০ টার কাটঅফ পার হয়ে গেলেও আপনি যেকোনো বর্ডারের খাবার অন বা অফ করতে পারবেন। এই পরিবর্তন সরাসরি কিচেন শিটে প্রতিফলিত হবে।
          </div>
        </div>

        {/* Section 4: Three Meal Sessions Interactive Toggles */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              খাবার অন/অফ নির্ধারণ (Sessions):
            </span>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSetAll(true)}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                সব খাবার চালু
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => handleSetAll(false)}
                className="text-rose-400 hover:text-rose-300 font-semibold transition-colors"
              >
                সব খাবার বন্ধ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Breakfast Toggle Card */}
            <div
              onClick={() => setBreakfast(!breakfast)}
              className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                breakfast
                  ? 'bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🍳</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    breakfast
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {breakfast ? 'চালু (ON)' : 'বন্ধ (OFF)'}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-white">সকালের নাস্তা</div>
                <div className="text-[11px] text-amber-400/90 font-mono mt-0.5">
                  ৳{breakfastRate}
                </div>
              </div>
            </div>

            {/* Lunch Toggle Card */}
            <div
              onClick={() => setLunch(!lunch)}
              className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                lunch
                  ? 'bg-emerald-500/10 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🍛</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    lunch
                      ? 'bg-emerald-500 text-slate-950 font-extrabold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {lunch ? 'চালু (ON)' : 'বন্ধ (OFF)'}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-white">দুপুরের খাবার</div>
                <div className="text-[11px] text-emerald-400/90 font-mono mt-0.5">
                  ৳{lunchRate}
                </div>
              </div>
            </div>

            {/* Dinner Toggle Card */}
            <div
              onClick={() => setDinner(!dinner)}
              className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                dinner
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-md shadow-indigo-500/10'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🍲</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    dinner
                      ? 'bg-indigo-500 text-white font-extrabold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {dinner ? 'চালু (ON)' : 'বন্ধ (OFF)'}
                </span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-white">রাতের খাবার</div>
                <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
                  ৳{dinnerRate}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>
              মোট সক্রিয় মিল: <strong className="text-white">{totalMealCount}টি</strong>
            </span>
            <span>
              নির্বাচিত দিনের মোট মূল্য: <strong className="text-amber-300 font-mono">৳{totalCost}</strong>
            </span>
          </div>
        </div>

        {/* Section 5: Override Reason Tags & Custom Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>পরিবর্তনের সুনির্দিষ্ট কারণ (Audit Note):</span>
            <span className="text-[10px] text-slate-500">ডাটাবেজে সংরক্ষিত হবে</span>
          </label>

          <div className="flex flex-wrap gap-1.5">
            {quickReasonPresets.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setOverrideReason(r)
                  setCustomReason('')
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                  overrideReason === r && !customReason
                    ? 'bg-indigo-600 text-white border border-indigo-400/50'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="অথবা কাস্টম কারণ লিখুন..."
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            বাতিল
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={batchToggleMutation.isPending}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {batchToggleMutation.isPending ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>পরিবর্তন সংরক্ষণ করুন</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default StaffMealControlModal

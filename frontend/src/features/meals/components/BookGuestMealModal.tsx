import React, { useState } from 'react'
import {
  X,
  Users,
  Calendar,
  Clock,
  Info,
  Check,
  AlertTriangle,
  Plus,
  Minus,
} from 'lucide-react'
import Button from '@/components/common/Button'
import { useBookGuestMealMutation } from '../api/useGuestMeals'
import { useActiveMealRates, formatDhakaDate, getDhakaNow, type MealSessionType } from '../api/useMeals'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'

interface BookGuestMealModalProps {
  isOpen: boolean
  onClose: () => void
  boarderId: string
  flatId?: string | null
  initialDate?: string
  initialSession?: MealSessionType
}

export const BookGuestMealModal: React.FC<BookGuestMealModalProps> = ({
  isOpen,
  onClose,
  boarderId,
  flatId = null,
  initialDate,
  initialSession = 'LUNCH',
}) => {
  const dhakaNow = getDhakaNow()
  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const defaultDateStr = formatDhakaDate(tomorrow)

  const [mealDate, setMealDate] = useState<string>(initialDate || defaultDateStr)
  const [session, setSession] = useState<MealSessionType>(initialSession)
  const [guestCount, setGuestCount] = useState<number>(1)
  const [remarks, setRemarks] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState(false)

  const { data: rates } = useActiveMealRates()
  const bookMutation = useBookGuestMealMutation()

  if (!isOpen) return null

  const breakfastRate = rates?.breakfast_rate ?? 0
  const lunchRate = rates?.lunch_rate ?? 0
  const dinnerRate = rates?.dinner_rate ?? 0

  const currentRate =
    session === 'BREAKFAST'
      ? breakfastRate
      : session === 'LUNCH'
      ? lunchRate
      : dinnerRate

  const totalCost = guestCount * currentRate

  const sessionOptions = [
    {
      id: 'BREAKFAST' as MealSessionType,
      nameBn: 'সকালের নাস্তা',
      emoji: '🍳',
      time: '০৭:৩০ − ০৯:০০',
      rate: breakfastRate,
      color: 'amber',
    },
    {
      id: 'LUNCH' as MealSessionType,
      nameBn: 'দুপুরের খাবার',
      emoji: '🍛',
      time: '০১:০০ − ০২:৩০',
      rate: lunchRate,
      color: 'emerald',
    },
    {
      id: 'DINNER' as MealSessionType,
      nameBn: 'রাতের খাবার',
      emoji: '🍲',
      time: '০৮:৩০ − ১০:০০',
      rate: dinnerRate,
      color: 'indigo',
    },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (guestCount < 1) {
      setErrorMessage('অনুগ্রহ করে কমপক্ষে ১টি গেস্ট মিল নির্বাচন করুন।')
      return
    }

    try {
      await bookMutation.mutateAsync({
        boarderId,
        flatId,
        mealDate,
        session,
        guestCount,
        unitRate: currentRate,
        remarks: remarks.trim() || 'মেহমান মিল',
      })

      setSuccessToast(true)
      setTimeout(() => {
        setSuccessToast(false)
        setGuestCount(1)
        setRemarks('')
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err.message || 'গেস্ট মিল বুক করতে সমস্যা হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shadow-lg shadow-amber-500/10">
              👥
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>গেস্ট মিল অন করুন</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  + Guest Meal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                আমন্ত্রিত মেহমান বা অতিথিদের জন্য খাবার বুকিং
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Success Banner */}
          {successToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>গেস্ট মিল সফলভাবে অন করা হয়েছে! কিচেন তালিকায় সংখ্যা আপডেট হয়েছে।</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Date Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>খাবারের তারিখ (Meal Date):</span>
            </label>
            <input
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              min={formatDhakaDate(dhakaNow)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
            />
            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
              <span>নির্বাচিত দিন: {formatDateBn(mealDate)}</span>
              {mealDate === defaultDateStr && (
                <span className="text-amber-400 font-bold">আগামীকাল</span>
              )}
            </div>
          </div>

          {/* 2. Meal Session Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>খাবারের বেলা নির্বাচন করুন:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {sessionOptions.map((opt) => {
                const isSelected = session === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSession(opt.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{opt.emoji}</span>
                      <span
                        className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {formatCurrencyBn(opt.rate)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <div className="text-xs font-bold text-white">{opt.nameBn}</div>
                      <div className="text-[9px] text-slate-400">{opt.time}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Guest Count Stepper */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>গেস্ট মিল সংখ্যা (Number of Guests):</span>
              </span>
              <span className="text-[11px] text-slate-400">সর্বোচ্চ ১০টি</span>
            </label>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl p-1 shadow-inner">
                <button
                  type="button"
                  disabled={guestCount <= 1}
                  onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="w-16 text-center font-bold text-lg text-white font-mono">
                  {guestCount}
                </div>

                <button
                  type="button"
                  disabled={guestCount >= 10}
                  onClick={() => setGuestCount((c) => Math.min(10, c + 1))}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuestCount(num)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      guestCount === num
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Remarks (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              মেহমানের বিবরণ / মন্তব্য (ঐচ্ছিক):
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="যেমন: ছোট ভাই / বন্ধু আসবে"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 5. Live Calculation Summary Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-slate-950 border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>মিল রেট:</span>
              <span className="font-mono text-white font-medium">{formatCurrencyBn(currentRate)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>গেস্ট সংখ্যা:</span>
              <span className="font-mono text-white font-medium">{guestCount} জন</span>
            </div>
            <div className="border-t border-indigo-500/20 pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">সর্বমোট প্রদেয় বিল:</span>
              <span className="text-base font-bold text-amber-400 font-mono">
                {formatCurrencyBn(totalCost)}
              </span>
            </div>
          </div>

          {/* Policy Notice */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              রাত ১০:০০ টার কাটঅফ সময়ের পূর্বে আপনি যেকোনো সময় গেস্ট মিল যুক্ত বা বাতিল করতে পারবেন। এটি কিচেন মেস কন্টেইনার এবং আপনার মাসিক খাবারের বিলে যুক্ত হবে।
            </span>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={bookMutation.isPending}
              className="px-4 py-2.5 text-xs"
            >
              বাতিল
            </Button>

            <Button
              type="submit"
              disabled={bookMutation.isPending || guestCount < 1}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-6 py-2.5 text-xs shadow-lg shadow-amber-500/20"
            >
              {bookMutation.isPending ? 'বুকিং হচ্ছে...' : 'গেস্ট মিল কনফার্ম করুন'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

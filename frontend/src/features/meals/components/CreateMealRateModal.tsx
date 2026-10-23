import React, { useState } from 'react'
import {
  DollarSign,
  Calendar,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { useCreateMealRateMutation, useMealRateHistory } from '../api/useMealSettingsAndRates'

interface CreateMealRateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const CreateMealRateModal: React.FC<CreateMealRateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { data: rateHistory = [] } = useMealRateHistory()
  const activeRate = rateHistory.find((r) => !r.effective_to) || rateHistory[0]

  const todayStr = new Date().toISOString().slice(0, 10)
  const [effectiveFrom, setEffectiveFrom] = useState<string>(todayStr)
  const [breakfastRate, setBreakfastRate] = useState<string>(
    activeRate ? String(activeRate.breakfast_rate) : ''
  )
  const [lunchRate, setLunchRate] = useState<string>(
    activeRate ? String(activeRate.lunch_rate) : ''
  )
  const [dinnerRate, setDinnerRate] = useState<string>(
    activeRate ? String(activeRate.dinner_rate) : ''
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Keep inputs synchronized with active rate whenever modal is opened
  React.useEffect(() => {
    if (activeRate) {
      setBreakfastRate(String(activeRate.breakfast_rate))
      setLunchRate(String(activeRate.lunch_rate))
      setDinnerRate(String(activeRate.dinner_rate))
    }
  }, [activeRate, isOpen])

  const createRateMutation = useCreateMealRateMutation()

  if (!isOpen) return null

  const numBreakfast = parseFloat(breakfastRate) || 0
  const numLunch = parseFloat(lunchRate) || 0
  const numDinner = parseFloat(dinnerRate) || 0
  const totalDaily = numBreakfast + numLunch + numDinner

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (numBreakfast < 0 || numLunch < 0 || numDinner < 0) {
      setErrorMsg('মিলের রেট ঋণাত্মক হতে পারে না।')
      return
    }

    if (!effectiveFrom) {
      setErrorMsg('কার্যকর শুরুর তারিখ নির্বাচন করুন।')
      return
    }

    try {
      const res = await createRateMutation.mutateAsync({
        effectiveFrom,
        breakfastRate: numBreakfast,
        lunchRate: numLunch,
        dinnerRate: numDinner,
      })

      setSuccessMsg(res?.message || 'নতুন মিল রেট সফলভাবে কার্যকর হয়েছে!')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err: any) {
      setErrorMsg(err.message || 'মিল রেট সংরক্ষণ করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl shadow-amber-500/10 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center text-slate-950">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                নতুন মিল রেট সিডিউল
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  এডমিন
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                নাস্তা, দুপুর ও রাতের খাবারের একক রেট নির্ধারণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active Rate Comparison Pill */}
        {activeRate && (
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">বর্তমান কার্যকর রেট:</span>
            <span className="font-mono font-bold text-slate-200">
              🍳 ৳{activeRate.breakfast_rate} • 🍛 ৳{activeRate.lunch_rate} • 🍲 ৳{activeRate.dinner_rate}
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              কার্যকর শুরুর তারিখ (Effective From) <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-[10px] text-slate-500">
              এই তারিখ থেকে সকল বর্ডারের খাবারের বিলে নতুন রেট প্রযোজ্য হবে।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Breakfast */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-300 block">
                🍳 নাস্তা (টাকা) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">৳</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  placeholder="30"
                  value={breakfastRate}
                  onChange={(e) => setBreakfastRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-amber-500/30 text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Lunch */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-emerald-300 block">
                🍛 দুপুর (টাকা) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">৳</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  placeholder="65"
                  value={lunchRate}
                  onChange={(e) => setLunchRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Dinner */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-300 block">
                🍲 রাত (টাকা) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">৳</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  placeholder="60"
                  value={dinnerRate}
                  onChange={(e) => setDinnerRate(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/30 text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Daily Total Summary Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-indigo-500/10 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                দৈনিক ফুল মিল বাজেট (৩ বেলা):
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                প্রতি বোর্ডার প্রতিদিন নিয়মিত খাবার গ্রহণ করলে
              </p>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-extrabold text-amber-300">
                ৳{totalDaily.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                মাসিক ~৳{(totalDaily * 30).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={createRateMutation.isPending}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={createRateMutation.isPending}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>{createRateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'নতুন রেট কার্যকর করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

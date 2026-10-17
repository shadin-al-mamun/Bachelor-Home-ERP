import React, { useState } from 'react'
import {
  ShieldAlert,
  X,
  AlertCircle,
  Calendar,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import type { MealSessionType } from '../api/useMeals'
import { useToggleMealMutation } from '../api/useMeals'

interface AdminMealOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  mealDate: string
  session: MealSessionType
  currentState: boolean
  targetBoarderId: string
  boarderName: string
}

export const AdminMealOverrideModal: React.FC<AdminMealOverrideModalProps> = ({
  isOpen,
  onClose,
  mealDate,
  session,
  currentState,
  targetBoarderId,
  boarderName,
}) => {
  const [targetState, setTargetState] = useState<boolean>(!currentState)
  const [reason, setReason] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const toggleMutation = useToggleMealMutation()

  if (!isOpen) return null

  const sessionNameBn =
    session === 'BREAKFAST'
      ? 'সকালের নাস্তা (Breakfast)'
      : session === 'LUNCH'
      ? 'দুপুরের খাবার (Lunch)'
      : 'রাতের খাবার (Dinner)'

  const isFormValid = reason.trim().length >= 5 && !toggleMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setErrorMsg(null)
    try {
      await toggleMutation.mutateAsync({
        mealDate,
        session,
        newState: targetState,
        overrideReason: reason.trim(),
        targetBoarderId,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'কাটঅফ ওভাররাইড করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                এডমিন মিল কাটঅফ ওভাররাইড (Admin Override)
              </h2>
              <p className="text-xs text-slate-400">
                জরুরি প্রয়োজনে কাটঅফ সমাপ্তির পর মিল পরিবর্তন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={toggleMutation.isPending}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Target Details Card */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              বর্ডারের নাম:
            </span>
            <span className="font-bold text-white">{boarderName}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              তারিখ:
            </span>
            <span className="font-mono font-semibold text-slate-200">{mealDate}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-400" />
              মিল সেশন:
            </span>
            <span className="font-semibold text-amber-300">{sessionNameBn}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action State Choice */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              কাঙ্ক্ষিত মিল স্ট্যাটাস <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetState(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  targetState
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>মিল চালু (ON)</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetState(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                  !targetState
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span>মিল বন্ধ (OFF)</span>
              </button>
            </div>
          </div>

          {/* Mandatory Override Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-rose-300 flex items-center justify-between">
              <span>
                কাটঅফ ওভাররাইডের সুনির্দিষ্ট কারণ <span className="text-rose-400">*</span>
              </span>
              <span className="text-[10px] text-rose-400/80">কমপক্ষে ৫ অক্ষর বাধ্যতামূলক</span>
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: বর্ডার জরুরি পারিবারিক কাজে বাড়ি যাচ্ছেন, ম্যানেজারের বিশেষ অনুমোদন সাপেক্ষে অফ করা হলো..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* Audit Trail Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
            <p className="font-semibold text-amber-200">
              অডিট লগ সংরক্ষণ সতর্কতা:
            </p>
            <p className="text-[11px] text-amber-200/80">
              কাটঅফ পরবর্তী প্রতিটি পরিবর্তন অপরিবর্তনীয় ডাটাবেস অডিট ট্রেইলে (`meal_change_audit`) অ্যাডমিনের আইডি ও কারণসহ আজীবনের জন্য সংরক্ষিত হবে।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={toggleMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-lg shadow-amber-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              {toggleMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>ওভাররাইড হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>ওভাররাইড কার্যকর করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

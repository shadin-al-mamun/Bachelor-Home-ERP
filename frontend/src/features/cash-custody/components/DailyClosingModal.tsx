import React, { useState } from 'react'
import {
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Banknote,
  Calendar,
  User,
} from 'lucide-react'
import type { ExtendedCashSession } from '../api/useCashSession'
import { useSubmitDailyCashCloseMutation } from '../api/useCashSession'

interface DailyClosingModalProps {
  session: ExtendedCashSession
  calculatedExpected: number
  isOpen: boolean
  onClose: () => void
}

export const DailyClosingModal: React.FC<DailyClosingModalProps> = ({
  session,
  calculatedExpected,
  isOpen,
  onClose,
}) => {
  const [actualCountedCashStr, setActualCountedCashStr] = useState<string>('')
  const [explanation, setExplanation] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const submitCloseMutation = useSubmitDailyCashCloseMutation()

  if (!isOpen) return null

  const actualCounted = actualCountedCashStr !== '' ? parseFloat(actualCountedCashStr) : null
  const variance = actualCounted !== null && !isNaN(actualCounted)
    ? actualCounted - calculatedExpected
    : null

  const isVarianceNonZero = variance !== null && Math.abs(variance) > 0.01
  const isExplanationMandatory = isVarianceNonZero
  const isExplanationValid = !isExplanationMandatory || explanation.trim().length >= 5

  const canSubmit =
    actualCounted !== null &&
    !isNaN(actualCounted) &&
    actualCounted >= 0 &&
    isExplanationValid &&
    !submitCloseMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || actualCounted === null) return

    if (isVarianceNonZero && explanation.trim().length < 5) {
      setErrorMsg('ক্যাশ ঘাটতি বা উদ্বৃত্ত থাকায় অন্তত ৫ অক্ষরের কৈফিয়ত প্রদান করা বাধ্যতামূলক।')
      return
    }

    setErrorMsg(null)
    try {
      await submitCloseMutation.mutateAsync({
        sessionId: session.id,
        actualCountedCash: actualCounted,
        varianceExplanation: isVarianceNonZero ? explanation.trim() : null,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'ডে-এন্ড ক্যাশ ক্লোজিং সাবমিট করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                দিনশেষে ক্যাশ ক্লোজিং ও ভ্যারিয়েন্স সাবমিট
              </h2>
              <p className="text-xs text-slate-400">
                Day-End Cash Closing & Physical Audit Reconciliation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitCloseMutation.isPending}
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

        {/* Session Metadata Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-xs gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>হেফাজতকারী:</span>
              <span className="font-semibold text-white">{session.manager_name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>তারিখ:</span>
              <span className="font-mono font-semibold text-slate-200">{session.session_date}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
              <div className="text-[10px] text-slate-400">প্রারম্ভিক</div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                ৳{session.opening_cash.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
              <div className="text-[10px] text-emerald-400">কালেকশন</div>
              <div className="text-xs font-bold font-mono text-emerald-300 mt-0.5">
                +৳{session.cash_receipts.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
              <div className="text-[10px] text-rose-400">খরচ</div>
              <div className="text-xs font-bold font-mono text-rose-300 mt-0.5">
                -৳{session.cash_expenses.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/60">
              <div className="text-[10px] text-cyan-400">ওনার জমা</div>
              <div className="text-xs font-bold font-mono text-cyan-300 mt-0.5">
                -৳{session.cash_deposited_to_owner.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                হাতে প্রত্যাশিত ক্যাশ (Expected Closing):
              </span>
            </div>
            <span className="text-sm font-extrabold font-mono text-amber-400">
              ৳{calculatedExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Actual Counted Cash Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>
                প্রকৃত গণনাকৃত নগদ টাকা (Actual Counted Cash) <span className="text-rose-400">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                ফিজিক্যাল ক্যাশ গুনে প্রবেশ করান
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ৳
              </span>
              <input
                type="number"
                step="any"
                min="0"
                required
                placeholder="যেমন: 18750"
                value={actualCountedCashStr}
                onChange={(e) => setActualCountedCashStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* Live Variance Calculation Display */}
          {actualCounted !== null && !isNaN(actualCounted) && (
            <div className="p-4 rounded-2xl border transition-all animate-fade-in space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">হিসাবকৃত পার্থক্য (Variance):</span>
                <span className="font-mono text-[11px] text-slate-500">
                  (Counted ৳{actualCounted.toLocaleString('en-IN')} − Expected ৳{calculatedExpected.toLocaleString('en-IN')})
                </span>
              </div>

              {variance === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold">হিসাব সম্পূর্ণ নির্ভুল (Zero Variance)!</div>
                    <div className="text-[11px] text-emerald-400/80">
                      কোনো নগদ ঘাটতি বা উদ্বৃত্ত নেই। হিসাব সরাসরি লক করার জন্য প্রস্তুত।
                    </div>
                  </div>
                </div>
              ) : variance! < 0 ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span className="text-xs font-bold">ক্যাশ ঘাটতি (Cash Shortage / Deficit)</span>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-rose-400">
                      -৳{Math.abs(variance!).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-300/80">
                    প্রত্যাশিত অঙ্কের চেয়ে নগদ টাকা কম পাওয়া গেছে। বাধ্যতামূলক কৈফিয়ত প্রদান করুন।
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold">ক্যাশ উদ্বৃত্ত (Cash Surplus / Excess)</span>
                    </div>
                    <span className="text-sm font-extrabold font-mono text-amber-400">
                      +৳{variance!.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    প্রত্যাশিত অঙ্কের চেয়ে নগদ টাকা বেশি পাওয়া গেছে। অতিরিক্ত টাকার কারণ ব্যাখ্যা করুন।
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Variance Explanation (Mandatory if variance !== 0) */}
          {isVarianceNonZero && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-xs font-semibold text-rose-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  ভ্যারিয়েন্সের সুনির্দিষ্ট কৈফিয়ত (Mandatory Explanation) <span className="text-rose-400">*</span>
                </span>
                <span className="text-[10px] text-rose-400/80">কমপক্ষে ৫ অক্ষর</span>
              </label>
              <textarea
                rows={3}
                required
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="যেমন: রুম ২০৪ এর ভাড়া আদায়ের সময় ১০ টাকা কম নেওয়া হয়েছিল যা আগামীকাল সমন্বয় করা হবে..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
            </div>
          )}

          {/* Submission Notice */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>লকিং ও অডিট সতর্কতা:</span>
            </div>
            <p>
              ক্লোজিং জমা দেওয়ার পর আজকের সেশন <span className="text-amber-300 font-medium">SUBMITTED</span> মোডে চলে যাবে এবং নতুন ট্রানজেকশন এন্ট্রি স্বয়ংক্রিয়ভাবে স্থগিত হবে।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitCloseMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white shadow-lg shadow-amber-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              {submitCloseMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সাবমিট হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>ক্লোজিং সাবমিট করুন (Submit Close)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

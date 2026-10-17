import React, { useState } from 'react'
import {
  ArrowRightLeft,
  X,
  AlertCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import type { ExtendedCashSession } from '../api/useCashSession'
import {
  useCashManagers,
  useInitiateCashHandoverMutation,
} from '../api/useCashSession'

interface CashHandoverModalProps {
  session: ExtendedCashSession
  calculatedExpected: number
  isOpen: boolean
  onClose: () => void
}

export const CashHandoverModal: React.FC<CashHandoverModalProps> = ({
  session,
  calculatedExpected,
  isOpen,
  onClose,
}) => {
  const { data: managers = [] } = useCashManagers()
  const initiateMutation = useInitiateCashHandoverMutation()

  // Eligible receivers (exclude current manager)
  const eligibleReceivers = managers.filter((m) => m.id !== session.manager_id)

  const [receiverManagerId, setReceiverManagerId] = useState<string>(
    eligibleReceivers[0]?.id || ''
  )
  const [amountStr, setAmountStr] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const amount = amountStr !== '' ? parseFloat(amountStr) : 0
  const isAmountValid = amount > 0 && amount <= calculatedExpected
  const isFormValid =
    receiverManagerId !== '' &&
    isAmountValid &&
    reason.trim().length >= 5 &&
    !initiateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    if (amount > calculatedExpected) {
      setErrorMsg(`হস্তান্তরযোগ্য সর্বোচ্চ ক্যাশ ৳${calculatedExpected.toLocaleString('en-IN')}`)
      return
    }

    setErrorMsg(null)
    try {
      await initiateMutation.mutateAsync({
        receiverManagerId,
        amount,
        reason: reason.trim(),
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'ক্যাশ হস্তান্তর ইনিশিয়েট করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ম্যানেজার ক্যাশ হস্তান্তর (Cash Handover)
              </h2>
              <p className="text-xs text-slate-400">
                শিফট পরিবর্তন বা সহকারী ম্যানেজারের নিকট নগদ অর্থ হস্তান্তর
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={initiateMutation.isPending}
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

        {/* Sender Info & Live Balance Available */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400">প্রেরক:</span>
            <span className="font-semibold text-white">{session.manager_name}</span>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">হাতে ক্যাশ আছে:</div>
            <div className="text-xs font-bold font-mono text-amber-400">
              ৳{calculatedExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Handover Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Receiver Manager Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              প্রাপক ম্যানেজার নির্বাচন করুন <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={receiverManagerId}
              onChange={(e) => setReceiverManagerId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {eligibleReceivers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.phone_number || m.email || 'ম্যানেজার'})
                </option>
              ))}
              {eligibleReceivers.length === 0 && (
                <option value="">কোনো প্রাপক ম্যানেজার পাওয়া যায়নি</option>
              )}
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                হস্তান্তরের পরিমাণ (Amount) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmountStr(calculatedExpected.toString())}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                সর্বোচ্চ ক্যাশ বসান
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                ৳
              </span>
              <input
                type="number"
                step="any"
                min="1"
                max={calculatedExpected}
                required
                placeholder="যেমন: 3500"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Reason / Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              হস্তান্তরের কারণ / বিবরণ <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: বিকালের শিফটে বর্ডারদের থেকে নগদ আদায়কৃত টাকা জমা দেওয়া হলো..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Two-Party Commitment Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-indigo-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>টু-পার্টি এক্সেপ্টেন্স নীতি (Two-Party Protocol):</span>
            </div>
            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              হস্তান্তর প্রেরণের পর প্রাপক ম্যানেজার তার ড্যাশবোর্ড থেকে <span className="text-white font-semibold">"গ্রহণ (Accept)"</span> না করা পর্যন্ত টাকা পেন্ডিং থাকবে এবং তার ক্যাশ হিসাবে যুক্ত হবে না। কোনো গরমিল থাকলে তিনি এটি প্রত্যাখ্যান করতে পারবেন।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={initiateMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              {initiateMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>প্রেরণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>হস্তান্তর নিশ্চিত করুন (Send Handover)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

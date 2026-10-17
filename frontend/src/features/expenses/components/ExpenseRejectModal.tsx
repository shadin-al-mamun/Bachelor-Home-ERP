import React, { useState } from 'react'
import { X, AlertTriangle, XCircle, RotateCcw } from 'lucide-react'
import type { ExtendedExpense } from '../api/useExpenses'

interface ExpenseRejectModalProps {
  expense: ExtendedExpense | null
  isOpen: boolean
  onClose: () => void
  onConfirmReject: (expenseId: string, reason: string) => Promise<void>
  isLoading?: boolean
}

export const ExpenseRejectModal: React.FC<ExpenseRejectModalProps> = ({
  expense,
  isOpen,
  onClose,
  onConfirmReject,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !expense) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('ভাউচার প্রত্যাখ্যানের জন্য সুনির্দিষ্ট কারণ উল্লেখ করা বাধ্যতামূলক।')
      return
    }

    try {
      setError(null)
      await onConfirmReject(expense.id, reason.trim())
      setReason('')
      onClose()
    } catch (err: any) {
      setError(err.message || 'ভাউচার বাতিল করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-rose-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                খরচের ভাউচার প্রত্যাখ্যান ও বাতিল
              </h3>
              <p className="text-xs text-rose-300 font-mono">
                {expense.expense_voucher_no} — ৳{expense.amount.toLocaleString('en-IN')}
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Audit & Balance Refund Notice */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-amber-300">
                স্বয়ংক্রিয় ব্যালেন্স রিভার্সাল নীতি:
              </p>
              <p className="text-slate-400 leading-relaxed">
                এই ভাউচারটি প্রত্যাখ্যান করলে কর্তনকৃত{' '}
                <span className="font-bold text-emerald-400">৳{expense.amount}</span> টাকা{' '}
                <span className="text-white font-medium">{expense.source_account_name}</span>-এ
                স্বয়ংক্রিয়ভাবে ফেরত/রিফান্ড হয়ে যাবে।
              </p>
            </div>
          </div>

          {/* Details Snippet */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">খাত:</span>
              <span className="font-medium text-white">{expense.category_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">পরিশোধ করেছেন:</span>
              <span className="font-medium text-white">{expense.payer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">বিবরণ:</span>
              <span className="font-medium text-slate-300 truncate max-w-[260px]">
                {expense.description}
              </span>
            </div>
          </div>

          {/* Mandatory Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>বাতিলের কারণ উল্লেখ করুন <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500">ম্যানেজার এই মন্তব্যটি দেখতে পাবেন</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              rows={3}
              placeholder="উদাঃ ভাউচারের সাথে আসল ক্যাশ মেমো সংযুক্ত নেই অথবা অনুমোদনহীন খরচ..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              প্রত্যাখ্যান নিশ্চিত করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default ExpenseRejectModal

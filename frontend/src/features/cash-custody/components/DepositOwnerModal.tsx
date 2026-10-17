import React, { useState, useRef } from 'react'
import {
  Send,
  X,
  AlertCircle,
  Camera,
  Upload,
  FileCheck,
  Building2,
  Trash2,
} from 'lucide-react'
import type { ExtendedCashSession } from '../api/useCashSession'
import { useRecordOwnerDepositMutation } from '../api/useCashSession'
import { useExpenseAccounts } from '@/features/expenses/api/useExpenses'

interface DepositOwnerModalProps {
  session: ExtendedCashSession
  calculatedExpected: number
  isOpen: boolean
  onClose: () => void
}

export const DepositOwnerModal: React.FC<DepositOwnerModalProps> = ({
  session,
  calculatedExpected,
  isOpen,
  onClose,
}) => {
  const { data: accounts = [] } = useExpenseAccounts()
  const depositMutation = useRecordOwnerDepositMutation()

  // Eligible destination accounts: Bank, Vault, or Owner accounts (exclude manager's own cash box)
  const destinationAccounts = accounts.filter((a) => a.id !== session.account_id)

  const [toAccountId, setToAccountId] = useState<string>(
    destinationAccounts[0]?.id || ''
  )
  const [amountStr, setAmountStr] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MFS'>('CASH')
  const [transactionRef, setTransactionRef] = useState<string>('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const amount = amountStr !== '' ? parseFloat(amountStr) : 0
  const isAmountValid = amount > 0 && amount <= calculatedExpected
  const isFormValid =
    toAccountId !== '' &&
    isAmountValid &&
    !depositMutation.isPending

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('ফাইলের সর্বোচ্চ সাইজ ৫ মেগাবাইট (5MB)।')
        return
      }
      setProofFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setErrorMsg(null)
    }
  }

  const handleRemoveFile = () => {
    setProofFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    if (amount > calculatedExpected) {
      setErrorMsg(`জমা দেওয়ার জন্য পর্যাপ্ত ক্যাশ নেই। সর্বোচ্চ ক্যাশ: ৳${calculatedExpected.toLocaleString('en-IN')}`)
      return
    }

    setErrorMsg(null)
    try {
      await depositMutation.mutateAsync({
        amount,
        toAccountId,
        paymentMethod,
        transactionReference: transactionRef.trim() || null,
        proofFile,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'ওনার ডিপোজিট রেকর্ড করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                ওনারের নিকট নগদ জমা (Deposit to Owner)
              </h2>
              <p className="text-xs text-slate-400">
                হোস্টেল ব্যাংক বা ওনারের মূল হিসাবে ক্যাশ জমা প্রদান
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={depositMutation.isPending}
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

        {/* Manager Cash Availability */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400">উৎস একাউন্ট:</span>
            <div className="font-semibold text-white mt-0.5">{session.account_name}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">হাতে থাকা ক্যাশ:</div>
            <div className="text-xs font-bold font-mono text-amber-400">
              ৳{calculatedExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Account Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              জমার গন্তব্য একাউন্ট (Destination Account) <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              {destinationAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} ({acc.account_type})
                </option>
              ))}
              {destinationAccounts.length === 0 && (
                <option value="">কোনো গন্তব্য একাউন্ট পাওয়া যায়নি</option>
              )}
            </select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                জমার পরিমাণ (Amount) <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmountStr(calculatedExpected.toString())}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-medium"
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
                placeholder="যেমন: 5000"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-base font-bold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">পেমেন্ট মেথড</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                নগদ হস্তান্তর (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                ব্যাংক ডিপোজিট
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('MFS')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  paymentMethod === 'MFS'
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                বিকাশ / নগদ (MFS)
              </button>
            </div>
          </div>

          {/* Transaction Reference / Receipt Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              রেফারেন্স / স্লিপ নং (ঐচ্ছিক)
            </label>
            <input
              type="text"
              placeholder="যেমন: ব্যাংক স্লিপ নং #98214 অথবা ওনার সরাসরি বুঝে নিয়েছেন"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Proof Attachment (Deposit Slip / Voucher Photo) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>ডিপোজিট স্লিপ / ভাউচার প্রমাণক (Proof Voucher)</span>
              <span className="text-[10px] text-slate-400">ছবি বা PDF</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center gap-3">
                <img
                  src={previewUrl}
                  alt="Proof Voucher Preview"
                  className="w-14 h-14 object-cover rounded-xl border border-slate-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {proofFile?.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(proofFile!.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-2xl p-4 text-center cursor-pointer transition-all hover:bg-slate-950/40 group"
              >
                <div className="flex justify-center gap-2 mb-1.5 text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <Upload className="w-5 h-5" />
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300 group-hover:text-white">
                  ডিপোজিট স্লিপ বা রশিদের ছবি সংযুক্ত করুন
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ক্যামেরা দিয়ে তুলুন অথবা গ্যালারি থেকে ফাইল নির্বাচন করুন
                </p>
              </div>
            )}
          </div>

          {/* Confirmation Notice */}
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>ওনার অডিট ও ভেরিফিকেশন:</span>
            </div>
            <p className="text-[11px] text-cyan-200/80">
              জমা রেকর্ড করার পর ওনার বা সুপার এডমিন যাচাইপূর্বক নিশ্চিত (Confirm) করবেন। নিশ্চিত হওয়ার পরই হোস্টেল অ্যাকাউন্টিংয়ে ক্যাশ আউটফ্লো চূড়ান্ত সমন্বয় হবে।
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={depositMutation.isPending}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
            >
              {depositMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>জমা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>ওনার জমা নিশ্চিত করুন (Record Deposit)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

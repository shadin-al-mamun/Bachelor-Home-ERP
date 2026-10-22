import React, { useState } from 'react'
import {
  X,
  ArrowRightLeft,
  Calendar,
  Wallet,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import {
  useRecordTransferMutation,
  type RecordTransferInput,
} from '../api/useFinance'
import { useExpenseAccounts } from '@/features/expenses/api/useExpenses'
import { useAuthStore } from '@/app/store/useAuthStore'

interface AddTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddTransferModal: React.FC<AddTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: accounts = [] } = useExpenseAccounts()
  const transferMutation = useRecordTransferMutation()

  // Form State
  const [fromAccountId, setFromAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [transferDate, setTransferDate] = useState<string>(
    new Date().toISOString().slice(0, 16)
  )
  const [reference, setReference] = useState<string>('')
  const [remarks, setRemarks] = useState<string>('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successTransferNo, setSuccessTransferNo] = useState<string | null>(null)

  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'

  // Filter accounts belonging to manager
  const managerAccounts = React.useMemo(() => {
    return accounts.filter((a) => {
      if (profile?.id && a.assigned_manager_id === profile.id) return true
      if (a.account_type === 'CASH_MANAGER') return true
      const name = a.account_name.toLowerCase()
      if (name.includes('manager') || a.account_name.includes('ম্যানেজার')) return true
      return false
    })
  }, [accounts, profile?.id])

  // Source accounts (From):
  // Admins can transfer from ANY account.
  // Managers can ONLY transfer OUT from their own manager cash custody account!
  const availableSourceAccounts = React.useMemo(() => {
    if (isAdmin) return accounts
    return managerAccounts.length > 0 ? managerAccounts : accounts
  }, [isAdmin, accounts, managerAccounts])

  // Destination accounts (To):
  // Can be any account EXCEPT the currently selected source account.
  const availableDestAccounts = React.useMemo(() => {
    return accounts.filter((a) => a.id !== fromAccountId)
  }, [accounts, fromAccountId])

  // Initialize and keep fromAccountId valid in availableSourceAccounts
  React.useEffect(() => {
    if (availableSourceAccounts.length > 0) {
      if (!fromAccountId || !availableSourceAccounts.some((a) => a.id === fromAccountId)) {
        setFromAccountId(availableSourceAccounts[0].id)
      }
    }
  }, [availableSourceAccounts, fromAccountId])

  // Initialize and keep toAccountId valid in availableDestAccounts
  React.useEffect(() => {
    if (fromAccountId && accounts.length > 0) {
      if (!toAccountId || toAccountId === fromAccountId) {
        const defaultDest = accounts.find((a) => a.id !== fromAccountId)
        if (defaultDest) {
          setToAccountId(defaultDest.id)
        }
      }
    }
  }, [fromAccountId, toAccountId, accounts])

  if (!isOpen) return null

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)
  const parsedAmount = parseFloat(amount) || 0

  const isSameAccount = fromAccountId === toAccountId && fromAccountId !== ''
  const isInsufficient = fromAccount ? parsedAmount > fromAccount.current_balance : false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (isSameAccount) {
      setErrorMsg('উৎস এবং গন্তব্য একই একাউন্ট হতে পারে না। অনুগ্রহ করে দুটি ভিন্ন একাউন্ট নির্বাচন করুন।')
      return
    }

    if (!isAdmin && !managerAccounts.some((a) => a.id === fromAccountId)) {
      setErrorMsg('ম্যানেজার শুধুমাত্র নিজের ম্যানেজার ক্যাশ একাউন্ট থেকে অন্য একাউন্টে টাকা পাঠাতে পারবেন। অন্য একাউন্ট থেকে অর্থ স্থানান্তরের অনুমতি নেই।')
      return
    }

    if (!amount || parsedAmount <= 0) {
      setErrorMsg('সঠিক স্থানান্তরের পরিমাণ (টাকা) প্রদান করুন।')
      return
    }

    if (isInsufficient) {
      setErrorMsg(`উৎস একাউন্টে পর্যাপ্ত ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳${fromAccount?.current_balance.toLocaleString('en-IN')}`)
      return
    }

    try {
      const payload: RecordTransferInput = {
        fromAccountId,
        toAccountId,
        amount: parsedAmount,
        transferDate: new Date(transferDate).toISOString(),
        reference: reference.trim() || null,
        remarks: remarks.trim() || null,
      }

      const res = await transferMutation.mutateAsync(payload)
      setSuccessTransferNo(res.transfer_number || 'TRF-DONE')

      setTimeout(() => {
        setSuccessTransferNo(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'টাকা স্থানান্তর করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-400 p-0.5 shadow-lg shadow-cyan-600/30 flex items-center justify-center text-white">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                অভ্যন্তরীণ একাউন্ট ট্রান্সফার (Inter-Account Transfer)
              </h3>
              <p className="text-xs text-slate-400">
                ক্যাশ, ব্যাংক ও বিকাশ একাউন্টের মধ্যে নিরাপদ অর্থ স্থানান্তর
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Accounting Guard Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-white">দ্বৈত গণনা রোধ ও হিসাববিজ্ঞান সুরক্ষা:</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                এই স্থানান্তরটি একটি অভ্যন্তরীণ অর্থ স্থানান্তর। এটি মূল হোস্টেলের নিট ক্যাপিটাল পরিবর্তন করে না এবং কোনো অবস্থাতেই নতুন আয় (Income) বা পরিচালন ব্যয় (Expense) হিসেবে গণ্য হবে না।
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {successTransferNo && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  অর্থ স্থানান্তর সফল হয়েছে!
                </p>
                <p className="text-xs text-emerald-400/80">
                  ট্রান্সফার নম্বর: <span className="font-mono font-bold text-white">{successTransferNo}</span>। উভয় একাউন্টের ব্যালেন্স সমন্বয় করা হয়েছে।
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Account (From) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <Wallet className="w-3.5 h-3.5 text-rose-400" />
                  উৎস একাউন্ট (টাকা কাটা যাবে) <span className="text-rose-400">*</span>
                </span>
                <div className="flex items-center gap-2">
                  {!isAdmin && (
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md font-medium">
                      ম্যানেজার ক্যাশ নির্ধারিত
                    </span>
                  )}
                  {fromAccount && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ব্যালেন্স: ৳{fromAccount.current_balance.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
                disabled={!isAdmin && availableSourceAccounts.length === 1}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-90 disabled:cursor-not-allowed"
              >
                {availableSourceAccounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.account_name} — ৳{a.current_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Account (To) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  গন্তব্য একাউন্ট (টাকা যোগ হবে) <span className="text-rose-400">*</span>
                </span>
                {toAccount && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ব্যালেন্স: ৳{toAccount.current_balance.toLocaleString('en-IN')}
                  </span>
                )}
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              >
                {availableDestAccounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.account_name} — ৳{a.current_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Visual Simulation Diagram */}
          {fromAccount && toAccount && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                স্থানান্তর প্রক্রিয়া সিমুলেশন
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Source Node */}
                <div className="w-full sm:w-5/12 p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-rose-400 font-medium block">উৎস থেকে কর্তন</span>
                  <p className="font-semibold text-white truncate">{fromAccount.account_name}</p>
                  <p className="font-mono text-xs text-slate-400">
                    ৳{fromAccount.current_balance.toLocaleString('en-IN')} ➜{' '}
                    <span className={isInsufficient ? 'text-rose-400 font-bold' : 'text-slate-200 font-semibold'}>
                      ৳{(fromAccount.current_balance - parsedAmount).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>

                {/* Flow Arrow */}
                <div className="flex flex-col items-center justify-center shrink-0">
                  <span className="font-mono font-bold text-xs text-cyan-400">
                    ৳{parsedAmount > 0 ? parsedAmount.toLocaleString('en-IN') : '০'}
                  </span>
                  <div className="flex items-center text-cyan-400">
                    <ArrowRight className="w-5 h-5 animate-pulse" />
                  </div>
                </div>

                {/* Destination Node */}
                <div className="w-full sm:w-5/12 p-3 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] text-emerald-400 font-medium block">গন্তব্যে জমা</span>
                  <p className="font-semibold text-white truncate">{toAccount.account_name}</p>
                  <p className="font-mono text-xs text-slate-400">
                    ৳{toAccount.current_balance.toLocaleString('en-IN')} ➜{' '}
                    <span className="text-emerald-400 font-semibold">
                      ৳{(toAccount.current_balance + parsedAmount).toLocaleString('en-IN')}
                    </span>
                  </p>
                </div>
              </div>

              {isSameAccount && (
                <div className="text-rose-400 text-xs text-center font-medium pt-1">
                  ⚠️ উৎস এবং গন্তব্য একই একাউন্ট হতে পারে না।
                </div>
              )}
            </div>
          )}

          {/* Amount & Transfer Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>স্থানান্তরের পরিমাণ (BDT) <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-slate-500">টাকার পরিমাণ</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cyan-400 font-bold">
                  ৳
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="০.০০"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-slate-600"
                />
              </div>
            </div>

            {/* Transfer Date/Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                স্থানান্তরের তারিখ ও সময় <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Reference & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reference / Transaction ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>রেফারেন্স / ট্রানজেকশন আইডি</span>
                <span className="text-[10px] text-slate-500">ঐচ্ছিক</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="উদাঃ DEP-SLIP-45892 বা বিকাশ TrxID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Remarks / Purpose */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>স্থানান্তরের উদ্দেশ্য / মন্তব্য</span>
                <span className="text-[10px] text-slate-500">ঐচ্ছিক</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="উদাঃ পেটি ক্যাশের জন্য ব্যাংক থেকে উত্তোলন"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={transferMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={transferMutation.isPending || isSameAccount || isInsufficient || !!successTransferNo}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {transferMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>স্থানান্তর হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>ফান্ড স্থানান্তর সম্পন্ন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default AddTransferModal

import React, { useState } from 'react'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Clock,
  RotateCw,
  ShieldCheck,
  Send,
  Lock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  Check,
  X,
  User,
  AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  useManagerCashSession,
  useCashManagers,
  usePendingHandovers,
  useConfirmCashHandoverMutation,
  useRejectCashHandoverMutation,
  useOwnerDepositsList,
  useConfirmOwnerDepositMutation,
} from './api/useCashSession'
import { DailyClosingModal } from './components/DailyClosingModal'
import { CashHandoverModal } from './components/CashHandoverModal'
import { DepositOwnerModal } from './components/DepositOwnerModal'

export const ManagerCashDashboard: React.FC = () => {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'

  // Date and Manager Selector State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [selectedManagerId, setSelectedManagerId] = useState<string>('usr-mgr1')
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'RECEIPT' | 'EXPENSE' | 'TRANSFERS'>('ALL')

  // Modals state
  const [activeModal, setActiveModal] = useState<'HANDOVER' | 'DEPOSIT' | 'CLOSE' | null>(null)
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')

  // API Queries
  const { data: managers = [] } = useCashManagers()
  const {
    data: sessionDetails,
    isLoading,
    refetch,
    isRefetching,
  } = useManagerCashSession(selectedManagerId, selectedDate)

  const { data: pendingHandovers = [] } = usePendingHandovers(selectedManagerId)
  const confirmHandoverMutation = useConfirmCashHandoverMutation()
  const rejectHandoverMutation = useRejectCashHandoverMutation()

  const { data: ownerDeposits = [] } = useOwnerDepositsList()
  const confirmOwnerDepositMutation = useConfirmOwnerDepositMutation()

  const session = sessionDetails?.session
  const movements = sessionDetails?.movements || []

  const isToday = selectedDate === new Date().toISOString().slice(0, 10)

  // Dynamic Expected Cash Formula Calculation:
  // Expected = Opening + Receipts + HandoverIn - Expenses - DepositedToOwner - HandoverOut
  const calculatedExpected = session
    ? session.opening_cash +
      session.cash_receipts +
      session.cash_handed_over_in -
      session.cash_expenses -
      session.cash_deposited_to_owner -
      session.cash_handed_over_out
    : 0

  // Filtered movements
  const filteredMovements = movements.filter((item) => {
    if (movementFilter === 'RECEIPT') return item.type === 'RECEIPT'
    if (movementFilter === 'EXPENSE') return item.type === 'EXPENSE'
    if (movementFilter === 'TRANSFERS') {
      return (
        item.type === 'HANDOVER_IN' ||
        item.type === 'HANDOVER_OUT' ||
        item.type === 'OWNER_DEPOSIT'
      )
    }
    return true
  })

  // Pending owner deposits to confirm (for Admin / Owner review)
  const pendingDeposits = ownerDeposits.filter((d) => d.status === 'PENDING')

  const handleConfirmHandover = async (handoverId: string) => {
    try {
      await confirmHandoverMutation.mutateAsync(handoverId)
    } catch (err: any) {
      alert(err.message || 'হ্যান্ডওভার গ্রহণ করতে ব্যর্থ হয়েছে।')
    }
  }

  const handleRejectHandover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectionModalId || !rejectionReason.trim()) return

    try {
      await rejectHandoverMutation.mutateAsync({
        handoverId: rejectionModalId,
        reason: rejectionReason.trim(),
      })
      setRejectionModalId(null)
      setRejectionReason('')
    } catch (err: any) {
      alert(err.message || 'হ্যান্ডওভার প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।')
    }
  }

  const handleConfirmOwnerDeposit = async (depositId: string) => {
    try {
      await confirmOwnerDepositMutation.mutateAsync(depositId)
    } catch (err: any) {
      alert(err.message || 'ডিপোজিট নিশ্চিত করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-600/30 flex items-center justify-center text-white">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                ম্যানেজার ক্যাশ হেফাজত ও ক্লোজিং ককপিট
              </h1>
              <p className="text-xs text-slate-400">
                রিয়েল-টাইম নগদ প্রবাহ, টু-পার্টি হ্যান্ডওভার ও দিনশেষে ক্যাশ ভ্যারিয়েন্স অডিট
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Switchers */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className={`px-3 py-1 rounded-lg transition-all ${
                isToday
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              আজকের সেশন
            </button>
            <button
              onClick={() =>
                setSelectedDate(
                  new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                )
              }
              className={`px-3 py-1 rounded-lg transition-all ${
                !isToday
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              গতকালকের
            </button>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          {/* Manager Switcher (Admin Only) */}
          {isAdmin && managers.length > 0 && (
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Two-Party Pending Handover Confirmation Alert Banner */}
      {pendingHandovers.length > 0 && (
        <div className="space-y-3">
          {pendingHandovers.map((handover) => (
            <div
              key={handover.id}
              className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-slate-900 border-2 border-amber-500/50 shadow-xl shadow-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-bounce-subtle"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <ArrowRightLeft className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      গ্রহণ নিশ্চিতকরণ আবশ্যক (Action Required)
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      #{handover.handover_number}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                    <span className="text-amber-300">{handover.sender_name}</span> আপনাকে নগদ{' '}
                    <span className="text-amber-400 font-mono font-extrabold">
                      ৳{handover.amount.toLocaleString('en-IN')}
                    </span>{' '}
                    ক্যাশ হস্তান্তর করেছেন
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    বিবরণ: "{handover.handover_reason}"
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <button
                  onClick={() => setRejectionModalId(handover.id)}
                  disabled={confirmHandoverMutation.isPending || rejectHandoverMutation.isPending}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-rose-400" />
                  <span>প্রত্যাখ্যান</span>
                </button>
                <button
                  onClick={() => handleConfirmHandover(handover.id)}
                  disabled={confirmHandoverMutation.isPending || rejectHandoverMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>গ্রহণ নিশ্চিত করুন (Accept)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Review Banner: Pending Owner Deposits */}
      {isAdmin && pendingDeposits.length > 0 && (
        <div className="p-4 rounded-3xl bg-cyan-950/30 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-cyan-300">
                ওনার ডিপোজিট ভেরিফিকেশন ({pendingDeposits.length}টি অপেক্ষমাণ)
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">এডমিন কনফার্মেশন</span>
          </div>

          <div className="space-y-2">
            {pendingDeposits.map((dep) => (
              <div
                key={dep.id}
                className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">
                      ৳{dep.amount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-slate-400">➔ {dep.to_account_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {dep.payment_method}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    ম্যানেজার: {dep.manager_name} | রেফারেন্স: {dep.transaction_reference || 'কোনো রেফারেন্স নেই'}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {dep.proof_attachment_url && (
                    <a
                      href={dep.proof_attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium"
                    >
                      রশিদ দেখুন
                    </a>
                  )}
                  <button
                    onClick={() => handleConfirmOwnerDeposit(dep.id)}
                    disabled={confirmOwnerDepositMutation.isPending}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[11px] transition-colors"
                  >
                    কনফার্ম করুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Status Banner */}
      {session && (
        <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">ক্যাশ হেফাজতকারী:</span>
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/60">
                {session.manager_name}
              </span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">তারিখ:</span>
              <span className="text-xs font-mono font-semibold text-slate-200">
                {session.session_date}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.status === 'OPEN' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                সেশন সক্রিয় (Live Active Session)
              </span>
            )}
            {session.status === 'SUBMITTED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <Clock className="w-3.5 h-3.5" />
                ডে-এন্ড ক্লোজিং জমা দেওয়া হয়েছে (Submitted)
              </span>
            )}
            {session.status === 'APPROVED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                অনুমোদিত ও চূড়ান্ত লককৃত (Finalized)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 5 Master KPI Cards */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">ক্যাশ সেশন লোড হচ্ছে...</p>
        </div>
      ) : session ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* Card 1: 🟢 Opening Cash */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  প্রারম্ভিক ক্যাশ (Opening)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5">
                ৳{session.opening_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                পূর্ববর্তী দিনের ক্লোজিং ব্যালেন্স থেকে আনীত
              </p>
            </div>

            {/* Card 2: ➕ Cash Collections */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-teal-500/30 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-teal-400" />
                  ক্যাশ কালেকশন (Inflow)
                </span>
                <span className="text-xs font-mono font-bold text-teal-400">+</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-teal-300 mt-1.5">
                ৳{session.cash_receipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                আজকের সংগৃহীত নগদ ভাড়া ও রাজস্ব
              </p>
            </div>

            {/* Card 3: ➖ Cash Expenses */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-rose-500/30 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                  ক্যাশ খরচ (Disbursement)
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">−</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300 mt-1.5">
                ৳{session.cash_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                দৈনন্দিন মেস পরিচালনা ও নগদ ব্যয়
              </p>
            </div>

            {/* Card 4: 🔄 Transfers & Deposits */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                  হ্যান্ডওভার ও ওনার জমা
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">🔄</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1.5">
                ৳{(session.cash_deposited_to_owner + session.cash_handed_over_out - session.cash_handed_over_in).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                ওনার জমা: ৳{session.cash_deposited_to_owner.toLocaleString('en-IN')}
              </p>
            </div>

            {/* Card 5: 💼 Expected Closing Cash (Master Spotlight Card) */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-amber-400" />
                  প্রত্যাশিত ক্যাশ (Expected)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  লাইভ
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-1.5">
                ৳{calculatedExpected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-amber-200/80 mt-1 font-medium">
                ম্যানেজারের হাতে ফিজিক্যালি থাকতে হবে
              </p>
            </div>
          </div>

          {/* Submitted / Approved Reconciliation Audit Card */}
          {session.status !== 'OPEN' && session.actual_counted_cash !== null && (
            <div
              className={`p-5 rounded-3xl border shadow-xl ${
                session.cash_variance === 0
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : (session.cash_variance || 0) < 0
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-amber-950/20 border-amber-500/40'
              } space-y-4 animate-fade-in`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  {session.cash_variance === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (session.cash_variance || 0) < 0 ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      দিনশেষে ক্যাশ অডিট ও রিকনসিলিয়েশন বিবরণ
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ফিজিক্যাল ক্যাশ গুনে ক্লোজিং সাবমিট করা হয়েছে
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">সাবমিট সময়:</span>
                  <span className="text-xs font-mono text-slate-300">
                    {session.submitted_at
                      ? new Date(session.submitted_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'অপেক্ষমাণ'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400">প্রত্যাশিত ক্যাশ</div>
                  <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                    ৳{session.expected_closing_cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400">প্রকৃত গণনাকৃত ক্যাশ (Counted)</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    ৳{(session.actual_counted_cash ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border ${
                    session.cash_variance === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : (session.cash_variance || 0) < 0
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="text-[11px] font-medium">
                    {session.cash_variance === 0
                      ? 'পার্থক্য (Variance)'
                      : (session.cash_variance || 0) < 0
                      ? 'ক্যাশ ঘাটতি (Deficit)'
                      : 'ক্যাশ উদ্বৃত্ত (Surplus)'}
                  </div>
                  <div className="text-lg font-extrabold font-mono mt-1">
                    {session.cash_variance === 0
                      ? '৳০.০০ (নিখুঁত ✓)'
                      : `${(session.cash_variance || 0) > 0 ? '+' : '−'}৳${Math.abs(session.cash_variance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </div>
                </div>
              </div>

              {session.variance_explanation && (
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ম্যানেজারের কৈফিয়ত (Explanation):</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed pl-5 italic">
                    "{session.variance_explanation}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Mathematical Formula Breakdown Card */}
          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              দৈনিক ব্যালেন্স হিসাব সূত্র (Dynamic Formula):
            </span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-300">
              <span className="px-2 py-1 rounded-lg bg-emerald-950/50 text-emerald-300 border border-emerald-800/40">
                প্রারম্ভিক: ৳{session.opening_cash.toLocaleString('en-IN')}
              </span>
              <span className="text-emerald-400 font-bold">+</span>
              <span className="px-2 py-1 rounded-lg bg-teal-950/50 text-teal-300 border border-teal-800/40">
                কালেকশন: ৳{session.cash_receipts.toLocaleString('en-IN')}
              </span>
              <span className="text-teal-400 font-bold">+</span>
              <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
                হস্তান্তর গ্রহণ: ৳{session.cash_handed_over_in.toLocaleString('en-IN')}
              </span>
              <span className="text-rose-400 font-bold">−</span>
              <span className="px-2 py-1 rounded-lg bg-rose-950/50 text-rose-300 border border-rose-800/40">
                খরচ: ৳{session.cash_expenses.toLocaleString('en-IN')}
              </span>
              <span className="text-rose-400 font-bold">−</span>
              <span className="px-2 py-1 rounded-lg bg-cyan-950/50 text-cyan-300 border border-cyan-800/40">
                ওনার জমা: ৳{session.cash_deposited_to_owner.toLocaleString('en-IN')}
              </span>
              <span className="text-amber-400 font-bold">=</span>
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-sm">
                হাতে প্রত্যাশিত ক্যাশ: ৳{calculatedExpected.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Cockpit Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Button 1: Handover Cash to Manager */}
            <button
              onClick={() => setActiveModal('HANDOVER')}
              disabled={session.status === 'APPROVED'}
              className="p-4 rounded-3xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between group transition-all text-left disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    ম্যানেজার ক্যাশ হস্তান্তর
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    অন্য দায়িত্বপ্রাপ্ত ম্যানেজারকে ক্যাশ দেওয়া
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                ➔
              </span>
            </button>

            {/* Button 2: Deposit to Owner */}
            <button
              onClick={() => setActiveModal('DEPOSIT')}
              disabled={session.status === 'APPROVED'}
              className="p-4 rounded-3xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between group transition-all text-left disabled:opacity-40"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    ওনারের নিকট জমা (Deposit)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    হোস্টেল মালিকের নিকট ক্যাশ হ্যান্ডওভার
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                ➔
              </span>
            </button>

            {/* Button 3: Day-End Cash Closing */}
            <button
              onClick={() => setActiveModal('CLOSE')}
              disabled={session.status === 'APPROVED' || session.status === 'SUBMITTED'}
              className="p-4 rounded-3xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/40 flex items-center justify-between group transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-300">
                    {session.status === 'SUBMITTED'
                      ? 'ক্লোজিং জমা দেওয়া হয়েছে (Submitted)'
                      : 'দিনশেষে ক্যাশ ক্লোজিং (Closing)'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    গণনাকৃত টাকা এন্ট্রি ও ভ্যারিয়েন্স সাবমিট
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                ➔
              </span>
            </button>
          </div>

          {/* Real Action Modals */}
          {activeModal === 'CLOSE' && session && (
            <DailyClosingModal
              session={session}
              calculatedExpected={calculatedExpected}
              isOpen={true}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === 'HANDOVER' && session && (
            <CashHandoverModal
              session={session}
              calculatedExpected={calculatedExpected}
              isOpen={true}
              onClose={() => setActiveModal(null)}
            />
          )}

          {activeModal === 'DEPOSIT' && session && (
            <DepositOwnerModal
              session={session}
              calculatedExpected={calculatedExpected}
              isOpen={true}
              onClose={() => setActiveModal(null)}
            />
          )}

          {/* Rejection Modal for Handover */}
          {rejectionModalId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    হ্যান্ডওভার প্রত্যাখ্যানের কারণ
                  </h3>
                  <button
                    onClick={() => {
                      setRejectionModalId(null)
                      setRejectionReason('')
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRejectHandover} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      প্রত্যাখ্যানের সুনির্দিষ্ট কারণ লিখুন <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="যেমন: টাকার পরিমাণ অমিল, শারীরিক ক্যাশ হস্তান্তর পাওয়া যায়নি..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectionModalId(null)
                        setRejectionReason('')
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={!rejectionReason.trim() || rejectHandoverMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold disabled:opacity-40"
                    >
                      {rejectHandoverMutation.isPending ? 'প্রত্যাখ্যান হচ্ছে...' : 'প্রত্যাখ্যান নিশ্চিত করুন'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Today's Cash Movement Feed (Live Ledger) */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  আজকের লাইভ ক্যাশ ট্রানজেকশন ফিড ({movements.length}টি)
                </h3>
                <p className="text-[11px] text-slate-400">
                  ক্যাশ ড্রয়ারে সরাসরি জমা ও খরচের প্রতিটি হিসাব
                </p>
              </div>

              {/* Movement Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'সকল লেনদেন' },
                  { id: 'RECEIPT', label: 'নগদ আদায় (+)' },
                  { id: 'EXPENSE', label: 'নগদ খরচ (−)' },
                  { id: 'TRANSFERS', label: 'ডিপোজিট ও হস্তান্তর' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMovementFilter(tab.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      movementFilter === tab.id
                        ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            {filteredMovements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                নির্বাচিত ক্যাটাগরিতে আজকের কোনো ক্যাশ লেনদেন নেই।
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMovements.map((item) => {
                  const isPositive = item.type === 'RECEIPT' || item.type === 'HANDOVER_IN'

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-200 truncate">
                              {item.title}
                            </h4>
                            <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {item.reference}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {item.particulars}
                          </p>
                        </div>
                      </div>

                      <div className="text-right whitespace-nowrap shrink-0">
                        <div
                          className={`font-mono font-bold text-xs ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : '−'}৳
                          {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-500">{item.time}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default ManagerCashDashboard

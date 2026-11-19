import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useCancelAllocationMutation } from '../api/useSeatAllocations'
import { AlertTriangle, LogOut, CheckCircle2, Loader2, AlertCircle, Banknote, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { useFinancialAccounts } from '@/features/billing/api/useReceipts'
import { useRecordExpenseMutation, EXPENSE_CATEGORY_UUIDS } from '@/features/expenses/api/useExpenses'

export interface AllocationCancelInfo {
  allocationId: string
  seatId?: string
  boarderId?: string
  boarderName: string
  boarderCode: string
  seatCode: string
}

interface CancelAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  allocation: AllocationCancelInfo | null
}

export const CancelAllocationModal: React.FC<CancelAllocationModalProps> = ({
  isOpen,
  onClose,
  allocation,
}) => {
  const [actionType, setActionType] = useState<'ENDED' | 'CANCELLED'>('ENDED')
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [shouldRefundDeposit, setShouldRefundDeposit] = useState(false)
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [refundAccountId, setRefundAccountId] = useState('')

  const cancelMutation = useCancelAllocationMutation()
  const recordExpenseMutation = useRecordExpenseMutation()
  const { data: accounts = [] } = useFinancialAccounts()
  const activeAccounts = accounts.filter((a) => a.is_active)

  // Live Query: Fetch outstanding dues and security deposit for this boarder
  const { data: duesData, isLoading: isLoadingDues } = useQuery({
    queryKey: ['boarder-dues-for-cancellation', allocation?.boarderId, allocation?.allocationId, allocation?.boarderCode],
    enabled: Boolean(isOpen && (allocation?.boarderId || allocation?.allocationId || allocation?.boarderCode)),
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return {
          boarderId: allocation?.boarderId || '',
          outstandingDue: 0,
          totalBilled: 0,
          totalPaid: 0,
          securityDeposit: 3000,
        }
      }

      let targetBoarderId = allocation?.boarderId
      let securityDeposit = 0

      // If boarderId was not provided, look it up from allocationId
      if (allocation?.allocationId) {
        const { data: alloc } = await supabase
          .from('allocations')
          .select('boarder_id, security_deposit')
          .eq('id', allocation.allocationId)
          .maybeSingle()
        if (alloc) {
          if (!targetBoarderId) targetBoarderId = alloc.boarder_id
          securityDeposit = Number(alloc.security_deposit) || 0
        }
      }

      // Or look it up from boarderCode
      if (!targetBoarderId && allocation?.boarderCode) {
        const { data: bdr } = await supabase
          .from('boarders')
          .select('id')
          .eq('boarder_code', allocation.boarderCode)
          .maybeSingle()
        targetBoarderId = bdr?.id
      }

      if (!targetBoarderId) return null

      // Strategy 1: Query vw_boarder_dues_summary
      try {
        const { data: summary, error } = await supabase
          .from('vw_boarder_dues_summary')
          .select('outstanding_due, total_billed, total_paid')
          .eq('boarder_id', targetBoarderId)
          .maybeSingle()

        if (!error && summary) {
          return {
            boarderId: targetBoarderId,
            outstandingDue: Number(summary.outstanding_due || 0),
            totalBilled: Number(summary.total_billed || 0),
            totalPaid: Number(summary.total_paid || 0),
            securityDeposit,
          }
        }
      } catch {
        // fallback to direct calculations
      }

      // Strategy 2: Direct calculation from boarder_charges and receipts
      const { data: charges } = await supabase
        .from('boarder_charges')
        .select('amount, paid_amount')
        .eq('boarder_id', targetBoarderId)
        .neq('status', 'VOID')

      const totalBilled = (charges || []).reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0)
      const totalPaidCharges = (charges || []).reduce((acc: number, c: any) => acc + Number(c.paid_amount || 0), 0)

      const { data: recs } = await supabase
        .from('receipts')
        .select('amount')
        .eq('boarder_id', targetBoarderId)
        .eq('is_void', false)

      const totalRecs = (recs || []).reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0)
      const totalPaid = Math.max(totalRecs, totalPaidCharges)
      const outstandingDue = Math.max(0, totalBilled - totalPaid)

      return {
        boarderId: targetBoarderId,
        outstandingDue,
        totalBilled,
        totalPaid,
        securityDeposit,
      }
    },
  })

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setIsSuccess(false)
      setReason('')
      setActionType('ENDED')
      setEndDate(new Date().toISOString().slice(0, 10))
    }
  }, [isOpen])

  useEffect(() => {
    if (duesData) {
      const deposit = duesData.securityDeposit || 0
      const net = Math.max(0, deposit - duesData.outstandingDue)
      setRefundAmount(net)
      if (net > 0) {
        setShouldRefundDeposit(true)
      }
      if (activeAccounts[0]?.id && !refundAccountId) {
        setRefundAccountId(activeAccounts[0].id)
      }
    }
  }, [duesData, activeAccounts, refundAccountId])

  if (!allocation) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!reason.trim()) {
      setErrorMsg('অনুগ্রহ করে হোস্টেল ত্যাগ বা বরাদ্দ বাতিলের কারণ উল্লেখ করুন।')
      return
    }

    try {
      await cancelMutation.mutateAsync({
        allocationId: allocation.allocationId,
        seatId: allocation.seatId,
        endDate,
        reason: reason.trim(),
        status: actionType,
      })

      // If deposit refund is selected, record an approved expense voucher to debit cash drawer/account
      if (shouldRefundDeposit && refundAmount > 0 && refundAccountId) {
        await recordExpenseMutation.mutateAsync({
          categoryId: EXPENSE_CATEGORY_UUIDS.MISCELLANEOUS,
          amount: refundAmount,
          sourceAccountId: refundAccountId,
          expenseDate: endDate,
          description: `বর্ডার ${allocation.boarderName} (${allocation.boarderCode}) এর সিট ছাড়পত্র বাবদ জামানত ফেরত (Security Deposit Refund)`,
        })
      }

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'প্রক্রিয়াটি সম্পন্ন করতে সমস্যা হয়েছে।')
    }
  }

  const hasOutstandingDue = duesData && duesData.outstandingDue > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="সিট বরাদ্দ সমাপ্তি বা প্রস্থান (Departure / Cancellation)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              {endDate > new Date().toISOString().slice(0, 10)
                ? `অগ্রিম প্রস্থান নোটিশ সংরক্ষিত হয়েছে! বর্ডার ${formatDateBn(endDate)} তারিখ পর্যন্ত এই সিটে বহাল থাকবেন এবং সফটওয়্যার স্বয়ংক্রিয়ভাবে পরবর্তী দিন থেকে সিটটিকে অগ্রিম বরাদ্দের সুযোগ দেবে।`
                : 'বরাদ্দ সমাপ্তি সফল হয়েছে! সিটটি পুনরায় খালি (AVAILABLE) হিসেবে চিহ্নিত হয়েছে এবং সফটওয়্যার অ্যাক্সেস প্রত্যাহার করা হয়েছে।'}
            </span>
          </div>
        )}

        {/* Info Banner */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">বর্ডারের নাম</span>
            <span className="text-white font-bold text-sm block">{allocation.boarderName}</span>
            <span className="text-slate-500 font-mono">{allocation.boarderCode}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block mb-0.5">মুক্ত হতে চলা সিট</span>
            <span className="text-primary-400 font-mono font-bold text-base block">{allocation.seatCode}</span>
            <span className="text-emerald-400 text-[11px] font-semibold">➔ খালি হবে (AVAILABLE)</span>
          </div>
        </div>

        {/* OUTSTANDING DUES REMINDER BANNER */}
        {isLoadingDues ? (
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
            <span>বর্ডারের বর্তমান আর্থিক বকেয়া হিসাব যাচাই করা হচ্ছে...</span>
          </div>
        ) : hasOutstandingDue ? (
          <div className="p-4 rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-rose-950/40 shadow-xl shadow-rose-950/20 space-y-2.5">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 animate-pulse" />
              <span>বকেয়া সতর্কবার্তা: এই বর্ডারের নিকট টাকা বকেয়া রয়েছে!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              সিট বাতিল বা ত্যাগ সম্পন্ন করার আগে বর্ডারের নিকট হোস্টেলের বকেয়া পাওনা রয়েছে। প্রস্থান নিশ্চিত করার পূর্বে বকেয়া টাকা আদায় বা সমন্বয় নিশ্চিত করুন।
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-xs">
              <span className="text-slate-400 font-medium">মোট অপরিশোধিত বকেয়া:</span>
              <span className="text-rose-400 font-bold text-base font-mono">
                {formatCurrencyBn(duesData.outstandingDue)}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              বর্ডারের কোনো বকেয়া নেই (সম্পূর্ণ পরিশোধিত)
            </span>
            <span className="font-bold font-mono">৳০.০০</span>
          </div>
        )}

        {/* SECURITY DEPOSIT & REFUND SECTION */}
        {duesData && duesData.securityDeposit > 0 && (
          <div className="p-4 rounded-2xl border border-indigo-500/30 bg-slate-900/80 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                জামানত ও রিফান্ড হিসাব (Security Deposit)
              </span>
              <span className="text-indigo-400 font-mono font-bold">
                জমা: {formatCurrencyBn(duesData.securityDeposit)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">বকেয়া সমন্বয়:</span>
                <span className="text-rose-400 font-mono font-bold">
                  −{formatCurrencyBn(Math.min(duesData.securityDeposit, duesData.outstandingDue))}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block">নিট ফেরতযোগ্য জামানত:</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatCurrencyBn(Math.max(0, duesData.securityDeposit - duesData.outstandingDue))}
                </span>
              </div>
            </div>

            {/* Checkbox to trigger auto-refund expense voucher */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shouldRefundDeposit}
                  onChange={(e) => setShouldRefundDeposit(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  বর্ডারকে অবশিষ্ট জামানত ফেরত ও ক্যাশ লেজার এন্ট্রি সম্পন্ন করুন
                </span>
              </label>

              {shouldRefundDeposit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 pl-5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      টাকা প্রদানের মাধ্যম (ড্রয়ার / একাউন্ট)
                    </label>
                    <select
                      value={refundAccountId}
                      onChange={(e) => setRefundAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                    >
                      {activeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.account_name} ({a.account_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      ফেরত টাকার পরিমাণ (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={duesData.securityDeposit}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-right"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Type Radio Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">কার্যক্রমের ধরন</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActionType('ENDED')}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                actionType === 'ENDED'
                  ? 'border-primary-500 bg-primary-500/10 text-white font-semibold'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="block text-white font-medium mb-0.5">নিয়মিত প্রস্থান (Departure)</span>
              <span className="text-[11px] text-slate-400 block">বর্ডার হোস্টেল ত্যাগ করছেন</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType('CANCELLED')}
              className={`p-3 rounded-xl border text-left text-xs transition-all ${
                actionType === 'CANCELLED'
                  ? 'border-rose-500 bg-rose-500/10 text-white font-semibold'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="block text-white font-medium mb-0.5">বরাদ্দ বাতিল (Cancellation)</span>
              <span className="text-[11px] text-slate-400 block">ভুল এন্ট্রি বা শর্তভঙ্গের কারণে</span>
            </button>
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-1.5">
          <Input
            type="date"
            label="প্রস্থান বা বাতিলের কার্যকর তারিখ"
            value={endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
            required
            className="text-xs"
          />
          {endDate > new Date().toISOString().slice(0, 10) && (
            <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-0.5">
                <span className="font-semibold block">অগ্রিম প্রস্থান নোটিশ (Advance Notice):</span>
                <span className="text-[11px] text-slate-300 block leading-relaxed">
                  যেহেতু আপনি ভবিষ্যতের তারিখ নির্বাচন করেছেন, তাই বর্ডার <strong>{formatDateBn(endDate)}</strong> পর্যন্ত এই সিটে নিয়মিত সক্রিয় হিসেবে বহাল থাকবেন। সিট কার্ডে এই নোটিশ সংরক্ষিত থাকবে এবং সফটওয়্যার স্বয়ংক্রিয়ভাবে পরবর্তী দিন থেকে সিটটিকে নতুন বর্ডারের অগ্রিম বরাদ্দের সুযোগ দেবে।
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leaving Reason */}
        <Input
          label="প্রস্থান বা বাতিলের কারণ / ডিপোজিট সমন্বয় নোট"
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          placeholder="যেমন: পড়াশোনা শেষ, চাকরি স্থানান্তর, সকল বকেয়া পরিশোধিত..."
          required
          className="text-xs"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={cancelMutation.isPending}>
            ফিরে যান
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={cancelMutation.isPending}
            className="bg-rose-600 hover:bg-rose-500"
            disabled={!reason.trim()}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            {hasOutstandingDue ? 'বকেয়া জেনেও সমাপ্তি করুন' : 'সমাপ্তি নিশ্চিত করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default CancelAllocationModal

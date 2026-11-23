import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useCancelAllocationMutation } from '../api/useSeatAllocations'
import { AlertTriangle, LogOut, CheckCircle2, Loader2, AlertCircle, Banknote, ShieldCheck } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

  const queryClient = useQueryClient()
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
      let targetAllocationId = allocation?.allocationId
      let securityDeposit = 0

      // If boarderId was not provided, look it up from allocationId
      if (targetAllocationId) {
        const { data: alloc } = await supabase
          .from('allocations')
          .select('id, boarder_id, security_deposit')
          .eq('id', targetAllocationId)
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

      // Check if security deposit or checkout refund has ALREADY been disbursed via expense vouchers
      let alreadyRefundedDeposit = 0
      let alreadyRefundedAdvance = 0
      try {
        const bCode = allocation?.boarderCode
        const bName = allocation?.boarderName

        let query = supabase
          .from('expenses')
          .select('id, amount, description, approval_status')
          .neq('approval_status', 'REJECTED')

        if (bCode && targetBoarderId && bName) {
          query = query.or(`description.ilike.%${bCode}%,description.ilike.%${targetBoarderId}%,description.ilike.%${bName}%`)
        } else if (bCode && targetBoarderId) {
          query = query.or(`description.ilike.%${bCode}%,description.ilike.%${targetBoarderId}%`)
        } else if (bCode) {
          query = query.ilike('description', `%${bCode}%`)
        } else if (targetBoarderId) {
          query = query.ilike('description', `%${targetBoarderId}%`)
        }

        const { data: refExpenses } = await query

        if (refExpenses && refExpenses.length > 0) {
          const relevantExpenses = refExpenses.filter((e) => {
            const desc = (e.description || '').toLowerCase()
            return (
              desc.includes('জামানত') ||
              desc.includes('security deposit') ||
              desc.includes('রিফান্ড') ||
              desc.includes('ছাড়পত্র')
            )
          })

          const totalDepositVouchers = relevantExpenses
            .filter((e) => {
              const desc = (e.description || '').toLowerCase()
              return desc.includes('জামানত') || desc.includes('security deposit')
            })
            .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

          const totalAdvanceVouchers = relevantExpenses
            .filter((e) => {
              const desc = (e.description || '').toLowerCase()
              return desc.includes('অগ্রিম') || desc.includes('অতিরিক্ত জমা')
            })
            .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

          const totalGeneralRefunds = relevantExpenses
            .filter((e) => {
              const desc = (e.description || '').toLowerCase()
              return !desc.includes('জামানত') && !desc.includes('security deposit') && !desc.includes('অগ্রিম')
            })
            .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0)

          // Attribute deposit vouchers first
          alreadyRefundedDeposit = Math.min(securityDeposit, totalDepositVouchers + totalGeneralRefunds)
          alreadyRefundedAdvance = totalAdvanceVouchers
        }
      } catch (err) {
        console.warn('Failed to query existing refund expenses:', err)
      }

      const effectiveSecurityDeposit = Math.max(0, securityDeposit - alreadyRefundedDeposit)

      // Strategy 1: Query vw_boarder_dues_summary
      try {
        const { data: summary, error } = await supabase
          .from('vw_boarder_dues_summary')
          .select('outstanding_due, total_billed, total_paid, advance_balance')
          .eq('boarder_id', targetBoarderId)
          .maybeSingle()

        if (!error && summary) {
          const totalBilled = Number(summary.total_billed || 0)
          const totalPaid = Number(summary.total_paid || 0)
          const outstandingDue = Number(summary.outstanding_due || 0)
          const rawAdvance = Number(summary.advance_balance ?? Math.max(0, totalPaid - totalBilled))
          const effectiveAdvanceBalance = Math.max(0, rawAdvance - alreadyRefundedAdvance)

          return {
            boarderId: targetBoarderId,
            outstandingDue,
            totalBilled,
            totalPaid,
            advanceBalance: effectiveAdvanceBalance,
            securityDeposit: effectiveSecurityDeposit,
            originalSecurityDeposit: securityDeposit,
            alreadyRefundedDeposit,
            alreadyRefundedAdvance,
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
      const rawAdvance = Math.max(0, totalPaid - totalBilled)
      const effectiveAdvanceBalance = Math.max(0, rawAdvance - alreadyRefundedAdvance)

      return {
        boarderId: targetBoarderId,
        outstandingDue,
        totalBilled,
        totalPaid,
        advanceBalance: effectiveAdvanceBalance,
        securityDeposit: effectiveSecurityDeposit,
        originalSecurityDeposit: securityDeposit,
        alreadyRefundedDeposit,
        alreadyRefundedAdvance,
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

  const todayStr = new Date().toISOString().slice(0, 10)
  const isFutureDeparture = Boolean(endDate && endDate > todayStr)

  useEffect(() => {
    if (duesData) {
      const deposit = duesData.securityDeposit || 0
      const advance = duesData.advanceBalance || 0
      const totalGrossRefundable = deposit + advance
      const net = Math.max(0, totalGrossRefundable - duesData.outstandingDue)
      setRefundAmount(net)
      // Only default refund to true if it is NOT a future advance notice
      if (net > 0 && !isFutureDeparture) {
        setShouldRefundDeposit(true)
      } else {
        setShouldRefundDeposit(false)
      }
      if (activeAccounts[0]?.id && !refundAccountId) {
        setRefundAccountId(activeAccounts[0].id)
      }
    }
  }, [duesData, activeAccounts, refundAccountId, isFutureDeparture])

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

      // If deposit refund is selected (only on actual/today departure, never on future advance notice)
      if (!isFutureDeparture && shouldRefundDeposit && refundAmount > 0 && refundAccountId) {
        const today = new Date().toISOString().slice(0, 10)
        const deposit = duesData?.securityDeposit || 0
        const advance = duesData?.advanceBalance || 0
        const due = duesData?.outstandingDue || 0
        const gross = deposit + advance
        const adj = Math.min(gross, due)

        await recordExpenseMutation.mutateAsync({
          categoryId: EXPENSE_CATEGORY_UUIDS.MISCELLANEOUS,
          amount: refundAmount,
          sourceAccountId: refundAccountId,
          expenseDate: today,
          approvalStatus: 'APPROVED',
          description: `বর্ডার ${allocation.boarderName} (${allocation.boarderCode}) এর সিট ছাড়পত্র বাবদ রিফান্ড [জামানত: ৳${deposit}, অতিরিক্ত জমা: ৳${advance}, বকেয়া সমন্বয়: ৳${adj}] [APPROVED]`,
        })

        // Also ensure allocations table reflects that security deposit is 0 so it never re-appears
        if (allocation.allocationId) {
          try {
            await supabase
              .from('allocations')
              .update({
                security_deposit: 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', allocation.allocationId)
          } catch (e) {
            console.warn('Failed to update allocation security_deposit:', e)
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['boarder-dues-for-cancellation'] })
      queryClient.invalidateQueries({ queryKey: ['allocations'] })
      queryClient.invalidateQueries({ queryKey: ['seat-allocations'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })

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

        {/* SECURITY DEPOSIT & ADVANCE REFUND SECTION */}
        {duesData && ((duesData.securityDeposit || 0) > 0 || (duesData.advanceBalance || 0) > 0 || (duesData.alreadyRefundedDeposit || 0) > 0) && (
          <div className="p-4 rounded-2xl border border-indigo-500/30 bg-slate-900/80 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                জামানত ও অতিরিক্ত জমা হিসাব (Deposit & Advance Settlement)
              </span>
              <span className="text-indigo-400 font-mono font-bold">
                অবশিষ্ট প্রাপ্য: {formatCurrencyBn((duesData.securityDeposit || 0) + (duesData.advanceBalance || 0))}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block mb-0.5">সিকিউরিটি জামানত</span>
                <span className="text-indigo-300 font-mono font-bold text-xs">
                  {formatCurrencyBn(duesData.securityDeposit || 0)}
                </span>
                {(duesData.alreadyRefundedDeposit || 0) > 0 && (
                  <span className="text-[9px] text-amber-400 font-medium block mt-0.5 leading-tight">
                    (পূর্বে ৳{(duesData.alreadyRefundedDeposit || 0).toLocaleString('en-IN')} কর্তন সম্পন্ন)
                  </span>
                )}
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block mb-0.5">অতিরিক্ত জমা (অগ্রিম)</span>
                <span className="text-emerald-300 font-mono font-bold text-xs">
                  {formatCurrencyBn(duesData.advanceBalance || 0)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block mb-0.5">বকেয়া বিল সমন্বয়</span>
                <span className="text-rose-400 font-mono font-bold text-xs">
                  −{formatCurrencyBn(Math.min((duesData.securityDeposit || 0) + (duesData.advanceBalance || 0), duesData.outstandingDue || 0))}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block mb-0.5">নিট ফেরতযোগ্য অর্থ</span>
                <span className="text-emerald-400 font-mono font-bold text-xs">
                  {formatCurrencyBn(Math.max(0, (duesData.securityDeposit || 0) + (duesData.advanceBalance || 0) - (duesData.outstandingDue || 0)))}
                </span>
              </div>
            </div>

            {isFutureDeparture ? (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <span className="text-[11px] leading-relaxed">
                  <strong>অগ্রিম নোটিশ:</strong> যেহেতু এটি অগ্রিম প্রস্থান নোটিশ (ভবিষ্যতের তারিখ), তাই জামানত বা অতিরিক্ত জমার ক্যাশ ভাউচার আজ তৈরি হবে না। চূড়ান্ত প্রস্থানের দিন (রিলিজের সময়) ক্যাশ ড্রয়ার থেকে রিফান্ড ভাউচার তৈরি হবে।
                </span>
              </div>
            ) : (duesData.securityDeposit || 0) + (duesData.advanceBalance || 0) <= 0 ? (
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  এই বর্ডারের জামানত ইতিপূর্বে সম্পূর্ণ কর্তন ও ভাউচার সংরক্ষণ সম্পন্ন হয়েছে। বর্তমানে নতুন কোনো রিফান্ড অবশিষ্ট নেই।
                </span>
              </div>
            ) : (
              /* Checkbox to trigger auto-refund expense voucher */
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
                    {(duesData.securityDeposit || 0) > 0
                      ? 'বর্ডারকে অবশিষ্ট জামানত ও অতিরিক্ত জমা ফেরত এবং ক্যাশ লেজার এন্ট্রি সম্পন্ন করুন'
                      : 'বর্ডারকে খরচের অতিরিক্ত জমাকৃত অর্থ (অগ্রিম ব্যালেন্স) ফেরত এবং ক্যাশ লেজার এন্ট্রি সম্পন্ন করুন'}
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
                        max={(duesData.securityDeposit || 0) + (duesData.advanceBalance || 0)}
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-emerald-400 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
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

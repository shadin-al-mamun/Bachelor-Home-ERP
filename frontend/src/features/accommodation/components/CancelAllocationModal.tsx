import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useCancelAllocationMutation } from '../api/useSeatAllocations'
import { AlertTriangle, LogOut, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { formatCurrencyBn } from '@/utils/date'

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

  const cancelMutation = useCancelAllocationMutation()

  // Live Query: Fetch outstanding dues for this boarder before vacating/cancelling
  const { data: duesData, isLoading: isLoadingDues } = useQuery({
    queryKey: ['boarder-dues-for-cancellation', allocation?.boarderId, allocation?.allocationId, allocation?.boarderCode],
    enabled: Boolean(isOpen && (allocation?.boarderId || allocation?.allocationId || allocation?.boarderCode)),
    queryFn: async () => {
      if (!isSupabaseConfigured) return null

      let targetBoarderId = allocation?.boarderId

      // If boarderId was not provided, look it up from allocationId
      if (!targetBoarderId && allocation?.allocationId) {
        const { data: alloc } = await supabase
          .from('allocations')
          .select('boarder_id')
          .eq('id', allocation.allocationId)
          .maybeSingle()
        targetBoarderId = alloc?.boarder_id
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
            <span>বরাদ্দ সমাপ্তি সফল হয়েছে! সিটটি পুনরায় খালি (AVAILABLE) হিসেবে চিহ্নিত হয়েছে এবং সফটওয়্যার অ্যাক্সেস প্রত্যাহার করা হয়েছে।</span>
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
        <Input
          type="date"
          label="প্রস্থান বা বাতিলের কার্যকর তারিখ"
          value={endDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
          required
          className="text-xs"
        />

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

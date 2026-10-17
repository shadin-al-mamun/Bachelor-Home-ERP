import React, { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useVoidReceiptMutation, type ExtendedReceipt } from '../api/useReceipts'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'

interface VoidReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: ExtendedReceipt | null
}

export const VoidReceiptModal: React.FC<VoidReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
}) => {
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const voidMutation = useVoidReceiptMutation()

  if (!receipt) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!reason.trim()) {
      setErrorMsg('রিসিপ্ট বাতিলের সুনির্দিষ্ট কারণ উল্লেখ করা বাধ্যতামূলক।')
      return
    }

    try {
      await voidMutation.mutateAsync({
        receiptId: receipt.id,
        reason: reason.trim(),
      })
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setReason('')
        setIsSuccess(false)
      }, 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিসিপ্ট বাতিল করতে ব্যর্থ হয়েছে।'
      setErrorMsg(msg)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="মানি রিসিপ্ট বাতিলকরণ (Void & Reversal)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>রিসিপ্ট সফলভাবে বাতিল হয়েছে এবং সংশ্লিষ্ট অ্যাকাউন্টের টাকা সমন্বয় হয়েছে।</span>
          </div>
        )}

        {/* Warning Callout */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5 text-rose-300">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <ShieldAlert className="w-4 h-4" />
            <span>সতর্কতা: এটি একটি সংবেদনশীল অডিট অ্যাকশন!</span>
          </div>
          <p>
            এই রিসিপ্ট বাতিল করলে এর সম্পূর্ণ টাকা সংশ্লিষ্ট আর্থিক একাউন্ট থেকে কর্তন হবে এবং বর্ডারের বকেয়া চার্জসমূহ পুনরায় অপরিশোধিত (UNPAID) হিসেবে কার্যকর হবে।
          </p>
        </div>

        {/* Receipt Details Card */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">রিসিপ্ট নম্বর:</span>
            <span className="text-white font-mono font-bold">{receipt.receipt_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">বর্ডার:</span>
            <span className="text-white font-semibold">
              {receipt.boarder_name} ({receipt.boarder_code})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">তারিখ:</span>
            <span className="text-slate-300">{formatDateBn(receipt.receipt_date)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-800 pt-1 mt-1">
            <span className="text-slate-400">গৃহীত টাকা:</span>
            <span className="text-rose-400 font-bold text-sm">
              {formatCurrencyBn(receipt.amount)}
            </span>
          </div>
        </div>

        {/* Mandatory Reason */}
        <Input
          label="বাতিলের সুনির্দিষ্ট কারণ (Mandatory Audit Reason)"
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          placeholder="যেমন: ভুল অঙ্কের এন্ট্রি বা চেক বাউন্স"
          required
          className="text-xs"
        />

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={voidMutation.isPending}>
            ফিরে যান
          </Button>
          <Button
            variant="danger"
            size="sm"
            type="submit"
            isLoading={voidMutation.isPending}
            disabled={!reason.trim()}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            রিসিপ্ট বাতিল নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default VoidReceiptModal

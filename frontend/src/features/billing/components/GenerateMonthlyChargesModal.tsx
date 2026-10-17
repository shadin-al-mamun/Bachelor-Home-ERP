import React, { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useGenerateMonthlyCharges } from '../api/useBilling'
import { Calendar, Zap, AlertCircle, CheckCircle2 } from 'lucide-react'

interface GenerateMonthlyChargesModalProps {
  isOpen: boolean
  onClose: () => void
}

export const GenerateMonthlyChargesModal: React.FC<GenerateMonthlyChargesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const defaultBillingMonth = nextMonth.toISOString().slice(0, 7) // e.g. "2026-11"
  const defaultDueDate = `${nextMonth.toISOString().slice(0, 8)}10` // e.g. "2026-11-10"

  const [billingMonth, setBillingMonth] = useState(defaultBillingMonth)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const generateMutation = useGenerateMonthlyCharges()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!billingMonth) {
      setErrorMsg('অনুগ্রহ করে বিলিং মাস নির্বাচন করুন।')
      return
    }

    const billingMonthDate = `${billingMonth}-01`

    try {
      const result = await generateMutation.mutateAsync({
        billingMonth: billingMonthDate,
        dueDate,
      })
      setSuccessMsg(
        `সফলভাবে সম্পন্ন! ${result?.generated || 'সকল'} জন সক্রিয় বর্ডারের মাসিক ভাড়া চার্জ জেনারেট হয়েছে। ${
          result?.skipped ? `${result.skipped} জন ইতিমধ্যে জেনারেটকৃত (স্কিপ)।` : ''
        }`
      )
      setTimeout(() => onClose(), 2500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'চার্জ জেনারেট করতে ব্যর্থ।'
      setErrorMsg(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="মাসিক ভাড়া ব্যাচ জেনারেশন (Batch Rent Generation)"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 text-xs text-slate-300 flex items-start gap-3">
          <Zap className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-white">ব্যাচ জেনারেশন কিভাবে কাজ করে?</p>
            <p>সিস্টেম সকল সক্রিয় সিট বরাদ্দ থেকে বর্ডারের চুক্তিকৃত মাসিক ভাড়ার তথ্য সংগ্রহ করে, নির্বাচিত মাসের জন্য স্বয়ংক্রিয়ভাবে RENT চার্জ তৈরি করবে।</p>
            <p className="text-amber-400">⚠️ একই বর্ডারের একই মাসে দ্বিতীয়বার চার্জ তৈরি হবে না (ডুপ্লিকেট প্রতিরোধ)।</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-400" />
              বিলিং মাস নির্বাচন করুন <span className="text-rose-400">*</span>
            </label>
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
              required
            />
          </div>

          <Input
            type="date"
            label="পেমেন্ট ডিউ ডেট (Due Date)"
            value={dueDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={generateMutation.isPending}>
            বাতিল
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={generateMutation.isPending}
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            ভাড়া চার্জ জেনারেট করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default GenerateMonthlyChargesModal

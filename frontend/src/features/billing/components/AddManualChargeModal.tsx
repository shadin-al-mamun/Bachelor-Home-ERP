import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAddManualCharge } from '../api/useBilling'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import type { ChargeType } from '@/types/database'
import { PlusCircle, User, AlertCircle, CheckCircle2, Tag, Calendar } from 'lucide-react'

interface AddManualChargeModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedBoarderId?: string
}

const CHARGE_TYPE_OPTIONS: { value: ChargeType; label: string }[] = [
  { value: 'UTILITY', label: 'ইউটিলিটি চার্জ (Utility)' },
  { value: 'PENALTY', label: 'জরিমানা / লেট ফি (Penalty)' },
  { value: 'ADMISSION_FEE', label: 'ভর্তি ফি (Admission Fee)' },
  { value: 'MEAL', label: 'খাবার সমন্বয় ফি (Meal Adjustment)' },
  { value: 'OTHER', label: 'অন্যান্য সার্ভিস ফি (Other Fee)' },
]

function getDefaultBillingDates() {
  const now = new Date()
  return {
    defaultMonth: now.toISOString().slice(0, 7), // 'YYYY-MM'
    defaultDueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      .toISOString()
      .slice(0, 10),
  }
}

export const AddManualChargeModal: React.FC<AddManualChargeModalProps> = ({
  isOpen,
  onClose,
  preSelectedBoarderId,
}) => {
  const { data: boarders = [] } = useBoarders({ status: 'ACTIVE' })

  const { defaultMonth, defaultDueDate } = getDefaultBillingDates()

  const [boarderId, setBoarderId] = useState(preSelectedBoarderId || '')
  const [chargeType, setChargeType] = useState<ChargeType>('UTILITY')
  const [billingMonth, setBillingMonth] = useState(defaultMonth)
  const [amount, setAmount] = useState<number>(0)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const addChargeMutation = useAddManualCharge()

  useEffect(() => {
    if (isOpen) {
      const dates = getDefaultBillingDates()
      setErrorMsg(null)
      setIsSuccess(false)
      setBoarderId(preSelectedBoarderId || '')
      setChargeType('UTILITY')
      setAmount(0)
      setDescription('')
      setBillingMonth(dates.defaultMonth)
      setDueDate(dates.defaultDueDate)
    }
  }, [isOpen, preSelectedBoarderId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!boarderId) {
      setErrorMsg('অনুগ্রহ করে একজন সক্রিয় বর্ডার নির্বাচন করুন।')
      return
    }
    if (amount <= 0) {
      setErrorMsg('চার্জের পরিমাণ অবশ্যই ০ টাকার চেয়ে বেশি হতে হবে।')
      return
    }
    if (!description.trim()) {
      setErrorMsg('চার্জের সুনির্দিষ্ট বিবরণ বা কারণ উল্লেখ করুন।')
      return
    }

    try {
      await addChargeMutation.mutateAsync({
        boarderId,
        chargeType,
        billingMonth: `${billingMonth}-01`,
        amount,
        dueDate,
        description: description.trim(),
      })

      setIsSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'চার্জ যোগ করতে ব্যর্থ হয়েছে।'
      setErrorMsg(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ম্যানুয়াল চার্জ ইনভয়েস যুক্ত করুন (Add Ad-Hoc Charge)"
      maxWidth="lg"
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
            <span>চার্জ সফলভাবে যুক্ত হয়েছে এবং বর্ডারের বকেয়া লেজারে যোগ হয়েছে!</span>
          </div>
        )}

        {/* Boarder Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary-400" />
            বর্ডার নির্বাচন করুন <span className="text-rose-400">*</span>
          </label>
          <select
            value={boarderId}
            onChange={(e) => setBoarderId(e.target.value)}
            disabled={Boolean(preSelectedBoarderId)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
            required
          >
            <option value="">বর্ডার নির্বাচন করুন...</option>
            {boarders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full_name} ({b.boarder_code}) — {b.phone_number}
              </option>
            ))}
          </select>
        </div>

        {/* Charge Type & Billing Month */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              চার্জের ধরন (Charge Type) <span className="text-rose-400">*</span>
            </label>
            <select
              value={chargeType}
              onChange={(e) => setChargeType(e.target.value as ChargeType)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              required
            >
              {CHARGE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary-400" />
              বিলিং মাস <span className="text-rose-400">*</span>
            </label>
            <input
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
              required
            />
          </div>
        </div>

        {/* Amount & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label="চার্জের পরিমাণ (৳)"
            value={amount || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value))}
            placeholder="যেমন: ৮০০"
            required
            className="text-xs"
          />

          <Input
            type="date"
            label="পরিশোধের শেষ তারিখ (Due Date)"
            value={dueDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        {/* Description / Reason */}
        <Input
          label="চার্জের সুনির্দিষ্ট বিবরণ / কারণ"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
          placeholder="যেমন: অতিরিক্ত এসি বিল সমন্বয়, দেরিতে ওঠার জরিমানা, ওয়াইফাই রাউটার ফি ইত্যাদি"
          required
          className="text-xs"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={addChargeMutation.isPending}>
            বাতিল
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={addChargeMutation.isPending}
            disabled={!boarderId || amount <= 0}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            চার্জ ইনভয়েস নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default AddManualChargeModal

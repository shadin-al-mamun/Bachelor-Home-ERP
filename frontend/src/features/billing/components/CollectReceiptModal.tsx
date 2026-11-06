import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  useFinancialAccounts,
  useRecordReceiptMutation,
  useUnpaidCharges,
  useReceipts,
  type ExtendedReceipt,
  type UnifiedCollectionItem,
} from '../api/useReceipts'
import { useBoarderDuesSummary } from '../api/useBilling'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { ReceiptPrintView } from './ReceiptPrintView'
import { formatCurrencyBn } from '@/utils/date'
import type { PaymentMethod } from '@/types/database'
import {
  Receipt,
  User,
  AlertCircle,
  Wallet,
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { CreateFinancialAccountModal } from '@/features/finance/components/CreateFinancialAccountModal'

interface CollectReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedBoarderId?: string
}

interface ItemRow {
  head_code: string
  head_name: string
  amount: number
  description: string
}

const DEFAULT_HEADS: { code: string; name: string }[] = [
  { code: 'SEAT_RENT', name: 'সিট ভাড়া (Seat Rent)' },
  { code: 'MEAL_BILL', name: 'মিল বিল (Meal Bill)' },
  { code: 'MISC_BILL', name: 'ফ্ল্যাট বিবিধ বিল (Misc Bill)' },
  { code: 'SECURITY_DEPOSIT', name: 'জামানত সংগ্রহ (Security Deposit)' },
  { code: 'ADMISSION_FEE', name: 'এককালীন সার্ভিস চার্জ (Admission Fee)' },
  { code: 'ADVANCE', name: 'অগ্রিম জমা (Advance)' },
  { code: 'FINE', name: 'জরিমানা / বিলম্ব ফি (Fine)' },
  { code: 'OTHER', name: 'অন্যান্য সার্ভিস চার্জ (Other)' },
]

export const CollectReceiptModal: React.FC<CollectReceiptModalProps> = ({
  isOpen,
  onClose,
  preSelectedBoarderId,
}) => {
  const { data: boarders = [] } = useBoarders({ status: 'ACTIVE' })
  const { data: accounts = [] } = useFinancialAccounts()
  const { data: duesList = [] } = useBoarderDuesSummary()

  const [boarderId, setBoarderId] = useState(preSelectedBoarderId || '')
  const { data: unpaidCharges = [] } = useUnpaidCharges(boarderId)
  const { data: boarderReceipts = [] } = useReceipts({ boarderId: boarderId || undefined, status: 'VALID' })

  const duesMap = useMemo(() => {
    const map = new Map<string, (typeof duesList)[0]>()
    duesList.forEach((d) => map.set(d.boarder_id, d))
    return map
  }, [duesList])

  const boarderDueSummary = useMemo(() => {
    return boarderId ? duesMap.get(boarderId) : undefined
  }, [boarderId, duesMap])

  const selectedBoarder = useMemo(() => {
    return boarders.find((b) => b.id === boarderId)
  }, [boarders, boarderId])

  // Security Deposit Reserve Computation
  const depositDetails = useMemo(() => {
    if (!boarderId || !selectedBoarder) {
      return { totalDeposit: 0, adjustedDeposit: 0, availableDeposit: 0 }
    }

    const allocDeposit = Number(selectedBoarder.active_allocation?.security_deposit) || 0
    let receiptDeposit = 0
    let adjustedDeposit = 0

    boarderReceipts.forEach((r) => {
      const isAdjustment =
        r.payment_method === 'ADJUSTMENT' ||
        r.remarks?.includes('[DEPOSIT_ADJUSTMENT]') ||
        r.transaction_reference?.includes('[DEPOSIT_ADJUSTMENT]') ||
        r.remarks?.includes('জামানত থেকে সমন্বয়') ||
        r.transaction_reference?.includes('জামানত থেকে সমন্বয়')

      if (isAdjustment) {
        adjustedDeposit += Number(r.amount) || 0
      } else {
        const hasDepositItem = r.items?.some(
          (i) => i.head_code === 'SECURITY_DEPOSIT' || i.head_name?.includes('জামানত')
        )
        if (hasDepositItem) {
          receiptDeposit += Number(r.amount) || 0
        }
      }
    })

    const totalDeposit = Math.max(allocDeposit, receiptDeposit)
    const availableDeposit = Math.max(0, totalDeposit - adjustedDeposit)

    return {
      totalDeposit,
      adjustedDeposit,
      availableDeposit,
    }
  }, [boarderId, selectedBoarder, boarderReceipts])

  const [isAdjustingFromDeposit, setIsAdjustingFromDeposit] = useState(false)
  const [depositAdjustAmount, setDepositAdjustAmount] = useState<number | ''>('')

  // When boarderId changes or modal opens, reset adjustment state
  useEffect(() => {
    setIsAdjustingFromDeposit(false)
    setDepositAdjustAmount('')
  }, [boarderId, isOpen])

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [billingMonth, setBillingMonth] = useState(currentMonthStr)
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10))

  const [items, setItems] = useState<ItemRow[]>([
    { head_code: 'SEAT_RENT', head_name: 'সিট ভাড়া', amount: 0, description: '' },
    { head_code: 'MEAL_BILL', head_name: 'মিল বিল', amount: 0, description: '' },
    { head_code: 'MISC_BILL', head_name: 'বিবিধ বিল', amount: 0, description: '' },
  ])

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [remarks, setRemarks] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [createdReceipt, setCreatedReceipt] = useState<ExtendedReceipt | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false)

  const recordReceiptMutation = useRecordReceiptMutation()

  // Reset & initialize
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setCreatedReceipt(null)
      setBoarderId(preSelectedBoarderId || '')
      setBillingMonth(new Date().toISOString().slice(0, 7))
      setCollectionDate(new Date().toISOString().slice(0, 10))
      setItems([
        { head_code: 'SEAT_RENT', head_name: 'সিট ভাড়া', amount: 0, description: '' },
        { head_code: 'MEAL_BILL', head_name: 'মিল বিল', amount: 0, description: '' },
        { head_code: 'MISC_BILL', head_name: 'বিবিধ বিল', amount: 0, description: '' },
      ])
      setPaymentMethod('CASH')
      setReference('')
      setRemarks('')

      if (accounts.length > 0) {
        const cashAcc = accounts.find((a) => a.account_type === 'CASH_MANAGER' || a.account_type === 'CASH_OWNER')
        setDestinationAccountId(cashAcc ? cashAcc.id : accounts[0].id)
      }
    }
  }, [isOpen, preSelectedBoarderId, accounts])

  // Select account on payment method change
  useEffect(() => {
    if (accounts.length > 0) {
      const currentValid = accounts.some((a) => a.id === destinationAccountId)
      if (!destinationAccountId || !currentValid) {
        const preferred =
          paymentMethod === 'CASH'
            ? accounts.find((a) => a.account_type === 'CASH_MANAGER' || a.account_type === 'CASH_OWNER')
            : paymentMethod === 'MFS'
            ? accounts.find((a) => a.account_type === 'MFS')
            : accounts.find((a) => a.account_type === 'BANK')

        setDestinationAccountId(preferred ? preferred.id : accounts[0].id)
      }
    }
  }, [accounts, destinationAccountId, paymentMethod])

  // Calculate live total amount
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }, [items])

  const duesBreakdown = useMemo(() => {
    let rentDue = 0
    let mealDue = 0
    let utilityDue = 0
    let otherDue = 0

    unpaidCharges.forEach((c) => {
      const due =
        c.due_amount !== undefined
          ? Number(c.due_amount)
          : Math.max(0, Number(c.amount) - (Number(c.paid_amount) || 0))
      if (due <= 0) return

      if (c.charge_type === 'RENT') {
        rentDue += due
      } else if (c.charge_type === 'MEAL') {
        mealDue += due
      } else if (c.charge_type === 'UTILITY') {
        utilityDue += due
      } else {
        otherDue += due
      }
    })

    const chargesTotal = rentDue + mealDue + utilityDue + otherDue
    const summaryDue = Number(boarderDueSummary?.outstanding_due || 0)
    const effectiveTotalDue = chargesTotal > 0 ? chargesTotal : summaryDue

    return {
      rentDue,
      mealDue,
      utilityDue,
      otherDue,
      totalDue: effectiveTotalDue,
      advanceBalance: Number(boarderDueSummary?.advance_balance || 0),
      hasDues: effectiveTotalDue > 0,
    }
  }, [unpaidCharges, boarderDueSummary])

  const handleAutoFillFromDues = () => {
    if (!duesBreakdown.hasDues) return

    const newItems: ItemRow[] = []

    if (duesBreakdown.rentDue > 0) {
      newItems.push({
        head_code: 'SEAT_RENT',
        head_name: 'সিট ভাড়া',
        amount: duesBreakdown.rentDue,
        description: 'বকেয়া সিট ভাড়া পরিশোধ',
      })
    } else {
      newItems.push({
        head_code: 'SEAT_RENT',
        head_name: 'সিট ভাড়া',
        amount: 0,
        description: '',
      })
    }

    if (duesBreakdown.mealDue > 0) {
      newItems.push({
        head_code: 'MEAL_BILL',
        head_name: 'মিল বিল',
        amount: duesBreakdown.mealDue,
        description: 'বকেয়া খাবার বিল পরিশোধ',
      })
    } else {
      newItems.push({
        head_code: 'MEAL_BILL',
        head_name: 'মিল বিল',
        amount: 0,
        description: '',
      })
    }

    if (duesBreakdown.utilityDue > 0) {
      newItems.push({
        head_code: 'MISC_BILL',
        head_name: 'বিবিধ বিল',
        amount: duesBreakdown.utilityDue,
        description: 'বকেয়া ইউটিলিটি বিল পরিশোধ',
      })
    } else {
      newItems.push({
        head_code: 'MISC_BILL',
        head_name: 'বিবিধ বিল',
        amount: 0,
        description: '',
      })
    }

    if (duesBreakdown.otherDue > 0) {
      newItems.push({
        head_code: 'OTHER',
        head_name: 'অন্যান্য',
        amount: duesBreakdown.otherDue,
        description: 'অন্যান্য বকেয়া চার্জ পরিশোধ',
      })
    }

    if (newItems.every((i) => i.amount === 0) && duesBreakdown.totalDue > 0) {
      newItems[0].amount = duesBreakdown.totalDue
      newItems[0].description = 'বকেয়া পরিশোধ'
    }

    setItems(newItems)
  }

  const handleApplyDepositAdjustment = (adjAmount: number) => {
    let remainingAdj = adjAmount
    const newItems: ItemRow[] = []

    if (duesBreakdown.rentDue > 0 && remainingAdj > 0) {
      const take = Math.min(remainingAdj, duesBreakdown.rentDue)
      newItems.push({
        head_code: 'SEAT_RENT',
        head_name: 'সিট ভাড়া',
        amount: take,
        description: 'জামানত থেকে সিট ভাড়া সমন্বয়',
      })
      remainingAdj -= take
    }

    if (duesBreakdown.mealDue > 0 && remainingAdj > 0) {
      const take = Math.min(remainingAdj, duesBreakdown.mealDue)
      newItems.push({
        head_code: 'MEAL_BILL',
        head_name: 'মিল বিল',
        amount: take,
        description: 'জামানত থেকে মিল বিল সমন্বয়',
      })
      remainingAdj -= take
    }

    if (duesBreakdown.utilityDue > 0 && remainingAdj > 0) {
      const take = Math.min(remainingAdj, duesBreakdown.utilityDue)
      newItems.push({
        head_code: 'MISC_BILL',
        head_name: 'বিবিধ বিল',
        amount: take,
        description: 'জামানত থেকে ইউটিলিটি বিল সমন্বয়',
      })
      remainingAdj -= take
    }

    if (duesBreakdown.otherDue > 0 && remainingAdj > 0) {
      const take = Math.min(remainingAdj, duesBreakdown.otherDue)
      newItems.push({
        head_code: 'OTHER',
        head_name: 'অন্যান্য',
        amount: take,
        description: 'জামানত থেকে অন্যান্য চার্জ সমন্বয়',
      })
      remainingAdj -= take
    }

    if (newItems.length === 0 || remainingAdj > 0) {
      if (newItems.length > 0) {
        newItems[0].amount += remainingAdj
      } else {
        newItems.push({
          head_code: 'ADVANCE',
          head_name: 'জামানত সমন্বয়',
          amount: adjAmount,
          description: 'জামানত থেকে বকেয়া সমন্বয়',
        })
      }
    }

    setItems(newItems)
  }

  const getHeadDue = (headCode: string) => {
    if (headCode === 'SEAT_RENT') return duesBreakdown.rentDue
    if (headCode === 'MEAL_BILL') return duesBreakdown.mealDue
    if (headCode === 'MISC_BILL') return duesBreakdown.utilityDue
    if (headCode === 'OTHER' || headCode === 'FINE' || headCode === 'ADMISSION_FEE') return duesBreakdown.otherDue
    return 0
  }

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleAddItem = (headCode = 'OTHER', headName = 'অন্যান্য') => {
    setItems((prev) => [
      ...prev,
      { head_code: headCode, head_name: headName, amount: 0, description: '' },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!boarderId) {
      setErrorMsg('অনুগ্রহ করে একজন বর্ডার নির্বাচন করুন।')
      return
    }

    if (totalAmount <= 0) {
      setErrorMsg('কমপক্ষে একটি খাতে টাকার পরিমাণ ইনপুট করুন (মোট আদায় ০ টাকার বেশি হতে হবে)।')
      return
    }

    if (!destinationAccountId && !isAdjustingFromDeposit) {
      setErrorMsg('অনুগ্রহ করে জমার অ্যাকাউন্ট নির্বাচন করুন।')
      return
    }

    const effectiveAccountId = destinationAccountId || accounts[0]?.id || 'deposit-adjustment-account'

    // Filter active items > 0
    const activeItems: UnifiedCollectionItem[] = items
      .filter((i) => Number(i.amount) > 0)
      .map((i) => ({
        head_code: i.head_code,
        head_name: i.head_name,
        amount: Number(i.amount),
        billing_month: `${billingMonth}-01`,
        description: i.description.trim() || undefined,
      }))

    if (activeItems.length === 0) {
      setErrorMsg('কোনো বৈধ খাতের টাকা পাওয়া যায়নি।')
      return
    }

    try {
      const selectedAccount = accounts.find((a) => a.id === effectiveAccountId)
      const finalPaymentMethod = isAdjustingFromDeposit ? 'ADJUSTMENT' : paymentMethod
      const finalReference = isAdjustingFromDeposit
        ? (reference.trim() ? `[DEPOSIT_ADJUSTMENT] ${reference.trim()}` : '[DEPOSIT_ADJUSTMENT] জামানত থেকে সমন্বয়')
        : (reference.trim() || undefined)
      const finalRemarks = isAdjustingFromDeposit
        ? (remarks.trim() ? `[DEPOSIT_ADJUSTMENT] ${remarks.trim()}` : '[DEPOSIT_ADJUSTMENT] জামানত তহবিল থেকে বকেয়া সমন্বয়')
        : (remarks.trim() || undefined)

      const result = await recordReceiptMutation.mutateAsync({
        boarderId,
        destinationAccountId: effectiveAccountId,
        paymentMethod: finalPaymentMethod,
        amount: totalAmount,
        collectionDate: new Date(collectionDate).toISOString(),
        reference: finalReference,
        remarks: finalRemarks,
        items: activeItems,
      })

      const receiptObj: ExtendedReceipt = {
        id: result?.receipt_id || `rc-${Date.now()}`,
        receipt_number: result?.receipt_number || 'RCT-AUTO',
        boarder_id: boarderId,
        boarder_name: selectedBoarder?.full_name || 'বর্ডার',
        boarder_code: selectedBoarder?.boarder_code || '',
        boarder_phone: selectedBoarder?.phone_number,
        received_by: 'current-manager',
        collector_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
        destination_account_id: effectiveAccountId,
        account_name: isAdjustingFromDeposit ? 'জামানত তহবিল (ক্যাশবহির্ভূত)' : (selectedAccount?.account_name || 'ক্যাশ অ্যাকাউন্ট'),
        amount: totalAmount,
        payment_method: finalPaymentMethod,
        transaction_reference: finalReference,
        receipt_date: new Date(collectionDate).toISOString(),
        is_void: false,
        remarks: finalRemarks,
        created_at: new Date().toISOString(),
        items: activeItems.map((item, idx) => ({
          id: `item-${idx}`,
          receipt_id: result?.receipt_id || '',
          head_code: item.head_code,
          head_name: item.head_name,
          amount: item.amount,
          billing_month: item.billing_month,
          description: item.description,
          created_at: new Date().toISOString(),
        })),
        allocations: activeItems.map((item, idx) => ({
          charge_id: `ch-alloc-${idx}`,
          charge_type: item.head_code,
          billing_month: item.billing_month || `${billingMonth}-01`,
          description: item.head_name,
          amount: item.amount,
        })),
      }

      setCreatedReceipt(receiptObj)
      setIsPrintModalOpen(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বিল সংগ্রহে ব্যর্থ হয়েছে।'
      setErrorMsg(msg)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !isPrintModalOpen}
        onClose={onClose}
        title="বিল আদায় ও মানি রিসিপ্ট সংগ্রহ (Unified Bill Collection)"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Row: Boarder, Month & Collection Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-400" />
                বর্ডার নির্বাচন করুন <span className="text-rose-400">*</span>
              </label>
              <select
                value={boarderId}
                onChange={(e) => setBoarderId(e.target.value)}
                disabled={Boolean(preSelectedBoarderId)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500 cursor-pointer"
                required
              >
                <option value="">বর্ডার নির্বাচন করুন...</option>
                {boarders.map((b) => {
                  const due = duesMap.get(b.id)?.outstanding_due || 0
                  return (
                    <option key={b.id} value={b.id}>
                      {b.full_name} ({b.boarder_code}) {due > 0 ? `— বকেয়া: ৳${due.toLocaleString('en-IN')}` : '— পরিশোধিত'}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                বিলিং মাস <span className="text-rose-400">*</span>
              </label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker?.() } catch {}
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500 cursor-pointer [color-scheme:dark]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                আদায়ের তারিখ <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={collectionDate}
                onChange={(e) => setCollectionDate(e.target.value)}
                onClick={(e) => {
                  try { e.currentTarget.showPicker?.() } catch {}
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
                required
              />
            </div>
          </div>

          {/* Boarder Info & Live Dues Status Card */}
          {selectedBoarder && (
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                duesBreakdown.hasDues
                  ? 'bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20'
                  : 'bg-emerald-950/20 border-emerald-500/30'
              }`}
            >
              {/* Main row: Boarder Info & Total Due + Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      duesBreakdown.hasDues
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{selectedBoarder.full_name}</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-mono text-[11px] font-semibold">
                        আইডি: {selectedBoarder.boarder_code}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      মোবাইল: {selectedBoarder.phone_number || 'নেই'}
                      {boarderDueSummary?.seat_name && ` | সিট: ${boarderDueSummary.seat_name}`}
                      {boarderDueSummary?.flat_name && ` (${boarderDueSummary.flat_name})`}
                    </span>
                  </div>
                </div>

                {/* Right side: Due Badge & Auto-fill Action */}
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {duesBreakdown.hasDues ? (
                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-[10px] text-rose-300 font-bold block uppercase tracking-wider">
                          মোট বকেয়া পাওনা
                        </span>
                        <span className="text-base font-black font-mono text-rose-400">
                          {formatCurrencyBn(duesBreakdown.totalDue)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFillFromDues}
                        title="বকেয়ার অংক অনুযায়ী নিচের খাতসমূহ স্বয়ংক্রিয়ভাবে পূরণ করুন"
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>বকেয়া অটো-ফিল</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-right">
                      {duesBreakdown.advanceBalance > 0 && (
                        <div className="text-right mr-2">
                          <span className="text-[10px] text-cyan-300 font-bold block">অগ্রিম ব্যালেন্স</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {formatCurrencyBn(duesBreakdown.advanceBalance)}
                          </span>
                        </div>
                      )}
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>কোনো বকেয়া নেই (পরিশোধিত)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Breakdown Tags Row if dues exist */}
              {duesBreakdown.hasDues && (
                <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] text-rose-300/80 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    বকেয়ার বিবরণ:
                  </span>
                  {duesBreakdown.rentDue > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
                      সিট ভাড়া: <strong>{formatCurrencyBn(duesBreakdown.rentDue)}</strong>
                    </span>
                  )}
                  {duesBreakdown.mealDue > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                      মিল বিল: <strong>{formatCurrencyBn(duesBreakdown.mealDue)}</strong>
                    </span>
                  )}
                  {duesBreakdown.utilityDue > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]">
                      ইউটিলিটি: <strong>{formatCurrencyBn(duesBreakdown.utilityDue)}</strong>
                    </span>
                  )}
                  {duesBreakdown.otherDue > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[11px]">
                      অন্যান্য: <strong>{formatCurrencyBn(duesBreakdown.otherDue)}</strong>
                    </span>
                  )}
                  {duesBreakdown.advanceBalance > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px] ml-auto">
                      অগ্রিম জমা: <strong>{formatCurrencyBn(duesBreakdown.advanceBalance)}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Security Deposit Adjustment Section */}
          {selectedBoarder && depositDetails.availableDeposit > 0 && (
            <div className="p-4 rounded-2xl border-2 border-teal-500/40 bg-teal-950/20 shadow-lg shadow-teal-950/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-300">
                        সংরক্ষিত জামানত স্থিতি: {formatCurrencyBn(depositDetails.availableDeposit)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        ডিপোজিট ফান্ড
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {depositDetails.adjustedDeposit > 0
                        ? `পূর্বে সমন্বয় হয়েছে: ${formatCurrencyBn(depositDetails.adjustedDeposit)} (মূল জামানত: ${formatCurrencyBn(depositDetails.totalDeposit)})`
                        : 'হোস্টেল তহবিলে এই বর্ডারের জামানত সংরক্ষিত রয়েছে'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextState = !isAdjustingFromDeposit
                    setIsAdjustingFromDeposit(nextState)
                    if (nextState) {
                      const defaultAdj = Math.min(
                        duesBreakdown.totalDue > 0 ? duesBreakdown.totalDue : depositDetails.availableDeposit,
                        depositDetails.availableDeposit
                      )
                      setDepositAdjustAmount(defaultAdj)
                      handleApplyDepositAdjustment(defaultAdj)
                    } else {
                      setDepositAdjustAmount('')
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0 ${
                    isAdjustingFromDeposit
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                      : 'bg-slate-800 text-teal-300 border border-teal-500/40 hover:bg-teal-950/40'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAdjustingFromDeposit ? 'সমন্বয় সক্রিয়' : 'জামানত থেকে সমন্বয় করুন'}</span>
                </button>
              </div>

              {isAdjustingFromDeposit && (
                <div className="pt-2.5 border-t border-teal-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        সমন্বয়ের পরিমাণ (সর্বোচ্চ {formatCurrencyBn(depositDetails.availableDeposit)}):
                      </label>
                      <input
                        type="number"
                        max={depositDetails.availableDeposit}
                        min={1}
                        value={depositAdjustAmount}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value)
                          const clamped = typeof val === 'number' ? Math.min(val, depositDetails.availableDeposit) : ''
                          setDepositAdjustAmount(clamped)
                          if (typeof clamped === 'number') {
                            handleApplyDepositAdjustment(clamped)
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-950 border border-teal-500/50 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-teal-400"
                        placeholder="টাকার পরিমাণ লিখুন..."
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1 sm:pt-4">
                      {duesBreakdown.totalDue > 0 && duesBreakdown.totalDue <= depositDetails.availableDeposit && (
                        <button
                          type="button"
                          onClick={() => {
                            const val = Math.min(duesBreakdown.totalDue, depositDetails.availableDeposit)
                            setDepositAdjustAmount(val)
                            handleApplyDepositAdjustment(val)
                          }}
                          className="px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 cursor-pointer"
                        >
                          বকেয়া সমান ({formatCurrencyBn(duesBreakdown.totalDue)})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setDepositAdjustAmount(depositDetails.availableDeposit)
                          handleApplyDepositAdjustment(depositDetails.availableDeposit)
                        }}
                        className="px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 cursor-pointer"
                      >
                        পুরো জামানত ({formatCurrencyBn(depositDetails.availableDeposit)})
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/20 text-[11px] text-teal-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
                    <span>
                      <strong>ক্যাশবহির্ভূত সমন্বয়:</strong> এই টাকা নতুন করে ক্যাশে জমা হবে না, কারণ তা আগেই জামানত হিসেবে ক্যাশে জমা নেওয়া হয়েছে। সংরক্ষিত জামানত থেকে এই অংক কর্তন হয়ে বর্তমান বিল পরিশোধ হবে।
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-head Breakdown Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  আদায়ের খাতসমূহ ও টাকার পরিমাণ (Billing Breakdown)
                </span>
                <span className="text-[11px] text-slate-400">
                  যেসব খাতের বিল গ্রহণ করছেন তাতে টাকার অংক দিন। স্বয়ংক্রিয়ভাবে মোট হিসাব হবে।
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddItem()}
                className="text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                খাত যোগ করুন
              </Button>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-48">বিলিং খাত</th>
                    <th className="py-2.5 px-3">বিবরণ / নোট (ঐচ্ছিক)</th>
                    <th className="py-2.5 px-3 text-right w-36">টাকার পরিমাণ (৳)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3">
                        <select
                          value={item.head_code}
                          onChange={(e) => {
                            const found = DEFAULT_HEADS.find((h) => h.code === e.target.value)
                            handleItemChange(idx, 'head_code', e.target.value)
                            handleItemChange(idx, 'head_name', found ? found.name.split(' (')[0] : e.target.value)
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-primary-500"
                        >
                          {DEFAULT_HEADS.map((head) => (
                            <option key={head.code} value={head.code}>
                              {head.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="যেমন: অক্টোবর মাসের নিয়মিত বিল"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-slate-600"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={item.amount || ''}
                            onChange={(e) => handleItemChange(idx, 'amount', Math.max(0, Number(e.target.value)))}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-right text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                          />
                          {getHeadDue(item.head_code) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleItemChange(idx, 'amount', getHeadDue(item.head_code))}
                              title="বকেয়া অংকটি এই ঘরে বসান"
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-mono block ml-auto hover:underline cursor-pointer"
                            >
                              বকেয়া: {formatCurrencyBn(getHeadDue(item.head_code))} [পূরণ]
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                            title="খাত সরান"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950/60 font-bold border-t border-slate-800 text-xs">
                  <tr>
                    <td colSpan={2} className="py-3 px-3 text-right text-slate-300">
                      মোট আদায় (Total Collection):
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black text-sm">
                      {formatCurrencyBn(totalAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Payment Method & Destination Account (Or Non-Cash Deposit Adjustment Banner) */}
          {isAdjustingFromDeposit ? (
            <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="text-xs font-bold text-teal-200 flex items-center gap-2">
                  <span>পেমেন্ট মাধ্যম: জামানত থেকে সমন্বয় (Deposit Adjustment)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30">
                    ক্যাশবহির্ভূত ট্রানজ্যাকশন
                  </span>
                </div>
                <div className="text-[11px] text-teal-300/80 leading-relaxed">
                  এই সমন্বয়ের কারণে ক্যাশ ড্রয়ার বা ব্যাংক অ্যাকাউন্টে কোনো নতুন টাকা যোগ হবে না। সংরক্ষিত জামানতের তহবিল থেকে এই অংকটি স্বয়ংক্রিয়ভাবে কর্তন হয়ে বর্তমান বিল পরিশোধে যুক্ত হবে।
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  পেমেন্ট মাধ্যম <span className="text-rose-400">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="CASH">নগদ ক্যাশ (Cash)</option>
                  <option value="MFS">বিকাশ / নগদ (MFS)</option>
                  <option value="BANK_TRANSFER">ব্যাংক ট্রান্সফার (Bank Transfer)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    জমার অ্যাকাউন্ট (Destination Account) <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreateAccountModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    নতুন অ্যাকাউন্ট
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-amber-300">কোনো জমার অ্যাকাউন্ট পাওয়া যায়নি।</span>
                    <button
                      type="button"
                      onClick={() => setIsCreateAccountModalOpen(true)}
                      className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> তৈরি করুন
                    </button>
                  </div>
                ) : (
                  <select
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({formatCurrencyBn(acc.current_balance)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Reference & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ট্রানজ্যাকশন আইডি / চেক নং (ঐচ্ছিক)"
              value={reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
              placeholder="যেমন: TRX9281729 বা ব্যাংকের স্লিপ নং"
              className="text-xs font-mono"
            />
            <Input
              label="মন্তব্য / বিশেষ বিবরণী"
              value={remarks}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)}
              placeholder="যেমন: মাসিক বিল পরিশোধ বাবদ"
              className="text-xs"
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>মোট আদায়:</span>
              <span className="text-base font-black text-emerald-400 font-mono">
                {formatCurrencyBn(totalAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onClose}
                disabled={recordReceiptMutation.isPending}
              >
                বাতিল
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                id="submit-receipt-btn"
                data-testid="submit-receipt-btn"
                isLoading={recordReceiptMutation.isPending}
                disabled={!boarderId || totalAmount <= 0}
                className={
                  isAdjustingFromDeposit
                    ? 'bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 shadow-md shadow-teal-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4'
                }
              >
                {isAdjustingFromDeposit ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                    জামানত থেকে সমন্বয় নিশ্চিত করুন
                  </>
                ) : (
                  <>
                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                    রিসিপ্ট নিশ্চিত ও সেভ করুন
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Printable Receipt Voucher Modal on Success */}
      <ReceiptPrintView
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false)
          onClose()
        }}
        receipt={createdReceipt}
      />

      {/* Create Financial Account Modal */}
      {isCreateAccountModalOpen && (
        <CreateFinancialAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          onAccountCreated={(newAcc) => {
            setDestinationAccountId(newAcc.id)
          }}
        />
      )}
    </>
  )
}
export default CollectReceiptModal

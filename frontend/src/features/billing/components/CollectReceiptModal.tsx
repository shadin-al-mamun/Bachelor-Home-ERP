import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  useFinancialAccounts,
  useRecordReceiptMutation,
  type ExtendedReceipt,
  type UnifiedCollectionItem,
} from '../api/useReceipts'
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
  Building,
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

  const [boarderId, setBoarderId] = useState(preSelectedBoarderId || '')
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

  const selectedBoarder = useMemo(() => {
    return boarders.find((b) => b.id === boarderId)
  }, [boarders, boarderId])

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

    if (!destinationAccountId) {
      setErrorMsg('অনুগ্রহ করে জমার অ্যাকাউন্ট নির্বাচন করুন।')
      return
    }

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
      const selectedAccount = accounts.find((a) => a.id === destinationAccountId)

      const result = await recordReceiptMutation.mutateAsync({
        boarderId,
        destinationAccountId,
        paymentMethod,
        amount: totalAmount,
        collectionDate: new Date(collectionDate).toISOString(),
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
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
        destination_account_id: destinationAccountId,
        account_name: selectedAccount?.account_name || 'ক্যাশ অ্যাকাউন্ট',
        amount: totalAmount,
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
        receipt_date: new Date(collectionDate).toISOString(),
        is_void: false,
        remarks: remarks.trim() || undefined,
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">বর্ডার নির্বাচন করুন...</option>
                {boarders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name} ({b.boarder_code})
                  </option>
                ))}
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Boarder Info Snippet if selected */}
          {selectedBoarder && (
            <div className="px-3.5 py-2.5 bg-primary-500/5 border border-primary-500/20 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Building className="w-4 h-4 text-primary-400" />
                <span>
                  বর্ডার: <strong className="text-white">{selectedBoarder.full_name}</strong> | ফোন: {selectedBoarder.phone_number || 'নেই'}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-mono text-[11px] font-semibold">
                আইডি: {selectedBoarder.boarder_code}
              </span>
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
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => handleItemChange(idx, 'amount', Math.max(0, Number(e.target.value)))}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-right text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
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

          {/* Payment Method & Destination Account */}
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4"
              >
                <Receipt className="w-3.5 h-3.5 mr-1.5" />
                রিসিপ্ট নিশ্চিত ও সেভ করুন
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

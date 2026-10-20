import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  useFinancialAccounts,
  useUnpaidCharges,
  useRecordReceiptMutation,
  type ExtendedReceipt,
} from '../api/useReceipts'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { ReceiptPrintView } from './ReceiptPrintView'
import { formatCurrencyBn } from '@/utils/date'
import { autoDistributePayment } from '../utils/paymentDistribution'
import type { PaymentMethod } from '@/types/database'
import {
  Receipt,
  User,
  AlertCircle,
  Wallet,
  Sparkles,
  CreditCard,
  Plus,
} from 'lucide-react'
import { CreateFinancialAccountModal } from '@/features/finance/components/CreateFinancialAccountModal'

interface CollectReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedBoarderId?: string
}

export const CollectReceiptModal: React.FC<CollectReceiptModalProps> = ({
  isOpen,
  onClose,
  preSelectedBoarderId,
}) => {
  const { data: boarders = [] } = useBoarders({ status: 'ACTIVE' })
  const { data: accounts = [] } = useFinancialAccounts()

  const [boarderId, setBoarderId] = useState(preSelectedBoarderId || '')
  const { data: unpaidCharges = [], isLoading: isLoadingCharges } = useUnpaidCharges(boarderId)

  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [reference, setReference] = useState('')
  const [remarks, setRemarks] = useState('')
  const [allocations, setAllocations] = useState<Record<string, number>>({})

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
      setAmountReceived(0)
      setPaymentMethod('CASH')
      setReference('')
      setRemarks('')
      setAllocations({})

      // Set default cash account
      if (accounts.length > 0) {
        const cashAcc = accounts.find((a) => a.account_type === 'CASH_MANAGER' || a.account_type === 'CASH_OWNER')
        setDestinationAccountId(cashAcc ? cashAcc.id : accounts[0].id)
      }
    }
  }, [isOpen, preSelectedBoarderId, accounts])

  // Automatically select matching account when payment method or accounts list changes
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

  // Automatically distribute allocations when unpaidCharges or amountReceived change
  useEffect(() => {
    if (unpaidCharges.length > 0) {
      if (amountReceived > 0) {
        const newAlloc = autoDistributePayment(amountReceived, unpaidCharges)
        setAllocations(newAlloc)
      } else {
        const initial: Record<string, number> = {}
        unpaidCharges.forEach((c) => {
          initial[c.id] = 0
        })
        setAllocations(initial)
      }
    }
  }, [unpaidCharges, amountReceived])

  // Total amount currently allocated across charges
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0)

  // Auto-distribute payment across oldest unpaid charges first
  const handleAutoDistribute = () => {
    if (amountReceived <= 0) {
      setErrorMsg('প্রথমে মোট গৃহীত টাকার পরিমাণ (Amount Received) ইনপুট করুন।')
      return
    }

    const newAlloc = autoDistributePayment(amountReceived, unpaidCharges)
    setAllocations(newAlloc)
    setErrorMsg(null)
  }

  const handleAllocationChange = (chargeId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [chargeId]: Math.max(0, val),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!boarderId) {
      setErrorMsg('অনুগ্রহ করে একজন বর্ডার নির্বাচন করুন।')
      return
    }
    if (amountReceived <= 0) {
      setErrorMsg('গৃহীত টাকার পরিমাণ অবশ্যই ০ এর বেশি হতে হবে।')
      return
    }
    if (!destinationAccountId) {
      setErrorMsg('অনুগ্রহ করে জমার একাউন্ট বা ক্যাশ বক্স নির্বাচন করুন।')
      return
    }

    // Auto-allocate if not yet allocated
    let currentAllocations = allocations
    let allocationPayload = Object.entries(currentAllocations)
      .filter(([, amt]) => amt > 0)
      .map(([charge_id, amount]) => ({
        charge_id,
        amount,
      }))

    if (allocationPayload.length === 0 && unpaidCharges.length > 0 && amountReceived > 0) {
      const autoAlloc = autoDistributePayment(amountReceived, unpaidCharges)
      currentAllocations = autoAlloc
      setAllocations(autoAlloc)
      allocationPayload = Object.entries(autoAlloc)
        .filter(([, amt]) => amt > 0)
        .map(([charge_id, amount]) => ({
          charge_id,
          amount,
        }))
    }

    const currentTotalAllocated = Object.values(currentAllocations).reduce((sum, val) => sum + (val || 0), 0)
    if (currentTotalAllocated > amountReceived) {
      setErrorMsg(
        `চার্জে বণ্টনকৃত টাকার পরিমাণ (${formatCurrencyBn(
          currentTotalAllocated
        )}) মোট গৃহীত টাকার (${formatCurrencyBn(amountReceived)}) চেয়ে বেশি হতে পারবে না।`
      )
      return
    }

    try {
      const result = await recordReceiptMutation.mutateAsync({
        boarderId,
        amount: amountReceived,
        paymentMethod,
        destinationAccountId,
        reference: reference.trim() || undefined,
        remarks: remarks.trim() || undefined,
        allocations: allocationPayload,
      })

      const selectedBoarder = boarders.find((b) => b.id === boarderId)
      const selectedAccount = accounts.find((a) => a.id === destinationAccountId)

      const receiptObject: ExtendedReceipt = {
        id: result?.receipt_id || `rc-${Date.now()}`,
        receipt_number: result?.receipt_number || 'RCT-AUTO',
        boarder_id: boarderId,
        boarder_name: selectedBoarder?.full_name || 'বর্ডার',
        boarder_code: selectedBoarder?.boarder_code || '',
        boarder_phone: selectedBoarder?.phone_number,
        received_by: 'current-manager',
        collector_name: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
        destination_account_id: destinationAccountId,
        account_name: selectedAccount?.account_name || 'ক্যাশ হিসাব',
        amount: amountReceived,
        payment_method: paymentMethod,
        transaction_reference: reference.trim() || undefined,
        receipt_date: new Date().toISOString(),
        is_void: false,
        remarks: remarks.trim() || undefined,
        created_at: new Date().toISOString(),
        allocations: allocationPayload.map((a) => {
          const ch = unpaidCharges.find((c) => c.id === a.charge_id)
          return {
            charge_id: a.charge_id,
            charge_type: ch?.charge_type || 'RENT',
            billing_month: ch?.billing_month || '2026-10-01',
            description: ch?.description || 'সিট ভাড়া',
            amount: a.amount,
          }
        }),
      }

      setCreatedReceipt(receiptObject)
      setIsPrintModalOpen(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মানি রিসিপ্ট সংগ্রহে ব্যর্থ হয়েছে।'
      setErrorMsg(msg)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !isPrintModalOpen}
        onClose={onClose}
        title="মানি রিসিপ্ট সংগ্রহ (Collect Money Receipt)"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Row: Boarder Selection & Total Amount Received */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <Input
              type="number"
              label="মোট প্রাপ্ত টাকার পরিমাণ (৳)"
              value={amountReceived || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmountReceived(Number(e.target.value))
              }
              placeholder="যেমন: ৪২০০"
              required
              className="text-xs font-bold text-emerald-400"
            />
          </div>

          {/* Payment Method & Destination Account */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                পেমেন্ট মাধ্যম <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="CASH">নগদ ক্যাশ (Cash)</option>
                <option value="MFS">বিকাশ / নগদ (MFS)</option>
                <option value="BANK_TRANSFER">ব্যাংক ট্রান্সফার (Bank)</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
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
                  নতুন অ্যাকাউন্ট তৈরি
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
                    <Plus className="w-3 h-3" /> অ্যাকাউন্ট তৈরি করুন
                  </button>
                </div>
              ) : (
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
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

          {/* Transaction Reference & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ট্রানজ্যাকশন আইডি / চেক নং (ঐচ্ছিক)"
              value={reference}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
              placeholder="যেমন: TRX9281729 বা ডাচ বাংলা স্লিপ"
              className="text-xs font-mono"
            />
            <Input
              label="মন্তব্য / বিবরণী"
              value={remarks}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)}
              placeholder="যেমন: আংশিক পরিশোধ"
              className="text-xs"
            />
          </div>

          {/* Payment Allocation Matrix */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  বকেয়া চার্জ সমন্বয় ম্যাট্রিক্স (Charge Allocation)
                </span>
                <span className="text-[11px] text-slate-400">
                  টাকা কোন কোন মাসের বিলের বিপরীতে জমা হবে তা বণ্টন করুন।
                </span>
              </div>

              {unpaidCharges.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAutoDistribute}
                  className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  অটো-অ্যালোকেট (পুরাতন বিল আগে)
                </Button>
              )}
            </div>

            {isLoadingCharges ? (
              <div className="py-6 text-center text-xs text-slate-500">
                বকেয়া চার্জ তালিকা লোড হচ্ছে...
              </div>
            ) : unpaidCharges.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                এই বর্ডারের বর্তমানে কোনো অমীমাংসিত বকেয়া চার্জ নেই। টাকা জমা দিলে অ্যাডভান্স হিসেবে গণ্য হবে।
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">চার্জের ধরন ও মাস</th>
                      <th className="py-2.5 px-3 text-right">মোট পাওনা</th>
                      <th className="py-2.5 px-3 text-right">বকেয়া বাকি</th>
                      <th className="py-2.5 px-3 text-right w-36">জমার পরিমাণ (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {unpaidCharges.map((ch) => (
                      <tr key={ch.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3">
                          <span className="font-semibold text-white block">
                            {ch.description || `${ch.charge_type} চার্জ`}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            বিলিং মাস: {ch.billing_month}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">
                          {formatCurrencyBn(ch.amount)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-400">
                          {formatCurrencyBn(ch.due_amount)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={allocations[ch.id] || ''}
                            onChange={(e) =>
                              handleAllocationChange(ch.id, Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-28 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-right text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950/40 font-bold border-t border-slate-800 text-xs">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-right text-slate-300">
                        মোট বণ্টনকৃত টাকা:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-400 font-bold">
                        {formatCurrencyBn(totalAllocated)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              মোট প্রাপ্ত: <span className="text-white font-bold">{formatCurrencyBn(amountReceived)}</span>
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
                disabled={!boarderId || amountReceived <= 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
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

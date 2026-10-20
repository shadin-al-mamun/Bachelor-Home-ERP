import React, { useState } from 'react'
import {
  X,
  PlusCircle,
  Calendar,
  Building2,
  Wallet,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Info,
  Plus,
} from 'lucide-react'
import { ManageCategoriesModal } from './ManageCategoriesModal'
import {
  useIncomeCategories,
  useRecordIncomeMutation,
  type RecordIncomeInput,
} from '../api/useFinance'
import {
  useExpenseAccounts,
  useExpenseFlats,
} from '@/features/expenses/api/useExpenses'

interface AddIncomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: categories = [] } = useIncomeCategories()
  const { data: accounts = [] } = useExpenseAccounts()
  const { data: flats = [] } = useExpenseFlats()
  const recordMutation = useRecordIncomeMutation()

  // Form State
  const [incomeDate, setIncomeDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [destinationAccountId, setDestinationAccountId] = useState<string>('')
  const [isFlatWise, setIsFlatWise] = useState<boolean>(false)
  const [flatId, setFlatId] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successVoucher, setSuccessVoucher] = useState<string | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false)

  // Initialize defaults
  React.useEffect(() => {
    if (categories.length > 0) {
      if (!categoryId || !categories.some((c) => c.id === categoryId)) {
        setCategoryId(categories[0].id)
      }
    }
  }, [categories, categoryId])

  React.useEffect(() => {
    if (accounts.length > 0 && !destinationAccountId) {
      setDestinationAccountId(accounts[0].id)
    }
  }, [accounts, destinationAccountId])

  if (!isOpen) return null

  const selectedAccount = accounts.find((a) => a.id === destinationAccountId)
  const parsedAmount = parseFloat(amount) || 0
  const projectedBalance = selectedAccount ? selectedAccount.current_balance + parsedAmount : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!categoryId) {
      setErrorMsg('আয়ের খাত নির্বাচন করা আবশ্যক।')
      return
    }

    if (!amount || parsedAmount <= 0) {
      setErrorMsg('সঠিক আয়ের পরিমাণ (টাকা) প্রদান করুন।')
      return
    }

    if (!destinationAccountId) {
      setErrorMsg('টাকা জমা গ্রহণের একাউন্ট নির্বাচন করুন।')
      return
    }

    if (!description.trim()) {
      setErrorMsg('আয়ের সুনির্দিষ্ট বিবরণ উল্লেখ করুন।')
      return
    }

    try {
      const payload: RecordIncomeInput = {
        categoryId,
        amount: parsedAmount,
        destinationAccountId,
        buildingId: isFlatWise && flatId ? flats.find((f: any) => f.id === flatId)?.building_id : null,
        flatId: isFlatWise && flatId ? flatId : null,
        incomeDate,
        description: description.trim(),
      }

      const res = await recordMutation.mutateAsync(payload)
      setSuccessVoucher(res.income_voucher_no || 'INC-DONE')

      setTimeout(() => {
        setSuccessVoucher(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'নন-রেন্ট আয় এন্ট্রি করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-600/30 flex items-center justify-center text-white">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                নন-রেন্ট আয় এন্ট্রি (Non-Rent Income)
              </h3>
              <p className="text-xs text-slate-400">
                অতিথি ফি, স্ক্র্যাপ বিক্রয় ও অন্যান্য আনুষঙ্গিক রাজস্ব গ্রহণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Success Banner */}
          {successVoucher && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  নন-রেন্ট আয় সফলভাবে এন্ট্রি হয়েছে!
                </p>
                <p className="text-xs text-emerald-400/80">
                  ভাউচার নম্বর: <span className="font-mono font-bold text-white">{successVoucher}</span>। টাকা একাউন্টে যোগ হয়েছে।
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Grid row 1: Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Income Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                আয়ের তারিখ <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Income Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  আয়ের খাত / রাজস্ব উৎস <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  title="নতুন আয়ের খাত তৈরি করুন"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>নতুন খাত তৈরি</span>
                </button>
              </div>
              <select
                id="income-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
              >
                {categories.length === 0 ? (
                  <option value="" disabled>ক্যাটাগরি লোড হচ্ছে...</option>
                ) : (
                  <>
                    {!categoryId && (
                      <option value="" disabled>-- আয়ের খাত নির্বাচন করুন --</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white py-1">
                        {c.name} {c.description ? `(${c.description})` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Grid row 2: Amount & Destination Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>আয়ের পরিমাণ (BDT) <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-slate-500">গৃহীত টাকা</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 font-bold">
                  ৳
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="০.০০"
                  required
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder-slate-600"
                />
              </div>
            </div>

            {/* Destination Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  জমা গ্রহণের একাউন্ট <span className="text-rose-400">*</span>
                </span>
                {selectedAccount && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    বর্তমান: ৳{selectedAccount.current_balance.toLocaleString('en-IN')}
                  </span>
                )}
              </label>
              <select
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.account_name} — ৳{a.current_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Balance Live Deposit Indicator */}
          {selectedAccount && parsedAmount > 0 && (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  {selectedAccount.account_name} ব্যালেন্স বৃদ্ধি:
                </span>
              </div>
              <div className="font-mono font-semibold">
                ৳{selectedAccount.current_balance.toLocaleString('en-IN')} + ৳{parsedAmount.toLocaleString('en-IN')} ={' '}
                <span className="text-emerald-400 font-bold">
                  ৳{projectedBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Flat-wise Scope (Optional) */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    নির্দিষ্ট ফ্ল্যাট সম্পর্কিত রাজস্ব
                  </span>
                  <p className="text-[11px] text-slate-400">
                    যেমন: ফ্ল্যাট ৩-বি এর কোনো মেহমানের থাকার চার্জ
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFlatWise}
                  onChange={(e) => {
                    setIsFlatWise(e.target.checked)
                    if (e.target.checked && flats.length > 0 && !flatId) {
                      setFlatId(flats[0].id)
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
              </label>
            </div>

            {isFlatWise && (
              <div className="pt-2 border-t border-slate-800 animate-fade-in space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  নির্দিষ্ট ফ্ল্যাট নির্বাচন করুন:
                </label>
                <select
                  value={flatId}
                  onChange={(e) => setFlatId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {flats.map((f: any) => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-white">
                      {f.name} ({f.flat_code}) — {f.building?.name || 'হোস্টেল বিল্ডিং'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>আয়ের বিস্তারিত বিবরণ <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500">কে দিল, কিসের ফি, মেমো/ট্রানজেকশন তথ্য</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="উদাঃ রুম ২০৩ এর বর্ডার রিয়াদের বন্ধুর ২ দিন থাকার ফি বাবদ ক্যাশ গ্রহণ..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={recordMutation.isPending}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={recordMutation.isPending || !!successVoucher}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {recordMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>নন-রেন্ট আয় সম্পন্ন করুন</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Category Creation / Management Modal */}
      <ManageCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        initialType="INCOME"
        onCategoryCreated={(newCat) => {
          setCategoryId(newCat.id)
        }}
      />
    </div>
  )
}
export default AddIncomeModal

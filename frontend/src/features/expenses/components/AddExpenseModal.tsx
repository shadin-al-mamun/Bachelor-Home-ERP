import React, { useState, useRef } from 'react'
import {
  X,
  Receipt,
  Calendar,
  Building2,
  Wallet,
  Camera,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Info,
  Plus,
} from 'lucide-react'
import { ManageCategoriesModal } from '@/features/finance/components/ManageCategoriesModal'
import {
  useExpenseCategories,
  useExpenseAccounts,
  useExpenseFlats,
  useRecordExpenseMutation,
  type RecordExpenseInput,
} from '../api/useExpenses'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: categories = [] } = useExpenseCategories()
  const { data: accounts = [] } = useExpenseAccounts()
  const { data: flats = [] } = useExpenseFlats()
  const recordMutation = useRecordExpenseMutation()

  // Form State
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [sourceAccountId, setSourceAccountId] = useState<string>('')
  const [isFlatWise, setIsFlatWise] = useState<boolean>(false)
  const [flatId, setFlatId] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  // Voucher File & Preview State
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ voucherNo: string } | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Default selection initialization
  React.useEffect(() => {
    if (categories.length > 0) {
      if (!categoryId || !categories.some((c) => c.id === categoryId)) {
        setCategoryId(categories[0].id)
      }
    }
  }, [categories, categoryId])

  React.useEffect(() => {
    if (accounts.length > 0 && !sourceAccountId) {
      setSourceAccountId(accounts[0].id)
    }
  }, [accounts, sourceAccountId])

  if (!isOpen) return null

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('ফাইল সাইজ সর্বোচ্চ ১০ মেগাবাইট (10MB) পর্যন্ত হতে পারবে।')
      return
    }

    setSelectedFile(file)
    setErrorMsg(null)

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const selectedAccount = accounts.find((a) => a.id === sourceAccountId)
  const parsedAmount = parseFloat(amount) || 0
  const remainingBalance = selectedAccount ? selectedAccount.current_balance - parsedAmount : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!categoryId) {
      setErrorMsg('ব্যয়ের খাত নির্বাচন করা আবশ্যক।')
      return
    }

    if (!amount || parsedAmount <= 0) {
      setErrorMsg('সঠিক ব্যয়ের পরিমাণ (টাকা) প্রদান করুন।')
      return
    }

    if (!sourceAccountId) {
      setErrorMsg('পরিশোধের একাউন্ট নির্বাচন করুন।')
      return
    }

    if (!description.trim()) {
      setErrorMsg('খরচের সুনির্দিষ্ট বিবরণ উল্লেখ করুন।')
      return
    }

    try {
      const payload: RecordExpenseInput = {
        categoryId,
        amount: parsedAmount,
        sourceAccountId,
        buildingId: isFlatWise && flatId ? flats.find((f: any) => f.id === flatId)?.building_id : null,
        flatId: isFlatWise && flatId ? flatId : null,
        expenseDate,
        description: description.trim(),
        voucherFile: selectedFile,
      }

      const res = await recordMutation.mutateAsync(payload)
      setSuccessInfo({ voucherNo: res.expense_voucher_no || res.voucher_number || 'EXP-CREATED' })

      setTimeout(() => {
        setSuccessInfo(null)
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'খরচ সংরক্ষণ করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                দৈনিক খরচ এন্ট্রি ও ভাউচার আপলোড
              </h3>
              <p className="text-xs text-slate-400">
                হোস্টেলের যেকোনো খরচ, ক্যাশ মেমো এবং অনুমোদন ওয়ার্কফ্লো
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
          {/* Success Message Banner */}
          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 animate-fade-in">
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  খরচ সফলভাবে এন্ট্রি হয়েছে!
                </p>
                <p className="text-xs text-emerald-400/80">
                  ভাউচার নম্বর: <span className="font-mono font-bold text-white">{successInfo.voucherNo}</span>। এটি অনুমোদনের অপেক্ষায় রয়েছে।
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
            {/* Expense Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                খরচের তারিখ <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Expense Category */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                  ব্যয়ের খাত / ক্যাটাগরি <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  title="নতুন ব্যয়ের খাত তৈরি করুন"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>নতুন খাত তৈরি</span>
                </button>
              </div>
              <select
                id="expense-category-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
              >
                {categories.length === 0 ? (
                  <option value="" disabled>ক্যাটাগরি লোড হচ্ছে...</option>
                ) : (
                  <>
                    {!categoryId && (
                      <option value="" disabled>-- ব্যয়ের খাত নির্বাচন করুন --</option>
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

          {/* Grid row 2: Amount & Source Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>ব্যয়ের পরিমাণ (BDT) <span className="text-rose-400">*</span></span>
                <span className="text-[10px] text-slate-500">বাংলা বা ইংরেজি সংখ্যা</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
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
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-slate-600"
                />
              </div>
            </div>

            {/* Source Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  যে একাউন্ট থেকে প্রদান করা হয়েছে <span className="text-rose-400">*</span>
                </span>
                {selectedAccount && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ব্যালেন্স: ৳{selectedAccount.current_balance.toLocaleString('en-IN')}
                  </span>
                )}
              </label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                    {a.account_name} — ৳{a.current_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account Balance Live Deduction Indicator */}
          {selectedAccount && parsedAmount > 0 && (
            <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
              remainingBalance < 0
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/30 border-indigo-500/20 text-indigo-300'
            }`}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {selectedAccount.account_name} ব্যালেন্স কর্তন:
                </span>
              </div>
              <div className="font-mono font-semibold">
                ৳{selectedAccount.current_balance.toLocaleString('en-IN')} − ৳{parsedAmount.toLocaleString('en-IN')} ={' '}
                <span className={remainingBalance < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                  ৳{remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Flat-wise Scope Selection */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    ফ্ল্যাট-ভিত্তিক খরচ ট্র্যাকিং
                  </span>
                  <p className="text-[11px] text-slate-400">
                    খরচটি কি কোনো নির্দিষ্ট ফ্ল্যাটের সাথে সম্পর্কিত? (যেমন: ফ্ল্যাট মেরামত বা এসি বিল)
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
              <span>খরচের বিস্তারিত বিবরণ / খাতের বিবরণ <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500">দোকানের নাম, মেমো নম্বর ইত্যাদি</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="উদাঃ ৫ম তলার বাথরুমের বেসিন পাইপ ক্রয় ও মেকানিক মজুরি..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Voucher File Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>ক্যাশ মেমো / ভাউচার সংযুক্তি (ছবি বা পিডিএফ)</span>
              <span className="text-[10px] text-slate-500">অনুমোদনের জন্য সুপারিশকৃত</span>
            </label>

            {/* Hidden native inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {selectedFile ? (
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Voucher preview"
                      className="w-12 h-12 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'ডকুমেন্ট'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="ফাইল মুছুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera Capture Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 rounded-2xl border border-dashed border-indigo-500/40 hover:border-indigo-400 bg-indigo-950/20 hover:bg-indigo-950/30 flex items-center justify-center gap-2.5 text-indigo-300 transition-all text-xs font-semibold group"
                >
                  <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>ক্যামেরা দিয়ে ছবি তুলুন</span>
                </button>

                {/* File Upload Picker */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/60 hover:bg-slate-900 flex items-center justify-center gap-2.5 text-slate-300 transition-all text-xs font-semibold group"
                >
                  <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>গ্যালারি বা পিডিএফ সিলেক্ট করুন</span>
                </button>
              </div>
            )}
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
              disabled={recordMutation.isPending || !!successInfo}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {recordMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>খরচ এন্ট্রি সম্পন্ন করুন</span>
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
        initialType="EXPENSE"
        onCategoryCreated={(newCat) => {
          setCategoryId(newCat.id)
        }}
      />
    </div>
  )
}
export default AddExpenseModal

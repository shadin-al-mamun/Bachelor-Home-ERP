import React, { useState } from 'react'
import {
  X,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  DollarSign,
  Tag,
  Sparkles,
  Layers,
  FolderPlus,
} from 'lucide-react'
import {
  useExpenseCategories,
  useCreateExpenseCategoryMutation,
} from '@/features/expenses/api/useExpenses'
import {
  useIncomeCategories,
  useCreateIncomeCategoryMutation,
} from '@/features/finance/api/useFinance'
import type { ExpenseCategory, IncomeCategory } from '@/types/database'

export interface ManageCategoriesModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: 'EXPENSE' | 'INCOME'
  onCategoryCreated?: (
    category: ExpenseCategory | IncomeCategory,
    type: 'EXPENSE' | 'INCOME'
  ) => void
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  initialType = 'EXPENSE',
  onCategoryCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>(initialType)
  const [searchQuery, setSearchQuery] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // React Query hooks
  const { data: expenseCategories = [] } = useExpenseCategories()
  const { data: incomeCategories = [] } = useIncomeCategories()

  const createExpenseMutation = useCreateExpenseCategoryMutation()
  const createIncomeMutation = useCreateIncomeCategoryMutation()

  // Reset tab when modal opens with a different initialType
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType)
      setErrorMsg(null)
      setSuccessMsg(null)
      setName('')
      setDescription('')
    }
  }, [isOpen, initialType])

  if (!isOpen) return null

  const isExpense = activeTab === 'EXPENSE'
  const currentCategories = isExpense ? expenseCategories : incomeCategories
  const isCreating = isExpense
    ? createExpenseMutation.isPending
    : createIncomeMutation.isPending

  // Filter existing categories by search query
  const filteredCategories = currentCategories.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMsg('ক্যাটাগরি বা খাতের নাম প্রদান করুন।')
      return
    }

    try {
      if (isExpense) {
        const created = await createExpenseMutation.mutateAsync({
          name: trimmedName,
          description: description.trim() || undefined,
          isActive: true,
        })
        setSuccessMsg(`ব্যয়ের খাত "${created.name}" সফলভাবে যুক্ত করা হয়েছে!`)
        setName('')
        setDescription('')
        onCategoryCreated?.(created, 'EXPENSE')
      } else {
        const created = await createIncomeMutation.mutateAsync({
          name: trimmedName,
          description: description.trim() || undefined,
          isActive: true,
        })
        setSuccessMsg(`আয়ের খাত "${created.name}" সফলভাবে যুক্ত করা হয়েছে!`)
        setName('')
        setDescription('')
        onCategoryCreated?.(created, 'INCOME')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'ক্যাটাগরি তৈরি করতে ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl p-0.5 shadow-lg flex items-center justify-center text-white ${
                isExpense
                  ? 'bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-indigo-600/30'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-emerald-600/30'
              }`}
            >
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                খাত ও ক্যাটাগরি ব্যবস্থাপনা (Categories)
              </h3>
              <p className="text-xs text-slate-400">
                ব্যয় ও আয়ের সুনির্দিষ্ট খাত তৈরি ও তালিকা পরিচালনা করুন
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('EXPENSE')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isExpense
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>ব্যয়ের খাত (Expense Categories)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isExpense ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {expenseCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('INCOME')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              !isExpense
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'bg-slate-800/70 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>আয়ের খাত (Income Categories)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                !isExpense ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-300'
              }`}
            >
              {incomeCategories.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Notifications */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Create New Category Form */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isExpense
                ? 'bg-indigo-950/20 border-indigo-500/30'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                className={`w-4 h-4 ${isExpense ? 'text-indigo-400' : 'text-emerald-400'}`}
              />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isExpense ? 'নতুন ব্যয়ের খাত যুক্ত করুন' : 'নতুন আয়ের খাত যুক্ত করুন'}
              </h4>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    খাতের নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      isExpense
                        ? 'যেমন: জেনারেটর ডিজেল ও সার্ভিসিং'
                        : 'যেমন: মেহমান খাবার ও গেস্ট ফি'
                    }
                    required
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">
                    বিবরণ / ব্যাখ্যা (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="খাতের সংক্ষিপ্ত উদ্দেশ্য বা বিবরণ"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isExpense
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {isCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{isExpense ? 'ব্যয়ের খাত যোগ করুন' : 'আয়ের খাত যোগ করুন'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  বিদ্যমান খাতের তালিকা ({filteredCategories.length}টি)
                </h4>
              </div>

              {/* Search Box */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="খাত খুঁজুন..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* List Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredCategories.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60">
                  কোনো ক্যাটাগরি পাওয়া যায়নি
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between gap-1 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            cat.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
                        {cat.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 pl-4">
                        {cat.description}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManageCategoriesModal

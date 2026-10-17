import React, { useState, useMemo } from 'react'
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  FileText,
  Building2,
  Calendar,
  Wallet,
  Check,
  X,
  RotateCw,
  Copy,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  useExpenses,
  useExpenseCategories,
  useExpenseFlats,
  useReviewExpenseMutation,
  type ExtendedExpense,
  type ExpenseFilters,
} from './api/useExpenses'
import AddExpenseModal from './components/AddExpenseModal'
import VoucherPreviewModal from './components/VoucherPreviewModal'
import ExpenseRejectModal from './components/ExpenseRejectModal'

export const ExpenseListPage: React.FC = () => {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [flatFilter, setFlatFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH'>('THIS_MONTH')

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [previewExpense, setPreviewExpense] = useState<ExtendedExpense | null>(null)
  const [rejectExpense, setRejectExpense] = useState<ExtendedExpense | null>(null)
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null)

  // API Queries
  const filters: ExpenseFilters = useMemo(
    () => ({
      searchQuery,
      status: statusFilter,
      categoryId: categoryFilter,
      flatId: flatFilter,
      dateRange: dateFilter,
    }),
    [searchQuery, statusFilter, categoryFilter, flatFilter, dateFilter]
  )

  const { data: expenses = [], isLoading, refetch, isRefetching } = useExpenses(filters)
  const { data: categories = [] } = useExpenseCategories()
  const { data: flats = [] } = useExpenseFlats()
  const reviewMutation = useReviewExpenseMutation()

  // Calculate Metrics from raw data
  const metrics = useMemo(() => {
    let totalApproved = 0
    let totalPending = 0
    let pendingCount = 0
    let totalFlatWise = 0
    let totalGeneral = 0

    expenses.forEach((e) => {
      if (e.approval_status === 'APPROVED') {
        totalApproved += e.amount
      } else if (e.approval_status === 'PENDING') {
        totalPending += e.amount
        pendingCount += 1
      }

      if (e.flat_id) {
        totalFlatWise += e.amount
      } else {
        totalGeneral += e.amount
      }
    })

    return {
      totalApproved,
      totalPending,
      pendingCount,
      totalFlatWise,
      totalGeneral,
      totalCount: expenses.length,
    }
  }, [expenses])

  // Copy to clipboard
  const handleCopyVoucher = (voucherNo: string) => {
    navigator.clipboard.writeText(voucherNo)
    setCopiedVoucher(voucherNo)
    setTimeout(() => setCopiedVoucher(null), 2000)
  }

  // Quick Approval Handler
  const handleQuickApprove = async (expense: ExtendedExpense) => {
    try {
      await reviewMutation.mutateAsync({
        expenseId: expense.id,
        status: 'APPROVED',
      })
    } catch (err: any) {
      alert(err.message || 'অনুমোদন করতে ব্যর্থ হয়েছে।')
    }
  }

  // Confirm Rejection Handler from Modal
  const handleConfirmReject = async (expenseId: string, reason: string) => {
    await reviewMutation.mutateAsync({
      expenseId,
      status: 'REJECTED',
      rejectionReason: reason,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                হোস্টেল ব্যয় ও ভাউচার ব্যবস্থাপনা
              </h1>
              <p className="text-xs text-slate-400">
                দৈনন্দিন খরচ এন্ট্রি, ক্যাশ মেমো আপলোড, ফ্ল্যাট-ভিত্তিক ট্র্যাকিং ও অনুমোদন ওয়ার্কফ্লো
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>নতুন খরচ এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Approved Outflow */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            অনুমোদিত খরচ (পরিশোধিত)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.totalApproved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            সুপার এডমিন কর্তৃক ভেরিফাইড
          </p>
        </div>

        {/* Card 2: Pending Outflow */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            অপেক্ষমান ভাউচার ({metrics.pendingCount}টি)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
            ৳{metrics.totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ওনার অনুমোদনের জন্য অপেক্ষমান
          </p>
        </div>

        {/* Card 3: Flat-wise Expense */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            ফ্ল্যাট-ভিত্তিক খরচ
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.totalFlatWise.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            নির্দিষ্ট ফ্ল্যাটে ট্যাগকৃত মেরামত ও বিল
          </p>
        </div>

        {/* Card 4: General Hostel Outflow */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            সার্বিক মেস খরচ
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.totalGeneral.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ইন্টারনেট, সাপ্লাই ও সাধারণ ইউটিলিটি
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-3xl border border-slate-800/80 space-y-3.5">
        {/* Status Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'সব ভাউচার' },
            { id: 'PENDING', label: 'অপেক্ষমান (Pending)' },
            { id: 'APPROVED', label: 'অনুমোদিত (Approved)' },
            { id: 'REJECTED', label: 'প্রত্যাখ্যাত (Rejected)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Row 2: Search, Category, Flat, Date Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভাউচার নম্বর, বিবরণ বা পেয়ার দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">সকল খাতের খরচ (All Categories)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Flat Scope Filter */}
          <div className="lg:col-span-3">
            <select
              value={flatFilter}
              onChange={(e) => setFlatFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">সকল স্থান (All Scope)</option>
              <option value="GENERAL">সার্বিক হোস্টেল (সাধারণ)</option>
              {flats.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.flat_code})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="THIS_MONTH">চলতি মাস</option>
              <option value="TODAY">আজকের খরচ</option>
              <option value="ALL">সর্বকালের সব</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Expense Table / Card View */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">ব্যয়ের তালিকা লোড হচ্ছে...</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800/80 text-center space-y-3">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-white">কোনো খরচের ভাউচার পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো খরচের ভাউচার নেই। নতুন খরচ এন্ট্রি করতে ওপরের বাটনে ক্লিক করুন।
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('ALL')
              setCategoryFilter('ALL')
              setFlatFilter('ALL')
              setDateFilter('ALL')
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            সব ফিল্টার ক্লিয়ার করুন
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">ভাউচার নং ও তারিখ</th>
                  <th className="px-4 py-3.5">খাত ও স্থান</th>
                  <th className="px-4 py-3.5">বিবরণ</th>
                  <th className="px-4 py-3.5">উৎস ও পরিশোধকারী</th>
                  <th className="px-4 py-3.5 text-right">পরিমাণ (BDT)</th>
                  <th className="px-4 py-3.5 text-center">মেমো / সংযুক্তি</th>
                  <th className="px-4 py-3.5 text-center">অনুমোদন স্ট্যাটাস</th>
                  <th className="px-5 py-3.5 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {expenses.map((expense) => {
                  const isPending = expense.approval_status === 'PENDING'
                  const isApproved = expense.approval_status === 'APPROVED'
                  const isRejected = expense.approval_status === 'REJECTED'

                  return (
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Voucher No & Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                          <span>{expense.expense_voucher_no}</span>
                          <button
                            onClick={() => handleCopyVoucher(expense.expense_voucher_no)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                            title="ভাউচার নং কপি করুন"
                          >
                            {copiedVoucher === expense.expense_voucher_no ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{expense.expense_date}</span>
                        </div>
                      </td>

                      {/* Category & Scope */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                          {expense.category_name}
                        </span>
                        <div className="mt-1">
                          {expense.flat_name ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                              <Building2 className="w-2.5 h-2.5" />
                              {expense.flat_name}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">সার্বিক হোস্টেল</span>
                          )}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed" title={expense.description}>
                          {expense.description}
                        </p>
                      </td>

                      {/* Account & Payer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-slate-300 font-semibold text-xs">
                          {expense.source_account_name}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>পরিশোধক: {expense.payer_name}</span>
                        </p>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className="font-mono font-bold text-sm text-emerald-400">
                          ৳{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Attachment Preview Button */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        {expense.voucher_attachment_url ? (
                          <button
                            onClick={() => setPreviewExpense(expense)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/80 transition-all text-[11px]"
                            title="মেমো প্রিভিউ দেখুন"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span>মেমো</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">মেমো নেই</span>
                        )}
                      </td>

                      {/* Approval Status Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            অনুমোদিত
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            অপেক্ষমান
                          </span>
                        )}
                        {isRejected && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 cursor-help"
                            title={expense.rejection_reason || 'প্রত্যাখ্যাত'}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            বাতিল
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Admin Review Action Buttons for Pending */}
                          {isAdmin && isPending && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(expense)}
                                disabled={reviewMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                                title="অনুমোদন করুন (Approve)"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </button>
                              <button
                                onClick={() => setRejectExpense(expense)}
                                disabled={reviewMutation.isPending}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                                title="বাতিল করুন (Reject with Reason)"
                              >
                                <X className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </>
                          )}

                          {/* View details */}
                          <button
                            onClick={() => setPreviewExpense(expense)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Voucher Lightbox Preview Modal */}
      <VoucherPreviewModal
        expense={previewExpense}
        isOpen={!!previewExpense}
        onClose={() => setPreviewExpense(null)}
      />

      {/* Expense Reject with Reason Modal */}
      <ExpenseRejectModal
        expense={rejectExpense}
        isOpen={!!rejectExpense}
        onClose={() => setRejectExpense(null)}
        onConfirmReject={handleConfirmReject}
        isLoading={reviewMutation.isPending}
      />
    </div>
  )
}
export default ExpenseListPage

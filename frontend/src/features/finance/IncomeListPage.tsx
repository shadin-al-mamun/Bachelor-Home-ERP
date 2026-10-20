import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  Plus,
  Search,
  RotateCw,
  Copy,
  Check,
  Calendar,
  Building2,
  Wallet,
  Users,
  Sparkles,
  TrendingUp,
  FolderPlus,
} from 'lucide-react'
import {
  useIncomes,
  useIncomeCategories,
  type IncomeFilters,
} from './api/useFinance'
import { useExpenseAccounts, useExpenseFlats } from '@/features/expenses/api/useExpenses'
import AddIncomeModal from './components/AddIncomeModal'
import { ManageCategoriesModal } from './components/ManageCategoriesModal'

export const IncomeListPage: React.FC = () => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [accountFilter, setAccountFilter] = useState<string>('ALL')
  const [flatFilter, setFlatFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH'>('THIS_MONTH')

  // Modals & Copy
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null)

  const filters: IncomeFilters = useMemo(
    () => ({
      searchQuery,
      categoryId: categoryFilter,
      accountId: accountFilter,
      flatId: flatFilter,
      dateRange: dateFilter,
    }),
    [searchQuery, categoryFilter, accountFilter, flatFilter, dateFilter]
  )

  const { data: incomes = [], isLoading, refetch, isRefetching } = useIncomes(filters)
  const { data: categories = [] } = useIncomeCategories()
  const { data: accounts = [] } = useExpenseAccounts()
  const { data: flats = [] } = useExpenseFlats()

  // Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0
    let guestRevenue = 0
    let scrapRevenue = 0
    let thisMonthRevenue = 0

    const currentMonthPrefix = new Date().toISOString().slice(0, 7)

    incomes.forEach((i) => {
      totalRevenue += i.amount
      if (i.category_name.toLowerCase().includes('guest')) {
        guestRevenue += i.amount
      } else if (i.category_name.toLowerCase().includes('scrap')) {
        scrapRevenue += i.amount
      }

      if (i.income_date.startsWith(currentMonthPrefix)) {
        thisMonthRevenue += i.amount
      }
    })

    return {
      totalRevenue,
      guestRevenue,
      scrapRevenue,
      thisMonthRevenue,
      count: incomes.length,
    }
  }, [incomes])

  const handleCopyVoucher = (voucherNo: string) => {
    navigator.clipboard.writeText(voucherNo)
    setCopiedVoucher(voucherNo)
    setTimeout(() => setCopiedVoucher(null), 2000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                নন-রেন্ট আয় ব্যবস্থাপনা (Non-Rent Incomes)
              </h1>
              <p className="text-xs text-slate-400">
                ভাড়া ব্যতীত মেহমান ফি, স্ক্র্যাপ বিক্রয় ও বিবিধ রাজস্ব ট্র্যাকিং
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
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 hover:bg-slate-800 text-emerald-300 font-semibold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            title="আয়ের খাত ব্যবস্থাপনা ও নতুন ক্যাটাগরি তৈরি"
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">খাত / ক্যাটাগরি তৈরি</span>
            <span className="sm:hidden">খাত তৈরি</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>নতুন আয় এন্ট্রি</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Non-Rent Revenue */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            মোট নন-রেন্ট রাজস্ব ({metrics.count}টি)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ভাড়া ছাড়া সংগৃহীত মোট ক্যাশ ও ব্যাংক রাজস্ব
          </p>
        </div>

        {/* Card 2: Guest Stay Revenue */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            গেস্ট স্টে ফি (অতিথি চার্জ)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.guestRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            মেহমান ও ভিজিটরদের দৈনিক রাত্রিযাপন ফি
          </p>
        </div>

        {/* Card 3: Scrap Sales */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            স্ক্র্যাপ ও ভাঙারি বিক্রয়
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.scrapRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            কার্টন, কাগজ ও অপ্রয়োজনীয় আইটেম বিক্রয়
          </p>
        </div>

        {/* Card 4: This Month */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            চলতি মাসের রাজস্ব
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.thisMonthRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            অক্টোবর ২০২৬ সময়ের জমা
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-3xl border border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-3 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ভাউচার নং, বিবরণ বা খাত..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="ALL">সকল রাজস্ব খাত (All Categories)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div className="lg:col-span-2">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="ALL">সকল একাউন্ট</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Flat Scope Filter */}
          <div className="lg:col-span-2">
            <select
              value={flatFilter}
              onChange={(e) => setFlatFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="ALL">সকল স্থান</option>
              <option value="GENERAL">সার্বিক হোস্টেল</option>
              {flats.map((f: any) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="THIS_MONTH">চলতি মাস</option>
              <option value="TODAY">আজকের আয়</option>
              <option value="ALL">সর্বকালের সব</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Income Table */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">আয়ের তালিকা লোড হচ্ছে...</p>
        </div>
      ) : incomes.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800/80 text-center space-y-3">
          <DollarSign className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-white">কোনো নন-রেন্ট আয় পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো আয়ের রেকর্ড নেই। নতুন আয় এন্ট্রি করতে ওপরের বাটনে ক্লিক করুন।
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('ALL')
              setAccountFilter('ALL')
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
                  <th className="px-4 py-3.5">আয়ের খাত</th>
                  <th className="px-4 py-3.5">বিবরণ / উৎস</th>
                  <th className="px-4 py-3.5">জমার একাউন্ট</th>
                  <th className="px-4 py-3.5">স্থান / ফ্ল্যাট</th>
                  <th className="px-4 py-3.5 text-right">আদায়ের পরিমাণ (BDT)</th>
                  <th className="px-5 py-3.5 text-right">আদায়কারী</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {incomes.map((income) => (
                  <tr
                    key={income.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Voucher No & Date */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <span>{income.income_voucher_no}</span>
                        <button
                          onClick={() => handleCopyVoucher(income.income_voucher_no)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                          title="ভাউচার নং কপি করুন"
                        >
                          {copiedVoucher === income.income_voucher_no ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{income.income_date}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                        {income.category_name}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3.5 max-w-sm">
                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed" title={income.description}>
                        {income.description}
                      </p>
                    </td>

                    {/* Destination Account */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200 font-semibold">
                          {income.destination_account_name}
                        </span>
                      </div>
                    </td>

                    {/* Flat / Scope */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {income.flat_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
                          <Building2 className="w-2.5 h-2.5" />
                          {income.flat_name}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">সার্বিক হোস্টেল</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        +৳{income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Receiver */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-slate-400 text-xs">
                      {income.receiver_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      <AddIncomeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Category Management Modal */}
      <ManageCategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        initialType="INCOME"
      />
    </div>
  )
}
export default IncomeListPage

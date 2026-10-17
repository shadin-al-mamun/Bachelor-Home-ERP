import React, { useState, useMemo } from 'react'
import {
  ArrowRightLeft,
  Plus,
  Search,
  RotateCw,
  Copy,
  Check,
  Calendar,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Building2,
  Smartphone,
  Banknote,
} from 'lucide-react'
import {
  useAccountTransfers,
  type TransferFilters,
} from './api/useFinance'
import { useExpenseAccounts } from '@/features/expenses/api/useExpenses'
import AddTransferModal from './components/AddTransferModal'

export const AccountTransfersPage: React.FC = () => {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [fromAccountFilter, setFromAccountFilter] = useState<string>('ALL')
  const [toAccountFilter, setToAccountFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_MONTH'>('THIS_MONTH')

  // Modals & Copy
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filters: TransferFilters = useMemo(
    () => ({
      searchQuery,
      fromAccountId: fromAccountFilter,
      toAccountId: toAccountFilter,
      dateRange: dateFilter,
    }),
    [searchQuery, fromAccountFilter, toAccountFilter, dateFilter]
  )

  const { data: transfers = [], isLoading, refetch, isRefetching } = useAccountTransfers(filters)
  const { data: accounts = [] } = useExpenseAccounts()

  // Calculate Metrics
  const metrics = useMemo(() => {
    let totalVolume = 0
    let bankInflows = 0
    let cashReplenishments = 0

    transfers.forEach((t) => {
      totalVolume += t.amount
      if (t.to_account_name.toLowerCase().includes('bank')) {
        bankInflows += t.amount
      }
      if (t.to_account_name.toLowerCase().includes('cash')) {
        cashReplenishments += t.amount
      }
    })

    const totalLiquidBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0)

    return {
      totalVolume,
      bankInflows,
      cashReplenishments,
      totalLiquidBalance,
      count: transfers.length,
    }
  }, [transfers, accounts])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'BANK':
        return <Building2 className="w-4 h-4 text-cyan-400" />
      case 'MFS':
        return <Smartphone className="w-4 h-4 text-pink-400" />
      case 'CASH_MANAGER':
      case 'CASH_OWNER':
      default:
        return <Banknote className="w-4 h-4 text-emerald-400" />
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                অভ্যন্তরীণ একাউন্ট স্থানান্তর (Account Transfers)
              </h1>
              <p className="text-xs text-slate-400">
                ক্যাশ ড্রয়ার, ব্যাংক ও বিকাশ একাউন্টের মধ্যে নিরাপদ অর্থ স্থানান্তর ও ট্র্যাকিং
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
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>নতুন একাউন্ট ট্রান্সফার</span>
          </button>
        </div>
      </div>

      {/* Live Financial Accounts Balance Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            সক্রিয় আর্থিক একাউন্টগুলোর লাইভ ব্যালেন্স
          </span>
          <span className="text-xs text-slate-400 font-mono">
            সর্বমোট তারল্য: <span className="text-emerald-400 font-bold">৳{metrics.totalLiquidBalance.toLocaleString('en-IN')}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60">
                    {getAccountIcon(acc.account_type)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white truncate max-w-[170px]">
                      {acc.account_name}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      {acc.account_number || acc.bank_name || 'ক্যাশ ড্রয়ার'}
                    </p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300">
                  {acc.account_type === 'CASH_MANAGER' ? 'ক্যাশ' : acc.account_type === 'BANK' ? 'ব্যাংক' : 'MFS'}
                </span>
              </div>
              <div className="pt-1 flex items-baseline justify-between border-t border-slate-800/60">
                <span className="text-[11px] text-slate-400">বর্তমান ব্যালেন্স:</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  ৳{acc.current_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Volume */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            মোট স্থানান্তর ({metrics.count}টি)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            অভ্যন্তরীণ ফান্ড ট্রান্সফার ভলিউম
          </p>
        </div>

        {/* Card 2: Bank Inflows */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            ব্যাংকে স্থানান্তর জমা
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.bankInflows.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ক্যাশ ও বিকাশ থেকে ব্যাংক একাউন্টে জমা
          </p>
        </div>

        {/* Card 3: Cash Replenishments */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5" />
            ক্যাশ ড্রয়ার লোড / উত্তোলন
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
            ৳{metrics.cashReplenishments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            পেটি ক্যাশের জন্য ব্যাংক থেকে উত্তোলন
          </p>
        </div>

        {/* Card 4: Accounting Guard */}
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            দ্বৈত গণনা সুরক্ষা
          </span>
          <div className="text-xl sm:text-2xl font-bold text-white mt-1">
            ১০০% সুরক্ষিত
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            আয় ও ব্যয়ে ডাবল কাউন্টিং বাদ দেওয়া হয়েছে
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-3xl border border-slate-800/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ট্রান্সফার নং, রেফারেন্স বা মন্তব্য দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
          </div>

          {/* From Account Filter */}
          <div className="lg:col-span-3">
            <select
              value={fromAccountFilter}
              onChange={(e) => setFromAccountFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="ALL">সকল উৎস একাউন্ট (From All)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* To Account Filter */}
          <div className="lg:col-span-3">
            <select
              value={toAccountFilter}
              onChange={(e) => setToAccountFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="ALL">সকল গন্তব্য একাউন্ট (To All)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="THIS_MONTH">চলতি মাস</option>
              <option value="ALL">সর্বকালের সব</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Transfers Table */}
      {isLoading ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">স্থানান্তরের তালিকা লোড হচ্ছে...</p>
        </div>
      ) : transfers.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800/80 text-center space-y-3">
          <ArrowRightLeft className="w-12 h-12 text-slate-600 mx-auto stroke-1" />
          <h3 className="text-base font-bold text-white">কোনো ফান্ড স্থানান্তর পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            নির্বাচিত ফিল্টারের সাথে মিলে এমন কোনো স্থানান্তরের রেকর্ড নেই। নতুন ট্রান্সফার করতে ওপরের বাটনে ক্লিক করুন।
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setFromAccountFilter('ALL')
              setToAccountFilter('ALL')
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
                  <th className="px-5 py-3.5">ট্রান্সফার নং ও তারিখ</th>
                  <th className="px-4 py-3.5">স্থানান্তর রুট (উৎস ➔ গন্তব্য)</th>
                  <th className="px-4 py-3.5 text-right">স্থানান্তরিত পরিমাণ</th>
                  <th className="px-4 py-3.5">রেফারেন্স / ট্রানজেকশন</th>
                  <th className="px-4 py-3.5">উদ্দেশ্য / মন্তব্য</th>
                  <th className="px-5 py-3.5 text-right">রেকর্ড করেছেন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {transfers.map((transfer) => (
                  <tr
                    key={transfer.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Transfer No & Date */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                        <span>{transfer.transfer_number}</span>
                        <button
                          onClick={() => handleCopy(transfer.transfer_number)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                          title="ট্রান্সফার নং কপি করুন"
                        >
                          {copiedId === transfer.transfer_number ? (
                            <Check className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{new Date(transfer.transfer_date).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/40 text-[11px]">
                          {transfer.from_account_name}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[11px]">
                          {transfer.to_account_name}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <span className="font-mono font-bold text-sm text-cyan-400">
                        ৳{transfer.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Reference */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {transfer.reference ? (
                        <span className="font-mono text-slate-300 text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                          {transfer.reference}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Remarks */}
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed" title={transfer.remarks || ''}>
                        {transfer.remarks || 'কোনো মন্তব্য নেই'}
                      </p>
                    </td>

                    {/* Creator */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-slate-400 text-xs">
                      {transfer.creator_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Transfer Modal */}
      <AddTransferModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  )
}
export default AccountTransfersPage

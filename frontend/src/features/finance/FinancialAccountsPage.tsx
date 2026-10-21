import React, { useState, useMemo } from 'react'
import {
  Wallet,
  Building2,
  ShieldCheck,
  Plus,
  ArrowRightLeft,
  RotateCw,
  Search,
  CreditCard,
  Edit3,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useFinancialAccounts } from '@/features/billing/api/useReceipts'
import {
  useUpdateFinancialAccountMutation,
  useIncomes,
  useAccountTransfers,
} from './api/useFinance'
import { useExpenses } from '@/features/expenses/api/useExpenses'
import { useReceipts } from '@/features/billing/api/useReceipts'
import { CreateFinancialAccountModal } from './components/CreateFinancialAccountModal'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import type { FinancialAccount } from '@/types/database'
import { Link } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'

interface LedgerEntry {
  id: string
  date: string
  accountId: string
  accountName: string
  type: 'OPENING' | 'RECEIPT' | 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  typeLabel: string
  referenceNo: string
  description: string
  credit: number // Inflow
  debit: number  // Outflow
  runningBalance: number
}

export const FinancialAccountsPage: React.FC = () => {
  const { data: accounts = [], refetch: refetchAccounts } = useFinancialAccounts()
  const { data: receipts = [] } = useReceipts({ status: 'VALID' })
  const { data: expenses = [] } = useExpenses({ status: 'APPROVED' })
  const { data: incomes = [] } = useIncomes()
  const { data: transfers = [] } = useAccountTransfers()

  const updateAccountMutation = useUpdateFinancialAccountMutation()

  // Selected Account for Ledger Filter
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('THIS_MONTH')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null)
  const [openingBalanceAccount, setOpeningBalanceAccount] = useState<FinancialAccount | null>(null)
  const [newOpeningBalance, setNewOpeningBalance] = useState<string>('')
  const [openingDate, setOpeningDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [openingSource, setOpeningSource] = useState<string>('')
  const [modalError, setModalError] = useState<string | null>(null)

  // Total Balance across all accounts (incorporates live or newly initialized opening balance)
  const totalHostelFunds = useMemo(() => {
    return accounts.reduce((sum, a) => {
      const cur = Number(a.current_balance) || 0
      const open = Number(a.opening_balance) || 0
      const effective = cur > 0 ? cur : open
      return sum + effective
    }, 0)
  }, [accounts])

  // Open Opening Balance Modal
  const handleOpenOpeningBalance = (acc: FinancialAccount) => {
    setOpeningBalanceAccount(acc)
    setNewOpeningBalance(String(acc.opening_balance || acc.current_balance || 0))
    setOpeningDate(acc.opening_balance_date || new Date().toISOString().slice(0, 10))
    setOpeningSource(acc.opening_balance_source || '')
    setModalError(null)
  }

  // Save Opening Balance
  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!openingBalanceAccount) return
    setModalError(null)

    const parsed = parseFloat(newOpeningBalance) || 0
    if (parsed < 0) {
      setModalError('প্রারম্ভিক ব্যালেন্স ঋণাত্মক হতে পারবে না।')
      return
    }

    const oldOpening = Number(openingBalanceAccount.opening_balance) || 0
    const oldCurrent = Number(openingBalanceAccount.current_balance) || 0
    const diff = parsed - oldOpening
    const newCurrent = oldCurrent === 0 && oldOpening === 0 ? parsed : Math.max(0, oldCurrent + diff)

    try {
      await updateAccountMutation.mutateAsync({
        id: openingBalanceAccount.id,
        opening_balance: parsed,
        current_balance: newCurrent,
        opening_balance_date: openingDate,
        opening_balance_source: openingSource.trim() || undefined,
      })
      setOpeningBalanceAccount(null)
    } catch (err: any) {
      setModalError(err.message || 'ব্যালেন্স আপডেট করতে ব্যর্থ হয়েছে।')
    }
  }

  // Build Comprehensive Running Ledger Entries
  const rawLedgerEntries = useMemo(() => {
    const list: LedgerEntry[] = []

    // 0. Opening Balance entries
    accounts.forEach((acc) => {
      const openBal = Number(acc.opening_balance) || 0
      if (openBal <= 0) return
      list.push({
        id: `open-${acc.id}`,
        date: acc.opening_balance_date || '2026-10-01',
        accountId: acc.id,
        accountName: acc.account_name,
        type: 'OPENING',
        typeLabel: 'প্রারম্ভিক ব্যালেন্স (Opening)',
        referenceNo: acc.account_number || 'OPENING',
        description: `প্রারম্ভিক ব্যালেন্স নির্ধারণ ${acc.opening_balance_source ? `(${acc.opening_balance_source})` : ''}`,
        credit: openBal,
        debit: 0,
        runningBalance: 0,
      })
    })

    // 1. Receipts (Bill Collection Credit)
    receipts.forEach((r) => {
      if (r.is_void) return
      list.push({
        id: `rc-${r.id}`,
        date: r.receipt_date,
        accountId: r.destination_account_id,
        accountName: r.account_name || 'ক্যাশ হিসাব',
        type: 'RECEIPT',
        typeLabel: 'বিল আদায় (রিসিপ্ট)',
        referenceNo: r.receipt_number,
        description: `বর্ডার ${r.boarder_name} থেকে সংগ্রহ (${r.payment_method})`,
        credit: Number(r.amount) || 0,
        debit: 0,
        runningBalance: 0,
      })
    })

    // 2. Non-rent Incomes (Manager Sales)
    incomes.forEach((inc) => {
      list.push({
        id: `inc-${inc.id}`,
        date: inc.income_date,
        accountId: inc.destination_account_id,
        accountName: inc.destination_account_name || 'ক্যাশ হিসাব',
        type: 'INCOME',
        typeLabel: 'বিক্রয়/অন্যান্য আয়',
        referenceNo: inc.income_voucher_no,
        description: `${inc.category_name}: ${inc.description}`,
        credit: Number(inc.amount) || 0,
        debit: 0,
        runningBalance: 0,
      })
    })

    // 3. Approved Expenses (Debit)
    expenses.forEach((exp) => {
      if (exp.approval_status === 'REJECTED') return
      list.push({
        id: `exp-${exp.id}`,
        date: exp.expense_date,
        accountId: exp.source_account_id,
        accountName: exp.source_account_name || 'খরচ হিসাব',
        type: 'EXPENSE',
        typeLabel: 'হোস্টেল খরচ (ব্যয়)',
        referenceNo: exp.expense_voucher_no,
        description: `${exp.category_name}: ${exp.description}`,
        credit: 0,
        debit: Number(exp.amount) || 0,
        runningBalance: 0,
      })
    })

    // 4. Internal Transfers
    transfers.forEach((trf) => {
      // Outflow for from_account
      list.push({
        id: `trf-out-${trf.id}`,
        date: trf.transfer_date,
        accountId: trf.from_account_id,
        accountName: trf.from_account_name,
        type: 'TRANSFER_OUT',
        typeLabel: 'স্থানান্তর প্রদান (Debit)',
        referenceNo: trf.transfer_number,
        description: `${trf.to_account_name} এ ট্রান্সফার ${trf.remarks ? `(${trf.remarks})` : ''}`,
        credit: 0,
        debit: Number(trf.amount) || 0,
        runningBalance: 0,
      })

      // Inflow for to_account
      list.push({
        id: `trf-in-${trf.id}`,
        date: trf.transfer_date,
        accountId: trf.to_account_id,
        accountName: trf.to_account_name,
        type: 'TRANSFER_IN',
        typeLabel: 'স্থানান্তর গ্রহণ (Credit)',
        referenceNo: trf.transfer_number,
        description: `${trf.from_account_name} থেকে প্রাপ্তি ${trf.remarks ? `(${trf.remarks})` : ''}`,
        credit: Number(trf.amount) || 0,
        debit: 0,
        runningBalance: 0,
      })
    })

    // Sort Chronologically (oldest to newest) to compute running balances correctly
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Compute running balances
    let running = 0
    const calculated = list.map((entry) => {
      running += entry.credit - entry.debit
      return {
        ...entry,
        runningBalance: running,
      }
    })

    return calculated.reverse()
  }, [accounts, receipts, incomes, expenses, transfers])

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    let result = rawLedgerEntries

    if (selectedAccountId !== 'ALL') {
      result = result.filter((item) => item.accountId === selectedAccountId)
    }

    if (dateFilter === 'THIS_MONTH') {
      const monthPrefix = new Date().toISOString().slice(0, 7)
      result = result.filter((item) => item.date.startsWith(monthPrefix))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.referenceNo.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.accountName.toLowerCase().includes(q)
      )
    }

    return result
  }, [rawLedgerEntries, selectedAccountId, dateFilter, searchQuery])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              আর্থিক অ্যাকাউন্ট ও খতিয়ান (Accounts & Ledger)
            </h1>
            <p className="text-xs text-slate-400">
              মেইন অ্যাকাউন্ট, ম্যানেজার ক্যাশ ও অ্যাডমিন অ্যাকাউন্টের প্রারম্ভিক ব্যালেন্স, লাইভ স্থিতি ও রানিং লেজার
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetchAccounts()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <Link
            to="/finance/transfers"
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/30 hover:bg-slate-800 text-indigo-300 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            <span>টাকা ট্রান্সফার</span>
          </Link>

          <button
            onClick={() => {
              setEditingAccount(null)
              setIsCreateAccountOpen(true)
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>নতুন অ্যাকাউন্ট তৈরি</span>
          </button>
        </div>
      </div>

      {/* Total Hostel Funds Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              মোট সমন্বিত হোস্টেল তহবিল (Total Active Funds)
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-0.5">
              {formatCurrencyBn(totalHostelFunds)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>সকল অ্যাকাউন্টের লাইভ ব্যালেন্স সমন্বিত রয়েছে</span>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc, index) => {
          const isSelected = selectedAccountId === acc.id
          
          let badgeLabel = `${index + 1}. অ্যাকাউন্ট`
          let IconComponent = Wallet
          
          if (acc.id === '11111111-0000-0000-0000-000000000001' || acc.account_name.toLowerCase().includes('main')) {
            badgeLabel = '১. মেইন অ্যাকাউন্ট (Hostel Main)'
            IconComponent = Building2
          } else if (acc.id === '11111111-0000-0000-0000-000000000002' || acc.account_name.toLowerCase().includes('manager')) {
            badgeLabel = '২. ম্যানেজার অ্যাকাউন্ট (Cash Box)'
            IconComponent = Wallet
          } else if (acc.id === '11111111-0000-0000-0000-000000000003' || acc.account_name.toLowerCase().includes('admin') || acc.account_name.toLowerCase().includes('owner')) {
            badgeLabel = '৩. ওনার/অ্যাডমিন অ্যাকাউন্ট (Admin)'
            IconComponent = ShieldCheck
          }

          return (
            <div
              key={acc.id}
              className={`p-5 rounded-3xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-500 bg-slate-900 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/30'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Account Category Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {badgeLabel}
                  </span>
                  <button
                    onClick={() => handleOpenOpeningBalance(acc)}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    title="প্রারম্ভিক ব্যালেন্স সেট বা আপডেট করুন"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>প্রারম্ভিক সেট</span>
                  </button>
                </div>

                {/* Account Name & Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-200 shrink-0">
                    <IconComponent className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">
                      {acc.account_name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {acc.bank_name || 'ক্যাশ হিসাব'} {acc.account_number ? `• ${acc.account_number}` : ''}
                    </p>
                  </div>
                </div>

                {/* Balance Metrics */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">প্রারম্ভিক ব্যালেন্স:</span>
                    <span className="font-mono font-bold text-slate-300 text-xs">
                      {formatCurrencyBn(acc.opening_balance || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">বর্তমান লাইভ স্থিতি:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {formatCurrencyBn(Number(acc.current_balance) > 0 ? acc.current_balance : (acc.opening_balance || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button to Filter Ledger */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedAccountId(isSelected ? 'ALL' : acc.id)}
                  className={`text-xs font-bold py-1.5 px-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? '✓ খতিয়ান ফিল্টার সক্রিয়' : 'এই অ্যাকাউন্টের খতিয়ান দেখুন'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Running Ledger Section */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Ledger Header & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              অ্যাকাউন্ট রানিং বিবরণী (Running Ledger)
            </h2>
            <p className="text-xs text-slate-400">
              তারিখ অনুযায়ী প্রতিটি ক্রেডিট (আদায়/জমা) ও ডেবিট (ব্যয়) ট্রানজ্যাকশন এবং ক্রমপুঞ্জিত ব্যালেন্স
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ভাউচার বা বিবরণ খুঁজুন..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Account Selector */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">সকল অ্যাকাউন্ট একসাথে</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="THIS_MONTH">চলতি মাস</option>
              <option value="ALL">সর্বকালের খতিয়ান</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">তারিখ</th>
                <th className="py-3 px-3">ভাউচার / রেফারেন্স নং</th>
                <th className="py-3 px-3">অ্যাকাউন্ট</th>
                <th className="py-3 px-3">বিবরণ / খাত</th>
                <th className="py-3 px-3 text-right">ক্রেডিট / জমা (৳)</th>
                <th className="py-3 px-3 text-right">ডেবিট / খরচ (৳)</th>
                <th className="py-3 px-3 text-right">রানিং ব্যালেন্স (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    কোনো লেনদেন রেকর্ড পাওয়া যায়নি। নতুন আদায় বা খরচ এন্ট্রি করলে স্বয়ংক্রিয়ভাবে খতিয়ানে যুক্ত হবে।
                  </td>
                </tr>
              ) : (
                filteredLedger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {formatDateBn(row.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {row.referenceNo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-medium">
                      {row.accountName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-white font-medium block">
                        {row.description}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {row.typeLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {row.credit > 0 ? `+${formatCurrencyBn(row.credit)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                      {row.debit > 0 ? `-${formatCurrencyBn(row.debit)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-cyan-300">
                      {formatCurrencyBn(row.runningBalance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opening Balance Modal */}
      {openingBalanceAccount && (
        <Modal
          isOpen={!!openingBalanceAccount}
          onClose={() => setOpeningBalanceAccount(null)}
          title={`প্রারম্ভিক ব্যালেন্স সেট করুন — ${openingBalanceAccount.account_name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveOpeningBalance} className="space-y-4">
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                প্রারম্ভিক ব্যালেন্সের পরিমাণ (৳) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newOpeningBalance}
                onChange={(e) => setNewOpeningBalance(e.target.value)}
                placeholder="যেমন: ৫০০০০"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                প্রারম্ভিক ব্যালেন্স শুরুর তারিখ <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                উৎস বা নোট (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={openingSource}
                onChange={(e) => setOpeningSource(e.target.value)}
                placeholder="যেমন: পূর্ববর্তী মাসের উদ্বৃত্ত ক্যাশ ব্যালেন্স"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setOpeningBalanceAccount(null)}
              >
                বাতিল
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={updateAccountMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                ব্যালেন্স নিশ্চিত ও সেভ করুন
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create / Edit Account Modal */}
      <CreateFinancialAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        accountToEdit={editingAccount}
      />
    </div>
  )
}
export default FinancialAccountsPage

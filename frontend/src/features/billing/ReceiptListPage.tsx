import React, { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  useReceipts,
  type ExtendedReceipt,
  type ReceiptFilters,
} from './api/useReceipts'
import { CollectReceiptModal } from './components/CollectReceiptModal'
import { ReceiptPrintView } from './components/ReceiptPrintView'
import { VoidReceiptModal } from './components/VoidReceiptModal'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { useAuthStore } from '@/app/store/useAuthStore'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import type { PaymentMethod } from '@/types/database'
import {
  Receipt,
  Search,
  Printer,
  Trash2,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  CreditCard,
  Ban,
  Calendar,
} from 'lucide-react'


export const ReceiptListPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialBoarderId = searchParams.get('boarderId') || undefined

  const { profile } = useAuthStore()
  const canVoidReceipt =
    profile?.role === 'SUPER_ADMIN' ||
    profile?.role === 'ADMIN' ||
    profile?.role === 'ACCOUNTANT'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'VOID'>('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL')

  // Modals state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(Boolean(initialBoarderId))
  const [printReceipt, setPrintReceipt] = useState<ExtendedReceipt | null>(null)
  const [voidReceipt, setVoidReceipt] = useState<ExtendedReceipt | null>(null)

  const filters: ReceiptFilters = {
    search: search.trim() || undefined,
    status: statusFilter,
    paymentMethod: paymentMethodFilter,
    boarderId: initialBoarderId,
  }

  const { data: receipts = [], isLoading, refetch, isFetching } = useReceipts(filters)

  // Calculations
  const validReceipts = receipts.filter((r) => !r.is_void)
  const voidReceipts = receipts.filter((r) => r.is_void)
  const totalCollected = validReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const totalVoided = voidReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCollected = validReceipts
    .filter((r) => r.receipt_date.slice(0, 10) === todayStr)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0)

  const paymentMethodLabel: Record<string, string> = {
    CASH: 'নগদ ক্যাশ',
    BANK_TRANSFER: 'ব্যাংক',
    MFS: 'বিকাশ/নগদ',
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              মানি রিসিপ্ট ও কালেকশন
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Official Receipts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            বর্ডারদের নিকট থেকে সংগৃহীত ভাড়ার অর্থ, অফিসিয়াল মানি রিসিপ্ট প্রিন্ট ও বাতিলের অডিট ট্রেইল।
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCollectModalOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
            টাকা গ্রহণ / রিসিপ্ট কাটুন
          </Button>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Link
          to="/billing/dues"
          className="px-4 py-2 rounded-xl bg-slate-900/60 text-slate-400 hover:text-white font-medium text-xs border border-slate-800 hover:border-slate-700 flex items-center gap-2 transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          বকেয়া ও ডিউ লেজার
        </Link>
        <Link
          to="/billing/receipts"
          className="px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center gap-2"
        >
          <Receipt className="w-4 h-4" />
          মানি রিসিপ্ট ভাউচার
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">মোট সংগৃহীত টাকা</span>
            <span className="text-xl font-black text-emerald-400">{formatCurrencyBn(totalCollected)}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              বৈধ রিসিপ্ট: {validReceipts.length} টি
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Collection */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">আজকের কালেকশন</span>
            <span className="text-xl font-black text-white">{formatCurrencyBn(todayCollected)}</span>
            <span className="text-[11px] text-primary-400 block mt-0.5">
              তারিখ: {formatDateBn(todayStr)}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Total Receipts */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-1">সর্বমোট রিসিপ্ট</span>
            <span className="text-xl font-black text-white">{receipts.length} টি</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">অফিসিয়াল ট্রানজ্যাকশন</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Void Receipts */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-rose-400 block mb-1">বাতিলকৃত (Void)</span>
            <span className="text-xl font-black text-rose-400">{formatCurrencyBn(totalVoided)}</span>
            <span className="text-[11px] text-rose-500 block mt-0.5">
              বাতিল রিসিপ্ট: {voidReceipts.length} টি
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Ban className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="রিসিপ্ট নং, বর্ডারের নাম বা মোবাইল..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'
              }`}
            >
              সকল
            </button>
            <button
              onClick={() => setStatusFilter('VALID')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'VALID' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              বৈধ ({validReceipts.length})
            </button>
            <button
              onClick={() => setStatusFilter('VOID')}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === 'VOID' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              বাতিল ({voidReceipts.length})
            </button>
          </div>

          {/* Payment Method Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value as any)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">সকল মাধ্যম</option>
              <option value="CASH">ক্যাশ</option>
              <option value="MFS">বিকাশ/নগদ</option>
              <option value="BANK_TRANSFER">ব্যাংক</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">রিসিপ্ট নং ও তারিখ</th>
                <th className="py-3.5 px-4">বর্ডার পরিচিতি</th>
                <th className="py-3.5 px-4">পেমেন্ট মাধ্যম ও অ্যাকাউন্ট</th>
                <th className="py-3.5 px-4 text-right">গৃহীত টাকা (Amount)</th>
                <th className="py-3.5 px-4">আদায়কারী</th>
                <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                      <span>রিসিপ্ট লোড হচ্ছে...</span>
                    </div>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    কোনো মানি রিসিপ্ট পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                receipts.map((rc) => (
                  <tr
                    key={rc.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      rc.is_void ? 'opacity-60 bg-rose-500/5' : ''
                    }`}
                  >
                    {/* Receipt Number & Date */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-white block">
                        {rc.receipt_number}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateBn(rc.receipt_date)}
                      </span>
                    </td>

                    {/* Boarder */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{rc.boarder_name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {rc.boarder_code} {rc.boarder_phone ? `• ${rc.boarder_phone}` : ''}
                      </span>
                    </td>

                    {/* Method & Account */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200 block">
                        {paymentMethodLabel[rc.payment_method] || rc.payment_method}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {rc.account_name}
                        {rc.transaction_reference ? ` • ${rc.transaction_reference}` : ''}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`text-sm font-bold font-mono ${
                          rc.is_void ? 'line-through text-slate-500' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrencyBn(rc.amount)}
                      </span>
                    </td>

                    {/* Collector */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {rc.collector_name}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {rc.is_void ? (
                        <Badge status="VOID" variant="subtle" showDot>
                          বাতিল (Void)
                        </Badge>
                      ) : (
                        <Badge status="PAID" variant="subtle" showDot>
                          বৈধ (Valid)
                        </Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrintReceipt(rc)}
                          className="h-8 px-2.5 text-xs text-slate-300 hover:text-white"
                          title="ভাউচার প্রিন্ট করুন"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1 text-primary-400" />
                          প্রিন্ট
                        </Button>

                        {!rc.is_void && canVoidReceipt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoidReceipt(rc)}
                            className="h-8 px-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                            title="রিসিপ্ট বাতিল করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Receipt Modal */}
      <CollectReceiptModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false)
          refetch()
        }}
        preSelectedBoarderId={initialBoarderId}
      />

      {/* Printable Receipt View Modal */}
      <ReceiptPrintView
        isOpen={Boolean(printReceipt)}
        onClose={() => setPrintReceipt(null)}
        receipt={printReceipt}
      />

      {/* Void Receipt Reversal Modal */}
      <VoidReceiptModal
        isOpen={Boolean(voidReceipt)}
        onClose={() => {
          setVoidReceipt(null)
          refetch()
        }}
        receipt={voidReceipt}
      />
    </div>
  )
}
export default ReceiptListPage

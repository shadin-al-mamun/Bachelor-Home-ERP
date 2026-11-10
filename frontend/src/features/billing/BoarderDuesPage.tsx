import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useBoarderDuesSummary,
  type DuesFilters,
} from './api/useBilling'
import { useFlats } from '@/features/accommodation/api/useAccommodation'
import { useOwnerDashboard } from '@/features/dashboard/api/useOwnerDashboard'
import { CollectReceiptModal } from './components/CollectReceiptModal'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import {
  DollarSign,
  Search,
  Filter,
  AlertTriangle,
  Receipt,
  PlusCircle,
  Zap,
  TrendingUp,
  User,
  CreditCard,
  Building,
  Building2,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react'

export const BoarderDuesPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [selectedFlat, setSelectedFlat] = useState('ALL')
  const [overdueOnly, setOverdueOnly] = useState(false)

  // Dedicated Financial Month Filter (matches Dashboard)
  const currentDhakaMonthStr = () => {
    const dhakaNow = new Date()
    const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
    const dhaka = new Date(utc + 3600000 * 6)
    return `${dhaka.getFullYear()}-${String(dhaka.getMonth() + 1).padStart(2, '0')}`
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(currentDhakaMonthStr)
  const isAllMonths = selectedMonth === 'ALL'

  // Month options for dropdown (matches Dashboard)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = []
    const dhakaNow = new Date()
    const utc = dhakaNow.getTime() + dhakaNow.getTimezoneOffset() * 60000
    const dhaka = new Date(utc + 3600000 * 6)
    const currentYear = dhaka.getFullYear()
    const currentMonth = dhaka.getMonth()

    const monthNamesBn = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ]

    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const val = `${y}-${m}`
      const label = `${monthNamesBn[d.getMonth()]} ${y}${i === 0 ? ' (চলতি মাস)' : ''}`
      options.push({ value: val, label })
    }

    options.push({ value: 'ALL', label: 'সব মাস (সর্বমোট)' })
    return options
  }, [])

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === 'ALL') return 'সব মাস'
    const opt = monthOptions.find((o) => o.value === selectedMonth)
    return opt ? opt.label.replace(' (চলতি মাস)', '') : selectedMonth
  }, [selectedMonth, monthOptions])

  // Modals state
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false)
  const [collectBoarderId, setCollectBoarderId] = useState<string | undefined>(undefined)

  const filters: DuesFilters = {
    search: search.trim() || undefined,
    flatCode: selectedFlat !== 'ALL' ? selectedFlat : undefined,
    overdueOnly,
  }

  const { data: duesData = [], isLoading, refetch, isFetching } = useBoarderDuesSummary(filters)
  const { data: flats = [] } = useFlats()
  const { data: dashboard, isFetching: isFetchingDashboard, refetch: refetchDashboard } = useOwnerDashboard(selectedMonth)

  // High-level metrics calculation
  const totalLifetimeBilled = duesData.reduce((sum, d) => sum + (Number(d.total_billed) || 0), 0)
  const totalLifetimePaid = duesData.reduce((sum, d) => sum + (Number(d.total_paid) || 0), 0)
  const totalLifetimeOutstanding = duesData.reduce((sum, d) => sum + (Number(d.outstanding_due) || 0), 0)
  const totalOverdue = duesData.reduce((sum, d) => sum + (Number(d.overdue_amount) || 0), 0)
  const overdueCount = duesData.filter((d) => Number(d.overdue_amount) > 0).length

  // Monthly vs All-Time display metrics (mirroring Dashboard metrics)
  const displayBilled = isAllMonths
    ? totalLifetimeBilled
    : (dashboard?.kpis?.total_billed_month ?? totalLifetimeBilled)

  const displayPaid = isAllMonths
    ? totalLifetimePaid
    : (dashboard?.kpis?.total_collected_month ?? totalLifetimePaid)

  const collectionRate = isAllMonths
    ? (totalLifetimeBilled > 0 ? Math.min(100, Math.round((totalLifetimePaid / totalLifetimeBilled) * 100)) : 0)
    : (dashboard?.kpis?.collection_rate ?? (displayBilled > 0 ? Math.min(100, Math.round((displayPaid / displayBilled) * 100)) : 0))

  const displayDues = isAllMonths
    ? totalLifetimeOutstanding
    : (dashboard?.kpis?.month_dues ?? Math.max(0, displayBilled - displayPaid))

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              বকেয়া ও বিলিং লেজার
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 font-mono">
              Due Aging
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            বর্ডারদের মাসিক সিট ভাড়া, ইউটিলিটি চার্জ, পেমেন্ট ট্র্যাকিং এবং ওভারডিউ ব্যবস্থাপনা।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              refetch()
              refetchDashboard()
            }}
            disabled={isFetching || isFetchingDashboard}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching || isFetchingDashboard ? 'animate-spin' : ''}`} />
            রিফ্রেশ
          </Button>

          <Link
            to="/billing/generate?tab=other"
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/60 text-slate-300 hover:text-white text-xs font-medium flex items-center transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            অন্যান্য চার্জ যুক্ত করুন
          </Link>

          <Link
            to="/billing/generate?tab=rent"
            className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-lg shadow-primary-500/20 flex items-center transition-colors"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
            মাসিক ভাড়া জেনারেট
          </Link>

          <Link
            to="/billing/generate?tab=flat-utility"
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10 text-xs font-bold flex items-center transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            মাসিক ফ্ল্যাট ভিত্তিক বিবিধ বিল জেনারেট
          </Link>

          <Button
            variant="primary"
            size="sm"
            id="btn-collect-dues-page"
            onClick={() => {
              setCollectBoarderId(undefined)
              setIsCollectModalOpen(true)
            }}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 font-bold border-none"
          >
            <DollarSign className="w-4 h-4 mr-1 text-emerald-200" />
            ভাড়া আদায় / রিসিপ্ট কাটুন
          </Button>
        </div>
      </div>

      {/* Navigation Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <Link
          to="/billing/dues"
          className="px-4 py-2 rounded-xl bg-primary-500/15 text-primary-400 font-bold text-xs border border-primary-500/30 flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          বকেয়া ও ডিউ লেজার
        </Link>
        <Link
          to="/billing/receipts"
          className="px-4 py-2 rounded-xl bg-slate-900/60 text-slate-400 hover:text-white font-medium text-xs border border-slate-800 hover:border-slate-700 flex items-center gap-2 transition-colors"
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          মানি রিসিপ্ট ভাউচার
        </Link>
        <Link
          to="/billing/generate"
          className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 font-bold text-xs border border-amber-500/30 flex items-center gap-2 transition-colors"
        >
          <Zap className="w-4 h-4 text-amber-400" />
          মাসিক বিল জেনারেট হাব
        </Link>
      </div>

      {/* KPI Section Control Header with Financial Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            <span>মাসিক বিল ও আদায় পারফরম্যান্স</span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {isAllMonths ? 'সর্বমোট' : selectedMonthLabel}
            </span>
          </h2>
        </div>

        {/* Dedicated Financial Month Selector (Matches Dashboard) */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-md self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <label htmlFor="billing-month-filter" className="text-[11px] font-medium text-slate-300 shrink-0">
            হিসাব মাস:
          </label>
          <select
            id="billing-month-filter"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-auto bg-slate-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer hover:border-emerald-400 transition-colors"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900 text-white py-1">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards (Matches Dashboard Monthly Behavior) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Billed */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 block">
                {isAllMonths ? 'সর্বমোট ধার্যকৃত বিল' : 'ধার্যকৃত বিল'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {isAllMonths ? 'সর্বমোট' : selectedMonthLabel}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-white block">
              {formatCurrencyBn(displayBilled)}
            </span>
            <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 flex-wrap">
              <span>{isAllMonths ? 'সবসময়ের মোট চার্জ' : `${selectedMonthLabel} মাসের মোট বিল`}</span>
              {!isAllMonths && totalLifetimeBilled > displayBilled && (
                <span className="text-[10px] text-slate-500 font-mono">
                  মোট: {formatCurrencyBn(totalLifetimeBilled)}
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Collected */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 block">
                {isAllMonths ? 'মোট আদায়কৃত টাকা' : 'আদায়কৃত টাকা'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {collectionRate}% আদায়
              </span>
            </div>
            <span className="text-xl font-black font-mono text-emerald-400 block">
              {formatCurrencyBn(displayPaid)}
            </span>
            <div className="flex items-center justify-between gap-1 text-[11px] text-emerald-500/80 flex-wrap">
              <span>
                {isAllMonths
                  ? `আদায় হার: ${collectionRate}%`
                  : `${selectedMonthLabel}-এ সংগৃহীত`}
              </span>
              {!isAllMonths && totalLifetimePaid > displayPaid && (
                <span className="text-[10px] text-slate-500 font-mono">
                  মোট: {formatCurrencyBn(totalLifetimePaid)}
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Outstanding Due */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400 block">
                {isAllMonths ? 'মোট বকেয়া (Dues)' : 'বকেয়া পাওনা'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                displayDues > 0
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {displayDues > 0 ? 'বকেয়া' : 'পরিশোধিত'}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-rose-400 block">
              {formatCurrencyBn(displayDues)}
            </span>
            <div className="flex items-center justify-between gap-1 text-[11px] text-rose-500/80 flex-wrap">
              <span>{isAllMonths ? 'বর্তমান অমীমাংসিত পাওনা' : `${selectedMonthLabel} মাসের বাকি`}</span>
              {!isAllMonths && totalLifetimeOutstanding > displayDues && (
                <span className="text-[10px] text-slate-500 font-mono">
                  সর্বমোট: {formatCurrencyBn(totalLifetimeOutstanding)}
                </span>
              )}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Overdue Amount & Alert */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between relative overflow-hidden group">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-amber-400 block">মেয়াদোত্তীর্ণ (Overdue)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {overdueCount > 0 ? `${overdueCount} জন` : '০ জন'}
              </span>
            </div>
            <span className="text-xl font-black font-mono text-amber-400 block">
              {formatCurrencyBn(totalOverdue)}
            </span>
            <span className="text-[11px] text-amber-500 block">
              {overdueCount} জন বর্ডারের ডেডলাইন উত্তীর্ণ
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
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
            placeholder="বর্ডারের নাম, কোড বা মোবাইল নম্বর খুঁজুন..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Flat Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedFlat}
              onChange={(e) => setSelectedFlat(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">সকল ফ্ল্যাট</option>
              {flats.map((f) => (
                <option key={f.id} value={f.flat_code}>
                  {f.name} ({f.flat_code})
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Toggle */}
          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              overdueOnly
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            শুধু ওভারডিউ ({overdueCount})
          </button>
        </div>
      </div>

      {/* Dues Data Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">বর্ডার পরিচিতি</th>
                <th className="py-3.5 px-4">আবাসন (ফ্ল্যাট ও সিট)</th>
                <th className="py-3.5 px-4 text-right">মোট ধার্যকৃত</th>
                <th className="py-3.5 px-4 text-right">মোট পরিশোধ</th>
                <th className="py-3.5 px-4 text-right">মোট বকেয়া (Due)</th>
                <th className="py-3.5 px-4 text-right">ওভারডিউ (Overdue)</th>
                <th className="py-3.5 px-4">সর্বশেষ পেমেন্ট</th>
                <th className="py-3.5 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary-400" />
                      <span>বকেয়া লেজার লোড হচ্ছে...</span>
                    </div>
                  </td>
                </tr>
              ) : duesData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    কোনো বকেয়া তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                duesData.map((row) => {
                  const hasDue = Number(row.outstanding_due) > 0
                  const hasOverdue = Number(row.overdue_amount) > 0

                  return (
                    <tr
                      key={row.boarder_id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Boarder Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {row.photo_url ? (
                            <img
                              src={row.photo_url}
                              alt={row.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <Link
                              to={`/boarders/${row.boarder_id}`}
                              className="font-bold text-white hover:text-primary-400 transition-colors flex items-center gap-1"
                            >
                              {row.full_name}
                              <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {row.boarder_code} • {row.phone_number}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Accommodation Flat & Seat */}
                      <td className="py-3.5 px-4">
                        {row.seat_code ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-amber-400 font-bold block">
                              {row.seat_code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {row.flat_name || row.flat_code} ({row.seat_name || 'সিট'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">সিট বরাদ্দহীন</span>
                        )}
                      </td>

                      {/* Total Billed */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                        {formatCurrencyBn(row.total_billed)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                        {formatCurrencyBn(row.total_paid)}
                      </td>

                      {/* Total Outstanding Due */}
                      <td className="py-3.5 px-4 text-right">
                        {hasDue ? (
                          <span className="font-bold text-rose-400 text-sm">
                            {formatCurrencyBn(row.outstanding_due)}
                          </span>
                        ) : (
                          <Badge status="PAID" variant="subtle" showDot>
                            পরিশোধিত
                          </Badge>
                        )}
                      </td>

                      {/* Overdue Amount */}
                      <td className="py-3.5 px-4 text-right">
                        {hasOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            {formatCurrencyBn(row.overdue_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Last Payment Date */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {row.last_payment_date ? (
                          formatDateBn(row.last_payment_date)
                        ) : (
                          <span className="text-slate-600">কোনো পেমেন্ট নেই</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link to={`/boarders/${row.boarder_id}?tab=dues`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-slate-300 hover:text-white"
                              title="চার্জ হিস্ট্রি দেখুন"
                            >
                              লেজার
                            </Button>
                          </Link>

                          {hasDue && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setCollectBoarderId(row.boarder_id)
                                setIsCollectModalOpen(true)
                              }}
                              className="h-8 px-2.5 text-xs shadow-sm bg-emerald-600 hover:bg-emerald-500 border-none font-bold text-white flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5 mr-1" />
                              ভাড়া আদায়
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CollectReceiptModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false)
          refetch()
        }}
        preSelectedBoarderId={collectBoarderId}
      />
    </div>
  )
}
export default BoarderDuesPage

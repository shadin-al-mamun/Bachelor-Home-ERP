import React, { useState, useEffect } from 'react'
import {
  Receipt as ReceiptIcon,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  FileText,
  Bed,
  RefreshCw,
  TrendingDown,
  Info,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useMealBoardersList } from '@/features/meals/api/useMeals'
import { useReceipts, type ExtendedReceipt } from '@/features/billing/api/useReceipts'
import { ReceiptPrintView } from '@/features/billing/components/ReceiptPrintView'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { isPhoneMatch } from '@/utils/phone'
import type { BoarderCharge, ChargeType, ChargeStatus } from '@/types/database'

export const BoarderDuesPage: React.FC = () => {
  const { profile } = useAuthStore()
  const branding = useBrandingStore()

  const [activeTab, setActiveTab] = useState<'charges' | 'receipts'>('charges')
  const [chargeFilter, setChargeFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL')
  const [selectedReceipt, setSelectedReceipt] = useState<ExtendedReceipt | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // 1. Resolve boarder identity
  const { data: boardersList = [], refetch: refetchBoarders } = useMealBoardersList()
  const isStaffRole = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'MANAGER'

  const matchedResident = boardersList.find(
    (b) =>
      (profile?.id && (b.user_id === profile.id || b.id === profile.id)) ||
      (profile?.phone_number && isPhoneMatch(b.phone_number, profile.phone_number)) ||
      (profile?.full_name && b.full_name === profile.full_name)
  )

  const currentBoarder = matchedResident || (!isStaffRole && !isSupabaseConfigured ? boardersList[0] : null)
  const activeBoarderId = currentBoarder?.id

  // Self-heal / Link boarder profile if Supabase is live and user is authenticated
  useEffect(() => {
    if (isSupabaseConfigured && profile?.id && !matchedResident) {
      supabase.rpc('claim_my_boarder_profile').then(({ data, error }) => {
        if (!error && data?.success) {
          refetchBoarders()
        }
      })
    }
  }, [profile?.id, matchedResident, refetchBoarders])

  // Boarder details display
  const boarderName = currentBoarder?.full_name || profile?.full_name || 'বর্ডার'
  const boarderCode = currentBoarder?.boarder_code || 'BDR'
  const rawBuilding = currentBoarder?.building_name || ''
  const isDemoBuilding =
    !rawBuilding ||
    rawBuilding.includes('Sunflower') ||
    rawBuilding.includes('সানফ্লাওয়ার') ||
    rawBuilding.includes('মেইন ভবন')

  const boarderBuilding = branding?.orgName || (!isDemoBuilding ? rawBuilding : 'প্রধান ক্যাম্পাস')
  const boarderFlat = currentBoarder?.flat_name && currentBoarder.flat_name !== 'ফ্ল্যাট' ? currentBoarder.flat_name : ''
  const boarderRoom = currentBoarder?.room_name && currentBoarder.room_name !== 'রুম' ? currentBoarder.room_name : ''
  const boarderSeat = currentBoarder?.seat_name || currentBoarder?.seat_code || 'সিট বরাদ্দ'

  // 2. Fetch Charges for this boarder
  const [charges, setCharges] = useState<BoarderCharge[]>([])
  const [isLoadingCharges, setIsLoadingCharges] = useState(true)

  const fetchCharges = React.useCallback(async () => {
    if (!activeBoarderId) {
      setIsLoadingCharges(false)
      return
    }
    setIsLoadingCharges(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('boarder_charges')
          .select('*')
          .eq('boarder_id', activeBoarderId)
          .neq('status', 'VOID')
          .order('billing_month', { ascending: false })

        if (error) {
          console.warn('Failed to load boarder charges from Supabase:', error.message)
          setCharges([])
        } else {
          setCharges((data as BoarderCharge[]) || [])
        }
      } else {
        // Fallback demo/mock
        setCharges([])
      }
    } catch (err) {
      console.warn('Error fetching boarder charges:', err)
      setCharges([])
    } finally {
      setIsLoadingCharges(false)
    }
  }, [activeBoarderId])

  useEffect(() => {
    fetchCharges()
  }, [fetchCharges])

  // 3. Fetch Receipts for this boarder
  const { data: allReceipts = [], isLoading: isLoadingReceipts, refetch: refetchReceipts } = useReceipts({
    boarderId: activeBoarderId,
    status: 'VALID',
  })

  const handleOpenReceipt = (receipt: ExtendedReceipt) => {
    setSelectedReceipt(receipt)
    setIsPrintModalOpen(true)
  }

  // Financial calculations
  const totalBilled = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalPaidCharges = charges.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
  const totalReceipts = allReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const totalPaid = totalReceipts || totalPaidCharges
  const outstandingDue = Math.max(0, totalBilled - totalPaidCharges)

  const mealCharges = charges
    .filter((c) => c.charge_type === 'MEAL')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  // Filter charges by status tab
  const filteredCharges = charges.filter((c) => {
    if (chargeFilter === 'UNPAID') return c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID'
    if (chargeFilter === 'PAID') return c.status === 'PAID'
    return true
  })

  const getChargeTypeLabel = (type: ChargeType) => {
    switch (type) {
      case 'RENT':
        return 'মাসিক সিট ভাড়া'
      case 'MEAL':
        return 'খাবার বিল (Meal Bill)'
      case 'UTILITY':
        return 'ইউটিলিটি চার্জ'
      case 'ADMISSION_FEE':
        return 'ভর্তি / সার্ভিস চার্জ'
      case 'PENALTY':
        return 'বিলম্ব জরিমানা'
      default:
        return 'অন্যান্য বিল'
    }
  }

  const getStatusBadge = (status: ChargeStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> পরিশোধিত
          </span>
        )
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> আংশিক পরিশোধ
          </span>
        )
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> অপরিশোধিত
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        )
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <span className="text-emerald-400 font-medium">নগদ ক্যাশ (Cash)</span>
      case 'MFS':
        return <span className="text-indigo-400 font-medium">মোবাইল ব্যাংকিং (MFS)</span>
      case 'BANK_TRANSFER':
        return <span className="text-sky-400 font-medium">ব্যাংক ট্রান্সফার</span>
      default:
        return <span className="text-slate-400">{method}</span>
    }
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Card with Boarder Identity */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-3.5 h-3.5" />
              <span>বকেয়া ও পেমেন্ট রশিদ ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              আমার বকেয়া ও পেমেন্ট রশিদ
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              আপনার মাসিক সিট ভাড়া, খাবার বিলের বকেয়া হিসাব এবং হোস্টেল অফিসের অফিশিয়াল মানি রিসিপ্ট ভাউচার।
            </p>
          </div>

          {/* Boarder Identity Pill */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 backdrop-blur-sm space-y-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {boarderName.slice(0, 2)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{boarderName}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-400 font-semibold">{boarderCode}</span>
                  <span>•</span>
                  <span>{boarderBuilding}</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4 text-[11px] text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Bed className="w-3 h-3 text-indigo-400" />
                {boarderSeat} {boarderRoom ? `(${boarderRoom})` : ''} {boarderFlat ? `• ${boarderFlat}` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                সক্রিয় বর্ডার
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Due */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>সর্বমোট বকেয়া</span>
            <AlertCircle className={`w-4 h-4 ${outstandingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${outstandingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {formatCurrencyBn(outstandingDue)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            {outstandingDue > 0 ? (
              <span className="text-amber-400 font-medium">পরিশোধ বাকি রয়েছে</span>
            ) : (
              <span className="text-emerald-400 font-medium">কোনো বকেয়া নেই</span>
            )}
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>মোট পরিশোধিত</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatCurrencyBn(totalPaid)}
          </div>
          <div className="text-[11px] text-slate-400">
            {allReceipts.length} টি মানি রিসিপ্ট
          </div>
        </div>

        {/* Card 3: Total Billed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>মোট ধার্যকৃত চার্জ</span>
            <TrendingDown className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {formatCurrencyBn(totalBilled)}
          </div>
          <div className="text-[11px] text-slate-400">
            সিট ও খাবারের সর্বমোট চার্জ
          </div>
        </div>

        {/* Card 4: Meal Bill Portion */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>খাবার বিল চার্জ</span>
            <ReceiptIcon className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-sky-400">
            {formatCurrencyBn(mealCharges)}
          </div>
          <div className="text-[11px] text-slate-400">
            মাসিক মিলের মোট হিসাব
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation & Content */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('charges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'charges'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              বকেয়া ও বিলের বিবরণ ({charges.length})
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'receipts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ReceiptIcon className="w-4 h-4" />
              পরিশোধিত মানি রিসিপ্ট ({allReceipts.length})
            </button>
          </div>

          {activeTab === 'charges' && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setChargeFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                সব বিল
              </button>
              <button
                onClick={() => setChargeFilter('UNPAID')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'UNPAID' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                বকেয়া
              </button>
              <button
                onClick={() => setChargeFilter('PAID')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                পরিশোধিত
              </button>
            </div>
          )}

          {activeTab === 'receipts' && (
            <button
              onClick={() => refetchReceipts()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              রিলিফ্রেশ করুন
            </button>
          )}
        </div>

        {/* Tab 1: Charges & Dues Table */}
        {activeTab === 'charges' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">মাস</th>
                    <th className="py-3 px-3">খাত</th>
                    <th className="py-3 px-3">বিবরণ</th>
                    <th className="py-3 px-3 text-right">ধার্য পরিমাণ</th>
                    <th className="py-3 px-3 text-right">পরিশোধিত</th>
                    <th className="py-3 px-3 text-right">বকেয়া</th>
                    <th className="py-3 px-3 text-center">পরিশোধের তারিখ</th>
                    <th className="py-3 px-3 text-right">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingCharges ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>বিল ও বকেয়ার তথ্য লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Info className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-medium text-slate-400">কোনো ধার্যকৃত বিল পাওয়া যায়নি।</p>
                          <p className="text-[11px] text-slate-500">
                            হোস্টেল অফিস থেকে নতুন মাসের সিট বা মিল বিল জেনারেট করা হলে এখানে দেখতে পাবেন।
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCharges.map((c) => {
                      const due = Number(c.due_amount ?? (Number(c.amount) - Number(c.paid_amount))) || 0
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-white whitespace-nowrap">
                            {c.billing_month ? formatDateBn(c.billing_month) : 'চলতি মাস'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-300 font-medium">
                            {getChargeTypeLabel(c.charge_type)}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                            {c.description || '-'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                            {formatCurrencyBn(c.amount)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {formatCurrencyBn(c.paid_amount)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={due > 0 ? 'text-amber-400' : 'text-slate-500'}>
                              {formatCurrencyBn(due)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center text-slate-400 whitespace-nowrap">
                            {c.due_date ? formatDateBn(c.due_date) : '-'}
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            {getStatusBadge(c.status)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Receipts Table */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">রশিদ নং</th>
                    <th className="py-3 px-3">পেমেন্ট তারিখ</th>
                    <th className="py-3 px-3 text-right">আদায়কৃত অর্থ</th>
                    <th className="py-3 px-3 text-center">মাধ্যম</th>
                    <th className="py-3 px-3">ট্রানজেকশন আইডি / নোট</th>
                    <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-3 text-right">অফিশিয়াল ভাউচার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingReceipts ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>মানি রিসিপ্টের তথ্য লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="max-w-xs mx-auto space-y-2">
                          <ReceiptIcon className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-medium text-slate-400">কোনো পরিশোধিত মানি রিসিপ্ট পাওয়া যায়নি।</p>
                          <p className="text-[11px] text-slate-500">
                            ম্যানেজার আপনার পেমেন্ট গ্রহণ করে সিস্টেমে এন্ট্রি দিলে এখানে মানি রিসিপ্ট দেখতে ও ডাউনলোড করতে পারবেন।
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    allReceipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {rec.receipt_number}
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                          {formatDateBn(rec.receipt_date)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatCurrencyBn(rec.amount)}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {getPaymentMethodBadge(rec.payment_method)}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                          {rec.transaction_reference || rec.remarks || '-'}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.is_void
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {rec.is_void ? 'বাতিল' : 'বৈধ রিসিপ্ট'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenReceipt(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 font-semibold transition-all text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ভাউচার দেখুন</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Official Printable Voucher Modal */}
      <ReceiptPrintView
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        receipt={selectedReceipt}
      />
    </div>
  )
}

export default BoarderDuesPage

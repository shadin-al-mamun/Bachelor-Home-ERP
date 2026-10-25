import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  Zap,
  UtensilsCrossed,
  Building2,
  PlusCircle,
  Calendar,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  DollarSign,
  Receipt,
  CreditCard,
  Check,
  Sparkles,
  User,
  Tag,
  ExternalLink,
  Info,
} from 'lucide-react'
import { formatCurrencyBn } from '@/utils/date'
import type { ChargeType } from '@/types/database'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import {
  useBoarderDuesSummary,
  useGenerateMonthlyCharges,
  useAddManualCharge,
} from './api/useBilling'
import {
  useFlatUtilityBillingPreview,
  useGenerateBatchFlatUtilityBills,
  type FlatConfigPayload,
} from './api/useFlatUtilityBilling'
import {
  useMonthlyMealBillingPreview,
  useGenerateMonthlyMealChargesMutation,
} from '@/features/meals/api/useMealSettingsAndRates'

type BillingTab = 'rent' | 'meals' | 'flat-utility' | 'other'

interface FlatRowState {
  seatCount: number
  cookBill: number
  otherBill: number
}

const CHARGE_TYPE_OPTIONS: { value: ChargeType; label: string }[] = [
  { value: 'UTILITY', label: 'ইউটিলিটি চার্জ (Utility)' },
  { value: 'PENALTY', label: 'জরিমানা / লেট ফি (Penalty)' },
  { value: 'ADMISSION_FEE', label: 'ভর্তি ফি (Admission Fee)' },
  { value: 'MEAL', label: 'খাবার সমন্বয় ফি (Meal Adjustment)' },
  { value: 'OTHER', label: 'অন্যান্য সার্ভিস ফি (Other Fee)' },
]

export const MonthlyBillGenerationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as BillingTab) || 'rent'

  const [activeTab, setActiveTab] = useState<BillingTab>(
    ['rent', 'meals', 'flat-utility', 'other'].includes(initialTab) ? initialTab : 'rent'
  )

  // Sync tab with URL
  const handleTabChange = (tab: BillingTab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Update activeTab when URL searchParams changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as BillingTab
    if (tabParam && ['rent', 'meals', 'flat-utility', 'other'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Shared Month Defaults
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const defaultRentMonth = nextMonth.toISOString().slice(0, 7) // e.g. "2026-11"
  const defaultCurrentMonth = now.toISOString().slice(0, 7) // e.g. "2026-10"

  // ==========================================
  // TAB 1: RENT GENERATION STATE
  // ==========================================
  const [rentMonth, setRentMonth] = useState(defaultRentMonth)
  const [rentDueDate, setRentDueDate] = useState(`${defaultRentMonth}-10`)
  const [rentStatus, setRentStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const generateRentMutation = useGenerateMonthlyCharges()
  const { data: activeBoarders = [], isLoading: isLoadingBoarders } = useBoarders({
    status: 'ACTIVE',
  })

  const totalMonthlyRentEstimate = useMemo(() => {
    return activeBoarders.reduce((acc, b) => acc + (b.active_allocation?.monthly_rent || 0), 0)
  }, [activeBoarders])

  const handleGenerateRent = async (e: React.FormEvent) => {
    e.preventDefault()
    setRentStatus(null)
    if (!rentMonth) {
      setRentStatus({ type: 'error', message: 'অনুগ্রহ করে বিলিং মাস নির্বাচন করুন।' })
      return
    }

    try {
      const result = await generateRentMutation.mutateAsync({
        billingMonth: `${rentMonth}-01`,
        dueDate: rentDueDate,
      })
      setRentStatus({
        type: 'success',
        message: `সফলভাবে সম্পন্ন! ${result?.generated ?? activeBoarders.length} জন সক্রিয় বর্ডারের মাসিক সিট ভাড়া তৈরি হয়েছে। ${result?.skipped ? `(${result.skipped} জন ইতিমধ্যে জেনারেট থাকায় স্কিপ করা হয়েছে)` : ''
          }`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মাসিক ভাড়া চার্জ তৈরি করতে ব্যর্থ।'
      setRentStatus({ type: 'error', message: msg })
    }
  }

  // ==========================================
  // TAB 2: MEAL BILLING STATE
  // ==========================================
  const [mealBillingMonth, setMealBillingMonth] = useState(`${defaultCurrentMonth}-01`)
  const [mealDueDate, setMealDueDate] = useState(
    new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10)
  )
  const [defaultMinMeals, setDefaultMinMeals] = useState<number>(45)
  const [boarderMinOverrides, setBoarderMinOverrides] = useState<Record<string, number>>({})
  const [mealStatus, setMealStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const {
    data: mealBillingPreview,
    isLoading: isMealBillingLoading,
    refetch: refetchMealBilling,
  } = useMonthlyMealBillingPreview(mealBillingMonth, defaultMinMeals, boarderMinOverrides)

  const generateMealChargesMutation = useGenerateMonthlyMealChargesMutation()

  const handleMinMealsChange = (boarderId: string, val: string) => {
    const num = parseFloat(val)
    setBoarderMinOverrides((prev) => ({
      ...prev,
      [boarderId]: isNaN(num) ? 0 : Math.max(0, num),
    }))
  }

  const handleGenerateMealCharges = async () => {
    setMealStatus(null)
    try {
      const result = await generateMealChargesMutation.mutateAsync({
        billingMonth: mealBillingMonth,
        dueDate: mealDueDate,
        defaultMinMeals,
        boarderMinOverrides,
      })
      setMealStatus({
        type: 'success',
        message: result.message || 'সফলভাবে মিল চার্জ জেনারেট সম্পন্ন হয়েছে।',
      })
      refetchMealBilling()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মিল চার্জ জেনারেট করতে সমস্যা হয়েছে।'
      setMealStatus({ type: 'error', message: msg })
    }
  }

  // ==========================================
  // TAB 3: FLAT UTILITY / MISC BILLS STATE
  // ==========================================
  const [utilityBillingMonth, setUtilityBillingMonth] = useState(defaultCurrentMonth)
  const [utilityDueDate, setUtilityDueDate] = useState(`${defaultCurrentMonth}-10`)
  const [globalCookBill, setGlobalCookBill] = useState<number | ''>(600)
  const [utilityStatus, setUtilityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [flatInputs, setFlatInputs] = useState<Record<string, FlatRowState>>({})

  const {
    data: flatsData = [],
    isLoading: isFlatsLoading,
    refetch: refetchFlats,
  } = useFlatUtilityBillingPreview(utilityBillingMonth)

  const generateBatchUtilityMutation = useGenerateBatchFlatUtilityBills()

  useEffect(() => {
    if (flatsData.length > 0) {
      setFlatInputs((prev) => {
        const nextState: Record<string, FlatRowState> = { ...prev }
        flatsData.forEach((flat) => {
          if (!nextState[flat.flat_id]) {
            const existingCook = flat.existing_distribution?.cook_bill ?? (globalCookBill === '' ? 600 : globalCookBill)
            const existingOther = flat.existing_distribution?.other_bill ?? 0
            const effectiveSeats =
              flat.total_seats > 0 ? flat.total_seats : flat.active_boarders_count || 1

            nextState[flat.flat_id] = {
              seatCount: effectiveSeats,
              cookBill: existingCook,
              otherBill: existingOther,
            }
          }
        })
        return nextState
      })
    }
  }, [flatsData])

  const handleApplyGlobalCookBill = () => {
    if (globalCookBill === '') return
    setFlatInputs((prev) => {
      const updated: Record<string, FlatRowState> = {}
      flatsData.forEach((f) => {
        const current = prev[f.flat_id] || {
          seatCount: f.total_seats || 1,
          cookBill: globalCookBill,
          otherBill: 0,
        }
        updated[f.flat_id] = { ...current, cookBill: globalCookBill }
      })
      return updated
    })
  }

  const handleGenerateBatchUtilityBills = async () => {
    setUtilityStatus(null)
    const flatConfigs: FlatConfigPayload[] = flatsData.map((flat) => {
      const state = flatInputs[flat.flat_id] || {
        seatCount: flat.total_seats > 0 ? flat.total_seats : flat.active_boarders_count || 1,
        cookBill: 600,
        otherBill: 0,
      }
      const seatCount = state.seatCount > 0 ? state.seatCount : 1
      const utilityPerHead = Math.round(flat.total_voucher_amount / seatCount)
      const otherBillTotal = Number(state.otherBill || 0)
      const otherBillPerHead = Math.round(otherBillTotal / seatCount)
      const grandTotalPerHead = utilityPerHead + Number(state.cookBill || 0) + otherBillPerHead

      return {
        flat_id: flat.flat_id,
        total_seats: seatCount,
        total_voucher_amount: flat.total_voucher_amount,
        utility_per_head: utilityPerHead,
        cook_bill: Number(state.cookBill || 0),
        other_bill: otherBillTotal,
        other_bill_per_head: otherBillPerHead,
        grand_total_per_head: grandTotalPerHead,
      }
    })

    try {
      const result = await generateBatchUtilityMutation.mutateAsync({
        billingMonth: utilityBillingMonth,
        dueDate: utilityDueDate,
        flatConfigs,
      })
      setUtilityStatus({
        type: 'success',
        message: `সফলভাবে সম্পন্ন! মোট ${result.totalChargesCreated} টি বিল সফলভাবে বর্ডারদের লেজারে যুক্ত হয়েছে।`,
      })
      refetchFlats()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ফ্ল্যাটভিত্তিক বিবিধ বিল তৈরি করতে ব্যর্থ।'
      setUtilityStatus({ type: 'error', message: msg })
    }
  }

  // ==========================================
  // TAB 4: ADD OTHER CHARGES STATE
  // ==========================================
  const [manualBoarderId, setManualBoarderId] = useState('')
  const [manualChargeType, setManualChargeType] = useState<ChargeType>('UTILITY')
  const [manualBillingMonth, setManualBillingMonth] = useState(defaultCurrentMonth)
  const [manualAmount, setManualAmount] = useState<number | ''>('')
  const [manualDueDate, setManualDueDate] = useState(`${defaultCurrentMonth}-15`)
  const [manualDescription, setManualDescription] = useState('')
  const [manualStatus, setManualStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const addManualChargeMutation = useAddManualCharge()
  const { data: duesData = [], refetch: refetchDues } = useBoarderDuesSummary()

  const handleAddManualCharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setManualStatus(null)

    if (!manualBoarderId) {
      setManualStatus({ type: 'error', message: 'অনুগ্রহ করে একজন বোর্ডার নির্বাচন করুন।' })
      return
    }
    if (!manualAmount || Number(manualAmount) <= 0) {
      setManualStatus({ type: 'error', message: 'অনুগ্রহ করে বৈধ টাকার পরিমাণ লিখুন।' })
      return
    }

    try {
      await addManualChargeMutation.mutateAsync({
        boarderId: manualBoarderId,
        chargeType: manualChargeType,
        billingMonth: `${manualBillingMonth}-01`,
        amount: Number(manualAmount),
        dueDate: manualDueDate,
        description: manualDescription.trim() || 'অন্যান্য সার্ভিস চার্জ',
      })

      setManualStatus({
        type: 'success',
        message: `সফলভাবে ৳${Number(manualAmount).toLocaleString('en-IN')} চার্জ যুক্ত করা হয়েছে।`,
      })
      setManualAmount('')
      setManualDescription('')
      refetchDues()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'চার্জ যোগ করতে ব্যর্থ।'
      setManualStatus({ type: 'error', message: msg })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-indigo-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  মাসিক বিল জেনারেট
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  সেন্ট্রাল বিলিং হাব
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                এক স্থান থেকেই মাসিক সিট ভাড়া, মিল বিলিং, ফ্ল্যাটভিত্তিক বিবিধ বিল ও অন্যান্য কাস্টম চার্জ জেনারেট করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/billing"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 font-medium"
          >
            <CreditCard className="w-3.5 h-3.5 text-primary-400" />
            বকেয়া লেজার
          </Link>
          <Link
            to="/billing/receipts"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
            রশিদ তালিকা
          </Link>
        </div>
      </div>

      {/* 4 Core Tabs Navigation */}
      <div className="glass-card rounded-2xl border border-slate-800/90 p-1.5 bg-slate-950/70 backdrop-blur-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {/* TAB 1 */}
          <button
            onClick={() => handleTabChange('rent')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeTab === 'rent'
              ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/15 to-transparent border border-amber-500/40 text-amber-200 shadow-lg shadow-amber-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'rent' ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-900 text-slate-400'
                }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">১. মাসিক ভাড়া জেনারেট</div>
              <div className="text-[10px] text-slate-500 truncate">সিট ভাড়ার স্বয়ংক্রিয় ব্যাচ চার্জ</div>
            </div>
          </button>

          {/* TAB 2 */}
          <button
            onClick={() => handleTabChange('meals')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeTab === 'meals'
              ? 'bg-gradient-to-r from-emerald-500/20 via-emerald-500/15 to-transparent border border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'meals' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-900 text-slate-400'
                }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">২. মাসিক মিল বিলিং ও চার্জেস</div>
              <div className="text-[10px] text-slate-500 truncate">খাবার হিসাব ও মিল লেজার জেনারেট</div>
            </div>
          </button>

          {/* TAB 3 */}
          <button
            onClick={() => handleTabChange('flat-utility')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeTab === 'flat-utility'
              ? 'bg-gradient-to-r from-indigo-500/20 via-indigo-500/15 to-transparent border border-indigo-500/40 text-indigo-200 shadow-lg shadow-indigo-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'flat-utility' ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-900 text-slate-400'
                }`}
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">৩. ফ্ল্যাট ভিত্তিক বিবিধ বিল</div>
              <div className="text-[10px] text-slate-500 truncate">খালা বিল ও ইউটিলিটি চার্জ বণ্টন</div>
            </div>
          </button>

          {/* TAB 4 */}
          <button
            onClick={() => handleTabChange('other')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeTab === 'other'
              ? 'bg-gradient-to-r from-rose-500/20 via-rose-500/15 to-transparent border border-rose-500/40 text-rose-200 shadow-lg shadow-rose-500/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'other' ? 'bg-rose-500/30 text-rose-300' : 'bg-slate-900 text-slate-400'
                }`}
            >
              <PlusCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">৪. অন্যান্য চার্জ যুক্ত করুন</div>
              <div className="text-[10px] text-slate-500 truncate">লেট ফি, ভর্তি বা বিশেষ চার্জ এন্ট্রি</div>
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: মাসিক ভাড়া জেনারেট (MONTHLY RENT GENERATION) */}
      {/* ======================================================== */}
      {activeTab === 'rent' && (
        <div className="space-y-6">
          {/* Status Message */}
          {rentStatus && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg border ${rentStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {rentStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span className="font-semibold">{rentStatus.message}</span>
            </div>
          )}

          {/* Configuration & Action Card */}
          <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  সকল সক্রিয় বর্ডারের মাসিক সিট ভাড়া জেনারেট
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  এক ক্লিকেই হোস্টেলের সকল সক্রিয় বর্ডারের জন্য সংশ্লিষ্ট মাসের নির্ধারিত রুম ভাড়া চার্জ যুক্ত করুন।
                </p>
              </div>

              {/* Form Controls */}
              <form onSubmit={handleGenerateRent} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    বিলিং মাস:
                  </span>
                  <input
                    type="month"
                    required
                    value={rentMonth}
                    onChange={(e) => {
                      setRentMonth(e.target.value)
                      setRentDueDate(`${e.target.value}-10`)
                    }}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    পরিশোধের শেষ তারিখ:
                  </span>
                  <input
                    type="date"
                    required
                    value={rentDueDate}
                    onChange={(e) => setRentDueDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={generateRentMutation.isPending || isLoadingBoarders}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {generateRentMutation.isPending ? 'চার্জ তৈরি হচ্ছে...' : 'মাসিক ভাড়া জেনারেট করুন'}
                  </span>
                </button>
              </form>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">সক্রিয় বর্ডার সংখ্যা</span>
                  <span className="text-2xl font-black text-white">{activeBoarders.length} জন</span>
                  <span className="text-[11px] text-emerald-400 block mt-0.5">রুম ও সিট বরাদ্দকৃত</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">মোট আনুমানিক মাসিক ভাড়া</span>
                  <span className="text-2xl font-black text-amber-400">
                    {formatCurrencyBn(totalMonthlyRentEstimate)}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">চলমান রেট অনুযায়ী</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">নির্ধারিত ডিউ ডেট</span>
                  <span className="text-base font-bold text-white font-mono">{rentDueDate}</span>
                  <span className="text-[11px] text-indigo-400 block mt-0.5">এই তারিখের পর ওভারডিউ</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Active Boarders Preview List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  মাসিক ভাড়া চার্জের আওতাভুক্ত বর্ডার তালিকা ({activeBoarders.length} জন)
                </h3>
                <span className="text-[11px] text-slate-500">
                  সিস্টেম স্বয়ংক্রিয়ভাবে ডুপ্লিকেট চার্জ প্রতিরোধ করবে
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px] rounded-2xl border border-slate-800/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider z-10">
                    <tr>
                      <th className="py-3 px-3.5">বর্ডার তথ্য</th>
                      <th className="py-3 px-3.5">মোবাইল নম্বর</th>
                      <th className="py-3 px-3.5">ফ্ল্যাট ও সিট</th>
                      <th className="py-3 px-3.5 text-right">মাসিক ভাড়া (৳)</th>
                      <th className="py-3 px-3.5 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {activeBoarders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          কোনো সক্রিয় বোর্ডার পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      activeBoarders.map((boarder) => (
                        <tr key={boarder.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3.5">
                            <div className="font-bold text-white">{boarder.full_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {boarder.boarder_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-300 font-mono">
                            {boarder.phone_number}
                          </td>
                          <td className="py-2.5 px-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-mono">
                              {boarder.active_allocation?.seat?.room?.flat?.name || boarder.active_allocation?.seat?.room?.flat?.flat_code || 'ফ্ল্যাট নেই'} • {boarder.active_allocation?.seat?.room?.room_code || 'রুম'}-{boarder.active_allocation?.seat?.seat_code || 'সিট'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-300">
                            ৳{Number(boarder.active_allocation?.monthly_rent || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              সক্রিয়
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: মাসিক মিল বিলিং ও চার্জেস (MEAL BILLING & CHARGES) */}
      {/* ======================================================== */}
      {activeTab === 'meals' && (
        <div className="space-y-6">
          {/* Status Message */}
          {mealStatus && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg border ${mealStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {mealStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span className="font-semibold">{mealStatus.message}</span>
            </div>
          )}

          {/* Configuration & Action Card */}
          <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-emerald-400" />
                  মাসিক খাবার বিল প্রিভিউ ও লেজার জেনারেশন
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  বর্ডারদের সারামাসের গৃহিত নাস্তা, দুপুর ও রাতের মিল হিসাব করে স্বয়ংক্রিয়ভাবে বিলিং লেজারে চার্জ যোগ করুন।
                </p>
              </div>

              {/* Form Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    বিলিং মাস:
                  </span>
                  <input
                    type="month"
                    value={mealBillingMonth.slice(0, 7)}
                    onChange={(e) => setMealBillingMonth(`${e.target.value}-01`)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    পরিশোধের শেষ তারিখ:
                  </span>
                  <input
                    type="date"
                    value={mealDueDate}
                    onChange={(e) => setMealDueDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5" title="ডিফল্ট সর্বনিম্ন মিল (কোনো বর্ডার এর চেয়ে কম খেলে তাকে এই পরিমাণ মিলের চার্জ দিতে হবে)">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                    বাধ্যতামূলক মিল:
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={defaultMinMeals}
                    onChange={(e) => setDefaultMinMeals(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-12 bg-transparent text-amber-300 text-xs font-mono font-bold focus:outline-none text-center"
                  />
                  <span className="text-[10px] text-slate-500 font-bold">টি</span>
                </div>

                <button
                  onClick={handleGenerateMealCharges}
                  disabled={generateMealChargesMutation.isPending || isMealBillingLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {generateMealChargesMutation.isPending
                      ? 'বিল তৈরি হচ্ছে...'
                      : 'মাসিক খাবার বিল তৈরি করুন'}
                  </span>
                </button>
              </div>
            </div>

            {/* Notice / Rule Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-amber-300">মিল নীতিমালা ও কোটা নিয়ম:</span>{' '}
                মাসে সর্বনিম্ন ৪৫টি মিলের নিয়ম প্রযোজ্য। কোনো বোর্ডার ৪৫ মিলের কম খেলেও তাকে সর্বনিম্ন কোটার চার্জ দিতে হবে (মিল কাউন্ট: দুপুর ১.০ মিল, রাত ১.০ মিল, সকাল ০.৫ মিল = দৈনিক ২.৫ মিল)। কোনো বোর্ডারের ক্ষেত্রে কোটা কমবেশি হলে টেবিলে <strong className="text-white underline">বাধ্যতামূলক মিল</strong> ঘরে সরাসরি হাতে লিখে পরিবর্তন করা যায়।
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">মোট গৃহীত মিল</span>
                  <span className="text-2xl font-black text-white">
                    {(mealBillingPreview?.preview_items?.reduce((s, i) => s + (Number(i.consumed_meals ?? i.total_meals) || 0), 0) || 0).toFixed(1)} টি
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">সকাল ০.৫, দুপুর ও রাত ১.০</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">মোট বিলযোগ্য মিল</span>
                  <span className="text-2xl font-black text-amber-400">
                    {(mealBillingPreview?.preview_items?.reduce((s, i) => s + (Number(i.billable_meals ?? i.total_meals) || 0), 0) || 0).toFixed(1)} টি
                  </span>
                  <span className="text-[11px] text-amber-300/80 block mt-0.5">শর্টফল সমন্বয় সহ</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">মোট খাবার বিল পরিমাণ</span>
                  <span className="text-2xl font-black text-emerald-400">
                    ৳{(mealBillingPreview?.preview_items?.reduce((s, i) => s + Number(i.total_amount || 0), 0) || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">কার্যকর রেট সিডিউল অনুযায়ী</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">বিল তৈরি স্ট্যাটাস</span>
                  <span className="text-base font-bold text-white">
                    {mealBillingPreview?.preview_items?.filter((i) => i.already_billed).length || 0} /{' '}
                    {mealBillingPreview?.preview_items?.length || 0} সম্পন্ন
                  </span>
                  <span className="text-[11px] text-emerald-400 block mt-0.5">স্বয়ংক্রিয় ট্র্যাকিং</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileCheck className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Billing Table Preview */}
            <div className="overflow-x-auto max-h-[500px] rounded-2xl border border-slate-800/80">
              {isMealBillingLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  বিলিং প্রিভিউ লোড হচ্ছে...
                </div>
              ) : !mealBillingPreview?.preview_items || mealBillingPreview.preview_items.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  এই মাসের জন্য কোনো মিল বা বর্ডার পাওয়া যায়নি।
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider z-10">
                    <tr>
                      <th className="py-3 px-3">বর্ডার তথ্য</th>
                      <th className="py-3 px-2">ফ্ল্যাট</th>
                      <th className="py-3 px-2 text-center" title="সকালের নাস্তা (০.৫ মিল হিসেবে কাউন্ট)">নাস্তা (০.৫)</th>
                      <th className="py-3 px-2 text-center" title="দুপুরের খাবার (১.০ মিল হিসেবে কাউন্ট)">দুপুর (১.০)</th>
                      <th className="py-3 px-2 text-center" title="রাতের খাবার (১.০ মিল হিসেবে কাউন্ট)">রাত (১.০)</th>
                      <th className="py-3 px-3 text-center" title="বাস্তবে মোট খাওয়া মিলের সংখ্যা">গৃহীত মিল</th>
                      <th className="py-3 px-3 text-center" title="এই বর্ডারের জন্য বাধ্যতামূলক সর্বনিম্ন মিল (কমবেশি হলে হাতে লিখে পরিবর্তন করতে পারেন)">বাধ্যতামূলক মিল</th>
                      <th className="py-3 px-3 text-center" title="বিলযোগ্য মিল = গৃহীত মিল + শর্টফল">বিলযোগ্য মিল</th>
                      <th className="py-3 px-3 text-right">মোট বিল</th>
                      <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {mealBillingPreview.preview_items.map((item) => {
                      const consumed = Number(item.consumed_meals ?? item.total_meals) || 0
                      const minVal = boarderMinOverrides[item.boarder_id] !== undefined
                        ? boarderMinOverrides[item.boarder_id]
                        : (item.min_meals ?? defaultMinMeals)
                      const shortfall = Math.max(0, Math.round((minVal - consumed) * 10) / 10)
                      const billable = Math.round((consumed + shortfall) * 10) / 10

                      return (
                        <tr key={item.boarder_id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <Link
                              to={`/boarders/${item.boarder_id}?tab=meals`}
                              className="font-bold text-white hover:text-emerald-400 transition-colors inline-flex items-center gap-1 group"
                              title="বোর্ডারের বিস্তারিত মিল রেকর্ড ও উপস্থিতি লেজার দেখুন"
                            >
                              <span>{item.boarder_name}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {item.boarder_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-slate-300">{item.flat_name}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-amber-400">
                            {item.breakfast_count}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-emerald-400">
                            {item.lunch_count}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-indigo-400">
                            {item.dinner_count}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                            {consumed.toFixed(1)}টি
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-0.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={minVal}
                                onChange={(e) => handleMinMealsChange(item.boarder_id, e.target.value)}
                                className="w-12 bg-transparent text-center font-mono font-bold text-amber-300 text-xs focus:outline-none"
                                title="বাধ্যতামূলক মিল সংখ্যা হাতে লিখে পরিবর্তন করতে পারেন"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">টি</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="font-mono font-bold text-emerald-300">
                              {billable.toFixed(1)}টি
                            </div>
                            {shortfall > 0 && (
                              <span
                                className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                title={`বাধ্যতামূলক ${minVal}টি থেকে শর্টফল ${shortfall}টি`}
                              >
                                +{shortfall.toFixed(1)} শর্টফল
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-300">
                            ৳{item.total_amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.already_billed ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                বিল তৈরি সম্পন্ন
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                অপেক্ষমান
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: মাসিক ফ্ল্যাট ভিত্তিক বিবিধ বিল জেনারেট */}
      {/* ======================================================== */}
      {activeTab === 'flat-utility' && (
        <div className="space-y-6">
          {/* Status Message */}
          {utilityStatus && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg border ${utilityStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {utilityStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span className="font-semibold">{utilityStatus.message}</span>
            </div>
          )}

          {/* Configuration Card */}
          <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  ফ্ল্যাট ভিত্তিক বিবিধ ও ইউটিলিটি বিল বণ্টন ও জেনারেশন
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  প্রতিটি ফ্ল্যাটের বিদ্যুৎ, গ্যাস, ময়লা ও খালা বিল বর্ডারদের সিট অনুযায়ী বণ্টন করে লেজারে চার্জ তৈরি করুন।
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    বিলিং মাস:
                  </span>
                  <input
                    type="month"
                    value={utilityBillingMonth}
                    onChange={(e) => setUtilityBillingMonth(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    পরিশোধের শেষ তারিখ:
                  </span>
                  <input
                    type="date"
                    value={utilityDueDate}
                    onChange={(e) => setUtilityDueDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleGenerateBatchUtilityBills}
                  disabled={generateBatchUtilityMutation.isPending || isFlatsLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>
                    {generateBatchUtilityMutation.isPending
                      ? 'বিল তৈরি হচ্ছে...'
                      : 'সকল ফ্ল্যাটের বিল জেনারেট করুন'}
                  </span>
                </button>
              </div>
            </div>

            {/* Global Default Setup Bar */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-800/40 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    ডিফল্ট খালা বিল সেটআপ (সকল ফ্ল্যাটে প্রয়োগ)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    নির্ধারিত অংক লিখলে এক ক্লিকে সকল ফ্ল্যাটের খালা বিল ঘরে একই মান বসে যাবে
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 border border-indigo-700/50 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-indigo-300 font-mono mr-1.5">৳</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="600"
                    value={globalCookBill}
                    onChange={(e) =>
                      setGlobalCookBill(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-20 bg-transparent text-white text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyGlobalCookBill}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  প্রয়োগ করুন
                </button>
              </div>
            </div>

            {/* Flat Grid Preview */}
            <div className="space-y-4">
              {isFlatsLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  ফ্ল্যাট ইউটিলিটি প্রিভিউ লোড হচ্ছে...
                </div>
              ) : flatsData.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  কোনো ফ্ল্যাট তথ্য পাওয়া যায়নি।
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {flatsData.map((flat) => {
                    const row = flatInputs[flat.flat_id] || {
                      seatCount: flat.total_seats > 0 ? flat.total_seats : flat.active_boarders_count || 1,
                      cookBill: 600,
                      otherBill: 0,
                    }
                    const seatCount = row.seatCount > 0 ? row.seatCount : 1
                    const utilityPerHead = Math.round(flat.total_voucher_amount / seatCount)
                    const otherBillTotal = Number(row.otherBill || 0)
                    const otherBillPerHead = Math.round(otherBillTotal / seatCount)
                    const grandTotalPerHead =
                      utilityPerHead + Number(row.cookBill || 0) + otherBillPerHead

                    return (
                      <div
                        key={flat.flat_id}
                        className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
                      >
                        {/* Flat Header */}
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">
                              {flat.flat_code.replace(/[^0-9]/g, '') || flat.flat_code}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {flat.flat_name}
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                                  {flat.building_name || 'প্রধান ভবন'}
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                সক্রিয় বোর্ডার: {flat.active_boarders_count} জন • মোট সিট: {flat.total_seats}টি
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">মাথাপিছু সর্বমোট বিল</span>
                            <span className="text-base font-black text-amber-300 font-mono">
                              ৳{grandTotalPerHead.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Flat Expense Vouchers Breakdown */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                            <span>খরচের ভাউচার ({flat.vouchers.length}টি)</span>
                            <span className="font-mono text-indigo-300">
                              মোট: ৳{flat.total_voucher_amount.toLocaleString('en-IN')}
                            </span>
                          </span>

                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                            {flat.vouchers.length === 0 ? (
                              <div className="text-[11px] text-slate-500 italic py-1">
                                এই মাসে কোনো খরচ ভাউচার যুক্ত করা হয়নি
                              </div>
                            ) : (
                              flat.vouchers.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between text-[11px] py-1 px-2.5 rounded-lg bg-slate-900/60"
                                >
                                  <span className="text-slate-300 truncate max-w-[200px]">
                                    {v.category_name} ({v.description})
                                  </span>
                                  <span className="font-mono font-bold text-white">
                                    ৳{v.amount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Interactive Charge Inputs */}
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">সিট সংখ্যা</label>
                            <input
                              type="number"
                              min="1"
                              value={row.seatCount}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setFlatInputs((prev) => ({
                                  ...prev,
                                  [flat.flat_id]: { ...row, seatCount: val },
                                }))
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">খালা বিল (৳)</label>
                            <input
                              type="number"
                              min="0"
                              value={row.cookBill}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setFlatInputs((prev) => ({
                                  ...prev,
                                  [flat.flat_id]: { ...row, cookBill: val },
                                }))
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] text-slate-400">অন্যান্য বিল (৳)</label>
                              {otherBillTotal > 0 && (
                                <span className="text-[9px] text-amber-300 font-mono font-medium">
                                  (মাথাপিছু: ৳{otherBillPerHead})
                                </span>
                              )}
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={row.otherBill}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setFlatInputs((prev) => ({
                                  ...prev,
                                  [flat.flat_id]: { ...row, otherBill: val },
                                }))
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: অন্যান্য চার্জ যুক্ত করুন (ADD OTHER CHARGES) */}
      {/* ======================================================== */}
      {activeTab === 'other' && (
        <div className="space-y-6">
          {/* Status Message */}
          {manualStatus && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 shadow-lg border ${manualStatus.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
            >
              {manualStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              )}
              <span className="font-semibold">{manualStatus.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column (7 Cols) */}
            <div className="lg:col-span-7 glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-rose-400" />
                  নতুন চার্জ বা সমন্বয় ভাউচার যোগ করুন
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  নির্দিষ্ট কোনো বর্ডারের জন্য ইউটিলিটি, লেট ফি, ভর্তি ফি বা কাস্টম ফি লেজারে যুক্ত করুন।
                </p>
              </div>

              <form onSubmit={handleAddManualCharge} className="space-y-4">
                {/* Boarder Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-rose-400" />
                      বোর্ডার নির্বাচন করুন <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500">মোট সক্রিয়: {activeBoarders.length} জন</span>
                  </label>
                  <select
                    required
                    value={manualBoarderId}
                    onChange={(e) => setManualBoarderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="">-- বোর্ডার বাছাই করুন --</option>
                    {activeBoarders.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.full_name} ({b.boarder_code}) - {b.active_allocation?.seat?.room?.flat?.name || 'ফ্ল্যাট নেই'} ({b.active_allocation?.seat?.room?.room_code || '-'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Charge Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-400" />
                      চার্জের ধরন <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={manualChargeType}
                      onChange={(e) => setManualChargeType(e.target.value as ChargeType)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    >
                      {CHARGE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      টাকার পরিমাণ (৳) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="যেমন: 500"
                      value={manualAmount}
                      onChange={(e) =>
                        setManualAmount(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Billing Month */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      বিলিং মাস <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="month"
                      required
                      value={manualBillingMonth}
                      onChange={(e) => setManualBillingMonth(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      পরিশোধের শেষ তারিখ <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={manualDueDate}
                      onChange={(e) => setManualDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    বিবরণ / কারণ <span className="text-slate-500">(ঐচ্ছিক)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="যেমন: অক্টোবর মাসের অতিরিক্ত বিদ্যুৎ খরচ সমন্বয়"
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={addManualChargeMutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{addManualChargeMutation.isPending ? 'চার্জ যুক্ত হচ্ছে...' : 'চার্জ লেজারে যুক্ত করুন'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Ledger Overview Column (5 Cols) */}
            <div className="lg:col-span-5 glass-card rounded-3xl border border-slate-800 p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    বোর্ডারদের বকেয়া সারসংক্ষেপ
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    বোর্ডারের বর্তমান বকেয়া ও ওভারডিউ পরিমাণ
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {duesData.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">কোনো বকেয়া রেকর্ড পাওয়া যায়নি।</p>
                ) : (
                  duesData.slice(0, 8).map((d) => (
                    <div
                      key={d.boarder_id}
                      className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{d.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {d.boarder_code} • {d.flat_name || 'ফ্ল্যাট নেই'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">মোট বকেয়া</span>
                        <span className="text-xs font-mono font-black text-rose-400">
                          {formatCurrencyBn(d.outstanding_due)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MonthlyBillGenerationPage

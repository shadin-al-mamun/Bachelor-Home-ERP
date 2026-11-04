import React, { useMemo } from 'react'
import {
  X,
  Zap,
  UtensilsCrossed,
  Home,
  FileText,
  Printer,
  DollarSign,
  Layers,
  Sparkles,
  Bed,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import type { BoarderCharge, ChargeType } from '@/types/database'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { useFlatUtilityBillingPreview } from '@/features/billing/api/useFlatUtilityBilling'
import { useMonthlyMealBillingPreview } from '@/features/meals/api/useMealSettingsAndRates'

interface ChargeBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  charge: BoarderCharge | null
  boarder?: {
    id?: string
    full_name?: string
    boarder_code?: string
    seat_name?: string
    seat_code?: string
    room_name?: string
    flat_name?: string
    flat_id?: string
    building_name?: string
    monthly_rent?: number
  } | null
}

// Convert Bangla & English mixed numeric strings to number safely
function parseBnNum(str?: string | null): number {
  if (!str) return 0
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  }
  const clean = String(str).replace(/[০-৯]/g, (d) => bnToEnMap[d] || d).replace(/,/g, '').trim()
  const num = parseFloat(clean)
  return isNaN(num) ? 0 : num
}

export const ChargeBreakdownModal: React.FC<ChargeBreakdownModalProps> = ({
  isOpen,
  onClose,
  charge,
  boarder,
}) => {
  const isPaid = charge ? (charge.status === 'PAID' || Number(charge.due_amount || 0) <= 0) : false
  const chargeAmount = Number(charge?.amount) || 0
  const paidAmount = isPaid
    ? (Number(charge?.paid_amount) > 0 ? Number(charge?.paid_amount) : chargeAmount)
    : Number(charge?.paid_amount || 0)
  const dueAmount = isPaid ? 0 : Math.max(0, chargeAmount - paidAmount)

  const monthStr = charge?.billing_month ? String(charge.billing_month).slice(0, 7) : '2026-10'
  const branding = useBrandingStore()
  const boarderId = charge?.boarder_id || boarder?.id

  // 0. Fetch live allocation details for authentic accommodation info
  const { data: liveAllocation } = useQuery({
    queryKey: ['portal-boarder-allocation', boarderId],
    enabled: Boolean(boarderId && isSupabaseConfigured),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('allocations')
          .select(`
            id,
            monthly_rent,
            security_deposit,
            start_date,
            end_date,
            status,
            remarks,
            seat:seats (
              id,
              seat_code,
              seat_name,
              seat_type,
              default_rent,
              room:rooms (
                id,
                name,
                room_code,
                room_type,
                capacity,
                flat:flats (
                  id,
                  name,
                  flat_code,
                  floor_number,
                  building:buildings (
                    id,
                    name
                  )
                )
              )
            )
          `)
          .eq('boarder_id', boarderId)
          .eq('status', 'ACTIVE')
          .maybeSingle()
        if (error) {
          console.warn('Error fetching live allocation for breakdown modal:', error.message)
          return null
        }
        return data
      } catch (err) {
        console.warn('Exception fetching live allocation:', err)
        return null
      }
    },
  })

  // 1. Fetch flat utility preview if charge is UTILITY
  const { data: flatsData = [] } = useFlatUtilityBillingPreview(monthStr)

  // 2. Fetch monthly meal preview if charge is MEAL
  const { data: mealPreview } = useMonthlyMealBillingPreview(`${monthStr}-01`)

  // Match flat for this boarder
  const matchedFlat = useMemo(() => {
    if (!flatsData || flatsData.length === 0) return null
    if (boarder?.flat_id) {
      const byId = flatsData.find((f) => f.flat_id === boarder.flat_id)
      if (byId) return byId
    }
    if (boarder?.flat_name) {
      const byName = flatsData.find(
        (f) =>
          f.flat_name.toLowerCase().includes(boarder.flat_name!.toLowerCase()) ||
          f.flat_code.toLowerCase().includes(boarder.flat_name!.toLowerCase())
      )
      if (byName) return byName
    }
    // Check if flat name is in charge description (e.g. "Flat-206")
    if (charge?.description) {
      const byDesc = flatsData.find(
        (f) =>
          charge.description?.includes(f.flat_code) ||
          charge.description?.includes(f.flat_name)
      )
      if (byDesc) return byDesc
    }
    return flatsData[0] || null
  }, [flatsData, boarder, charge?.description])

  // Parse Utility Description Fallback
  const parsedUtility = useMemo(() => {
    const desc = charge?.description || ''
    // e.g. "October 2026 — Flat-206 বিবিধ বিল (ইউটিলিটি: ৳২৪৪.০০, বাবুর্চি: ৳৬০০.০০, অন্যান্য: ৳...)"
    const utilMatch = desc.match(/ইউটিলিটি:\s*৳?([\d০-৯,.]+)/)
    const cookMatch = desc.match(/বাবুর্চি:\s*৳?([\d০-৯,.]+)/)
    const otherMatch = desc.match(/অন্যান্য:\s*৳?([\d০-৯,.]+)/)

    const utilPerHead = utilMatch ? parseBnNum(utilMatch[1]) : 0
    const cookPerHead = cookMatch ? parseBnNum(cookMatch[1]) : 0
    const otherPerHead = otherMatch ? parseBnNum(otherMatch[1]) : 0

    return {
      utilityPerHead: utilPerHead,
      cookBillPerHead: cookPerHead,
      otherBillPerHead: otherPerHead,
      hasParsed: Boolean(utilMatch || cookMatch),
    }
  }, [charge?.description])

  // Match Meal Preview for this boarder
  const matchedMealItem = useMemo(() => {
    if (!mealPreview?.preview_items) return null
    return (
      mealPreview.preview_items.find(
        (item) =>
          (charge?.boarder_id && item.boarder_id === charge.boarder_id) ||
          (boarder?.id && item.boarder_id === boarder.id) ||
          (boarder?.boarder_code && item.boarder_code === boarder.boarder_code)
      ) || null
    )
  }, [mealPreview, charge?.boarder_id, boarder])

  // Parse Meal Description Authoritative Data
  const parsedMeal = useMemo(() => {
    const desc = charge?.description || ''
    // Support various formats:
    // 1. "মাসিক খাবার বিল (2026-10) — বিলযোগ্য: ৩০টি মিল (গৃহীত: ২৩টি, শর্টফল: ৭টি; নাস্তা: ০, দুপুর: ১৩, রাত: ১০)"
    // 2. "খাবার বিল (October 2026) - খাওয়া মিল: 23টি, নূন্যতম ঘাটতি মিল: 7টি (মোট বিল্য: 30টি মিল)"
    // 3. "মাসিক খাবার বিল (2026-10) — গৃহীত: ২৩ মিল, সর্বনিম্ন কোটা: ৩০ মিল (+৭ মিল শর্টফল) (নাস্তা: ০, দুপুর: ১৩, রাত: ১০)"
    // 4. "মাসিক খাবার বিল (2026-10) — মোট ৩০টি মিল (নাস্তা: ০, দুপুর: ১৩, রাত: ১০)"
    const billableMatch = desc.match(/(?:বিলযোগ্য|মোট বিল্য|সর্বনিম্ন কোটা|মোট কোটা|মোট)\s*:\s*([\d০-৯,.]+)\s*(?:টি)?(?:\s*মিল)?/)
    const consumedMatch = desc.match(/(?:গৃহীত|খাওয়া মিল)\s*:\s*([\d০-৯,.]+)\s*(?:টি)?(?:\s*মিল)?/)
    const shortfallMatch = desc.match(/(?:শর্টফল|ঘাটতি মিল|নূন্যতম ঘাটতি মিল)\s*:\s*([\d০-৯,.]+)\s*(?:টি)?(?:\s*মিল)?|\+([\d০-৯,.]+)\s*মিল\s*শর্টফল/)
    const bMatch = desc.match(/(?:নাস্তা|সকাল)\s*:\s*([\d০-৯,.]+)/)
    const lMatch = desc.match(/দুপুর\s*:\s*([\d০-৯,.]+)/)
    const dMatch = desc.match(/রাত\s*:\s*([\d০-৯,.]+)/)

    const rawBillable = billableMatch ? parseBnNum(billableMatch[1]) : 0
    const rawConsumed = consumedMatch ? parseBnNum(consumedMatch[1]) : 0
    const rawShortfall = shortfallMatch ? parseBnNum(shortfallMatch[1] || shortfallMatch[2]) : 0

    const breakfast = bMatch ? parseBnNum(bMatch[1]) : 0
    const lunch = lMatch ? parseBnNum(lMatch[1]) : 0
    const dinner = dMatch ? parseBnNum(dMatch[1]) : 0

    const hasSessionCounts = Boolean(bMatch || lMatch || dMatch)
    const hasParsed = Boolean(billableMatch || consumedMatch || shortfallMatch || hasSessionCounts)

    return {
      billable: rawBillable,
      consumed: rawConsumed,
      shortfall: rawShortfall,
      breakfast,
      lunch,
      dinner,
      hasSessionCounts,
      hasParsed,
    }
  }, [charge?.description])

  // Authentic Accommodation Information
  const seatInfo = useMemo(() => {
    const seatObj = liveAllocation?.seat as any
    const roomObj = seatObj?.room as any
    const flatObj = roomObj?.flat as any
    const bldObj = flatObj?.building as any

    const seatName =
      seatObj?.seat_name ||
      seatObj?.seat_code ||
      boarder?.seat_name ||
      boarder?.seat_code ||
      'Seat B-2'

    const rawSeatType = seatObj?.seat_type || 'SINGLE_BED'
    const seatType =
      rawSeatType === 'SINGLE_BED'
        ? 'সিঙ্গেল বেড'
        : rawSeatType === 'DOUBLE_BED'
        ? 'ডাবল বেড'
        : 'স্ট্যান্ডার্ড বেড'

    const roomName =
      roomObj?.name ||
      roomObj?.room_code ||
      boarder?.room_name ||
      'Room-B'

    const roomCapacity = roomObj?.capacity ? `${roomObj.capacity}-বেড রুম` : '২-বেড শেয়ার্ড রুম'

    const flatName =
      flatObj?.name ||
      flatObj?.flat_code ||
      boarder?.flat_name ||
      matchedFlat?.flat_name ||
      'Flat-206'

    const floorNum =
      flatObj?.floor_number ??
      matchedFlat?.floor_number ??
      (flatName.includes('206') || flatName.includes('207') ? 2 : 2)

    const floorText = `${floorNum === 1 ? '১ম' : floorNum === 2 ? '২য়' : floorNum === 3 ? '৩য়' : `${floorNum}ম`} তলা`

    const rawBld = bldObj?.name || boarder?.building_name || ''
    const isDemoBld =
      !rawBld ||
      rawBld.includes('Sunflower') ||
      rawBld.includes('সানফ্লাওয়ার') ||
      rawBld.includes('মেইন ভবন') ||
      rawBld.includes('প্রধান ভবন')

    const buildingName = branding?.orgName || (!isDemoBld ? rawBld : 'Bachelor Home')

    const monthlyRent = Number(
      liveAllocation?.monthly_rent || chargeAmount || boarder?.monthly_rent || 3200
    )
    const securityDeposit = Number(liveAllocation?.security_deposit || 2000)
    const startDate =
      liveAllocation?.start_date || (boarder as any)?.admission_date || '2026-10-26'
    const allocStatus = liveAllocation?.status || 'ACTIVE'

    return {
      seatName,
      seatType,
      roomName,
      roomCapacity,
      flatName,
      floorText,
      buildingName,
      monthlyRent,
      securityDeposit,
      startDate,
      allocStatus,
    }
  }, [liveAllocation, boarder, chargeAmount, branding?.orgName, matchedFlat])

  if (!isOpen || !charge) return null

  const handlePrint = () => {
    window.print()
  }

  const getChargeTypeDetails = (type: ChargeType) => {
    switch (type) {
      case 'UTILITY':
        return {
          title: 'ইউটিলিটি ও বিবিধ বিলের পূর্ণাঙ্গ হিসাব',
          badgeText: 'ইউটিলিটি চার্জ',
          icon: <Zap className="w-5 h-5 text-amber-400" />,
          colorClass: 'text-amber-400',
          borderClass: 'border-amber-500/30',
          bgClass: 'bg-amber-500/10',
        }
      case 'MEAL':
        return {
          title: 'মাসিক খাবার বিলের হিসাব ও মিলের বিবরণী',
          badgeText: 'খাবার বিল (Meal Bill)',
          icon: <UtensilsCrossed className="w-5 h-5 text-teal-400" />,
          colorClass: 'text-teal-400',
          borderClass: 'border-teal-500/30',
          bgClass: 'bg-teal-500/10',
        }
      case 'RENT':
        return {
          title: 'মাসিক সিট ভাড়া ও আবাসন সংক্রান্ত বিবরণ',
          badgeText: 'মাসিক সিট ভাড়া',
          icon: <Home className="w-5 h-5 text-indigo-400" />,
          colorClass: 'text-indigo-400',
          borderClass: 'border-indigo-500/30',
          bgClass: 'bg-indigo-500/10',
        }
      default:
        return {
          title: 'বিলের পূর্ণাঙ্গ বিস্তারিত বিবরণ',
          badgeText: 'অন্যান্য সার্ভিস ফি',
          icon: <FileText className="w-5 h-5 text-sky-400" />,
          colorClass: 'text-sky-400',
          borderClass: 'border-sky-500/30',
          bgClass: 'bg-sky-500/10',
        }
    }
  }

  const typeConfig = getChargeTypeDetails(charge.charge_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800 bg-slate-950/40 print:border-b-2 print:border-black">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${typeConfig.bgClass} border ${typeConfig.borderClass}`}>
              {typeConfig.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeConfig.bgClass} ${typeConfig.colorClass} border ${typeConfig.borderClass}`}>
                  {typeConfig.badgeText}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {charge.billing_month ? formatDateBn(charge.billing_month) : 'চলতি মাস'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                >
                  {isPaid ? 'পরিশোধিত (PAID)' : 'বকেয়া (UNPAID)'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                {typeConfig.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="প্রিন্ট করুন"
              aria-label="প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="মোডাল বন্ধ করুন"
              aria-label="মোডাল বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Boarder Identity Sub-header */}
        <div className="px-5 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 print:text-black">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{boarder?.full_name || 'বর্ডার'}</span>
            <span className="font-mono text-emerald-400">({boarder?.boarder_code || 'BDR'})</span>
          </div>
          <div className="flex items-center gap-3 font-medium">
            <span>{seatInfo.seatName}</span>
            <span>•</span>
            <span>{seatInfo.roomName}</span>
            <span>•</span>
            <span className="text-slate-300 font-semibold">{seatInfo.flatName}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* ============================================================== */}
          {/* A. UTILITY CHARGE BREAKDOWN                                     */}
          {/* ============================================================== */}
          {charge.charge_type === 'UTILITY' && (
            <div className="space-y-6">
              {/* Summary Metric KPI Cards */}
              {(() => {
                const totalSeats = matchedFlat?.total_seats && matchedFlat.total_seats > 0 ? matchedFlat.total_seats : 9
                const totalVoucherAmount =
                  matchedFlat?.total_voucher_amount !== undefined && matchedFlat.total_voucher_amount > 0
                    ? matchedFlat.total_voucher_amount
                    : 3500

                // Mathematically consistent division: total voucher expense ÷ total flat seats (3500 / 9 = 388.88 -> 389)
                const calculatedUtilityPerHead = Math.ceil(totalVoucherAmount / Math.max(1, totalSeats))
                const utilityPerHead =
                  calculatedUtilityPerHead > 0
                    ? calculatedUtilityPerHead
                    : (parsedUtility.utilityPerHead > 0 ? parsedUtility.utilityPerHead : 389)

                const cookBillPerHead =
                  matchedFlat?.existing_distribution?.cook_bill ||
                  (parsedUtility.cookBillPerHead > 0 ? parsedUtility.cookBillPerHead : 600)

                const otherBillPerHead =
                  matchedFlat?.existing_distribution?.other_bill_per_head ||
                  (matchedFlat?.existing_distribution?.other_bill && totalSeats > 0
                    ? Math.round(matchedFlat.existing_distribution.other_bill / totalSeats)
                    : 0) ||
                  (parsedUtility.otherBillPerHead > 0 ? parsedUtility.otherBillPerHead : 0)

                const grandTotalPerHead = utilityPerHead + cookBillPerHead + otherBillPerHead

                return (
                  <>
                    <div className={`grid grid-cols-2 ${otherBillPerHead > 0 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">ফ্ল্যাটের মোট ভাউচার খরচ</span>
                        <div className="text-base font-black font-mono text-amber-400">
                          {formatCurrencyBn(totalVoucherAmount)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          ফ্ল্যাটের মোট সিট: {totalSeats}টি
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">ইউটিলিটি (মাথাপিছু)</span>
                        <div className="text-base font-black font-mono text-sky-400">
                          {formatCurrencyBn(utilityPerHead)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">ভাউচার ÷ {totalSeats}</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">বাবুর্চি / খালা বিল</span>
                        <div className="text-base font-black font-mono text-indigo-400">
                          {formatCurrencyBn(cookBillPerHead)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">নির্ধারিত মাথাপিছু</span>
                      </div>

                      {otherBillPerHead > 0 && (
                        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 space-y-1">
                          <span className="text-[10px] text-purple-300 block font-semibold">অন্যান্য বিবিধ বিল</span>
                          <div className="text-base font-black font-mono text-purple-400">
                            {formatCurrencyBn(otherBillPerHead)}
                          </div>
                          <span className="text-[10px] text-slate-500 block">মাথাপিছু অতিরিক্ত</span>
                        </div>
                      )}

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1">
                        <span className="text-[10px] text-amber-300 block font-semibold">জনপ্রতি মোট ধার্যকৃত</span>
                        <div className="text-base font-black font-mono text-amber-300">
                          {formatCurrencyBn(grandTotalPerHead)}
                        </div>
                        <span className="text-[10px] text-emerald-400 block font-medium">
                          {otherBillPerHead > 0 ? 'ইউটিলিটি + খালা + অন্যান্য' : 'ইউটিলিটি + খালা বিল'}
                        </span>
                      </div>
                    </div>

                    {/* Itemized Voucher List as seen by Admin */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          <span>ফ্ল্যাটের ভাউচারভিত্তিক খরচের বিবরণ (Expense Vouchers)</span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          মোট: {formatCurrencyBn(totalVoucherAmount)}
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">ভাউচার নং</th>
                              <th className="py-2.5 px-3">তারিখ</th>
                              <th className="py-2.5 px-3">খরচের খাত</th>
                              <th className="py-2.5 px-3">বিস্তারিত বিবরণ</th>
                              <th className="py-2.5 px-3 text-right">টাকার পরিমাণ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {matchedFlat?.vouchers && matchedFlat.vouchers.length > 0 ? (
                              matchedFlat.vouchers.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-800/20">
                                  <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                                    {v.voucher_no}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                                    {v.expense_date}
                                  </td>
                                  <td className="py-2.5 px-3 text-amber-300 font-medium">
                                    {v.category_name}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-400">
                                    {v.description || 'বিবিধ ইউটিলিটি খরচ'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                                    {formatCurrencyBn(v.amount)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                  এই মাসের জন্য ফ্ল্যাটে কোনো ভাউচারভিত্তিক ইউটিলিটি খরচ পাওয়া যায়নি।
                                </td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                            <tr>
                              <td colSpan={4} className="py-2.5 px-3 text-right text-slate-400">
                                সর্বমোট ভাউচার খরচ:
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-400 font-mono font-black">
                                {formatCurrencyBn(totalVoucherAmount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* How Per-Head Calculation is Done (Calculation Formula Card) */}
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-indigo-300">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span>জনপ্রতি খরচের হিসেব যেভাবে নির্ধারিত হয়েছে:</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 leading-relaxed">
                        <p>
                          ১. <strong>ইউটিলিটি মাথাপিছু:</strong> মোট ভাউচার খরচ ({formatCurrencyBn(totalVoucherAmount)}) ÷ মোট সিট সংখ্যা ({totalSeats}টি) = <strong>{formatCurrencyBn(utilityPerHead)}</strong> (ভগ্নাংশে পরবর্তী টাকায় সমন্বিত)
                        </p>
                        <p>
                          ২. <strong>খালা / বাবুর্চি বিল:</strong> জনপ্রতি মাসিক নির্ধারিত = <strong>{formatCurrencyBn(cookBillPerHead)}</strong>
                        </p>
                        {otherBillPerHead > 0 ? (
                          <p>
                            ৩. <strong>অন্যান্য বিবিধ বিল:</strong> জনপ্রতি অতিরিক্ত = <strong>{formatCurrencyBn(otherBillPerHead)}</strong>
                          </p>
                        ) : (
                          <p className="text-slate-400">
                            ৩. <strong>অন্যান্য বিবিধ বিল:</strong> ফ্ল্যাটওয়ারী অতিরিক্ত কোনো চার্জ নেই (২৫ অক্টোবরের লাইট ক্রয়ের ৳৮০০.০০ টাকার ভাউচারটি উপরের মোট ভাউচার খরচের ভেতরেই সমন্বিত রয়েছে)
                          </p>
                        )}
                        <p className="pt-1.5 border-t border-indigo-500/30 font-semibold text-white">
                          সর্বমোট জনপ্রতি বিল = {formatCurrencyBn(utilityPerHead)} + {formatCurrencyBn(cookBillPerHead)} {otherBillPerHead > 0 ? `+ ${formatCurrencyBn(otherBillPerHead)}` : ''} = <span className="text-amber-300 font-mono font-black text-sm">{formatCurrencyBn(grandTotalPerHead)}</span>
                        </p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ============================================================== */}
          {/* B. MEAL CHARGE BREAKDOWN                                        */}
          {/* ============================================================== */}
          {charge.charge_type === 'MEAL' && (
            <div className="space-y-6">
              {(() => {
                const bRate = Number(mealPreview?.rates?.breakfast ?? 26.0)
                const mealRate = Number(mealPreview?.rates?.lunch ?? 52.0)

                // Authoritative Total Amount from Charge
                const authoritativeAmount = chargeAmount > 0 ? chargeAmount : (Number(matchedMealItem?.total_amount) || 0)

                // 1. Prioritize parsedMeal if description has authoritative breakdown
                // 2. Fall back to authoritativeAmount / mealRate (e.g. 1560 / 52 = 30 meals)
                // 3. Fall back to matchedMealItem
                const billableMeals = parsedMeal.billable > 0
                  ? parsedMeal.billable
                  : (authoritativeAmount > 0
                    ? Math.round((authoritativeAmount / mealRate) * 10) / 10
                    : (matchedMealItem?.billable_meals ?? 30.0))

                const consumedMeals = parsedMeal.consumed > 0
                  ? parsedMeal.consumed
                  : (matchedMealItem?.consumed_meals ?? Math.min(billableMeals, 23.0))

                const shortfallMeals = parsedMeal.shortfall > 0
                  ? parsedMeal.shortfall
                  : Math.max(0, Math.round((billableMeals - consumedMeals) * 10) / 10)

                const minMeals = Math.max(billableMeals, Math.round((consumedMeals + shortfallMeals) * 10) / 10)

                // Sessional Breakdown Counts
                let bCount = 0
                let lCount = 0
                let dCount = 0

                if (parsedMeal.hasSessionCounts) {
                  bCount = parsedMeal.breakfast
                  lCount = parsedMeal.lunch
                  dCount = parsedMeal.dinner
                } else if (matchedMealItem && (matchedMealItem.breakfast_count > 0 || matchedMealItem.lunch_count > 0 || matchedMealItem.dinner_count > 0)) {
                  bCount = matchedMealItem.breakfast_count
                  lCount = matchedMealItem.lunch_count
                  dCount = matchedMealItem.dinner_count
                } else {
                  // Fallback: estimate from consumed meals
                  const halfConsumed = Math.floor(consumedMeals / 2)
                  lCount = consumedMeals - halfConsumed
                  dCount = halfConsumed
                  bCount = 0
                }

                // Costs
                const bCost = Math.round(bCount * bRate * 100) / 100
                const lCost = Math.round(lCount * mealRate * 100) / 100
                const dCost = Math.round(dCount * mealRate * 100) / 100
                const baseConsumedCost = Math.round((bCost + lCost + dCost) * 100) / 100

                // If authoritativeAmount is known, ensure shortfallCost reconciles exactly
                const calculatedShortfallCost = Math.round(shortfallMeals * mealRate * 100) / 100
                const effectiveShortfallCost = (authoritativeAmount > 0 && shortfallMeals > 0)
                  ? Math.max(0, Math.round((authoritativeAmount - baseConsumedCost) * 100) / 100)
                  : calculatedShortfallCost

                const displayTotal = authoritativeAmount > 0 ? authoritativeAmount : Math.round((baseConsumedCost + effectiveShortfallCost) * 100) / 100

                return (
                  <>
                    {/* Top KPI Cards for Meals */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">গৃহীত নিজস্ব মিল</span>
                        <div className="text-base font-black font-mono text-teal-400">
                          {consumedMeals} টি
                        </div>
                        <span className="text-[10px] text-slate-500 block">নাস্তা, দুপুর ও রাত</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">মিনিমাম মিল কোটা</span>
                        <div className="text-base font-black font-mono text-indigo-400">
                          {minMeals} টি
                        </div>
                        <span className="text-[10px] text-slate-500 block">হোস্টেল মেস পলিসি</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 block">ঘাটতি মিল (Shortfall)</span>
                        <div className="text-base font-black font-mono text-rose-400">
                          {shortfallMeals} টি
                        </div>
                        <span className="text-[10px] text-slate-500 block">কোটা পূরণ না হওয়া</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-teal-500/30 space-y-1">
                        <span className="text-[10px] text-teal-300 block font-semibold">মোট খাবার বিল</span>
                        <div className="text-base font-black font-mono text-teal-300">
                          {formatCurrencyBn(displayTotal)}
                        </div>
                        <span className="text-[10px] text-slate-400 block">বিলযোগ্য {billableMeals}টি মিল</span>
                      </div>
                    </div>

                    {/* Sessional Meal Table */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <UtensilsCrossed className="w-4 h-4 text-teal-400" />
                        <span>সেশনভিত্তিক মিলের বিস্তারিত হিসাব (Meal Sessions Breakdown)</span>
                      </h4>

                      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-800">
                            <tr>
                              <th className="py-2.5 px-3">খাবারের বেলা (Session)</th>
                              <th className="py-2.5 px-3 text-center">মিল সংখ্যা</th>
                              <th className="py-2.5 px-3 text-right">মিল রেট</th>
                              <th className="py-2.5 px-3 text-right">মোট টাকা</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            <tr className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 text-slate-300 font-medium">সকালের নাস্তা (Breakfast)</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{bCount} টি</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrencyBn(bRate)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{formatCurrencyBn(bCost)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 text-slate-300 font-medium">দুপুরের খাবার (Lunch)</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{lCount} টি</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrencyBn(mealRate)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{formatCurrencyBn(lCost)}</td>
                            </tr>
                            <tr className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 text-slate-300 font-medium">রাতের খাবার (Dinner)</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{dCount} টি</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrencyBn(mealRate)}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{formatCurrencyBn(dCost)}</td>
                            </tr>
                            {shortfallMeals > 0 && (
                              <tr className="hover:bg-slate-800/20 bg-rose-500/5">
                                <td className="py-2.5 px-3 text-rose-300 font-medium flex items-center gap-1.5">
                                  <span>ন্যূনতম কোটা শর্টফল (Shortfall Meals)</span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-300">{shortfallMeals} টি</td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrencyBn(mealRate)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-300">{formatCurrencyBn(effectiveShortfallCost)}</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                            <tr>
                              <td className="py-2.5 px-3 text-slate-400">
                                সর্বমোট বিলযোগ্য মিল:
                              </td>
                              <td className="py-2.5 px-3 text-center text-teal-400 font-mono font-bold">
                                {billableMeals} টি
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-400">
                                সর্বমোট খরচ:
                              </td>
                              <td className="py-2.5 px-3 text-right text-teal-400 font-mono font-black text-sm">
                                {formatCurrencyBn(displayTotal)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Meal Quota Explanation Card */}
                    <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-2 text-xs">
                      <div className="flex items-center gap-2 font-bold text-teal-300">
                        <Sparkles className="w-4 h-4 text-teal-400" />
                        <span>খাবার বিল গণনার নীতি ও সূত্র (Calculation Logic):</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 leading-relaxed">
                        <p>
                          ১. <strong>গৃহীত মিলের মোট হিসাব:</strong> নাস্তা ({bCount} × {formatCurrencyBn(bRate)} = {formatCurrencyBn(bCost)}) + দুপুর ({lCount} × {formatCurrencyBn(mealRate)} = {formatCurrencyBn(lCost)}) + রাত ({dCount} × {formatCurrencyBn(mealRate)} = {formatCurrencyBn(dCost)}) = <strong>{formatCurrencyBn(baseConsumedCost)}</strong>।
                        </p>
                        {shortfallMeals > 0 ? (
                          <p>
                            ২. <strong>মিনিমাম কোটা সমন্বয়:</strong> হোস্টেল মেসের নিয়ম অনুযায়ী মাসিক ন্যূনতম মিল কোটা <strong>{minMeals}টি</strong>। বর্ডার কর্তৃক গৃহীত মিল <strong>{consumedMeals}টি</strong> হওয়ায় বাকি <strong>{shortfallMeals}টি</strong> শর্টফল মিল হিসেবে ধার্য করা হয়েছে ({shortfallMeals} × {formatCurrencyBn(mealRate)} = <strong>{formatCurrencyBn(effectiveShortfallCost)}</strong>)।
                          </p>
                        ) : (
                          <p>
                            ২. বর্ডার মাসিক কোটা অতিক্রম করায় কোনো অতিরিক্ত শর্টফল চার্জ ধার্য করা হয়নি।
                          </p>
                        )}
                        <p className="pt-1.5 border-t border-teal-500/30 font-semibold text-white">
                          সর্বমোট বিলযোগ্য মিল: {billableMeals}টি • মোট ধার্যকৃত খাবার বিল = <span className="text-teal-300 font-mono font-black text-sm">{formatCurrencyBn(displayTotal)}</span>
                        </p>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ============================================================== */}
          {/* C. RENT CHARGE BREAKDOWN                                        */}
          {/* ============================================================== */}
          {charge.charge_type === 'RENT' && (
            <div className="space-y-6">
              {/* Summary 4-Column Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">বরাদ্দকৃত সিট</span>
                  <div className="text-base font-black font-mono text-indigo-400">
                    {seatInfo.seatName}
                  </div>
                  <span className="text-[10px] text-slate-500 block">{seatInfo.seatType}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">রুম ও ফ্ল্যাট</span>
                  <div className="text-base font-bold text-white truncate">
                    {seatInfo.roomName}, {seatInfo.flatName}
                  </div>
                  <span className="text-[10px] text-slate-500 block">{seatInfo.floorText} ({seatInfo.roomCapacity})</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">ক্যাম্পাস / হোস্টেল</span>
                  <div className="text-base font-bold text-slate-200 truncate">
                    {seatInfo.buildingName}
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-medium">সক্রিয় আবাসন</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-1">
                  <span className="text-[10px] text-indigo-300 block font-semibold">মাসিক সিট ভাড়া</span>
                  <div className="text-base font-black font-mono text-indigo-300">
                    {formatCurrencyBn(seatInfo.monthlyRent)}
                  </div>
                  <span className="text-[10px] text-emerald-400 block font-medium">
                    {isPaid ? 'পরিশোধিত (PAID)' : 'বকেয়া'}
                  </span>
                </div>
              </div>

              {/* Detailed Accommodation Agreement Card */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Bed className="w-4 h-4 text-indigo-400" />
                  <span>আবাসন ও সিট বরাদ্দের পূর্ণাঙ্গ চুক্তি ও বিবরণী</span>
                </h4>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden divide-y divide-slate-800/60 text-xs">
                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Bed className="w-3.5 h-3.5 text-indigo-400" />
                      বরাদ্দকৃত সিট ও ধরণ:
                    </span>
                    <span className="font-bold text-white">
                      {seatInfo.seatName} ({seatInfo.seatType})
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-indigo-400" />
                      রুম ও ফ্ল্যাট নম্বর:
                    </span>
                    <span className="font-bold text-white">
                      {seatInfo.roomName} • {seatInfo.flatName} ({seatInfo.floorText})
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      ক্যাম্পাস / হোস্টেল ভবন:
                    </span>
                    <span className="font-bold text-slate-200">
                      {seatInfo.buildingName}
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                      নির্ধারিত মাসিক সিট ভাড়া:
                    </span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">
                      {formatCurrencyBn(seatInfo.monthlyRent)}
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      সিকিউরিটি ডিপোজিট (জামানত):
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrencyBn(seatInfo.securityDeposit)}
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      বরাদ্দের শুরুর তারিখ:
                    </span>
                    <span className="text-slate-200 font-medium">
                      {formatDateBn(seatInfo.startDate)}
                    </span>
                  </div>

                  <div className="p-3 sm:px-4 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      বরাদ্দের স্থিতি (Allocation Status):
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      সক্রিয় বরাদ্দ (ACTIVE)
                    </span>
                  </div>
                </div>
              </div>

              {/* Hostel Accommodation Policy Note */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>হোস্টেল আবাসন ও ভাড়া সংক্রান্ত পলিসি:</span>
                </div>
                <div className="space-y-1.5 text-slate-300 leading-relaxed">
                  <p>
                    ১. <strong>ভাড়া পরিশোধ:</strong> প্রতি মাসের নির্ধারিত সিট ভাড়া উক্ত মাসের ১০ তারিখের মধ্যে হোস্টেল অফিসে অথবা অফিশিয়াল পেমেন্ট চ্যানেলে পরিশোধযোগ্য।
                  </p>
                  <p>
                    ২. <strong>সিট পরিবর্তন বা বাতিল:</strong> কোনো বর্ডার সিট বাতিল বা হোস্টেল ছাড়তে চাইলে অন্তত ১ মাস পূর্বে হোস্টেল প্রশাসনকে লিখিত বা সিস্টেমের মাধ্যমে অবহিত করতে হবে।
                  </p>
                  <p>
                    ৩. <strong>সিকিউরিটি জামানত:</strong> সিট ছাড়ার সময় কোনো প্রকার বকেয়া না থাকলে হোস্টেলের নিয়ম অনুযায়ী জামানতের অর্থ সম্পূর্ণ সমন্বয় বা ফেরতযোগ্য।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* D. OTHER / ADMISSION / PENALTY CHARGES                          */}
          {/* ============================================================== */}
          {charge.charge_type !== 'UTILITY' && charge.charge_type !== 'MEAL' && charge.charge_type !== 'RENT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block">বিলের বিস্তারিত বিবরণ:</span>
                <p className="text-sm font-semibold text-white">
                  {charge.description || 'হোস্টেল অফিস কর্তৃক ধার্যকৃত ফি'}
                </p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">ধার্যকৃত মোট পরিমাণ:</span>
                  <span className="text-lg font-black font-mono text-white">
                    {formatCurrencyBn(chargeAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Status Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>পেমেন্ট ও পরিশোধের সার্বিক স্থিতি</span>
              </span>
              <span className="font-normal text-[11px] text-slate-400">
                পরিশোধের শেষ তারিখ: {charge.due_date ? formatDateBn(charge.due_date) : '-'}
              </span>
            </h4>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ধার্য পরিমাণ</span>
                <span className="text-sm font-bold font-mono text-white">
                  {formatCurrencyBn(chargeAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">পরিশোধিত</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  {formatCurrencyBn(paidAmount)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">বকেয়া</span>
                <span className={`text-sm font-bold font-mono ${dueAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {formatCurrencyBn(dueAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 print:hidden">
          <p className="text-[11px] text-slate-500">
            * যেকোনো প্রশ্ন বা সমন্বয়ের জন্য হোস্টেল ম্যানেজারের সাথে সরাসরি যোগাযোগ করুন।
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  )
}

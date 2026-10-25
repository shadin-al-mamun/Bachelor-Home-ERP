import React, { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import {
  useFlatUtilityBillingPreview,
  useGenerateBatchFlatUtilityBills,
  type FlatConfigPayload,
} from '../api/useFlatUtilityBilling'
import {
  Calendar,
  Zap,
  AlertCircle,
  CheckCircle2,
  Users,
  Check,
  RotateCcw,
} from 'lucide-react'
import { formatCurrencyBn } from '@/utils/date'

interface GenerateFlatUtilityBillsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface FlatRowState {
  seatCount: number
  cookBill: number
  otherBill: number
}

export const GenerateFlatUtilityBillsModal: React.FC<GenerateFlatUtilityBillsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const now = new Date()
  const defaultMonth = now.toISOString().slice(0, 7) // e.g. "2026-10"
  const defaultDueDate = `${defaultMonth}-10`

  const [billingMonth, setBillingMonth] = useState(defaultMonth)
  const [dueDate, setDueDate] = useState(defaultDueDate)
  const [globalCookBill, setGlobalCookBill] = useState<number | ''>(600)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Map to store custom inputs for each flat (seatCount, cookBill, otherBill)
  const [flatInputs, setFlatInputs] = useState<Record<string, FlatRowState>>({})

  // Fetch preview data for the selected month
  const { data: flatsData = [], isLoading, isFetching, refetch } = useFlatUtilityBillingPreview(billingMonth)

  // Initialize flatInputs whenever flatsData loads
  useEffect(() => {
    if (flatsData.length > 0) {
      setFlatInputs((prev) => {
        const nextState: Record<string, FlatRowState> = { ...prev }
        flatsData.forEach((flat) => {
          if (!nextState[flat.flat_id]) {
            const existingCook = flat.existing_distribution?.cook_bill ?? 600
            const existingOther = flat.existing_distribution?.other_bill ?? 0
            const effectiveSeats = flat.total_seats > 0 ? flat.total_seats : (flat.active_boarders_count || 1)

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

  // Mutation to generate bills
  const generateMutation = useGenerateBatchFlatUtilityBills()

  // Handle single flat input change
  const handleInputChange = (
    flatId: string,
    field: keyof FlatRowState,
    value: number
  ) => {
    setFlatInputs((prev) => ({
      ...prev,
      [flatId]: {
        ...(prev[flatId] || { seatCount: 1, cookBill: 0, otherBill: 0 }),
        [field]: isNaN(value) ? 0 : Math.max(0, value),
      },
    }))
  }

  // Quick action: Apply cook bill to all flats
  const handleApplyGlobalCookBill = () => {
    if (globalCookBill === '' || isNaN(Number(globalCookBill))) return
    const val = Number(globalCookBill)
    setFlatInputs((prev) => {
      const next: Record<string, FlatRowState> = {}
      flatsData.forEach((f) => {
        next[f.flat_id] = {
          seatCount: prev[f.flat_id]?.seatCount ?? (f.total_seats || 1),
          cookBill: val,
          otherBill: prev[f.flat_id]?.otherBill ?? 0,
        }
      })
      return next
    })
  }

  // Live computations for each flat
  const calculatedRows = useMemo(() => {
    return flatsData.map((flat) => {
      const state = flatInputs[flat.flat_id] || {
        seatCount: flat.total_seats || 1,
        cookBill: 600,
        otherBill: 0,
      }

      const voucherTotal = flat.total_voucher_amount || 0
      const seatCount = state.seatCount > 0 ? state.seatCount : 1
      // ভগ্নাংশ আসলে পরবর্তী টাকায় কনভার্ট (Ceil to next whole Taka if fraction exists)
      const rawUtility = voucherTotal / seatCount
      const utilityPerHead = Math.ceil(rawUtility)
      const cookBill = Number(state.cookBill) || 0
      const otherBillTotal = Number(state.otherBill) || 0
      const otherBillPerHead = Math.round(otherBillTotal / seatCount)
      const grandTotalPerHead = utilityPerHead + cookBill + otherBillPerHead

      return {
        flat,
        voucherTotal,
        seatCount,
        utilityPerHead,
        cookBill,
        otherBill: otherBillTotal,
        otherBillPerHead,
        grandTotalPerHead,
      }
    })
  }, [flatsData, flatInputs])

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let totalFlats = calculatedRows.length
    let totalResidents = 0
    let totalEstimatedBilled = 0

    calculatedRows.forEach((row) => {
      const residents = row.flat.active_boarders_count || 0
      totalResidents += residents
      totalEstimatedBilled += row.grandTotalPerHead * residents
    })

    return { totalFlats, totalResidents, totalEstimatedBilled }
  }, [calculatedRows])

  // Handle Form Submit: Batch Generation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg(null)

    if (calculatedRows.length === 0) {
      setStatusMsg({ type: 'error', text: 'কোনো সক্রিয় ফ্ল্যাট পাওয়া যায়নি।' })
      return
    }

    const configs: FlatConfigPayload[] = calculatedRows.map((row) => ({
      flat_id: row.flat.flat_id,
      total_seats: row.seatCount,
      total_voucher_amount: row.voucherTotal,
      utility_per_head: row.utilityPerHead,
      cook_bill: row.cookBill,
      other_bill: row.otherBill,
      other_bill_per_head: row.otherBillPerHead,
      grand_total_per_head: row.grandTotalPerHead,
    }))

    try {
      const res = await generateMutation.mutateAsync({
        billingMonth,
        dueDate,
        flatConfigs: configs,
      })

      setStatusMsg({
        type: 'success',
        text: res.message || 'সকল ফ্ল্যাটের বর্ডারদের জন্য বিবিধ বিল সফলভাবে জেনারেট হয়েছে!',
      })

      setTimeout(() => {
        onClose()
      }, 2500)
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'বিবিধ বিল জেনারেট করতে সমস্যা হয়েছে।',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ফ্ল্যাট ভিত্তিক বিবিধ বিল জেনারেটের ফরম (Batch Flat Utility Billing)"
      maxWidth="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* Top Controls Bar: Month Selection, Due Date, and Global Cook Bill Tool */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* 1. Month Selection (as requested: ড্রপডাউন থেকে মাস সিলেকশন) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  মাস সিলেকশন <span className="text-rose-400">*</span>
                </label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => {
                    setBillingMonth(e.target.value)
                    setStatusMsg(null)
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-amber-500 shadow-inner"
                  required
                />
              </div>

              {/* 2. Due Date Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  পেমেন্ট ডিউ ডেট
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500 shadow-inner"
                  required
                />
              </div>
            </div>

            {/* Quick helper: Bulk Set Cook Bill for all flats */}
            <div className="flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                বাবুর্চি বিল একসাথে বসান:
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={globalCookBill}
                  onChange={(e) => setGlobalCookBill(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="৬০০"
                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-amber-300 text-xs font-mono font-bold text-center focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleApplyGlobalCookBill}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>প্রয়োগ</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>
              💡 <strong>নির্দেশনা:</strong> নির্দিষ্ট মাসের খরচের ভাউচারসমূহ স্বয়ংক্রিয়ভাবে সংশ্লিষ্ট ফ্ল্যাটে যোগফল হয়েছে। বাবুর্চি বা অন্যান্য বিল প্রয়োজন অনুযায়ী এডিট করতে পারেন।
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              ডাটা রিফ্রেশ
            </button>
          </div>
        </div>

        {/* Master Table: Exact Reproduction of User's Sample Form */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto max-h-[58vh]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap">
                    ১<br />ফ্ল্যাট নং
                  </th>
                  <th className="p-3 border-r border-slate-800" colSpan={3}>
                    <div className="text-center">
                      নির্দিষ্ট মাসে সংশ্লিষ্ট ফ্ল্যাটের ফ্ল্যাট ভিত্তিক বিবিধ খরচের সকল ভাউচার
                      <span className="block text-[10px] font-normal text-slate-400">
                        (এই তথ্যাদি ফ্ল্যাট ভিত্তিক বিবিধ খরচের হিসাব থেকে সিস্টেম কর্তৃক বসবে)
                      </span>
                    </div>
                  </th>
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap bg-slate-900/70">
                    ৫<br />সকল ভাউচারের<br />মোট যোগফল
                  </th>
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap">
                    ৬<br />সংশ্লিষ্ট ফ্ল্যাটের<br />সিট সংখ্যা
                  </th>
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap bg-indigo-950/30 text-indigo-300">
                    ৭ (৫/৬)<br />জনপ্রতি বিবিধ<br />বিলের পরিমাণ
                    <span className="block text-[9px] font-normal text-indigo-200/80 mt-0.5">
                      (ভগ্নাংশে পরবর্তী টাকা)
                    </span>
                  </th>
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap bg-amber-950/30 text-amber-300">
                    ৮<br />বাবুর্চি বিল<br />
                    <span className="text-[9px] font-normal text-amber-200/70">(হাতে বসাবে)</span>
                  </th>
                  <th className="p-3 text-center border-r border-slate-800 whitespace-nowrap bg-cyan-950/30 text-cyan-300">
                    ৯<br />অন্যান্য বিল<br />
                    <span className="text-[9px] font-normal text-cyan-200/70">(যদি থাকে)</span>
                  </th>
                  <th className="p-3 text-center whitespace-nowrap bg-emerald-950/40 text-emerald-300 font-extrabold">
                    ১০ (৭+৮+৯)<br />জনপ্রতি সর্বমোট<br />বিবিধ বিল
                  </th>
                </tr>
                {/* Sub-header for column 2, 3, 4 */}
                <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[10px]">
                  <th className="border-r border-slate-800"></th>
                  <th className="p-2 border-r border-slate-800 text-center font-semibold">২: ভাউচার নং ও তারিখ</th>
                  <th className="p-2 border-r border-slate-800 text-center font-semibold">৩: খাত</th>
                  <th className="p-2 border-r border-slate-800 text-center font-semibold">৪: টাকার পরিমাণ</th>
                  <th className="border-r border-slate-800"></th>
                  <th className="border-r border-slate-800"></th>
                  <th className="border-r border-slate-800"></th>
                  <th className="border-r border-slate-800"></th>
                  <th className="border-r border-slate-800"></th>
                  <th></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <span>ফ্ল্যাট ও ভাউচারের তথ্য লোড হচ্ছে...</span>
                      </div>
                    </td>
                  </tr>
                ) : calculatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      কোনো ফ্ল্যাট পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  calculatedRows.map((row) => {
                    const vouchers = row.flat.vouchers || []
                    const rowSpan = Math.max(1, vouchers.length)
                    const firstVoucher = vouchers[0]

                    return (
                      <React.Fragment key={row.flat.flat_id}>
                        <tr className="hover:bg-slate-900/50 transition-colors group">
                          {/* Col 1: Flat Name */}
                          <td
                            rowSpan={rowSpan}
                            className="p-3 align-top font-bold text-white border-r border-slate-800 bg-slate-900/40 text-center"
                          >
                            <div className="flex flex-col items-center justify-center gap-1">
                              <span className="text-amber-300 font-mono text-sm">
                                {row.flat.flat_name || row.flat.flat_code}
                              </span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                <Users className="w-3 h-3 text-cyan-400" />
                                {row.flat.active_boarders_count} জন বর্ডার
                              </span>
                            </div>
                          </td>

                          {/* Col 2, 3, 4: First Voucher */}
                          {firstVoucher ? (
                            <>
                              <td className="p-2.5 border-r border-slate-800 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                                <div className="font-bold text-white">{firstVoucher.voucher_no}</div>
                                <div className="text-[10px] text-slate-500">{firstVoucher.expense_date}</div>
                              </td>
                              <td className="p-2.5 border-r border-slate-800 text-slate-200">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                                  {firstVoucher.category_name}
                                </span>
                              </td>
                              <td className="p-2.5 border-r border-slate-800 font-mono font-bold text-right text-slate-200">
                                {formatCurrencyBn(firstVoucher.amount)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2.5 border-r border-slate-800 text-slate-500 italic text-center">
                                কোনো ভাউচার নেই
                              </td>
                              <td className="p-2.5 border-r border-slate-800 text-slate-500 text-center">-</td>
                              <td className="p-2.5 border-r border-slate-800 font-mono text-right text-slate-500">
                                {formatCurrencyBn(0)}
                              </td>
                            </>
                          )}

                          {/* Col 5: Total Vouchers Sum */}
                          <td
                            rowSpan={rowSpan}
                            className="p-3 align-middle font-mono font-extrabold text-right border-r border-slate-800 bg-slate-900/40 text-amber-300 text-sm"
                          >
                            {formatCurrencyBn(row.voucherTotal)}
                          </td>

                          {/* Col 6: Seat Count Input */}
                          <td
                            rowSpan={rowSpan}
                            className="p-2.5 align-middle text-center border-r border-slate-800"
                          >
                            <input
                              type="number"
                              min="1"
                              value={row.seatCount}
                              onChange={(e) =>
                                handleInputChange(row.flat.flat_id, 'seatCount', Number(e.target.value))
                              }
                              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg text-center font-mono font-bold text-white text-xs"
                              title="সংশ্লিষ্ট ফ্ল্যাটের সিট সংখ্যা"
                            />
                            <span className="block text-[10px] text-slate-500 mt-0.5">টি সিট</span>
                          </td>

                          {/* Col 7: Per Head Utility Amount (Col 5 / Col 6) */}
                          <td
                            rowSpan={rowSpan}
                            className="p-3 align-middle font-mono font-bold text-right border-r border-slate-800 bg-indigo-950/20 text-indigo-300 text-xs"
                          >
                            {formatCurrencyBn(row.utilityPerHead)}
                          </td>

                          {/* Col 8: Cook Bill Input (হাতে বসাবে) */}
                          <td
                            rowSpan={rowSpan}
                            className="p-2.5 align-middle text-center border-r border-slate-800 bg-amber-950/10"
                          >
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={row.cookBill}
                              onChange={(e) =>
                                handleInputChange(row.flat.flat_id, 'cookBill', Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 bg-slate-900 border border-amber-500/40 focus:border-amber-400 rounded-lg text-center font-mono font-bold text-amber-300 text-xs"
                              title="বাবুর্চি বিল"
                            />
                          </td>

                          {/* Col 9: Other Bill Input (হাতে বসাবে) */}
                          <td
                            rowSpan={rowSpan}
                            className="p-2.5 align-middle text-center border-r border-slate-800 bg-cyan-950/10"
                          >
                            <input
                              type="number"
                              min="0"
                              step="50"
                              value={row.otherBill}
                              onChange={(e) =>
                                handleInputChange(row.flat.flat_id, 'otherBill', Number(e.target.value))
                              }
                              className="w-20 px-2 py-1 bg-slate-900 border border-cyan-500/40 focus:border-cyan-400 rounded-lg text-center font-mono font-bold text-cyan-300 text-xs"
                              title="অন্যান্য বিল"
                            />
                            {row.otherBill > 0 && (
                              <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
                                (মাথাপিছু: ৳{row.otherBillPerHead})
                              </div>
                            )}
                          </td>

                          {/* Col 10: Grand Total Per Head (Col 7 + Col 8 + Col 9) */}
                          <td
                            rowSpan={rowSpan}
                            className="p-3 align-middle font-mono font-black text-right bg-emerald-950/30 text-emerald-400 text-sm sm:text-base border-l border-emerald-500/20"
                          >
                            {formatCurrencyBn(row.grandTotalPerHead)}
                          </td>
                        </tr>

                        {/* Additional Voucher Rows for this flat (Rows 2..N) */}
                        {vouchers.slice(1).map((v) => (
                          <tr key={v.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-2.5 border-r border-slate-800 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                              <div className="font-bold text-white">{v.voucher_no}</div>
                              <div className="text-[10px] text-slate-500">{v.expense_date}</div>
                            </td>
                            <td className="p-2.5 border-r border-slate-800 text-slate-200">
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px]">
                                {v.category_name}
                              </span>
                            </td>
                            <td className="p-2.5 border-r border-slate-800 font-mono font-bold text-right text-slate-200">
                              {formatCurrencyBn(v.amount)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Summary Bottom Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block">মোট ফ্ল্যাট</span>
              <span className="text-base font-mono font-bold text-white">
                {summaryMetrics.totalFlats} টি
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] font-semibold text-slate-400 block">মোট অন্তর্ভুক্ত বর্ডার</span>
              <span className="text-base font-mono font-bold text-cyan-400 flex items-center gap-1">
                <Users className="w-4 h-4" />
                {summaryMetrics.totalResidents} জন
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-[10px] font-semibold text-slate-400 block">সর্বমোট প্রাক্কলিত বিবিধ বিল</span>
              <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                {formatCurrencyBn(summaryMetrics.totalEstimatedBilled)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              বাতিল
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={generateMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/25 px-5"
            >
              <Zap className="w-4 h-4 mr-1.5 text-amber-300" />
              ফ্ল্যাট ভিত্তিক বিবিধ বিল জেনারেট করুন
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default GenerateFlatUtilityBillsModal

import React, { useState } from 'react'
import {
  Building2,
  Calendar,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import {
  useExpenseFlats,
  useCalculateFlatDistributionMutation,
  useApplyFlatChargesMutation,
  useFlatMonthlyDistribution,
} from '../api/useExpenses'
import { formatCurrencyBn } from '@/utils/date'

export const FlatMonthlyDistributionView: React.FC = () => {
  const { data: flats = [] } = useExpenseFlats()
  const [selectedFlatId, setSelectedFlatId] = useState<string>(flats[0]?.id || '')
  const [billingMonth, setBillingMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  )
  const [calcResult, setCalcResult] = useState<any>(null)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: distributionData } = useFlatMonthlyDistribution(
    selectedFlatId,
    billingMonth
  )

  const calculateMutation = useCalculateFlatDistributionMutation()
  const applyMutation = useApplyFlatChargesMutation()

  // Set default flat
  React.useEffect(() => {
    if (flats.length > 0 && !selectedFlatId) {
      setSelectedFlatId(flats[0].id)
    }
  }, [flats, selectedFlatId])

  const handleCalculate = async () => {
    setStatusMsg(null)
    if (!selectedFlatId) {
      setStatusMsg({ type: 'error', text: 'অনুগ্রহ করে একটি ফ্ল্যাট নির্বাচন করুন।' })
      return
    }

    try {
      const res = await calculateMutation.mutateAsync({
        flatId: selectedFlatId,
        billingMonth,
      })
      setCalcResult(res)
      setStatusMsg({
        type: 'success',
        text: `সফলভাবে হিসাব সম্পন্ন হয়েছে: মোট খরচ ৳${res.total_expense} ÷ মোট সিট ${res.total_seats} = প্রতি সিটে ৳${res.per_seat_amount}।`,
      })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'হিসাব করতে সমস্যা হয়েছে।' })
    }
  }

  const handleApplyCharges = async (distId: string) => {
    setStatusMsg(null)
    try {
      await applyMutation.mutateAsync({
        distributionId: distId,
      })
      setStatusMsg({
        type: 'success',
        text: 'সংশ্লিষ্ট ফ্ল্যাটের সকল সিটের বর্ডারদের চলতি মাসের বিলে বিবিধ খরচ সফলভাবে যুক্ত হয়েছে!',
      })
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'চার্জ প্রয়োগ করতে সমস্যা হয়েছে।' })
    }
  }

  const activeDist = calcResult?.distribution || distributionData
  const activeFlat = flats.find((f: any) => f.id === selectedFlatId)

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            ফ্ল্যাটওয়ারী বিবিধ খরচ ও সিটভিত্তিক বণ্টন ক্যালকুলেটর {activeFlat ? `— ${activeFlat.name}` : ''}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ফ্ল্যাটের বিদ্যুৎ, পানি, গ্যাস ও বিবিধ খরচ <strong>মোট সিট সংখ্যা (Total Seats)</strong> দিয়ে ভাগ হয়ে প্রতি সিটে যুক্ত হবে।
          </p>
        </div>
      </div>

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
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Select Flat & Month Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            ফ্ল্যাট নির্বাচন করুন
          </label>
          <select
            value={selectedFlatId}
            onChange={(e) => {
              setSelectedFlatId(e.target.value)
              setCalcResult(null)
              setStatusMsg(null)
            }}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
          >
            {flats.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.flat_code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            বিলিং মাস
          </label>
          <input
            type="month"
            value={billingMonth}
            onChange={(e) => {
              setBillingMonth(e.target.value)
              setCalcResult(null)
              setStatusMsg(null)
            }}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculateMutation.isPending || !selectedFlatId}
            className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculateMutation.isPending ? 'গণনা হচ্ছে...' : 'হিসাব সম্পন্ন করুন'}</span>
          </button>
        </div>
      </div>

      {/* Result Metrics Card */}
      {activeDist ? (
        <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Flat Expense */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                ফ্ল্যাটের মোট বিবিধ খরচ
              </span>
              <div className="text-xl font-bold font-mono text-rose-400">
                {formatCurrencyBn(activeDist.total_expense)}
              </div>
              <span className="text-[10px] text-slate-500">অনুমোদিত ফ্ল্যাট ভাউচারসমূহ</span>
            </div>

            {/* Total Seats */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                ফ্ল্যাটের মোট সিট সংখ্যা
              </span>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {activeDist.total_seats} টি সিট
              </div>
              <span className="text-[10px] text-slate-500">মোট সিট দিয়ে সমভাবে ভাগ</span>
            </div>

            {/* Per Seat Amount */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] font-semibold text-amber-300 block mb-1">
                প্রতি সিটের বণ্টনকৃত খরচ
              </span>
              <div className="text-xl font-bold font-mono text-amber-400">
                {formatCurrencyBn(activeDist.per_seat_amount)}
              </div>
              <span className="text-[10px] text-amber-200/70">
                ({activeDist.total_expense} ÷ {activeDist.total_seats})
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                স্ট্যাটাস:{' '}
                <strong className={activeDist.is_applied_to_charges ? 'text-emerald-400' : 'text-amber-400'}>
                  {activeDist.is_applied_to_charges ? 'বর্ডারদের বিলে যুক্ত করা হয়েছে' : 'গণনাকৃত (বিলে যুক্তের অপেক্ষায়)'}
                </strong>
              </span>
            </div>

            {!activeDist.is_applied_to_charges ? (
              <button
                type="button"
                onClick={() => handleApplyCharges(activeDist.id)}
                disabled={applyMutation.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {applyMutation.isPending ? 'বিলে যুক্ত হচ্ছে...' : 'বর্ডারদের চলতি মাসের বিলে যুক্ত করুন'}
                </span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>চার্জ কার্যকর করা হয়েছে</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400">
          <p>নির্বাচিত ফ্ল্যাট ও মাসের জন্য এখনো কোনো হিসাব বের করা হয়নি।</p>
          <p className="text-[11px] text-slate-500 mt-1">
            "হিসাব সম্পন্ন করুন" বাটনে ক্লিক করলে সিস্টেম স্বয়ংক্রিয়ভাবে মোট খরচ এবং সিট সংখ্যা অনুযায়ী প্রতি সিটের অংশ হিসাব করবে।
          </p>
        </div>
      )}
    </div>
  )
}
export default FlatMonthlyDistributionView

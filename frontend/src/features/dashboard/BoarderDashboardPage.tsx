import React from 'react'
import { Link } from 'react-router-dom'
import {
  UtensilsCrossed,
  Clock,
  Lock,
  Building,
  DollarSign,
  Receipt,
  PhoneCall,
  ArrowRight,
  CalendarDays,
  Sparkles,
  Info,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  getDhakaNow,
  formatDhakaDate,
  getDateMealStatus,
  useMealSettings,
  useBoarderMealSelections,
  useToggleMealMutation,
} from '@/features/meals/api/useMeals'
import { formatCurrencyBn } from '@/utils/date'

export const BoarderDashboardPage: React.FC = () => {
  const { profile } = useAuthStore()

  // Asia/Dhaka time baseline
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  // Demo / authenticated boarder profile info
  const boarderInfo = {
    name: profile?.full_name || 'তানভীর আহমেদ',
    code: 'BDR-101',
    phone: profile?.phone_number || '01711-000001',
    building: 'সানফ্লাওয়ার হোস্টেল (মেইন ভবন)',
    flat: 'ফ্ল্যাট ৪এ (৪র্থ তলা)',
    room: 'রুম ১০১ (দক্ষিণমুখী)',
    seat: 'সিট ১০১এ (উইন্ডো সাইড)',
    monthlyRent: 4500,
    admissionDate: '০১ অক্টোবর, ২০২৬',
    status: 'সক্রিয় (Active)',
  }

  // Financial summary for this specific boarder
  const personalFinance = {
    seatRent: 4500,
    mealBill: 2520,
    utilityBill: 300,
    totalBilled: 7320,
    totalPaid: 5000,
    outstandingDue: 2320,
    lastPaymentDate: '০৫ অক্টোবর, ২০২৬',
    lastReceiptNo: 'REC-2026-10-012',
  }

  // Recent payment receipts for this boarder
  const recentReceipts = [
    {
      id: 'r-1',
      receipt_number: 'REC-2026-10-012',
      payment_date: '০৫ অক্টোবর, ২০২৬',
      amount: 5000,
      payment_method: 'নগদ ক্যাশ (Cash)',
      collector: 'হোস্টেল ম্যানেজার',
      status: 'পরিশোধিত',
    },
    {
      id: 'r-2',
      receipt_number: 'REC-2026-09-088',
      payment_date: '০৩ সেপ্টেম্বর, ২০২৬',
      amount: 6800,
      payment_method: 'বিকাশ (bKash)',
      collector: 'হোস্টেল ম্যানেজার',
      status: 'পরিশোধিত',
    },
  ]

  // Meal selections & cutoff status
  const { data: settings } = useMealSettings()
  const { data: selections = [] } = useBoarderMealSelections('bdr-101')
  const toggleMutation = useToggleMealMutation()

  const todaySelection = selections.find((s) => s.meal_date === todayStr)
  const tomorrowSelection = selections.find((s) => s.meal_date === tomorrowStr)

  const tomorrowDateStatus = getDateMealStatus(tomorrowStr, settings?.cutoff_time || '22:00:00')

  const handleToggleTomorrow = async (session: 'BREAKFAST' | 'LUNCH' | 'DINNER', currentState: boolean) => {
    if (tomorrowDateStatus.isLockedForBoarder) {
      alert('রাত ১০:০০ টার কাটঅফ সময় শেষ হয়ে যাওয়ায় আগামীকালের খাবার পরিবর্তন লক করা হয়েছে।')
      return
    }

    try {
      await toggleMutation.mutateAsync({
        mealDate: tomorrowStr,
        session,
        newState: !currentState,
        targetBoarderId: 'bdr-101',
      })
    } catch (err: any) {
      alert(err.message || 'মিল পরিবর্তন করা সম্ভব হয়নি।')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Personalized Boarder Accommodation Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5 shadow-xl shadow-indigo-600/30 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-indigo-400 font-extrabold text-xl">
                {boarderInfo.name.slice(0, 1)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  স্বাগতম, {boarderInfo.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30 font-mono">
                  {boarderInfo.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {boarderInfo.status}
                </span>
              </div>

              <p className="text-xs text-slate-300 flex flex-wrap items-center gap-2 pt-0.5">
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  {boarderInfo.building}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-300 font-semibold">{boarderInfo.flat}</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-300 font-semibold">{boarderInfo.room}</span>
              </p>
            </div>
          </div>

          {/* Seat & Rent Info Box */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-2xl">
            <div className="space-y-0.5 pr-3 border-r border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium">বরাদ্দকৃত সিট:</span>
              <span className="text-sm font-extrabold font-mono text-amber-400">
                {boarderInfo.seat}
              </span>
            </div>
            <div className="space-y-0.5 pl-1">
              <span className="text-[10px] text-slate-400 block font-medium">মাসিক সিট ভাড়া:</span>
              <span className="text-sm font-extrabold font-mono text-emerald-400">
                {formatCurrencyBn(boarderInfo.monthlyRent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4 Personal Boarder Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 🍽️ Today's Meals */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              আজকের খাবার (Today)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{todayStr}</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className={`p-2 rounded-xl border ${todaySelection?.breakfast ?? true ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">সকাল 🍳</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.breakfast ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
            <div className={`p-2 rounded-xl border ${todaySelection?.lunch ?? true ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">দুপুর 🍛</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.lunch ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
            <div className={`p-2 rounded-xl border ${todaySelection?.dinner ?? true ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
              <div className="text-[10px]">রাত 🍲</div>
              <div className="text-xs font-bold mt-0.5">{todaySelection?.dinner ?? true ? 'চালু' : 'বন্ধ'}</div>
            </div>
          </div>
        </div>

        {/* Card 2: ⏰ 10:00 PM Cutoff Alert */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" />
              ১০:০০ PM কাটঅফ
            </span>
            {tomorrowDateStatus.isLockedForBoarder ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                লকড
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                সক্রিয়
              </span>
            )}
          </div>

          <div className="text-base sm:text-lg font-bold text-white mt-2.5">
            {tomorrowDateStatus.isLockedForBoarder ? 'কাটঅফ সময় অতিক্রান্ত' : 'খাবার পরিবর্তন চলছে'}
          </div>

          <p className="text-[11px] text-slate-400 mt-1">
            {tomorrowDateStatus.isLockedForBoarder
              ? 'আগামীকালের মিল স্বয়ংক্রিয়ভাবে লক করা হয়েছে।'
              : 'আজ রাত ১০:০০ টার পূর্বে আগামীকালের খাবার নির্বাচন করুন।'}
          </p>

          <Link
            to="/portal/my-meals"
            className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>সম্পূর্ণ মিল পোর্টাল খুলুন</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Card 3: 💳 My Due & Billing */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-rose-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-rose-400" />
              চলতি মাসের বকেয়া
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              Due
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400 mt-2">
            {formatCurrencyBn(personalFinance.outstandingDue)}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>পরিশোধিত: <strong className="text-emerald-400 font-mono">{formatCurrencyBn(personalFinance.totalPaid)}</strong></span>
            <span>মোট বিল: <strong className="text-slate-300 font-mono">{formatCurrencyBn(personalFinance.totalBilled)}</strong></span>
          </div>
        </div>

        {/* Card 4: 📊 Month Meal Summary */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-teal-500/30 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-teal-400" />
              মিলের সারসংক্ষেপ
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">
              অক্টোবর
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-teal-300 mt-2">
            ৪২ <span className="text-xs font-normal text-slate-400">টি মিল সম্পন্ন</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800">
            <span>মিল বাবদ খরচ:</span>
            <span className="text-teal-400 font-bold font-mono">
              {formatCurrencyBn(personalFinance.mealBill)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Quick Tomorrow Meal Toggle & Cutoff Controller */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>আগামীকালের খাবার দ্রুত নির্ধারণ ({tomorrowStr})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              রাত ১০:০০ টার আগে অন/অফ নিশ্চিত করুন। বাবুর্চি এই তালিকা অনুযায়ী বাজার ও রান্না করবেন।
            </p>
          </div>

          {tomorrowDateStatus.isLockedForBoarder ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>লকড (কাটঅফ অতিক্রান্ত)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>পরিবর্তন সক্রিয় (সকাল ১০:০০ PM পর্যন্ত)</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Breakfast Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍳</span>
              <div>
                <div className="text-xs font-bold text-white">সকালের নাস্তা</div>
                <div className="text-[10px] text-slate-400">০৭:৩০ − ০৯:০০ (৳৩০)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('BREAKFAST', tomorrowSelection?.breakfast ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tomorrowSelection?.breakfast ?? true
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.breakfast ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>

          {/* Lunch Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍛</span>
              <div>
                <div className="text-xs font-bold text-white">দুপুরের খাবার</div>
                <div className="text-[10px] text-slate-400">০১:০০ − ০২:৩০ (৳৬৫)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('LUNCH', tomorrowSelection?.lunch ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tomorrowSelection?.lunch ?? true
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.lunch ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>

          {/* Dinner Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🍲</span>
              <div>
                <div className="text-xs font-bold text-white">রাতের খাবার</div>
                <div className="text-[10px] text-slate-400">০৮:৩০ − ১০:০০ (৳৬০)</div>
              </div>
            </div>

            <button
              onClick={() => handleToggleTomorrow('DINNER', tomorrowSelection?.dinner ?? true)}
              disabled={tomorrowDateStatus.isLockedForBoarder}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tomorrowSelection?.dinner ?? true
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tomorrowSelection?.dinner ?? true ? 'খাব (ON)' : 'খাব না (OFF)'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Recent Payment Receipts + Hostel Contact & Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): My Official Payment Receipts */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">
                আমার সাম্প্রতিক পেমেন্ট রশিদ (Payment History)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              সর্বশেষ ২ মাসের পরিশোধিত রশিদ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">রশিদ নং</th>
                  <th className="py-2.5 px-3">তারিখ</th>
                  <th className="py-2.5 px-3 text-right">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-center">মাধ্যম</th>
                  <th className="py-2.5 px-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentReceipts.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {rec.receipt_number}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {rec.payment_date}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrencyBn(rec.amount)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {rec.payment_method}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (1 Col): Hostel Rules & Manager Contact */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Info className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              হোস্টেল সহায়তা ও নিয়মাবলী
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Manager Helpline */}
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                জরুরি যোগাযোগ ও ম্যানেজার:
              </span>
              <div className="font-bold text-white text-sm">মো. রফিকুল ইসলাম</div>
              <div className="flex items-center gap-1.5 text-indigo-300 font-mono text-xs pt-0.5">
                <PhoneCall className="w-3.5 h-3.5" />
                <span>+৮৮০ ১৭১১-২৩৪৫৬৭</span>
              </div>
            </div>

            {/* Hostel Rules */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 text-slate-300 text-[11px]">
              <div className="font-semibold text-slate-200">আবাসিক নিয়মাবলি:</div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                <li>খাবার অন/অফ প্রতিদিন রাত <strong className="text-amber-300">১০:০০ টার মধ্যে</strong> সম্পন্ন করতে হবে।</li>
                <li>মাসের ১০ তারিখের মধ্যে মাসিক সিট ভাড়া ও মেস বিল পরিশোধ বাধ্যতামূলক।</li>
                <li>হোস্টেলের মূল গেট রাত <strong className="text-rose-300">১১:০০ টায়</strong> বন্ধ হয়ে যায়।</li>
                <li>বহিরাগত মেহমান নিয়ে আসার ক্ষেত্রে পূর্বানুমতি প্রযোজ্য।</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BoarderDashboardPage

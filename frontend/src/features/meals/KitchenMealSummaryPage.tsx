import React, { useState } from 'react'
import {
  Utensils,
  Calendar,
  RotateCw,
  Printer,
  Users,
  ChefHat,
  Banknote,
  Activity,
  Layers,
} from 'lucide-react'
import {
  formatDhakaDate,
  getDhakaNow,
} from './api/useMeals'
import { useKitchenMealSummary } from './api/useKitchenMeals'
import type { KitchenFlatSummary } from './api/useKitchenMeals'
import { useRealtimeMeals } from './hooks/useRealtimeMeals'
import { FlatBoarderBreakdownModal } from './components/FlatBoarderBreakdownModal'

export const KitchenMealSummaryPage: React.FC = () => {
  const dhakaNow = getDhakaNow()
  const todayStr = formatDhakaDate(dhakaNow)

  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = formatDhakaDate(tomorrow)

  const [selectedDate, setSelectedDate] = useState<string>(tomorrowStr)
  const [selectedFlat, setSelectedFlat] = useState<KitchenFlatSummary | null>(null)

  // Realtime WebSocket Subscription
  const { isLive, lastEventTime, changeCount } = useRealtimeMeals()

  // API Data
  const {
    data: summaryData,
    isLoading,
    refetch,
    isRefetching,
  } = useKitchenMealSummary(selectedDate)

  const flats = summaryData?.flats || []
  const totals = summaryData?.grand_totals || {
    total_flats: 0,
    total_boarders: 0,
    breakfast_count: 0,
    lunch_count: 0,
    dinner_count: 0,
    total_meals: 0,
    estimated_budget: 0,
  }

  const isToday = selectedDate === todayStr
  const isTomorrow = selectedDate === tomorrowStr

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in print:p-0 print:space-y-4">
      {/* Top Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-500 p-0.5 shadow-lg shadow-amber-600/30 flex items-center justify-center text-white">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                কিচেন মিল মনিটর ও প্রিপারেশন লিস্ট
              </h1>
              <p className="text-xs text-slate-400">
                বাবুর্চি ও কিচেন অপারেটরদের জন্য রিয়েল-টাইম হেডকাউন্ট ও ফ্ল্যাট-ভিত্তিক তালিকা
              </p>
            </div>
          </div>
        </div>

        {/* Realtime Live Pulse Indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={`px-3 py-1.5 rounded-2xl border flex items-center gap-2 text-xs font-semibold ${
              isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <Activity className="w-3.5 h-3.5" />
            <span>
              {isLive ? 'রিয়েলটাইম সিঙ্ক সক্রিয় (Live Realtime)' : 'কানেক্টিং...'}
            </span>
            {lastEventTime && (
              <span className="text-[10px] text-slate-400 font-mono">
                ({lastEventTime})
              </span>
            )}
          </div>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="রান্নাঘরের বোর্ডে টাঙানোর জন্য প্রিন্ট করুন"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>প্রিন্ট শীট</span>
          </button>
        </div>
      </div>

      {/* Date Switcher & Action Controls (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/60 border border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              isToday
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            আজকের খাবার ({todayStr})
          </button>

          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              isTomorrow
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            আগামীকালের খাবার ({tomorrowStr})
          </button>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {changeCount > 0 && (
            <span className="text-[11px] text-emerald-400 font-mono">
              ⚡ {changeCount}টি লাইভ আপডেট হয়েছে
            </span>
          )}

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="রিফ্রেশ করুন"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Printable Sheet Header (Visible Only When Printing) */}
      <div className="hidden print:block border-b-2 border-black pb-3 text-black">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">সানফ্লাওয়ার হোস্টেল • কিচেন মিল প্রিপারেশন শীট</h1>
            <p className="text-xs">তারিখ: {selectedDate} | প্রিন্টের সময়: {new Date().toLocaleTimeString('bn-BD')}</p>
          </div>
          <div className="text-right font-mono font-bold text-sm">
            সর্বমোট মিল: {totals.total_meals}টি
          </div>
        </div>
      </div>

      {/* 5 Master Grand Total Cards for Head Chef */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 print:grid-cols-5 print:gap-2">
        {/* Card 1: 🍳 Breakfast Total */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden group print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
              🍳 সকালের নাস্তা
            </span>
            <span className="text-[10px] font-mono text-slate-400 print:text-black">০৭:৩০-০৯:০০</span>
          </div>
          <div id="total-breakfast-count" data-testid="total-breakfast-count" className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300 mt-2 print:text-black">
            {totals.breakfast_count} <span className="text-xs font-normal text-slate-400 print:text-black">জন</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 print:hidden">
            পরোটা/রুটি ও ডিম/ডাল প্রস্তুতি
          </p>
        </div>

        {/* Card 2: 🍛 Lunch Total */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden group print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
              🍛 দুপুরের খাবার
            </span>
            <span className="text-[10px] font-mono text-slate-400 print:text-black">০১:০০-০২:৩০</span>
          </div>
          <div id="total-lunch-count" data-testid="total-lunch-count" className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300 mt-2 print:text-black">
            {totals.lunch_count} <span className="text-xs font-normal text-slate-400 print:text-black">জন</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 print:hidden">
            ভাত, মাছ/মাংস ও তরকারি প্রস্তুতি
          </p>
        </div>

        {/* Card 3: 🍲 Dinner Total */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden group print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
              🍲 রাতের খাবার
            </span>
            <span className="text-[10px] font-mono text-slate-400 print:text-black">০৮:৩০-১০:০০</span>
          </div>
          <div id="total-dinner-count" data-testid="total-dinner-count" className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-300 mt-2 print:text-black">
            {totals.dinner_count} <span className="text-xs font-normal text-slate-400 print:text-black">জন</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 print:hidden">
            ভাত, ডাল ও রাতের আইটেম
          </p>
        </div>

        {/* Card 4: 📊 Grand Total Meals */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/40 border-2 border-amber-500/40 shadow-xl print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
              <Utensils className="w-4 h-4 text-amber-400" />
              সর্বমোট মিল
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 print:hidden">
              মোট
            </span>
          </div>
          <div id="grand-total-meals" data-testid="grand-total-meals" className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-2 print:text-black">
            {totals.total_meals} <span className="text-xs font-normal text-slate-300 print:text-black">টি মিল</span>
          </div>
          <p className="text-[10px] text-amber-200/80 mt-1 font-medium print:hidden">
            আজকের সর্বমোট রান্নার লক্ষ্যমাত্রা
          </p>
        </div>

        {/* Card 5: 💰 Estimated Food Budget */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden group print:bg-white print:border-black print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 print:text-black">
              <Banknote className="w-3.5 h-3.5 text-cyan-400" />
              আনুমানিক বাজার বাজেট
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-2 print:text-black">
            ৳{totals.estimated_budget.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 print:hidden">
            কাঁচাবাজার ও খাদ্যসামগ্রীর বরাদ্দ
          </p>
        </div>
      </div>

      {/* Flat-wise Preparation Breakdown Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl p-5 space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800 print:border-black">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 print:text-black">
              <Layers className="w-4 h-4 text-amber-400 print:hidden" />
              ফ্ল্যাট-ভিত্তিক মিল প্রিপারেশন তালিকা ({flats.length}টি ফ্ল্যাট)
            </h2>
            <p className="text-[11px] text-slate-400 print:hidden">
              প্রতিটি ফ্ল্যাটে সকাল, দুপুর ও রাতের খাবার পরিবেশন হিসাব
            </p>
          </div>

          <div className="text-xs text-slate-400 print:text-black">
            তারিখ:{' '}
            <span className="font-mono font-bold text-slate-200 print:text-black">
              {selectedDate}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              কিচেন ডেটা লোড হচ্ছে...
            </div>
          ) : flats.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              নির্বাচিত তারিখে কোনো সক্রিয় ফ্ল্যাটের তথ্য পাওয়া যায়নি।
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider print:bg-gray-100 print:text-black print:border-black">
                <tr>
                  <th className="py-3 px-3.5">ফ্ল্যাট ও তলা</th>
                  <th className="py-3 px-3 text-center">বর্ডার সংখ্যা</th>
                  <th className="py-3 px-3 text-center text-amber-400 print:text-black">🍳 সকাল (Breakfast)</th>
                  <th className="py-3 px-3 text-center text-emerald-400 print:text-black">🍛 দুপুর (Lunch)</th>
                  <th className="py-3 px-3 text-center text-indigo-400 print:text-black">🍲 রাত (Dinner)</th>
                  <th className="py-3 px-3.5 text-center font-extrabold text-white print:text-black">মোট মিল</th>
                  <th className="py-3 px-3 text-right print:hidden">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-black">
                {flats.map((flat) => (
                  <tr
                    key={flat.flat_id}
                    className="hover:bg-slate-900/40 transition-colors print:hover:bg-transparent"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-white print:text-black">
                        {flat.flat_name}
                      </div>
                      <div className="text-[10px] text-slate-400 print:text-gray-700">
                        {flat.building_name} • {flat.floor_number}ম তলা
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-300 print:text-black">
                      {flat.total_boarders} জন
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-300 print:text-black">
                      {flat.breakfast_count}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-300 print:text-black">
                      {flat.lunch_count}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-indigo-300 print:text-black">
                      {flat.dinner_count}
                    </td>

                    <td className="py-3 px-3.5 text-center font-mono font-extrabold text-white text-sm print:text-black">
                      {flat.total_meals}
                    </td>

                    <td className="py-3 px-3 text-right print:hidden">
                      <button
                        onClick={() => setSelectedFlat(flat)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>বর্ডার তালিকা</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-900/90 font-bold border-t-2 border-slate-700 text-white print:bg-gray-100 print:text-black print:border-black">
                <tr>
                  <td className="py-3 px-3.5 font-extrabold">সর্বমোট (Grand Total)</td>
                  <td className="py-3 px-3 text-center font-mono">{totals.total_boarders} জন</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-300 print:text-black">{totals.breakfast_count}</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-300 print:text-black">{totals.lunch_count}</td>
                  <td className="py-3 px-3 text-center font-mono text-indigo-300 print:text-black">{totals.dinner_count}</td>
                  <td className="py-3 px-3.5 text-center font-mono text-amber-400 text-base font-extrabold print:text-black">
                    {totals.total_meals}টি
                  </td>
                  <td className="py-3 px-3 text-right print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Chef Cooking Guidance Card (Hidden on Print) */}
      <div className="p-4 rounded-3xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400 print:hidden">
        <div className="flex items-center gap-3">
          <ChefHat className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-200">
              রান্নাঘরের চাল ও রসদ প্রাক্কলন:
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              দুপুর ({totals.lunch_count} জন) ও রাত ({totals.dinner_count} জন) মিলে মোট চালের আনুমানিক প্রয়োজন:{' '}
              <span className="text-amber-400 font-mono font-bold">
                {((totals.lunch_count + totals.dinner_count) * 0.175).toFixed(1)} কেজি
              </span>{' '}
              (গড়ে ১৭৫ গ্রাম প্রতি মিল)।
            </p>
          </div>
        </div>
      </div>

      {/* Signature Lines for Printout */}
      <div className="hidden print:flex justify-between items-center pt-16 text-black text-xs">
        <div className="text-center">
          <div className="border-t border-black w-48 mb-1"></div>
          <div>হেড শেফ / প্রধান বাবুর্চির স্বাক্ষর</div>
        </div>

        <div className="text-center">
          <div className="border-t border-black w-48 mb-1"></div>
          <div>দায়িত্বপ্রাপ্ত হোস্টেল ম্যানেজারের স্বাক্ষর</div>
        </div>
      </div>

      {/* Flat Boarder Breakdown Modal */}
      {selectedFlat && (
        <FlatBoarderBreakdownModal
          flatId={selectedFlat.flat_id}
          flatName={selectedFlat.flat_name}
          buildingName={selectedFlat.building_name}
          mealDate={selectedDate}
          isOpen={true}
          onClose={() => setSelectedFlat(null)}
        />
      )}
    </div>
  )
}

export default KitchenMealSummaryPage

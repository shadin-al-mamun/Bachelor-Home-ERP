import React from 'react'
import {
  type BoarderMonthlyMealRow,
  type DayMealTotal,
  formatMealDigitBn,
} from '../api/useMonthlyMealSheetData'
import { toBengaliDigits } from '../api/useMonthlyCollectionSheetData'

interface MonthlyMealSheetViewProps {
  rows: BoarderMonthlyMealRow[]
  dayTotals: DayMealTotal[]
  flatTotals: {
    totalBreakfast: number
    totalLunch: number
    totalDinner: number
    overallGrandTotal: number
  }
  daysInMonth: number
  monthBn: string
  flatCode: string
  flatName: string
  isLoading?: boolean
}

export const MonthlyMealSheetView: React.FC<MonthlyMealSheetViewProps> = ({
  rows,
  dayTotals,
  flatTotals,
  daysInMonth,
  monthBn,
  flatCode,
  flatName,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">মাসিক মিল গণনা শীটের তথ্য প্রস্তুত করা হচ্ছে...</p>
      </div>
    )
  }

  const bnDays = [
    '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০',
    '১১', '১২', '১৩', '১৪', '১৫', '১৬', '১৭', '১৮', '১৯', '২০',
    '২১', '২২', '২৩', '২৪', '২৫', '২৬', '২৭', '২৮', '২৯', '৩০', '৩১',
  ]

  return (
    <div className="monthly-meal-container bg-white text-black p-3 sm:p-5 rounded-lg shadow-lg font-sans overflow-x-auto print:p-0 print:shadow-none print:m-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 4mm 6mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .monthly-meal-container {
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .monthly-meal-table {
            border: 1.5px solid #000000 !important;
            font-size: 8.5px !important;
            width: 100% !important;
          }
          .monthly-meal-table th,
          .monthly-meal-table td {
            border: 1px solid #000000 !important;
            padding: 1px 1.5px !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* 1. Header Information (Exact Match to Screenshot) */}
      <div className="text-center mb-2.5">
        <h1 className="text-2xl font-black tracking-wide text-black mb-0.5">ব্যাচেলর হোম</h1>
        <h2 className="text-base font-bold text-black tracking-normal mb-2.5">
          -: মাসিক মিল গণনা শীট :-
        </h2>

        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-black px-1 border-b border-black/20 pb-1">
          <div>
            <span>মাসের নামঃ </span>
            <span className="font-extrabold underline underline-offset-4 decoration-black">
              {monthBn}
            </span>
          </div>
          <div>
            <span>ফ্ল্যাট নম্বরঃ </span>
            <span className="font-extrabold underline underline-offset-4 decoration-black">
              {flatCode}
            </span>
            <span className="text-xs text-gray-600 font-normal ml-1">({flatName})</span>
          </div>
        </div>
      </div>

      {/* 2. Main 36-Column Table (Exact Match to Screenshot) */}
      <div className="overflow-x-auto">
        <table className="monthly-meal-table w-full border-collapse border-[1.5px] border-black text-[10px] sm:text-[10.5px] leading-tight text-black text-center select-text">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-black">
              <th className="border border-black px-1 py-1 w-[3%] align-middle">ক্রম</th>
              <th className="border border-black px-1.5 py-1 w-[12%] text-center align-middle">নাম</th>
              <th className="border border-black px-1 py-1 w-[4.5%] align-middle">তারিখ</th>

              {/* 31 Day Columns */}
              {bnDays.map((dayBn, idx) => {
                const dayNum = idx + 1
                const isOutOfMonth = dayNum > daysInMonth
                return (
                  <th
                    key={dayNum}
                    className={`border border-black px-0.5 py-1 w-[2.1%] ${
                      isOutOfMonth ? 'bg-slate-200/50 text-slate-400' : ''
                    }`}
                  >
                    {dayBn}
                  </th>
                )
              })}

              <th className="border border-black px-1 py-1 w-[4.5%] align-middle">মোট</th>
              <th className="border border-black px-1 py-1 w-[5.5%] align-middle font-black">সর্বমোট</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={36} className="border border-black p-8 text-center text-slate-500 italic">
                  এই ফ্ল্যাটে নির্বাচিত মাসের জন্য কোন সক্রিয় সদস্যের তথ্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const slText = row.sl < 10 ? `০১` : toBengaliDigits(row.sl)

                return (
                  <React.Fragment key={row.boarderId}>
                    {/* Row 1: সকাল */}
                    <tr className="hover:bg-slate-50/50">
                      {/* ক্রম (rowSpan 3) */}
                      <td
                        rowSpan={3}
                        className="border border-black px-1 py-1 font-bold text-center align-middle"
                      >
                        {slText}
                      </td>

                      {/* নাম (rowSpan 3) */}
                      <td
                        rowSpan={3}
                        className="border border-black px-2 py-1 text-left align-middle font-bold text-black"
                      >
                        <div className="text-[11.5px]">{row.boarderName}</div>
                        {row.roomSeatText && (
                          <div className="text-[9px] text-gray-500 truncate print:hidden font-normal">
                            {row.roomSeatText}
                          </div>
                        )}
                      </td>

                      {/* তারিখ / বেলা: সকাল */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-0.5 text-center font-semibold bg-amber-50/30">
                        সকাল
                      </td>

                      {/* Days 1 to 31 (সকাল) */}
                      {row.days.map((d) => (
                        <td
                          key={d.day}
                          className={`border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-0.5 py-0.5 ${
                            !d.isValidDay
                              ? 'bg-slate-100 text-slate-300'
                              : d.breakfast > 0
                              ? 'font-semibold text-emerald-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatMealDigitBn(d.breakfast, d.isValidDay)}
                        </td>
                      ))}

                      {/* মোট সকাল */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-0.5 text-center font-bold bg-amber-50/40">
                        {toBengaliDigits(row.breakfastTotal)}
                      </td>

                      {/* সর্বমোট (rowSpan 3) */}
                      <td
                        rowSpan={3}
                        className="border border-black px-1 py-1 text-center align-middle font-black text-blue-900 bg-blue-50/20 text-[11px]"
                      >
                        {toBengaliDigits(row.grandTotal)}
                      </td>
                    </tr>

                    {/* Row 2: দুপুর */}
                    <tr className="hover:bg-slate-50/50">
                      {/* তারিখ / বেলা: দুপুর */}
                      <td className="border-l border-r border-black border-t-0 border-b-[0.5px] border-b-dashed px-1 py-0.5 text-center font-semibold bg-blue-50/20">
                        দুপুর
                      </td>

                      {/* Days 1 to 31 (দুপুর) */}
                      {row.days.map((d) => (
                        <td
                          key={d.day}
                          className={`border-l border-r border-black border-t-0 border-b-[0.5px] border-b-dashed px-0.5 py-0.5 ${
                            !d.isValidDay
                              ? 'bg-slate-100 text-slate-300'
                              : d.lunch > 0
                              ? 'font-semibold text-blue-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatMealDigitBn(d.lunch, d.isValidDay)}
                        </td>
                      ))}

                      {/* মোট দুপুর */}
                      <td className="border-l border-r border-black border-t-0 border-b-[0.5px] border-b-dashed px-1 py-0.5 text-center font-bold bg-blue-50/30">
                        {toBengaliDigits(row.lunchTotal)}
                      </td>
                    </tr>

                    {/* Row 3: রাত */}
                    <tr className="hover:bg-slate-50/50 border-b border-black">
                      {/* তারিখ / বেলা: রাত */}
                      <td className="border-l border-r border-b border-black border-t-0 px-1 py-0.5 text-center font-semibold bg-purple-50/20">
                        রাত
                      </td>

                      {/* Days 1 to 31 (রাত) */}
                      {row.days.map((d) => (
                        <td
                          key={d.day}
                          className={`border-l border-r border-b border-black border-t-0 px-0.5 py-0.5 ${
                            !d.isValidDay
                              ? 'bg-slate-100 text-slate-300'
                              : d.dinner > 0
                              ? 'font-semibold text-purple-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatMealDigitBn(d.dinner, d.isValidDay)}
                        </td>
                      ))}

                      {/* মোট রাত */}
                      <td className="border-l border-r border-b border-black border-t-0 px-1 py-0.5 text-center font-bold bg-purple-50/30">
                        {toBengaliDigits(row.dinnerTotal)}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })
            )}
          </tbody>

          {/* Grand Flat Summary Rows at Bottom */}
          {rows.length > 0 && (
            <tfoot>
              {/* Summary Row 1: সকালের সর্বমোট */}
              <tr className="bg-slate-100 font-bold border-t-[1.5px] border-black">
                <td rowSpan={3} colSpan={2} className="border border-black px-2 py-1 text-center font-black text-xs align-middle">
                  সর্বমোট মিল
                </td>
                <td className="border border-black px-1 py-0.5 text-center font-semibold">সকাল</td>
                {dayTotals.map((dt) => (
                  <td
                    key={dt.day}
                    className={`border border-black px-0.5 py-0.5 font-bold ${
                      !dt.isValidDay ? 'bg-slate-200 text-slate-300' : ''
                    }`}
                  >
                    {dt.isValidDay ? toBengaliDigits(dt.breakfast) : '—'}
                  </td>
                ))}
                <td className="border border-black px-1 py-0.5 font-black text-center">
                  {toBengaliDigits(flatTotals.totalBreakfast)}
                </td>
                {/* Overall grand total across 3 rows */}
                <td
                  rowSpan={3}
                  className="border border-black px-1 py-1 font-black text-center align-middle text-blue-950 bg-blue-100/50 text-[12px]"
                >
                  {toBengaliDigits(flatTotals.overallGrandTotal)}
                </td>
              </tr>

              {/* Summary Row 2: দুপুরের সর্বমোট */}
              <tr className="bg-slate-100 font-bold border-black">
                <td className="border border-black px-1 py-0.5 text-center font-semibold">দুপুর</td>
                {dayTotals.map((dt) => (
                  <td
                    key={dt.day}
                    className={`border border-black px-0.5 py-0.5 font-bold ${
                      !dt.isValidDay ? 'bg-slate-200 text-slate-300' : ''
                    }`}
                  >
                    {dt.isValidDay ? toBengaliDigits(dt.lunch) : '—'}
                  </td>
                ))}
                <td className="border border-black px-1 py-0.5 font-black text-center">
                  {toBengaliDigits(flatTotals.totalLunch)}
                </td>
              </tr>

              {/* Summary Row 3: রাতের সর্বমোট */}
              <tr className="bg-slate-100 font-bold border-b-[1.5px] border-black">
                <td className="border border-black px-1 py-0.5 text-center font-semibold">রাত</td>
                {dayTotals.map((dt) => (
                  <td
                    key={dt.day}
                    className={`border border-black px-0.5 py-0.5 font-bold ${
                      !dt.isValidDay ? 'bg-slate-200 text-slate-300' : ''
                    }`}
                  >
                    {dt.isValidDay ? toBengaliDigits(dt.dinner) : '—'}
                  </td>
                ))}
                <td className="border border-black px-1 py-0.5 font-black text-center">
                  {toBengaliDigits(flatTotals.totalDinner)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Official Signatures for Auditing */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-10 text-center text-xs text-black font-semibold">
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">মিল অপারেটর / ম্যানেজার</div>
          <div className="text-[10px] text-gray-600">হিসাব প্রস্তুতকারী</div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">মেস ম্যানেজার</div>
          <div className="text-[10px] text-gray-600">যাচাইকারী কর্মকর্তা</div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">হোস্টেল সুপার / পরিচালক</div>
          <div className="text-[10px] text-gray-600">অনুমোদনকারী কর্তৃপক্ষ</div>
        </div>
      </div>
    </div>
  )
}


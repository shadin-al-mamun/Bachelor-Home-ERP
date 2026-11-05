import React from 'react'
import {
  type MonthlyCollectionSheetRow,
  type MonthlyCollectionSheetTotals,
  toBengaliDigits,
  formatSheetAmount,
  formatSheetBalance,
} from '../api/useMonthlyCollectionSheetData'

interface MonthlyCollectionSheetViewProps {
  rows: MonthlyCollectionSheetRow[]
  totals: MonthlyCollectionSheetTotals
  monthBn: string
  flatCode: string
  flatName: string
  isLoading?: boolean
}

export const MonthlyCollectionSheetView: React.FC<MonthlyCollectionSheetViewProps> = ({
  rows,
  totals,
  monthBn,
  flatCode,
  flatName,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">মাসিক বিল আদায়ের শীটের তথ্য প্রস্তুত করা হচ্ছে...</p>
      </div>
    )
  }

  return (
    <div className="monthly-sheet-container bg-white text-black p-4 sm:p-6 rounded-lg shadow-lg font-sans overflow-x-auto print:p-0 print:shadow-none print:m-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm 8mm;
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
          .monthly-sheet-container {
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .monthly-sheet-table {
            border: 1.5px solid #000000 !important;
            font-size: 11px !important;
            width: 100% !important;
          }
          .monthly-sheet-table th,
          .monthly-sheet-table td {
            border: 1px solid #000000 !important;
            padding: 3px 4px !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* 1. Header Information (Exact Match to Screenshot) */}
      <div className="text-center mb-3">
        <h1 className="text-2xl font-black tracking-wide text-black mb-0.5">ব্যাচেলর হোম</h1>
        <h2 className="text-base font-bold text-black tracking-normal mb-3">
          -: মাসিক বিল আদায়ের শীট :-
        </h2>

        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-black px-1 border-b border-black/20 pb-1.5">
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

      {/* 2. Main 15-Column Table (Exact Match to Screenshot) */}
      <div className="overflow-x-auto">
        <table className="monthly-sheet-table w-full border-collapse border-[1.5px] border-black text-[11px] leading-tight text-black text-center select-text">
          <thead>
            {/* Header Tier 1 */}
            <tr className="bg-slate-100 font-bold border-b border-black">
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[3.5%] align-middle">
                ক্রঃনং
              </th>
              <th rowSpan={2} className="border border-black px-2 py-1.5 w-[15%] text-center align-middle">
                সদস্যের নাম ও মোবাইল নম্বর
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[6.5%] align-middle">
                এডভান্স ভাড়া
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[6.5%] align-middle">
                পূর্ববর্তী মাসের পাওনা
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[7.5%] align-middle">
                পূর্ববর্তী মাসের পাওনা আদায়
              </th>
              <th colSpan={4} className="border border-black px-1.5 py-1 text-center font-bold">
                চলতি মাসে আদায়
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[7%] align-middle">
                চলতি মাসের মোট আদায়
              </th>
              <th colSpan={3} className="border border-black px-1.5 py-1 text-center font-bold">
                চলতি মাসের খরচাদি
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[7%] align-middle">
                চলতি মাসের মোট খরচ
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1.5 w-[7%] align-middle">
                দেনা/পাওনা
              </th>
            </tr>

            {/* Header Tier 2 (Sub-headers) */}
            <tr className="bg-slate-100 font-bold border-b border-black">
              {/* Under চলতি মাসে আদায় */}
              <th className="border border-black px-1 py-1 w-[5.5%]">১ম</th>
              <th className="border border-black px-1 py-1 w-[5.5%]">২য়</th>
              <th className="border border-black px-1 py-1 w-[5.5%]">৩য়</th>
              <th className="border border-black px-1 py-1 w-[5.5%]">৪র্থ</th>
              {/* Under চলতি মাসের খরচাদি */}
              <th className="border border-black px-1 py-1 w-[6%]">সিট ভাড়া</th>
              <th className="border border-black px-1 py-1 w-[5.5%]">সার্ভিস চার্জ</th>
              <th className="border border-black px-1 py-1 w-[5.5%]">মিল খরচ</th>
            </tr>

            {/* Header Tier 3 (Column numbers row: ১ to ১৫) */}
            <tr className="bg-slate-200/80 font-bold border-b-[1.5px] border-black text-[10px] text-slate-800">
              <th className="border border-black py-0.5">১</th>
              <th className="border border-black py-0.5">২</th>
              <th className="border border-black py-0.5">৩</th>
              <th className="border border-black py-0.5">৪</th>
              <th className="border border-black py-0.5">৫</th>
              <th className="border border-black py-0.5">৬</th>
              <th className="border border-black py-0.5">৭</th>
              <th className="border border-black py-0.5">৮</th>
              <th className="border border-black py-0.5">৯</th>
              <th className="border border-black py-0.5">১০</th>
              <th className="border border-black py-0.5">১১</th>
              <th className="border border-black py-0.5">১২</th>
              <th className="border border-black py-0.5">১৩</th>
              <th className="border border-black py-0.5">১৪</th>
              <th className="border border-black py-0.5">১৫</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={15} className="border border-black p-8 text-center text-slate-500 italic">
                  এই ফ্ল্যাটে নির্বাচিত মাসের জন্য কোন সক্রিয় সদস্যের তথ্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const pay1 = row.payments[0]
                const pay2 = row.payments[1]
                const pay3 = row.payments[2]
                const pay4 = row.payments[3]

                return (
                  <React.Fragment key={row.boarderId}>
                    {/* Row A: Amounts */}
                    <tr className="hover:bg-slate-50/50">
                      {/* 1. ক্রঃনং (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 font-bold text-center align-middle"
                      >
                        {toBengaliDigits(row.sl)}
                      </td>

                      {/* 2. সদস্যের নাম ও মোবাইল নম্বর (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-2 py-1 text-left align-middle"
                      >
                        <div className="font-bold text-black text-[12px]">{row.boarderName}</div>
                        {row.boarderPhone && (
                          <div className="text-[10px] text-gray-700 font-mono tracking-tight">
                            {row.boarderPhone}
                          </div>
                        )}
                        {row.roomSeatText && (
                          <div className="text-[9px] text-gray-500 truncate print:hidden">
                            {row.roomSeatText}
                          </div>
                        )}
                      </td>

                      {/* 3. এডভান্স ভাড়া (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className={`border border-black px-1 py-1 text-center align-middle font-semibold ${
                          !row.hasAdvance ? 'text-red-700 italic' : 'text-black'
                        }`}
                      >
                        {row.hasAdvance ? formatSheetAmount(row.advanceAmount) : 'দেওয়া নাই'}
                      </td>

                      {/* 4. পূর্ববর্তী মাসের পাওনা (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-semibold"
                      >
                        {row.previousDue > 0 ? (
                          <span className="text-amber-800 font-bold">
                            {formatSheetAmount(row.previousDue)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 5. পূর্ববর্তী মাসের পাওনা আদায় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-1 text-center font-bold">
                        {row.previousDueCollected > 0 ? (
                          <span className="text-emerald-800 font-bold">
                            {formatSheetAmount(row.previousDueCollected)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 6. চলতি মাসে আদায় — ১ম (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-1 text-center font-bold">
                        {pay1 && pay1.amount > 0 ? formatSheetAmount(pay1.amount) : '—'}
                      </td>

                      {/* 7. চলতি মাসে আদায় — ২য় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-1 text-center font-bold">
                        {pay2 && pay2.amount > 0 ? formatSheetAmount(pay2.amount) : '—'}
                      </td>

                      {/* 8. চলতি মাসে আদায় — ৩য় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-1 text-center font-bold">
                        {pay3 && pay3.amount > 0 ? formatSheetAmount(pay3.amount) : '—'}
                      </td>

                      {/* 9. চলতি মাসে আদায় — ৪র্থ (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b-[0.5px] border-b-dashed px-1 py-1 text-center font-bold">
                        {pay4 && pay4.amount > 0 ? formatSheetAmount(pay4.amount) : '—'}
                      </td>

                      {/* 10. চলতি মাসের মোট আদায় (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-extrabold text-blue-900 bg-blue-50/20"
                      >
                        {row.totalCurrentCollected > 0
                          ? formatSheetAmount(row.totalCurrentCollected)
                          : '০/-'}
                      </td>

                      {/* 11. চলতি মাসের খরচাদি — সিট ভাড়া (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-semibold"
                      >
                        {row.seatRent > 0 ? formatSheetAmount(row.seatRent) : '—'}
                      </td>

                      {/* 12. চলতি মাসের খরচাদি — সার্ভিস চার্জ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-semibold"
                      >
                        {row.serviceCharge > 0 ? formatSheetAmount(row.serviceCharge) : '—'}
                      </td>

                      {/* 13. চলতি মাসের খরচাদি — মিল খরচ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-semibold"
                      >
                        {row.mealCharge > 0 ? formatSheetAmount(row.mealCharge) : '—'}
                      </td>

                      {/* 14. চলতি মাসের মোট খরচ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1 py-1 text-center align-middle font-extrabold text-purple-900 bg-purple-50/20"
                      >
                        {row.totalCurrentExpense > 0
                          ? formatSheetAmount(row.totalCurrentExpense)
                          : '০/-'}
                      </td>

                      {/* 15. দেনা/পাওনা (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className={`border border-black px-1 py-1 text-center align-middle font-extrabold ${
                          row.netBalance < 0
                            ? 'text-red-700 bg-red-50/30'
                            : row.netBalance > 0
                            ? 'text-emerald-700 bg-emerald-50/30'
                            : 'text-slate-800'
                        }`}
                      >
                        {formatSheetBalance(row.netBalance)}
                      </td>
                    </tr>

                    {/* Row B: Voucher Numbers for Cols 5, 6, 7, 8, 9 */}
                    <tr className="hover:bg-slate-50/50 border-b border-black">
                      {/* 5. পূর্ববর্তী মাসের পাওনা আদায় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-0.5 text-center text-[9.5px] font-mono text-gray-700">
                        {row.previousDueVouchers.length > 0
                          ? row.previousDueVouchers.join(', ')
                          : '—'}
                      </td>

                      {/* 6. চলতি মাসে আদায় — ১ম (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-0.5 text-center text-[9.5px] font-mono text-gray-700">
                        {pay1 && pay1.voucher ? pay1.voucher : '—'}
                      </td>

                      {/* 7. চলতি মাসে আদায় — ২য় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-0.5 text-center text-[9.5px] font-mono text-gray-700">
                        {pay2 && pay2.voucher ? pay2.voucher : '—'}
                      </td>

                      {/* 8. চলতি মাসে আদায় — ৩য় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-0.5 text-center text-[9.5px] font-mono text-gray-700">
                        {pay3 && pay3.voucher ? pay3.voucher : '—'}
                      </td>

                      {/* 9. চলতি মাসে আদায় — ৪র্থ (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-0.5 text-center text-[9.5px] font-mono text-gray-700">
                        {pay4 && pay4.voucher ? pay4.voucher : '—'}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })
            )}
          </tbody>

          {/* Grand Total Summary Row */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-200/90 font-extrabold border-t-[1.5px] border-b-[1.5px] border-black text-black">
                <td colSpan={2} className="border border-black px-2 py-1.5 text-center font-black text-xs">
                  সর্বমোট
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.advanceAmount > 0 ? formatSheetAmount(totals.advanceAmount) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-amber-900">
                  {totals.previousDue > 0 ? formatSheetAmount(totals.previousDue) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-emerald-900">
                  {totals.previousDueCollected > 0
                    ? formatSheetAmount(totals.previousDueCollected)
                    : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.payment1 > 0 ? formatSheetAmount(totals.payment1) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.payment2 > 0 ? formatSheetAmount(totals.payment2) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.payment3 > 0 ? formatSheetAmount(totals.payment3) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.payment4 > 0 ? formatSheetAmount(totals.payment4) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-blue-950 font-black">
                  {totals.totalCurrentCollected > 0
                    ? formatSheetAmount(totals.totalCurrentCollected)
                    : '০/-'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.seatRent > 0 ? formatSheetAmount(totals.seatRent) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.serviceCharge > 0 ? formatSheetAmount(totals.serviceCharge) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center">
                  {totals.mealCharge > 0 ? formatSheetAmount(totals.mealCharge) : '—'}
                </td>
                <td className="border border-black px-1 py-1.5 text-center text-purple-950 font-black">
                  {totals.totalCurrentExpense > 0
                    ? formatSheetAmount(totals.totalCurrentExpense)
                    : '০/-'}
                </td>
                <td
                  className={`border border-black px-1 py-1.5 text-center font-black ${
                    totals.netBalance < 0
                      ? 'text-red-800'
                      : totals.netBalance > 0
                      ? 'text-emerald-800'
                      : 'text-slate-800'
                  }`}
                >
                  {formatSheetBalance(totals.netBalance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer Signatures for Official Auditing */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-12 text-center text-xs text-black font-semibold">
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">ম্যানেজারের স্বাক্ষর</div>
          <div className="text-[10px] text-gray-600">আদায়কারী কর্মকর্তা</div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">অডিটর / অ্যাকাউন্ট্যান্ট</div>
          <div className="text-[10px] text-gray-600">হিসাব নিরীক্ষক</div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">হোস্টেল সুপার / পরিচালক</div>
          <div className="text-[10px] text-gray-600">অনুমোদনকারী কর্তৃপক্ষ</div>
        </div>
      </div>
    </div>
  )
}

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
            margin: 5mm 6mm;
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
            font-size: 10px !important;
            width: 100% !important;
          }
          .monthly-sheet-table th,
          .monthly-sheet-table td {
            border: 1px solid #000000 !important;
            padding: 4px 3px !important;
            text-align: center !important;
            vertical-align: middle !important;
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
            {flatName && flatName !== flatCode && (
              <span className="text-xs text-gray-600 font-normal ml-1">({flatName})</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main 15-Column Table with ample breathing room */}
      <div className="overflow-x-auto">
        <table className="monthly-sheet-table w-full min-w-[1450px] border-collapse border-[1.5px] border-black text-[11px] leading-normal text-black text-center select-text">
          <thead>
            {/* Header Tier 1 */}
            <tr className="bg-slate-100 font-bold border-b border-black h-11">
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[3.5%] min-w-[42px] text-center align-middle font-bold">
                ক্রঃনং
              </th>
              <th rowSpan={2} className="border border-black px-2 py-2 w-[15%] min-w-[170px] text-center align-middle font-bold">
                সদস্যের নাম ও মোবাইল নম্বর
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[6.5%] min-w-[80px] text-center align-middle font-bold">
                এডভান্স ভাড়া
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[7%] min-w-[85px] text-center align-middle font-bold">
                পূর্ববর্তী মাসের পাওনা
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[7.5%] min-w-[95px] text-center align-middle font-bold">
                পূর্ববর্তী মাসের পাওনা আদায়
              </th>
              <th colSpan={4} className="border border-black px-1.5 py-1.5 text-center font-bold">
                চলতি মাসে আদায়
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[7.5%] min-w-[95px] text-center align-middle font-bold">
                চলতি মাসের মোট আদায়
              </th>
              <th colSpan={3} className="border border-black px-1.5 py-1.5 text-center font-bold">
                চলতি মাসের খরচাদি
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[7.5%] min-w-[95px] text-center align-middle font-bold">
                চলতি মাসের মোট খরচ
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-2 w-[7.5%] min-w-[95px] text-center align-middle font-bold">
                দেনা/পাওনা
              </th>
            </tr>

            {/* Header Tier 2 (Sub-headers) */}
            <tr className="bg-slate-100 font-bold border-b border-black h-9">
              {/* Under চলতি মাসে আদায় */}
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">১ম</th>
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">২য়</th>
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">৩য়</th>
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">৪র্থ</th>
              {/* Under চলতি মাসের খরচাদি */}
              <th className="border border-black px-1 py-1.5 w-[6%] min-w-[75px] text-center align-middle font-bold">সিট ভাড়া</th>
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">সার্ভিস চার্জ</th>
              <th className="border border-black px-1 py-1.5 w-[5.5%] min-w-[70px] text-center align-middle font-bold">মিল খরচ</th>
            </tr>

            {/* Header Tier 3 (Column numbers row: ১ to ১৫) */}
            <tr className="bg-slate-200/80 font-bold border-b-[1.5px] border-black text-[10px] text-slate-800 h-7">
              <th className="border border-black py-1 text-center align-middle">১</th>
              <th className="border border-black py-1 text-center align-middle">২</th>
              <th className="border border-black py-1 text-center align-middle">৩</th>
              <th className="border border-black py-1 text-center align-middle">৪</th>
              <th className="border border-black py-1 text-center align-middle">৫</th>
              <th className="border border-black py-1 text-center align-middle">৬</th>
              <th className="border border-black py-1 text-center align-middle">৭</th>
              <th className="border border-black py-1 text-center align-middle">৮</th>
              <th className="border border-black py-1 text-center align-middle">৯</th>
              <th className="border border-black py-1 text-center align-middle">১০</th>
              <th className="border border-black py-1 text-center align-middle">১১</th>
              <th className="border border-black py-1 text-center align-middle">১২</th>
              <th className="border border-black py-1 text-center align-middle">১৩</th>
              <th className="border border-black py-1 text-center align-middle">১৪</th>
              <th className="border border-black py-1 text-center align-middle">১৫</th>
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
                    <tr className="hover:bg-slate-50/50 h-9">
                      {/* 1. ক্রঃনং (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 font-bold text-center align-middle text-[11px]"
                      >
                        {toBengaliDigits(row.sl)}
                      </td>

                      {/* 2. সদস্যের নাম ও মোবাইল নম্বর (rowspan 2) — Centered and clean */}
                      <td
                        rowSpan={2}
                        className="border border-black px-2.5 py-2 text-center align-middle"
                      >
                        <div className="font-bold text-black text-[13px]">{row.boarderName}</div>
                        {row.boarderPhone && (
                          <div className="text-[10.5px] text-gray-600 font-mono mt-0.5">
                            {row.boarderPhone}
                          </div>
                        )}
                      </td>

                      {/* 3. এডভান্স ভাড়া (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className={`border border-black px-1.5 py-2 text-center align-middle font-bold ${
                          !row.hasAdvance ? 'text-red-700 italic text-[10.5px]' : 'text-black'
                        }`}
                      >
                        {row.hasAdvance ? formatSheetAmount(row.advanceAmount) : 'দেওয়া নাই'}
                      </td>

                      {/* 4. পূর্ববর্তী মাসের পাওনা (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-bold"
                      >
                        {row.previousDue > 0 ? (
                          <span className="text-amber-900 font-bold">
                            {formatSheetAmount(row.previousDue)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 5. পূর্ববর্তী মাসের পাওনা আদায় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b border-b-gray-400 px-1 py-1.5 text-center align-middle font-bold">
                        {row.previousDueCollected > 0 ? (
                          <span className="text-emerald-900 font-bold">
                            {formatSheetAmount(row.previousDueCollected)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* 6. চলতি মাসে আদায় — ১ম (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b border-b-gray-400 px-1 py-1.5 text-center align-middle font-bold">
                        {pay1 && pay1.amount > 0 ? formatSheetAmount(pay1.amount) : '—'}
                      </td>

                      {/* 7. চলতি মাসে আদায় — ২য় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b border-b-gray-400 px-1 py-1.5 text-center align-middle font-bold">
                        {pay2 && pay2.amount > 0 ? formatSheetAmount(pay2.amount) : '—'}
                      </td>

                      {/* 8. চলতি মাসে আদায় — ৩য় (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b border-b-gray-400 px-1 py-1.5 text-center align-middle font-bold">
                        {pay3 && pay3.amount > 0 ? formatSheetAmount(pay3.amount) : '—'}
                      </td>

                      {/* 9. চলতি মাসে আদায় — ৪র্থ (Row A: Amount) */}
                      <td className="border-t border-l border-r border-black border-b border-b-gray-400 px-1 py-1.5 text-center align-middle font-bold">
                        {pay4 && pay4.amount > 0 ? formatSheetAmount(pay4.amount) : '—'}
                      </td>

                      {/* 10. চলতি মাসের মোট আদায় (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-black text-blue-950 bg-blue-50/20 text-[11.5px]"
                      >
                        {row.totalCurrentCollected > 0
                          ? formatSheetAmount(row.totalCurrentCollected)
                          : '০/-'}
                      </td>

                      {/* 11. চলতি মাসের খরচাদি — সিট ভাড়া (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-bold"
                      >
                        {row.seatRent > 0 ? formatSheetAmount(row.seatRent) : '—'}
                      </td>

                      {/* 12. চলতি মাসের খরচাদি — সার্ভিস চার্জ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-bold"
                      >
                        {row.serviceCharge > 0 ? formatSheetAmount(row.serviceCharge) : '—'}
                      </td>

                      {/* 13. চলতি মাসের খরচাদি — মিল খরচ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-bold"
                      >
                        {row.mealCharge > 0 ? formatSheetAmount(row.mealCharge) : '—'}
                      </td>

                      {/* 14. চলতি মাসের মোট খরচ (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className="border border-black px-1.5 py-2 text-center align-middle font-black text-purple-950 bg-purple-50/20 text-[11.5px]"
                      >
                        {row.totalCurrentExpense > 0
                          ? formatSheetAmount(row.totalCurrentExpense)
                          : '০/-'}
                      </td>

                      {/* 15. দেনা/পাওনা (rowspan 2) */}
                      <td
                        rowSpan={2}
                        className={`border border-black px-1.5 py-2 text-center align-middle font-black text-[11.5px] ${
                          row.netBalance < 0
                            ? 'text-red-700 bg-red-50/30'
                            : row.netBalance > 0
                            ? 'text-emerald-800 bg-emerald-50/30'
                            : 'text-slate-800'
                        }`}
                      >
                        {formatSheetBalance(row.netBalance)}
                      </td>
                    </tr>

                    {/* Row B: Voucher Numbers for Cols 5, 6, 7, 8, 9 */}
                    <tr className="hover:bg-slate-50/50 border-b border-black h-8">
                      {/* 5. পূর্ববর্তী মাসের পাওনা আদায় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-1 text-center align-middle text-[10px] font-mono text-gray-700">
                        {row.previousDueVouchers.length > 0
                          ? row.previousDueVouchers.join(', ')
                          : '—'}
                      </td>

                      {/* 6. চলতি মাসে আদায় — ১ম (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-1 text-center align-middle text-[10px] font-mono text-gray-700">
                        {pay1 && pay1.voucher ? pay1.voucher : '—'}
                      </td>

                      {/* 7. চলতি মাসে আদায় — ২য় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-1 text-center align-middle text-[10px] font-mono text-gray-700">
                        {pay2 && pay2.voucher ? pay2.voucher : '—'}
                      </td>

                      {/* 8. চলতি মাসে আদায় — ৩য় (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-1 text-center align-middle text-[10px] font-mono text-gray-700">
                        {pay3 && pay3.voucher ? pay3.voucher : '—'}
                      </td>

                      {/* 9. চলতি মাসে আদায় — ৪র্থ (Row B: Voucher No) */}
                      <td className="border-b border-l border-r border-black border-t-0 px-1 py-1 text-center align-middle text-[10px] font-mono text-gray-700">
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
              <tr className="bg-slate-200/90 font-extrabold border-t-[1.5px] border-b-[1.5px] border-black text-black h-10">
                <td colSpan={2} className="border border-black px-2 py-2 text-center align-middle font-black text-xs">
                  সর্বমোট
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.advanceAmount > 0 ? formatSheetAmount(totals.advanceAmount) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold text-amber-950">
                  {totals.previousDue > 0 ? formatSheetAmount(totals.previousDue) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold text-emerald-950">
                  {totals.previousDueCollected > 0
                    ? formatSheetAmount(totals.previousDueCollected)
                    : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.payment1 > 0 ? formatSheetAmount(totals.payment1) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.payment2 > 0 ? formatSheetAmount(totals.payment2) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.payment3 > 0 ? formatSheetAmount(totals.payment3) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.payment4 > 0 ? formatSheetAmount(totals.payment4) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle text-blue-950 font-black">
                  {totals.totalCurrentCollected > 0
                    ? formatSheetAmount(totals.totalCurrentCollected)
                    : '০/-'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.seatRent > 0 ? formatSheetAmount(totals.seatRent) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.serviceCharge > 0 ? formatSheetAmount(totals.serviceCharge) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle font-bold">
                  {totals.mealCharge > 0 ? formatSheetAmount(totals.mealCharge) : '—'}
                </td>
                <td className="border border-black px-1.5 py-2 text-center align-middle text-purple-950 font-black">
                  {totals.totalCurrentExpense > 0
                    ? formatSheetAmount(totals.totalCurrentExpense)
                    : '০/-'}
                </td>
                <td
                  className={`border border-black px-1.5 py-2 text-center align-middle font-black ${
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

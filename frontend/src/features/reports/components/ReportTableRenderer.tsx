import type {
  ReportId,
  DailyIncomeExpenseRow,
  WeeklyIncomeExpenseRow,
  MonthlyOperatingStatementRow,
  ReceiptCollectionRow,
  BoarderDuesAgingRow,
  AccountLedgerRow,
  ManagerDailyCashRow,
  DailyCashClosingRow,
  CashVarianceAuditRow,
  OwnerDepositRow,
  CashHandoverRow,
  FlatExpenseRow,
  ExpenseCategoryAnalysisRow,
  SecurityDepositRow,
  ReceiptVoidAuditRow,
  ManagerComplianceRow,
} from '../types'
import { type ExportColumn, formatBDT, formatDate } from '../../../lib/exportUtils'

interface ReportTableRendererProps {
  reportId: ReportId
  data: any
  isLoading: boolean
  onExportColumnsReady?: (columns: ExportColumn[], rows: Record<string, unknown>[], summary?: Record<string, unknown>) => void
}

export const ReportTableRenderer: React.FC<ReportTableRendererProps> = ({
  reportId,
  data,
  isLoading,
  onExportColumnsReady,
}) => {
  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">রিপোর্টের ডাটা লোড ও গণনা করা হচ্ছে... (Processing records)</p>
      </div>
    )
  }

  // 1. DAILY_INCOME_EXPENSE
  if (reportId === 'DAILY_INCOME_EXPENSE') {
    const rows = (data?.dailyIncomeExpense ?? []) as DailyIncomeExpenseRow[]
    const totalInflow = rows.reduce((s, r) => s + r.totalInflow, 0)
    const totalExpense = rows.reduce((s, r) => s + r.operatingExpenses, 0)
    const netTotal = totalInflow - totalExpense

    const columns: ExportColumn[] = [
      { header: 'তারিখ / Date', key: 'date', width: 15, isDate: true },
      { header: 'ভাড়া আদায় / Rent (৳)', key: 'rentReceipts', width: 18, isCurrency: true },
      { header: 'অন্যান্য আয় / Other (৳)', key: 'otherIncomes', width: 18, isCurrency: true },
      { header: 'মোট আগমন / Inflow (৳)', key: 'totalInflow', width: 20, isCurrency: true },
      { header: 'মোট ব্যয় / Expense (৳)', key: 'operatingExpenses', width: 20, isCurrency: true },
      { header: 'নিট ক্যাশ / Net Balance (৳)', key: 'netBalance', width: 22, isCurrency: true },
      { header: 'লেনদেন সংখ্যা / Tx Count', key: 'transactionCount', width: 16, align: 'center' },
    ]

    const summaryRow = {
      date: 'GRAND TOTAL (সর্বমোট)',
      rentReceipts: rows.reduce((s, r) => s + r.rentReceipts, 0),
      otherIncomes: rows.reduce((s, r) => s + r.otherIncomes, 0),
      totalInflow,
      operatingExpenses: totalExpense,
      netBalance: netTotal,
      transactionCount: rows.reduce((s, r) => s + r.transactionCount, 0),
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">তারিখ (Date)</th>
              <th className="py-3 px-4 text-right">ভাড়া আদায় (Rent)</th>
              <th className="py-3 px-4 text-right">অন্যান্য আয় (Other)</th>
              <th className="py-3 px-4 text-right">মোট আগমন (Inflow)</th>
              <th className="py-3 px-4 text-right">পরিচালন ব্যয় (Expense)</th>
              <th className="py-3 px-4 text-right">নিট ব্যালেন্স (Net)</th>
              <th className="py-3 px-4 text-center">লেনদেন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  নির্বাচিত সময়সীমায় কোনো আয় বা ব্যয়ের তথ্য পাওয়া যায়নি।
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.date} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-medium text-slate-200">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">{formatBDT(r.rentReceipts)}</td>
                  <td className="py-3 px-4 text-right text-teal-400">{formatBDT(r.otherIncomes)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-300">{formatBDT(r.totalInflow)}</td>
                  <td className="py-3 px-4 text-right font-medium text-rose-400">{formatBDT(r.operatingExpenses)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${r.netBalance >= 0 ? 'text-indigo-300' : 'text-amber-400'}`}>
                    {formatBDT(r.netBalance)}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400">{r.transactionCount}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td className="py-3 px-4">সর্বমোট (TOTAL)</td>
                <td className="py-3 px-4 text-right text-emerald-400">{formatBDT(summaryRow.rentReceipts)}</td>
                <td className="py-3 px-4 text-right text-teal-400">{formatBDT(summaryRow.otherIncomes)}</td>
                <td className="py-3 px-4 text-right text-emerald-300">{formatBDT(totalInflow)}</td>
                <td className="py-3 px-4 text-right text-rose-400">{formatBDT(totalExpense)}</td>
                <td className={`py-3 px-4 text-right text-sm ${netTotal >= 0 ? 'text-indigo-400' : 'text-amber-400'}`}>
                  {formatBDT(netTotal)}
                </td>
                <td className="py-3 px-4 text-center">{summaryRow.transactionCount}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 2. WEEKLY_INCOME_EXPENSE
  if (reportId === 'WEEKLY_INCOME_EXPENSE') {
    const rows = (data?.weeklyIncomeExpense ?? []) as WeeklyIncomeExpenseRow[]
    const sumIncome = rows.reduce((s, r) => s + r.totalIncome, 0)
    const sumExpense = rows.reduce((s, r) => s + r.totalExpense, 0)

    const columns: ExportColumn[] = [
      { header: 'সপ্তাহ / Week', key: 'weekLabel', width: 22 },
      { header: 'শুরু / From', key: 'startDate', width: 14, isDate: true },
      { header: 'শেষ / To', key: 'endDate', width: 14, isDate: true },
      { header: 'মোট আয় / Revenue (৳)', key: 'totalIncome', width: 20, isCurrency: true },
      { header: 'মোট ব্যয় / Expense (৳)', key: 'totalExpense', width: 20, isCurrency: true },
      { header: 'নিট মার্জিন / Margin (৳)', key: 'netMargin', width: 22, isCurrency: true },
    ]

    const summaryRow = {
      weekLabel: 'GRAND TOTAL',
      startDate: '—',
      endDate: '—',
      totalIncome: sumIncome,
      totalExpense: sumExpense,
      netMargin: sumIncome - sumExpense,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">সপ্তাহ (Week)</th>
              <th className="py-3 px-4">সময়কাল (Period)</th>
              <th className="py-3 px-4 text-right">মোট আয় (Income)</th>
              <th className="py-3 px-4 text-right">মোট ব্যয় (Expense)</th>
              <th className="py-3 px-4 text-right">নিট মার্জিন (Net Margin)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">কোনো তথ্য পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.startDate} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.weekLabel}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.startDate)} — {formatDate(r.endDate)}</td>
                  <td className="py-3 px-4 text-right text-emerald-400 font-medium">{formatBDT(r.totalIncome)}</td>
                  <td className="py-3 px-4 text-right text-rose-400 font-medium">{formatBDT(r.totalExpense)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${r.netMargin >= 0 ? 'text-indigo-300' : 'text-amber-400'}`}>
                    {formatBDT(r.netMargin)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={2} className="py-3 px-4">সর্বমোট (TOTAL)</td>
                <td className="py-3 px-4 text-right text-emerald-400">{formatBDT(sumIncome)}</td>
                <td className="py-3 px-4 text-right text-rose-400">{formatBDT(sumExpense)}</td>
                <td className="py-3 px-4 text-right text-indigo-300">{formatBDT(sumIncome - sumExpense)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 3. MONTHLY_OPERATING_STATEMENT (P&L)
  if (reportId === 'MONTHLY_OPERATING_STATEMENT') {
    const rows = (data?.monthlyOperatingStatement ?? []) as MonthlyOperatingStatementRow[]

    const columns: ExportColumn[] = [
      { header: 'খাত / Account Line Item', key: 'category', width: 35 },
      { header: 'ধরন / Line Type', key: 'type', width: 16, align: 'center' },
      { header: 'পরিমাণ / Amount (৳)', key: 'amount', width: 22, isCurrency: true },
      { header: 'আয়ের অনুপাত / % of Revenue', key: 'percentageOfRevenue', width: 20, align: 'right' },
    ]

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows.map((r) => ({
        ...r,
        percentageOfRevenue: `${r.percentageOfRevenue.toFixed(1)}%`,
      })))
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">খাত / হিসাবের বিবরণী (Line Item)</th>
              <th className="py-3 px-4 text-center">ধরন (Type)</th>
              <th className="py-3 px-4 text-right">পরিমাণ (Amount)</th>
              <th className="py-3 px-4 text-right">% of Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.map((r, i) => {
              const isSummary = r.type === 'SUMMARY'
              return (
                <tr
                  key={i}
                  className={
                    isSummary
                      ? 'bg-slate-900 font-bold border-t border-b border-slate-700 text-slate-100'
                      : i % 2 === 0
                      ? 'bg-slate-900/30'
                      : 'bg-slate-800/20'
                  }
                >
                  <td className={`py-3 px-4 ${isSummary ? 'text-indigo-300 font-bold' : 'text-slate-300'}`}>
                    {r.category}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.type === 'INCOME'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : r.type === 'EXPENSE'
                          ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          : 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/40'
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${isSummary ? 'text-sm font-bold text-slate-100' : 'text-slate-200'}`}>
                    {formatBDT(r.amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">{r.percentageOfRevenue.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // 4. RECEIPT_COLLECTION
  if (reportId === 'RECEIPT_COLLECTION') {
    const rows = (data?.receiptCollection ?? []) as ReceiptCollectionRow[]
    const sumAmount = rows.reduce((s, r) => (r.isVoid ? s : s + r.amount), 0)

    const columns: ExportColumn[] = [
      { header: 'রসিদ নম্বর / Receipt #', key: 'receiptNumber', width: 18 },
      { header: 'তারিখ / Date', key: 'date', width: 14, isDate: true },
      { header: 'বর্ডার নাম / Boarder', key: 'boarderName', width: 22 },
      { header: 'কোড / Code', key: 'boarderCode', width: 14 },
      { header: 'পরিমাণ / Amount (৳)', key: 'amount', width: 18, isCurrency: true },
      { header: 'পদ্ধতি / Method', key: 'paymentMethod', width: 14, align: 'center' },
      { header: 'আদায়কারী / Collector', key: 'collectorName', width: 18 },
      { header: 'অ্যাকাউন্ট / Account', key: 'accountName', width: 18 },
      { header: 'স্ট্যাটাস / Status', key: 'statusStr', width: 12, align: 'center' },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      statusStr: r.isVoid ? 'VOID (বাতিল)' : 'ACTIVE',
    }))

    const summaryRow = {
      receiptNumber: 'TOTAL COLLECTED',
      amount: sumAmount,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, exportRows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">রসিদ নম্বর (Receipt #)</th>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">বর্ডার</th>
              <th className="py-3 px-4 text-right">পরিমাণ (Amount)</th>
              <th className="py-3 px-4 text-center">পদ্ধতি</th>
              <th className="py-3 px-4">কালেক্টর</th>
              <th className="py-3 px-4">জমা অ্যাকাউন্ট</th>
              <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">কোনো রসিদ পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.receiptNumber + i}
                  className={r.isVoid ? 'bg-rose-950/20 text-rose-400 line-through' : i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}
                >
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">{r.receiptNumber}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {r.boarderName} <span className="text-[10px] text-slate-500">({r.boarderCode})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatBDT(r.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {r.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{r.collectorName}</td>
                  <td className="py-3 px-4 text-slate-400">{r.accountName}</td>
                  <td className="py-3 px-4 text-center">
                    {r.isVoid ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-700">
                        VOID
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                        PAID
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={3} className="py-3 px-4">মোট বৈধ আদায় (Active Total)</td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">{formatBDT(sumAmount)}</td>
                <td colSpan={4} className="py-3 px-4 text-slate-400 font-normal">
                  (Void রসিদসমূহ মোট হিসেবে অন্তর্ভুক্ত নয়)
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 5. BOARDER_DUES_AGING
  if (reportId === 'BOARDER_DUES_AGING') {
    const rows = (data?.boarderDuesAging ?? []) as BoarderDuesAgingRow[]
    const sumTotalDue = rows.reduce((s, r) => s + r.totalOutstandingDue, 0)
    const sumCurrent = rows.reduce((s, r) => s + r.currentDue, 0)
    const sum31to60 = rows.reduce((s, r) => s + r.days31to60, 0)
    const sum61to90 = rows.reduce((s, r) => s + r.days61to90, 0)
    const sum90Plus = rows.reduce((s, r) => s + r.days90Plus, 0)

    const columns: ExportColumn[] = [
      { header: 'বর্ডার নাম / Boarder', key: 'boarderName', width: 22 },
      { header: 'কোড / Code', key: 'boarderCode', width: 14 },
      { header: 'ফোন নম্বর / Phone', key: 'phoneNumber', width: 16 },
      { header: 'মোট বকেয়া / Total Due (৳)', key: 'totalOutstandingDue', width: 20, isCurrency: true },
      { header: '০-৩০ দিন / 0-30d (৳)', key: 'currentDue', width: 18, isCurrency: true },
      { header: '৩১-৬০ দিন / 31-60d (৳)', key: 'days31to60', width: 18, isCurrency: true },
      { header: '৬১-৯০ দিন / 61-90d (৳)', key: 'days61to90', width: 18, isCurrency: true },
      { header: '৯০+ দিন / 90+d (৳)', key: 'days90Plus', width: 18, isCurrency: true },
    ]

    const summaryRow = {
      boarderName: 'TOTAL OUTSTANDING DUES',
      totalOutstandingDue: sumTotalDue,
      currentDue: sumCurrent,
      days31to60: sum31to60,
      days61to90: sum61to90,
      days90Plus: sum90Plus,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">বর্ডার নাম (Boarder)</th>
              <th className="py-3 px-4">কোড ও ফোন</th>
              <th className="py-3 px-4 text-right">মোট বকেয়া (Total Due)</th>
              <th className="py-3 px-4 text-right">০-৩০ দিন (Current)</th>
              <th className="py-3 px-4 text-right">৩১-৬০ দিন</th>
              <th className="py-3 px-4 text-right">৬১-৯০ দিন</th>
              <th className="py-3 px-4 text-right text-rose-400">৯০+ দিন (Overdue)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো বকেয়া পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.boarderCode} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.boarderName}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{r.boarderCode} • {r.phoneNumber}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-400">{formatBDT(r.totalOutstandingDue)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.currentDue)}</td>
                  <td className="py-3 px-4 text-right text-amber-300">{formatBDT(r.days31to60)}</td>
                  <td className="py-3 px-4 text-right text-orange-400">{formatBDT(r.days61to90)}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-500">{formatBDT(r.days90Plus)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={2} className="py-3 px-4">সর্বমোট বকেয়া (GRAND TOTAL)</td>
                <td className="py-3 px-4 text-right text-rose-400 text-sm">{formatBDT(sumTotalDue)}</td>
                <td className="py-3 px-4 text-right">{formatBDT(sumCurrent)}</td>
                <td className="py-3 px-4 text-right text-amber-300">{formatBDT(sum31to60)}</td>
                <td className="py-3 px-4 text-right text-orange-400">{formatBDT(sum61to90)}</td>
                <td className="py-3 px-4 text-right text-rose-500">{formatBDT(sum90Plus)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 6. ACCOUNT_LEDGERS
  if (reportId === 'ACCOUNT_LEDGERS') {
    const rows = (data?.accountLedgers ?? []) as AccountLedgerRow[]

    const columns: ExportColumn[] = [
      { header: 'তারিখ / Date', key: 'date', width: 14, isDate: true },
      { header: 'অ্যাকাউন্ট / Account', key: 'accountName', width: 20 },
      { header: 'লেনদেনের ধরন / Type', key: 'transactionType', width: 18 },
      { header: 'রেফারেন্স / Ref #', key: 'referenceNo', width: 16 },
      { header: 'বিবরণ / Particulars', key: 'particulars', width: 30 },
      { header: 'ডেবিট / Inflow (৳)', key: 'debit', width: 18, isCurrency: true },
      { header: 'ক্রেডিট / Outflow (৳)', key: 'credit', width: 18, isCurrency: true },
      { header: 'ব্যালেন্স / Balance (৳)', key: 'runningBalance', width: 20, isCurrency: true },
    ]

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[])
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">অ্যাকাউন্ট</th>
              <th className="py-3 px-4">ধরন (Type)</th>
              <th className="py-3 px-4">রেফারেন্স #</th>
              <th className="py-3 px-4">বিবরণ (Particulars)</th>
              <th className="py-3 px-4 text-right text-emerald-400">ডেবিট (+)</th>
              <th className="py-3 px-4 text-right text-rose-400">ক্রেডিট (-)</th>
              <th className="py-3 px-4 text-right text-indigo-300">চলমান ব্যালেন্স</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">কোনো লেজার এন্ট্রি পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{r.accountName}</td>
                  <td className="py-3 px-4 text-slate-300">{r.transactionType}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{r.referenceNo}</td>
                  <td className="py-3 px-4 text-slate-300">{r.particulars}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-400">
                    {r.debit > 0 ? formatBDT(r.debit) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-rose-400">
                    {r.credit > 0 ? formatBDT(r.credit) : '—'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-100">{formatBDT(r.runningBalance)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // 7. MANAGER_DAILY_CASH
  if (reportId === 'MANAGER_DAILY_CASH') {
    const rows = (data?.managerDailyCash ?? []) as ManagerDailyCashRow[]

    const columns: ExportColumn[] = [
      { header: 'তারিখ / Date', key: 'date', width: 14, isDate: true },
      { header: 'ম্যানেজার / Manager', key: 'managerName', width: 20 },
      { header: 'অ্যাকাউন্ট / Account', key: 'accountName', width: 18 },
      { header: 'প্রারম্ভিক / Opening (৳)', key: 'openingCash', width: 18, isCurrency: true },
      { header: 'আদায় / Receipts (৳)', key: 'receiptsCollected', width: 18, isCurrency: true },
      { header: 'ব্যয় / Expenses (৳)', key: 'expensesPaid', width: 18, isCurrency: true },
      { header: 'মালিককে জমা / Deposit (৳)', key: 'depositedToOwner', width: 20, isCurrency: true },
      { header: 'সমাপনী / Closing (৳)', key: 'closingCash', width: 18, isCurrency: true },
    ]

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[])
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">ম্যানেজার</th>
              <th className="py-3 px-4 text-right">প্রারম্ভিক ক্যাশ</th>
              <th className="py-3 px-4 text-right text-emerald-400">আদায় (+)</th>
              <th className="py-3 px-4 text-right text-rose-400">ব্যয় (-)</th>
              <th className="py-3 px-4 text-right text-amber-400">মালিককে জমা</th>
              <th className="py-3 px-4 text-right text-indigo-300 font-bold">সমাপনী ক্যাশ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো তথ্য পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.managerName}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.openingCash)}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-400">{formatBDT(r.receiptsCollected)}</td>
                  <td className="py-3 px-4 text-right font-medium text-rose-400">{formatBDT(r.expensesPaid)}</td>
                  <td className="py-3 px-4 text-right text-amber-400">{formatBDT(r.depositedToOwner)}</td>
                  <td className="py-3 px-4 text-right font-bold text-indigo-300">{formatBDT(r.closingCash)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // 8. DAILY_CASH_CLOSING
  if (reportId === 'DAILY_CASH_CLOSING') {
    const rows = (data?.dailyCashClosing ?? []) as DailyCashClosingRow[]

    const columns: ExportColumn[] = [
      { header: 'তারিখ / Date', key: 'sessionDate', width: 14, isDate: true },
      { header: 'ম্যানেজার / Manager', key: 'managerName', width: 20 },
      { header: 'প্রত্যাশিত / Expected (৳)', key: 'expectedCash', width: 18, isCurrency: true },
      { header: 'গণনাকৃত / Counted (৳)', key: 'actualCountedCash', width: 18, isCurrency: true },
      { header: 'অমিল / Variance (৳)', key: 'variance', width: 18, isCurrency: true },
      { header: 'কারণ / Explanation', key: 'varianceExplanation', width: 25 },
      { header: 'স্ট্যাটাস / Status', key: 'status', width: 14, align: 'center' },
    ]

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[])
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">ম্যানেজার</th>
              <th className="py-3 px-4 text-right">প্রত্যাশিত ক্যাশ</th>
              <th className="py-3 px-4 text-right">গণনাকৃত ক্যাশ</th>
              <th className="py-3 px-4 text-right">ভ্যারিয়েন্স (অমিল)</th>
              <th className="py-3 px-4">ব্যাখ্যা (Explanation)</th>
              <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো ক্লোজিং সেশন পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.sessionDate)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.managerName}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.expectedCash)}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-100">{formatBDT(r.actualCountedCash)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${r.variance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatBDT(r.variance)}
                  </td>
                  <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">{r.varianceExplanation}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // 9. CASH_VARIANCE_AUDIT
  if (reportId === 'CASH_VARIANCE_AUDIT') {
    const rows = (data?.cashVarianceAudit ?? []) as CashVarianceAuditRow[]

    const columns: ExportColumn[] = [
      { header: 'তারিখ / Date', key: 'sessionDate', width: 14, isDate: true },
      { header: 'ম্যানেজার / Manager', key: 'managerName', width: 20 },
      { header: 'প্রত্যাশিত / Expected (৳)', key: 'expectedCash', width: 18, isCurrency: true },
      { header: 'গণনাকৃত / Counted (৳)', key: 'actualCountedCash', width: 18, isCurrency: true },
      { header: 'ঘাটতি/অতিরিক্ত / Variance (৳)', key: 'varianceAmount', width: 20, isCurrency: true },
      { header: 'ধরন / Variance Type', key: 'varianceType', width: 16, align: 'center' },
      { header: 'অনুপাত / %', key: 'variancePctStr', width: 12, align: 'right' },
      { header: 'ব্যাখ্যা / Explanation', key: 'explanation', width: 30 },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      variancePctStr: `${r.variancePercentage.toFixed(1)}%`,
    }))

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, exportRows as unknown as Record<string, unknown>[])
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">ম্যানেজার</th>
              <th className="py-3 px-4 text-right">প্রত্যাশিত</th>
              <th className="py-3 px-4 text-right">গণনাকৃত</th>
              <th className="py-3 px-4 text-right">ভ্যারিয়েন্স (৳)</th>
              <th className="py-3 px-4 text-center">ধরন (Type)</th>
              <th className="py-3 px-4 text-right">%</th>
              <th className="py-3 px-4">ব্যাখ্যা (Explanation)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">কোনো ঘাটতি বা অডিট রেকর্ড নেই।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.sessionDate)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.managerName}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.expectedCash)}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-100">{formatBDT(r.actualCountedCash)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${r.varianceAmount < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {formatBDT(r.varianceAmount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.varianceType === 'SHORTAGE'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : r.varianceType === 'EXCESS'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {r.varianceType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">{r.variancePercentage.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-slate-300 italic">{r.explanation}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  // 10. OWNER_DEPOSITS
  if (reportId === 'OWNER_DEPOSITS') {
    const rows = (data?.ownerDeposits ?? []) as OwnerDepositRow[]
    const sumAmount = rows.reduce((s, r) => s + r.amount, 0)

    const columns: ExportColumn[] = [
      { header: 'জমা নম্বর / Deposit #', key: 'depositNumber', width: 18 },
      { header: 'তারিখ / Date', key: 'date', width: 14, isDate: true },
      { header: 'ম্যানেজার / Manager', key: 'managerName', width: 20 },
      { header: 'উৎস / From', key: 'fromAccountName', width: 18 },
      { header: 'গন্তব্য / To Account', key: 'toAccountName', width: 18 },
      { header: 'পরিমাণ / Amount (৳)', key: 'amount', width: 18, isCurrency: true },
      { header: 'পদ্ধতি / Method', key: 'paymentMethod', width: 14, align: 'center' },
      { header: 'স্ট্যাটাস / Status', key: 'status', width: 14, align: 'center' },
      { header: 'অনুমোদনকারী / Confirmer', key: 'confirmedBy', width: 20 },
    ]

    const summaryRow = {
      depositNumber: 'TOTAL DEPOSITED',
      amount: sumAmount,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">জমা নম্বর (Deposit #)</th>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">ম্যানেজার</th>
              <th className="py-3 px-4">উৎস ও গন্তব্য</th>
              <th className="py-3 px-4 text-right">পরিমাণ (Amount)</th>
              <th className="py-3 px-4 text-center">পদ্ধতি</th>
              <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
              <th className="py-3 px-4">কনফার্মেশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">কোনো ওনার ডিপোজিট পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">{r.depositNumber}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.managerName}</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{r.fromAccountName} ➔ {r.toAccountName}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatBDT(r.amount)}</td>
                  <td className="py-3 px-4 text-center text-slate-300">{r.paymentMethod}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'CONFIRMED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{r.confirmedBy} ({r.confirmedAt})</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={4} className="py-3 px-4">সর্বমোট জমা (TOTAL)</td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">{formatBDT(sumAmount)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 11. CASH_HANDOVERS
  if (reportId === 'CASH_HANDOVERS') {
    const rows = (data?.cashHandovers ?? []) as CashHandoverRow[]
    const sumAmount = rows.reduce((s, r) => s + r.amount, 0)

    const columns: ExportColumn[] = [
      { header: 'হ্যান্ডওভার নম্বর / Handover #', key: 'handoverNumber', width: 20 },
      { header: 'তারিখ / Date', key: 'date', width: 14, isDate: true },
      { header: 'প্রদানকারী / Sender', key: 'senderManager', width: 20 },
      { header: 'গ্রহণকারী / Receiver', key: 'receiverManager', width: 20 },
      { header: 'পরিমাণ / Amount (৳)', key: 'amount', width: 18, isCurrency: true },
      { header: 'কারণ / Reason', key: 'handoverReason', width: 25 },
      { header: 'স্ট্যাটাস / Status', key: 'status', width: 14, align: 'center' },
    ]

    const summaryRow = {
      handoverNumber: 'TOTAL HANDED OVER',
      amount: sumAmount,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">হ্যান্ডওভার নম্বর</th>
              <th className="py-3 px-4">তারিখ</th>
              <th className="py-3 px-4">প্রদানকারী ম্যানেজার</th>
              <th className="py-3 px-4">গ্রহণকারী ম্যানেজার</th>
              <th className="py-3 px-4 text-right">পরিমাণ (Amount)</th>
              <th className="py-3 px-4">হস্তান্তরের কারণ</th>
              <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো হ্যান্ডওভার রেকর্ড পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-300">{r.handoverNumber}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">{r.senderManager}</td>
                  <td className="py-3 px-4 font-medium text-indigo-300">{r.receiverManager}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatBDT(r.amount)}</td>
                  <td className="py-3 px-4 text-slate-300">{r.handoverReason}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'ACCEPTED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={4} className="py-3 px-4">সর্বমোট হস্তান্তরিত ক্যাশ (TOTAL)</td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">{formatBDT(sumAmount)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 12. FLAT_EXPENSES
  if (reportId === 'FLAT_EXPENSES') {
    const rows = (data?.flatExpenses ?? []) as FlatExpenseRow[]
    const sumTotal = rows.reduce((s, r) => s + r.totalExpense, 0)
    const sumUtil = rows.reduce((s, r) => s + r.utilityExpense, 0)
    const sumMaint = rows.reduce((s, r) => s + r.maintenanceExpense, 0)
    const sumClean = rows.reduce((s, r) => s + r.cleaningExpense, 0)

    const columns: ExportColumn[] = [
      { header: 'বিল্ডিং / Building', key: 'buildingName', width: 20 },
      { header: 'ফ্ল্যাট / Flat', key: 'flatName', width: 20 },
      { header: 'কোড / Code', key: 'flatCode', width: 14 },
      { header: 'ইউটিলিটি / Utility (৳)', key: 'utilityExpense', width: 18, isCurrency: true },
      { header: 'মেরামত / Maintenance (৳)', key: 'maintenanceExpense', width: 20, isCurrency: true },
      { header: 'পরিষ্কার / Cleaning (৳)', key: 'cleaningExpense', width: 18, isCurrency: true },
      { header: 'মোট খরচ / Total (৳)', key: 'totalExpense', width: 20, isCurrency: true },
      { header: 'ভাউচার / Vouchers', key: 'expenseCount', width: 14, align: 'center' },
    ]

    const summaryRow = {
      buildingName: 'GRAND TOTAL',
      flatName: '—',
      utilityExpense: sumUtil,
      maintenanceExpense: sumMaint,
      cleaningExpense: sumClean,
      totalExpense: sumTotal,
      expenseCount: rows.reduce((s, r) => s + r.expenseCount, 0),
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">বিল্ডিং ও ফ্ল্যাট</th>
              <th className="py-3 px-4">কোড</th>
              <th className="py-3 px-4 text-right">ইউটিলিটি বিল</th>
              <th className="py-3 px-4 text-right">মেরামত ও রক্ষণাবেক্ষণ</th>
              <th className="py-3 px-4 text-right">পরিষ্কার-পরিচ্ছন্নতা</th>
              <th className="py-3 px-4 text-right text-rose-400">মোট খরচ (Total)</th>
              <th className="py-3 px-4 text-center">ভাউচার সংখ্যা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো ফ্ল্যাট খরচ পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {r.flatName} <span className="text-[10px] text-slate-400">({r.buildingName})</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{r.flatCode}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.utilityExpense)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.maintenanceExpense)}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.cleaningExpense)}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-400">{formatBDT(r.totalExpense)}</td>
                  <td className="py-3 px-4 text-center text-slate-400">{r.expenseCount}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={2} className="py-3 px-4">সর্বমোট ফ্ল্যাট ব্যয় (TOTAL)</td>
                <td className="py-3 px-4 text-right">{formatBDT(sumUtil)}</td>
                <td className="py-3 px-4 text-right">{formatBDT(sumMaint)}</td>
                <td className="py-3 px-4 text-right">{formatBDT(sumClean)}</td>
                <td className="py-3 px-4 text-right text-rose-400 text-sm">{formatBDT(sumTotal)}</td>
                <td className="py-3 px-4 text-center">{summaryRow.expenseCount}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 13. EXPENSE_CATEGORY_ANALYSIS
  if (reportId === 'EXPENSE_CATEGORY_ANALYSIS') {
    const rows = (data?.expenseCategoryAnalysis ?? []) as ExpenseCategoryAnalysisRow[]
    const sumTotal = rows.reduce((s, r) => s + r.totalAmount, 0)

    const columns: ExportColumn[] = [
      { header: 'ব্যয় খাত / Expense Category', key: 'categoryName', width: 25 },
      { header: 'মোট টাকা / Total (৳)', key: 'totalAmount', width: 20, isCurrency: true },
      { header: 'মোট ব্যয়ের অনুপাত / % of Total', key: 'pctStr', width: 20, align: 'right' },
      { header: 'ভাউচার সংখ্যা / Vouchers', key: 'voucherCount', width: 16, align: 'center' },
      { header: 'গড় ব্যয় / Average (৳)', key: 'averageAmount', width: 18, isCurrency: true },
      { header: 'সর্বোচ্চ ভাউচার / Max (৳)', key: 'highestVoucher', width: 18, isCurrency: true },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      pctStr: `${r.percentageOfTotal.toFixed(1)}%`,
    }))

    const summaryRow = {
      categoryName: 'TOTAL ALL CATEGORIES',
      totalAmount: sumTotal,
      pctStr: '100.0%',
      voucherCount: rows.reduce((s, r) => s + r.voucherCount, 0),
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, exportRows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">ব্যয় খাত (Category)</th>
              <th className="py-3 px-4 text-right">মোট টাকা (Total)</th>
              <th className="py-3 px-4 text-right">% of Total</th>
              <th className="py-3 px-4 text-center">ভাউচার সংখ্যা</th>
              <th className="py-3 px-4 text-right">গড় ভাউচার সাইজ</th>
              <th className="py-3 px-4 text-right">সর্বোচ্চ একক ভাউচার</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">কোনো খরচ পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.categoryName}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-400">{formatBDT(r.totalAmount)}</td>
                  <td className="py-3 px-4 text-right text-slate-300 font-medium">{r.percentageOfTotal.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-center text-slate-400">{r.voucherCount}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{formatBDT(r.averageAmount)}</td>
                  <td className="py-3 px-4 text-right font-medium text-amber-300">{formatBDT(r.highestVoucher)}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td className="py-3 px-4">সর্বমোট ব্যয় (TOTAL)</td>
                <td className="py-3 px-4 text-right text-rose-400 text-sm">{formatBDT(sumTotal)}</td>
                <td className="py-3 px-4 text-right">100.0%</td>
                <td className="py-3 px-4 text-center">{summaryRow.voucherCount}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 14. SECURITY_DEPOSITS
  if (reportId === 'SECURITY_DEPOSITS') {
    const rows = (data?.securityDeposits ?? []) as SecurityDepositRow[]
    const sumDeposit = rows.reduce((s, r) => s + r.securityDepositPaid, 0)

    const columns: ExportColumn[] = [
      { header: 'বর্ডার নাম / Boarder', key: 'boarderName', width: 22 },
      { header: 'কোড / Code', key: 'boarderCode', width: 14 },
      { header: 'ফ্ল্যাট ও সিট / Location', key: 'locationStr', width: 22 },
      { header: 'ভর্তি তারিখ / Start Date', key: 'allocationStart', width: 16, isDate: true },
      { header: 'জামানত পরিমাণ / Deposit (৳)', key: 'securityDepositPaid', width: 20, isCurrency: true },
      { header: 'স্থিতি / Status', key: 'status', width: 20, align: 'center' },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      locationStr: `${r.flatName} - ${r.seatName}`,
    }))

    const summaryRow = {
      boarderName: 'TOTAL SECURITY DEPOSITS IN RESERVE',
      securityDepositPaid: sumDeposit,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, exportRows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">বর্ডার নাম</th>
              <th className="py-3 px-4">কোড</th>
              <th className="py-3 px-4">ফ্ল্যাট ও সিট</th>
              <th className="py-3 px-4">ভর্তির তারিখ</th>
              <th className="py-3 px-4 text-right">সংরক্ষিত জামানত (Deposit)</th>
              <th className="py-3 px-4 text-center">স্থিতি (Status)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">কোনো জামানতের তথ্য পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-semibold text-slate-200">{r.boarderName}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{r.boarderCode}</td>
                  <td className="py-3 px-4 text-slate-300">{r.flatName} • {r.seatName}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.allocationStart)}</td>
                  <td className="py-3 px-4 text-right font-bold text-teal-400">{formatBDT(r.securityDepositPaid)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status.includes('HELD')
                        ? 'bg-teal-950 text-teal-300 border border-teal-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={4} className="py-3 px-4">তহবিলে মোট সংরক্ষিত সিকিউরিটি জামানত</td>
                <td className="py-3 px-4 text-right text-teal-400 text-sm">{formatBDT(sumDeposit)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 15. RECEIPT_VOID_AUDIT
  if (reportId === 'RECEIPT_VOID_AUDIT') {
    const rows = (data?.receiptVoidAudit ?? []) as ReceiptVoidAuditRow[]
    const sumVoided = rows.reduce((s, r) => s + r.amount, 0)

    const columns: ExportColumn[] = [
      { header: 'বাতিলকৃত রসিদ / Void Receipt #', key: 'receiptNumber', width: 20 },
      { header: 'মূল তারিখ / Orig Date', key: 'receiptDate', width: 14, isDate: true },
      { header: 'বাতিল সময় / Voided At', key: 'voidAt', width: 18 },
      { header: 'বর্ডার নাম / Boarder', key: 'boarderName', width: 22 },
      { header: 'পরিমাণ / Void Amount (৳)', key: 'amount', width: 18, isCurrency: true },
      { header: 'বাতিলের কারণ / Void Reason', key: 'voidReason', width: 28 },
      { header: 'বাতিলকারী / Authorized By', key: 'voidBy', width: 20 },
    ]

    const summaryRow = {
      receiptNumber: 'TOTAL AMOUNT VOIDED',
      amount: sumVoided,
    }

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, rows as unknown as Record<string, unknown>[], summaryRow as Record<string, unknown>)
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">বাতিলকৃত রসিদ নম্বর</th>
              <th className="py-3 px-4">মূল তারিখ</th>
              <th className="py-3 px-4">বাতিল সময়</th>
              <th className="py-3 px-4">বর্ডার</th>
              <th className="py-3 px-4 text-right">বাতিলকৃত পরিমাণ (৳)</th>
              <th className="py-3 px-4">বাতিলের কারণ (Reason)</th>
              <th className="py-3 px-4">অনুমোদনকারী কর্মকর্তা</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">কোনো বাতিলকৃত রসিদ পাওয়া যায়নি (Good Governance).</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="bg-rose-950/15">
                  <td className="py-3 px-4 font-mono font-semibold text-rose-300">{r.receiptNumber}</td>
                  <td className="py-3 px-4 text-slate-400">{formatDate(r.receiptDate)}</td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">{r.voidAt}</td>
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {r.boarderName} <span className="text-[10px] text-slate-500">({r.boarderCode})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-400">{formatBDT(r.amount)}</td>
                  <td className="py-3 px-4 text-slate-300 italic">{r.voidReason}</td>
                  <td className="py-3 px-4 text-slate-300 font-semibold">{r.voidBy}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-200">
              <tr>
                <td colSpan={4} className="py-3 px-4">মোট বাতিলকৃত টাকার পরিমাণ</td>
                <td className="py-3 px-4 text-right text-rose-400 text-sm">{formatBDT(sumVoided)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    )
  }

  // 16. MANAGER_COMPLIANCE
  if (reportId === 'MANAGER_COMPLIANCE') {
    const rows = (data?.managerCompliance ?? []) as ManagerComplianceRow[]

    const columns: ExportColumn[] = [
      { header: 'ম্যানেজার / Manager', key: 'managerName', width: 22 },
      { header: 'ফোন নম্বর / Phone', key: 'phoneNumber', width: 16 },
      { header: 'মোট আদায় / Receipts (৳)', key: 'totalReceiptsCollected', width: 20, isCurrency: true },
      { header: 'মোট ব্যয় / Expenses (৳)', key: 'totalExpensesDisbursed', width: 20, isCurrency: true },
      { header: 'ক্লোজিং সেশন / Sessions', key: 'totalSessionsCount', width: 16, align: 'center' },
      { header: 'কমপ্লায়েন্স হার / Timely Rate', key: 'compliancePctStr', width: 18, align: 'right' },
      { header: 'গরমিল সংখ্যা / Variances', key: 'varianceIncidentsCount', width: 16, align: 'center' },
      { header: 'নিট গরমিল / Net Variance (৳)', key: 'totalNetVariance', width: 20, isCurrency: true },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      compliancePctStr: `${r.compliancePercentage}%`,
    }))

    if (onExportColumnsReady) {
      onExportColumnsReady(columns, exportRows as unknown as Record<string, unknown>[])
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">ম্যানেজার নাম</th>
              <th className="py-3 px-4">ফোন</th>
              <th className="py-3 px-4 text-right">মোট আদায়</th>
              <th className="py-3 px-4 text-right">মোট ব্যয়</th>
              <th className="py-3 px-4 text-center">ক্লোজিং সেশন</th>
              <th className="py-3 px-4 text-right">সময়মত ক্লোজিং %</th>
              <th className="py-3 px-4 text-center">গরমিল ঘটনা</th>
              <th className="py-3 px-4 text-right">নিট গরমিল (Variance)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">কোনো তথ্য পাওয়া যায়নি।</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                  <td className="py-3 px-4 font-bold text-slate-200">{r.managerName}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{r.phoneNumber}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-400">{formatBDT(r.totalReceiptsCollected)}</td>
                  <td className="py-3 px-4 text-right font-medium text-rose-400">{formatBDT(r.totalExpensesDisbursed)}</td>
                  <td className="py-3 px-4 text-center text-slate-300">{r.totalSessionsCount}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      r.compliancePercentage >= 90
                        ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/40'
                        : 'text-amber-400 bg-amber-950/60 border border-amber-800/40'
                    }`}>
                      {r.compliancePercentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300">{r.varianceIncidentsCount}</td>
                  <td className={`py-3 px-4 text-right font-bold ${r.totalNetVariance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatBDT(r.totalNetVariance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

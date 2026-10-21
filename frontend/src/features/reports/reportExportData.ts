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
} from './types'
import type { ExportColumn } from '../../lib/exportUtils'

export interface ReportExportDataset {
  columns: ExportColumn[]
  rows: Record<string, unknown>[]
  summaryRow?: Record<string, unknown>
}

/**
 * Pure generator for export column definitions, structured rows, and summary footers.
 * Never executes side effects or React state updates during render.
 */
export function getReportExportData(reportId: ReportId, data: any): ReportExportDataset {
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
  }

  // 3. MONTHLY_OPERATING_STATEMENT
  if (reportId === 'MONTHLY_OPERATING_STATEMENT') {
    const rows = (data?.monthlyOperatingStatement ?? []) as MonthlyOperatingStatementRow[]

    const columns: ExportColumn[] = [
      { header: 'খাত / Account Line Item', key: 'category', width: 35 },
      { header: 'ধরন / Line Type', key: 'type', width: 16, align: 'center' },
      { header: 'পরিমাণ / Amount (৳)', key: 'amount', width: 22, isCurrency: true },
      { header: 'আয়ের অনুপাত / % of Revenue', key: 'percentageOfRevenue', width: 20, align: 'right' },
    ]

    const exportRows = rows.map((r) => ({
      ...r,
      percentageOfRevenue: `${(r.percentageOfRevenue || 0).toFixed(1)}%`,
    }))

    return { columns, rows: exportRows as unknown as Record<string, unknown>[] }
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

    return { columns, rows: exportRows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[] }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[] }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[] }
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
      variancePctStr: `${(r.variancePercentage || 0).toFixed(1)}%`,
    }))

    return { columns, rows: exportRows as unknown as Record<string, unknown>[] }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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
      pctStr: `${(r.percentageOfTotal || 0).toFixed(1)}%`,
    }))

    const summaryRow = {
      categoryName: 'TOTAL ALL CATEGORIES',
      totalAmount: sumTotal,
      pctStr: '100.0%',
      voucherCount: rows.reduce((s, r) => s + r.voucherCount, 0),
    }

    return { columns, rows: exportRows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: exportRows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: rows as unknown as Record<string, unknown>[], summaryRow }
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

    return { columns, rows: exportRows as unknown as Record<string, unknown>[] }
  }

  return { columns: [], rows: [] }
}

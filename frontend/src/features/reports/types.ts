/**
 * Bachelor Home ERP — 16 Financial & Operational Reports Suite Types
 */

export type ReportCategory =
  | 'FINANCIAL'
  | 'CASH_CUSTODY'
  | 'BOARDER_OPERATIONS'
  | 'COMPLIANCE_AUDIT'

export type ReportId =
  // Category 1: Financial Statements
  | 'DAILY_INCOME_EXPENSE'
  | 'WEEKLY_INCOME_EXPENSE'
  | 'MONTHLY_OPERATING_STATEMENT'
  | 'RECEIPT_COLLECTION'
  | 'EXPENSE_CATEGORY_ANALYSIS'
  | 'FLAT_EXPENSES'
  // Category 2: Cash Custody & Ledgers
  | 'ACCOUNT_LEDGERS'
  | 'MANAGER_DAILY_CASH'
  | 'DAILY_CASH_CLOSING'
  | 'CASH_VARIANCE_AUDIT'
  | 'OWNER_DEPOSITS'
  | 'CASH_HANDOVERS'
  // Category 3: Boarder & Deposits
  | 'BOARDER_DUES_AGING'
  | 'SECURITY_DEPOSITS'
  // Category 4: Compliance & Audits
  | 'RECEIPT_VOID_AUDIT'
  | 'MANAGER_COMPLIANCE'

export interface ReportDefinition {
  id: ReportId
  titleEn: string
  titleBn: string
  category: ReportCategory
  descriptionEn: string
  descriptionBn: string
  icon: string
}

export interface ReportFilterState {
  startDate: string
  endDate: string
  quickPeriod: 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_90_days' | 'this_year' | 'custom'
  buildingId: string
  flatId: string
  managerId: string
  accountId: string
}

export interface DailyIncomeExpenseRow {
  date: string
  rentReceipts: number
  otherIncomes: number
  totalInflow: number
  operatingExpenses: number
  netBalance: number
  transactionCount: number
}

export interface WeeklyIncomeExpenseRow {
  weekLabel: string
  startDate: string
  endDate: string
  totalIncome: number
  totalExpense: number
  netMargin: number
  receiptCount: number
  expenseCount: number
}

export interface MonthlyOperatingStatementRow {
  category: string
  type: 'INCOME' | 'EXPENSE' | 'SUMMARY'
  amount: number
  percentageOfRevenue: number
  previousMonthAmount?: number
  variancePercentage?: number
}

export interface ReceiptCollectionRow {
  receiptNumber: string
  date: string
  boarderName: string
  boarderCode: string
  flatName: string
  amount: number
  paymentMethod: string
  collectorName: string
  accountName: string
  isVoid: boolean
  remarks: string
}

export interface BoarderDuesAgingRow {
  boarderCode: string
  boarderName: string
  phoneNumber: string
  flatName: string
  seatName: string
  totalBilled: number
  totalPaid: number
  totalOutstandingDue: number
  currentDue: number // 0-30 days
  days31to60: number
  days61to90: number
  days90Plus: number
  oldestUnpaidMonth: string
}

export interface AccountLedgerRow {
  date: string
  accountName: string
  accountType: string
  transactionType: string
  referenceNo: string
  particulars: string
  debit: number // Money in
  credit: number // Money out
  runningBalance: number
}

export interface ManagerDailyCashRow {
  date: string
  managerName: string
  accountName: string
  openingCash: number
  receiptsCollected: number
  expensesPaid: number
  depositedToOwner: number
  handedOverIn: number
  handedOverOut: number
  closingCash: number
}

export interface DailyCashClosingRow {
  sessionDate: string
  managerName: string
  accountName: string
  expectedCash: number
  actualCountedCash: number
  variance: number
  varianceExplanation: string
  status: string
  submittedAt: string
}

export interface CashVarianceAuditRow {
  sessionDate: string
  managerName: string
  accountName: string
  expectedCash: number
  actualCountedCash: number
  varianceAmount: number
  varianceType: 'SHORTAGE' | 'EXCESS' | 'BALANCED'
  variancePercentage: number
  explanation: string
  reviewStatus: string
}

export interface OwnerDepositRow {
  depositNumber: string
  date: string
  managerName: string
  fromAccountName: string
  toAccountName: string
  amount: number
  paymentMethod: string
  transactionRef: string
  status: string
  confirmedBy: string
  confirmedAt: string
}

export interface CashHandoverRow {
  handoverNumber: string
  date: string
  senderManager: string
  receiverManager: string
  amount: number
  handoverReason: string
  status: string
  acceptedAt: string
}

export interface FlatExpenseRow {
  buildingName: string
  flatName: string
  flatCode: string
  utilityExpense: number
  maintenanceExpense: number
  cleaningExpense: number
  otherExpense: number
  totalExpense: number
  expenseCount: number
}

export interface ExpenseCategoryAnalysisRow {
  categoryName: string
  totalAmount: number
  percentageOfTotal: number
  voucherCount: number
  averageAmount: number
  highestVoucher: number
}

export interface SecurityDepositRow {
  boarderName: string
  boarderCode: string
  flatName: string
  seatName: string
  allocationStart: string
  securityDepositBilled: number
  securityDepositPaid: number
  status: string
  currentAllocationStatus: string
}

export interface ReceiptVoidAuditRow {
  receiptNumber: string
  receiptDate: string
  voidAt: string
  boarderName: string
  boarderCode: string
  amount: number
  paymentMethod: string
  voidReason: string
  voidBy: string
}

export interface ManagerComplianceRow {
  managerName: string
  phoneNumber: string
  totalReceiptsCollected: number
  totalExpensesDisbursed: number
  totalSessionsCount: number
  timelySubmittedSessions: number
  compliancePercentage: number
  varianceIncidentsCount: number
  totalNetVariance: number
}

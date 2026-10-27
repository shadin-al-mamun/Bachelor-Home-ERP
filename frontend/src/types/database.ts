/**
 * Bachelor Home ERP — TypeScript Database & Domain Types
 * Derived directly from PostgreSQL 15+ Schema & Supabase API Contracts
 */

// ==============================================================================
// 1. ENUMS & CONSTANTS
// ==============================================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'MEAL_OPERATOR'
  | 'BOARDER'
  | 'APPLICANT'
  | 'AUDITOR'

export type BuildingStatus = 'ACTIVE' | 'INACTIVE'
export type FlatStatus = 'ACTIVE' | 'INACTIVE'
export type RoomStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
export type BoarderStatus = 'PENDING' | 'ACTIVE' | 'LEFT' | 'REJECTED'
export type AllocationStatus = 'ACTIVE' | 'ENDED' | 'TRANSFERRED' | 'CANCELLED'
export type FinancialAccountType = 'CASH_MANAGER' | 'CASH_OWNER' | 'BANK' | 'MFS'
export type ChargeType = 'RENT' | 'UTILITY' | 'MEAL' | 'PENALTY' | 'ADMISSION_FEE' | 'OTHER'
export type ChargeStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOID'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MFS'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type CashSessionStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REOPENED'
export type HandoverStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
export type DepositStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED'
export type MealSession = 'BREAKFAST' | 'LUNCH' | 'DINNER'
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'VOID' | 'OVERRIDE'

// ==============================================================================
// 2. CORE DOMAIN ENTITIES
// ==============================================================================

export interface Profile {
  id: string // UUID references auth.users(id)
  email: string
  full_name: string
  phone_number: string
  role: UserRole
  is_active: boolean
  preferred_language: 'bn' | 'en'
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface UserFlatAssignment {
  id: string
  user_id: string
  flat_id: string
  assigned_at: string
  assigned_by?: string | null
}

export interface Building {
  id: string
  building_code: string
  name: string
  address: string
  status: BuildingStatus
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Flat {
  id: string
  building_id: string
  flat_code: string
  name: string
  floor_number?: number | null
  status: FlatStatus
  created_at: string
  updated_at: string
  // Optional expanded relations
  building?: Building
}

export interface Room {
  id: string
  flat_id: string
  room_code: string
  name: string
  room_type: string
  capacity: number
  status: RoomStatus
  description?: string | null
  created_at: string
  updated_at: string
  // Optional expanded relations
  flat?: Flat
}

export interface Seat {
  id: string
  room_id: string
  seat_code: string
  seat_name: string
  seat_type: string
  default_rent: number
  status: SeatStatus
  description?: string | null
  created_at: string
  updated_at: string
  // Optional expanded relations
  room?: Room
  allocations?: Allocation[]
  active_allocation?: Allocation | null
  allocation_id?: string | null
  occupant_name?: string | null
  occupant_code?: string | null
  occupant_id?: string | null
  occupant_rent?: number | null
}

export interface Boarder {
  id: string
  user_id?: string | null
  boarder_code: string
  full_name: string
  phone_number: string
  email?: string | null
  photo_url?: string | null
  nid_passport_number?: string | null
  nid_document_url?: string | null
  student_id?: string | null
  institution?: string | null
  department?: string | null
  session?: string | null
  guardian_name: string
  guardian_phone: string
  guardian_relation?: string | null
  present_address?: string | null
  permanent_address: string
  emergency_contact?: string | null
  admission_date: string
  leaving_date?: string | null
  status: BoarderStatus
  remarks?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string

  // Police Verification & Tenant Form Fields
  father_name?: string | null
  date_of_birth?: string | null
  marital_status?: string | null
  religion?: string | null
  educational_qualification?: string | null
  occupation?: string | null
  workplace_address?: string | null
  passport_number?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relation?: string | null
  emergency_contact_address?: string | null
  emergency_contact_phone?: string | null
}

export interface Allocation {
  id: string
  boarder_id: string
  seat_id: string
  monthly_rent: number
  security_deposit: number
  start_date: string
  end_date?: string | null
  status: AllocationStatus
  cancellation_reason?: string | null
  remarks?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Optional expanded relations
  boarder?: Boarder
  seat?: Seat
}

export interface AllocationHistory {
  id: string
  allocation_id: string
  previous_seat_id?: string | null
  new_seat_id?: string | null
  change_type: string
  effective_date: string
  reason?: string | null
  recorded_by?: string | null
  created_at: string
}

// ==============================================================================
// 3. FINANCIAL DOMAIN ENTITIES
// ==============================================================================

export interface FinancialAccount {
  id: string
  account_name: string
  account_type: FinancialAccountType
  account_number?: string | null
  bank_name?: string | null
  opening_balance?: number
  opening_balance_date?: string
  opening_balance_source?: string
  current_balance: number
  assigned_manager_id?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BillingHead {
  id: string
  code: string
  name_bn: string
  name_en: string
  category: 'RENT' | 'MEAL' | 'MISC' | 'ADVANCE' | 'SERVICE_CHARGE' | 'OTHER'
  description?: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface ReceiptItem {
  id: string
  receipt_id: string
  head_code: string
  head_name: string
  amount: number
  billing_month?: string | null
  description?: string | null
  charge_id?: string | null
  created_at: string
}

export interface AccountTransfer {
  id: string
  transfer_number: string
  from_account_id: string
  to_account_id: string
  amount: number
  transfer_date: string
  reference?: string | null
  remarks?: string | null
  created_by: string
  created_at: string
  // Optional expanded relations
  from_account?: FinancialAccount
  to_account?: FinancialAccount
  creator?: Profile
}

export interface BoarderCharge {
  id: string
  boarder_id: string
  allocation_id?: string | null
  charge_type: ChargeType
  billing_month: string // '2026-10-01'
  amount: number
  paid_amount: number
  due_amount: number // Generated column: amount - paid_amount
  status: ChargeStatus
  due_date: string
  description?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Optional expanded relations
  boarder?: Boarder
}

export interface Receipt {
  id: string
  receipt_number: string
  boarder_id: string
  received_by: string
  destination_account_id: string
  amount: number
  payment_method: PaymentMethod
  transaction_reference?: string | null
  receipt_date: string
  is_void: boolean
  void_reason?: string | null
  void_by?: string | null
  void_at?: string | null
  remarks?: string | null
  created_at: string
  // Optional expanded relations
  boarder?: Boarder
  destination_account?: FinancialAccount
  items?: ReceiptItem[]
}

export interface ReceiptAllocation {
  id: string
  receipt_id: string
  charge_id: string
  allocated_amount: number
  created_at: string
  charge?: BoarderCharge
}

export type ExpenseScope = 'HOSTEL_MARKET' | 'HOSTEL_MISC' | 'FLAT_MISC'

export interface ExpenseCategory {
  id: string
  name: string
  description?: string | null
  category_scope?: ExpenseScope
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  expense_voucher_no: string
  category_id: string
  amount: number
  source_account_id: string
  building_id?: string | null
  flat_id?: string | null
  expense_date: string
  billing_month?: string | null
  expense_scope?: ExpenseScope
  vendor_name?: string | null
  description: string
  voucher_attachment_url?: string | null
  paid_by: string
  approval_status: ApprovalStatus
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  source_account?: FinancialAccount
  building?: Building
  flat?: Flat
  payer?: Profile
  approver?: Profile
}

export interface FlatMonthlyDistribution {
  id: string
  flat_id: string
  billing_month: string // '2026-10-01'
  total_expense: number
  total_seats: number
  per_seat_amount: number
  is_billed: boolean
  billed_at?: string | null
  billed_by?: string | null
  breakdown?: any[]
  created_at: string
  updated_at: string
  flat?: Flat
}

export interface IncomeCategory {
  id: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: string
}

export interface Income {
  id: string
  income_voucher_no: string
  category_id: string
  amount: number
  destination_account_id: string
  building_id?: string | null
  flat_id?: string | null
  income_date: string
  description: string
  received_by: string
  created_at: string
  updated_at: string
  category?: IncomeCategory
  destination_account?: FinancialAccount
  building?: Building
  flat?: Flat
  receiver?: Profile
}

// ==============================================================================
// 4. CASH CUSTODY & RECONCILIATION
// ==============================================================================

export interface ManagerCashSession {
  id: string
  manager_id: string
  account_id: string
  session_date: string
  opening_cash: number
  cash_receipts: number
  cash_expenses: number
  cash_deposited_to_owner: number
  cash_handed_over_out: number
  cash_handed_over_in: number
  expected_closing_cash: number
  actual_counted_cash?: number | null
  cash_variance?: number | null
  variance_explanation?: string | null
  status: CashSessionStatus
  submitted_at?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  reopen_reason?: string | null
  created_at: string
  updated_at: string
  manager?: Profile
  account?: FinancialAccount
}

export interface OwnerDeposit {
  id: string
  deposit_number: string
  manager_id: string
  from_account_id: string
  to_account_id: string
  amount: number
  payment_method: string
  transaction_reference?: string | null
  proof_attachment_url?: string | null
  status: DepositStatus
  confirmed_by?: string | null
  confirmed_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  manager?: Profile
  from_account?: FinancialAccount
  to_account?: FinancialAccount
  confirmer?: Profile
}

export interface CashHandover {
  id: string
  handover_number: string
  sender_manager_id: string
  receiver_manager_id: string
  amount: number
  handover_reason: string
  status: HandoverStatus
  accepted_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
  sender_manager?: Profile
  receiver_manager?: Profile
}

// ==============================================================================
// 5. MEAL ENGINE ENTITIES
// ==============================================================================

export interface MealSettings {
  id: string
  is_meal_module_enabled: boolean
  breakfast_enabled: boolean
  lunch_enabled: boolean
  dinner_enabled: boolean
  cutoff_time: string // '22:00:00'
  updated_by?: string | null
  updated_at: string
}

export interface MealRate {
  id: string
  effective_from: string
  effective_to?: string | null
  breakfast_rate: number
  lunch_rate: number
  dinner_rate: number
  created_by?: string | null
  created_at: string
}

export interface MealSelection {
  id: string
  boarder_id: string
  flat_id: string
  meal_date: string
  breakfast: boolean
  lunch: boolean
  dinner: boolean
  is_locked: boolean
  is_override: boolean
  override_reason?: string | null
  override_by?: string | null
  created_at: string
  updated_at: string
}

export interface MealChangeAudit {
  id: string
  selection_id: string
  boarder_id: string
  meal_date: string
  session_changed: MealSession
  old_value: boolean
  new_value: boolean
  changed_by: string
  changed_at: string
}

// ==============================================================================
// 6. AUDIT & NOTIFICATIONS
// ==============================================================================

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
  actor_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export type NotificationType = 'INFO' | 'WARNING' | 'ALERT' | 'MEAL' | 'SYSTEM'

export interface SystemNotification {
  id: string
  recipient_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  action_url?: string | null
  metadata?: Record<string, any> | null
  created_at: string
}

// ==============================================================================
// 7. ANALYTICAL SQL VIEW MODELS
// ==============================================================================

export interface ManagerDailyReconciliationView {
  session_id: string
  session_date: string
  manager_name: string
  manager_phone: string
  account_name: string
  opening_cash: number
  cash_receipts: number
  cash_expenses: number
  cash_deposited_to_owner: number
  cash_handed_over_in: number
  cash_handed_over_out: number
  expected_closing_cash: number
  actual_counted_cash?: number | null
  cash_variance?: number | null
  variance_explanation?: string | null
  status: CashSessionStatus
  submitted_at?: string | null
}

export interface FlatDailyMealSummaryView {
  meal_date: string
  building_name: string
  flat_id: string
  flat_name: string
  flat_code: string
  breakfast_count: number
  lunch_count: number
  dinner_count: number
  total_meals: number
}

export interface BoarderDuesSummaryView {
  boarder_id: string
  boarder_code: string
  full_name: string
  phone_number: string
  flat_name: string
  seat_name: string
  total_billed: number
  total_paid: number
  total_outstanding_due: number
  overdue_amount: number
}

// ==============================================================================
// 8. API REQUEST / RESPONSE DTOs
// ==============================================================================

export interface MealSelectionToggleRequest {
  meal_date: string
  session: MealSession
  new_state: boolean
  override_reason?: string
  target_boarder_id?: string
}

export interface RecordReceiptRequest {
  boarder_id: string
  amount: number
  payment_method: PaymentMethod
  destination_account_id: string
  reference?: string
  allocations?: Array<{ charge_id: string; amount: number }>
  remarks?: string
}

export interface DailyCashCloseRequest {
  session_id: string
  actual_counted_cash: number
  variance_explanation?: string
}

export interface CashHandoverRequest {
  receiver_manager_id: string
  amount: number
  handover_reason: string
}

export interface OwnerDepositRequest {
  from_account_id: string
  to_account_id: string
  amount: number
  payment_method: string
  transaction_reference?: string
  proof_attachment_url?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// ==============================================================================
// 9. SYSTEM BACKUP & PITR OPERATIONS
// ==============================================================================

export type BackupHealthStatusLevel = 'HEALTHY' | 'WARNING' | 'FAILED'

export interface SystemBackupLog {
  id: string
  backup_name: string
  backup_type: 'FULL_DB' | 'PITR_WAL' | 'STORAGE_SNAPSHOT'
  status: BackupHealthStatusLevel
  file_size_bytes: number
  storage_location: string
  completed_at: string
  details?: Record<string, any> | null
  created_by?: string | null
}

export interface BackupHealthStatus {
  status: BackupHealthStatusLevel
  last_backup_time: string
  backup_name: string
  file_size_formatted: string
  retention_policy: string
  storage_provider: string
  is_automated: boolean
}

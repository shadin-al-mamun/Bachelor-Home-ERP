export type StaffDepartment =
  | 'KITCHEN'
  | 'CLEANING'
  | 'SECURITY'
  | 'MAINTENANCE'
  | 'MANAGEMENT'
  | 'OTHER'

export type StaffAdvanceStatus = 'PENDING' | 'DEDUCTED' | 'CANCELLED'
export type PayrollSheetStatus = 'DRAFT' | 'APPROVED' | 'DISBURSED' | 'CANCELLED'
export type PayrollPaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_PAID'

export interface StaffMember {
  id: string
  staff_code: string
  profile_id?: string | null
  full_name: string
  phone_number: string
  emergency_contact?: string | null
  designation: string
  department: StaffDepartment
  nid_number?: string | null
  avatar_url?: string | null
  assigned_building_id?: string | null
  assigned_building?: { id: string; name: string } | null
  assigned_flat_id?: string | null
  assigned_flat?: { id: string; name: string; flat_code: string } | null
  joining_date: string
  resignation_date?: string | null
  monthly_salary: number
  is_active: boolean
  payment_method?: string | null
  bank_or_mfs_account?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface StaffAdvance {
  id: string
  voucher_no: string
  staff_id: string
  staff?: StaffMember | null
  amount: number
  advance_date: string
  disbursed_from_account_id: string
  disbursed_from_account?: { id: string; account_name: string; account_type: string } | null
  disbursed_by?: string | null
  disbursed_by_profile?: { id: string; full_name: string } | null
  status: StaffAdvanceStatus
  deducted_amount: number
  payroll_sheet_id?: string | null
  expense_id?: string | null
  remarks?: string | null
  created_at: string
}

export interface PayrollItem {
  id: string
  payroll_sheet_id: string
  staff_id: string
  staff?: StaffMember | null
  basic_salary: number
  bonus_overtime: number
  advance_deduction: number
  absence_deduction: number
  other_deduction: number
  net_payable: number
  paid_amount: number
  payment_status: PayrollPaymentStatus
  disbursed_from_account_id?: string | null
  disbursed_from_account?: { id: string; account_name: string } | null
  disbursed_by?: string | null
  disbursement_date?: string | null
  expense_id?: string | null
  remarks?: string | null
  created_at: string
}

export interface PayrollSheet {
  id: string
  payroll_month: string // e.g. '2026-11'
  payroll_batch_no: string // e.g. 'PAY-2026-11'
  total_basic_salary: number
  total_bonuses: number
  total_deductions: number
  total_net_payable: number
  total_paid_amount: number
  status: PayrollSheetStatus
  prepared_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
  remarks?: string | null
  created_at: string
  updated_at?: string
  items?: PayrollItem[]
}

export interface CreateStaffMemberParams {
  full_name: string
  phone_number: string
  emergency_contact?: string
  designation: string
  department: StaffDepartment
  nid_number?: string
  avatar_url?: string
  assigned_building_id?: string
  assigned_flat_id?: string
  joining_date?: string
  monthly_salary: number
  payment_method?: string
  bank_or_mfs_account?: string
  notes?: string
}

export interface RecordStaffAdvanceParams {
  staff_id: string
  amount: number
  disbursed_from_account_id: string
  advance_date?: string
  remarks?: string
}

export interface GeneratePayrollParams {
  payroll_month: string // 'YYYY-MM'
  remarks?: string
}

export interface DisbursePayrollItemParams {
  payroll_item_id: string
  disbursed_from_account_id: string
  remarks?: string
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'
import type {
  StaffMember,
  StaffAdvance,
  PayrollSheet,
  PayrollItem,
  CreateStaffMemberParams,
  RecordStaffAdvanceParams,
  GeneratePayrollParams,
  DisbursePayrollItemParams,
} from '@/types/hr'

const LOCAL_STAFF_KEY = 'erp_staff_members_v1'
const LOCAL_ADVANCES_KEY = 'erp_staff_advances_v1'
const LOCAL_PAYROLL_KEY = 'erp_payroll_sheets_v1'

function getStoredStaff(): StaffMember[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STAFF_KEY)
    if (!raw) {
      return []
    }
    const parsed: StaffMember[] = JSON.parse(raw)
    // Strip away any legacy mock demo employees
    const filtered = parsed.filter(
      (s) =>
        !s.id.startsWith('stf-00') &&
        !s.id.startsWith('stf-mock') &&
        !['মো. রফিকুল ইসলাম', 'মো. জাহিদ হোসেন', 'রহিমা বেগম (খালা)', 'মো. আব্দুল জব্বার'].includes(s.full_name)
    )
    if (filtered.length !== parsed.length) {
      localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(filtered))
    }
    return filtered
  } catch {
    return []
  }
}

function saveStoredStaff(staff: StaffMember[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staff))
}

function getStoredAdvances(): StaffAdvance[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_ADVANCES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredAdvances(advances: StaffAdvance[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_ADVANCES_KEY, JSON.stringify(advances))
}

function getStoredPayroll(): PayrollSheet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_PAYROLL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredPayroll(sheets: PayrollSheet[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(sheets))
}

// ==============================================================================
// 1. Staff Members Directory Hooks
// ==============================================================================

export function useStaffMembers() {
  return useQuery({
    queryKey: ['staff-members'],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!isSupabaseConfigured) {
        return getStoredStaff()
      }

      try {
        const { data, error } = await supabase
          .from('staff_members')
          .select(`
            *,
            assigned_building:buildings(id, name),
            assigned_flat:flats(id, name, flat_code)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('staff_members query failed, using stored staff:', error.message)
          return getStoredStaff()
        }

        const supabaseStaff = (data || []) as StaffMember[]
        const localOnlyStaff = getStoredStaff().filter(
          (local) => !supabaseStaff.some((remote) => remote.id === local.id || remote.staff_code === local.staff_code)
        )
        return [...supabaseStaff, ...localOnlyStaff]
      } catch (err) {
        console.warn('staff_members network exception, falling back:', err)
        return getStoredStaff()
      }
    },
  })
}

export function useCreateStaffMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (params: CreateStaffMemberParams) => {
      const code = `STF-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`

      if (!isSupabaseConfigured) {
        const newStaff: StaffMember = {
          id: `stf-${Date.now()}`,
          staff_code: code,
          profile_id: params.profile_id || null,
          full_name: params.full_name,
          phone_number: params.phone_number,
          emergency_contact: params.emergency_contact,
          designation: params.designation,
          department: params.department,
          nid_number: params.nid_number,
          avatar_url: params.avatar_url,
          assigned_building_id: params.assigned_building_id,
          assigned_flat_id: params.assigned_flat_id,
          joining_date: params.joining_date || new Date().toISOString().slice(0, 10),
          monthly_salary: Number(params.monthly_salary) || 0,
          is_active: true,
          payment_method: params.payment_method || 'CASH',
          bank_or_mfs_account: params.bank_or_mfs_account,
          notes: params.notes,
          created_at: new Date().toISOString(),
        }
        const updated = [newStaff, ...getStoredStaff()]
        saveStoredStaff(updated)
        return newStaff
      }

      const { data, error } = await supabase
        .from('staff_members')
        .insert({
          staff_code: code,
          profile_id: params.profile_id || null,
          full_name: params.full_name,
          phone_number: params.phone_number,
          emergency_contact: params.emergency_contact,
          designation: params.designation,
          department: params.department,
          nid_number: params.nid_number,
          avatar_url: params.avatar_url,
          assigned_building_id: params.assigned_building_id || null,
          assigned_flat_id: params.assigned_flat_id || null,
          joining_date: params.joining_date || new Date().toISOString().slice(0, 10),
          monthly_salary: Number(params.monthly_salary) || 0,
          payment_method: params.payment_method || 'CASH',
          bank_or_mfs_account: params.bank_or_mfs_account,
          notes: params.notes,
        })
        .select()
        .single()

      if (error) {
        if (
          error.message?.includes('schema cache') ||
          error.message?.includes('staff_members') ||
          error.code === '42P01' ||
          error.code === 'PGRST204'
        ) {
          console.warn('staff_members table not in Supabase yet, falling back to local storage:', error.message)
          const fallbackStaff: StaffMember = {
            id: `stf-local-${Date.now()}`,
            staff_code: code,
            profile_id: params.profile_id || null,
            full_name: params.full_name,
            phone_number: params.phone_number,
            emergency_contact: params.emergency_contact,
            designation: params.designation,
            department: params.department,
            nid_number: params.nid_number,
            avatar_url: params.avatar_url,
            assigned_building_id: params.assigned_building_id || undefined,
            assigned_flat_id: params.assigned_flat_id || undefined,
            joining_date: params.joining_date || new Date().toISOString().slice(0, 10),
            monthly_salary: Number(params.monthly_salary) || 0,
            is_active: true,
            payment_method: params.payment_method || 'CASH',
            bank_or_mfs_account: params.bank_or_mfs_account,
            notes: params.notes,
            created_at: new Date().toISOString(),
          }
          const updated = [fallbackStaff, ...getStoredStaff()]
          saveStoredStaff(updated)
          return fallbackStaff
        }
        throw new Error(error.message || 'কর্মচারী তথ্য সংরক্ষণে ব্যর্থ হয়েছে।')
      }
      return data as StaffMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] })
    },
  })
}

export function useUpdateStaffMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StaffMember> }) => {
      if (!isSupabaseConfigured) {
        const staff = getStoredStaff().map((s) => (s.id === id ? { ...s, ...updates } : s))
        saveStoredStaff(staff)
        return staff.find((s) => s.id === id)
      }

      const { data, error } = await supabase
        .from('staff_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (
          error.message?.includes('schema cache') ||
          error.message?.includes('staff_members') ||
          error.code === '42P01' ||
          error.code === 'PGRST204'
        ) {
          const staff = getStoredStaff().map((s) => (s.id === id ? { ...s, ...updates } : s))
          saveStoredStaff(staff)
          return staff.find((s) => s.id === id) as StaffMember
        }
        throw new Error(error.message || 'আপডেট করতে ব্যর্থ হয়েছে।')
      }
      return data as StaffMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-members'] })
    },
  })
}

// ==============================================================================
// 2. Staff Advances & Loans Hooks
// ==============================================================================

export function useStaffAdvances(staffId?: string) {
  return useQuery({
    queryKey: ['staff-advances', staffId],
    queryFn: async (): Promise<StaffAdvance[]> => {
      if (!isSupabaseConfigured) {
        let list = getStoredAdvances()
        if (staffId) list = list.filter((a) => a.staff_id === staffId)
        return list
      }

      try {
        let query = supabase
          .from('staff_advances')
          .select(`
            *,
            staff:staff_members(id, full_name, staff_code, designation, department),
            disbursed_from_account:financial_accounts(id, account_name, account_type),
            disbursed_by_profile:profiles(id, full_name)
          `)
          .order('advance_date', { ascending: false })

        if (staffId) {
          query = query.eq('staff_id', staffId)
        }

        const { data, error } = await query
        if (error) {
          console.warn('staff_advances fetch failed, using fallback:', error.message)
          let list = getStoredAdvances()
          if (staffId) list = list.filter((a) => a.staff_id === staffId)
          return list
        }

        return (data || []) as StaffAdvance[]
      } catch (err) {
        console.warn('staff_advances exception:', err)
        let list = getStoredAdvances()
        if (staffId) list = list.filter((a) => a.staff_id === staffId)
        return list
      }
    },
  })
}

export function useRecordStaffAdvance() {
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async (params: RecordStaffAdvanceParams) => {
      const voucherNo = `ADV-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`

      if (!isSupabaseConfigured) {
        const staffList = getStoredStaff()
        const staff = staffList.find((s) => s.id === params.staff_id)
        const newAdvance: StaffAdvance = {
          id: `adv-${Date.now()}`,
          voucher_no: voucherNo,
          staff_id: params.staff_id,
          staff: staff || null,
          amount: Number(params.amount) || 0,
          advance_date: params.advance_date || new Date().toISOString().slice(0, 10),
          disbursed_from_account_id: params.disbursed_from_account_id,
          disbursed_from_account: { id: params.disbursed_from_account_id, account_name: 'ক্যাশ অ্যাকাউন্ট', account_type: 'CASH_MANAGER' },
          disbursed_by: profile?.id || null,
          status: 'PENDING',
          deducted_amount: 0,
          remarks: params.remarks,
          created_at: new Date().toISOString(),
        }
        const updated = [newAdvance, ...getStoredAdvances()]
        saveStoredAdvances(updated)
        return newAdvance
      }

      // Try PostgreSQL RPC with automatic cash drawer balance deduction and expense creation
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('fn_disburse_staff_advance', {
          p_staff_id: params.staff_id,
          p_amount: Number(params.amount),
          p_disbursed_from_account_id: params.disbursed_from_account_id,
          p_advance_date: params.advance_date || new Date().toISOString().slice(0, 10),
          p_remarks: params.remarks || null,
        })

        if (!rpcError && rpcData) {
          return rpcData
        }
      } catch (rpcErr) {
        console.warn('fn_disburse_staff_advance RPC fallback:', rpcErr)
      }

      // Direct fallback insert
      const { data, error } = await supabase
        .from('staff_advances')
        .insert({
          voucher_no: voucherNo,
          staff_id: params.staff_id,
          amount: Number(params.amount),
          advance_date: params.advance_date || new Date().toISOString().slice(0, 10),
          disbursed_from_account_id: params.disbursed_from_account_id,
          disbursed_by: profile?.id || null,
          remarks: params.remarks,
          status: 'PENDING',
        })
        .select()
        .single()

      if (error) throw new Error(error.message || 'অগ্রিম বেতন সংরক্ষণে ব্যর্থ হয়েছে।')
      return data as StaffAdvance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-advances'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['manager-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

// ==============================================================================
// 3. Monthly Payroll Sheets & Payslip Hooks
// ==============================================================================

export function usePayrollSheets() {
  return useQuery({
    queryKey: ['payroll-sheets'],
    queryFn: async (): Promise<PayrollSheet[]> => {
      if (!isSupabaseConfigured) {
        return getStoredPayroll()
      }

      try {
        const { data, error } = await supabase
          .from('payroll_sheets')
          .select(`
            *,
            items:payroll_items(
              id,
              staff_id,
              basic_salary,
              bonus_overtime,
              advance_deduction,
              absence_deduction,
              other_deduction,
              net_payable,
              paid_amount,
              payment_status,
              disbursed_from_account_id,
              disbursement_date,
              remarks,
              staff:staff_members(id, full_name, staff_code, designation, department, monthly_salary, phone_number)
            )
          `)
          .order('payroll_month', { ascending: false })

        if (error) {
          console.warn('payroll_sheets fetch error, using stored payroll:', error.message)
          return getStoredPayroll()
        }

        return (data || []) as PayrollSheet[]
      } catch (err) {
        console.warn('payroll_sheets query exception:', err)
        return getStoredPayroll()
      }
    },
  })
}

export function useGeneratePayrollSheet() {
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async (params: GeneratePayrollParams) => {
      const month = params.payroll_month // 'YYYY-MM'
      const batchNo = `PAY-${month}`

      // 1. Fetch active staff members
      let staffList: StaffMember[] = []
      if (!isSupabaseConfigured) {
        staffList = getStoredStaff().filter((s) => s.is_active)
      } else {
        const { data } = await supabase.from('staff_members').select('*').eq('is_active', true)
        staffList = (data || []) as StaffMember[]
      }

      if (staffList.length === 0) {
        throw new Error('কোনো সক্রিয় কর্মচারী পাওয়া যায়নি। আগে কর্মচারী যুক্ত করুন।')
      }

      // 2. Fetch pending advances for each staff
      let allAdvances: StaffAdvance[] = []
      if (!isSupabaseConfigured) {
        allAdvances = getStoredAdvances().filter((a) => a.status === 'PENDING')
      } else {
        const { data: advData } = await supabase
          .from('staff_advances')
          .select('*')
          .eq('status', 'PENDING')
        allAdvances = (advData || []) as StaffAdvance[]
      }

      // 3. Calculate payroll items
      let totalBasic = 0
      let totalDeductions = 0
      let totalNetPayable = 0

      const items: Partial<PayrollItem>[] = staffList.map((s) => {
        const basic = Number(s.monthly_salary) || 0
        const staffAdvances = allAdvances.filter((a) => a.staff_id === s.id)
        const advanceDeduction = staffAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
        const netPayable = Math.max(0, basic - advanceDeduction)

        totalBasic += basic
        totalDeductions += advanceDeduction
        totalNetPayable += netPayable

        return {
          id: `item-${s.id}-${Date.now()}`,
          staff_id: s.id,
          staff: s,
          basic_salary: basic,
          bonus_overtime: 0,
          advance_deduction: advanceDeduction,
          absence_deduction: 0,
          other_deduction: 0,
          net_payable: netPayable,
          paid_amount: 0,
          payment_status: 'UNPAID',
        }
      })

      if (!isSupabaseConfigured) {
        const existing = getStoredPayroll()
        const existingIdx = existing.findIndex((p) => p.payroll_month === month)

        const newSheet: PayrollSheet = {
          id: `pay-${month}-${Date.now()}`,
          payroll_month: month,
          payroll_batch_no: batchNo,
          total_basic_salary: totalBasic,
          total_bonuses: 0,
          total_deductions: totalDeductions,
          total_net_payable: totalNetPayable,
          total_paid_amount: 0,
          status: 'DRAFT',
          prepared_by: profile?.id || null,
          remarks: params.remarks || `${month} মাসের নিয়মিত বেতন শিট`,
          created_at: new Date().toISOString(),
          items: items as PayrollItem[],
        }

        let updated: PayrollSheet[]
        if (existingIdx >= 0) {
          updated = [...existing]
          updated[existingIdx] = newSheet
        } else {
          updated = [newSheet, ...existing]
        }
        saveStoredPayroll(updated)
        return newSheet
      }

      // Supabase insert / upsert
      const { data: sheetData, error: sheetErr } = await supabase
        .from('payroll_sheets')
        .upsert(
          {
            payroll_month: month,
            payroll_batch_no: batchNo,
            total_basic_salary: totalBasic,
            total_bonuses: 0,
            total_deductions: totalDeductions,
            total_net_payable: totalNetPayable,
            total_paid_amount: 0,
            status: 'DRAFT',
            prepared_by: profile?.id || null,
            remarks: params.remarks || `${month} মাসের নিয়মিত বেতন শিট`,
          },
          { onConflict: 'payroll_batch_no' }
        )
        .select()
        .single()

      if (sheetErr || !sheetData) {
        throw new Error(sheetErr?.message || 'বেতন শিট তৈরিতে ব্যর্থ হয়েছে।')
      }

      // Insert payroll items
      const itemRows = items.map((i) => ({
        payroll_sheet_id: sheetData.id,
        staff_id: i.staff_id!,
        basic_salary: i.basic_salary,
        bonus_overtime: i.bonus_overtime,
        advance_deduction: i.advance_deduction,
        absence_deduction: i.absence_deduction,
        other_deduction: i.other_deduction,
        net_payable: i.net_payable,
        paid_amount: 0,
        payment_status: 'UNPAID',
      }))

      await supabase.from('payroll_items').delete().eq('payroll_sheet_id', sheetData.id)
      const { error: itemErr } = await supabase.from('payroll_items').insert(itemRows)

      if (itemErr) {
        throw new Error(itemErr.message || 'বেতন শিটের আইটেম সংরক্ষণে ব্যর্থ হয়েছে।')
      }

      return sheetData as PayrollSheet
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-sheets'] })
    },
  })
}

export function useDisbursePayrollItem() {
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async (params: DisbursePayrollItemParams) => {
      if (!isSupabaseConfigured) {
        const sheets = getStoredPayroll()
        let found = false
        for (const sheet of sheets) {
          const itm = (sheet.items || []).find((i) => i.id === params.payroll_item_id)
          if (itm) {
            itm.payment_status = 'PAID'
            itm.paid_amount = itm.net_payable
            itm.disbursed_from_account_id = params.disbursed_from_account_id
            itm.disbursement_date = new Date().toISOString()
            found = true
            break
          }
        }
        if (found) {
          saveStoredPayroll(sheets)
          return { success: true }
        }
        throw new Error('বেতন শিটের আইটেম পাওয়া যায়নি।')
      }

      // Try RPC first for transaction safety & cash box deduction
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_disburse_payroll_item', {
          p_payroll_item_id: params.payroll_item_id,
          p_disbursed_from_account_id: params.disbursed_from_account_id,
          p_remarks: params.remarks || null,
        })
        if (!rpcErr && rpcData) {
          return rpcData
        }
      } catch (err) {
        console.warn('fn_disburse_payroll_item RPC fallback:', err)
      }

      // Direct fallback update
      const { data: item } = await supabase
        .from('payroll_items')
        .select('*, sheet:payroll_sheets(payroll_batch_no, payroll_month), staff:staff_members(full_name, designation)')
        .eq('id', params.payroll_item_id)
        .single()

      if (!item) throw new Error('আইটেম খুঁজে পাওয়া যায়নি।')

      // Deduct from financial account
      if (item.net_payable > 0) {
        await supabase
          .from('financial_accounts')
          .update({
            current_balance: supabase.rpc('decrement_balance', { amount: item.net_payable }) as any,
          })
          .eq('id', params.disbursed_from_account_id)
      }

      // Mark paid
      const { data, error } = await supabase
        .from('payroll_items')
        .update({
          payment_status: 'PAID',
          paid_amount: item.net_payable,
          disbursed_from_account_id: params.disbursed_from_account_id,
          disbursed_by: profile?.id || null,
          disbursement_date: new Date().toISOString(),
          remarks: params.remarks,
        })
        .eq('id', params.payroll_item_id)
        .select()
        .single()

      if (error) throw new Error(error.message || 'বেতন পরিশোধে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-sheets'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['manager-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['staff-advances'] })
    },
  })
}


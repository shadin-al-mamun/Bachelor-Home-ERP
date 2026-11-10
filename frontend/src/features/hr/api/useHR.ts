import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'
import {
  getStoredFinancialAccounts,
  saveStoredFinancialAccounts,
} from '@/features/billing/api/useReceipts'
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

const SALARY_EXPENSE_CATEGORY_ID = 'a1111111-1111-4111-8111-111111111105'

const LOCAL_STAFF_KEY = 'erp_staff_members_v1'
const LOCAL_ADVANCES_KEY = 'erp_staff_advances_v1'
const LOCAL_PAYROLL_KEY = 'erp_payroll_sheets_v1'

export function getStoredStaff(): StaffMember[] {
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

export function saveStoredStaff(staff: StaffMember[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_STAFF_KEY, JSON.stringify(staff))
}

export function getStoredAdvances(): StaffAdvance[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_ADVANCES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStoredAdvances(advances: StaffAdvance[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_ADVANCES_KEY, JSON.stringify(advances))
}

export function getStoredPayroll(): PayrollSheet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_PAYROLL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStoredPayroll(sheets: PayrollSheet[]) {
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
          allowances: params.allowances || [],
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
          allowances: params.allowances || [],
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
            allowances: params.allowances || [],
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
      const expVoucherNo = `EXP-${voucherNo.replace('ADV-', '')}`
      const targetDate = params.advance_date || new Date().toISOString().slice(0, 10)
      const amt = Number(params.amount)

      let staffList = getStoredStaff()
      let staff = staffList.find((s) => s.id === params.staff_id)
      if (!staff && isSupabaseConfigured) {
        try {
          const { data } = await supabase.from('staff_members').select('*').eq('id', params.staff_id).maybeSingle()
          if (data) staff = data as StaffMember
        } catch (e) {}
      }

      const staffName = staff?.full_name || 'কর্মচারী'
      const description = `অগ্রিম বেতন প্রদান: ${staffName} (ভাউচার: ${voucherNo})${params.remarks ? ' — ' + params.remarks : ''}`

      let newAdvance: StaffAdvance = {
        id: `adv-${Date.now()}`,
        voucher_no: voucherNo,
        staff_id: params.staff_id,
        staff: staff || null,
        amount: amt,
        advance_date: targetDate,
        disbursed_from_account_id: params.disbursed_from_account_id,
        disbursed_from_account: { id: params.disbursed_from_account_id, account_name: 'ক্যাশ অ্যাকাউন্ট', account_type: 'CASH_MANAGER' },
        disbursed_by: profile?.id || null,
        status: 'PENDING',
        deducted_amount: 0,
        remarks: params.remarks,
        created_at: new Date().toISOString(),
      }

      if (isSupabaseConfigured) {
        let rpcSuccess = false
        // Try PostgreSQL RPC with automatic cash drawer balance deduction and expense creation
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('fn_disburse_staff_advance', {
            p_staff_id: params.staff_id,
            p_amount: amt,
            p_disbursed_from_account_id: params.disbursed_from_account_id,
            p_advance_date: targetDate,
            p_remarks: params.remarks || null,
          })

          if (!rpcError && rpcData) {
            newAdvance = rpcData
            rpcSuccess = true
          }
        } catch (rpcErr) {
          console.warn('fn_disburse_staff_advance RPC fallback:', rpcErr)
        }

        if (!rpcSuccess) {
          // Direct fallback:
          // A. Insert linked expense voucher into expenses table so it immediately reflects in /expenses & account ledger
          let expId: string | undefined = undefined
          try {
            const { data: expRow } = await supabase
              .from('expenses')
              .insert({
                expense_voucher_no: expVoucherNo,
                category_id: SALARY_EXPENSE_CATEGORY_ID,
                amount: amt,
                source_account_id: params.disbursed_from_account_id,
                expense_date: targetDate,
                description,
                paid_by: profile?.id || (await supabase.from('profiles').select('id').limit(1)).data?.[0]?.id,
                approval_status: 'APPROVED',
              })
              .select('id')
              .single()
            if (expRow?.id) {
              expId = expRow.id
              newAdvance.expense_id = expId
            }
          } catch (expErr) {
            console.warn('Direct expense insert warning for advance:', expErr)
          }

          // B. Insert staff advance record
          try {
            const { data: advRow, error: advErr } = await supabase
              .from('staff_advances')
              .insert({
                voucher_no: voucherNo,
                staff_id: params.staff_id,
                amount: amt,
                advance_date: targetDate,
                disbursed_from_account_id: params.disbursed_from_account_id,
                disbursed_by: profile?.id || null,
                remarks: params.remarks,
                expense_id: expId || null,
                status: 'PENDING',
              })
              .select()
              .single()

            if (!advErr && advRow) {
              newAdvance = advRow as StaffAdvance
            }
          } catch (advErr) {
            console.warn('Direct staff_advances insert warning:', advErr)
          }

          // C. Ensure financial account balance is decremented immediately in DB
          try {
            const { data: acc } = await supabase
              .from('financial_accounts')
              .select('current_balance')
              .eq('id', params.disbursed_from_account_id)
              .single()
            if (acc) {
              await supabase
                .from('financial_accounts')
                .update({ current_balance: Math.max(0, (Number(acc.current_balance) || 0) - amt) })
                .eq('id', params.disbursed_from_account_id)
            }
          } catch (accErr) {
            console.warn('Could not decrement account balance for advance:', accErr)
          }
        }
      }

      // Always maintain local advances cache
      const updated = [newAdvance, ...getStoredAdvances().filter((a) => a.id !== newAdvance.id && a.voucher_no !== newAdvance.voucher_no)]
      saveStoredAdvances(updated)

      // Always update local financial accounts cache
      const allAccs = getStoredFinancialAccounts()
      const accIdx = allAccs.findIndex((a) => a.id === params.disbursed_from_account_id)
      if (accIdx >= 0) {
        allAccs[accIdx].current_balance = Math.max(0, (Number(allAccs[accIdx].current_balance) || 0) - amt)
        saveStoredFinancialAccounts(allAccs)
      }

      return newAdvance
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-advances'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['manager-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['cash-sessions'] })
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
      const localSheets = getStoredPayroll()

      if (!isSupabaseConfigured) {
        return localSheets
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

        if (error || !data) {
          console.warn('payroll_sheets fetch error, using stored payroll:', error?.message)
          return localSheets
        }

        const remoteSheets = (data || []) as PayrollSheet[]
        // Merge remote and local sheets
        const merged: PayrollSheet[] = [...remoteSheets]
        localSheets.forEach((ls) => {
          const existingIdx = merged.findIndex((ms) => ms.payroll_month === ls.payroll_month)
          if (existingIdx === -1) {
            merged.push(ls)
          } else if ((!merged[existingIdx].items || merged[existingIdx].items.length === 0) && ls.items && ls.items.length > 0) {
            merged[existingIdx].items = ls.items
          }
        })
        return merged
      } catch (err) {
        console.warn('payroll_sheets query exception:', err)
        return localSheets
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

      // 1. Fetch active staff members (combine Supabase + local)
      let staffList: StaffMember[] = []
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.from('staff_members').select('*').eq('is_active', true)
          if (!error && data) {
            staffList = data as StaffMember[]
          }
        } catch (err) {
          console.warn('staff_members fetch in generate payroll failed:', err)
        }
      }
      const localStaff = getStoredStaff().filter((s) => s.is_active)
      localStaff.forEach((ls) => {
        if (!staffList.some((s) => s.id === ls.id || s.staff_code === ls.staff_code)) {
          staffList.push(ls)
        }
      })

      if (staffList.length === 0) {
        throw new Error('কোনো সক্রিয় কর্মচারী বা কর্মকর্তা পাওয়া যায়নি। আগে কর্মচারী তালিকায় কর্মী যুক্ত করুন।')
      }

      // 2. Fetch pending advances for each staff (combine Supabase + local)
      let allAdvances: StaffAdvance[] = []
      if (isSupabaseConfigured) {
        try {
          const { data: advData, error: advErr } = await supabase
            .from('staff_advances')
            .select('*')
            .eq('status', 'PENDING')
          if (!advErr && advData) {
            allAdvances = advData as StaffAdvance[]
          }
        } catch (err) {
          console.warn('staff_advances fetch in generate payroll failed:', err)
        }
      }
      const localAdvances = getStoredAdvances().filter((a) => a.status === 'PENDING')
      localAdvances.forEach((la) => {
        if (!allAdvances.some((a) => a.id === la.id || a.voucher_no === la.voucher_no)) {
          allAdvances.push(la)
        }
      })

      // 3. Calculate payroll items
      let totalBasic = 0
      let totalDeductions = 0
      let totalNetPayable = 0

      const items: PayrollItem[] = staffList.map((s) => {
        const basic = Number(s.monthly_salary) || 0
        const alwTotal = (s.allowances || []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
        const grossSalary = basic + alwTotal
        const staffAdvances = allAdvances.filter((a) => a.staff_id === s.id)
        const advanceDeduction = staffAdvances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
        const netPayable = Math.max(0, grossSalary - advanceDeduction)

        totalBasic += grossSalary
        totalDeductions += advanceDeduction
        totalNetPayable += netPayable

        return {
          id: `item-${s.id}-${Date.now()}`,
          payroll_sheet_id: `pay-${month}`,
          staff_id: s.id,
          staff: s,
          basic_salary: basic,
          allowances: s.allowances || [],
          allowances_total: alwTotal,
          bonus_overtime: 0,
          advance_deduction: advanceDeduction,
          absence_deduction: 0,
          other_deduction: 0,
          net_payable: netPayable,
          paid_amount: 0,
          payment_status: 'UNPAID',
          created_at: new Date().toISOString(),
        }
      })

      const completeSheet: PayrollSheet = {
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
        items: items,
      }

      // Try saving to Supabase if configured
      if (isSupabaseConfigured) {
        try {
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

          if (!sheetErr && sheetData) {
            completeSheet.id = sheetData.id
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
            await supabase.from('payroll_items').insert(itemRows)
          }
        } catch (supabaseErr) {
          console.warn('Supabase payroll_sheets upsert failed, stored in local cache:', supabaseErr)
        }
      }

      // Always save to localStorage
      const existing = getStoredPayroll()
      const existingIdx = existing.findIndex((p) => p.payroll_month === month)
      let updated: PayrollSheet[]
      if (existingIdx >= 0) {
        updated = [...existing]
        updated[existingIdx] = completeSheet
      } else {
        updated = [completeSheet, ...existing]
      }
      saveStoredPayroll(updated)
      return completeSheet
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
      // 1. Update localStorage
      const sheets = getStoredPayroll()
      let matchedStaffId: string | null = null

      for (const sheet of sheets) {
        const itm = (sheet.items || []).find((i) => i.id === params.payroll_item_id)
        if (itm) {
          itm.payment_status = 'PAID'
          itm.paid_amount = itm.net_payable
          itm.disbursed_from_account_id = params.disbursed_from_account_id
          itm.disbursement_date = new Date().toISOString()
          matchedStaffId = itm.staff_id
          break
        }
      }
      saveStoredPayroll(sheets)

      // Deduct advance from local advances
      if (matchedStaffId) {
        const advances = getStoredAdvances()
        advances.forEach((adv) => {
          if (adv.staff_id === matchedStaffId && adv.status === 'PENDING') {
            adv.status = 'DEDUCTED'
            adv.deducted_amount = adv.amount
          }
        })
        saveStoredAdvances(advances)
      }

      // Update local financial accounts
      const allAccs = getStoredFinancialAccounts()
      const accIdx = allAccs.findIndex((a) => a.id === params.disbursed_from_account_id)
      let disbursedAmount = 0
      for (const sheet of sheets) {
        const itm = (sheet.items || []).find((i) => i.id === params.payroll_item_id)
        if (itm) {
          disbursedAmount = itm.net_payable
          break
        }
      }
      if (accIdx >= 0 && disbursedAmount > 0) {
        allAccs[accIdx].current_balance = Math.max(0, (Number(allAccs[accIdx].current_balance) || 0) - disbursedAmount)
        saveStoredFinancialAccounts(allAccs)
      }

      // 2. If Supabase configured, execute DB transaction or direct update
      if (isSupabaseConfigured) {
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

        try {
          // Direct fallback update
          const { data: item } = await supabase
            .from('payroll_items')
            .select('*, sheet:payroll_sheets(payroll_batch_no, payroll_month), staff:staff_members(full_name, designation)')
            .eq('id', params.payroll_item_id)
            .single()

          if (item) {
            if (item.net_payable > 0) {
              const expVoucherNo = `EXP-${item.sheet?.payroll_batch_no || 'PAY'}-${item.id.slice(-4)}`
              try {
                await supabase.from('expenses').insert({
                  expense_voucher_no: expVoucherNo,
                  category_id: SALARY_EXPENSE_CATEGORY_ID,
                  amount: item.net_payable,
                  source_account_id: params.disbursed_from_account_id,
                  expense_date: new Date().toISOString().slice(0, 10),
                  description: `${item.sheet?.payroll_month || ''} মাসের চূড়ান্ত বেতন পরিশোধ: ${item.staff?.full_name || 'কর্মী'} (${item.staff?.designation || '-'})`,
                  paid_by: profile?.id || null,
                  approval_status: 'APPROVED',
                })
              } catch (e) {
                console.warn('Could not insert salary disbursement expense:', e)
              }

              try {
                const { data: acc } = await supabase
                  .from('financial_accounts')
                  .select('current_balance')
                  .eq('id', params.disbursed_from_account_id)
                  .single()
                if (acc) {
                  await supabase
                    .from('financial_accounts')
                    .update({
                      current_balance: Math.max(0, (Number(acc.current_balance) || 0) - item.net_payable),
                    })
                    .eq('id', params.disbursed_from_account_id)
                }
              } catch (accErr) {
                console.warn('Could not decrement account balance for salary disbursement:', accErr)
              }
            }

            await supabase
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

            await supabase
              .from('staff_advances')
              .update({
                status: 'DEDUCTED',
                deducted_amount: item.advance_deduction,
              })
              .eq('staff_id', item.staff_id)
              .eq('status', 'PENDING')
          }
        } catch (supaErr) {
          console.warn('Supabase disburse fallback exception:', supaErr)
        }
      }

      return { success: true }
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

export function useReconcileStaffAdvance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ advanceId, remarks }: { advanceId: string; remarks?: string }) => {
      // 1. Update localStorage
      const advances = getStoredAdvances()
      const target = advances.find((a) => a.id === advanceId)
      if (target) {
        target.status = 'DEDUCTED'
        target.deducted_amount = target.amount
        if (remarks) target.remarks = `${target.remarks ? target.remarks + ' | ' : ''}${remarks}`
        saveStoredAdvances(advances)
      }

      // 2. Update Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('staff_advances')
            .update({
              status: 'DEDUCTED',
              deducted_amount: target?.amount || 0,
              remarks: target?.remarks,
            })
            .eq('id', advanceId)
        } catch (err) {
          console.warn('Supabase reconcile advance failed:', err)
        }
      }
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-advances'] })
      queryClient.invalidateQueries({ queryKey: ['payroll-sheets'] })
    },
  })
}


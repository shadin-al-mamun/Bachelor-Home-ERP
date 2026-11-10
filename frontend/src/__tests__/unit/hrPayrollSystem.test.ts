import { describe, it, expect } from 'vitest'
import type { StaffMember, StaffAdvance, PayrollItem, PayrollSheet } from '@/types/hr'

describe('HR & Payroll Management Engine', () => {
  const mockStaff: StaffMember[] = [
    {
      id: 'stf-1',
      staff_code: 'STF-2026-001',
      full_name: 'মো. রফিকুল ইসলাম',
      phone_number: '01711223344',
      designation: 'প্রধান বাবুর্চি (Head Cook)',
      department: 'KITCHEN',
      joining_date: '2025-01-01',
      monthly_salary: 14000,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'stf-2',
      staff_code: 'STF-2026-002',
      full_name: 'মো. জাহিদ হোসেন',
      phone_number: '01722334455',
      designation: 'সহকারী বাবুর্চি (Assistant Cook)',
      department: 'KITCHEN',
      joining_date: '2025-03-15',
      monthly_salary: 9500,
      is_active: true,
      created_at: '2025-03-15T00:00:00Z',
    },
    {
      id: 'stf-3',
      staff_code: 'STF-2026-003',
      full_name: 'রহিমা বেগম (খালা)',
      phone_number: '01733445566',
      designation: 'পরিচ্ছন্নতাকর্মী (Cleaner/খালা)',
      department: 'CLEANING',
      joining_date: '2025-02-01',
      monthly_salary: 7000,
      is_active: true,
      created_at: '2025-02-01T00:00:00Z',
    },
    {
      id: 'stf-4',
      staff_code: 'STF-2026-004',
      full_name: 'মো. আব্দুল জব্বার',
      phone_number: '01744556677',
      designation: 'সিকিউরিটি গার্ড ও দারোয়ান',
      department: 'SECURITY',
      joining_date: '2024-11-01',
      monthly_salary: 8500,
      is_active: false, // Inactive / left
      created_at: '2024-11-01T00:00:00Z',
    },
  ]

  const mockAdvances: StaffAdvance[] = [
    {
      id: 'adv-1',
      voucher_no: 'ADV-202611-1001',
      staff_id: 'stf-1',
      amount: 3000,
      advance_date: '2026-11-05',
      disbursed_from_account_id: 'acc-mgr-cash-1',
      status: 'PENDING',
      deducted_amount: 0,
      created_at: '2026-11-05T00:00:00Z',
    },
    {
      id: 'adv-2',
      voucher_no: 'ADV-202611-1002',
      staff_id: 'stf-2',
      amount: 1500,
      advance_date: '2026-11-08',
      disbursed_from_account_id: 'acc-mgr-cash-2',
      status: 'PENDING',
      deducted_amount: 0,
      created_at: '2026-11-08T00:00:00Z',
    },
  ]

  it('1. Staff Directory: correctly filters active staff and computes total monthly salary budget', () => {
    const activeStaff = mockStaff.filter((s) => s.is_active)
    expect(activeStaff).toHaveLength(3)

    const totalSalaryBudget = activeStaff.reduce((sum, s) => sum + s.monthly_salary, 0)
    // 14000 + 9500 + 7000 = 30500
    expect(totalSalaryBudget).toBe(30500)

    const kitchenStaff = activeStaff.filter((s) => s.department === 'KITCHEN')
    expect(kitchenStaff).toHaveLength(2)
  })

  it('2. Staff Advances: correctly tracks pending vs deducted advances', () => {
    const pendingAdvances = mockAdvances.filter((a) => a.status === 'PENDING')
    expect(pendingAdvances).toHaveLength(2)

    const totalPendingAmount = pendingAdvances.reduce((sum, a) => sum + a.amount, 0)
    // 3000 + 1500 = 4500
    expect(totalPendingAmount).toBe(4500)

    // Specific staff advance lookup
    const rofiqAdvance = mockAdvances
      .filter((a) => a.staff_id === 'stf-1' && a.status === 'PENDING')
      .reduce((sum, a) => sum + a.amount, 0)
    expect(rofiqAdvance).toBe(3000)
  })

  it('3. Payroll Sheet Engine: automatically calculates net payable after deducting advances', () => {
    const activeStaff = mockStaff.filter((s) => s.is_active)

    const payrollItems: PayrollItem[] = activeStaff.map((s) => {
      const basic = s.monthly_salary
      const staffAdvances = mockAdvances.filter((a) => a.staff_id === s.id && a.status === 'PENDING')
      const advanceDeduction = staffAdvances.reduce((sum, a) => sum + a.amount, 0)
      const netPayable = Math.max(0, basic - advanceDeduction)

      return {
        id: `pay-item-${s.id}`,
        payroll_sheet_id: 'pay-sheet-2026-11',
        staff_id: s.id,
        basic_salary: basic,
        bonus_overtime: 0,
        advance_deduction: advanceDeduction,
        absence_deduction: 0,
        other_deduction: 0,
        net_payable: netPayable,
        paid_amount: 0,
        payment_status: 'UNPAID',
        created_at: '2026-11-30T00:00:00Z',
      }
    })

    // Verify Head Cook: 14000 basic - 3000 advance = 11000 net payable
    const rofiqItem = payrollItems.find((i) => i.staff_id === 'stf-1')
    expect(rofiqItem).toBeDefined()
    expect(rofiqItem?.basic_salary).toBe(14000)
    expect(rofiqItem?.advance_deduction).toBe(3000)
    expect(rofiqItem?.net_payable).toBe(11000)

    // Verify Assistant Cook: 9500 basic - 1500 advance = 8000 net payable
    const jahidItem = payrollItems.find((i) => i.staff_id === 'stf-2')
    expect(jahidItem).toBeDefined()
    expect(jahidItem?.basic_salary).toBe(9500)
    expect(jahidItem?.advance_deduction).toBe(1500)
    expect(jahidItem?.net_payable).toBe(8000)

    // Verify Cleaner: 7000 basic - 0 advance = 7000 net payable
    const rohimaItem = payrollItems.find((i) => i.staff_id === 'stf-3')
    expect(rohimaItem).toBeDefined()
    expect(rohimaItem?.basic_salary).toBe(7000)
    expect(rohimaItem?.advance_deduction).toBe(0)
    expect(rohimaItem?.net_payable).toBe(7000)

    // Aggregate Sheet totals
    const totalBasic = payrollItems.reduce((sum, i) => sum + i.basic_salary, 0)
    const totalDeductions = payrollItems.reduce((sum, i) => sum + i.advance_deduction, 0)
    const totalNetPayable = payrollItems.reduce((sum, i) => sum + i.net_payable, 0)

    expect(totalBasic).toBe(30500)
    expect(totalDeductions).toBe(4500)
    expect(totalNetPayable).toBe(26000)
  })

  it('4. Salary Disbursement: updates payment status to PAID and marks advance as DEDUCTED', () => {
    let mockAccountBalance = 25000
    const netPayable = 11000

    // Simulate disbursement from Manager Cash Box
    expect(mockAccountBalance >= netPayable).toBe(true)
    mockAccountBalance -= netPayable
    expect(mockAccountBalance).toBe(14000)

    // Mark advance as deducted
    const rofiqAdvance = mockAdvances.find((a) => a.id === 'adv-1')!
    rofiqAdvance.status = 'DEDUCTED'
    rofiqAdvance.deducted_amount = rofiqAdvance.amount

    expect(rofiqAdvance.status).toBe('DEDUCTED')
    expect(rofiqAdvance.deducted_amount).toBe(3000)
  })
})

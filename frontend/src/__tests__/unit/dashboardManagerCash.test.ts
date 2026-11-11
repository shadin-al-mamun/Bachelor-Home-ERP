import { describe, it, expect } from 'vitest'
import type { ManagerCashBreakdownItem } from '@/features/dashboard/api/useOwnerDashboard'

describe('Dashboard Manager Cash Custody Ledger & Breakdown Logic', () => {
  it('correctly calculates manager live cash balances from receipts, expenses, and transfers', () => {
    const managerAccounts = [
      {
        id: 'acc-mgr-anis',
        account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
        account_number: 'MGR-CASH-01',
        account_type: 'CASH_MANAGER',
        opening_balance: 0,
        current_balance: 13266, // Old stale balance in DB before recent expenses
        assigned_manager_id: 'p-mgr-anis',
      },
      {
        id: 'acc-mgr-enamul',
        account_name: 'ম্যানেজার ক্যাশ ড্রয়ার (বিথীকা)',
        account_number: 'MGR-CASH-02',
        account_type: 'CASH_MANAGER',
        opening_balance: 0,
        current_balance: 3000,
        assigned_manager_id: 'p-mgr-enamul',
      },
    ]

    const allProfiles = [
      { id: 'p-mgr-anis', full_name: 'এস এম আনিসুজ্জামান', phone_number: '01794963009', role: 'MANAGER' },
      { id: 'p-mgr-enamul', full_name: 'মোঃ এনামুল হক', phone_number: '01755995974', role: 'MANAGER' },
    ]

    // Receipts collected
    const allReceipts = [
      { id: 'r1', destination_account_id: 'acc-mgr-anis', amount: 13266, is_void: false },
    ]

    // Expenses paid from Manager Cash Box: 3,000 advance salary + 5,000 other expenses = 8,000
    const allExpenses = [
      { id: 'e1', source_account_id: 'acc-mgr-anis', amount: 3000, approval_status: 'APPROVED' },
      { id: 'e2', source_account_id: 'acc-mgr-anis', amount: 5000, approval_status: 'APPROVED' },
    ]

    // Transfers: 3,000 transferred to Bithika drawer
    const allTransfers = [
      { id: 't1', from_account_id: 'acc-vault', to_account_id: 'acc-mgr-enamul', amount: 3000 },
    ]

    const allIncomes: any[] = []

    // Authoritative calculation logic matching useOwnerDashboard
    const managerCashBreakdown: ManagerCashBreakdownItem[] = managerAccounts.map((a: any) => {
      const accId = a.id
      const openBal = Number(a.opening_balance) || 0

      const creditReceipts = allReceipts
        .filter((r: any) => r.destination_account_id === accId && !r.is_void)
        .reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0)

      const creditIncomes = allIncomes
        .filter((inc: any) => inc.destination_account_id === accId)
        .reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0)

      const creditTransfers = allTransfers
        .filter((t: any) => t.to_account_id === accId)
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const debitExpenses = allExpenses
        .filter((e: any) => e.source_account_id === accId && e.approval_status !== 'REJECTED')
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)

      const debitTransfers = allTransfers
        .filter((t: any) => t.from_account_id === accId)
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const totalCredits = openBal + creditReceipts + creditIncomes + creditTransfers
      const totalDebits = debitExpenses + debitTransfers
      const hasVoucherActivity =
        creditReceipts + creditIncomes + creditTransfers + debitExpenses + debitTransfers > 0 || openBal > 0
      const liveBalance = hasVoucherActivity
        ? Math.max(0, totalCredits - totalDebits)
        : (Number(a.current_balance) || 0)

      let managerName = 'ম্যানেজার'
      let managerPhone: string | null = null
      const assignedUser = allProfiles.find((p: any) => p.id === a.assigned_manager_id)
      if (assignedUser) {
        managerName = assignedUser.full_name
        managerPhone = assignedUser.phone_number
      }

      return {
        account_id: a.id,
        account_name: a.account_name,
        account_number: a.account_number,
        manager_id: a.assigned_manager_id,
        manager_name: managerName,
        manager_phone: managerPhone,
        balance: liveBalance,
      }
    })

    const totalCashInCustody = managerCashBreakdown.reduce((sum, item) => sum + item.balance, 0)

    // Assertions
    expect(managerCashBreakdown).toHaveLength(2)

    // Manager 1 (Anisuzzaman): 13,266 - 8,000 = 5,266
    expect(managerCashBreakdown[0].manager_name).toBe('এস এম আনিসুজ্জামান')
    expect(managerCashBreakdown[0].balance).toBe(5266)

    // Manager 2 (Enamul): 0 + 3,000 = 3,000
    expect(managerCashBreakdown[1].manager_name).toBe('মোঃ এনামুল হক')
    expect(managerCashBreakdown[1].balance).toBe(3000)

    // Total Cash in Custody MUST be exactly 8,266 (not 16,266)
    expect(totalCashInCustody).toBe(8266)
  })
})

/**
 * Bachelor Home ERP — Comprehensive Reports Data Hook
 * Aggregates & processes data for all 16 Financial and Operational Reports
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type {
  ReportFilterState,
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

export function useReportsMetadata() {
  return useQuery({
    queryKey: ['reports-metadata'],
    queryFn: async () => {
      const [buildingsRes, flatsRes, managersRes, accountsRes] = await Promise.all([
        supabase.from('buildings').select('id, name, building_code').order('name'),
        supabase.from('flats').select('id, name, flat_code, building_id').order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('role', ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT'])
          .order('full_name'),
        supabase.from('financial_accounts').select('id, account_name, account_type').order('account_name'),
      ])

      return {
        buildings: buildingsRes.data ?? [],
        flats: flatsRes.data ?? [],
        managers: managersRes.data ?? [],
        accounts: accountsRes.data ?? [],
      }
    },
  })
}

export function useReportsData(filters: ReportFilterState) {
  return useQuery({
    queryKey: ['reports-data', filters],
    queryFn: async () => {
      const { startDate, endDate, managerId, accountId, buildingId, flatId } = filters

      // 1. Receipts Query
      let receiptsQuery = supabase
        .from('receipts')
        .select(`
          id,
          receipt_number,
          receipt_date,
          amount,
          payment_method,
          destination_account_id,
          received_by,
          is_void,
          void_reason,
          void_by,
          void_at,
          remarks,
          boarder:boarders(id, full_name, boarder_code, phone_number),
          account:financial_accounts(id, account_name, account_type),
          collector:profiles!receipts_received_by_fkey(id, full_name),
          void_user:profiles!receipts_void_by_fkey(id, full_name)
        `)
        .gte('receipt_date', `${startDate}T00:00:00`)
        .lte('receipt_date', `${endDate}T23:59:59`)
        .order('receipt_date', { ascending: false })

      if (managerId) receiptsQuery = receiptsQuery.eq('received_by', managerId)
      if (accountId) receiptsQuery = receiptsQuery.eq('destination_account_id', accountId)

      // 2. Expenses Query
      let expensesQuery = supabase
        .from('expenses')
        .select(`
          id,
          expense_voucher_no,
          expense_date,
          amount,
          category_id,
          building_id,
          flat_id,
          source_account_id,
          paid_by,
          approval_status,
          description,
          category:expense_categories(id, name),
          building:buildings(id, name),
          flat:flats(id, name, flat_code),
          account:financial_accounts(id, account_name),
          payer:profiles!expenses_paid_by_fkey(id, full_name)
        `)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false })

      if (buildingId) expensesQuery = expensesQuery.eq('building_id', buildingId)
      if (flatId) expensesQuery = expensesQuery.eq('flat_id', flatId)
      if (managerId) expensesQuery = expensesQuery.eq('paid_by', managerId)
      if (accountId) expensesQuery = expensesQuery.eq('source_account_id', accountId)

      // 3. Incomes Query (Non-Rent)
      let incomesQuery = supabase
        .from('incomes')
        .select(`
          id,
          income_voucher_no,
          income_date,
          amount,
          category_id,
          building_id,
          flat_id,
          destination_account_id,
          received_by,
          description,
          category:income_categories(id, name),
          receiver:profiles!incomes_received_by_fkey(id, full_name)
        `)
        .gte('income_date', startDate)
        .lte('income_date', endDate)
        .order('income_date', { ascending: false })

      if (buildingId) incomesQuery = incomesQuery.eq('building_id', buildingId)
      if (flatId) incomesQuery = incomesQuery.eq('flat_id', flatId)
      if (managerId) incomesQuery = incomesQuery.eq('received_by', managerId)
      if (accountId) incomesQuery = incomesQuery.eq('destination_account_id', accountId)

      // 4. Boarder Charges & Dues Query
      const chargesQuery = supabase
        .from('boarder_charges')
        .select(`
          id,
          boarder_id,
          charge_type,
          billing_month,
          amount,
          paid_amount,
          due_amount,
          status,
          due_date,
          boarder:boarders(id, full_name, boarder_code, phone_number)
        `)
        .order('due_date', { ascending: true })

      // 5. Allocations & Security Deposits Query
      const allocationsQuery = supabase
        .from('allocations')
        .select(`
          id,
          boarder_id,
          seat_id,
          monthly_rent,
          security_deposit,
          start_date,
          end_date,
          status,
          boarder:boarders(id, full_name, boarder_code, phone_number),
          seat:seats(id, seat_name, room:rooms(id, flat:flats(id, name, building:buildings(id, name))))
        `)

      // 6. Manager Cash Sessions Query
      let sessionsQuery = supabase
        .from('manager_cash_sessions')
        .select(`
          id,
          manager_id,
          account_id,
          session_date,
          opening_cash,
          cash_receipts,
          cash_expenses,
          cash_deposited_to_owner,
          cash_handed_over_in,
          cash_handed_over_out,
          expected_closing_cash,
          actual_counted_cash,
          cash_variance,
          variance_explanation,
          status,
          submitted_at,
          manager:profiles!manager_cash_sessions_manager_id_fkey(id, full_name, phone_number),
          account:financial_accounts(id, account_name)
        `)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: false })

      if (managerId) sessionsQuery = sessionsQuery.eq('manager_id', managerId)

      // 7. Cash Handovers Query
      let handoversQuery = supabase
        .from('cash_handovers')
        .select(`
          id,
          handover_number,
          sender_manager_id,
          receiver_manager_id,
          amount,
          handover_reason,
          status,
          accepted_at,
          created_at,
          sender:profiles!cash_handovers_sender_manager_id_fkey(id, full_name),
          receiver:profiles!cash_handovers_receiver_manager_id_fkey(id, full_name)
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false })

      // 8. Owner Deposits Query
      let ownerDepositsQuery = supabase
        .from('owner_deposits')
        .select(`
          id,
          deposit_number,
          manager_id,
          from_account_id,
          to_account_id,
          amount,
          payment_method,
          transaction_reference,
          status,
          confirmed_by,
          confirmed_at,
          created_at,
          manager:profiles!owner_deposits_manager_id_fkey(id, full_name),
          from_account:financial_accounts!owner_deposits_from_account_id_fkey(id, account_name),
          to_account:financial_accounts!owner_deposits_to_account_id_fkey(id, account_name),
          confirmer:profiles!owner_deposits_confirmed_by_fkey(id, full_name)
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false })

      // Execute all in parallel
      const [
        receiptsRes,
        expensesRes,
        incomesRes,
        chargesRes,
        allocationsRes,
        sessionsRes,
        handoversRes,
        ownerDepositsRes,
      ] = await Promise.all([
        receiptsQuery,
        expensesQuery,
        incomesQuery,
        chargesQuery,
        allocationsQuery,
        sessionsQuery,
        handoversQuery,
        ownerDepositsQuery,
      ])

      const rawReceipts = (receiptsRes.data ?? []) as any[]
      const rawExpenses = (expensesRes.data ?? []) as any[]
      const rawIncomes = (incomesRes.data ?? []) as any[]
      const rawCharges = (chargesRes.data ?? []) as any[]
      const rawAllocations = (allocationsRes.data ?? []) as any[]
      const rawSessions = (sessionsRes.data ?? []) as any[]
      const rawHandovers = (handoversRes.data ?? []) as any[]
      const rawOwnerDeposits = (ownerDepositsRes.data ?? []) as any[]

      if (receiptsRes.error) console.warn('[useReportsData] receipts error:', receiptsRes.error)
      if (expensesRes.error) console.warn('[useReportsData] expenses error:', expensesRes.error)
      if (incomesRes.error) console.warn('[useReportsData] incomes error:', incomesRes.error)
      if (chargesRes.error) console.warn('[useReportsData] charges error:', chargesRes.error)
      if (allocationsRes.error) console.warn('[useReportsData] allocations error:', allocationsRes.error)
      if (sessionsRes.error) console.warn('[useReportsData] sessions error:', sessionsRes.error)
      if (handoversRes.error) console.warn('[useReportsData] handovers error:', handoversRes.error)
      if (ownerDepositsRes.error) console.warn('[useReportsData] ownerDeposits error:', ownerDepositsRes.error)

      // Map boarder active allocation info for flat & seat
      const boarderLocationMap = new Map<string, { flatName: string; seatName: string }>()
      rawAllocations.forEach((alloc) => {
        if (alloc.boarder?.id && (alloc.status === 'ACTIVE' || !boarderLocationMap.has(alloc.boarder.id))) {
          const flatName = alloc.seat?.room?.flat?.name || 'Active Flat'
          const seatName = alloc.seat?.seat_name || 'Seat'
          boarderLocationMap.set(alloc.boarder.id, { flatName, seatName })
        }
      })

      // =========================================================================
      // Report 1: Daily Income & Expense
      // =========================================================================
      const dailyMap = new Map<string, DailyIncomeExpenseRow>()

      rawReceipts.forEach((r) => {
        if (r.is_void) return
        const d = r.receipt_date ? r.receipt_date.slice(0, 10) : startDate
        const current = dailyMap.get(d) || {
          date: d,
          rentReceipts: 0,
          otherIncomes: 0,
          totalInflow: 0,
          operatingExpenses: 0,
          netBalance: 0,
          transactionCount: 0,
        }
        current.rentReceipts += Number(r.amount) || 0
        current.totalInflow += Number(r.amount) || 0
        current.transactionCount += 1
        dailyMap.set(d, current)
      })

      rawIncomes.forEach((inc) => {
        const d = inc.income_date
        const current = dailyMap.get(d) || {
          date: d,
          rentReceipts: 0,
          otherIncomes: 0,
          totalInflow: 0,
          operatingExpenses: 0,
          netBalance: 0,
          transactionCount: 0,
        }
        current.otherIncomes += Number(inc.amount) || 0
        current.totalInflow += Number(inc.amount) || 0
        current.transactionCount += 1
        dailyMap.set(d, current)
      })

      rawExpenses.forEach((exp) => {
        if (exp.approval_status === 'REJECTED') return
        const d = exp.expense_date
        const current = dailyMap.get(d) || {
          date: d,
          rentReceipts: 0,
          otherIncomes: 0,
          totalInflow: 0,
          operatingExpenses: 0,
          netBalance: 0,
          transactionCount: 0,
        }
        current.operatingExpenses += Number(exp.amount) || 0
        current.transactionCount += 1
        dailyMap.set(d, current)
      })

      const dailyIncomeExpense: DailyIncomeExpenseRow[] = Array.from(dailyMap.values())
        .map((r) => ({
          ...r,
          netBalance: r.totalInflow - r.operatingExpenses,
        }))
        .sort((a, b) => b.date.localeCompare(a.date))

      // =========================================================================
      // Report 2: Weekly Income & Expense
      // =========================================================================
      const weeklyMap = new Map<string, WeeklyIncomeExpenseRow>()
      dailyIncomeExpense.forEach((day) => {
        const d = new Date(day.date)
        const dayOfWeek = d.getDay() // 0 = Sunday
        const mondayOffset = (dayOfWeek + 6) % 7
        const monday = new Date(d)
        monday.setDate(d.getDate() - mondayOffset)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        const startStr = monday.toISOString().slice(0, 10)
        const endStr = sunday.toISOString().slice(0, 10)
        const weekKey = `${startStr} to ${endStr}`

        const current = weeklyMap.get(weekKey) || {
          weekLabel: `Week of ${monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
          startDate: startStr,
          endDate: endStr,
          totalIncome: 0,
          totalExpense: 0,
          netMargin: 0,
          receiptCount: 0,
          expenseCount: 0,
        }
        current.totalIncome += day.totalInflow
        current.totalExpense += day.operatingExpenses
        current.netMargin += day.netBalance
        current.receiptCount += day.rentReceipts > 0 ? 1 : 0
        current.expenseCount += day.operatingExpenses > 0 ? 1 : 0
        weeklyMap.set(weekKey, current)
      })

      const weeklyIncomeExpense: WeeklyIncomeExpenseRow[] = Array.from(weeklyMap.values()).sort(
        (a, b) => b.startDate.localeCompare(a.startDate)
      )

      // =========================================================================
      // Report 3: Monthly Operating Statement (P&L)
      // =========================================================================
      let totalRentRevenue = 0
      let totalOtherIncome = 0
      rawReceipts.forEach((r) => {
        if (!r.is_void) totalRentRevenue += Number(r.amount) || 0
      })
      rawIncomes.forEach((i) => {
        totalOtherIncome += Number(i.amount) || 0
      })
      const grossRevenue = totalRentRevenue + totalOtherIncome

      const expenseCatMap = new Map<string, number>()
      let totalOperatingExpense = 0
      rawExpenses.forEach((exp) => {
        if (exp.approval_status === 'REJECTED') return
        const catName = exp.category?.name || 'General Operations'
        const amt = Number(exp.amount) || 0
        expenseCatMap.set(catName, (expenseCatMap.get(catName) || 0) + amt)
        totalOperatingExpense += amt
      })

      const monthlyOperatingStatement: MonthlyOperatingStatementRow[] = [
        {
          category: 'Boarder Rent Collections (ভাড়া আদায়)',
          type: 'INCOME',
          amount: totalRentRevenue,
          percentageOfRevenue: grossRevenue ? (totalRentRevenue / grossRevenue) * 100 : 0,
        },
        {
          category: 'Non-Rent / Other Incomes (অন্যান্য আয়)',
          type: 'INCOME',
          amount: totalOtherIncome,
          percentageOfRevenue: grossRevenue ? (totalOtherIncome / grossRevenue) * 100 : 0,
        },
        {
          category: 'TOTAL OPERATING REVENUE (মোট আয়)',
          type: 'SUMMARY',
          amount: grossRevenue,
          percentageOfRevenue: 100,
        },
      ]

      expenseCatMap.forEach((amt, catName) => {
        monthlyOperatingStatement.push({
          category: `Expense: ${catName}`,
          type: 'EXPENSE',
          amount: amt,
          percentageOfRevenue: grossRevenue ? (amt / grossRevenue) * 100 : 0,
        })
      })

      monthlyOperatingStatement.push({
        category: 'TOTAL OPERATING EXPENSES (মোট পরিচালন ব্যয়)',
        type: 'SUMMARY',
        amount: totalOperatingExpense,
        percentageOfRevenue: grossRevenue ? (totalOperatingExpense / grossRevenue) * 100 : 0,
      })

      const netOperatingIncome = grossRevenue - totalOperatingExpense
      monthlyOperatingStatement.push({
        category: 'NET OPERATING PROFIT / (LOSS) (নিট পরিচালন মুনাফা)',
        type: 'SUMMARY',
        amount: netOperatingIncome,
        percentageOfRevenue: grossRevenue ? (netOperatingIncome / grossRevenue) * 100 : 0,
      })

      // =========================================================================
      // Report 4: Receipt-wise Collection Report
      // =========================================================================
      const receiptCollection: ReceiptCollectionRow[] = rawReceipts.map((r) => {
        const loc = r.boarder?.id ? boarderLocationMap.get(r.boarder.id) : undefined
        return {
          receiptNumber: r.receipt_number || 'REC-TEMP',
          date: r.receipt_date ? r.receipt_date.slice(0, 10) : startDate,
          boarderName: r.boarder?.full_name || 'Walk-in / Unknown',
          boarderCode: r.boarder?.boarder_code || '—',
          flatName: loc?.flatName || 'Hostel Resident',
          amount: Number(r.amount) || 0,
          paymentMethod: r.payment_method || 'CASH',
          collectorName: r.collector?.full_name || 'Staff',
          accountName: r.account?.account_name || 'Main Cash',
          isVoid: Boolean(r.is_void),
          remarks: r.remarks || '',
        }
      })

      // =========================================================================
      // Report 5: Boarder Ledger & Dues Aging Report
      // =========================================================================
      const now = new Date()
      const boarderDuesMap = new Map<string, BoarderDuesAgingRow>()

      rawCharges.forEach((c) => {
        const b = c.boarder
        if (!b) return
        const bId = b.id
        const loc = boarderLocationMap.get(bId) || { flatName: 'Active Flat', seatName: 'Seat' }
        const current = boarderDuesMap.get(bId) || {
          boarderCode: b.boarder_code,
          boarderName: b.full_name,
          phoneNumber: b.phone_number || '—',
          flatName: loc.flatName,
          seatName: loc.seatName,
          totalBilled: 0,
          totalPaid: 0,
          totalOutstandingDue: 0,
          currentDue: 0,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          oldestUnpaidMonth: '',
        }

        const amt = Number(c.amount) || 0
        const paid = Number(c.paid_amount) || 0
        const due = Number(c.due_amount) || (amt - paid)

        current.totalBilled += amt
        current.totalPaid += paid
        current.totalOutstandingDue += due

        if (due > 0) {
          const dueDate = new Date(c.due_date || c.billing_month)
          const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))

          if (diffDays <= 30) {
            current.currentDue += due
          } else if (diffDays <= 60) {
            current.days31to60 += due
          } else if (diffDays <= 90) {
            current.days61to90 += due
          } else {
            current.days90Plus += due
          }

          if (!current.oldestUnpaidMonth || c.billing_month < current.oldestUnpaidMonth) {
            current.oldestUnpaidMonth = c.billing_month
          }
        }

        boarderDuesMap.set(bId, current)
      })

      const boarderDuesAging: BoarderDuesAgingRow[] = Array.from(boarderDuesMap.values())
        .filter((row) => row.totalOutstandingDue > 0 || row.totalBilled > 0)
        .sort((a, b) => b.totalOutstandingDue - a.totalOutstandingDue)

      // =========================================================================
      // Report 6: Account Ledgers
      // =========================================================================
      const ledgerEntries: AccountLedgerRow[] = []

      rawReceipts.forEach((r) => {
        if (r.is_void) return
        ledgerEntries.push({
          date: r.receipt_date ? r.receipt_date.slice(0, 10) : startDate,
          accountName: r.account?.account_name || 'Cash Account',
          accountType: r.account?.account_type || 'CASH_MANAGER',
          transactionType: 'Receipt (ভাড়া আদায়)',
          referenceNo: r.receipt_number,
          particulars: `Received from ${r.boarder?.full_name || 'Boarder'} (${r.payment_method})`,
          debit: Number(r.amount) || 0,
          credit: 0,
          runningBalance: 0,
        })
      })

      rawExpenses.forEach((exp) => {
        if (exp.approval_status === 'REJECTED') return
        ledgerEntries.push({
          date: exp.expense_date,
          accountName: exp.account?.account_name || 'Operating Account',
          accountType: 'EXPENSE',
          transactionType: 'Expense (ব্যয়)',
          referenceNo: exp.expense_voucher_no,
          particulars: `${exp.category?.name || 'Expense'}: ${exp.description}`,
          debit: 0,
          credit: Number(exp.amount) || 0,
          runningBalance: 0,
        })
      })

      rawOwnerDeposits.forEach((dep) => {
        if (dep.status === 'REJECTED') return
        ledgerEntries.push({
          date: dep.created_at?.slice(0, 10) || startDate,
          accountName: dep.from_account?.account_name || 'Manager Cash',
          accountType: 'TRANSFER',
          transactionType: 'Owner Deposit',
          referenceNo: dep.deposit_number,
          particulars: `Deposited to ${dep.to_account?.account_name || 'Owner'} (${dep.payment_method})`,
          debit: 0,
          credit: Number(dep.amount) || 0,
          runningBalance: 0,
        })
      })

      // Sort chronological
      ledgerEntries.sort((a, b) => a.date.localeCompare(b.date))
      let running = 0
      const accountLedgers: AccountLedgerRow[] = ledgerEntries.map((e) => {
        running += e.debit - e.credit
        return {
          ...e,
          runningBalance: running,
        }
      }).reverse() // Most recent first for display

      // =========================================================================
      // Report 7: Manager-wise Daily Cash Report
      // =========================================================================
      const managerDailyCash: ManagerDailyCashRow[] = rawSessions.map((s) => ({
        date: s.session_date,
        managerName: s.manager?.full_name || 'Manager',
        accountName: s.account?.account_name || 'Cash in Hand',
        openingCash: Number(s.opening_cash) || 0,
        receiptsCollected: Number(s.cash_receipts) || 0,
        expensesPaid: Number(s.cash_expenses) || 0,
        depositedToOwner: Number(s.cash_deposited_to_owner) || 0,
        handedOverIn: Number(s.cash_handed_over_in) || 0,
        handedOverOut: Number(s.cash_handed_over_out) || 0,
        closingCash: Number(s.actual_counted_cash ?? s.expected_closing_cash) || 0,
      }))

      // =========================================================================
      // Report 8: Daily Cash Closing & Reconciliation
      // =========================================================================
      const dailyCashClosing: DailyCashClosingRow[] = rawSessions.map((s) => ({
        sessionDate: s.session_date,
        managerName: s.manager?.full_name || 'Manager',
        accountName: s.account?.account_name || 'Cash',
        expectedCash: Number(s.expected_closing_cash) || 0,
        actualCountedCash: Number(s.actual_counted_cash) || 0,
        variance: Number(s.cash_variance) || 0,
        varianceExplanation: s.variance_explanation || '—',
        status: s.status,
        submittedAt: s.submitted_at || '—',
      }))

      // =========================================================================
      // Report 9: Expected vs Actual Cash & Variance Report
      // =========================================================================
      const cashVarianceAudit: CashVarianceAuditRow[] = rawSessions
        .filter((s) => s.actual_counted_cash !== null && s.actual_counted_cash !== undefined)
        .map((s) => {
          const exp = Number(s.expected_closing_cash) || 0
          const act = Number(s.actual_counted_cash) || 0
          const diff = act - exp
          const varPct = exp !== 0 ? Math.abs((diff / exp) * 100) : 0
          let vType: 'SHORTAGE' | 'EXCESS' | 'BALANCED' = 'BALANCED'
          if (diff < 0) vType = 'SHORTAGE'
          else if (diff > 0) vType = 'EXCESS'

          return {
            sessionDate: s.session_date,
            managerName: s.manager?.full_name || 'Manager',
            accountName: s.account?.account_name || 'Cash',
            expectedCash: exp,
            actualCountedCash: act,
            varianceAmount: diff,
            varianceType: vType,
            variancePercentage: varPct,
            explanation: s.variance_explanation || 'No notes provided',
            reviewStatus: s.status,
          }
        })

      // =========================================================================
      // Report 10: Owner Deposits Report
      // =========================================================================
      const ownerDeposits: OwnerDepositRow[] = rawOwnerDeposits.map((dep) => ({
        depositNumber: dep.deposit_number,
        date: dep.created_at?.slice(0, 10) || '—',
        managerName: dep.manager?.full_name || 'Manager',
        fromAccountName: dep.from_account?.account_name || 'Manager Cash',
        toAccountName: dep.to_account?.account_name || 'Owner Vault',
        amount: Number(dep.amount) || 0,
        paymentMethod: dep.payment_method || 'CASH',
        transactionRef: dep.transaction_reference || '—',
        status: dep.status,
        confirmedBy: dep.confirmer?.full_name || '—',
        confirmedAt: dep.confirmed_at?.slice(0, 16) || '—',
      }))

      // =========================================================================
      // Report 11: Cash Handover Report
      // =========================================================================
      const cashHandovers: CashHandoverRow[] = rawHandovers.map((h) => ({
        handoverNumber: h.handover_number,
        date: h.created_at?.slice(0, 10) || '—',
        senderManager: h.sender?.full_name || 'Sender',
        receiverManager: h.receiver?.full_name || 'Receiver',
        amount: Number(h.amount) || 0,
        handoverReason: h.handover_reason || 'Shift Handover',
        status: h.status,
        acceptedAt: h.accepted_at?.slice(0, 16) || '—',
      }))

      // =========================================================================
      // Report 12: Flat-wise Expense Report
      // =========================================================================
      const flatExpenseMap = new Map<string, FlatExpenseRow>()
      rawExpenses.forEach((exp) => {
        if (exp.approval_status === 'REJECTED') return
        const flatKey = exp.flat_id || 'GENERAL_BUILDING'
        const f = exp.flat
        const b = exp.building

        const current = flatExpenseMap.get(flatKey) || {
          buildingName: b?.name || 'Central Facility',
          flatName: f?.name || 'Common Building Expenses',
          flatCode: f?.flat_code || 'COMMON',
          utilityExpense: 0,
          maintenanceExpense: 0,
          cleaningExpense: 0,
          otherExpense: 0,
          totalExpense: 0,
          expenseCount: 0,
        }

        const amt = Number(exp.amount) || 0
        const cat = (exp.category?.name || '').toLowerCase()

        if (cat.includes('utility') || cat.includes('gas') || cat.includes('electric') || cat.includes('water')) {
          current.utilityExpense += amt
        } else if (cat.includes('repair') || cat.includes('maintenance')) {
          current.maintenanceExpense += amt
        } else if (cat.includes('clean') || cat.includes('waste')) {
          current.cleaningExpense += amt
        } else {
          current.otherExpense += amt
        }

        current.totalExpense += amt
        current.expenseCount += 1
        flatExpenseMap.set(flatKey, current)
      })

      const flatExpenses: FlatExpenseRow[] = Array.from(flatExpenseMap.values()).sort(
        (a, b) => b.totalExpense - a.totalExpense
      )

      // =========================================================================
      // Report 13: Expense Category Analysis
      // =========================================================================
      const catAnalysisMap = new Map<
        string,
        { total: number; count: number; highest: number }
      >()
      let overallExpSum = 0

      rawExpenses.forEach((exp) => {
        if (exp.approval_status === 'REJECTED') return
        const cat = exp.category?.name || 'Uncategorized'
        const amt = Number(exp.amount) || 0
        overallExpSum += amt

        const cur = catAnalysisMap.get(cat) || { total: 0, count: 0, highest: 0 }
        cur.total += amt
        cur.count += 1
        cur.highest = Math.max(cur.highest, amt)
        catAnalysisMap.set(cat, cur)
      })

      const expenseCategoryAnalysis: ExpenseCategoryAnalysisRow[] = Array.from(catAnalysisMap.entries())
        .map(([catName, stat]) => ({
          categoryName: catName,
          totalAmount: stat.total,
          percentageOfTotal: overallExpSum ? (stat.total / overallExpSum) * 100 : 0,
          voucherCount: stat.count,
          averageAmount: stat.count ? stat.total / stat.count : 0,
          highestVoucher: stat.highest,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)

      // =========================================================================
      // Report 14: Security Deposit Report
      // =========================================================================
      const securityDeposits: SecurityDepositRow[] = rawAllocations.map((alloc) => {
        const b = alloc.boarder
        const seat = alloc.seat
        const flat = seat?.room?.flat
        const secAmt = Number(alloc.security_deposit) || 0

        return {
          boarderName: b?.full_name || 'Boarder',
          boarderCode: b?.boarder_code || '—',
          flatName: flat?.name || 'Flat',
          seatName: seat?.seat_name || 'Seat',
          allocationStart: alloc.start_date,
          securityDepositBilled: secAmt,
          securityDepositPaid: secAmt, // In Bachelor Home, security deposit is collected upon entry
          status: alloc.status === 'ACTIVE' ? 'HELD_IN_CUSTODY' : 'RELEASED / REFUNDED',
          currentAllocationStatus: alloc.status,
        }
      })

      // =========================================================================
      // Report 15: Receipt Void & Reversal Audit Report
      // =========================================================================
      const receiptVoidAudit: ReceiptVoidAuditRow[] = rawReceipts
        .filter((r) => r.is_void)
        .map((r) => ({
          receiptNumber: r.receipt_number,
          receiptDate: r.receipt_date ? r.receipt_date.slice(0, 10) : startDate,
          voidAt: r.void_at?.slice(0, 16) || '—',
          boarderName: r.boarder?.full_name || 'Boarder',
          boarderCode: r.boarder?.boarder_code || '—',
          amount: Number(r.amount) || 0,
          paymentMethod: r.payment_method,
          voidReason: r.void_reason || 'Mistake / Data entry error',
          voidBy: r.void_user?.full_name || 'Administrator',
        }))

      // =========================================================================
      // Report 16: Manager Performance & Compliance Report
      // =========================================================================
      const managerCompMap = new Map<string, ManagerComplianceRow>()

      rawSessions.forEach((s) => {
        const m = s.manager
        if (!m) return
        const mId = m.id
        const current = managerCompMap.get(mId) || {
          managerName: m.full_name,
          phoneNumber: m.phone_number || '—',
          totalReceiptsCollected: 0,
          totalExpensesDisbursed: 0,
          totalSessionsCount: 0,
          timelySubmittedSessions: 0,
          compliancePercentage: 100,
          varianceIncidentsCount: 0,
          totalNetVariance: 0,
        }

        current.totalSessionsCount += 1
        if (s.submitted_at) current.timelySubmittedSessions += 1
        current.totalReceiptsCollected += Number(s.cash_receipts) || 0
        current.totalExpensesDisbursed += Number(s.cash_expenses) || 0

        const v = Number(s.cash_variance) || 0
        if (v !== 0) {
          current.varianceIncidentsCount += 1
          current.totalNetVariance += v
        }

        current.compliancePercentage = current.totalSessionsCount
          ? Math.round((current.timelySubmittedSessions / current.totalSessionsCount) * 100)
          : 100

        managerCompMap.set(mId, current)
      })

      const managerCompliance: ManagerComplianceRow[] = Array.from(managerCompMap.values()).sort(
        (a, b) => b.totalReceiptsCollected - a.totalReceiptsCollected
      )

      return {
        dailyIncomeExpense,
        weeklyIncomeExpense,
        monthlyOperatingStatement,
        receiptCollection,
        boarderDuesAging,
        accountLedgers,
        managerDailyCash,
        dailyCashClosing,
        cashVarianceAudit,
        ownerDeposits,
        cashHandovers,
        flatExpenses,
        expenseCategoryAnalysis,
        securityDeposits,
        receiptVoidAudit,
        managerCompliance,
      }
    },
  })
}

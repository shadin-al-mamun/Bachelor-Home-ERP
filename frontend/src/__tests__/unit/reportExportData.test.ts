import { describe, it, expect } from 'vitest'
import { getReportExportData } from '../../features/reports/reportExportData'
import { ALL_REPORTS } from '../../features/reports/reportDefinitions'

describe('getReportExportData', () => {
  it('returns valid columns and rows for all 16 reports even with empty or mock data', () => {
    const mockData = {
      dailyIncomeExpense: [
        {
          date: '2026-10-15',
          rentReceipts: 5000,
          otherIncomes: 200,
          totalInflow: 5200,
          operatingExpenses: 1200,
          netBalance: 4000,
          transactionCount: 2,
        },
      ],
      weeklyIncomeExpense: [
        {
          weekLabel: 'Week of 12 Oct',
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          totalIncome: 15000,
          totalExpense: 4000,
          netMargin: 11000,
          receiptCount: 3,
          expenseCount: 2,
        },
      ],
      monthlyOperatingStatement: [
        {
          category: 'Boarder Rent Collections',
          type: 'INCOME',
          amount: 50000,
          percentageOfRevenue: 100,
        },
      ],
      receiptCollection: [
        {
          receiptNumber: 'REC-1001',
          date: '2026-10-15',
          boarderName: 'Tanvir Ahmed',
          boarderCode: 'BDR-001',
          flatName: 'Flat 3A',
          amount: 5000,
          paymentMethod: 'CASH',
          collectorName: 'Manager Rakib',
          accountName: 'Main Cash',
          isVoid: false,
          remarks: 'Oct rent',
        },
      ],
      boarderDuesAging: [
        {
          boarderCode: 'BDR-001',
          boarderName: 'Tanvir Ahmed',
          phoneNumber: '01700000000',
          flatName: 'Flat 3A',
          seatName: 'S-1',
          totalBilled: 5000,
          totalPaid: 3000,
          totalOutstandingDue: 2000,
          currentDue: 2000,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          oldestUnpaidMonth: '2026-10',
        },
      ],
      accountLedgers: [
        {
          date: '2026-10-15',
          accountName: 'Manager Cash',
          accountType: 'CASH_MANAGER',
          transactionType: 'Receipt',
          referenceNo: 'REC-1001',
          particulars: 'Collected rent',
          debit: 5000,
          credit: 0,
          runningBalance: 5000,
        },
      ],
      managerDailyCash: [
        {
          date: '2026-10-15',
          managerName: 'Rakib',
          accountName: 'Manager Cash',
          openingCash: 1000,
          receiptsCollected: 5000,
          expensesPaid: 500,
          depositedToOwner: 2000,
          handedOverIn: 0,
          handedOverOut: 0,
          closingCash: 3500,
        },
      ],
      dailyCashClosing: [
        {
          sessionDate: '2026-10-15',
          managerName: 'Rakib',
          accountName: 'Manager Cash',
          expectedCash: 3500,
          actualCountedCash: 3500,
          variance: 0,
          varianceExplanation: 'All clear',
          status: 'APPROVED',
          submittedAt: '2026-10-15 22:00',
        },
      ],
      cashVarianceAudit: [
        {
          sessionDate: '2026-10-15',
          managerName: 'Rakib',
          accountName: 'Manager Cash',
          expectedCash: 3500,
          actualCountedCash: 3450,
          varianceAmount: -50,
          varianceType: 'SHORTAGE',
          variancePercentage: 1.4,
          explanation: 'Change mismatch',
          reviewStatus: 'SUBMITTED',
        },
      ],
      ownerDeposits: [
        {
          depositNumber: 'DEP-2001',
          date: '2026-10-15',
          managerName: 'Rakib',
          fromAccountName: 'Manager Cash',
          toAccountName: 'Owner Vault',
          amount: 2000,
          paymentMethod: 'CASH',
          transactionRef: 'HAND-DELIVERY',
          status: 'CONFIRMED',
          confirmedBy: 'Owner',
          confirmedAt: '2026-10-15 23:00',
        },
      ],
      cashHandovers: [
        {
          handoverNumber: 'HND-3001',
          date: '2026-10-15',
          senderManager: 'Rakib',
          receiverManager: 'Hasan',
          amount: 1500,
          handoverReason: 'Shift change',
          status: 'ACCEPTED',
          acceptedAt: '2026-10-15 18:00',
        },
      ],
      flatExpenses: [
        {
          buildingName: 'Tower A',
          flatName: 'Flat 3A',
          flatCode: 'FL-3A',
          utilityExpense: 1200,
          maintenanceExpense: 300,
          cleaningExpense: 200,
          otherExpense: 0,
          totalExpense: 1700,
          expenseCount: 3,
        },
      ],
      expenseCategoryAnalysis: [
        {
          categoryName: 'Electricity',
          totalAmount: 1200,
          percentageOfTotal: 50,
          voucherCount: 1,
          averageAmount: 1200,
          highestVoucher: 1200,
        },
      ],
      securityDeposits: [
        {
          boarderName: 'Tanvir',
          boarderCode: 'BDR-001',
          flatName: 'Flat 3A',
          seatName: 'S-1',
          allocationStart: '2026-10-01',
          securityDepositBilled: 3000,
          securityDepositPaid: 3000,
          status: 'HELD_IN_CUSTODY',
          currentAllocationStatus: 'ACTIVE',
        },
      ],
      receiptVoidAudit: [
        {
          receiptNumber: 'REC-999',
          receiptDate: '2026-10-10',
          voidAt: '2026-10-11 10:00',
          boarderName: 'Tanvir',
          boarderCode: 'BDR-001',
          amount: 500,
          paymentMethod: 'CASH',
          voidReason: 'Duplicate entry',
          voidBy: 'Admin',
        },
      ],
      managerCompliance: [
        {
          managerName: 'Rakib',
          phoneNumber: '01711111111',
          totalReceiptsCollected: 5000,
          totalExpensesDisbursed: 1000,
          totalSessionsCount: 10,
          timelySubmittedSessions: 10,
          compliancePercentage: 100,
          varianceIncidentsCount: 0,
          totalNetVariance: 0,
        },
      ],
    }

    expect(ALL_REPORTS).toHaveLength(16)

    ALL_REPORTS.forEach((reportDef) => {
      const result = getReportExportData(reportDef.id, mockData)
      expect(result).toBeDefined()
      expect(result.columns.length).toBeGreaterThan(0)
      expect(result.rows).toBeInstanceOf(Array)
      expect(result.rows.length).toBeGreaterThan(0)
    })
  })

  it('handles empty data gracefully without throwing', () => {
    ALL_REPORTS.forEach((reportDef) => {
      const result = getReportExportData(reportDef.id, null)
      expect(result).toBeDefined()
      expect(result.columns.length).toBeGreaterThan(0)
      expect(result.rows).toEqual([])
    })
  })
})

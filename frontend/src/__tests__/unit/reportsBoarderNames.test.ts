import { describe, it, expect } from 'vitest'
import { getReportExportData } from '@/features/reports/reportExportData'

describe('Reports Boarder Name Verification', () => {
  it('correctly formats and displays boarder names in Receipt Collection Report', () => {
    const mockReportsData = {
      receiptCollection: [
        {
          receiptNumber: 'RCT-2026-001',
          date: '2026-10-05',
          boarderName: 'তানভীর আহমেদ',
          boarderCode: 'BDR-2026-001',
          flatName: 'ফ্ল্যাট ৪এ',
          amount: 4500,
          paymentMethod: 'CASH',
          collectorName: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          accountName: 'ম্যানেজার ক্যাশ বক্স',
          isVoid: false,
          remarks: 'অক্টোবর ভাড়া',
        },
        {
          receiptNumber: 'RCT-2026-002',
          date: '2026-10-06',
          boarderName: 'রাকিবুল হাসান',
          boarderCode: 'BDR-2026-002',
          flatName: 'ফ্ল্যাট ৪এ',
          amount: 4200,
          paymentMethod: 'BKASH',
          collectorName: 'দায়িত্বপ্রাপ্ত ম্যানেজার',
          accountName: 'বিকাশ অ্যাকাউন্ট',
          isVoid: false,
          remarks: '',
        },
      ],
    }

    const { columns, rows, summaryRow } = getReportExportData('RECEIPT_COLLECTION', mockReportsData)

    expect(columns.length).toBeGreaterThan(0)
    expect(columns.some((c) => c.key === 'boarderName')).toBe(true)
    expect(rows.length).toBe(2)
    expect(rows[0].boarderName).toBe('তানভীর আহমেদ')
    expect(rows[1].boarderName).toBe('রাকিবুল হাসান')
    expect(rows[0].boarderCode).toBe('BDR-2026-001')
    expect(rows[1].boarderCode).toBe('BDR-2026-002')
    expect(summaryRow?.amount).toBe(8700)
  })

  it('correctly formats and displays boarder names in Boarder Dues Aging Report', () => {
    const mockReportsData = {
      boarderDuesAging: [
        {
          boarderCode: 'BDR-2026-002',
          boarderName: 'রাকিবুল হাসান',
          phoneNumber: '01912345678',
          flatName: 'ফ্ল্যাট ৪এ',
          seatName: 'সিট ২',
          totalBilled: 4200,
          totalPaid: 0,
          totalOutstandingDue: 4200,
          currentDue: 4200,
          days31to60: 0,
          days61to90: 0,
          days90Plus: 0,
          oldestUnpaidMonth: '2026-10-01',
        },
      ],
    }

    const { columns, rows, summaryRow } = getReportExportData('BOARDER_DUES_AGING', mockReportsData)

    expect(columns.some((c) => c.key === 'boarderName')).toBe(true)
    expect(rows.length).toBe(1)
    expect(rows[0].boarderName).toBe('রাকিবুল হাসান')
    expect(rows[0].boarderCode).toBe('BDR-2026-002')
    expect(rows[0].totalOutstandingDue).toBe(4200)
    expect(summaryRow?.totalOutstandingDue).toBe(4200)
  })

  it('correctly formats and displays boarder names in Security Deposit Report', () => {
    const mockReportsData = {
      securityDeposits: [
        {
          boarderName: 'তানভীর আহমেদ',
          boarderCode: 'BDR-2026-001',
          flatName: 'ফ্ল্যাট ৪এ',
          seatName: 'সিট ১',
          allocationStart: '2026-01-01',
          securityDepositBilled: 5000,
          securityDepositPaid: 5000,
          status: 'HELD_IN_CUSTODY',
          currentAllocationStatus: 'ACTIVE',
        },
      ],
    }

    const { columns, rows, summaryRow } = getReportExportData('SECURITY_DEPOSITS', mockReportsData)

    expect(columns.some((c) => c.key === 'boarderName')).toBe(true)
    expect(rows.length).toBe(1)
    expect(rows[0].boarderName).toBe('তানভীর আহমেদ')
    expect(rows[0].boarderCode).toBe('BDR-2026-001')
    expect(summaryRow?.securityDepositPaid).toBe(5000)
  })

  it('correctly formats and displays boarder names in Void Audit Report', () => {
    const mockReportsData = {
      receiptVoidAudit: [
        {
          receiptNumber: 'RCT-2026-999',
          receiptDate: '2026-10-10',
          voidAt: '2026-10-10 14:00',
          boarderName: 'মাহমুদুল করিম',
          boarderCode: 'BDR-2026-003',
          amount: 2000,
          paymentMethod: 'CASH',
          voidReason: 'ভুল ইনপুট',
          voidBy: 'এডমিন',
        },
      ],
    }

    const { columns, rows, summaryRow } = getReportExportData('RECEIPT_VOID_AUDIT', mockReportsData)

    expect(columns.some((c) => c.key === 'boarderName')).toBe(true)
    expect(rows.length).toBe(1)
    expect(rows[0].boarderName).toBe('মাহমুদুল করিম')
    expect(rows[0].boarderCode).toBe('BDR-2026-003')
    expect(summaryRow?.amount).toBe(2000)
  })
})

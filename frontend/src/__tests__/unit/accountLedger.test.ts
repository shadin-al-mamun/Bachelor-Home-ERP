import { describe, it, expect } from 'vitest'
import {
  computeAccountLedger,
  type LedgerEntry,
} from '@/features/finance/FinancialAccountsPage'

describe('computeAccountLedger - Account-Scoped Running Balance Calculation', () => {
  const mockEntries: LedgerEntry[] = [
    // Account A: Manager Cash Box
    {
      id: 'open-mgr',
      date: '2026-10-01T00:00:00Z',
      accountId: 'acc-mgr',
      accountName: 'Manager Cash Box',
      type: 'OPENING',
      typeLabel: 'প্রারম্ভিক ব্যালেন্স (Opening)',
      referenceNo: 'OPENING',
      description: 'প্রারম্ভিক ব্যালেন্স',
      credit: 3000,
      debit: 0,
      runningBalance: 0,
    },
    {
      id: 'rc-101',
      date: '2026-10-15T10:00:00Z',
      accountId: 'acc-mgr',
      accountName: 'Manager Cash Box',
      type: 'RECEIPT',
      typeLabel: 'বিল আদায়',
      referenceNo: 'RCT-001',
      description: 'ভাড়া আদায়',
      credit: 25000,
      debit: 0,
      runningBalance: 0,
    },
    // Account B: Owner/Admin Account
    {
      id: 'open-admin',
      date: '2026-10-01T00:00:00Z',
      accountId: 'acc-admin',
      accountName: 'Owner/Admin Account',
      type: 'OPENING',
      typeLabel: 'প্রারম্ভিক ব্যালেন্স (Opening)',
      referenceNo: 'OPENING',
      description: 'প্রারম্ভিক ব্যালেন্স',
      credit: 5000,
      debit: 0,
      runningBalance: 0,
    },
    // Transfer from Manager to Admin (+4000 to admin, -4000 from mgr)
    {
      id: 'trf-out-1',
      date: '2026-10-22T10:00:00Z',
      accountId: 'acc-mgr',
      accountName: 'Manager Cash Box',
      type: 'TRANSFER_OUT',
      typeLabel: 'স্থানান্তর প্রদান',
      referenceNo: 'TRF-001003',
      description: 'এডমিনে স্থানান্তর',
      credit: 0,
      debit: 4000,
      runningBalance: 0,
    },
    {
      id: 'trf-in-1',
      date: '2026-10-22T10:00:00Z',
      accountId: 'acc-admin',
      accountName: 'Owner/Admin Account',
      type: 'TRANSFER_IN',
      typeLabel: 'স্থানান্তর গ্রহণ',
      referenceNo: 'TRF-001003',
      description: 'ম্যানেজার থেকে প্রাপ্তি',
      credit: 4000,
      debit: 0,
      runningBalance: 0,
    },
    // Transfer from Main/Manager to Admin (+1000 to admin)
    {
      id: 'trf-in-2',
      date: '2026-10-30T10:00:00Z',
      accountId: 'acc-admin',
      accountName: 'Owner/Admin Account',
      type: 'TRANSFER_IN',
      typeLabel: 'স্থানান্তর গ্রহণ',
      referenceNo: 'TRF-001006',
      description: 'মেইন অ্যাকাউন্ট থেকে প্রাপ্তি',
      credit: 1000,
      debit: 0,
      runningBalance: 0,
    },
  ]

  it('correctly calculates account-isolated running balance for a specific account', () => {
    const adminLedger = computeAccountLedger({
      rawEntries: mockEntries,
      selectedAccountId: 'acc-admin',
      dateFilter: 'ALL',
    })

    // Should only contain the 3 entries belonging to acc-admin
    expect(adminLedger).toHaveLength(3)

    // Results are reversed (newest first)
    const [latest, middle, oldest] = adminLedger

    // Oldest (Opening balance)
    expect(oldest.referenceNo).toBe('OPENING')
    expect(oldest.credit).toBe(5000)
    expect(oldest.runningBalance).toBe(5000)

    // Middle (Transfer in +4000 on 22 Oct)
    expect(middle.referenceNo).toBe('TRF-001003')
    expect(middle.credit).toBe(4000)
    expect(middle.runningBalance).toBe(9000) // 5000 + 4000 = 9000

    // Latest (Transfer in +1000 on 30 Oct)
    expect(latest.referenceNo).toBe('TRF-001006')
    expect(latest.credit).toBe(1000)
    // The critical check: must equal 10,000 (matching the live card balance!), NOT the global 29,370
    expect(latest.runningBalance).toBe(10000)
  })

  it('correctly calculates manager account isolated balance', () => {
    const mgrLedger = computeAccountLedger({
      rawEntries: mockEntries,
      selectedAccountId: 'acc-mgr',
      dateFilter: 'ALL',
    })

    expect(mgrLedger).toHaveLength(3)

    const [latest, middle, oldest] = mgrLedger
    // Oldest: opening 3,000
    expect(oldest.runningBalance).toBe(3000)
    // Middle: +25,000 receipt -> 28,000
    expect(middle.runningBalance).toBe(28000)
    // Latest: -4,000 transfer out -> 24,000
    expect(latest.runningBalance).toBe(24000)
  })

  it('calculates global consolidated running balance when selectedAccountId is ALL', () => {
    const globalLedger = computeAccountLedger({
      rawEntries: mockEntries,
      selectedAccountId: 'ALL',
      dateFilter: 'ALL',
    })

    expect(globalLedger).toHaveLength(6)

    // In global mode:
    // Opening mgr: +3000 (3000)
    // Opening admin: +5000 (8000)
    // Receipt: +25000 (33000)
    // Transfer out: -4000 (29000)
    // Transfer in: +4000 (33000)
    // Transfer in: +1000 (34000)
    // Latest should equal 34000 (total hostel funds)
    expect(globalLedger[0].runningBalance).toBe(34000)
  })

  it('filters by search query within the selected account', () => {
    const filtered = computeAccountLedger({
      rawEntries: mockEntries,
      selectedAccountId: 'acc-admin',
      dateFilter: 'ALL',
      searchQuery: 'TRF-001006',
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].referenceNo).toBe('TRF-001006')
    // Running balance calculation is preserved from chronological chain
    expect(filtered[0].runningBalance).toBe(10000)
  })

  it('correctly tracks staff advance debit in account ledger and reduces running balance', () => {
    const entriesWithAdvance: LedgerEntry[] = [
      ...mockEntries,
      {
        id: 'adv-exp-1',
        date: '2026-11-10T14:00:00Z',
        accountId: 'acc-mgr',
        accountName: 'Manager Cash Box',
        type: 'EXPENSE',
        typeLabel: 'অগ্রিম বেতন (Debit)',
        referenceNo: 'ADV-202611-5363',
        description: 'স্টাফ বেতন ও ভাতা: অগ্রিম বেতন প্রদান: এস এম আনিসুজ্জামান (ম্যানেজার)',
        credit: 0,
        debit: 3000,
        runningBalance: 0,
      },
    ]

    const mgrLedger = computeAccountLedger({
      rawEntries: entriesWithAdvance,
      selectedAccountId: 'acc-mgr',
      dateFilter: 'ALL',
    })

    // Now has 4 entries (Opening: 3000, Receipt: +25000, Transfer out: -4000, Advance: -3000)
    expect(mgrLedger).toHaveLength(4)

    const [latest] = mgrLedger
    expect(latest.referenceNo).toBe('ADV-202611-5363')
    expect(latest.typeLabel).toBe('অগ্রিম বেতন (Debit)')
    expect(latest.debit).toBe(3000)
    // 3000 + 25000 - 4000 - 3000 = 21000
    expect(latest.runningBalance).toBe(21000)
  })
})


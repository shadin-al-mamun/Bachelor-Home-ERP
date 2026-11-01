import { describe, it, expect } from 'vitest'
import { filterReceiptsBySearch, type ExtendedReceipt } from '@/features/billing/api/useReceipts'

const sampleReceipts: ExtendedReceipt[] = [
  {
    id: 'rc-1',
    receipt_number: 'RCT-001019',
    boarder_id: 'bdr-1',
    received_by: 'adm-1',
    destination_account_id: 'acc-1',
    amount: 5400,
    payment_method: 'CASH',
    transaction_reference: 'TRX-99881',
    receipt_date: '2026-11-01T10:00:00Z',
    is_void: false,
    created_at: '2026-11-01T10:00:00Z',
    boarder_name: 'আব্দুল মালেক ইবনে রহমান',
    boarder_code: 'BDR-2026-2995',
    boarder_phone: '01712394769',
    collector_name: 'ম্যানেজার',
    account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
  },
  {
    id: 'rc-2',
    receipt_number: 'RCT-001018',
    boarder_id: 'bdr-2',
    received_by: 'adm-1',
    destination_account_id: 'acc-1',
    amount: 4000,
    payment_method: 'CASH',
    transaction_reference: null,
    receipt_date: '2026-11-01T09:30:00Z',
    is_void: false,
    created_at: '2026-11-01T09:30:00Z',
    boarder_name: 'রায়হানুল হাসান',
    boarder_code: 'BDR-2026-8040',
    boarder_phone: '01671913152',
    collector_name: 'ম্যানেজার',
    account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
  },
  {
    id: 'rc-3',
    receipt_number: 'RCT-001017',
    boarder_id: 'bdr-3',
    received_by: 'adm-1',
    destination_account_id: 'acc-1',
    amount: 5400,
    payment_method: 'CASH',
    transaction_reference: null,
    receipt_date: '2026-10-30T14:00:00Z',
    is_void: false,
    created_at: '2026-10-30T14:00:00Z',
    boarder_name: 'আলআমিন',
    boarder_code: 'BDR-2026-6951',
    boarder_phone: '০১৬৭৫৪৮৯২৮৯', // stored with Bengali numerals
    collector_name: 'ম্যানেজার',
    account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
  },
  {
    id: 'rc-4',
    receipt_number: 'RCT-001016',
    boarder_id: 'bdr-4',
    received_by: 'adm-1',
    destination_account_id: 'acc-1',
    amount: 6200,
    payment_method: 'BANK_TRANSFER',
    transaction_reference: 'EBL-DEP-449',
    receipt_date: '2026-10-26T12:00:00Z',
    is_void: false,
    created_at: '2026-10-26T12:00:00Z',
    boarder_name: 'Saikat',
    boarder_code: 'BDR-2026-1468',
    boarder_phone: '01984122144',
    collector_name: 'ম্যানেজার',
    account_name: 'EBL Bank Account',
  },
]

describe('filterReceiptsBySearch', () => {
  it('returns all receipts when query is empty or whitespace', () => {
    expect(filterReceiptsBySearch(sampleReceipts, '')).toHaveLength(4)
    expect(filterReceiptsBySearch(sampleReceipts, '   ')).toHaveLength(4)
    expect(filterReceiptsBySearch(sampleReceipts, undefined)).toHaveLength(4)
  })

  it('filters by receipt number in English and Bengali digits', () => {
    const enMatch = filterReceiptsBySearch(sampleReceipts, 'RCT-001019')
    expect(enMatch).toHaveLength(1)
    expect(enMatch[0].id).toBe('rc-1')

    const partialMatch = filterReceiptsBySearch(sampleReceipts, '1018')
    expect(partialMatch).toHaveLength(1)
    expect(partialMatch[0].id).toBe('rc-2')

    // Searching with Bengali numerals for English receipt number
    const bnMatch = filterReceiptsBySearch(sampleReceipts, '১০১৯')
    expect(bnMatch).toHaveLength(1)
    expect(bnMatch[0].id).toBe('rc-1')
  })

  it('filters by boarder name', () => {
    const malekMatch = filterReceiptsBySearch(sampleReceipts, 'মালেক')
    expect(malekMatch).toHaveLength(1)
    expect(malekMatch[0].id).toBe('rc-1')

    const alaminMatch = filterReceiptsBySearch(sampleReceipts, 'আলআমিন')
    expect(alaminMatch).toHaveLength(1)
    expect(alaminMatch[0].id).toBe('rc-3')

    const saikatMatch = filterReceiptsBySearch(sampleReceipts, 'saikat')
    expect(saikatMatch).toHaveLength(1)
    expect(saikatMatch[0].id).toBe('rc-4')
  })

  it('filters by boarder code in English and Bengali digits', () => {
    const codeMatch = filterReceiptsBySearch(sampleReceipts, 'BDR-2026-2995')
    expect(codeMatch).toHaveLength(1)
    expect(codeMatch[0].id).toBe('rc-1')

    // Bengali numerals search for boarder code
    const bnCodeMatch = filterReceiptsBySearch(sampleReceipts, '২৯৯৫')
    expect(bnCodeMatch).toHaveLength(1)
    expect(bnCodeMatch[0].id).toBe('rc-1')
  })

  it('filters by mobile number regardless of whether digits are English or Bengali', () => {
    // English query for English stored phone
    const enPhone = filterReceiptsBySearch(sampleReceipts, '01712394769')
    expect(enPhone).toHaveLength(1)
    expect(enPhone[0].id).toBe('rc-1')

    // Bengali numerals query for English stored phone
    const bnQueryEnPhone = filterReceiptsBySearch(sampleReceipts, '০১৭১২')
    expect(bnQueryEnPhone).toHaveLength(1)
    expect(bnQueryEnPhone[0].id).toBe('rc-1')

    // English numerals query for Bengali stored phone (rc-3 has ০১৬৭৫৪৮৯২৮৯)
    const enQueryBnPhone = filterReceiptsBySearch(sampleReceipts, '01675')
    expect(enQueryBnPhone).toHaveLength(1)
    expect(enQueryBnPhone[0].id).toBe('rc-3')

    // Bengali numerals query for Bengali stored phone
    const bnQueryBnPhone = filterReceiptsBySearch(sampleReceipts, '০১৬৭৫')
    expect(bnQueryBnPhone).toHaveLength(1)
    expect(bnQueryBnPhone[0].id).toBe('rc-3')
  })

  it('filters by transaction reference', () => {
    const txMatch = filterReceiptsBySearch(sampleReceipts, 'TRX-99881')
    expect(txMatch).toHaveLength(1)
    expect(txMatch[0].id).toBe('rc-1')

    const bankRefMatch = filterReceiptsBySearch(sampleReceipts, 'DEP-449')
    expect(bankRefMatch).toHaveLength(1)
    expect(bankRefMatch[0].id).toBe('rc-4')
  })

  it('filters by multi-term keywords across fields', () => {
    // Both boarder name and receipt number
    const multiMatch = filterReceiptsBySearch(sampleReceipts, 'মালেক 1019')
    expect(multiMatch).toHaveLength(1)
    expect(multiMatch[0].id).toBe('rc-1')

    // Name and Bengali digits
    const multiMatchBn = filterReceiptsBySearch(sampleReceipts, 'মালেক ১০১৯')
    expect(multiMatchBn).toHaveLength(1)
    expect(multiMatchBn[0].id).toBe('rc-1')
  })

  it('returns empty array when no receipt matches', () => {
    const noMatch = filterReceiptsBySearch(sampleReceipts, 'unknown-xyz-99999')
    expect(noMatch).toHaveLength(0)
  })
})


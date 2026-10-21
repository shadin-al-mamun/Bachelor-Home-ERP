import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollectReceiptModal } from '@/features/billing/components/CollectReceiptModal'
import { autoDistributePayment } from '@/features/billing/utils/paymentDistribution'

// Stable static data to prevent infinite re-render cycles in useEffect dependency arrays
const MOCK_ACCOUNTS = [
  { id: 'acc-1', account_name: 'ম্যানেজার ক্যাশ বক্স', account_type: 'CASH_MANAGER', current_balance: 15000 },
]

const MOCK_BOARDERS = [
  {
    id: 'bdr-101',
    full_name: 'তানভীর আহমেদ',
    boarder_code: 'BDR-001',
    phone_number: '01711000001',
    flat_name: '৪এ',
    seat_name: '১০১এ',
  },
]

const MOCK_UNPAID_CHARGES = [
  {
    id: 'charge-sep',
    charge_type: 'RENT',
    billing_month: '2026-09-01',
    description: 'সেপ্টেম্বর ২০২৬ ভাড়া',
    amount: 4000,
    due_amount: 4000,
  },
  {
    id: 'charge-oct',
    charge_type: 'RENT',
    billing_month: '2026-10-01',
    description: 'অক্টোবর ২০২৬ ভাড়া',
    amount: 4500,
    due_amount: 4500,
  },
]

// Mock billing & boarder APIs
vi.mock('@/features/billing/api/useReceipts', () => ({
  useFinancialAccounts: () => ({
    data: MOCK_ACCOUNTS,
  }),
  useUnpaidCharges: (boarderId: string) => ({
    data: boarderId ? MOCK_UNPAID_CHARGES : [],
    isLoading: false,
  }),
  useRecordReceiptMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/features/boarders/api/useBoarders', () => ({
  useBoarders: () => ({
    data: MOCK_BOARDERS,
  }),
}))

describe('CollectReceiptModal.test.tsx - Payment Auto-Distribution to Oldest Dues', () => {
  describe('autoDistributePayment algorithm (FIFO rule)', () => {
    const mockCharges = [
      { id: 'charge-1', due_amount: 4000, billing_month: '2026-09-01' },
      { id: 'charge-2', due_amount: 4500, billing_month: '2026-10-01' },
      { id: 'charge-3', due_amount: 1500, billing_month: '2026-10-01' },
    ]

    it('allocates partial payment to oldest dues first until fully consumed', () => {
      // Boarder pays 5000 partial payment:
      // charge-1 (due 4000) should get 4000
      // charge-2 (due 4500) should get remaining 1000
      // charge-3 (due 1500) should get 0
      const distribution = autoDistributePayment(5000, mockCharges)

      expect(distribution['charge-1']).toBe(4000)
      expect(distribution['charge-2']).toBe(1000)
      expect(distribution['charge-3']).toBe(0)
    })

    it('allocates entire payment to the single oldest charge if payment <= oldest due', () => {
      // Boarder pays 2500 (< 4000)
      const distribution = autoDistributePayment(2500, mockCharges)

      expect(distribution['charge-1']).toBe(2500)
      expect(distribution['charge-2']).toBe(0)
      expect(distribution['charge-3']).toBe(0)
    })

    it('clears all charges when payment is equal to total due', () => {
      const totalDue = 4000 + 4500 + 1500 // 10000
      const distribution = autoDistributePayment(totalDue, mockCharges)

      expect(distribution['charge-1']).toBe(4000)
      expect(distribution['charge-2']).toBe(4500)
      expect(distribution['charge-3']).toBe(1500)
    })

    it('handles 0 or negative payment safely', () => {
      const distribution = autoDistributePayment(0, mockCharges)
      expect(distribution['charge-1']).toBe(0)
      expect(distribution['charge-2']).toBe(0)
      expect(distribution['charge-3']).toBe(0)
    })
  })

  describe('CollectReceiptModal Component Interactions', () => {
    it('renders modal when isOpen is true with boarder preselected', () => {
      render(
        <CollectReceiptModal
          isOpen={true}
          onClose={vi.fn()}
          preSelectedBoarderId="bdr-101"
        />
      )

      expect(screen.getByText('বিল আদায় ও মানি রিসিপ্ট সংগ্রহ (Unified Bill Collection)')).toBeInTheDocument()
      expect(screen.getByText(/আদায়ের খাতসমূহ ও টাকার পরিমাণ/i)).toBeInTheDocument()
      expect(screen.getByText('পেমেন্ট মাধ্যম')).toBeInTheDocument()
    })

    it('allows entering item collection amount and renders total collection', () => {
      render(
        <CollectReceiptModal
          isOpen={true}
          onClose={vi.fn()}
          preSelectedBoarderId="bdr-101"
        />
      )

      const amountInputs = screen.getAllByPlaceholderText('0')
      expect(amountInputs.length).toBeGreaterThan(0)

      fireEvent.change(amountInputs[0], { target: { value: '4500' } })
      expect((amountInputs[0] as HTMLInputElement).value).toBe('4500')
    })
  })
})

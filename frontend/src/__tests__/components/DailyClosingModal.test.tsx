import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DailyClosingModal } from '@/features/cash-custody/components/DailyClosingModal'
import type { ExtendedCashSession } from '@/features/cash-custody/api/useCashSession'

const mockSession: ExtendedCashSession = {
  id: 'cs-test-01',
  manager_id: 'usr-mgr1',
  manager_name: 'হোস্টেল ম্যানেজার',
  account_id: 'fa-1',
  account_name: 'ম্যানেজার ক্যাশ বক্স',
  session_date: '2026-10-18',
  opening_cash: 10000,
  cash_receipts: 8000,
  cash_expenses: 3000,
  cash_deposited_to_owner: 0,
  cash_handed_over_out: 0,
  cash_handed_over_in: 0,
  expected_closing_cash: 15000,
  actual_counted_cash: null,
  cash_variance: null,
  variance_explanation: null,
  status: 'OPEN',
  submitted_at: null,
  reviewed_by: null,
  reviewed_at: null,
  reopen_reason: null,
  created_at: '2026-10-18T00:00:00Z',
  updated_at: '2026-10-18T00:00:00Z',
}

vi.mock('@/features/cash-custody/api/useCashSession', () => ({
  useSubmitDailyCashCloseMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('DailyClosingModal.test.tsx - Variance Enforcement & Mandatory Explanation', () => {
  it('renders correctly when open and displays expected cash', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('দিনশেষে ক্যাশ ক্লোজিং ও ভ্যারিয়েন্স সাবমিট')).toBeInTheDocument()
    // Displays expected cash
    expect(screen.getByText(/15,000/)).toBeInTheDocument()
  })

  it('keeps submit button disabled when actual counted cash is not entered', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /ক্লোজিং সাবমিট করুন/i })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button immediately when counted cash matches expected (variance == 0)', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const countInput = screen.getByRole('spinbutton')
    fireEvent.change(countInput, { target: { value: '15000' } })

    const submitBtn = screen.getByRole('button', { name: /ক্লোজিং সাবমিট করুন/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it('disables submit button if variance != 0 and explanation is empty (PRD §15.1 enforcement)', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    // Expected is 15000; Enter 14500 (Variance = -500 BDT)
    const countInput = screen.getByRole('spinbutton')
    fireEvent.change(countInput, { target: { value: '14500' } })

    // Variance badge appears
    expect(screen.getByText(/ক্যাশ ঘাটতি/i)).toBeInTheDocument()

    // Explanation is empty, submit button MUST be disabled
    const submitBtn = screen.getByRole('button', { name: /ক্লোজিং সাবমিট করুন/i })
    expect(submitBtn).toBeDisabled()
  })

  it('disables submit button if explanation is less than 5 characters', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const countInput = screen.getByRole('spinbutton')
    fireEvent.change(countInput, { target: { value: '14500' } })

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'ভুল' } }) // 3 characters

    const submitBtn = screen.getByRole('button', { name: /ক্লোজিং সাবমিট করুন/i })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button when valid explanation (>= 5 chars) is entered for non-zero variance', () => {
    render(
      <DailyClosingModal
        session={mockSession}
        calculatedExpected={15000}
        isOpen={true}
        onClose={vi.fn()}
      />
    )

    const countInput = screen.getByRole('spinbutton')
    fireEvent.change(countInput, { target: { value: '14500' } })

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, {
      target: { value: 'খুচরা টাকার কাউন্টিং ঘাটতি ও ভাউচার সমন্বয়' },
    })

    const submitBtn = screen.getByRole('button', { name: /ক্লোজিং সাবমিট করুন/i })
    expect(submitBtn).not.toBeDisabled()
  })
})

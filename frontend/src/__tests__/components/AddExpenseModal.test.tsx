import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddExpenseModal } from '@/features/expenses/components/AddExpenseModal'

const mockAccounts = [
  {
    id: 'acc-1',
    account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ)',
    account_type: 'CASH_MANAGER',
    current_balance: 2000,
  },
]

const mockCategories = [
  {
    id: 'cat-1',
    name: 'মেস মিল বাজার',
    category_scope: 'HOSTEL_MARKET',
  },
]

const mockFlats = [
  {
    id: 'flat-1',
    name: 'Flat-206',
    flat_code: 'F-206',
    building_id: 'bld-1',
  },
]

vi.mock('@/features/expenses/api/useExpenses', () => ({
  useExpenseCategories: () => ({ data: mockCategories }),
  useExpenseAccounts: () => ({ data: mockAccounts }),
  useExpenseFlats: () => ({ data: mockFlats }),
  useRecordExpenseMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCreateExpenseCategoryMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/features/finance/api/useFinance', () => ({
  useIncomeCategories: () => ({
    data: [],
    isLoading: false,
  }),
  useCreateIncomeCategoryMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('@/app/store/useAuthStore', () => ({
  useAuthStore: () => ({
    profile: {
      id: 'usr-mgr1',
      role: 'MANAGER',
      full_name: 'টেস্ট ম্যানেজার',
    },
  }),
}))

describe('AddExpenseModal - Voucher Attachment without Page Reload or Exit', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    // Mock window.URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-image-url')
    window.URL.revokeObjectURL = vi.fn()
  })

  const renderComponent = (onClose = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddExpenseModal isOpen={true} onClose={onClose} />
      </QueryClientProvider>
    )
  }

  it('renders voucher attachment section with accessible label options and dropzone', () => {
    const handleClose = vi.fn()
    renderComponent(handleClose)

    expect(screen.getByText('খরচ ভাউচার এন্ট্রি (Simplified Expense Entry)')).toBeInTheDocument()
    expect(screen.getByText('ক্যাশ মেমো / ভাউচার সংযুক্তি (ছবি বা পিডিএফ)')).toBeInTheDocument()
    expect(screen.getByText('ছবি বা PDF ফাইল সিলেক্ট করুন')).toBeInTheDocument()
    expect(screen.getByText('ক্যামেরা দিয়ে ছবি তুলুন')).toBeInTheDocument()
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('attaches a voucher file via file input and displays file info without closing modal', async () => {
    const handleClose = vi.fn()
    const { container } = renderComponent(handleClose)

    const fileInput = container.querySelector('#expense-voucher-file') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const mockFile = new File(['dummy voucher content'], 'receipt_memo.jpg', { type: 'image/jpeg' })

    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText('receipt_memo.jpg')).toBeInTheDocument()
      expect(screen.getByAltText('Voucher preview')).toBeInTheDocument()
    })

    // Modal must NOT have closed!
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('allows removing the attached voucher and resets input safely', async () => {
    const handleClose = vi.fn()
    const { container } = renderComponent(handleClose)

    const fileInput = container.querySelector('#expense-voucher-file') as HTMLInputElement
    const mockFile = new File(['test pdf'], 'invoice.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [mockFile] } })

    await waitFor(() => {
      expect(screen.getByText('invoice.pdf')).toBeInTheDocument()
    })

    // Click remove button
    const removeBtn = screen.getByTitle('ফাইল মুছুন')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByText('invoice.pdf')).not.toBeInTheDocument()
      expect(screen.getByText('ছবি বা PDF ফাইল সিলেক্ট করুন')).toBeInTheDocument()
    })

    expect(handleClose).not.toHaveBeenCalled()
  })

  it('handles drag and drop attachment of voucher files', async () => {
    const handleClose = vi.fn()
    renderComponent(handleClose)

    const dropZone = screen.getByText('এখানে ফাইল ড্রপ করুন অথবা নিচের যেকোনো অপশন ব্যবহার করুন').closest('div')
    expect(dropZone).toBeInTheDocument()

    const dropFile = new File(['receipt data'], 'voucher_grocery.png', { type: 'image/png' })

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [dropFile],
      },
    })

    await waitFor(() => {
      expect(screen.getByText('voucher_grocery.png')).toBeInTheDocument()
    })

    expect(handleClose).not.toHaveBeenCalled()
  })
})

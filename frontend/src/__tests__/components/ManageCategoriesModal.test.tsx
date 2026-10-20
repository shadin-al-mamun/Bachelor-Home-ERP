import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ManageCategoriesModal } from '@/features/finance/components/ManageCategoriesModal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const mockExpenseCategories = [
  { id: 'a1111111-1111-4111-8111-111111111101', name: 'Electric Bill', description: 'বিদ্যুৎ বিল', is_active: true, created_at: '2026-01-01' },
  { id: 'a1111111-1111-4111-8111-111111111102', name: 'Water & Gas', description: 'পানি ও গ্যাস', is_active: true, created_at: '2026-01-01' },
]

const mockIncomeCategories = [
  { id: 'b2222222-2222-4222-8222-222222222201', name: 'Guest Stay Fee', description: 'মেহমান থাকার ফি', is_active: true, created_at: '2026-01-01' },
]

const mutateAsyncExpense = vi.fn()
const mutateAsyncIncome = vi.fn()

vi.mock('@/features/expenses/api/useExpenses', () => ({
  useExpenseCategories: () => ({
    data: mockExpenseCategories,
    isLoading: false,
  }),
  useCreateExpenseCategoryMutation: () => ({
    mutateAsync: mutateAsyncExpense,
    isPending: false,
  }),
}))

vi.mock('@/features/finance/api/useFinance', () => ({
  useIncomeCategories: () => ({
    data: mockIncomeCategories,
    isLoading: false,
  }),
  useCreateIncomeCategoryMutation: () => ({
    mutateAsync: mutateAsyncIncome,
    isPending: false,
  }),
}))

describe('ManageCategoriesModal Component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  const renderComponent = (props: Partial<React.ComponentProps<typeof ManageCategoriesModal>> = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ManageCategoriesModal
          isOpen={true}
          onClose={vi.fn()}
          initialType="EXPENSE"
          {...props}
        />
      </QueryClientProvider>
    )
  }

  it('renders modal when open and displays expense categories by default', () => {
    renderComponent()

    expect(screen.getByText('খাত ও ক্যাটাগরি ব্যবস্থাপনা (Categories)')).toBeInTheDocument()
    expect(screen.getByText('Electric Bill')).toBeInTheDocument()
    expect(screen.getByText('Water & Gas')).toBeInTheDocument()
  })

  it('switches between Expense and Income tabs seamlessly', () => {
    renderComponent()

    // Initially on Expense tab
    expect(screen.getByText('Electric Bill')).toBeInTheDocument()

    // Click Income Categories tab
    const incomeTab = screen.getByText('আয়ের খাত (Income Categories)')
    fireEvent.click(incomeTab)

    expect(screen.getByText('Guest Stay Fee')).toBeInTheDocument()
  })

  it('successfully submits new expense category and invokes callback', async () => {
    const onCreated = vi.fn()
    mutateAsyncExpense.mockResolvedValueOnce({
      id: 'a1111111-1111-4111-8111-111111111199',
      name: 'জেনারেটর ডিজেল',
      description: 'জরুরি ব্যাকআপ ফুয়েল',
      is_active: true,
      created_at: '2026-10-20',
    })

    renderComponent({ onCategoryCreated: onCreated })

    const nameInput = screen.getByPlaceholderText(/যেমন: জেনারেটর ডিজেল/i)
    const descInput = screen.getByPlaceholderText(/খাতের সংক্ষিপ্ত উদ্দেশ্য বা বিবরণ/i)
    const submitBtn = screen.getByText('ব্যয়ের খাত যোগ করুন')

    fireEvent.change(nameInput, { target: { value: 'জেনারেটর ডিজেল' } })
    fireEvent.change(descInput, { target: { value: 'জরুরি ব্যাকআপ ফুয়েল' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mutateAsyncExpense).toHaveBeenCalledWith({
        name: 'জেনারেটর ডিজেল',
        description: 'জরুরি ব্যাকআপ ফুয়েল',
        isActive: true,
      })
      expect(onCreated).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'জেনারেটর ডিজেল' }),
        'EXPENSE'
      )
    })
  })

  it('filters category list in real-time using search input', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText('খাত খুঁজুন...')
    fireEvent.change(searchInput, { target: { value: 'Water' } })

    expect(screen.getByText('Water & Gas')).toBeInTheDocument()
    expect(screen.queryByText('Electric Bill')).not.toBeInTheDocument()
  })
})

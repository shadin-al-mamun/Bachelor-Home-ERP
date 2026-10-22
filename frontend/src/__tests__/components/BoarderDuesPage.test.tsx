import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BoarderPortalDuesPage from '@/features/portal/BoarderDuesPage'

const MOCK_BOARDER = {
  id: 'bdr-test-1',
  user_id: 'user-test-1',
  full_name: 'আল ইমরান',
  boarder_code: 'BDR-105',
  phone_number: '01683877525',
  seat_name: 'সিট-১',
  room_name: 'রুম ২০২',
  flat_name: '২বি',
  building_name: 'সানফ্লাওয়ার প্যালেস',
}

const MOCK_RECEIPTS = [
  {
    id: 'rec-001',
    receipt_number: 'REC-2026-1001',
    boarder_id: 'bdr-test-1',
    boarder_name: 'আল ইমরান',
    boarder_code: 'BDR-105',
    boarder_phone: '01683877525',
    amount: 5000,
    payment_method: 'CASH',
    receipt_date: '2026-10-15T10:00:00Z',
    is_void: false,
    collector_name: 'ম্যানেজার',
    account_name: 'ম্যানেজার ক্যাশ বক্স',
    allocations: [],
  },
]

// Mock Auth Store
vi.mock('@/app/store/useAuthStore', () => ({
  useAuthStore: () => ({
    profile: {
      id: 'user-test-1',
      role: 'BOARDER',
      full_name: 'আল ইমরান',
      phone_number: '01683877525',
    },
  }),
}))

// Mock Branding Store
vi.mock('@/app/store/useBrandingStore', () => ({
  useBrandingStore: () => ({
    orgName: 'ব্যাচেলর হোম ইআরপি',
    tagline: 'হোস্টেল ম্যানেজমেন্ট',
    address: 'ঢাকা, বাংলাদেশ',
    phone: '01712394767',
  }),
}))

// Mock meals/boarders query
vi.mock('@/features/meals/api/useMeals', () => ({
  useMealBoardersList: () => ({
    data: [MOCK_BOARDER],
    isLoading: false,
    refetch: vi.fn(),
  }),
}))

// Mock receipts query
vi.mock('@/features/billing/api/useReceipts', () => ({
  useReceipts: () => ({
    data: MOCK_RECEIPTS,
    isLoading: false,
    refetch: vi.fn(),
  }),
}))

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          neq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    rpc: () => Promise.resolve({ data: { success: true }, error: null }),
  },
}))

describe('BoarderDuesPage.test.tsx - Boarder Portal Dues & Receipts', () => {
  const renderComponent = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <BoarderPortalDuesPage />
      </QueryClientProvider>
    )
  }

  it('renders the portal header with boarder identity and quick financial summary cards', () => {
    renderComponent()

    expect(screen.getByText('আমার বকেয়া ও পেমেন্ট রশিদ')).toBeInTheDocument()
    expect(screen.getByText('আল ইমরান')).toBeInTheDocument()
    expect(screen.getByText('BDR-105')).toBeInTheDocument()
    expect(screen.getByText('সর্বমোট বকেয়া')).toBeInTheDocument()
    expect(screen.getByText('মোট পরিশোধিত')).toBeInTheDocument()
    expect(screen.getByText('মোট ধার্যকৃত চার্জ')).toBeInTheDocument()
  })

  it('allows switching to official receipts tab and viewing receipt vouchers', () => {
    renderComponent()

    const receiptsTabButton = screen.getByText(/পরিশোধিত মানি রিসিপ্ট/)
    fireEvent.click(receiptsTabButton)

    // Should display the receipt number in the table
    expect(screen.getByText('REC-2026-1001')).toBeInTheDocument()
    expect(screen.getByText('নগদ ক্যাশ (Cash)')).toBeInTheDocument()
    expect(screen.getByText('বৈধ রিসিপ্ট')).toBeInTheDocument()

    // Action button to view voucher
    const viewButton = screen.getByText('ভাউচার দেখুন')
    expect(viewButton).toBeInTheDocument()

    // Clicking voucher button opens printable modal
    fireEvent.click(viewButton)
    expect(screen.getByText('অফিসিয়াল মানি রিসিপ্ট ভাউচার')).toBeInTheDocument()
  })
})

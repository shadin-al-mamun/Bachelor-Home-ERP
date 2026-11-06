import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApplicationStatusPage } from '@/features/auth/ApplicationStatusPage'

// Mock useBrandingStore
vi.mock('@/app/store/useBrandingStore', () => ({
  useBrandingStore: () => ({
    orgName: 'ব্যাচেলর হোম ঢাকা',
    phone: '01712-998877',
    emergencyContact: '01811-223344',
    initializeBranding: vi.fn(),
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('ApplicationStatusPage - Dynamic Hostel Phone Number', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('displays the configured hostel phone number from hostel settings and not demo 01700-000000', async () => {
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/portal/my-application']}>
          <ApplicationStatusPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Should NOT contain the old demo placeholder 01700-000000
    expect(screen.queryByText(/01700-000000/i)).not.toBeInTheDocument()

    // Should contain the configured hostel phone number from branding/hostel settings
    const helplineLink = screen.getByRole('link', { name: /01712-998877/i })
    expect(helplineLink).toBeInTheDocument()
    expect(helplineLink).toHaveAttribute('href', 'tel:01712-998877')

    // Should show hostel name in the tracking portal subtitle
    expect(screen.getByText(/ব্যাচেলর হোম ঢাকা — আবেদনকারী ট্র্যাকিং পোর্টাল/i)).toBeInTheDocument()
  })
})


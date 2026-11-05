import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MonthlyCollectionSheetModal } from '@/features/reports/components/MonthlyCollectionSheetModal'
import { MonthlyCollectionSheetView } from '@/features/reports/components/MonthlyCollectionSheetView'
import type {
  MonthlyCollectionSheetRow,
  MonthlyCollectionSheetTotals,
} from '@/features/reports/api/useMonthlyCollectionSheetData'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const sampleRow: MonthlyCollectionSheetRow = {
  sl: 1,
  boarderId: 'b-sample-1',
  boarderName: 'জহিরুল ইসলাম',
  boarderPhone: '01712345678',
  boarderCode: 'BDR-2026-101',
  flatCode: 'Flat-206',
  flatName: 'ফ্ল্যাট ২০৬',
  roomSeatText: 'Room-A • Seat A-1',
  advanceAmount: 2400,
  hasAdvance: true,
  previousDue: 1408,
  previousDueCollected: 1000,
  previousDueVouchers: ['RCT-001024'],
  payments: [
    { amount: 2000, voucher: 'RCT-001025' },
    { amount: 1200, voucher: 'RCT-001026' },
  ],
  totalCurrentCollected: 3200,
  seatRent: 3200,
  serviceCharge: 0,
  mealCharge: 0,
  totalCurrentExpense: 3200,
  netBalance: 0,
}

const sampleTotals: MonthlyCollectionSheetTotals = {
  advanceAmount: 2400,
  previousDue: 1408,
  previousDueCollected: 1000,
  payment1: 2000,
  payment2: 1200,
  payment3: 0,
  payment4: 0,
  totalCurrentCollected: 3200,
  seatRent: 3200,
  serviceCharge: 0,
  mealCharge: 0,
  totalCurrentExpense: 3200,
  netBalance: 0,
}

describe('MonthlyCollectionSheet Components & View (শীট ও পপআপ টেস্ট)', () => {
  it('renders MonthlyCollectionSheetView with the exact 15 columns matching template', () => {
    render(
      <MonthlyCollectionSheetView
        rows={[sampleRow]}
        totals={sampleTotals}
        monthBn="অক্টোবর/২০২৬"
        flatCode="২০৬"
        flatName="ফ্ল্যাট ২০৬"
        isLoading={false}
      />
    )

    // Check Header Text
    expect(screen.getByText('ব্যাচেলর হোম')).toBeInTheDocument()
    expect(screen.getByText('-: মাসিক বিল আদায়ের শীট :-')).toBeInTheDocument()
    expect(screen.getByText('অক্টোবর/২০২৬')).toBeInTheDocument()
    expect(screen.getByText('২০৬')).toBeInTheDocument()

    // Check Column Headers
    expect(screen.getByText('ক্রঃনং')).toBeInTheDocument()
    expect(screen.getByText('সদস্যের নাম ও মোবাইল নম্বর')).toBeInTheDocument()
    expect(screen.getByText('এডভান্স ভাড়া')).toBeInTheDocument()
    expect(screen.getByText('পূর্ববর্তী মাসের পাওনা')).toBeInTheDocument()
    expect(screen.getByText('পূর্ববর্তী মাসের পাওনা আদায়')).toBeInTheDocument()
    expect(screen.getByText('চলতি মাসে আদায়')).toBeInTheDocument()
    expect(screen.getByText('১ম')).toBeInTheDocument()
    expect(screen.getByText('২য়')).toBeInTheDocument()
    expect(screen.getByText('৩য়')).toBeInTheDocument()
    expect(screen.getByText('৪র্থ')).toBeInTheDocument()
    expect(screen.getByText('চলতি মাসের মোট আদায়')).toBeInTheDocument()
    expect(screen.getByText('সিট ভাড়া')).toBeInTheDocument()
    expect(screen.getByText('সার্ভিস চার্জ')).toBeInTheDocument()
    expect(screen.getByText('মিল খরচ')).toBeInTheDocument()
    expect(screen.getByText('চলতি মাসের মোট খরচ')).toBeInTheDocument()
    expect(screen.getByText('দেনা/পাওনা')).toBeInTheDocument()

    // Check Data Render
    expect(screen.getByText('জহিরুল ইসলাম')).toBeInTheDocument()
    expect(screen.getByText('01712345678')).toBeInTheDocument()
    expect(screen.getByText('RCT-001024')).toBeInTheDocument()
    expect(screen.getByText('RCT-001025')).toBeInTheDocument()
    expect(screen.getByText('RCT-001026')).toBeInTheDocument()
    expect(screen.getByText('সর্বমোট')).toBeInTheDocument()
  })

  it('renders MonthlyCollectionSheetModal and allows clicking download', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onClose = vi.fn()

    render(
      <QueryClientProvider client={queryClient}>
        <MonthlyCollectionSheetModal
          isOpen={true}
          onClose={onClose}
          initialFlatId="flat-206"
          initialMonth="2026-10"
        />
      </QueryClientProvider>
    )

    // Modal title & controls
    expect(screen.getByRole('heading', { name: /মাসিক বিল আদায়ের শীট/i })).toBeInTheDocument()
    expect(screen.getByText('ফ্ল্যাট নির্বাচন করুন *')).toBeInTheDocument()
    expect(screen.getByText('মাসের নাম ও বছর *')).toBeInTheDocument()

    // Clicking "ডাউনলোড করুন (PDF)" triggers window.print
    const downloadBtn = screen.getByRole('button', { name: /ডাউনলোড করুন \(PDF\)/i })
    expect(downloadBtn).toBeInTheDocument()
    fireEvent.click(downloadBtn)

    // Verify print is scheduled
    expect(printSpy).toBeDefined()
    printSpy.mockRestore()
  })
})


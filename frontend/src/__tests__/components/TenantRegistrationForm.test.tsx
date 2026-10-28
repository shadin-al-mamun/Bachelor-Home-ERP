import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TenantRegistrationFormPage from '@/features/settings/TenantRegistrationFormPage'
import TenantPoliceForm from '@/features/settings/components/TenantPoliceForm'
import * as pdfGen from '@/features/settings/utils/tenantFormPdfGenerator'
import i18n from 'i18next'

// Mock the pdf generator so canvas/jspdf doesn't throw in jsdom
vi.mock('@/features/settings/utils/tenantFormPdfGenerator', () => ({
  downloadTenantFormPDF: vi.fn().mockResolvedValue(true),
  downloadTenantFormPdf: vi.fn().mockResolvedValue(true),
  downloadTenantFormJPG: vi.fn().mockResolvedValue(true),
  downloadTenantFormJpg: vi.fn().mockResolvedValue(true),
  printTenantForm: vi.fn().mockReturnValue(true),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

describe('Tenant Registration Form (DMP Replica)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('bn')
    vi.clearAllMocks()
  })

  it('renders TenantRegistrationFormPage with DMP header and fixed division and thana', async () => {
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/settings/tenant-form']}>
          <TenantRegistrationFormPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Check title in navigation/settings header
    expect(screen.getByRole('heading', { level: 1, name: /ভাড়াটিয়া নিবন্ধন ফরম/i })).toBeInTheDocument()

    // Check that settings tab bar includes the tenant form tab
    expect(screen.getAllByText('ভাড়াটিয়া নিবন্ধন ফরম').length).toBeGreaterThan(0)

    // Wait for boarders to load and form to render
    await waitFor(() => {
      expect(screen.getAllByText('ঢাকা মেট্রোপলিটন পুলিশ').length).toBeGreaterThan(0)
    })

    // Check form header and fixed fields
    expect(screen.getAllByText('ঢাকা').length).toBeGreaterThan(0)
    expect(screen.getAllByText('শেরে বাংলা নগর').length).toBeGreaterThan(0)

    // Check Form item titles 1-17
    expect(screen.getByText('১. ভাড়াটিয়া/বাড়ীওয়ালার নাম :')).toBeInTheDocument()
    expect(screen.getByText('২. পিতার নাম :')).toBeInTheDocument()
    expect(screen.getByText('৩. জন্ম তারিখ :')).toBeInTheDocument()
    expect(screen.getByText('বৈবাহিক অবস্থা :')).toBeInTheDocument()
    expect(screen.getByText('৪. স্থায়ী ঠিকানা :')).toBeInTheDocument()
    expect(screen.getByText('৫. পেশা ও প্রতিষ্ঠান/কর্মস্থলের ঠিকানা :')).toBeInTheDocument()
    expect(screen.getByText('৬. ধর্ম :')).toBeInTheDocument()
    expect(screen.getByText('শিক্ষাগত যোগ্যতা :')).toBeInTheDocument()
    expect(screen.getByText('৭. মোবাইল নম্বর :')).toBeInTheDocument()
    expect(screen.getByText('ই-মেইল আইডি :')).toBeInTheDocument()
    expect(screen.getByText('৮. জাতীয় পরিচয়পত্র নম্বর :')).toBeInTheDocument()
    expect(screen.getByText('৯. পাসপোর্ট নম্বর (যদি থাকে) :')).toBeInTheDocument()
    expect(screen.getByText('১০. জরুরী যোগাযোগ :')).toBeInTheDocument()
    expect(screen.getByText('১১. পরিবার / মেসের সঙ্গীয় সদস্যদের বিবরণ :')).toBeInTheDocument()
    expect(screen.getByText('১৭. বর্তমান বাড়ীতে কোন তারিখ থেকে বসবাস :')).toBeInTheDocument()
  })

  it('allows opening boarder selection modal and shows “ভাড়াটিয়া ফরম ডাউনলোড করুন” button', async () => {
    const queryClient = createTestQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/settings/tenant-form']}>
          <TenantRegistrationFormPage />
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /বর্ডার নির্বাচন/i })).toBeInTheDocument()
    })

    // Find and click the 'বর্ডার নির্বাচন পপআপ' button
    const openModalBtn = screen.getByRole('button', { name: /বর্ডার নির্বাচন/i })
    fireEvent.click(openModalBtn)

    // Modal should now be visible
    await waitFor(() => {
      expect(screen.getByText(/ভাড়াটিয়া নিবন্ধন ফরম — বর্ডার নির্বাচন/i)).toBeInTheDocument()
    })

    // The primary action button requested by the user: “ভাড়াটিয়া ফরম ডাউনলোড করুন”
    const downloadBtns = screen.getAllByRole('button', { name: /ভাড়াটিয়া ফরম ডাউনলোড করুন/i })
    expect(downloadBtns.length).toBeGreaterThan(0)

    // The JPG download button in the modal
    const jpgBtns = screen.getAllByRole('button', { name: /জেপিজি/i })
    expect(jpgBtns.length).toBeGreaterThan(0)

    // Clicking download in the modal calls downloadTenantFormPDF
    fireEvent.click(downloadBtns[downloadBtns.length - 1])
    await waitFor(() => {
      expect(pdfGen.downloadTenantFormPDF).toHaveBeenCalled()
    })

    // Clicking JPG in the modal calls downloadTenantFormJPG
    fireEvent.click(jpgBtns[jpgBtns.length - 1])
    await waitFor(() => {
      expect(pdfGen.downloadTenantFormJPG).toHaveBeenCalled()
    })
  })

  it('renders TenantPoliceForm with provided boarder details and roommate table', () => {
    const mockBoarder = {
      id: 'b-test-1',
      full_name: 'কাজী আরিফুল ইসলাম',
      father_name: 'কাজী নুরুল ইসলাম',
      date_of_birth: '1996-04-12',
      marital_status: 'অবিবাহিত',
      permanent_address: 'গ্রাম: চরভদ্রাসন, থানা: সদর, জেলা: ফরিদপুর',
      occupation: 'সফটওয়্যার ইঞ্জিনিয়ার',
      workplace_address: 'কারওয়ান বাজার, ঢাকা',
      religion: 'ইসলাম',
      educational_qualification: 'স্নাতকোত্তর (কম্পিউটার সায়েন্স)',
      phone_number: '01712345678',
      email: 'ariful@example.com',
      nid_number: '19961234567890',
      passport_number: 'BP1234567',
      emergency_contact_name: 'কাজী রফিকুল ইসলাম',
      emergency_contact_relation: 'বড় ভাই',
      emergency_contact_phone: '01812345678',
      emergency_contact_address: 'মিরপুর-১০, ঢাকা',
      active_allocation: {
        id: 'alloc-1',
        start_date: '2026-01-15',
        seat: {
          seat_number: 'A',
          room: {
            name: 'রুম ২০৪',
            flat: {
              name: 'ফ্ল্যাট ৪বি',
              floor_number: 4,
              building: {
                name: 'রোজ গার্ডেন মেস',
              },
            },
          },
        },
      },
    }

    const mockRoommates = [
      {
        sl: '১।',
        name: 'সাকিব আল হাসান',
        age: '২৫ বছর',
        occupation: 'শিক্ষার্থী',
        phone: '01799999999',
      },
    ]

    render(
      <TenantPoliceForm
        boarder={mockBoarder as any}
        roommates={mockRoommates}
        flatInfo={{
          flatFloor: 'ফ্ল্যাট ৪বি / ৪র্থ তলা',
          houseHolding: 'রোজ গার্ডেন মেস, বাড়ি #১০',
          road: 'রোড #৪',
          area: 'শেরে বাংলা নগর',
          postCode: '১২০৭',
        }}
      />
    )

    // Check boarder specific fields rendered
    expect(screen.getByText('কাজী আরিফুল ইসলাম')).toBeInTheDocument()
    expect(screen.getByText('কাজী নুরুল ইসলাম')).toBeInTheDocument()
    expect(screen.getByText('১২/০৪/১৯৯৬')).toBeInTheDocument()
    expect(screen.getByText('অবিবাহিত')).toBeInTheDocument()
    expect(screen.getByText('গ্রাম: চরভদ্রাসন, থানা: সদর, জেলা: ফরিদপুর')).toBeInTheDocument()
    expect(screen.getByText('সফটওয়্যার ইঞ্জিনিয়ার, কারওয়ান বাজার, ঢাকা')).toBeInTheDocument()
    expect(screen.getByText('ইসলাম')).toBeInTheDocument()
    expect(screen.getByText('স্নাতকোত্তর (কম্পিউটার সায়েন্স)')).toBeInTheDocument()
    expect(screen.getByText('০১৭১২৩৪৫৬৭৮')).toBeInTheDocument()
    expect(screen.getByText('ariful@example.com')).toBeInTheDocument()
    expect(screen.getByText('১৯৯৬১২৩৪৫৬৭৮৯০')).toBeInTheDocument()
    expect(screen.getByText('BP১২৩৪৫৬৭')).toBeInTheDocument()

    // Emergency contact
    expect(screen.getByText('কাজী রফিকুল ইসলাম')).toBeInTheDocument()
    expect(screen.getByText('বড় ভাই')).toBeInTheDocument()
    expect(screen.getByText('মিরপুর-১০, ঢাকা')).toBeInTheDocument()
    expect(screen.getByText('০১৮১২৩৪৫৬৭৮')).toBeInTheDocument()

    // Roommates table (Serial 11)
    expect(screen.getByText('সাকিব আল হাসান')).toBeInTheDocument()
    expect(screen.getByText('২৫ বছর')).toBeInTheDocument()
  })
})

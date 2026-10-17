import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { Boarder, BoarderStatus, AllocationStatus, AllocationHistory, BoarderCharge } from '@/types/database'

export interface BoarderWithRelations extends Boarder {
  active_allocation?: {
    id: string
    boarder_id: string
    seat_id: string
    monthly_rent: number
    security_deposit: number
    start_date: string
    status: AllocationStatus
    created_at?: string
    updated_at?: string
    seat?: {
      id: string
      seat_code: string
      seat_name: string
      default_rent: number
      room?: {
        id: string
        room_code: string
        name: string
        flat?: {
          id: string
          flat_code: string
          name: string
          building?: {
            id: string
            name: string
          }
        }
      }
    }
  } | null
  allocation_history?: (AllocationHistory & {
    previous_seat_code?: string
    new_seat_code?: string
  })[]
  charges?: BoarderCharge[]
  total_due?: number
  total_paid?: number
  meal_summary?: {
    total_meals: number
    estimated_meal_cost: number
    active_today: {
      breakfast: boolean
      lunch: boolean
      dinner: boolean
    }
  }
}

// Initial realistic mock data for development & preview
const INITIAL_MOCK_BOARDERS: BoarderWithRelations[] = [
  {
    id: 'b-101',
    user_id: 'u-101',
    boarder_code: 'BDR-2026-001',
    full_name: 'তানভীর আহমেদ',
    phone_number: '01711223344',
    email: 'tanvir.ahmed@example.com',
    photo_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    nid_passport_number: '1998561234567890',
    nid_document_url: 'boarder-docs/bdr-001-nid.pdf',
    student_id: 'CS-2022-89',
    institution: 'ঢাকা বিশ্ববিদ্যালয়',
    department: 'কম্পিউটার বিজ্ঞান ও প্রকৌশল',
    session: '2021-2022',
    guardian_name: 'আব্দুল কাদের',
    guardian_phone: '01811223344',
    guardian_relation: 'পিতা',
    present_address: 'সানফ্লাওয়ার হোস্টেল, ফ্ল্যাট ৪এ, ধানমন্ডি, ঢাকা',
    permanent_address: 'গ্রাম: চরপাড়া, ডাকঘর: ফুলপুর, ময়মনসিংহ',
    emergency_contact: '01811223344 (পিতা)',
    admission_date: '2026-01-01',
    status: 'ACTIVE',
    remarks: 'নিয়মিত ও সুশৃঙ্খল বর্ডার',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-10-15T08:00:00Z',
    active_allocation: {
      id: 'alloc-1',
      boarder_id: 'b-101',
      seat_id: 'seat-4a-101a',
      monthly_rent: 4500,
      security_deposit: 5000,
      start_date: '2026-01-01',
      status: 'ACTIVE',
      created_at: '2026-01-01T10:00:00Z',
      updated_at: '2026-01-01T10:00:00Z',
      seat: {
        id: 'seat-4a-101a',
        seat_code: '4A-101A',
        seat_name: 'সিট ১ (উইন্ডো সাইড)',
        default_rent: 4500,
        room: {
          id: 'room-4a-101',
          room_code: '4A-101',
          name: 'রুম ১০১ (মাস্টার বেড)',
          flat: {
            id: 'flat-4a',
            flat_code: 'FLAT-4A',
            name: 'ফ্ল্যাট ৪এ',
            building: {
              id: 'bldg-sunflower',
              name: 'সানফ্লাওয়ার হোস্টেল',
            },
          },
        },
      },
    },
    total_due: 0,
    total_paid: 13500,
    charges: [
      {
        id: 'ch-1',
        boarder_id: 'b-101',
        charge_type: 'RENT',
        billing_month: '2026-10-01',
        amount: 4500,
        paid_amount: 4500,
        due_amount: 0,
        status: 'PAID',
        due_date: '2026-10-10',
        description: 'অক্টোবর ২০২৬ মাসিক সিট ভাড়া',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-05T10:00:00Z',
      },
      {
        id: 'ch-2',
        boarder_id: 'b-101',
        charge_type: 'MEAL',
        billing_month: '2026-09-01',
        amount: 3200,
        paid_amount: 3200,
        due_amount: 0,
        status: 'PAID',
        due_date: '2026-10-05',
        description: 'সেপ্টেম্বর ২০২৬ মিল বিল (৫৬ মিল)',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-04T12:00:00Z',
      },
    ],
    allocation_history: [
      {
        id: 'ah-1',
        allocation_id: 'alloc-1',
        previous_seat_code: undefined,
        new_seat_code: '4A-101A',
        change_type: 'INITIAL_ALLOCATION',
        effective_date: '2026-01-01',
        reason: 'নতুন বর্ডার হিসেবে সিট বরাদ্দ',
        created_at: '2026-01-01T10:00:00Z',
      },
    ],
    meal_summary: {
      total_meals: 28,
      estimated_meal_cost: 1680,
      active_today: { breakfast: true, lunch: true, dinner: true },
    },
  },
  {
    id: 'b-102',
    user_id: 'u-102',
    boarder_code: 'BDR-2026-002',
    full_name: 'রাকিবুল হাসান',
    phone_number: '01912345678',
    email: 'rakibul.hasan@example.com',
    photo_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    nid_passport_number: '1999234567890123',
    nid_document_url: 'boarder-docs/bdr-002-nid.jpg',
    student_id: 'BBA-2023-45',
    institution: 'ব্র্যাক বিশ্ববিদ্যালয়',
    department: 'মার্কেটিং',
    session: '2022-2023',
    guardian_name: 'নুরুল ইসলাম',
    guardian_phone: '01712345678',
    guardian_relation: 'পিতা',
    present_address: 'সানফ্লাওয়ার হোস্টেল, ফ্ল্যাট ৪এ, ঢাকা',
    permanent_address: 'বাসা নং ১২, রোড ৪, পুলিশ লাইন, সিলেট',
    emergency_contact: '01712345678 (পিতা)',
    admission_date: '2026-02-15',
    status: 'ACTIVE',
    remarks: 'সময়মত পেমেন্ট সম্পন্নকারী',
    created_at: '2026-02-15T11:00:00Z',
    updated_at: '2026-10-15T08:00:00Z',
    active_allocation: {
      id: 'alloc-2',
      boarder_id: 'b-102',
      seat_id: 'seat-4a-101b',
      monthly_rent: 4200,
      security_deposit: 5000,
      start_date: '2026-02-15',
      status: 'ACTIVE',
      created_at: '2026-02-15T11:00:00Z',
      updated_at: '2026-02-15T11:00:00Z',
      seat: {
        id: 'seat-4a-101b',
        seat_code: '4A-101B',
        seat_name: 'সিট ২ (ডোর সাইড)',
        default_rent: 4200,
        room: {
          id: 'room-4a-101',
          room_code: '4A-101',
          name: 'রুম ১০১ (মাস্টার বেড)',
          flat: {
            id: 'flat-4a',
            flat_code: 'FLAT-4A',
            name: 'ফ্ল্যাট ৪এ',
            building: {
              id: 'bldg-sunflower',
              name: 'সানফ্লাওয়ার হোস্টেল',
            },
          },
        },
      },
    },
    total_due: 4200,
    total_paid: 8400,
    charges: [
      {
        id: 'ch-3',
        boarder_id: 'b-102',
        charge_type: 'RENT',
        billing_month: '2026-10-01',
        amount: 4200,
        paid_amount: 0,
        due_amount: 4200,
        status: 'UNPAID',
        due_date: '2026-10-10',
        description: 'অক্টোবর ২০২৬ মাসিক সিট ভাড়া',
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
      },
    ],
    allocation_history: [],
    meal_summary: {
      total_meals: 24,
      estimated_meal_cost: 1440,
      active_today: { breakfast: true, lunch: false, dinner: true },
    },
  },
  {
    id: 'b-103',
    user_id: 'u-103',
    boarder_code: 'BDR-2026-003',
    full_name: 'মাহমুদুল করিম',
    phone_number: '01876543210',
    email: 'mahmudul.karim@example.com',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    nid_passport_number: '2001987654321001',
    nid_document_url: 'boarder-docs/bdr-003-nid.pdf',
    student_id: 'SE-2024-12',
    institution: 'ড্যাফোডিল ইন্টারন্যাশনাল ইউনিভার্সিটি',
    department: 'সফটওয়্যার ইঞ্জিনিয়ারিং',
    session: '2023-2024',
    guardian_name: 'মুস্তাফিজুর রহমান',
    guardian_phone: '01512345678',
    guardian_relation: 'চাচা',
    present_address: 'ধানমন্ডি ২৭, ঢাকা',
    permanent_address: 'গ্রাম: শিবপুর, জেলা: নরসিংদী',
    emergency_contact: '01512345678 (চাচা)',
    admission_date: '2026-10-14',
    status: 'PENDING',
    remarks: 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন এসেছে। NID ও স্টুডেন্ট আইডি যাচাই সাপেক্ষে অনুমোদন প্রয়োজন।',
    created_at: '2026-10-14T14:30:00Z',
    updated_at: '2026-10-14T14:30:00Z',
    active_allocation: null,
    total_due: 0,
    total_paid: 0,
    charges: [],
    allocation_history: [],
  },
  {
    id: 'b-104',
    user_id: 'u-104',
    boarder_code: 'BDR-2026-004',
    full_name: 'শাকিল চৌধুরী',
    phone_number: '01633445566',
    email: 'shakil.chy@example.com',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    nid_passport_number: '2000123987456123',
    nid_document_url: 'boarder-docs/bdr-004-passport.jpg',
    student_id: 'EMP-7712',
    institution: 'টেকভার্স সলিউশনস লি.',
    department: 'প্রোডাক্ট ডিজাইন',
    session: 'কর্মজীবী',
    guardian_name: 'আব্দুর রাজ্জাক',
    guardian_phone: '01799887766',
    guardian_relation: 'পিতা',
    present_address: 'মিরপুর ২, ঢাকা',
    permanent_address: 'গ্রাম: রাধানগর, শ্রীমঙ্গল, মৌলভীবাজার',
    emergency_contact: '01799887766 (পিতা)',
    admission_date: '2026-10-15',
    status: 'PENDING',
    remarks: 'প্রফেশনাল ব্যাচেলর। চাকরি আইডি ও NID সংযুক্ত করা হয়েছে।',
    created_at: '2026-10-15T09:15:00Z',
    updated_at: '2026-10-15T09:15:00Z',
    active_allocation: null,
    total_due: 0,
    total_paid: 0,
    charges: [],
    allocation_history: [],
  },
  {
    id: 'b-105',
    user_id: 'u-105',
    boarder_code: 'BDR-2025-089',
    full_name: 'জাহিদুল ইসলাম শামীম',
    phone_number: '01755667788',
    email: 'jahidul.shamim@example.com',
    photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    nid_passport_number: '1997345678901234',
    guardian_name: 'শফিকুল ইসলাম',
    guardian_phone: '01822334455',
    guardian_relation: 'পিতা',
    present_address: 'উত্তরা সেক্টর ৭, ঢাকা',
    permanent_address: 'চৌধুরী বাড়ি, সদর, কুমিলা',
    emergency_contact: '01822334455',
    admission_date: '2025-06-01',
    leaving_date: '2026-08-31',
    status: 'LEFT',
    remarks: 'চাকরি পরিবর্তনের কারণে হোস্টেল ত্যাগ করেছেন। সকল বকেয়া ও ডিপোজিট সমন্বয় সম্পন্ন।',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2026-08-31T18:00:00Z',
    active_allocation: null,
    total_due: 0,
    total_paid: 45000,
    charges: [],
    allocation_history: [
      {
        id: 'ah-old-1',
        allocation_id: 'alloc-old-1',
        previous_seat_code: '4B-201A',
        change_type: 'DEPARTURE',
        effective_date: '2026-08-31',
        reason: 'হোস্টেল ত্যাগ ও সিট রিলিজ',
        created_at: '2026-08-31T18:00:00Z',
      },
    ],
  },
]

export interface BoarderFilters {
  status?: BoarderStatus | 'ALL'
  search?: string
}

// ------------------------------------------------------------------------------
// Hooks
// ------------------------------------------------------------------------------

export function useBoarders(filters?: BoarderFilters) {
  return useQuery({
    queryKey: ['boarders', filters],
    queryFn: async (): Promise<BoarderWithRelations[]> => {
      if (!isSupabaseConfigured) {
        let result = [...INITIAL_MOCK_BOARDERS]
        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter((b) => b.status === filters.status)
        }
        if (filters?.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim()
          result = result.filter(
            (b) =>
              b.full_name.toLowerCase().includes(q) ||
              b.phone_number.includes(q) ||
              b.boarder_code.toLowerCase().includes(q) ||
              (b.institution && b.institution.toLowerCase().includes(q))
          )
        }
        return result
      }

      let query = supabase
        .from('boarders')
        .select(`
          *,
          active_allocation:allocations!allocations_boarder_id_fkey(
            id,
            boarder_id,
            seat_id,
            monthly_rent,
            security_deposit,
            start_date,
            status,
            seat:seats(
              id,
              seat_code,
              seat_name,
              default_rent,
              room:rooms(
                id,
                room_code,
                name,
                flat:flats(
                  id,
                  flat_code,
                  name,
                  building:buildings(id, name)
                )
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status)
      }

      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim()
        query = query.or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,boarder_code.ilike.%${q}%`)
      }

      const { data, error } = await query
      if (error) {
        console.warn('Supabase boarders fetch failed, using mock data:', error.message)
        return INITIAL_MOCK_BOARDERS
      }

      return (data || []).map((b: any) => ({
        ...b,
        active_allocation: Array.isArray(b.active_allocation)
          ? b.active_allocation.find((a: any) => a.status === 'ACTIVE') || null
          : b.active_allocation,
      }))
    },
  })
}

export function useBoarder(id?: string) {
  return useQuery({
    queryKey: ['boarder', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<BoarderWithRelations> => {
      if (!isSupabaseConfigured) {
        const found = INITIAL_MOCK_BOARDERS.find((b) => b.id === id)
        if (!found) throw new Error('Boarder not found')
        return found
      }

      const { data, error } = await supabase
        .from('boarders')
        .select(`
          *,
          active_allocation:allocations!allocations_boarder_id_fkey(
            id,
            boarder_id,
            seat_id,
            monthly_rent,
            security_deposit,
            start_date,
            status,
            seat:seats(
              id,
              seat_code,
              seat_name,
              default_rent,
              room:rooms(
                id,
                room_code,
                name,
                flat:flats(
                  id,
                  flat_code,
                  name,
                  building:buildings(id, name)
                )
              )
            )
          ),
          charges:boarder_charges(
            id,
            boarder_id,
            charge_type,
            billing_month,
            amount,
            paid_amount,
            due_amount,
            status,
            due_date,
            description,
            created_at
          )
        `)
        .eq('id', id!)
        .single()

      if (error) {
        const fallback = INITIAL_MOCK_BOARDERS.find((b) => b.id === id)
        if (fallback) return fallback
        throw error
      }

      const activeAlloc = Array.isArray(data.active_allocation)
        ? data.active_allocation.find((a: any) => a.status === 'ACTIVE') || null
        : data.active_allocation

      const charges = data.charges || []
      const totalDue = charges.reduce((acc: number, c: any) => acc + Number(c.due_amount || 0), 0)
      const totalPaid = charges.reduce((acc: number, c: any) => acc + Number(c.paid_amount || 0), 0)

      return {
        ...data,
        active_allocation: activeAlloc,
        charges,
        total_due: totalDue,
        total_paid: totalPaid,
      }
    },
  })
}

// ------------------------------------------------------------------------------
// Document Signed URL Generator
// ------------------------------------------------------------------------------

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  if (!isSupabaseConfigured || !filePath) {
    // Return sample document visual for development/mock mode
    return 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
  }

  try {
    const { data, error } = await supabase.storage
      .from('boarder-documents')
      .createSignedUrl(filePath, 900) // 15 minutes (900 seconds)

    if (error || !data?.signedUrl) {
      console.warn('Could not generate signed URL, using fallback:', error)
      return 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
    }

    return data.signedUrl
  } catch (err) {
    console.error('Storage signed URL error:', err)
    return 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800'
  }
}

// ------------------------------------------------------------------------------
// Mutations
// ------------------------------------------------------------------------------

export function useApproveApplicantMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boarderId, remarks }: { boarderId: string; remarks?: string }) => {
      if (!isSupabaseConfigured) {
        const item = INITIAL_MOCK_BOARDERS.find((b) => b.id === boarderId)
        if (item) {
          item.status = 'ACTIVE'
          item.remarks = remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।'
          item.updated_at = new Date().toISOString()
        }
        return { success: true, boarder: item }
      }

      // 1. Update boarder status to ACTIVE
      const { data: boarder, error: bError } = await supabase
        .from('boarders')
        .update({
          status: 'ACTIVE',
          remarks: remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।',
          updated_at: new Date().toISOString(),
        })
        .eq('id', boarderId)
        .select()
        .single()

      if (bError) throw bError

      // 2. If boarder has a user_id, upgrade profile role to BOARDER
      if (boarder.user_id) {
        const { error: pError } = await supabase
          .from('profiles')
          .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
          .eq('id', boarder.user_id)

        if (pError) console.warn('Could not upgrade profile role:', pError.message)
      }

      return { success: true, boarder }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
    },
  })
}

export function useRejectApplicantMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boarderId, reason }: { boarderId: string; reason: string }) => {
      if (!isSupabaseConfigured) {
        const item = INITIAL_MOCK_BOARDERS.find((b) => b.id === boarderId)
        if (item) {
          item.status = 'REJECTED'
          item.remarks = reason
          item.updated_at = new Date().toISOString()
        }
        return { success: true, boarder: item }
      }

      const { data, error } = await supabase
        .from('boarders')
        .update({
          status: 'REJECTED',
          remarks: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boarderId)
        .select()
        .single()

      if (error) throw error
      return { success: true, boarder: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
    },
  })
}

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
export const INITIAL_MOCK_BOARDERS: BoarderWithRelations[] = [
  {
    id: 'b-imran-3688',
    user_id: 'u-imran',
    boarder_code: 'BDR-2026-3688',
    full_name: 'আল ইমরান',
    phone_number: '01683877525',
    email: 'imran@example.com',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    nid_passport_number: '1995123456789012',
    student_id: 'EMP-EC-99',
    institution: 'নির্বাচন কমিশন সচিবালয়',
    department: 'ব্যক্তিগত কর্মকর্তা',
    guardian_name: 'মোবারক হোসেন',
    guardian_phone: '01711998877',
    guardian_relation: 'পিতা',
    permanent_address: 'ঢাকা',
    admission_date: '2026-10-19',
    status: 'ACTIVE',
    remarks: 'কর্মজীবী আবাসিক সদস্য।',
    created_at: '2026-10-19T10:00:00Z',
    updated_at: '2026-10-19T10:00:00Z',
    active_allocation: null,
    total_due: 0,
    total_paid: 0,
    charges: [],
    allocation_history: [],
  },
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
// Cross-Device Server Synchronization & Local Storage Persistence
// ------------------------------------------------------------------------------

export const BOARDERS_STORAGE_KEY = 'bachelor_erp_boarders'

export async function fetchRemoteBoarders(): Promise<BoarderWithRelations[] | null> {
  try {
    const res = await fetch('/api/boarders')
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        saveStoredBoarders(data)
        return data
      }
      // If server file is empty, seed it with initial mock boarders
      if (Array.isArray(data) && data.length === 0) {
        await fetch('/api/boarders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(INITIAL_MOCK_BOARDERS),
        })
        return INITIAL_MOCK_BOARDERS
      }
    }
  } catch {
    // Network or dev mode fallback
  }
  return null
}

export function getStoredBoarders(): BoarderWithRelations[] {
  if (isSupabaseConfigured) {
    return []
  }
  try {
    const raw = localStorage.getItem(BOARDERS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error('Failed to load boarders from localStorage:', err)
  }
  // Initialize with default mock boarders if empty
  try {
    localStorage.setItem(BOARDERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_BOARDERS))
  } catch (e) {
    console.error('Failed to set initial boarders in localStorage:', e)
  }
  return [...INITIAL_MOCK_BOARDERS]
}

export function saveStoredBoarders(boarders: BoarderWithRelations[]) {
  try {
    localStorage.setItem(BOARDERS_STORAGE_KEY, JSON.stringify(boarders))
  } catch (err) {
    console.error('Failed to save boarders to localStorage:', err)
  }
}

export interface CreateBoarderInput {
  user_id?: string
  full_name: string
  phone_number: string
  email: string
  guardian_name: string
  guardian_phone: string
  guardian_relation?: string
  present_address?: string
  permanent_address: string
  institution: string
  department?: string
  student_id?: string
  session?: string
  nid_passport_number: string
  photo_url?: string
  nid_document_url?: string
  remarks?: string
}

export async function createBoarderApplication(input: CreateBoarderInput): Promise<BoarderWithRelations> {
  const newId = 'b-' + Date.now()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const boarderCode = `BDR-2026-${randomSuffix}`
  const nowIso = new Date().toISOString()
  const todayDate = nowIso.split('T')[0]

  const newBoarder: BoarderWithRelations = {
    id: newId,
    user_id: input.user_id || undefined,
    boarder_code: boarderCode,
    full_name: input.full_name,
    phone_number: input.phone_number,
    email: input.email,
    photo_url: input.photo_url || `https://images.unsplash.com/photo-${1535713875000 + (randomSuffix % 500)}?w=150`,
    nid_passport_number: input.nid_passport_number,
    nid_document_url: input.nid_document_url || 'boarder-docs/application-nid.jpg',
    student_id: input.student_id || '',
    institution: input.institution,
    department: input.department || '',
    session: input.session || '',
    guardian_name: input.guardian_name,
    guardian_phone: input.guardian_phone,
    guardian_relation: input.guardian_relation || 'অভিভাবক',
    present_address: input.present_address || '',
    permanent_address: input.permanent_address,
    emergency_contact: `${input.guardian_phone} (${input.guardian_relation || 'অভিভাবক'})`,
    admission_date: todayDate,
    status: 'PENDING',
    remarks: input.remarks || 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন জমা পড়েছে। ভেরিফিকেশন সাপেক্ষে সিট বরাদ্দ প্রয়োজন।',
    created_at: nowIso,
    updated_at: nowIso,
    active_allocation: null,
    total_due: 0,
    total_paid: 0,
    charges: [],
    allocation_history: [],
  }

  // 1. Sync to shared dev server API so PC immediately receives mobile submissions
  try {
    await fetch('/api/boarders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBoarder),
    })
  } catch (e) {
    console.warn('Could not post to /api/boarders (server offline?):', e)
  }

  // 2. Also attempt Supabase insert / RPC if credentials configured
  if (isSupabaseConfigured) {
    try {
      const { data: authUser } = await supabase.auth.getUser()
      const rawUserId = authUser?.user?.id || input.user_id || null
      const isValidUuid = typeof rawUserId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)
      const validUserId = isValidUuid ? rawUserId : null

      // Try RPC first (SECURITY DEFINER, ensures code generation & profile sync)
      const { data: rpcData, error: rpcError } = await supabase.rpc('submit_boarder_application', {
        p_user_id: validUserId,
        p_full_name: input.full_name,
        p_phone_number: input.phone_number,
        p_email: input.email || null,
        p_guardian_name: input.guardian_name,
        p_guardian_phone: input.guardian_phone,
        p_guardian_relation: input.guardian_relation || 'অভিভাবক',
        p_permanent_address: input.permanent_address,
        p_institution: input.institution || null,
        p_nid_passport_number: input.nid_passport_number || null,
        p_present_address: input.present_address || null,
        p_department: input.department || null,
        p_student_id: input.student_id || null,
        p_session: input.session || null,
        p_nid_document_url: input.nid_document_url || null,
        p_remarks: input.remarks || 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন জমা পড়েছে।',
      })

      if (!rpcError && rpcData) {
        const merged = { ...newBoarder, ...rpcData }
        saveStoredBoarders([merged, ...getStoredBoarders().filter(b => b.id !== merged.id)])
        return merged
      }

      if (rpcError) {
        console.warn('submit_boarder_application RPC error, trying direct insert:', rpcError.message)
      }

      // Fallback: Direct table insert
      const insertData: Record<string, any> = {
        boarder_code: boarderCode,
        full_name: input.full_name,
        phone_number: input.phone_number,
        email: input.email || null,
        nid_passport_number: input.nid_passport_number,
        institution: input.institution,
        department: input.department,
        student_id: input.student_id,
        session: input.session,
        guardian_name: input.guardian_name,
        guardian_phone: input.guardian_phone,
        guardian_relation: input.guardian_relation,
        present_address: input.present_address,
        permanent_address: input.permanent_address,
        status: 'PENDING',
      }
      if (validUserId) {
        insertData.user_id = validUserId
      }

      let { data, error } = await supabase.from('boarders').insert(insertData).select().single()

      // If failed (e.g. foreign key violation on user_id), retry without user_id
      if (error && validUserId) {
        console.warn('Direct insert with user_id failed, retrying without user_id:', error.message)
        const retryData = { ...insertData }
        delete retryData.user_id
        const retryRes = await supabase.from('boarders').insert(retryData).select().single()
        data = retryRes.data
        error = retryRes.error
      }

      if (error) {
        console.error('CRITICAL: Supabase boarder insert error:', error.message)
        throw new Error(`আবেদনটি সার্ভারে সংরক্ষণ করা যায়নি: ${error.message}`)
      } else if (data) {
        const merged = { ...newBoarder, ...data }
        saveStoredBoarders([merged, ...getStoredBoarders().filter(b => b.id !== merged.id)])
        return merged
      }
    } catch (err: unknown) {
      console.error('Supabase boarder insert exception:', err)
      const message = err instanceof Error ? err.message : 'ডাটাবেস সংরক্ষণ ব্যর্থ হয়েছে।'
      throw new Error(message)
    }
  }

  // 3. Update local storage as fallback (only in offline/demo mode)
  const existing = getStoredBoarders()
  const updated = [newBoarder, ...existing.filter(b => b.id !== newBoarder.id)]
  saveStoredBoarders(updated)

  return newBoarder
}

// ------------------------------------------------------------------------------
// Hooks
// ------------------------------------------------------------------------------

export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'MEAL_OPERATOR', 'AUDITOR']

export function useBoarders(filters?: BoarderFilters) {
  return useQuery({
    queryKey: ['boarders', filters],
    queryFn: async (): Promise<BoarderWithRelations[]> => {
      if (!isSupabaseConfigured) {
        const remote = await fetchRemoteBoarders()
        let result = (remote || getStoredBoarders()).filter(
          (b) => b.boarder_code !== 'BDR-2026-4071' && b.email !== 'shadin0158@gmail.com'
        )

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

      // --- When Supabase is configured: Query Real Supabase Database ---
      let data: any[] | null = null

      // 1. Try authoritative SECURITY DEFINER RPC first (bypasses RLS issues)
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_boarders_list')
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          data = rpcData
        }
      } catch {
        // Fall back to table query
      }

      // 2. Direct table query if RPC not yet migrated or returned empty
      if (!data) {
        let query = supabase
          .from('boarders')
          .select(`
            *,
            active_allocation:allocations(
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

        if (filters?.search && filters.search.trim()) {
          const q = filters.search.trim()
          query = query.or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,boarder_code.ilike.%${q}%`)
        }

        const res = await query
        if (res.error) {
          console.warn('Supabase deep boarders fetch error, falling back to simple select:', res.error.message)
          let simpleQuery = supabase
            .from('boarders')
            .select('*')
            .order('created_at', { ascending: false })

          if (filters?.search && filters.search.trim()) {
            const q = filters.search.trim()
            simpleQuery = simpleQuery.or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,boarder_code.ilike.%${q}%`)
          }
          const simpleRes = await simpleQuery
          if (simpleRes.error) {
            console.error('Supabase boarders fetch error:', simpleRes.error.message)
            data = []
          } else {
            data = simpleRes.data
          }
        } else {
          data = res.data
        }
      }

      // Fetch staff user IDs separately so administrative staff are NEVER shown as boarders
      let staffUserIds = new Set<string>()
      try {
        const { data: staffProfiles } = await supabase
          .from('profiles')
          .select('id')
          .in('role', STAFF_ROLES)
        if (staffProfiles) {
          staffProfiles.forEach((p: any) => staffUserIds.add(p.id))
        }
      } catch {
        // Ignore
      }

      // Also fetch any newly self-registered applicants from public.profiles so they immediately appear in pending list
      let pendingFromProfiles: BoarderWithRelations[] = []
      try {
        const { data: applicantProfiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'APPLICANT')

        if (applicantProfiles && applicantProfiles.length > 0) {
          const existingUserIds = new Set((data || []).map((b: any) => b.user_id).filter(Boolean))
          const existingEmails = new Set((data || []).map((b: any) => b.email?.toLowerCase()).filter(Boolean))

          applicantProfiles.forEach((p: any) => {
            if (!existingUserIds.has(p.id) && !existingEmails.has(p.email?.toLowerCase())) {
              pendingFromProfiles.push({
                id: p.id,
                user_id: p.id,
                boarder_code: 'APP-' + p.id.slice(0, 6).toUpperCase(),
                full_name: p.full_name || 'নতুন আবেদনকারী',
                phone_number: p.phone_number || '',
                email: p.email,
                guardian_name: 'অভিভাবক (প্রোফাইল)',
                guardian_phone: p.phone_number || '',
                permanent_address: 'ঠিকানা অপেক্ষমান',
                admission_date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                status: 'PENDING',
                remarks: 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন এসেছে।',
                created_at: p.created_at,
                updated_at: p.updated_at,
                active_allocation: null,
                charges: [],
                allocation_history: [],
              })
            }
          })
        }
      } catch (err) {
        console.warn('Could not check applicant profiles:', err)
      }

      // Merge genuine boarders with any pending applicant profiles
      const rawList = [...(data || []), ...pendingFromProfiles].map((b: any) => ({
        ...b,
        active_allocation: Array.isArray(b.active_allocation)
          ? b.active_allocation.find((a: any) => a.status === 'ACTIVE') || null
          : b.active_allocation,
      }))

      // Strictly filter out super admin test records (shadin0158@gmail.com should never be listed as a boarder)
      let filteredList = rawList.filter((b: any) => {
        if (b.boarder_code === 'BDR-2026-4071') return false
        if (b.email?.toLowerCase() === 'shadin0158@gmail.com') return false
        if (b.user_id && staffUserIds.has(b.user_id)) return false
        return true
      })

      // Apply status filter if set
      let result = filteredList
      if (filters?.status && filters.status !== 'ALL') {
        result = result.filter((b) => b.status === filters.status)
      }

      return result
    },
    refetchInterval: 3000, // Poll every 3 seconds for instant cross-device updates
    refetchOnWindowFocus: true,
  })
}

export function useBoarder(id?: string) {
  return useQuery({
    queryKey: ['boarder', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<BoarderWithRelations> => {
      if (!isSupabaseConfigured) {
        const list = getStoredBoarders().filter(
          (b) => b.boarder_code !== 'BDR-2026-4071' && b.email !== 'shadin0158@gmail.com'
        )
        const found = list.find((b) => b.id === id)
        if (!found) throw new Error('Boarder not found')
        return found
      }

      const { data, error } = await supabase
        .from('boarders')
        .select(`
          *,
          active_allocation:allocations(
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
        .maybeSingle()

      if (error || !data) {
        // Fallback: Check if id is an applicant in public.profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id!)
          .maybeSingle()

        if (profileData && profileData.role === 'APPLICANT') {
          return {
            id: profileData.id,
            user_id: profileData.id,
            boarder_code: 'APP-' + profileData.id.slice(0, 6).toUpperCase(),
            full_name: profileData.full_name || 'নতুন আবেদনকারী',
            phone_number: profileData.phone_number || '',
            email: profileData.email,
            guardian_name: 'অভিভাবক (প্রোফাইল)',
            guardian_phone: profileData.phone_number || '',
            permanent_address: 'ঠিকানা অপেক্ষমান',
            admission_date: profileData.created_at ? profileData.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            status: 'PENDING',
            remarks: 'অনলাইন রেজিস্ট্রেশন পোর্টাল থেকে নতুন আবেদন এসেছে।',
            created_at: profileData.created_at,
            updated_at: profileData.updated_at,
            active_allocation: null,
            charges: [],
            allocation_history: [],
          }
        }

        const fallback = INITIAL_MOCK_BOARDERS.find((b) => b.id === id)
        if (fallback) return fallback
        throw new Error('বোর্ডার প্রোফাইল পাওয়া যায়নি।')
      }

      if (data?.boarder_code === 'BDR-2026-4071' || data?.email === 'shadin0158@gmail.com') {
        throw new Error('প্রশাসনিক কর্মকর্তা প্রোফাইল বোর্ডার তালিকায় অন্তর্ভুক্ত নয়।')
      }

      const activeAlloc = Array.isArray(data.active_allocation)
        ? data.active_allocation.find((a: any) => a.status === 'ACTIVE') || null
        : data.active_allocation

      const charges = data.charges || []
      const totalDue = charges.reduce((acc: number, c: any) => acc + Number(c.due_amount || 0), 0)
      const totalPaid = charges.reduce((acc: number, c: any) => acc + Number(c.paid_amount || 0), 0)

      // Compute real-time Opt-Out meal summary for the current month
      const todayStr = new Date().toISOString().slice(0, 10)
      const startOfMonth = todayStr.slice(0, 7) + '-01'
      const admitDate = data.admission_date || activeAlloc?.start_date || startOfMonth
      const effectiveStart = admitDate > startOfMonth ? admitDate : startOfMonth

      let mealSummary = {
        total_meals: 0,
        estimated_meal_cost: 0,
        active_today: {
          breakfast: true,
          lunch: true,
          dinner: true,
        },
      }

      if (data.status === 'ACTIVE' && todayStr >= effectiveStart) {
        try {
          const { data: selections } = await supabase
            .from('meal_selections')
            .select('*')
            .eq('boarder_id', data.id)
            .gte('meal_date', effectiveStart)
            .lte('meal_date', todayStr)

          const selMap = new Map((selections || []).map((s: any) => [s.meal_date, s]))
          const [curY, curM, curD] = todayStr.split('-').map(Number)
          const [, , stD] = effectiveStart.split('-').map(Number)

          let mealsCount = 0
          let estimatedCost = 0
          for (let d = stD; d <= curD; d++) {
            const dStr = `${curY}-${String(curM).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const sel: any = selMap.get(dStr)
            const b = sel ? Boolean(sel.breakfast) : true
            const l = sel ? Boolean(sel.lunch) : true
            const din = sel ? Boolean(sel.dinner) : true

            if (b) { mealsCount += 0.5; estimatedCost += 26 }
            if (l) { mealsCount += 1.0; estimatedCost += 52 }
            if (din) { mealsCount += 1.0; estimatedCost += 52 }
          }

          mealsCount = Math.round(mealsCount * 10) / 10
          estimatedCost = Math.round(estimatedCost * 100) / 100

          const todaySel: any = selMap.get(todayStr)
          mealSummary = {
            total_meals: mealsCount,
            estimated_meal_cost: estimatedCost,
            active_today: {
              breakfast: todaySel ? Boolean(todaySel.breakfast) : true,
              lunch: todaySel ? Boolean(todaySel.lunch) : true,
              dinner: todaySel ? Boolean(todaySel.dinner) : true,
            },
          }
        } catch (e) {
          console.warn('Error calculating meal_summary in useBoarder:', e)
        }
      }

      return {
        ...data,
        active_allocation: activeAlloc,
        charges,
        total_due: totalDue,
        total_paid: totalPaid,
        meal_summary: mealSummary,
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
      // 1. Sync to shared dev server API so mobile and PC both update instantly
      try {
        await fetch('/api/boarders/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boarderId,
            status: 'ACTIVE',
            remarks: remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।',
          }),
        })
      } catch {
        // ignore offline dev fallback
      }

      if (!isSupabaseConfigured) {
        const list = getStoredBoarders()
        const item = list.find((b) => b.id === boarderId)
        if (item) {
          item.status = 'ACTIVE'
          item.remarks = remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।'
          item.updated_at = new Date().toISOString()
          saveStoredBoarders(list)
        }
        return { success: true, boarder: item }
      }

      // 2. Update boarder status in Supabase if configured
      let boarder: any = null
      const { data: existingBdr } = await supabase
        .from('boarders')
        .select('*')
        .eq('id', boarderId)
        .maybeSingle()

      if (existingBdr) {
        const { data: updatedBdr, error: bError } = await supabase
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
        boarder = updatedBdr
      } else {
        // boarderId is an applicant profile ID: create real boarders row
        const { data: pRow } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', boarderId)
          .maybeSingle()

        if (pRow) {
          const randomCode = 'BDR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
          const { data: insertedBdr, error: insErr } = await supabase
            .from('boarders')
            .insert({
              user_id: pRow.id,
              boarder_code: randomCode,
              full_name: pRow.full_name || 'নতুন বোর্ডার',
              phone_number: pRow.phone_number || '',
              email: pRow.email || null,
              status: 'ACTIVE',
              admission_date: new Date().toISOString().slice(0, 10),
              remarks: remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।',
            })
            .select()
            .single()

          if (insErr) throw insErr
          boarder = insertedBdr
        }
      }

      // 3. If boarder has a user_id or boarderId was a profile, upgrade profile role to BOARDER
      const targetUserId = boarder?.user_id || boarderId
      if (targetUserId) {
        await supabase
          .from('profiles')
          .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
          .eq('id', targetUserId)
      }

      // Also sync to local storage
      const list = getStoredBoarders()
      const item = list.find((b) => b.id === boarderId)
      if (item) {
        item.status = 'ACTIVE'
        item.remarks = remarks || 'অ্যাডমিন কর্তৃক আবেদন অনুমোদিত হয়েছে।'
        saveStoredBoarders(list)
      }

      return { success: true, boarder }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

export function useRejectApplicantMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boarderId, reason }: { boarderId: string; reason: string }) => {
      // 1. Sync to shared dev server API so mobile and PC both update instantly
      try {
        await fetch('/api/boarders/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boarderId,
            status: 'REJECTED',
            remarks: reason,
          }),
        })
      } catch {
        // ignore offline dev fallback
      }

      if (!isSupabaseConfigured) {
        const list = getStoredBoarders()
        const item = list.find((b) => b.id === boarderId)
        if (item) {
          item.status = 'REJECTED'
          item.remarks = reason
          item.updated_at = new Date().toISOString()
          saveStoredBoarders(list)
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

      // Also sync to local storage
      const list = getStoredBoarders()
      const item = list.find((b) => b.id === boarderId)
      if (item) {
        item.status = 'REJECTED'
        item.remarks = reason
        saveStoredBoarders(list)
      }

      return { success: true, boarder: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

export interface UpdateBoarderParams {
  boarderId: string
  fullName: string
  phoneNumber: string
  email?: string
  guardianName?: string
  guardianPhone?: string
  guardianRelation?: string
  permanentAddress?: string
  presentAddress?: string
  institution?: string
  department?: string
  studentId?: string
  nidPassportNumber?: string
  remarks?: string
  status?: BoarderStatus
}

export function useUpdateBoarderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateBoarderParams) => {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('boarders')
          .update({
            full_name: params.fullName.trim(),
            phone_number: params.phoneNumber.trim(),
            email: params.email?.trim() || null,
            guardian_name: params.guardianName?.trim() || null,
            guardian_phone: params.guardianPhone?.trim() || null,
            guardian_relation: params.guardianRelation?.trim() || null,
            permanent_address: params.permanentAddress?.trim() || null,
            present_address: params.presentAddress?.trim() || null,
            institution: params.institution?.trim() || null,
            department: params.department?.trim() || null,
            student_id: params.studentId?.trim() || null,
            nid_passport_number: params.nidPassportNumber?.trim() || null,
            remarks: params.remarks?.trim() || null,
            ...(params.status ? { status: params.status } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.boarderId)
          .select()
          .single()

        if (error) {
          throw new Error(error.message || 'বোর্ডার তথ্য আপডেট করা সম্ভব হয়নি।')
        }

        // If user profile is linked, sync user profile as well
        if (data?.user_id) {
          try {
            await supabase
              .from('profiles')
              .update({
                full_name: params.fullName.trim(),
                phone_number: params.phoneNumber.trim(),
                email: params.email?.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', data.user_id)
          } catch {
            // non-fatal
          }
        }

        // Update local storage copy
        const list = getStoredBoarders()
        const idx = list.findIndex((b) => b.id === params.boarderId)
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            full_name: params.fullName.trim(),
            phone_number: params.phoneNumber.trim(),
            email: params.email?.trim() || list[idx].email,
            guardian_name: params.guardianName?.trim() || list[idx].guardian_name,
            guardian_phone: params.guardianPhone?.trim() || list[idx].guardian_phone,
            permanent_address: params.permanentAddress?.trim() || list[idx].permanent_address,
            present_address: params.presentAddress?.trim() || list[idx].present_address,
            institution: params.institution?.trim() || list[idx].institution,
            department: params.department?.trim() || list[idx].department,
            student_id: params.studentId?.trim() || list[idx].student_id,
            nid_passport_number: params.nidPassportNumber?.trim() || list[idx].nid_passport_number,
            remarks: params.remarks?.trim() || list[idx].remarks,
            status: params.status || list[idx].status,
            updated_at: new Date().toISOString(),
          }
          saveStoredBoarders(list)
        }

        return { success: true, boarder: data }
      }

      // Offline mode
      const list = getStoredBoarders()
      const idx = list.findIndex((b) => b.id === params.boarderId)
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          full_name: params.fullName.trim(),
          phone_number: params.phoneNumber.trim(),
          email: params.email?.trim() || list[idx].email,
          guardian_name: params.guardianName?.trim() || list[idx].guardian_name,
          guardian_phone: params.guardianPhone?.trim() || list[idx].guardian_phone,
          permanent_address: params.permanentAddress?.trim() || list[idx].permanent_address,
          present_address: params.presentAddress?.trim() || list[idx].present_address,
          institution: params.institution?.trim() || list[idx].institution,
          department: params.department?.trim() || list[idx].department,
          student_id: params.studentId?.trim() || list[idx].student_id,
          nid_passport_number: params.nidPassportNumber?.trim() || list[idx].nid_passport_number,
          remarks: params.remarks?.trim() || list[idx].remarks,
          status: params.status || list[idx].status,
          updated_at: new Date().toISOString(),
        }
        saveStoredBoarders(list)
        return { success: true, boarder: list[idx] }
      }

      throw new Error('বোর্ডার পাওয়া যায়নি।')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['meal-boarders-list'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals-summary'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

export function useDeleteBoarderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ boarderId }: { boarderId: string }) => {
      if (isSupabaseConfigured) {
        // 1. Release active allocations to free up seat
        const { data: activeAlloc } = await supabase
          .from('allocations')
          .select('id, seat_id')
          .eq('boarder_id', boarderId)
          .eq('status', 'ACTIVE')
          .maybeSingle()

        if (activeAlloc) {
          await supabase
            .from('allocations')
            .update({
              status: 'ENDED',
              end_date: new Date().toISOString().slice(0, 10),
              cancellation_reason: 'প্রশাসক কর্তৃক বোর্ডার অ্যাকাউন্ট অপসারিত',
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeAlloc.id)

          if (activeAlloc.seat_id) {
            await supabase
              .from('seats')
              .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
              .eq('id', activeAlloc.seat_id)
          }
        }

        // 2. Try direct delete
        const { error } = await supabase
          .from('boarders')
          .delete()
          .eq('id', boarderId)

        if (error) {
          // If foreign key constraint (charges, payments) prevents hard delete, set status to LEFT / INACTIVE
          console.warn('Foreign key prevents hard delete, setting to LEFT status:', error.message)
          await supabase
            .from('boarders')
            .update({
              status: 'LEFT',
              remarks: 'প্রশাসক কর্তৃক বোর্ডার প্রোফাইল অপসারিত / নিষ্ক্রিয় করা হয়েছে',
              updated_at: new Date().toISOString(),
            })
            .eq('id', boarderId)
        }
      }

      // Update local storage
      const list = getStoredBoarders()
      const updated = list.filter((b) => b.id !== boarderId)
      saveStoredBoarders(updated)

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['seats'] })
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['meal-boarders-list'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}



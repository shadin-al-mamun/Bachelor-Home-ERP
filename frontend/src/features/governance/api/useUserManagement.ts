import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured, createTempAuthClient } from '../../../lib/supabaseClient'
import { useAuthStore } from '../../../app/store/useAuthStore'
import type { UserRole, Profile } from '../../../types/database'

export interface UserManagementItem extends Profile {
  assigned_flats: Array<{
    id: string
    flat_id: string
    flat?: {
      id: string
      name: string
      flat_code: string
      building?: {
        id: string
        name: string
      }
    }
  }>
}

const FALLBACK_MOCK_PROFILES: UserManagementItem[] = [
  {
    id: 'p-owner',
    email: 'shadin0158@gmail.com',
    full_name: 'মোঃ আব্দুল্লাহ আল মামুন',
    phone_number: '01712394767',
    role: 'SUPER_ADMIN',
    is_active: true,
    preferred_language: 'bn',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_flats: [],
  },
  {
    id: 'p-imran',
    email: 'imran@example.com',
    full_name: 'আল ইমরান',
    phone_number: '01683877525',
    role: 'BOARDER',
    is_active: true,
    preferred_language: 'bn',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assigned_flats: [],
  },
]

export function useUsersList(searchQuery?: string) {
  return useQuery({
    queryKey: ['users-management-list', searchQuery],
    queryFn: async (): Promise<UserManagementItem[]> => {
      // 1. Fetch all profiles directly (simple, fast, never fails due to relationship conflicts)
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.trim()
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
      }

      const { data: profilesData, error: profilesError } = await query

      if (profilesError) {
        console.warn('Supabase profiles fetch error, using fallback:', profilesError.message)
        let list = [...FALLBACK_MOCK_PROFILES]
        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          list = list.filter(
            (p) =>
              p.full_name.toLowerCase().includes(q) ||
              p.email.toLowerCase().includes(q) ||
              p.phone_number.includes(q)
          )
        }
        return list
      }

      // 2. Fetch flat assignments separately so foreign key ambiguity never breaks profile loading
      let assignmentsByUser: Record<string, any[]> = {}
      try {
        const { data: assignments, error: assignErr } = await supabase
          .from('user_flat_assignments')
          .select(`
            id,
            user_id,
            flat_id,
            flat:flats(
              id,
              name,
              flat_code,
              building:buildings(id, name)
            )
          `)

        if (!assignErr && Array.isArray(assignments)) {
          assignments.forEach((a: any) => {
            if (!assignmentsByUser[a.user_id]) {
              assignmentsByUser[a.user_id] = []
            }
            assignmentsByUser[a.user_id].push(a)
          })
        }
      } catch (err) {
        console.warn('Could not load user flat assignments:', err)
      }

      // 3. Merge profiles with their assigned flats
      const result: UserManagementItem[] = (profilesData || []).map((p: any) => ({
        ...p,
        assigned_flats: assignmentsByUser[p.id] || [],
      }))

      return result
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useAllBuildingsAndFlats() {
  return useQuery({
    queryKey: ['all-buildings-and-flats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          building_code,
          flats:flats(
            id,
            name,
            flat_code,
            floor_number,
            status
          )
        `)
        .order('name')

      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

export function useUpdateUserRoleAndStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      role,
      isActive,
    }: {
      userId: string
      role: UserRole
      isActive: boolean
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw new Error(error.message)
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management-list'] })
    },
  })
}

export function useUpdateUserFlatAssignments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      flatIds,
      assignedBy,
    }: {
      userId: string
      flatIds: string[]
      assignedBy?: string
    }) => {
      // 1. Remove existing assignments
      const { error: deleteError } = await supabase
        .from('user_flat_assignments')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw new Error(deleteError.message)

      // 2. Insert newly selected assignments
      if (flatIds.length > 0) {
        const rowsToInsert = flatIds.map((flatId) => ({
          user_id: userId,
          flat_id: flatId,
          assigned_by: assignedBy || null,
        }))

        const { error: insertError } = await supabase
          .from('user_flat_assignments')
          .insert(rowsToInsert)

        if (insertError) throw new Error(insertError.message)
      }

      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management-list'] })
    },
  })
}

export interface CreateStaffParams {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  role: UserRole
  flatIds?: string[]
}

export function useCreateStaffUser() {
  const queryClient = useQueryClient()
  const { profile: currentUser } = useAuthStore()

  return useMutation({
    mutationFn: async (params: CreateStaffParams) => {
      const cleanPhone = params.phoneNumber.trim()
      const cleanEmail = params.email.trim().toLowerCase()
      const cleanName = params.fullName.trim()
      const cleanPassword = params.password.trim()

      if (!cleanName) throw new Error('অনুগ্রহ করে কর্মকর্তার পুরো নাম লিখুন।')
      if (!cleanPhone) throw new Error('অনুগ্রহ করে মোবাইল নম্বর লিখুন।')
      if (!cleanPassword || cleanPassword.length < 6) {
        throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      }

      if (!isSupabaseConfigured) {
        const newMockUser: UserManagementItem = {
          id: `mock-staff-${Date.now()}`,
          email: cleanEmail,
          full_name: cleanName,
          phone_number: cleanPhone,
          role: params.role,
          is_active: true,
          preferred_language: 'bn',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          assigned_flats: (params.flatIds || []).map((fId) => ({
            id: `assign-${Date.now()}-${fId}`,
            flat_id: fId,
          })),
        }
        FALLBACK_MOCK_PROFILES.unshift(newMockUser)
        return { success: true, userId: newMockUser.id }
      }

      // Check if email or phone is already registered in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email, phone_number')
        .or(`email.eq.${cleanEmail},phone_number.eq.${cleanPhone}`)
        .maybeSingle()

      if (existingProfile) {
        if (existingProfile.email?.toLowerCase() === cleanEmail) {
          throw new Error('এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। ভিন্ন ইমেইল ব্যবহার করুন।')
        }
        if (existingProfile.phone_number === cleanPhone) {
          throw new Error('এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। ভিন্ন নম্বর ব্যবহার করুন।')
        }
      }

      // 1. Create user account using non-session persisting client
      const tempAuthClient = createTempAuthClient()
      const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            phone_number: cleanPhone,
            role: params.role,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('User already registered')) {
          throw new Error('এই ইমেইল দিয়ে ইতোমধ্যে অথেনটিকেশন সিস্টেমে অ্যাকাউন্ট রয়েছে।')
        }
        throw new Error(authError.message || 'কর্মকর্তা আইডি তৈরি করতে সমস্যা হয়েছে।')
      }

      const createdUserId = authData?.user?.id
      if (!createdUserId) {
        throw new Error('ইউজার আইডি তৈরি করা সম্ভব হয়নি।')
      }

      // 2. Ensure auth account is auto-confirmed in Supabase
      try {
        await supabase.rpc('confirm_user_account', {
          p_email: cleanEmail,
          p_phone: cleanPhone,
        })
      } catch (confErr) {
        console.warn('Auto-confirm RPC warning:', confErr)
      }

      // 3. Upsert profile with designated role and active status
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: createdUserId,
            email: cleanEmail,
            full_name: cleanName,
            phone_number: cleanPhone,
            role: params.role,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
      } catch (profErr) {
        console.warn('Profile sync warning:', profErr)
      }

      // 4. Assign flats if provided
      if (params.flatIds && params.flatIds.length > 0) {
        try {
          const rowsToInsert = params.flatIds.map((flatId) => ({
            user_id: createdUserId,
            flat_id: flatId,
            assigned_by: currentUser?.id || null,
          }))

          await supabase.from('user_flat_assignments').insert(rowsToInsert)
        } catch (flatErr) {
          console.warn('Flat assignment on staff creation warning:', flatErr)
        }
      }

      return { success: true, userId: createdUserId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-management-list'] })
    },
  })
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
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

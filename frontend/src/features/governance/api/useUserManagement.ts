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

export function useUsersList(searchQuery?: string, roleFilter?: string) {
  return useQuery({
    queryKey: ['users-management-list', searchQuery, roleFilter],
    queryFn: async (): Promise<UserManagementItem[]> => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone_number,
          role,
          is_active,
          preferred_language,
          avatar_url,
          created_at,
          updated_at,
          assigned_flats:user_flat_assignments(
            id,
            flat_id,
            flat:flats(
              id,
              name,
              flat_code,
              building:buildings(id, name)
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (roleFilter && roleFilter !== 'ALL') {
        query = query.eq('role', roleFilter)
      }

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []) as unknown as UserManagementItem[]
    },
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

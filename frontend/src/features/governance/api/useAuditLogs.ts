import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type { AuditAction, UserRole } from '../../../types/database'

export interface AuditLogItem {
  id: string
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  actor_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  actor?: {
    id: string
    full_name: string
    role: UserRole
    email?: string
  } | null
}

export interface AuditLogFilters {
  tableName?: string
  action?: string
  actorId?: string
  startDate?: string
  endDate?: string
  searchQuery?: string
  page?: number
  pageSize?: number
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async (): Promise<{ logs: AuditLogItem[]; totalCount: number }> => {
      const page = filters.page || 1
      const pageSize = filters.pageSize || 50
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('audit_logs')
        .select(
          `
          id,
          table_name,
          record_id,
          action,
          old_data,
          new_data,
          actor_id,
          ip_address,
          user_agent,
          created_at,
          actor:profiles!audit_logs_actor_id_fkey(id, full_name, role, email)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (filters.tableName && filters.tableName !== 'ALL') {
        query = query.eq('table_name', filters.tableName)
      }

      if (filters.action && filters.action !== 'ALL') {
        query = query.eq('action', filters.action)
      }

      if (filters.actorId) {
        query = query.eq('actor_id', filters.actorId)
      }

      if (filters.startDate) {
        query = query.gte('created_at', `${filters.startDate}T00:00:00`)
      }

      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(error.message)
      }

      return {
        logs: (data ?? []) as unknown as AuditLogItem[],
        totalCount: count || 0,
      }
    },
  })
}

export function useAuditActors() {
  return useQuery({
    queryKey: ['audit-actors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')

      if (error) throw new Error(error.message)
      return data ?? []
    },
  })
}

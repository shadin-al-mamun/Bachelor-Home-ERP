import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'

export type NoticeType = 'INFO' | 'ALERT' | 'WARNING' | 'MEAL'
export type TargetAudience = 'ALL' | 'FLAT' | 'SPECIFIC'

export interface HostelNotice {
  id: string
  title: string
  message: string
  type: NoticeType
  target_audience: TargetAudience
  target_flat_id?: string | null
  target_flat_name?: string | null
  target_boarder_id?: string | null
  target_boarder_name?: string | null
  created_by?: string | null
  created_by_name: string
  is_active: boolean
  created_at: string
}

const LOCAL_STORAGE_KEY = 'bachelor_erp_hostel_notices'

// Clean baseline: zero hardcoded demo seeds so only real hostel notices appear
const DEFAULT_NOTICES: HostelNotice[] = []

function getLocalNotices(): HostelNotice[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null
    if (raw) {
      const parsed: HostelNotice[] = JSON.parse(raw)
      // Purge any legacy demo seeds like notice-seed-1 or maintenance notice
      const cleaned = parsed.filter(
        (n) =>
          n.id !== 'notice-seed-1' &&
          !n.id.startsWith('seed-') &&
          !n.id.startsWith('demo-') &&
          !n.title?.includes('বিদ্যুৎ লাইন রক্ষণাবেক্ষণ')
      )
      if (cleaned.length !== parsed.length && typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned))
      }
      return cleaned
    }
  } catch (e) {
    console.warn('Failed to parse local notices:', e)
  }
  return DEFAULT_NOTICES
}

function saveLocalNotices(notices: HostelNotice[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notices))
    }
  } catch (e) {
    console.warn('Failed to save local notices:', e)
  }
}

export const useNotices = (options?: { activeOnly?: boolean; boarderId?: string; flatId?: string }) => {
  const { profile } = useAuthStore()

  return useQuery({
    queryKey: ['hostel_notices', options?.activeOnly, options?.boarderId, options?.flatId, profile?.id],
    queryFn: async (): Promise<HostelNotice[]> => {
      const localNotices = getLocalNotices()

      const filterByAudience = (list: HostelNotice[]) => {
        return list.filter((n) => {
          if (n.target_audience === 'ALL') return true
          if (n.target_audience === 'FLAT') {
            return options?.flatId ? n.target_flat_id === options.flatId : false
          }
          if (n.target_audience === 'SPECIFIC') {
            return options?.boarderId ? n.target_boarder_id === options.boarderId : false
          }
          return false
        })
      }

      if (!isSupabaseConfigured) {
        let result = [...localNotices]
        if (options?.activeOnly) {
          result = result.filter((n) => n.is_active)
        }
        if (options?.boarderId || options?.flatId) {
          result = filterByAudience(result)
        }
        return result
      }

      try {
        let query = supabase
          .from('hostel_notices')
          .select('*')
          .order('created_at', { ascending: false })

        if (options?.activeOnly) {
          query = query.eq('is_active', true)
        }

        const { data, error } = await query

        if (error) {
          // If table not yet created on remote, fallback to clean localStorage
          console.warn('hostel_notices table fetch warning:', error.message)
          let result = [...localNotices]
          if (options?.activeOnly) result = result.filter((n) => n.is_active)
          if (options?.boarderId || options?.flatId) {
            result = filterByAudience(result)
          }
          return result
        }

        const remoteNotices: HostelNotice[] = (data || [])
          .filter(
            (row) =>
              row.id !== 'notice-seed-1' &&
              !row.id.startsWith('seed-') &&
              !row.title?.includes('বিদ্যুৎ লাইন রক্ষণাবেক্ষণ')
          )
          .map((row) => ({
            id: row.id,
            title: row.title,
            message: row.message,
            type: (row.type as NoticeType) || 'INFO',
            target_audience: (row.target_audience as TargetAudience) || 'ALL',
            target_flat_id: row.target_flat_id || null,
            target_flat_name: row.target_flat_name || null,
            target_boarder_id: row.target_boarder_id || null,
            target_boarder_name: row.target_boarder_name || null,
            created_by: row.created_by,
            created_by_name: row.created_by_name || 'সুপারএডমিন',
            is_active: row.is_active !== false,
            created_at: row.created_at,
          }))

        // Merge user-created local notices only if not in remote
        const mergedMap = new Map<string, HostelNotice>()
        remoteNotices.forEach((n) => mergedMap.set(n.id, n))
        localNotices.forEach((n) => {
          if (!mergedMap.has(n.id)) mergedMap.set(n.id, n)
        })

        let list = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        if (options?.activeOnly) {
          list = list.filter((n) => n.is_active)
        }
        if (options?.boarderId || options?.flatId) {
          list = filterByAudience(list)
        }

        return list
      } catch {
        return localNotices
      }
    },
    staleTime: 10000,
  })
}

export interface CreateNoticePayload {
  title: string
  message: string
  type: NoticeType
  target_audience: TargetAudience
  target_flat_id?: string | null
  target_flat_name?: string | null
  target_boarder_id?: string | null
  target_boarder_name?: string | null
}

export const useCreateNotice = () => {
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()

  return useMutation({
    mutationFn: async (payload: CreateNoticePayload) => {
      const newNotice: HostelNotice = {
        id: `notice-${Date.now()}`,
        title: payload.title.trim(),
        message: payload.message.trim(),
        type: payload.type,
        target_audience: payload.target_audience,
        target_flat_id: payload.target_audience === 'FLAT' ? payload.target_flat_id || null : null,
        target_flat_name: payload.target_audience === 'FLAT' ? payload.target_flat_name || null : null,
        target_boarder_id: payload.target_audience === 'SPECIFIC' ? payload.target_boarder_id || null : null,
        target_boarder_name: payload.target_audience === 'SPECIFIC' ? payload.target_boarder_name || null : null,
        created_by: profile?.id || null,
        created_by_name: profile?.full_name || 'সুপারএডমিন',
        is_active: true,
        created_at: new Date().toISOString(),
      }

      // Save to localStorage
      const local = getLocalNotices()
      saveLocalNotices([newNotice, ...local])

      if (isSupabaseConfigured) {
        try {
          const isValidUuid = (val?: string | null) =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))

        const insertPayload: Record<string, any> = {
          title: newNotice.title,
          message: newNotice.message,
          type: newNotice.type,
          target_audience: newNotice.target_audience,
          target_flat_id: isValidUuid(newNotice.target_flat_id) ? newNotice.target_flat_id : null,
          target_flat_name: newNotice.target_flat_name || null,
          target_boarder_id: isValidUuid(newNotice.target_boarder_id) ? newNotice.target_boarder_id : null,
          target_boarder_name: newNotice.target_boarder_name || null,
          created_by: isValidUuid(profile?.id) ? profile?.id : null,
          created_by_name: profile?.full_name || 'সুপারএডমিন',
          is_active: true,
        }

        const { data, error } = await supabase
          .from('hostel_notices')
          .insert(insertPayload)
          .select()
          .single()

        if (error) {
          console.error('hostel_notices insert error:', error)
          throw new Error(`ডাটাবেজে নোটিশ সংরক্ষণ ব্যর্থ হয়েছে: ${error.message} (অনুগ্রহ করে Supabase SQL Editor-এ মাইগ্রেশন স্ক্রিপ্টটি রান করুন)`)
        }

        if (data?.id) {
          newNotice.id = data.id
        }

          // Dispatch in-app system notifications for the recipient boarder(s)
          if (payload.target_audience === 'SPECIFIC' && payload.target_boarder_id) {
            const { data: boarderData } = await supabase
              .from('boarders')
              .select('user_id')
              .eq('id', payload.target_boarder_id)
              .maybeSingle()

            if (boarderData?.user_id) {
              await supabase.from('system_notifications').insert({
                recipient_id: boarderData.user_id,
                title: payload.title,
                message: payload.message,
                type: payload.type === 'ALERT' ? 'ALERT' : payload.type === 'WARNING' ? 'WARNING' : payload.type === 'MEAL' ? 'MEAL' : 'INFO',
                is_read: false,
                action_url: '/portal/dashboard',
              })
            }
          } else if (payload.target_audience === 'FLAT' && payload.target_flat_id) {
            // Find all active boarders living in this flat
            const { data: flatAllocations } = await supabase
              .from('boarder_allocations')
              .select('boarder:boarders!inner(user_id), seat:seats!inner(room:rooms!inner(flat_id))')
              .eq('status', 'ACTIVE')
              .eq('seat.room.flat_id', payload.target_flat_id)

            if (flatAllocations && flatAllocations.length > 0) {
              const notificationsToInsert = flatAllocations
                .map((a: any) => a.boarder?.user_id)
                .filter(Boolean)
                .map((uid: string) => ({
                  recipient_id: uid,
                  title: `[${payload.target_flat_name || 'ফ্ল্যাট নোটিশ'}] ${payload.title}`,
                  message: payload.message,
                  type: payload.type === 'ALERT' ? 'ALERT' : payload.type === 'WARNING' ? 'WARNING' : payload.type === 'MEAL' ? 'MEAL' : 'INFO',
                  is_read: false,
                  action_url: '/portal/dashboard',
                }))

              if (notificationsToInsert.length > 0) {
                await supabase.from('system_notifications').insert(notificationsToInsert)
              }
            }
          } else if (payload.target_audience === 'ALL') {
            // Get all active boarders
            const { data: allActiveBoarders } = await supabase
              .from('boarders')
              .select('user_id')
              .eq('status', 'ACTIVE')
              .not('user_id', 'is', null)

            if (allActiveBoarders && allActiveBoarders.length > 0) {
              const notificationsToInsert = allActiveBoarders
                .filter((b) => Boolean(b.user_id))
                .map((b) => ({
                  recipient_id: b.user_id,
                  title: payload.title,
                  message: payload.message,
                  type: payload.type === 'ALERT' ? 'ALERT' : payload.type === 'WARNING' ? 'WARNING' : payload.type === 'MEAL' ? 'MEAL' : 'INFO',
                  is_read: false,
                  action_url: '/portal/dashboard',
                }))

              if (notificationsToInsert.length > 0) {
                await supabase.from('system_notifications').insert(notificationsToInsert)
              }
            }
          }
        } catch (err) {
          console.warn('Could not sync notice to Supabase:', err)
        }
      }

      return newNotice
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel_notices'] })
      queryClient.invalidateQueries({ queryKey: ['system_notifications'] })
    },
  })
}

export const useDeleteNotice = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noticeId: string) => {
      // Remove from localStorage
      const local = getLocalNotices().filter((n) => n.id !== noticeId)
      saveLocalNotices(local)

      if (isSupabaseConfigured) {
        try {
          await supabase.from('hostel_notices').delete().eq('id', noticeId)
        } catch (err) {
          console.warn('Could not delete notice from Supabase:', err)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel_notices'] })
    },
  })
}

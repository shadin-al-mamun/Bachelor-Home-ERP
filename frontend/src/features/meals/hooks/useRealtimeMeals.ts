import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export type RealtimeStatus = 'CONNECTING' | 'SUBSCRIBED' | 'DISCONNECTED' | 'ERROR'

export interface UseRealtimeMealsOptions {
  onMealChange?: (payload: any) => void
  enabled?: boolean
}

/**
 * Custom React hook subscribing to Supabase Realtime CDC on public.meal_selections
 * Whenever any boarder toggles a meal, instantly invalidates queries so kitchen monitors update.
 */
export function useRealtimeMeals(options: UseRealtimeMealsOptions = {}) {
  const { onMealChange, enabled = true } = options
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>(
    isSupabaseConfigured ? 'CONNECTING' : 'SUBSCRIBED'
  )
  const [lastEventTime, setLastEventTime] = useState<string | null>(null)
  const [changeCount, setChangeCount] = useState<number>(0)

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) {
      setStatus('SUBSCRIBED')
      return
    }

    setStatus('CONNECTING')

    // Create unique channel name
    const channelName = `realtime-meal-selections-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'meal_selections',
        },
        (payload) => {
          const nowStr = new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
          setLastEventTime(nowStr)
          setChangeCount((prev) => prev + 1)

          // Invalidate relevant meal query caches instantly
          queryClient.invalidateQueries({ queryKey: ['kitchen-meals-summary'] })
          queryClient.invalidateQueries({ queryKey: ['boarder-meal-selections'] })
          queryClient.invalidateQueries({ queryKey: ['kitchen-flat-boarders'] })

          if (onMealChange) {
            onMealChange(payload)
          }
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED')
        } else if (subscribeStatus === 'CLOSED') {
          setStatus('DISCONNECTED')
        } else if (subscribeStatus === 'CHANNEL_ERROR') {
          setStatus('ERROR')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, queryClient, onMealChange])

  return {
    status,
    lastEventTime,
    changeCount,
    isLive: status === 'SUBSCRIBED',
  }
}

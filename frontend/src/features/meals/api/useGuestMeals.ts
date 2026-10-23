import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { getDateMealStatus, isCutoffBypassActive, isUUID } from './useMeals'
import type { MealSessionType } from './useMeals'

export interface GuestMealBooking {
  id: string
  boarder_id: string
  boarder_name?: string
  boarder_code?: string
  flat_id?: string | null
  flat_name?: string | null
  meal_date: string // YYYY-MM-DD
  session: MealSessionType // 'BREAKFAST' | 'LUNCH' | 'DINNER'
  guest_count: number
  unit_rate: number
  total_amount: number
  remarks?: string | null
  status: 'CONFIRMED' | 'CANCELLED'
  created_at: string
}

export interface BookGuestMealInput {
  boarderId: string
  flatId?: string | null
  mealDate: string
  session: MealSessionType
  guestCount: number
  unitRate: number
  remarks?: string | null
}

const STORAGE_KEY = 'bachelor_erp_guest_meal_bookings'

function getLocalGuestMeals(): GuestMealBooking[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    }
  } catch (err) {
    console.warn('Failed to parse local guest meal bookings:', err)
  }
  return []
}

function saveLocalGuestMeals(bookings: GuestMealBooking[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
    }
  } catch (err) {
    console.warn('Failed to save local guest meal bookings:', err)
  }
}

/**
 * Hook to fetch guest meal bookings for a boarder or date
 */
export function useGuestMealBookings(options?: { boarderId?: string; mealDate?: string }) {
  return useQuery({
    queryKey: ['guest-meal-bookings', options?.boarderId, options?.mealDate],
    queryFn: async (): Promise<GuestMealBooking[]> => {
      const local = getLocalGuestMeals()

      if (!isSupabaseConfigured) {
        const filtered = local.filter((item) => {
          if (item.status === 'CANCELLED') return false
          if (options?.boarderId && item.boarder_id !== options.boarderId) return false
          if (options?.mealDate && item.meal_date !== options.mealDate) return false
          return true
        })

        // Deduplicate local by session
        const deduped: GuestMealBooking[] = []
        const seen = new Set<string>()
        for (const item of filtered) {
          const key = `${item.boarder_id}_${item.meal_date}_${item.session}`
          if (!seen.has(key)) {
            seen.add(key)
            deduped.push(item)
          }
        }
        return deduped
      }

      try {
        let query = supabase
          .from('guest_meal_bookings')
          .select(`
            *,
            boarder:boarder_id ( id, full_name, boarder_code ),
            flat:flat_id ( id, name )
          `)
          .eq('status', 'CONFIRMED')
          .order('created_at', { ascending: false })

        if (options?.boarderId && isUUID(options.boarderId)) {
          query = query.eq('boarder_id', options.boarderId)
        }
        if (options?.mealDate) {
          query = query.eq('meal_date', options.mealDate)
        }

        const { data, error } = await query

        if (error) {
          console.warn('guest_meal_bookings fetch warning:', error.message)
          return local.filter((item) => {
            if (item.status === 'CANCELLED') return false
            if (options?.boarderId && item.boarder_id !== options.boarderId) return false
            if (options?.mealDate && item.meal_date !== options.mealDate) return false
            return true
          })
        }

        const remoteList: GuestMealBooking[] = (data || []).map((row: any) => ({
          id: row.id,
          boarder_id: row.boarder_id,
          boarder_name: row.boarder?.full_name || 'বোর্ডার',
          boarder_code: row.boarder?.boarder_code || '',
          flat_id: row.flat_id,
          flat_name: row.flat?.name || null,
          meal_date: row.meal_date,
          session: row.session,
          guest_count: Number(row.guest_count) || 1,
          unit_rate: Number(row.unit_rate) || 0,
          total_amount: Number(row.total_amount) || 0,
          remarks: row.remarks,
          status: row.status,
          created_at: row.created_at,
        }))

        // Deduplicate remoteList by (boarder_id, meal_date, session) keeping the most recent
        const dedupedRemote: GuestMealBooking[] = []
        const seenRemoteKeys = new Set<string>()
        for (const item of remoteList) {
          const key = `${item.boarder_id}_${item.meal_date}_${item.session}`
          if (!seenRemoteKeys.has(key)) {
            seenRemoteKeys.add(key)
            dedupedRemote.push(item)
          }
        }

        // Only include local items if NOT already present in remote
        const unsyncedLocal: GuestMealBooking[] = []
        for (const locItem of local) {
          if (locItem.status !== 'CONFIRMED') continue
          if (options?.boarderId && locItem.boarder_id !== options.boarderId) continue
          if (options?.mealDate && locItem.meal_date !== options.mealDate) continue

          const key = `${locItem.boarder_id}_${locItem.meal_date}_${locItem.session}`
          if (!seenRemoteKeys.has(key)) {
            seenRemoteKeys.add(key)
            unsyncedLocal.push(locItem)
          }
        }

        // Clean up stale 'gmb-' items from localStorage that already exist in remote
        const cleanedLocal = local.filter((locItem) => {
          if (!locItem.id.startsWith('gmb-')) return true
          const key = `${locItem.boarder_id}_${locItem.meal_date}_${locItem.session}`
          return !seenRemoteKeys.has(key)
        })
        if (cleanedLocal.length !== local.length) {
          saveLocalGuestMeals(cleanedLocal)
        }

        return [...dedupedRemote, ...unsyncedLocal]
      } catch (err) {
        console.warn('Error querying guest_meal_bookings:', err)
        return local
      }
    },
    staleTime: 5000,
  })
}

/**
 * Mutation to book new guest meals
 */
export function useBookGuestMealMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BookGuestMealInput) => {
      // Validate cutoff time (unless cutoff bypass is active)
      const dateStatus = getDateMealStatus(input.mealDate)
      const bypassActive = isCutoffBypassActive()

      if (dateStatus.isLockedForBoarder && !bypassActive) {
        throw new Error('রাত ১০:০০ টার কাটঅফ সময় অতিক্রান্ত হওয়ায় গেস্ট মিল বুকিং করা সম্ভব নয়।')
      }

      const totalAmount = Number((input.guestCount * input.unitRate).toFixed(2))
      let finalId = `gmb-${Date.now()}`

      if (isSupabaseConfigured && isUUID(input.boarderId)) {
        try {
          // Check if an active booking already exists for this boarder, date and session
          const { data: existingRows } = await supabase
            .from('guest_meal_bookings')
            .select('id')
            .eq('boarder_id', input.boarderId)
            .eq('meal_date', input.mealDate)
            .eq('session', input.session)
            .eq('status', 'CONFIRMED')
            .limit(1)

          if (existingRows && existingRows.length > 0) {
            // Update the existing booking instead of inserting a duplicate!
            const existingId = existingRows[0].id
            const { data: updated, error: updErr } = await supabase
              .from('guest_meal_bookings')
              .update({
                guest_count: input.guestCount,
                unit_rate: input.unitRate,
                total_amount: totalAmount,
                remarks: input.remarks || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingId)
              .select('id')
              .single()

            if (!updErr && updated?.id) {
              finalId = updated.id
            }
          } else {
            // Insert new booking
            const insertPayload: Record<string, any> = {
              boarder_id: input.boarderId,
              meal_date: input.mealDate,
              session: input.session,
              guest_count: input.guestCount,
              unit_rate: input.unitRate,
              total_amount: totalAmount,
              remarks: input.remarks || null,
              status: 'CONFIRMED',
            }
            if (isUUID(input.flatId)) {
              insertPayload.flat_id = input.flatId
            }

            const { data, error } = await supabase
              .from('guest_meal_bookings')
              .insert(insertPayload)
              .select('id')
              .single()

            if (!error && data?.id) {
              finalId = data.id
            }
          }
        } catch (err) {
          console.warn('Could not sync guest meal to Supabase:', err)
        }
      }

      const newBooking: GuestMealBooking = {
        id: finalId,
        boarder_id: input.boarderId,
        flat_id: input.flatId || null,
        meal_date: input.mealDate,
        session: input.session,
        guest_count: input.guestCount,
        unit_rate: input.unitRate,
        total_amount: totalAmount,
        remarks: input.remarks || null,
        status: 'CONFIRMED',
        created_at: new Date().toISOString(),
      }

      // Update localStorage cleanly: remove any existing entry for this boarder, date & session
      const currentLocal = getLocalGuestMeals().filter((b) => {
        if (
          b.boarder_id === input.boarderId &&
          b.meal_date === input.mealDate &&
          b.session === input.session
        ) {
          return false
        }
        return b.id !== finalId
      })
      saveLocalGuestMeals([newBooking, ...currentLocal])

      return newBooking
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meal-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-meal-selections'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals'] })
    },
  })
}

/**
 * Mutation to cancel an existing guest meal booking
 */
export function useCancelGuestMealMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (booking: GuestMealBooking) => {
      // Validate cutoff time (cannot cancel past or locked dates unless bypass is active)
      const dateStatus = getDateMealStatus(booking.meal_date)
      const bypassActive = isCutoffBypassActive()

      if (dateStatus.isLockedForBoarder && !bypassActive) {
        throw new Error('কাটঅফ সময় অতিক্রান্ত হওয়ায় এই গেস্ট মিল বাতিল করা সম্ভব নয়।')
      }

      // Update localStorage: mark cancelled for this ID and any matching (boarder_id, meal_date, session)
      const local = getLocalGuestMeals()
      const updated = local.map((b) => {
        if (
          b.id === booking.id ||
          (b.boarder_id === booking.boarder_id &&
            b.meal_date === booking.meal_date &&
            b.session === booking.session)
        ) {
          return { ...b, status: 'CANCELLED' as const }
        }
        return b
      })
      saveLocalGuestMeals(updated)

      if (isSupabaseConfigured) {
        try {
          if (isUUID(booking.id)) {
            await supabase
              .from('guest_meal_bookings')
              .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
              .eq('id', booking.id)
          }

          // If there were any other confirmed bookings for this same session on this date, cancel them as well
          if (booking.boarder_id && isUUID(booking.boarder_id)) {
            await supabase
              .from('guest_meal_bookings')
              .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
              .eq('boarder_id', booking.boarder_id)
              .eq('meal_date', booking.meal_date)
              .eq('session', booking.session)
              .eq('status', 'CONFIRMED')
          }
        } catch (err) {
          console.warn('Could not update guest meal booking on Supabase:', err)
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-meal-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-meal-selections'] })
      queryClient.invalidateQueries({ queryKey: ['kitchen-meals'] })
    },
  })
}

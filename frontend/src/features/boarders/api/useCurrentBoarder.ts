import { useQuery } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useMealBoardersList, type BoarderOption } from '@/features/meals/api/useMeals'
import { isPhoneMatch } from '@/utils/phone'

export function useCurrentBoarder() {
  const { profile } = useAuthStore()
  const isStaffRole = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'MANAGER'
  const { data: boardersList = [], isLoading: isLoadingBoarders } = useMealBoardersList()

  // 1. Authoritative verification via security-definer RPC (bypasses RLS issues and self-heals user_id)
  const { data: seatData, isLoading: isLoadingSeat, refetch: refetchSeat } = useQuery({
    queryKey: ['boarder-seat-status', profile?.id, profile?.phone_number, profile?.email],
    enabled: Boolean(profile?.id && isSupabaseConfigured),
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('verify_boarder_seat_status', {
          p_user_id: profile?.id || null,
          p_phone: profile?.phone_number || null,
          p_email: profile?.email || null,
        })
        if (error) {
          console.warn('verify_boarder_seat_status warning:', error.message)
          return null
        }
        return data && data.length > 0 ? data[0] : null
      } catch (err) {
        console.warn('verify_boarder_seat_status exception:', err)
        return null
      }
    },
  })

  // 2. Match resident in boardersList if already loaded
  const matchedFromList = boardersList.find(
    (b) =>
      (seatData?.boarder_id && b.id === seatData.boarder_id) ||
      (profile?.id && (b.user_id === profile.id || b.id === profile.id)) ||
      (profile?.phone_number && isPhoneMatch(b.phone_number, profile.phone_number)) ||
      (profile?.full_name && b.full_name === profile.full_name)
  )

  // 3. Assemble currentBoarder with reliable seat & room info
  let currentBoarder: BoarderOption | null = null

  if (seatData && seatData.has_active_seat && seatData.boarder_id) {
    currentBoarder = {
      id: seatData.boarder_id,
      user_id: profile?.id,
      full_name: seatData.boarder_name || profile?.full_name || 'বর্ডার',
      boarder_code: seatData.boarder_code || 'BDR',
      phone_number: profile?.phone_number || matchedFromList?.phone_number || '',
      seat_name: seatData.seat_name || seatData.seat_code || 'সিট বরাদ্দ',
      seat_code: seatData.seat_code || '',
      room_name: seatData.room_name || '',
      flat_id: matchedFromList?.flat_id || '',
      flat_name: seatData.flat_name || '',
      building_name: seatData.building_name || '',
      admission_date: matchedFromList?.admission_date || '',
      monthly_rent: Number(seatData.monthly_rent || matchedFromList?.monthly_rent || 0),
      status: (seatData.boarder_status as any) || 'ACTIVE',
    }
  } else if (matchedFromList) {
    currentBoarder = matchedFromList
  } else if (!isStaffRole && !isSupabaseConfigured && boardersList.length > 0) {
    currentBoarder = boardersList[0]
  }

  // True only if still verifying and supabase is enabled
  const isLoading = Boolean(isSupabaseConfigured && (isLoadingBoarders || (isLoadingSeat && !seatData)))

  return {
    currentBoarder,
    activeBoarderId: currentBoarder?.id,
    hasActiveSeat: Boolean(seatData ? seatData.has_active_seat : currentBoarder),
    isLoading,
    refetch: refetchSeat,
  }
}

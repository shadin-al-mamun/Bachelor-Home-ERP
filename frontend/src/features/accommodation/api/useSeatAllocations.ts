import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface AllocateSeatParams {
  boarderId: string
  seatId: string
  monthlyRent: number
  securityDeposit?: number
  startDate: string
  remarks?: string
}

export interface TransferSeatParams {
  allocationId: string
  newSeatId: string
  effectiveDate: string
  reason: string
}

export interface CancelAllocationParams {
  allocationId: string
  endDate: string
  reason: string
  status?: 'ENDED' | 'CANCELLED'
}

export function useAllocateSeatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: AllocateSeatParams) => {
      if (!isSupabaseConfigured) {
        // Mock success for development
        return { success: true, allocationId: `alloc-${Date.now()}` }
      }

      const { data, error } = await supabase.rpc('fn_allocate_seat', {
        p_boarder_id: params.boarderId,
        p_seat_id: params.seatId,
        p_monthly_rent: params.monthlyRent,
        p_security_deposit: params.securityDeposit || 0,
        p_start_date: params.startDate,
        p_remarks: params.remarks || null,
      })

      if (error) {
        if (error.message.includes('duplicate key') || error.code === '23505') {
          throw new Error('এই সিটটি ইতিমধ্যেই অন্য একজন ব্যবস্থাপক কর্তৃক বরাদ্দ করা হয়েছে। অন্য সিট নির্বাচন করুন।')
        }
        throw new Error(error.message || 'সিট বরাদ্দ সম্পন্ন করতে সমস্যা হয়েছে।')
      }

      return { success: true, allocationId: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
    },
  })
}

export function useTransferSeatMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: TransferSeatParams) => {
      if (!isSupabaseConfigured) {
        return { success: true, newAllocationId: `alloc-trans-${Date.now()}` }
      }

      const { data, error } = await supabase.rpc('fn_transfer_seat', {
        p_allocation_id: params.allocationId,
        p_new_seat_id: params.newSeatId,
        p_effective_date: params.effectiveDate,
        p_reason: params.reason,
      })

      if (error) {
        if (error.message.includes('duplicate key') || error.code === '23505') {
          throw new Error('টার্গেট সিটটি ইতিমধ্যেই অন্য কারো দ্বারা বরাদ্দ হয়েছে।')
        }
        throw new Error(error.message || 'সিট স্থানান্তর সম্পন্ন করতে সমস্যা হয়েছে।')
      }

      return { success: true, newAllocationId: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
    },
  })
}

export function useCancelAllocationMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CancelAllocationParams) => {
      if (!isSupabaseConfigured) {
        return { success: true }
      }

      const { data, error } = await supabase.rpc('fn_cancel_allocation', {
        p_allocation_id: params.allocationId,
        p_end_date: params.endDate,
        p_reason: params.reason,
        p_status: params.status || 'ENDED',
      })

      if (error) {
        throw new Error(error.message || 'বরাদ্দ সমাপ্ত বা বাতিল করতে সমস্যা হয়েছে।')
      }

      return { success: true, result: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
    },
  })
}

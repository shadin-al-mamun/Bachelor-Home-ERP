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

      let effectiveBoarderId = params.boarderId

      // 1. Prepare boarder: if boarder is currently PENDING or only in public.profiles, activate them
      try {
        const { data: existingBoarder } = await supabase
          .from('boarders')
          .select('id, status, user_id')
          .eq('id', effectiveBoarderId)
          .maybeSingle()

        if (!existingBoarder) {
          // Check if boarderId matches a profile ID (applicant registered via Auth/profiles)
          const { data: profileRow } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', effectiveBoarderId)
            .maybeSingle()

          if (profileRow) {
            const randomCode = 'BDR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)
            const { data: createdBdr, error: insErr } = await supabase
              .from('boarders')
              .insert({
                user_id: profileRow.id,
                boarder_code: randomCode,
                full_name: profileRow.full_name || 'নতুন বোর্ডার',
                phone_number: profileRow.phone_number || '',
                email: profileRow.email || null,
                status: 'ACTIVE',
                admission_date: params.startDate || new Date().toISOString().slice(0, 10),
              })
              .select('id')
              .single()

            if (!insErr && createdBdr) {
              effectiveBoarderId = createdBdr.id
              await supabase
                .from('profiles')
                .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
                .eq('id', profileRow.id)
            }
          }
        } else if (existingBoarder.status === 'PENDING') {
          // Transition pending boarder to ACTIVE upon seat allocation
          await supabase
            .from('boarders')
            .update({
              status: 'ACTIVE',
              admission_date: params.startDate || new Date().toISOString().slice(0, 10),
              updated_at: new Date().toISOString(),
            })
            .eq('id', effectiveBoarderId)

          if (existingBoarder.user_id) {
            await supabase
              .from('profiles')
              .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
              .eq('id', existingBoarder.user_id)
          }
        }
      } catch (prepErr) {
        console.warn('Boarder preparation before allocation warning:', prepErr)
      }

      // 2. Execute seat allocation via RPC
      const { data, error } = await supabase.rpc('fn_allocate_seat', {
        p_boarder_id: effectiveBoarderId,
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

        console.warn('fn_allocate_seat RPC failed, executing direct allocation fallback:', error.message)
        // Direct allocation fallback if RPC has constraint or schema differences
        const { data: directAlloc, error: directErr } = await supabase
          .from('allocations')
          .insert({
            boarder_id: effectiveBoarderId,
            seat_id: params.seatId,
            monthly_rent: params.monthlyRent,
            security_deposit: params.securityDeposit || 0,
            start_date: params.startDate,
            status: 'ACTIVE',
            remarks: params.remarks || null,
          })
          .select('id')
          .single()

        if (directErr) {
          throw new Error(error.message || directErr.message || 'সিট বরাদ্দ সম্পন্ন করতে সমস্যা হয়েছে।')
        }

        // Update seat status to OCCUPIED
        await supabase
          .from('seats')
          .update({ status: 'OCCUPIED', updated_at: new Date().toISOString() })
          .eq('id', params.seatId)

        return { success: true, allocationId: directAlloc.id }
      }

      return { success: true, allocationId: data }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
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

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
  allocationId?: string
  currentSeatId?: string
  newSeatId: string
  effectiveDate: string
  reason: string
  boarderId?: string
  currentRent?: number
}

export interface CancelAllocationParams {
  allocationId?: string
  seatId?: string
  endDate: string
  reason: string
  status?: 'ENDED' | 'CANCELLED'
}

const isValidUuid = (val?: string | null): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))

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
          .select('id, status, user_id, email, phone_number')
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

              // Ensure auth account is confirmed
              try {
                await supabase.rpc('confirm_user_account', {
                  p_email: profileRow.email || null,
                  p_phone: profileRow.phone_number || null,
                })
              } catch {
                // ignore
              }
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

            // Auto-confirm auth user account
            try {
              await supabase.rpc('confirm_user_account', {
                p_email: existingBoarder.email || null,
                p_phone: existingBoarder.phone_number || null,
              })
            } catch {
              // ignore
            }
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
      queryClient.invalidateQueries({ queryKey: ['seats'] })
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

      let allocId = params.allocationId

      // 1. If allocationId is missing, contains 'alloc-', or is not a valid UUID, find from DB
      if (!isValidUuid(allocId) && params.currentSeatId) {
        const { data: foundAlloc } = await supabase
          .from('allocations')
          .select('id, boarder_id, monthly_rent, security_deposit')
          .eq('seat_id', params.currentSeatId)
          .eq('status', 'ACTIVE')
          .maybeSingle()

        if (foundAlloc?.id) {
          allocId = foundAlloc.id
        }
      }

      // 2. If valid UUID, execute atomic RPC
      if (isValidUuid(allocId)) {
        const { data, error } = await supabase.rpc('fn_transfer_seat', {
          p_allocation_id: allocId,
          p_new_seat_id: params.newSeatId,
          p_effective_date: params.effectiveDate,
          p_reason: params.reason,
        })

        if (!error) {
          return { success: true, newAllocationId: data }
        }

        if (error.message.includes('duplicate key') || error.code === '23505') {
          throw new Error('টার্গেট সিটটি ইতিমধ্যেই অন্য কারো দ্বারা বরাদ্দ হয়েছে।')
        }

        console.warn('fn_transfer_seat RPC failed, executing direct fallback:', error.message)
      }

      // 3. Fallback: Direct table operations if RPC failed or no prior allocation record
      if (params.currentSeatId && params.newSeatId) {
        let boarderId = params.boarderId && isValidUuid(params.boarderId) ? params.boarderId : null
        let rent = params.currentRent || 0
        let deposit = 0

        if (isValidUuid(allocId)) {
          const { data: oldAlloc } = await supabase
            .from('allocations')
            .select('boarder_id, monthly_rent, security_deposit')
            .eq('id', allocId)
            .maybeSingle()

          if (oldAlloc) {
            boarderId = boarderId || oldAlloc.boarder_id
            rent = oldAlloc.monthly_rent || rent
            deposit = oldAlloc.security_deposit || 0

            await supabase
              .from('allocations')
              .update({
                status: 'TRANSFERRED',
                end_date: params.effectiveDate,
                updated_at: new Date().toISOString(),
              })
              .eq('id', allocId)
          }
        } else {
          const { data: closedAlloc } = await supabase
            .from('allocations')
            .update({
              status: 'TRANSFERRED',
              end_date: params.effectiveDate,
              updated_at: new Date().toISOString(),
            })
            .eq('seat_id', params.currentSeatId)
            .eq('status', 'ACTIVE')
            .select('id, boarder_id, monthly_rent, security_deposit')
            .maybeSingle()

          if (closedAlloc) {
            boarderId = boarderId || closedAlloc.boarder_id
            rent = closedAlloc.monthly_rent || rent
            deposit = closedAlloc.security_deposit || 0
            allocId = closedAlloc.id
          }
        }

        let newAllocId = `trans-${Date.now()}`

        if (boarderId && isValidUuid(boarderId)) {
          const { data: newAlloc, error: insErr } = await supabase
            .from('allocations')
            .insert({
              boarder_id: boarderId,
              seat_id: params.newSeatId,
              monthly_rent: rent,
              security_deposit: deposit,
              start_date: params.effectiveDate,
              status: 'ACTIVE',
              remarks: params.reason,
            })
            .select('id')
            .single()

          if (!insErr && newAlloc) {
            newAllocId = newAlloc.id

            try {
              await supabase.from('allocation_history').insert({
                allocation_id: newAlloc.id,
                previous_seat_id: params.currentSeatId,
                new_seat_id: params.newSeatId,
                change_type: 'TRANSFER',
                effective_date: params.effectiveDate,
                reason: params.reason,
              })
            } catch (histErr) {
              console.warn('Failed to record allocation history:', histErr)
            }
          }
        }

        // Ensure both seats have correct status
        await supabase
          .from('seats')
          .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
          .eq('id', params.currentSeatId)

        await supabase
          .from('seats')
          .update({ status: 'OCCUPIED', updated_at: new Date().toISOString() })
          .eq('id', params.newSeatId)

        return { success: true, newAllocationId: newAllocId }
      }

      throw new Error('সিট স্থানান্তর সম্পন্ন করতে সমস্যা হয়েছে।')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] })
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
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

      let allocId = params.allocationId

      // 1. If allocationId is missing, contains 'alloc-', or is not a valid UUID, find active allocation from DB
      if (!isValidUuid(allocId) && params.seatId) {
        const { data: foundAlloc } = await supabase
          .from('allocations')
          .select('id, boarder_id')
          .eq('seat_id', params.seatId)
          .eq('status', 'ACTIVE')
          .maybeSingle()

        if (foundAlloc?.id) {
          allocId = foundAlloc.id
        }
      }

      // 2. Try RPC fn_cancel_allocation first
      if (isValidUuid(allocId)) {
        const { data, error } = await supabase.rpc('fn_cancel_allocation', {
          p_allocation_id: allocId,
          p_end_date: params.endDate,
          p_reason: params.reason,
          p_status: params.status || 'ENDED',
        })

        if (!error) {
          return { success: true, result: data }
        }

        console.warn('fn_cancel_allocation RPC failed, attempting direct table fallback:', error.message)
      }

      // 3. Fallback: Direct table update if RPC failed or no allocation ID was found
      if (params.seatId) {
        if (isValidUuid(allocId)) {
          await supabase
            .from('allocations')
            .update({
              status: params.status || 'ENDED',
              end_date: params.endDate,
              cancellation_reason: params.reason,
              updated_at: new Date().toISOString(),
            })
            .eq('id', allocId)
        } else {
          // End any active allocations for this seat
          await supabase
            .from('allocations')
            .update({
              status: params.status || 'ENDED',
              end_date: params.endDate,
              cancellation_reason: params.reason,
              updated_at: new Date().toISOString(),
            })
            .eq('seat_id', params.seatId)
            .eq('status', 'ACTIVE')
        }

        // Set seat status to AVAILABLE
        const { error: seatUpdateErr } = await supabase
          .from('seats')
          .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
          .eq('id', params.seatId)

        if (seatUpdateErr) {
          throw new Error(seatUpdateErr.message || 'সিটের স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।')
        }

        return { success: true, fallback: true }
      }

      throw new Error('সঠিক বরাদ্দ আইডি বা সিট পাওয়া যায়নি।')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] })
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['owner-executive-dashboard'] })
    },
  })
}

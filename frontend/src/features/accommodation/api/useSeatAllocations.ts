import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface AllocateSeatParams {
  boarderId: string
  seatId: string
  monthlyRent: number
  securityDeposit?: number
  startDate: string
  remarks?: string
  isOpeningDepositPaid?: boolean
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
              // Only update profile role to BOARDER if not already staff/admin
              if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'COOK', 'CLEANER'].includes(profileRow.role)) {
                await supabase
                  .from('profiles')
                  .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
                  .eq('id', profileRow.id)
              }

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
            const { data: userProf } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', existingBoarder.user_id)
              .maybeSingle()

            if (!userProf || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'COOK', 'CLEANER'].includes(userProf.role)) {
              await supabase
                .from('profiles')
                .update({ role: 'BOARDER', updated_at: new Date().toISOString() })
                .eq('id', existingBoarder.user_id)
            }

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
      let newAllocationId: string = ''
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

        newAllocationId = directAlloc.id
      } else {
        newAllocationId = data
      }

      // 3. If this is an existing boarder whose security deposit was already paid offline,
      // record an Opening Deposit receipt so it is safely recognized in the hostel deposit fund,
      // without inflating the manager's daily cash till or physical drawer.
      if (params.isOpeningDepositPaid && params.securityDeposit && params.securityDeposit > 0) {
        try {
          const { data: accounts } = await supabase
            .from('financial_accounts')
            .select('id, account_name, account_type')
            .eq('is_active', true)

          const reserveAccount =
            accounts?.find((a: any) => a.account_name?.includes('প্রারম্ভিক জামানত') || a.account_type === 'CASH_OWNER') ||
            accounts?.[0]

          const destinationAccountId = reserveAccount?.id

          if (destinationAccountId) {
            const depositAmount = Number(params.securityDeposit)
            const collectionDate = params.startDate ? new Date(params.startDate).toISOString() : new Date().toISOString()
            const refTag = '[SECURITY_DEPOSIT] [OPENING_DEPOSIT]'
            const remarksText = '[SECURITY_DEPOSIT] [OPENING_DEPOSIT] অফলাইন প্রারম্ভিক জামানত মাইগ্রেশন (Opening Migration Deposit)'

            try {
              await supabase.rpc('fn_record_unified_collection', {
                p_boarder_id: effectiveBoarderId,
                p_destination_account_id: destinationAccountId,
                p_payment_method: 'CASH',
                p_items: [
                  {
                    head_code: 'SECURITY_DEPOSIT',
                    head_name: 'জামানত সংগ্রহ (Security Deposit)',
                    amount: depositAmount,
                    billing_month: `${params.startDate.slice(0, 7)}-01`,
                    description: 'অফলাইন প্রারম্ভিক জামানত মাইগ্রেশন',
                  },
                ],
                p_collection_date: collectionDate,
                p_reference: refTag,
                p_remarks: remarksText,
              })
            } catch (rpcErr) {
              console.warn('fn_record_unified_collection for opening deposit failed, executing direct fallback:', rpcErr)
              const authUser = (await supabase.auth.getUser()).data.user
              const receiptNo = `RCT-${new Date().getFullYear().toString().slice(-2)}${String(Date.now()).slice(-6)}`

              const { data: recData } = await supabase
                .from('receipts')
                .insert({
                  receipt_number: receiptNo,
                  boarder_id: effectiveBoarderId,
                  received_by: authUser?.id || (await supabase.from('profiles').select('id').limit(1)).data?.[0]?.id,
                  destination_account_id: destinationAccountId,
                  amount: depositAmount,
                  payment_method: 'CASH',
                  transaction_reference: refTag,
                  receipt_date: collectionDate,
                  remarks: remarksText,
                  is_void: false,
                })
                .select('id')
                .maybeSingle()

              if (recData?.id) {
                try {
                  await supabase.from('receipt_items').insert({
                    receipt_id: recData.id,
                    head_code: 'SECURITY_DEPOSIT',
                    head_name: 'জামানত সংগ্রহ (Security Deposit)',
                    amount: depositAmount,
                    billing_month: `${params.startDate.slice(0, 7)}-01`,
                    description: 'অফলাইন প্রারম্ভিক জামানত মাইগ্রেশন',
                  })
                } catch {
                  // ignore
                }
              }
            }
          }
        } catch (depositErr) {
          console.warn('Failed to record opening security deposit receipt:', depositErr)
        }
      }

      return { success: true, allocationId: newAllocationId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] })
      queryClient.invalidateQueries({ queryKey: ['accommodation'] })
      queryClient.invalidateQueries({ queryKey: ['boarders'] })
      queryClient.invalidateQueries({ queryKey: ['boarder'] })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
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
        let rent = params.currentRent !== undefined && params.currentRent !== null ? Number(params.currentRent) : 0
        let deposit = 0

        if (isValidUuid(allocId)) {
          const { data: oldAlloc } = await supabase
            .from('allocations')
            .select('boarder_id, monthly_rent, security_deposit')
            .eq('id', allocId)
            .maybeSingle()

          if (oldAlloc) {
            boarderId = boarderId || oldAlloc.boarder_id
            rent = oldAlloc.monthly_rent !== undefined && oldAlloc.monthly_rent !== null ? Number(oldAlloc.monthly_rent) : rent
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
            rent = closedAlloc.monthly_rent !== undefined && closedAlloc.monthly_rent !== null ? Number(closedAlloc.monthly_rent) : rent
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
        let boarderIdToUpdate: string | null = null
        const today = new Date().toISOString().slice(0, 10)
        const isFuture = Boolean(params.endDate && params.endDate > today)

        if (isValidUuid(allocId)) {
          const { data: aRow } = await supabase
            .from('allocations')
            .update({
              status: isFuture ? 'ACTIVE' : (params.status || 'ENDED'),
              end_date: params.endDate,
              cancellation_reason: params.reason,
              updated_at: new Date().toISOString(),
            })
            .eq('id', allocId)
            .select('boarder_id')
            .maybeSingle()
          boarderIdToUpdate = aRow?.boarder_id || null
        } else {
          // End any active allocations for this seat
          const { data: aRows } = await supabase
            .from('allocations')
            .update({
              status: isFuture ? 'ACTIVE' : (params.status || 'ENDED'),
              end_date: params.endDate,
              cancellation_reason: params.reason,
              updated_at: new Date().toISOString(),
            })
            .eq('seat_id', params.seatId)
            .eq('status', 'ACTIVE')
            .select('boarder_id')
          boarderIdToUpdate = aRows?.[0]?.boarder_id || null
        }

        // Update boarder: if future, keep status 'ACTIVE' with leaving_date
        if (boarderIdToUpdate) {
          try {
            await supabase
              .from('boarders')
              .update({
                status: isFuture ? 'ACTIVE' : 'LEFT',
                leaving_date: params.endDate,
                remarks: params.reason,
                updated_at: new Date().toISOString(),
              })
              .eq('id', boarderIdToUpdate)
          } catch (bUpdateErr) {
            console.warn('Fallback boarder status update warning:', bUpdateErr)
          }
        }

        // Set seat status: OCCUPIED if future departure notice, AVAILABLE if today or past
        if (isFuture) {
          await supabase
            .from('seats')
            .update({ status: 'OCCUPIED', updated_at: new Date().toISOString() })
            .eq('id', params.seatId)
        } else {
          const { error: seatUpdateErr } = await supabase
            .from('seats')
            .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
            .eq('id', params.seatId)

          if (seatUpdateErr) {
            throw new Error(seatUpdateErr.message || 'সিটের স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।')
          }
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
      queryClient.invalidateQueries({ queryKey: ['meal-boarders-list'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-seat-status'] })
    },
  })
}

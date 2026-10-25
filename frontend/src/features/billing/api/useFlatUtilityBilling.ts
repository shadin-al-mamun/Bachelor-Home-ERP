import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface FlatVoucherItem {
  id: string
  voucher_no: string
  expense_date: string
  category_name: string
  description: string
  amount: number
}

export interface FlatResidentItem {
  boarder_id: string
  boarder_code: string
  full_name: string
  phone_number?: string
  seat_code?: string
}

export interface FlatUtilityPreviewItem {
  flat_id: string
  flat_code: string
  flat_name: string
  floor_number?: number
  building_name?: string
  total_seats: number
  active_boarders_count: number
  boarders: FlatResidentItem[]
  total_voucher_amount: number
  vouchers: FlatVoucherItem[]
  existing_distribution?: {
    id: string
    is_billed: boolean
    per_seat_amount: number
    cook_bill: number
    other_bill: number
  } | null
}

export interface FlatConfigPayload {
  flat_id: string
  total_seats: number
  total_voucher_amount: number
  utility_per_head: number
  cook_bill: number
  other_bill: number
  other_bill_per_head?: number
  grand_total_per_head: number
}

export interface GenerateBatchFlatBillsParams {
  billingMonth: string // '2026-10' or '2026-10-01'
  dueDate: string
  flatConfigs: FlatConfigPayload[]
}

// Default sample mock data mirroring user's exact screenshot for offline/demo resilience
const MOCK_PREVIEW_DATA: FlatUtilityPreviewItem[] = [
  {
    flat_id: 'flat-206',
    flat_code: 'Flat-206',
    flat_name: 'ফ্ল্যাট-২০৬',
    floor_number: 2,
    building_name: 'প্রধান ভবন',
    total_seats: 9,
    active_boarders_count: 9,
    boarders: [
      { boarder_id: 'b-1', boarder_code: 'B-001', full_name: 'তানভীর আহমেদ', seat_code: 'S-206-A' },
      { boarder_id: 'b-2', boarder_code: 'B-002', full_name: 'রাকিবুল হাসান', seat_code: 'S-206-B' },
      { boarder_id: 'b-3', boarder_code: 'B-003', full_name: 'মাহমুদুল হাসান', seat_code: 'S-206-C' },
    ],
    total_voucher_amount: 2205,
    vouchers: [
      { id: 'v-1', voucher_no: 'EXP-005014', expense_date: '10/10/2026', category_name: 'বিদ্যুৎ বিল', description: 'অক্টোবর ডেসকো প্রিপেইড বিল', amount: 1200 },
      { id: 'v-2', voucher_no: 'EXP-005015', expense_date: '12/10/2026', category_name: 'গ্যাস বিল', description: 'এলপিজি সিলিন্ডার রিফিল', amount: 800 },
      { id: 'v-3', voucher_no: 'EXP-005005', expense_date: '15/10/2026', category_name: 'ময়লা বিল', description: 'সিটি কর্পোরেশন বর্জ্য বিল', amount: 205 },
    ],
    existing_distribution: null,
  },
  {
    flat_id: 'flat-207',
    flat_code: 'Flat-207',
    flat_name: 'ফ্ল্যাট-২০৭',
    floor_number: 2,
    building_name: 'প্রধান ভবন',
    total_seats: 6,
    active_boarders_count: 6,
    boarders: [
      { boarder_id: 'b-4', boarder_code: 'B-004', full_name: 'নাজমুল আলম', seat_code: 'S-207-A' },
      { boarder_id: 'b-5', boarder_code: 'B-005', full_name: 'সাইফুল ইসলাম', seat_code: 'S-207-B' },
    ],
    total_voucher_amount: 2400,
    vouchers: [
      { id: 'v-4', voucher_no: 'EXP-005014', expense_date: '10/10/2026', category_name: 'বিদ্যুৎ বিল', description: 'অক্টোবর ডেসকো প্রিপেইড বিল', amount: 1400 },
      { id: 'v-5', voucher_no: 'EXP-005015', expense_date: '12/10/2026', category_name: 'গ্যাস বিল', description: 'এলপিজি গ্যাস বিল', amount: 800 },
      { id: 'v-6', voucher_no: 'EXP-005005', expense_date: '15/10/2026', category_name: 'ময়লা বিল', description: 'সোসাইটি ময়লা অপসারণ ফি', amount: 200 },
    ],
    existing_distribution: null,
  },
]

export function useFlatUtilityBillingPreview(billingMonth: string) {
  const normMonth = billingMonth.length === 7 ? `${billingMonth}-01` : billingMonth

  return useQuery({
    queryKey: ['flat-utility-preview', normMonth],
    queryFn: async (): Promise<FlatUtilityPreviewItem[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_PREVIEW_DATA
      }

      // 1. Try authoritative RPC first
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'fn_get_flat_utility_billing_preview',
          { p_billing_month: normMonth }
        )
        if (!rpcErr && Array.isArray(rpcData)) {
          return rpcData as FlatUtilityPreviewItem[]
        }
      } catch (e) {
        console.warn('RPC fn_get_flat_utility_billing_preview failed, falling back to direct queries:', e)
      }

      // 2. Direct client-side query fallback
      const startDate = `${normMonth.slice(0, 7)}-01`
      const dateObj = new Date(startDate)
      const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate()
      const endDate = `${normMonth.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`

      const [flatsRes, roomsRes, allocationsRes, expensesRes, distributionsRes] = await Promise.all([
        supabase.from('flats').select('id, flat_code, name, floor_number, building:buildings(name)').eq('status', 'ACTIVE'),
        supabase.from('rooms').select('id, flat_id, seats(id, seat_code, status)'),
        supabase
          .from('allocations')
          .select('id, seat_id, boarder:boarders(id, boarder_code, full_name, phone_number, status)')
          .eq('status', 'ACTIVE'),
        supabase
          .from('expenses')
          .select('id, flat_id, expense_voucher_no, expense_date, amount, description, category:expense_categories(name)')
          .neq('approval_status', 'REJECTED')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate),
        supabase
          .from('flat_monthly_distributions')
          .select('id, flat_id, is_billed, per_seat_amount, breakdown')
          .eq('billing_month', startDate),
      ])

      const flats = flatsRes.data || []
      const rooms = roomsRes.data || []
      const allocations = allocationsRes.data || []
      const expenses = expensesRes.data || []
      const distributions = distributionsRes.data || []

      // Build seat and allocation maps
      const seatToFlatMap = new Map<string, { flatId: string; seatCode: string }>()
      const flatSeatsCountMap = new Map<string, number>()

      rooms.forEach((r: any) => {
        const fId = r.flat_id
        const roomSeats = (r.seats || []).filter((s: any) => s.status !== 'INACTIVE')
        flatSeatsCountMap.set(fId, (flatSeatsCountMap.get(fId) || 0) + roomSeats.length)
        roomSeats.forEach((s: any) => {
          seatToFlatMap.set(s.id, { flatId: fId, seatCode: s.seat_code })
        })
      })

      // Group active boarders by flat
      const flatBoardersMap = new Map<string, FlatResidentItem[]>()
      allocations.forEach((a: any) => {
        const seatInfo = seatToFlatMap.get(a.seat_id)
        if (seatInfo && a.boarder && a.boarder.status === 'ACTIVE') {
          const list = flatBoardersMap.get(seatInfo.flatId) || []
          list.push({
            boarder_id: a.boarder.id,
            boarder_code: a.boarder.boarder_code,
            full_name: a.boarder.full_name,
            phone_number: a.boarder.phone_number,
            seat_code: seatInfo.seatCode,
          })
          flatBoardersMap.set(seatInfo.flatId, list)
        }
      })

      // Group expenses by flat
      const flatExpensesMap = new Map<string, FlatVoucherItem[]>()
      expenses.forEach((e: any) => {
        if (e.flat_id) {
          const list = flatExpensesMap.get(e.flat_id) || []
          list.push({
            id: e.id,
            voucher_no: e.expense_voucher_no,
            expense_date: e.expense_date,
            category_name: e.category?.name || 'বিবিধ খরচ',
            description: e.description,
            amount: Number(e.amount) || 0,
          })
          flatExpensesMap.set(e.flat_id, list)
        }
      })

      // Distributions map
      const distMap = new Map<string, any>()
      distributions.forEach((d: any) => {
        distMap.set(d.flat_id, {
          id: d.id,
          is_billed: d.is_billed,
          per_seat_amount: Number(d.per_seat_amount) || 0,
          cook_bill: Number(d.breakdown?.cook_bill) || 0,
          other_bill: Number(d.breakdown?.other_bill) || 0,
        })
      })

      return flats.map((f: any) => {
        const vouchers = flatExpensesMap.get(f.id) || []
        const totalVoucherAmount = vouchers.reduce((sum, v) => sum + v.amount, 0)
        const boarders = flatBoardersMap.get(f.id) || []
        const totalSeats = flatSeatsCountMap.get(f.id) || 0

        return {
          flat_id: f.id,
          flat_code: f.flat_code,
          flat_name: f.name,
          floor_number: f.floor_number,
          building_name: f.building?.name || 'প্রধান ভবন',
          total_seats: totalSeats,
          active_boarders_count: boarders.length,
          boarders,
          total_voucher_amount: totalVoucherAmount,
          vouchers,
          existing_distribution: distMap.get(f.id) || null,
        }
      })
    },
  })
}

export function useGenerateBatchFlatUtilityBills() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: GenerateBatchFlatBillsParams) => {
      const normMonth = params.billingMonth.length === 7 ? `${params.billingMonth}-01` : params.billingMonth

      if (!isSupabaseConfigured) {
        return {
          success: true,
          billing_month: normMonth,
          due_date: params.dueDate,
          total_flats: params.flatConfigs.length,
          total_boarders: 15,
          generated_count: 15,
          updated_count: 0,
          skipped_count: 0,
          total_amount_billed: 12500,
          message: 'ডেমো মোডে সকল ফ্ল্যাটের বর্ডারদের জন্য বিবিধ বিল সফলভাবে জেনারেট হয়েছে।',
        }
      }

      // 1. Try authoritative RPC
      try {
        const { data, error } = await supabase.rpc('fn_generate_batch_flat_utility_bills', {
          p_billing_month: normMonth,
          p_due_date: params.dueDate,
          p_flat_configs: params.flatConfigs,
        })

        if (!error && data) {
          return data
        }
        if (error) {
          console.warn('RPC fn_generate_batch_flat_utility_bills failed, attempting client-side batch:', error)
        }
      } catch (err) {
        console.warn('RPC execution exception, attempting client-side batch:', err)
      }

      // 2. Direct client-side batch generation fallback
      let generated = 0
      let updated = 0
      let totalAmount = 0

      for (const config of params.flatConfigs) {
        if (config.grand_total_per_head <= 0) continue

        // Fetch allocations in this flat
        const { data: rooms } = await supabase.from('rooms').select('id, flat_id, seats(id)').eq('flat_id', config.flat_id)
        const seatIds = (rooms || []).flatMap((r: any) => (r.seats || []).map((s: any) => s.id))

        if (seatIds.length === 0) continue

        const { data: allocations } = await supabase
          .from('allocations')
          .select('id, boarder_id, seat_id')
          .in('seat_id', seatIds)
          .eq('status', 'ACTIVE')

        if (!allocations || allocations.length === 0) continue

        const effectiveUtility = Math.round(config.utility_per_head)
        const seatCount = config.total_seats > 0 ? config.total_seats : 1
        const otherBillPerHead =
          config.other_bill_per_head !== undefined
            ? config.other_bill_per_head
            : Math.round(Number(config.other_bill || 0) / seatCount)
        const effectiveGrandTotal =
          config.grand_total_per_head > 0
            ? config.grand_total_per_head
            : effectiveUtility + Number(config.cook_bill || 0) + otherBillPerHead

        const desc = `${normMonth.slice(0, 7)} — ফ্ল্যাট বিবিধ বিল (ইউটিলিটি: ৳${effectiveUtility}, বাবুর্চি: ৳${config.cook_bill}${
          otherBillPerHead > 0 ? `, অন্যান্য: ৳${otherBillPerHead}` : ''
        })`

        for (const alloc of allocations) {
          const { data: existing } = await supabase
            .from('boarder_charges')
            .select('id, status')
            .eq('boarder_id', alloc.boarder_id)
            .eq('charge_type', 'UTILITY')
            .eq('billing_month', normMonth)
            .neq('status', 'VOID')
            .maybeSingle()

          if (existing) {
            if (existing.status === 'UNPAID') {
              await supabase
                .from('boarder_charges')
                .update({
                  amount: effectiveGrandTotal,
                  due_date: params.dueDate,
                  description: desc,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

              updated++
              totalAmount += effectiveGrandTotal
            }
          } else {
            await supabase.from('boarder_charges').insert({
              boarder_id: alloc.boarder_id,
              allocation_id: alloc.id,
              charge_type: 'UTILITY',
              billing_month: normMonth,
              amount: effectiveGrandTotal,
              paid_amount: 0,
              status: 'UNPAID',
              due_date: params.dueDate,
              description: desc,
            })

            generated++
            totalAmount += effectiveGrandTotal
          }
        }
      }

      return {
        success: true,
        billing_month: normMonth,
        due_date: params.dueDate,
        total_flats: params.flatConfigs.length,
        total_boarders: generated + updated,
        generated_count: generated,
        updated_count: updated,
        skipped_count: 0,
        total_amount_billed: totalAmount,
        message: `সফলভাবে সম্পন্ন! ${generated} জন বর্ডারের জন্য নতুন বিবিধ বিল তৈরি হয়েছে, ${updated} জন আপডেট হয়েছে।`,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boarder-dues'] })
      queryClient.invalidateQueries({ queryKey: ['boarder-charges'] })
      queryClient.invalidateQueries({ queryKey: ['flat-utility-preview'] })
      queryClient.invalidateQueries({ queryKey: ['executive-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['flat-monthly-distribution'] })
    },
  })
}

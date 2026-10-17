import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type {
  ManagerCashSession,
  Profile,
  CashHandover,
  OwnerDeposit,
} from '@/types/database'
import { uploadVoucherFile } from '@/features/expenses/api/useExpenses'

// ==============================================================================
// Types & Interfaces
// ==============================================================================

export interface ExtendedCashSession extends ManagerCashSession {
  manager_name: string
  account_name: string
}

export interface ExtendedCashHandover extends CashHandover {
  sender_name: string
  receiver_name: string
}

export interface ExtendedOwnerDeposit extends OwnerDeposit {
  manager_name: string
  to_account_name: string
  confirmer_name?: string
}

export interface CashMovementItem {
  id: string
  type: 'RECEIPT' | 'EXPENSE' | 'HANDOVER_IN' | 'HANDOVER_OUT' | 'OWNER_DEPOSIT'
  title: string
  amount: number
  time: string
  reference: string
  particulars?: string
  party?: string
}

export interface CashSessionDetailsResponse {
  session: ExtendedCashSession
  movements: CashMovementItem[]
}

export interface SubmitCashCloseInput {
  sessionId: string
  actualCountedCash: number
  varianceExplanation?: string | null
}

export interface InitiateHandoverInput {
  receiverManagerId: string
  amount: number
  reason: string
}

export interface RecordOwnerDepositInput {
  amount: number
  toAccountId: string
  paymentMethod?: string
  transactionReference?: string | null
  proofFile?: File | null
}

// ==============================================================================
// Mock Data Baseline (Realistic Manager Daily Custody)
// ==============================================================================

export const MOCK_MANAGERS: Partial<Profile>[] = [
  {
    id: 'usr-mgr1',
    full_name: 'হোস্টেল ম্যানেজার (Manager)',
    email: 'manager@bachelorhome.com',
    phone_number: '01711002233',
    role: 'MANAGER',
  },
  {
    id: 'usr-mgr2',
    full_name: 'সহকারী ম্যানেজার (Assistant)',
    email: 'asst.manager@bachelorhome.com',
    phone_number: '01822334455',
    role: 'MANAGER',
  },
]

let MOCK_SESSIONS: ExtendedCashSession[] = [
  {
    id: 'cs-today',
    manager_id: 'usr-mgr1',
    manager_name: 'হোস্টেল ম্যানেজার',
    account_id: 'fa-1',
    account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    session_date: new Date().toISOString().slice(0, 10),
    opening_cash: 12500, // Seeded from prior finalized day
    cash_receipts: 14500, // Collected today
    cash_expenses: 3250,  // Authorized disbursements
    cash_deposited_to_owner: 5000, // Cash deposited to owner
    cash_handed_over_out: 0,
    cash_handed_over_in: 0,
    expected_closing_cash: 18750, // 12500 + 14500 - 3250 - 5000 = 18750
    actual_counted_cash: null,
    cash_variance: null,
    variance_explanation: null,
    status: 'OPEN',
    submitted_at: null,
    reviewed_by: null,
    reviewed_at: null,
    reopen_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cs-yesterday',
    manager_id: 'usr-mgr1',
    manager_name: 'হোস্টেল ম্যানেজার',
    account_id: 'fa-1',
    account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
    session_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    opening_cash: 9800,
    cash_receipts: 18500,
    cash_expenses: 5800,
    cash_deposited_to_owner: 10000,
    cash_handed_over_out: 0,
    cash_handed_over_in: 0,
    expected_closing_cash: 12500,
    actual_counted_cash: 12500,
    cash_variance: 0,
    variance_explanation: 'হিসাব সম্পূর্ণ নির্ভুল ও মিলেছে।',
    status: 'APPROVED',
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    reviewed_by: 'usr-admin1',
    reviewed_at: new Date().toISOString(),
    reopen_reason: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let MOCK_HANDOVERS: ExtendedCashHandover[] = [
  {
    id: 'hnd-3001',
    handover_number: 'HND-003001',
    sender_manager_id: 'usr-mgr2',
    sender_name: 'সহকারী ম্যানেজার',
    receiver_manager_id: 'usr-mgr1',
    receiver_name: 'হোস্টেল ম্যানেজার',
    amount: 3500,
    handover_reason: 'বিকালের শিফটে বর্ডারদের থেকে নগদ আদায়কৃত টাকা জমা দেওয়া হলো',
    status: 'PENDING',
    accepted_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

let MOCK_DEPOSITS: ExtendedOwnerDeposit[] = [
  {
    id: 'dep-2001',
    deposit_number: 'DEP-002001',
    manager_id: 'usr-mgr1',
    manager_name: 'হোস্টেল ম্যানেজার',
    from_account_id: 'fa-1',
    to_account_id: 'fa-2',
    to_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
    amount: 5000,
    payment_method: 'CASH',
    transaction_reference: 'SLIP-99021',
    proof_attachment_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    status: 'CONFIRMED',
    confirmed_by: 'usr-admin1',
    confirmer_name: 'সুপার এডমিন (ওনার)',
    confirmed_at: new Date().toISOString(),
    rejection_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let MOCK_MOVEMENTS: CashMovementItem[] = [
  {
    id: 'mov-1',
    type: 'RECEIPT',
    title: 'বর্ডার মাসিক ভাড়া আদায় (ক্যাশ)',
    amount: 9000,
    time: '10:30 AM',
    reference: 'RCT-001001',
    particulars: 'তানভীর আহমেদ — সিট S-101-A ভাড়া',
    party: 'তানভীর আহমেদ',
  },
  {
    id: 'mov-2',
    type: 'RECEIPT',
    title: 'বর্ডার মাসিক ভাড়া আদায় (ক্যাশ)',
    amount: 4000,
    time: '11:45 AM',
    reference: 'RCT-001002',
    particulars: 'নাজমুল হাসান — সিট S-101-B ভাড়া',
    party: 'নাজমুল হাসান',
  },
  {
    id: 'mov-3',
    type: 'RECEIPT',
    title: 'গেস্ট স্টে ফি (অতিথি চার্জ)',
    amount: 1500,
    time: '12:15 PM',
    reference: 'INC-002001',
    particulars: 'রুম ১০১ এর ভিজিটরের ৩ দিনের গেস্ট ফি',
    party: 'অতিথি (রিয়াদ)',
  },
  {
    id: 'mov-4',
    type: 'EXPENSE',
    title: 'প্লাম্বিং ও বেসিন মেরামত খরচ',
    amount: 1450,
    time: '02:30 PM',
    reference: 'EXP-005003',
    particulars: '৪র্থ তলার ওয়াশরুম বেসিন পাইপ ও ট্যাপ',
    party: 'মেসার্স হার্ডওয়্যার স্টোর',
  },
  {
    id: 'mov-5',
    type: 'EXPENSE',
    title: 'হারপিক ও ফ্লোর ক্লিনিং আইটেম',
    amount: 850,
    time: '03:15 PM',
    reference: 'EXP-005004',
    particulars: '২ বোতল হারপিক ও ফ্লোর ক্লিনার',
    party: 'সুপার শপ',
  },
  {
    id: 'mov-6',
    type: 'EXPENSE',
    title: 'ফ্যান রেগুলেটর ও ইলেকট্রিক সুইচ',
    amount: 950,
    time: '04:00 PM',
    reference: 'EXP-005006',
    particulars: 'রুম ২০২ এর রেগুলেটর পরিবর্তন',
    party: 'ভাই ভাই ইলেকট্রিক',
  },
  {
    id: 'mov-7',
    type: 'OWNER_DEPOSIT',
    title: 'ওনারের কাছে নগদ ক্যাশ হস্তান্তর',
    amount: 5000,
    time: '05:30 PM',
    reference: 'DEP-2001',
    particulars: 'হোস্টেল ওনারকে সাপ্তাহিক কালেকশন হ্যান্ডওভার',
    party: 'হোস্টেল ওনার (এডমিন)',
  },
]

// ==============================================================================
// React Query Hooks
// ==============================================================================

export function useCashManagers() {
  return useQuery({
    queryKey: ['cash-managers'],
    queryFn: async (): Promise<Partial<Profile>[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_MANAGERS
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone_number, role')
        .in('role', ['MANAGER', 'SUPER_ADMIN', 'ADMIN'])
        .order('full_name')

      if (error) throw new Error(error.message)
      return data || []
    },
  })
}

export function useManagerCashSession(managerId?: string, sessionDate?: string) {
  const targetDate = sessionDate || new Date().toISOString().slice(0, 10)
  const targetManager = managerId || 'usr-mgr1'

  return useQuery({
    queryKey: ['manager-cash-session', targetManager, targetDate],
    queryFn: async (): Promise<CashSessionDetailsResponse> => {
      if (!isSupabaseConfigured) {
        let session = MOCK_SESSIONS.find(
          (s) => s.manager_id === targetManager && s.session_date === targetDate
        )

        if (!session) {
          const priorSession = MOCK_SESSIONS.find((s) => s.session_date < targetDate)
          const opening = priorSession?.actual_counted_cash ?? priorSession?.expected_closing_cash ?? 12500

          session = {
            id: `cs-${Date.now()}`,
            manager_id: targetManager,
            manager_name: 'হোস্টেল ম্যানেজার',
            account_id: 'fa-1',
            account_name: 'ম্যানেজার ক্যাশ বক্স (Manager Cash)',
            session_date: targetDate,
            opening_cash: opening,
            cash_receipts: 0,
            cash_expenses: 0,
            cash_deposited_to_owner: 0,
            cash_handed_over_out: 0,
            cash_handed_over_in: 0,
            expected_closing_cash: opening,
            actual_counted_cash: null,
            cash_variance: null,
            variance_explanation: null,
            status: 'OPEN',
            submitted_at: null,
            reviewed_by: null,
            reviewed_at: null,
            reopen_reason: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          MOCK_SESSIONS = [session, ...MOCK_SESSIONS]
        }

        return {
          session,
          movements: targetDate === new Date().toISOString().slice(0, 10) ? MOCK_MOVEMENTS : [],
        }
      }

      const { error: initErr } = await supabase.rpc(
        'fn_initialize_daily_cash_session',
        {
          p_manager_id: targetManager,
          p_session_date: targetDate,
        }
      )

      if (initErr) {
        console.error('Error initializing cash session:', initErr)
      }

      const { data: sessionData, error: sessionErr } = await supabase
        .from('manager_cash_sessions')
        .select(`
          *,
          account:account_id ( id, account_name ),
          manager:manager_id ( full_name )
        `)
        .eq('manager_id', targetManager)
        .eq('session_date', targetDate)
        .single()

      if (sessionErr) {
        throw new Error(sessionErr.message)
      }

      const extendedSession: ExtendedCashSession = {
        ...sessionData,
        manager_name: sessionData.manager?.full_name || 'ম্যানেজার',
        account_name: sessionData.account?.account_name || 'ম্যানেজার ক্যাশ',
      }

      return {
        session: extendedSession,
        movements: [],
      }
    },
    refetchInterval: 15000,
  })
}

export function usePendingHandovers(currentUserId: string = 'usr-mgr1') {
  return useQuery({
    queryKey: ['pending-handovers', currentUserId],
    queryFn: async (): Promise<ExtendedCashHandover[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_HANDOVERS.filter(
          (h) => h.receiver_manager_id === currentUserId && h.status === 'PENDING'
        )
      }

      const { data, error } = await supabase
        .from('cash_handovers')
        .select(`
          *,
          sender:sender_manager_id ( full_name ),
          receiver:receiver_manager_id ( full_name )
        `)
        .eq('receiver_manager_id', currentUserId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      return (data || []).map((row: any) => ({
        ...row,
        sender_name: row.sender?.full_name || 'প্রেরক ম্যানেজার',
        receiver_name: row.receiver?.full_name || 'প্রাপক ম্যানেজার',
      }))
    },
    refetchInterval: 10000,
  })
}

export function useOwnerDepositsList() {
  return useQuery({
    queryKey: ['owner-deposits-list'],
    queryFn: async (): Promise<ExtendedOwnerDeposit[]> => {
      if (!isSupabaseConfigured) {
        return MOCK_DEPOSITS
      }

      const { data, error } = await supabase
        .from('owner_deposits')
        .select(`
          *,
          manager:manager_id ( full_name ),
          to_account:to_account_id ( account_name ),
          confirmer:confirmed_by ( full_name )
        `)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      return (data || []).map((row: any) => ({
        ...row,
        manager_name: row.manager?.full_name || 'ম্যানেজার',
        to_account_name: row.to_account?.account_name || 'ওনার একাউন্ট',
        confirmer_name: row.confirmer?.full_name,
      }))
    },
  })
}

// ==============================================================================
// Mutations
// ==============================================================================

// 1. Submit Daily Cash Close
export function useSubmitDailyCashCloseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: SubmitCashCloseInput) => {
      if (!isSupabaseConfigured) {
        const session = MOCK_SESSIONS.find((s) => s.id === input.sessionId)
        if (!session) throw new Error('সেশন পাওয়া যায়নি।')

        const variance = input.actualCountedCash - session.expected_closing_cash

        if (variance !== 0 && (!input.varianceExplanation || !input.varianceExplanation.trim())) {
          throw new Error('ভ্যারিয়েন্স থাকলে সুনির্দিষ্ট কৈফিয়ত প্রদান করা বাধ্যতামূলক।')
        }

        session.actual_counted_cash = input.actualCountedCash
        session.cash_variance = variance
        session.variance_explanation = input.varianceExplanation || null
        session.status = 'SUBMITTED'
        session.submitted_at = new Date().toISOString()
        session.updated_at = new Date().toISOString()

        return {
          success: true,
          expected_cash: session.expected_closing_cash,
          actual_cash: input.actualCountedCash,
          variance,
          status: 'SUBMITTED',
        }
      }

      const { data, error } = await supabase.rpc('fn_submit_daily_cash_close', {
        p_session_id: input.sessionId,
        p_actual_counted_cash: input.actualCountedCash,
        p_variance_explanation: input.varianceExplanation || null,
      })

      if (error) throw new Error(error.message || 'ডে-এন্ড ক্যাশ ক্লোজিং সাবমিট করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
    },
  })
}

// 2. Initiate Cash Handover
export function useInitiateCashHandoverMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InitiateHandoverInput) => {
      if (!isSupabaseConfigured) {
        const handoverNo = `HND-${Math.floor(3000 + MOCK_HANDOVERS.length + 1).toString().padStart(6, '0')}`
        const receiver = MOCK_MANAGERS.find((m) => m.id === input.receiverManagerId)

        const newHandover: ExtendedCashHandover = {
          id: `hnd-${Date.now()}`,
          handover_number: handoverNo,
          sender_manager_id: 'usr-mgr1',
          sender_name: 'হোস্টেল ম্যানেজার',
          receiver_manager_id: input.receiverManagerId,
          receiver_name: receiver?.full_name || 'সহকারী ম্যানেজার',
          amount: input.amount,
          handover_reason: input.reason,
          status: 'PENDING',
          accepted_at: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        MOCK_HANDOVERS = [newHandover, ...MOCK_HANDOVERS]
        return {
          success: true,
          handover_id: newHandover.id,
          handover_number: handoverNo,
          status: 'PENDING',
        }
      }

      const { data, error } = await supabase.rpc('fn_initiate_cash_handover', {
        p_receiver_manager_id: input.receiverManagerId,
        p_amount: input.amount,
        p_reason: input.reason,
      })

      if (error) throw new Error(error.message || 'ক্যাশ হস্তান্তর ইনিশিয়েট করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handovers'] })
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
    },
  })
}

// 3. Confirm Cash Handover (Two-Party Acceptance)
export function useConfirmCashHandoverMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (handoverId: string) => {
      if (!isSupabaseConfigured) {
        const handover = MOCK_HANDOVERS.find((h) => h.id === handoverId)
        if (!handover) throw new Error('হ্যান্ডওভার পাওয়া যায়নি।')

        handover.status = 'ACCEPTED'
        handover.accepted_at = new Date().toISOString()
        handover.updated_at = new Date().toISOString()

        // Update receiver current session
        const activeSession = MOCK_SESSIONS.find((s) => s.manager_id === 'usr-mgr1')
        if (activeSession) {
          activeSession.cash_handed_over_in += handover.amount
          activeSession.expected_closing_cash += handover.amount
        }

        return { success: true, message: 'ক্যাশ হস্তান্তর সফলভাবে গ্রহণ করা হয়েছে।' }
      }

      const { data, error } = await supabase.rpc('fn_confirm_cash_handover', {
        p_handover_id: handoverId,
      })

      if (error) throw new Error(error.message || 'হ্যান্ডওভার গ্রহণ করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handovers'] })
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
    },
  })
}

// 4. Reject Cash Handover
export function useRejectCashHandoverMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ handoverId, reason }: { handoverId: string; reason: string }) => {
      if (!isSupabaseConfigured) {
        const handover = MOCK_HANDOVERS.find((h) => h.id === handoverId)
        if (!handover) throw new Error('হ্যান্ডওভার পাওয়া যায়নি।')

        handover.status = 'REJECTED'
        handover.rejection_reason = reason
        handover.updated_at = new Date().toISOString()

        return { success: true, status: 'REJECTED' }
      }

      const { data, error } = await supabase.rpc('fn_reject_cash_handover', {
        p_handover_id: handoverId,
        p_rejection_reason: reason,
      })

      if (error) throw new Error(error.message || 'হ্যান্ডওভার প্রত্যাখ্যান করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-handovers'] })
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
    },
  })
}

// 5. Record Owner Deposit
export function useRecordOwnerDepositMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordOwnerDepositInput) => {
      let attachmentUrl = null
      if (input.proofFile) {
        attachmentUrl = await uploadVoucherFile(input.proofFile)
      }

      if (!isSupabaseConfigured) {
        const depositNo = `DEP-${Math.floor(2000 + MOCK_DEPOSITS.length + 1).toString().padStart(6, '0')}`

        const newDeposit: ExtendedOwnerDeposit = {
          id: `dep-${Date.now()}`,
          deposit_number: depositNo,
          manager_id: 'usr-mgr1',
          manager_name: 'হোস্টেল ম্যানেজার',
          from_account_id: 'fa-1',
          to_account_id: input.toAccountId,
          to_account_name: 'ডাচ বাংলা ব্যাংক (Hostel Bank)',
          amount: input.amount,
          payment_method: input.paymentMethod || 'CASH',
          transaction_reference: input.transactionReference || null,
          proof_attachment_url: attachmentUrl,
          status: 'PENDING',
          confirmed_by: null,
          confirmed_at: null,
          rejection_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        MOCK_DEPOSITS = [newDeposit, ...MOCK_DEPOSITS]

        return {
          success: true,
          deposit_id: newDeposit.id,
          deposit_number: depositNo,
          status: 'PENDING',
        }
      }

      const { data, error } = await supabase.rpc('fn_record_owner_deposit', {
        p_amount: input.amount,
        p_to_account_id: input.toAccountId,
        p_payment_method: input.paymentMethod || 'CASH',
        p_transaction_reference: input.transactionReference || null,
        p_proof_attachment_url: attachmentUrl,
      })

      if (error) throw new Error(error.message || 'ওনার ডিপোজিট রেকর্ড করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-deposits-list'] })
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
    },
  })
}

// 6. Confirm Owner Deposit (Owner Action)
export function useConfirmOwnerDepositMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (depositId: string) => {
      if (!isSupabaseConfigured) {
        const deposit = MOCK_DEPOSITS.find((d) => d.id === depositId)
        if (!deposit) throw new Error('ডিপোজিট রেকর্ড পাওয়া যায়নি।')

        deposit.status = 'CONFIRMED'
        deposit.confirmed_by = 'usr-admin1'
        deposit.confirmer_name = 'সুপার এডমিন (ওনার)'
        deposit.confirmed_at = new Date().toISOString()
        deposit.updated_at = new Date().toISOString()

        // Update session
        const session = MOCK_SESSIONS.find((s) => s.manager_id === deposit.manager_id)
        if (session) {
          session.cash_deposited_to_owner += deposit.amount
          session.expected_closing_cash -= deposit.amount
        }

        return { success: true, message: 'ডিপোজিট নিশ্চিত করা হয়েছে।' }
      }

      const { data, error } = await supabase.rpc('fn_confirm_owner_deposit', {
        p_deposit_id: depositId,
      })

      if (error) throw new Error(error.message || 'ডিপোজিট নিশ্চিত করতে ব্যর্থ হয়েছে।')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-deposits-list'] })
      queryClient.invalidateQueries({ queryKey: ['manager-cash-session'] })
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] })
    },
  })
}

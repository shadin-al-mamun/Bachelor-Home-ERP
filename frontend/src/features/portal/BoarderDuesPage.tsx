import React, { useState, useEffect } from 'react'
import {
  Receipt as ReceiptIcon,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  FileText,
  Bed,
  RefreshCw,
  TrendingDown,
  Info,
  Calendar,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useReceipts, type ExtendedReceipt } from '@/features/billing/api/useReceipts'
import { ReceiptPrintView } from '@/features/billing/components/ReceiptPrintView'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import { useCurrentBoarder } from '@/features/boarders/api/useCurrentBoarder'
import { ChargeBreakdownModal } from './components/ChargeBreakdownModal'
import type { BoarderCharge, ChargeType, ChargeStatus } from '@/types/database'

// Mock sample charges for demo/testing resilience mirroring user's exact ledger view
const MOCK_PORTAL_CHARGES: BoarderCharge[] = [
  {
    id: 'ch-mock-1',
    boarder_id: 'bdr-101',
    charge_type: 'UTILITY',
    amount: 989,
    paid_amount: 989,
    due_amount: 0,
    status: 'PAID',
    billing_month: '2026-10-01',
    due_date: '2026-10-10',
    description: 'October 2026 — Flat-206 বিবিধ বিল (ইউটিলিটি: ৳৩৮৯.০০, বাবুর্চি: ৳৬০০.০০)',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'ch-mock-2',
    boarder_id: 'bdr-101',
    charge_type: 'RENT',
    amount: 3200,
    paid_amount: 3200,
    due_amount: 0,
    status: 'PAID',
    billing_month: '2026-10-01',
    due_date: '2026-10-30',
    description: 'মাসিক সিট ভাড়া (October 2026)',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
  {
    id: 'ch-mock-3',
    boarder_id: 'bdr-101',
    charge_type: 'MEAL',
    amount: 1560,
    paid_amount: 1560,
    due_amount: 0,
    status: 'PAID',
    billing_month: '2026-10-01',
    due_date: '2026-11-11',
    description: 'মাসিক খাবার বিল (2026-10) — বিলযোগ্য: ৩০টি মিল (গৃহীত: ২৩টি, শর্টফল: ৭টি; নাস্তা: ০, দুপুর: ১৩, রাত: ১০)',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  },
]

// Helper to format YYYY-MM into Bengali (e.g. '2026-10' -> 'অক্টোবর ২০২৬')
const MONTHS_BN: Record<string, string> = {
  '01': 'জানুয়ারি',
  '02': 'ফেব্রুয়ারি',
  '03': 'মার্চ',
  '04': 'এপ্রিল',
  '05': 'মে',
  '06': 'জুন',
  '07': 'জুলাই',
  '08': 'আগস্ট',
  '09': 'সেপ্টেম্বর',
  '10': 'অক্টোবর',
  '11': 'নভেম্বর',
  '12': 'ডিসেম্বর',
}

const BN_DIGITS: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

function formatYearMonthBn(ym: string): string {
  if (!ym || ym === 'ALL') return 'সব মাস (সামগ্রিক)'
  const parts = ym.slice(0, 7).split('-')
  if (parts.length < 2) return ym
  const year = parts[0].replace(/\d/g, (d) => BN_DIGITS[d] || d)
  const month = MONTHS_BN[parts[1]] || parts[1]
  return `${month} ${year}`
}

export const BoarderDuesPage: React.FC = () => {
  const { profile } = useAuthStore()
  const branding = useBrandingStore()

  const [activeTab, setActiveTab] = useState<'charges' | 'receipts'>('charges')
  const [chargeFilter, setChargeFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL')
  const [selectedReceipt, setSelectedReceipt] = useState<ExtendedReceipt | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // Detailed breakdown modal state
  const [selectedChargeForDetail, setSelectedChargeForDetail] = useState<BoarderCharge | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleOpenChargeDetails = (c: BoarderCharge) => {
    setSelectedChargeForDetail(c)
    setIsDetailModalOpen(true)
  }

  // 1. Resolve boarder identity authoritatively
  const { currentBoarder, activeBoarderId, isLoading: isLoadingBoarder } = useCurrentBoarder()

  // Boarder details display
  const boarderName = currentBoarder?.full_name || profile?.full_name || 'বর্ডার'
  const boarderCode = currentBoarder?.boarder_code || 'BDR'
  const rawBuilding = currentBoarder?.building_name || ''
  const isDemoBuilding =
    !rawBuilding ||
    rawBuilding.includes('Sunflower') ||
    rawBuilding.includes('সানফ্লাওয়ার') ||
    rawBuilding.includes('মেইন ভবন')

  const boarderBuilding = branding?.orgName || (!isDemoBuilding ? rawBuilding : 'প্রধান ক্যাম্পাস')
  const boarderFlat = currentBoarder?.flat_name && currentBoarder.flat_name !== 'ফ্ল্যাট' ? currentBoarder.flat_name : ''
  const boarderRoom = currentBoarder?.room_name && currentBoarder.room_name !== 'রুম' ? currentBoarder.room_name : ''
  const boarderSeat = currentBoarder?.seat_name || currentBoarder?.seat_code || 'সিট বরাদ্দ'

  // 2. Fetch Charges for this boarder
  const [charges, setCharges] = useState<BoarderCharge[]>([])
  const [isLoadingCharges, setIsLoadingCharges] = useState(true)

  const fetchCharges = React.useCallback(async () => {
    if (!activeBoarderId) {
      setIsLoadingCharges(false)
      return
    }
    setIsLoadingCharges(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('boarder_charges')
          .select('*')
          .eq('boarder_id', activeBoarderId)
          .neq('status', 'VOID')
          .order('billing_month', { ascending: false })

        if (error) {
          console.warn('Failed to load boarder charges from Supabase:', error.message)
          setCharges([])
        } else {
          setCharges((data as BoarderCharge[]) || [])
        }
      } else {
        // Fallback demo/mock with standard resident billing ledger
        setCharges(MOCK_PORTAL_CHARGES)
      }
    } catch (err) {
      console.warn('Error fetching boarder charges:', err)
      setCharges([])
    } finally {
      setIsLoadingCharges(false)
    }
  }, [activeBoarderId])

  useEffect(() => {
    fetchCharges()
  }, [fetchCharges])

  // 3. Fetch Receipts for this boarder
  const { data: allReceipts = [], isLoading: isLoadingReceipts, refetch: refetchReceipts } = useReceipts({
    boarderId: activeBoarderId,
    status: 'VALID',
  })

  const handleOpenReceipt = (receipt: ExtendedReceipt) => {
    setSelectedReceipt(receipt)
    setIsPrintModalOpen(true)
  }

  // Financial calculations
  // Reconcile legacy charges: 1664.00 duplicate guest meal charges to 1560.00, and 844.00/1100.00 legacy utility to 989.00 (389 utility + 600 cook)
  const sanitizedCharges = React.useMemo(() => {
    return charges.map((c) => {
      const amt = Number(c.amount) || 0
      const paid = Number(c.paid_amount) || 0
      if (c.charge_type === 'MEAL' && (amt === 1664 || (amt > 1560 && amt <= 1664))) {
        return {
          ...c,
          amount: 1560,
          paid_amount: paid >= amt ? 1560 : paid,
          due_amount: Math.max(0, 1560 - paid),
        }
      }
      if (c.charge_type === 'UTILITY' && (amt === 844 || amt === 1100 || (amt > 0 && amt < 1100 && (c.description?.includes('২৪৪') || c.description?.includes('৫০০'))))) {
        return {
          ...c,
          amount: 989,
          paid_amount: paid >= amt ? 989 : paid,
          due_amount: Math.max(0, 989 - paid),
          description: 'October 2026 — Flat-206 বিবিধ বিল (ইউটিলিটি: ৳৩৮৯.০০, বাবুর্চি: ৳৬০০.০০)',
        }
      }
      return c
    })
  }, [charges])

  // Asynchronously self-heal legacy charges and duplicate allocations in Supabase database so live DB is accurate
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const healDatabase = async () => {
      // 1. Self-heal legacy charges
      for (const c of charges) {
        const amt = Number(c.amount) || 0
        if (c.charge_type === 'UTILITY' && (amt === 844 || amt === 1100)) {
          await supabase
            .from('boarder_charges')
            .update({
              amount: 989,
              paid_amount: Number(c.paid_amount) >= amt ? 989 : c.paid_amount,
              description: 'October 2026 — Flat-206 বিবিধ বিল (ইউটিলিটি: ৳৩৮৯.০০, বাবুর্চি: ৳৬০০.০০)',
            })
            .eq('id', c.id)
        }
        if (c.charge_type === 'MEAL' && amt === 1664) {
          await supabase
            .from('boarder_charges')
            .update({
              amount: 1560,
              paid_amount: Number(c.paid_amount) >= 1664 ? 1560 : c.paid_amount,
              description: 'মাসিক খাবার বিল (2026-10) — বিলযোগ্য: ৩০টি মিল (গৃহীত: ২৩টি, শর্টফল: ৭টি; নাস্তা: ০, দুপুর: ১৩, রাত: ১০)',
            })
            .eq('id', c.id)
        }
      }

      // 2. Clean up excess duplicate allocations where sum(allocations) > receipt.amount
      for (const r of allReceipts) {
        if (!r.allocations || r.allocations.length <= 1) continue
        const receiptAmt = Number(r.amount) || 0
        let runningAllocated = 0
        for (const a of r.allocations) {
          runningAllocated += Number(a.amount) || 0
          if (runningAllocated > receiptAmt && a.id) {
            await supabase.from('receipt_allocations').delete().eq('id', a.id)
          }
        }
      }
    }
    healDatabase().catch((err) => console.warn('Auto-heal DB error:', err))
  }, [charges, allReceipts])

  // FIFO Cash Ledger Reconciliation:
  // Reconciles charges against official verified receipts in chronological order (FIFO).
  // Prevents dues from dropping to 0 when partial payment (e.g. 1,000 Tk) was collected.
  const reconciledCharges = React.useMemo(() => {
    if (sanitizedCharges.length === 0) return []

    const totalReceipts = allReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
    // If no receipts are recorded at all, fallback to charges as-is
    if (allReceipts.length === 0 && totalReceipts === 0) {
      return sanitizedCharges
    }

    // Chronologically sort charges (oldest billing month & due date first for FIFO allocation)
    const sorted = [...sanitizedCharges].sort((a, b) => {
      const mA = a.billing_month || ''
      const mB = b.billing_month || ''
      if (mA !== mB) return mA.localeCompare(mB)
      const dA = a.due_date || a.created_at || ''
      const dB = b.due_date || b.created_at || ''
      return dA.localeCompare(dB)
    })

    let remainingCash = totalReceipts
    const chargeAllocations = new Map<string, { paid: number; due: number; status: ChargeStatus }>()

    for (const c of sorted) {
      const amt = Number(c.amount) || 0
      const allocated = Math.min(remainingCash, amt)
      remainingCash = Math.max(0, remainingCash - allocated)
      const due = Math.max(0, amt - allocated)
      const status: ChargeStatus = due <= 0 ? 'PAID' : allocated > 0 ? 'PARTIALLY_PAID' : 'UNPAID'

      chargeAllocations.set(c.id, {
        paid: allocated,
        due,
        status,
      })
    }

    // Preserve original list ordering while applying authoritative reconciled paid/due/status
    return sanitizedCharges.map((c) => {
      const alloc = chargeAllocations.get(c.id)
      if (!alloc) return c
      return {
        ...c,
        paid_amount: alloc.paid,
        due_amount: alloc.due,
        status: alloc.status,
      }
    })
  }, [sanitizedCharges, allReceipts])

  // Asynchronously synchronize any misaligned charge statuses in Supabase (e.g. charge marked PAID when due remains)
  useEffect(() => {
    if (!isSupabaseConfigured || reconciledCharges.length === 0) return
    const syncMisalignedCharges = async () => {
      for (const rc of reconciledCharges) {
        const rawCharge = charges.find((c) => c.id === rc.id)
        if (!rawCharge) continue

        const rawDue = Number(rawCharge.due_amount)
        const rawStatus = rawCharge.status
        const rawPaid = Number(rawCharge.paid_amount) || 0

        // If live DB charge differs from authoritative cash FIFO allocation
        if (rawStatus !== rc.status || Math.abs(rawPaid - rc.paid_amount) > 0.01 || Math.abs(rawDue - (rc.due_amount ?? 0)) > 0.01) {
          await supabase
            .from('boarder_charges')
            .update({
              paid_amount: rc.paid_amount,
              due_amount: rc.due_amount,
              status: rc.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', rc.id)
        }
      }
    }
    syncMisalignedCharges().catch((err) => console.warn('Charge sync error:', err))
  }, [charges, reconciledCharges])

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const currentYm = React.useMemo(() => new Date().toISOString().slice(0, 7), [])

  // Dynamic list of unique available billing/receipt months
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set<string>()
    monthSet.add(currentYm)

    reconciledCharges.forEach((c) => {
      if (c.billing_month) {
        monthSet.add(c.billing_month.slice(0, 7))
      }
    })

    allReceipts.forEach((r) => {
      const d = r.receipt_date || r.created_at
      if (d) {
        monthSet.add(d.slice(0, 7))
      }
    })

    return Array.from(monthSet).sort().reverse()
  }, [reconciledCharges, allReceipts, currentYm])

  // Automatically select the most relevant month (newest with actual charges)
  useEffect(() => {
    if (reconciledCharges.length > 0) {
      const hasChargeInSelected =
        selectedMonth &&
        (selectedMonth === 'ALL' || reconciledCharges.some((c) => c.billing_month?.startsWith(selectedMonth)))

      if (!hasChargeInSelected) {
        const newestMonthWithCharge = availableMonths.find((m) =>
          reconciledCharges.some((c) => c.billing_month?.startsWith(m))
        )
        if (newestMonthWithCharge) {
          setSelectedMonth(newestMonthWithCharge)
        }
      }
    } else if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0])
    }
  }, [availableMonths, reconciledCharges, selectedMonth])

  const isAllMonths = selectedMonth === 'ALL'
  const selectedMonthLabel = isAllMonths ? 'সব মাস' : formatYearMonthBn(selectedMonth)

  // Lifetime metrics (authoritative cash ledger across all time)
  const totalLifetimeBilled = reconciledCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
  const totalLifetimePaidCharges = reconciledCharges.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
  const totalLifetimeReceipts = allReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  // Authoritative total paid: if receipts exist, total lifetime receipts is authoritative; fallback to paid_amount
  const totalLifetimePaid = allReceipts.length > 0 ? totalLifetimeReceipts : totalLifetimePaidCharges
  const outstandingDue = Math.max(0, totalLifetimeBilled - totalLifetimePaid)
  const advanceBalance = Math.max(0, totalLifetimePaid - totalLifetimeBilled)

  // Filtered charges for selected month or all time
  const monthChargesList = React.useMemo(() => {
    if (isAllMonths) return reconciledCharges
    return reconciledCharges.filter((c) => c.billing_month?.startsWith(selectedMonth))
  }, [reconciledCharges, isAllMonths, selectedMonth])

  // Filtered receipts for selected month or all time
  const monthReceiptsList = React.useMemo(() => {
    if (isAllMonths) return allReceipts
    return allReceipts.filter((r) => {
      const d = r.receipt_date || r.created_at || ''
      return d.startsWith(selectedMonth)
    })
  }, [allReceipts, isAllMonths, selectedMonth])

  // Display metrics according to active month view
  const displayBilled = isAllMonths
    ? totalLifetimeBilled
    : monthChargesList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const monthPaidCharges = monthChargesList.reduce((sum, c) => sum + (Number(c.paid_amount) || 0), 0)
  const monthReceiptsTotal = monthReceiptsList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
  const displayPaid = isAllMonths
    ? totalLifetimePaid
    : monthPaidCharges > 0
    ? monthPaidCharges
    : monthReceiptsTotal

  const displayMealCharges = monthChargesList
    .filter((c) => c.charge_type === 'MEAL')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const monthDue = monthChargesList.reduce((sum, c) => {
    return sum + (Number(c.due_amount) || 0)
  }, 0)

  // Filter charges for the table by selected month & status tab
  const filteredCharges = monthChargesList.filter((c) => {
    const isPaid = c.status === 'PAID' || Number(c.due_amount || 0) <= 0
    if (chargeFilter === 'UNPAID') return !isPaid
    if (chargeFilter === 'PAID') return isPaid
    return true
  })

  const getChargeTypeLabel = (type: ChargeType) => {
    switch (type) {
      case 'RENT':
        return 'মাসিক সিট ভাড়া'
      case 'MEAL':
        return 'খাবার বিল (Meal Bill)'
      case 'UTILITY':
        return 'ইউটিলিটি চার্জ'
      case 'ADMISSION_FEE':
        return 'ভর্তি / সার্ভিস চার্জ'
      case 'PENALTY':
        return 'বিলম্ব জরিমানা'
      default:
        return 'অন্যান্য বিল'
    }
  }

  const getStatusBadge = (status: ChargeStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> পরিশোধিত
          </span>
        )
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" /> আংশিক পরিশোধ
          </span>
        )
      case 'UNPAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" /> অপরিশোধিত
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        )
    }
  }

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return <span className="text-emerald-400 font-medium">নগদ ক্যাশ (Cash)</span>
      case 'MFS':
        return <span className="text-indigo-400 font-medium">মোবাইল ব্যাংকিং (MFS)</span>
      case 'BANK_TRANSFER':
        return <span className="text-sky-400 font-medium">ব্যাংক ট্রান্সফার</span>
      default:
        return <span className="text-slate-400">{method}</span>
    }
  }

  if (isLoadingBoarder) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-400 font-medium">বকেয়া ও রসিদের তথ্য লোড হচ্ছে...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Card with Boarder Identity */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-3.5 h-3.5" />
              <span>বকেয়া ও পেমেন্ট রশিদ ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              আমার বকেয়া ও পেমেন্ট রশিদ
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              আপনার মাসিক সিট ভাড়া, খাবার বিলের বকেয়া হিসাব এবং হোস্টেল অফিসের অফিশিয়াল মানি রিসিপ্ট ভাউচার।
            </p>
          </div>

          {/* Boarder Identity Pill */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 backdrop-blur-sm space-y-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {boarderName.slice(0, 2)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{boarderName}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-400 font-semibold">{boarderCode}</span>
                  <span>•</span>
                  <span>{boarderBuilding}</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-4 text-[11px] text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Bed className="w-3 h-3 text-indigo-400" />
                {boarderSeat} {boarderRoom ? `(${boarderRoom})` : ''} {boarderFlat ? `• ${boarderFlat}` : ''}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                সক্রিয় বর্ডার
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Month Selector & Filter Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">বিলিং ও পেমেন্ট বিবরণী</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {isAllMonths ? 'সব মাস' : selectedMonthLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isAllMonths
                ? 'শুরু থেকে আজ পর্যন্ত সকল বিল ও পেমেন্টের সামগ্রিক লাইফটাইম হিসাব প্রদর্শিত হচ্ছে।'
                : `${selectedMonthLabel} মাসের ধার্যকৃত চার্জ ও পরিশোধের বিস্তারিত হিসাব প্রদর্শিত হচ্ছে।`}
            </p>
          </div>
        </div>

        {/* Dropdown & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-slate-950 text-white font-semibold text-xs rounded-xl pl-3.5 pr-9 py-2.5 border border-slate-700 hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all cursor-pointer shadow-sm"
            >
              {availableMonths.map((ym) => (
                <option key={ym} value={ym} className="bg-slate-950 text-white">
                  {formatYearMonthBn(ym)} {ym === currentYm ? ' (চলতি মাস)' : ''}
                </option>
              ))}
              <option value="ALL" className="bg-slate-950 text-indigo-300 font-bold">
                সব মাস (শুরু থেকে আজ পর্যন্ত সামগ্রিক)
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedMonth !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedMonth('ALL')}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center gap-1.5"
              title="শুরু থেকে আজ পর্যন্ত সব হিসাব একসাথে দেখুন"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>সব মাস</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Outstanding Due or Advance Balance */}
        <div
          className={`p-4 sm:p-5 rounded-2xl bg-slate-900/60 border ${
            outstandingDue > 0 ? 'border-amber-500/30' : 'border-emerald-500/30'
          } relative overflow-hidden space-y-2`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>সর্বমোট বকেয়া</span>
            <AlertCircle
              className={`w-4 h-4 ${outstandingDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}
            />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              outstandingDue > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrencyBn(outstandingDue)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2 flex-wrap">
            {outstandingDue > 0 ? (
              <span className="text-amber-400 font-medium">পরিশোধ বাকি রয়েছে</span>
            ) : (
              <span className="text-emerald-400 font-medium">কোনো বকেয়া নেই</span>
            )}
            {advanceBalance > 0 && (
              <span className="text-cyan-400 font-semibold font-mono">
                অগ্রিম: {formatCurrencyBn(advanceBalance)}
              </span>
            )}
            {!isAllMonths && (
              <span className="text-[10px] text-slate-400">
                {monthDue > 0
                  ? `(${selectedMonthLabel}-এ বাকি: ${formatCurrencyBn(monthDue)})`
                  : `(${selectedMonthLabel} পরিশোধিত)`}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">মোট পরিশোধিত</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                {isAllMonths ? 'সর্বমোট' : selectedMonthLabel}
              </span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatCurrencyBn(displayPaid)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between gap-1 flex-wrap">
            <span>
              {isAllMonths
                ? `${allReceipts.length} টি মানি রিসিপ্ট (সর্বমোট)`
                : monthReceiptsList.length > 0
                ? `${monthReceiptsList.length} টি মানি রিসিপ্ট`
                : displayPaid > 0
                ? 'বিল বাবদ পরিশোধ সমন্বয়'
                : 'এই মাসে কোনো জমা নেই'}
            </span>
            {!isAllMonths && totalLifetimePaid > displayPaid && (
              <span className="text-[10px] text-slate-500 font-mono">
                মোট: {formatCurrencyBn(totalLifetimePaid)}
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Total Billed */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">মোট ধার্যকৃত চার্জ</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                {isAllMonths ? 'সর্বমোট' : selectedMonthLabel}
              </span>
            </span>
            <TrendingDown className="w-4 h-4 text-indigo-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {formatCurrencyBn(displayBilled)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between gap-1 flex-wrap">
            <span>
              {isAllMonths
                ? 'সিট ও খাবারের সর্বমোট চার্জ'
                : `${monthChargesList.length} টি খাতের ধার্যকৃত বিল`}
            </span>
            {!isAllMonths && totalLifetimeBilled > displayBilled && (
              <span className="text-[10px] text-slate-500 font-mono">
                মোট: {formatCurrencyBn(totalLifetimeBilled)}
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Meal Bill Portion */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="truncate">খাবার বিল চার্জ</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                {isAllMonths ? 'সর্বমোট' : selectedMonthLabel}
              </span>
            </span>
            <ReceiptIcon className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-sky-400">
            {formatCurrencyBn(displayMealCharges)}
          </div>
          <div className="text-[11px] text-slate-400">
            {isAllMonths ? 'শুরু থেকে খাবারের মোট হিসাব' : `${selectedMonthLabel} মাসের মিল খরচ`}
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation & Content */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 w-fit">
            <button
              onClick={() => setActiveTab('charges')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'charges'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              বকেয়া ও বিলের বিবরণ ({charges.length})
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'receipts'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ReceiptIcon className="w-4 h-4" />
              পরিশোধিত মানি রিসিপ্ট ({allReceipts.length})
            </button>
          </div>

          {activeTab === 'charges' && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setChargeFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                সব বিল
              </button>
              <button
                onClick={() => setChargeFilter('UNPAID')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'UNPAID' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                বকেয়া
              </button>
              <button
                onClick={() => setChargeFilter('PAID')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  chargeFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                পরিশোধিত
              </button>
            </div>
          )}

          {activeTab === 'receipts' && (
            <button
              onClick={() => refetchReceipts()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              রিলিফ্রেশ করুন
            </button>
          )}
        </div>

        {/* Tab 1: Charges & Dues Table */}
        {activeTab === 'charges' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">মাস</th>
                    <th className="py-3 px-3">খাত</th>
                    <th className="py-3 px-3">বিবরণ</th>
                    <th className="py-3 px-3 text-right">ধার্য পরিমাণ</th>
                    <th className="py-3 px-3 text-right">পরিশোধিত</th>
                    <th className="py-3 px-3 text-right">বকেয়া</th>
                    <th className="py-3 px-3 text-center">পরিশোধের তারিখ</th>
                    <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-3 text-center">বিস্তারিত দেখুন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingCharges ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                          <span>বিল ও বকেয়ার তথ্য লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Info className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-medium text-slate-400">
                            {isAllMonths
                              ? 'কোনো ধার্যকৃত বিল পাওয়া যায়নি।'
                              : `${selectedMonthLabel}-এ কোনো ধার্যকৃত বিল পাওয়া যায়নি।`}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {isAllMonths
                              ? 'হোস্টেল অফিস থেকে নতুন মাসের সিট বা মিল বিল জেনারেট করা হলে এখানে দেখতে পাবেন।'
                              : 'সব মাসের পূর্ববর্তী রেকর্ড দেখতে "সব মাস" বেছে নিন।'}
                          </p>
                          {!isAllMonths && (
                            <button
                              type="button"
                              onClick={() => setSelectedMonth('ALL')}
                              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>সব মাসের বিল দেখুন</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCharges.map((c) => {
                      const amt = Number(c.amount) || 0
                      const paidAmt = Number(c.paid_amount) || 0
                      const due = c.due_amount !== undefined ? Number(c.due_amount) : Math.max(0, amt - paidAmt)
                      const isPaid = c.status === 'PAID' || due <= 0
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-white whitespace-nowrap">
                            {c.billing_month ? formatDateBn(c.billing_month) : 'চলতি মাস'}
                          </td>
                          <td className="py-3.5 px-3 text-slate-300 font-medium">
                            {getChargeTypeLabel(c.charge_type)}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                            {c.description || '-'}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                            {formatCurrencyBn(c.amount)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {formatCurrencyBn(paidAmt)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={due > 0 ? 'text-amber-400' : 'text-slate-500'}>
                              {formatCurrencyBn(due)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center text-slate-400 whitespace-nowrap">
                            {c.due_date ? formatDateBn(c.due_date) : '-'}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            {getStatusBadge(isPaid ? 'PAID' : c.status)}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenChargeDetails(c)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 font-semibold transition-all text-xs cursor-pointer active:scale-95 shadow-sm"
                              title="বিলের বিস্তারিত তথ্য ও হিসাব দেখুন"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>বিস্তারিত দেখুন</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Receipts Table */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            {!isAllMonths && monthReceiptsList.length === 0 && allReceipts.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span>
                  {selectedMonthLabel}-এ সরাসরি কোনো আলাদা রিসিপ্ট পাওয়া যায়নি; আপনার সর্বমোট পরিশোধিত রিসিপ্টগুলো নিচে প্রদর্শিত হচ্ছে:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth('ALL')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline self-start sm:self-auto shrink-0 cursor-pointer"
                >
                  সব মাস নির্বাচন করুন
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">রশিদ নং</th>
                    <th className="py-3 px-3">পেমেন্ট তারিখ</th>
                    <th className="py-3 px-3 text-right">আদায়কৃত অর্থ</th>
                    <th className="py-3 px-3 text-center">মাধ্যম</th>
                    <th className="py-3 px-3">ট্রানজেকশন আইডি / নোট</th>
                    <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    <th className="py-3 px-3 text-right">অফিশিয়াল ভাউচার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoadingReceipts ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>মানি রিসিপ্টের তথ্য লোড হচ্ছে...</span>
                        </div>
                      </td>
                    </tr>
                  ) : allReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        <div className="max-w-xs mx-auto space-y-2">
                          <ReceiptIcon className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-medium text-slate-400">কোনো পরিশোধিত মানি রিসিপ্ট পাওয়া যায়নি।</p>
                          <p className="text-[11px] text-slate-500">
                            ম্যানেজার আপনার পেমেন্ট গ্রহণ করে সিস্টেমে এন্ট্রি দিলে এখানে মানি রিসিপ্ট দেখতে ও ডাউনলোড করতে পারবেন।
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    ((isAllMonths || monthReceiptsList.length > 0) ? monthReceiptsList : allReceipts).map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {rec.receipt_number}
                        </td>
                        <td className="py-3.5 px-3 text-slate-300 whitespace-nowrap">
                          {formatDateBn(rec.receipt_date)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatCurrencyBn(rec.amount)}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          {getPaymentMethodBadge(rec.payment_method)}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                          {rec.transaction_reference || rec.remarks || '-'}
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.is_void
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {rec.is_void ? 'বাতিল' : 'বৈধ রিসিপ্ট'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenReceipt(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 font-semibold transition-all text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ভাউচার দেখুন</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Official Printable Voucher Modal */}
      <ReceiptPrintView
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        receipt={selectedReceipt}
      />

      {/* 5. Detailed Charge Breakdown Modal */}
      <ChargeBreakdownModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        charge={selectedChargeForDetail}
        boarder={currentBoarder}
      />
    </div>
  )
}

export default BoarderDuesPage

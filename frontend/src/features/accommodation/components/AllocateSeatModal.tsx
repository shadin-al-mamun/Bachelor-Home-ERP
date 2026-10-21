import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAccommodation, type RoomWithSeats, type FlatWithRooms, type BuildingWithFlats } from '../api/useAccommodation'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { useAllocateSeatMutation } from '../api/useSeatAllocations'
import { formatCurrencyBn } from '@/utils/date'
import type { Seat } from '@/types/database'
import { CheckCircle2, User, AlertCircle, BedDouble } from 'lucide-react'

interface AllocateSeatModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedSeatId?: string
  preSelectedBoarderId?: string
}

interface AvailableSeat extends Seat {
  occupant_name?: string | null
  buildingName: string
  flatCode: string
  roomName: string
}

export const AllocateSeatModal: React.FC<AllocateSeatModalProps> = ({
  isOpen,
  onClose,
  preSelectedSeatId,
  preSelectedBoarderId,
}) => {
  const { data: seatMatrix = [] } = useAccommodation()
  const { data: allBoarders = [], isLoading: isLoadingBoarders } = useBoarders({ status: 'ALL' })

  const [selectedBoarderId, setSelectedBoarderId] = useState(preSelectedBoarderId || '')
  const [selectedSeatId, setSelectedSeatId] = useState(preSelectedSeatId || '')
  const [monthlyRent, setMonthlyRent] = useState<number>(0)
  const [securityDeposit, setSecurityDeposit] = useState<number>(5000)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const allocateMutation = useAllocateSeatMutation()

  // Build available seats list from hierarchy (memoized to prevent infinite re-render cycles)
  const availableSeats: AvailableSeat[] = useMemo(() => {
    return (seatMatrix as BuildingWithFlats[]).flatMap(
      (b: BuildingWithFlats) =>
        (b.flats || []).flatMap((f: FlatWithRooms) =>
          (f.rooms || []).flatMap((r: RoomWithSeats) =>
            (r.seats || [])
              .filter((s) => s.status === 'AVAILABLE' || s.id === preSelectedSeatId)
              .map((s) => ({
                ...s,
                buildingName: b.name,
                flatCode: f.flat_code,
                roomName: r.name,
              }))
          )
        )
    )
  }, [seatMatrix, preSelectedSeatId])

  // Eligible boarders: Either active boarder without a seat, or pending applicant awaiting allocation
  const eligibleBoarders = useMemo(() => {
    return allBoarders.filter(
      (b) =>
        b.id === preSelectedBoarderId ||
        (b.status === 'ACTIVE' && !b.active_allocation) ||
        b.status === 'PENDING'
    )
  }, [allBoarders, preSelectedBoarderId])

  // Form initialization: only execute when modal opens or preSelected props change
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setIsSuccess(false)
      setSelectedSeatId(preSelectedSeatId || '')
      setSelectedBoarderId(preSelectedBoarderId || '')
    }
  }, [isOpen, preSelectedSeatId, preSelectedBoarderId])

  // Automatically update default rent when selected seat changes
  useEffect(() => {
    if (selectedSeatId && availableSeats.length > 0) {
      const seat = availableSeats.find((s) => s.id === selectedSeatId)
      if (seat && seat.default_rent) {
        setMonthlyRent(seat.default_rent)
      }
    }
  }, [selectedSeatId, availableSeats])

  const handleSeatChange = (seatId: string) => {
    setSelectedSeatId(seatId)
    const seat = availableSeats.find((s) => s.id === seatId)
    if (seat) setMonthlyRent(seat.default_rent)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedBoarderId) {
      setErrorMsg('অনুগ্রহ করে একজন সক্রিয় বর্ডার বা অপেক্ষমান আবেদনকারী নির্বাচন করুন।')
      return
    }
    if (!selectedSeatId) {
      setErrorMsg('অনুগ্রহ করে একটি খালি সিট নির্বাচন করুন।')
      return
    }
    if (monthlyRent <= 0) {
      setErrorMsg('মাসিক সিট ভাড়া অবশ্যই ০ এর চেয়ে বেশি হতে হবে।')
      return
    }

    try {
      await allocateMutation.mutateAsync({
        boarderId: selectedBoarderId,
        seatId: selectedSeatId,
        monthlyRent,
        securityDeposit,
        startDate,
        remarks: remarks.trim() || undefined,
      })
      setIsSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'সিট বরাদ্দ ব্যর্থ হয়েছে।'
      setErrorMsg(errorMessage)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="নতুন সিট বরাদ্দ সম্পন্ন করুন (Seat Allocation)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>সিট বরাদ্দ সফলভাবে সম্পন্ন হয়েছে! সিটের স্ট্যাটাস 'OCCUPIED' এ পরিবর্তিত হলো।</span>
          </div>
        )}

        {/* Boarder Selection */}
        <div className="space-y-1.5">
          <label htmlFor="boarder-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary-400" />
            বর্ডার নির্বাচন করুন <span className="text-rose-400">*</span>
          </label>
          <select
            id="boarder-select"
            value={selectedBoarderId}
            onChange={(e) => setSelectedBoarderId(e.target.value)}
            disabled={Boolean(preSelectedBoarderId)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
          >
            <option value="">বর্ডার নির্বাচন করুন...</option>
            {eligibleBoarders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.full_name} ({b.boarder_code}) — {b.status === 'PENDING' ? '⏳ অপেক্ষমান আবেদন' : '✅ সক্রিয় বোর্ডার'} — {b.phone_number}
              </option>
            ))}
          </select>
          {isLoadingBoarders && (
            <p className="text-[11px] text-slate-400 mt-1">বর্ডার তালিকা লোড হচ্ছে...</p>
          )}
          {!isLoadingBoarders && eligibleBoarders.length === 0 && (
            <p className="text-[11px] text-amber-400 mt-1">
              বর্তমানে বরাদ্দহীন কোনো সক্রিয় বর্ডার বা অপেক্ষমান আবেদনকারী নেই।
            </p>
          )}
        </div>

        {/* Seat Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <BedDouble className="w-3.5 h-3.5 text-indigo-400" />
            খালি সিট নির্বাচন করুন <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedSeatId}
            onChange={(e) => handleSeatChange(e.target.value)}
            disabled={Boolean(preSelectedSeatId)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="">সিট নির্বাচন করুন...</option>
            {availableSeats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.seat_code} — {s.seat_name} ({s.flatCode}, {s.roomName}) — {formatCurrencyBn(s.default_rent)}
              </option>
            ))}
          </select>
          {availableSeats.length === 0 && (
            <p className="text-[11px] text-rose-400 mt-1">হোস্টেলে বর্তমানে কোনো খালি সিট নেই।</p>
          )}
        </div>

        {/* Rent & Security Deposit */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="number"
            label="মাসিক চুক্তিকৃত ভাড়া (৳)"
            value={monthlyRent || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyRent(Number(e.target.value))}
            placeholder="যেমন: ৪৫০০"
            required
            className="text-xs"
          />
          <Input
            type="number"
            label="সিকিউরিটি ডিপোজিট (৳)"
            value={securityDeposit || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecurityDeposit(Number(e.target.value))}
            placeholder="যেমন: ৫০০০"
            className="text-xs"
          />
        </div>

        {/* Start Date & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="বরাদ্দ শুরুর তারিখ"
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            required
            className="text-xs"
          />
          <Input
            label="মন্তব্য / বিশেষ শর্তাবলী"
            value={remarks}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)}
            placeholder="যেমন: উইন্ডো সাইড শর্তযুক্ত"
            className="text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={allocateMutation.isPending}>
            বাতিল
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={allocateMutation.isPending}
            disabled={!selectedBoarderId || !selectedSeatId}
          >
            সিট বরাদ্দ নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default AllocateSeatModal

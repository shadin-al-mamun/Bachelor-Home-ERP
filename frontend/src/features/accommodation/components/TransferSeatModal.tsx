import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAccommodation, type RoomWithSeats, type FlatWithRooms, type BuildingWithFlats } from '../api/useAccommodation'
import { useTransferSeatMutation } from '../api/useSeatAllocations'
import { formatCurrencyBn } from '@/utils/date'
import type { Seat } from '@/types/database'
import { ArrowRightLeft, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface CurrentAllocationTransferInfo {
  allocationId: string
  boarderId: string
  boarderName: string
  boarderCode: string
  currentSeatId: string
  currentSeatCode: string
  currentRent: number
}

interface TransferSeatModalProps {
  isOpen: boolean
  onClose: () => void
  currentAllocation: CurrentAllocationTransferInfo | null
}

interface AvailableSeat extends Seat {
  occupant_name?: string
  buildingName: string
  flatCode: string
  roomName: string
}

export const TransferSeatModal: React.FC<TransferSeatModalProps> = ({
  isOpen,
  onClose,
  currentAllocation,
}) => {
  const { data: seatMatrix = [] } = useAccommodation()
  const [newSeatId, setNewSeatId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const transferMutation = useTransferSeatMutation()

  // Build available seats excluding the current one
  const availableSeats: AvailableSeat[] = (seatMatrix as BuildingWithFlats[]).flatMap(
    (b: BuildingWithFlats) =>
      (b.flats || []).flatMap((f: FlatWithRooms) =>
        (f.rooms || []).flatMap((r: RoomWithSeats) =>
          (r.seats || [])
            .filter((s) => s.status === 'AVAILABLE' && s.id !== currentAllocation?.currentSeatId)
            .map((s) => ({
              ...s,
              buildingName: b.name,
              flatCode: f.flat_code,
              roomName: r.name,
            }))
        )
      )
  )

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setIsSuccess(false)
      setNewSeatId('')
      setReason('')
      setEffectiveDate(new Date().toISOString().slice(0, 10))
    }
  }, [isOpen])

  if (!currentAllocation) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!newSeatId) {
      setErrorMsg('অনুগ্রহ করে স্থানান্তরের জন্য একটি নতুন খালি সিট নির্বাচন করুন।')
      return
    }
    if (!reason.trim()) {
      setErrorMsg('অনুগ্রহ করে সিট স্থানান্তরের কারণ উল্লেখ করুন।')
      return
    }

    try {
      await transferMutation.mutateAsync({
        allocationId: currentAllocation.allocationId,
        newSeatId,
        effectiveDate,
        reason: reason.trim(),
      })
      setIsSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'সিট স্থানান্তর প্রক্রিয়া ব্যর্থ হয়েছে।'
      setErrorMsg(errorMessage)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="সিট স্থানান্তর প্রক্রিয়া (Seat Transfer)"
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
            <span>সিট স্থানান্তর সফলভাবে সম্পন্ন হয়েছে! পূর্বের সিট খালি হয়েছে এবং নতুন সিট বরাদ্দ হয়েছে।</span>
          </div>
        )}

        {/* Current Allocation Summary Banner */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">বর্ডার ও আইডি</span>
            <span className="text-white font-bold text-sm block">{currentAllocation.boarderName}</span>
            <span className="text-slate-500 font-mono">{currentAllocation.boarderCode}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block mb-0.5">বর্তমান সিট</span>
            <span className="text-amber-400 font-mono font-bold text-base block">
              {currentAllocation.currentSeatCode}
            </span>
            <span className="text-slate-400 font-medium">ভাড়া: {formatCurrencyBn(currentAllocation.currentRent)}</span>
          </div>
        </div>

        {/* New Target Seat Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-primary-400" />
            নতুন গন্তব্য সিট নির্বাচন করুন <span className="text-rose-400">*</span>
          </label>
          <select
            value={newSeatId}
            onChange={(e) => setNewSeatId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500 font-mono"
            required
          >
            <option value="">নতুন সিট বেছে নিন...</option>
            {availableSeats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.seat_code} — {s.seat_name} ({s.flatCode}, {s.roomName}) — {formatCurrencyBn(s.default_rent)}
              </option>
            ))}
          </select>
          {availableSeats.length === 0 && (
            <p className="text-[11px] text-rose-400 mt-1">
              স্থানান্তরের জন্য বর্তমানে কোনো খালি সিট অবশিষ্ট নেই।
            </p>
          )}
        </div>

        {/* Effective Transfer Date */}
        <Input
          type="date"
          label="স্থানান্তরের কার্যকর তারিখ"
          value={effectiveDate}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEffectiveDate(e.target.value)}
          required
          className="text-xs"
        />

        {/* Reason */}
        <Input
          label="সিট স্থানান্তরের কারণ"
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          placeholder="যেমন: উইন্ডো সাইড প্রয়োজন, রুমমেট পরিবর্তনের অনুরোধ..."
          required
          className="text-xs"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={transferMutation.isPending}>
            বাতিল
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={transferMutation.isPending}
            disabled={!newSeatId || !reason.trim()}
          >
            স্থানান্তর নিশ্চিত করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default TransferSeatModal

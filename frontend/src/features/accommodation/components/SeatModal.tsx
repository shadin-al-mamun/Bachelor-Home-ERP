import React, { useState, useEffect } from 'react'
import { Modal, Input, Select, Button } from '@/components/common'
import { useCreateSeat, useUpdateSeat, useRooms } from '../api/useAccommodation'
import type { Seat, SeatStatus } from '@/types/database'

interface SeatModalProps {
  isOpen: boolean
  onClose: () => void
  roomId?: string
  seatToEdit?: Seat | null
}

export const SeatModal: React.FC<SeatModalProps> = ({
  isOpen,
  onClose,
  roomId,
  seatToEdit,
}) => {
  const { data: rooms = [] } = useRooms()
  const createSeatMutation = useCreateSeat()
  const updateSeatMutation = useUpdateSeat()

  const [selectedRoomId, setSelectedRoomId] = useState(roomId || (rooms[0]?.id ?? ''))
  const [seatCode, setSeatCode] = useState('')
  const [seatName, setSeatName] = useState('')
  const [seatType, setSeatType] = useState('SINGLE_BED')
  const [defaultRent, setDefaultRent] = useState(4200)
  const [status, setStatus] = useState<SeatStatus>('AVAILABLE')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setErrorMsg(null)
    if (seatToEdit) {
      setSelectedRoomId(seatToEdit.room_id)
      setSeatCode(seatToEdit.seat_code)
      setSeatName(seatToEdit.seat_name)
      setSeatType(seatToEdit.seat_type)
      setDefaultRent(seatToEdit.default_rent)
      setStatus(seatToEdit.status || 'AVAILABLE')
      setDescription(seatToEdit.description || '')
    } else {
      setSelectedRoomId(roomId || (rooms[0]?.id ?? ''))
      setSeatCode('')
      setSeatName('')
      setSeatType('SINGLE_BED')
      setDefaultRent(4200)
      setStatus('AVAILABLE')
      setDescription('')
    }
  }, [seatToEdit, roomId, rooms, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    try {
      const finalCode = seatCode.trim() || seatName.trim() || 'S-' + Math.floor(100 + Math.random() * 900)
      const finalName = seatName.trim() || `সিট ${finalCode}`

      if (seatToEdit) {
        await updateSeatMutation.mutateAsync({
          id: seatToEdit.id,
          room_id: selectedRoomId,
          seat_code: finalCode,
          seat_name: finalName,
          seat_type: seatType,
          default_rent: Number(defaultRent),
          status,
          description: description.trim() || null,
        })
      } else {
        await createSeatMutation.mutateAsync({
          room_id: selectedRoomId || rooms[0]?.id,
          seat_code: finalCode,
          seat_name: finalName,
          seat_type: seatType,
          default_rent: Number(defaultRent),
          status,
          description: description.trim() || null,
        })
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save seat:', err)
      setErrorMsg(err.message || 'সিট সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')
    }
  }

  const roomOptions = rooms.map((r) => ({
    value: r.id,
    label: `${r.name} (${r.room_code})`,
  }))

  const statusOptions = [
    { value: 'AVAILABLE', label: 'খালি আছে (AVAILABLE)' },
    { value: 'OCCUPIED', label: 'পূর্ণ (OCCUPIED)' },
    { value: 'MAINTENANCE', label: 'মেরামত চলছে (MAINTENANCE)' },
    { value: 'INACTIVE', label: 'নিষ্ক্রিয় (INACTIVE)' },
  ]

  const seatTypeOptions = [
    { value: 'SINGLE_BED', label: 'সিঙ্গেল বেড (Single Bed)' },
    { value: 'UPPER_BUNK', label: 'উপরের বাঙ্ক বেড (Upper Bunk)' },
    { value: 'LOWER_BUNK', label: 'নিচের বাঙ্ক বেড (Lower Bunk)' },
  ]

  const isSaving = createSeatMutation.isPending || updateSeatMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={seatToEdit ? 'সিট তথ্য সম্পাদন (Edit Seat)' : 'নতুন সিট যুক্ত করুন'}
      description={
        seatToEdit
          ? 'সিটের নাম, কোড, ধরন ও মাসিক ভাড়া আপডেট করুন'
          : 'রুমের অধীনে নতুন সিট ও ডিফল্ট মাসিক ভাড়া নির্ধারণ করুন'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {roomOptions.length > 0 && (
          <Select
            label="রুম নির্বাচন করুন"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            options={roomOptions}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="সিট কোড (ঐচ্ছিক)"
            placeholder="যেমন: S-101-A বা 1"
            value={seatCode}
            onChange={(e) => setSeatCode(e.target.value)}
          />
          <Input
            label="সিটের নাম / বিবরণ"
            placeholder="যেমন: উইন্ডো সাইড বেড"
            value={seatName}
            onChange={(e) => setSeatName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Select
            label="সিটের ধরন"
            value={seatType}
            onChange={(e) => setSeatType(e.target.value)}
            options={seatTypeOptions}
            required
          />
          <Input
            label="ডিফল্ট ভাড়া (৳)"
            type="number"
            min={0}
            step={100}
            value={defaultRent}
            onChange={(e) => setDefaultRent(Number(e.target.value))}
            required
          />
          <Select
            label="প্রাথমিক স্ট্যাটাস"
            value={status}
            onChange={(e) => setStatus(e.target.value as SeatStatus)}
            options={statusOptions}
            required
          />
        </div>

        <Input
          label="মন্তব্য / সুবিধা"
          placeholder="যেমন: পড়ার টেবিল ও পাওয়ার সকেট সংযুক্ত"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {seatToEdit ? 'পরিবর্তন সংরক্ষণ করুন' : 'সিট সংরক্ষণ করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default SeatModal

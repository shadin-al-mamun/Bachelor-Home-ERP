import React, { useState, useEffect } from 'react'
import { Modal, Input, Select, Button } from '@/components/common'
import { useCreateRoom, useUpdateRoom, useFlats } from '../api/useAccommodation'
import type { Room, RoomStatus } from '@/types/database'

interface RoomModalProps {
  isOpen: boolean
  onClose: () => void
  flatId?: string
  roomToEdit?: Room | null
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  flatId,
  roomToEdit,
}) => {
  const { data: flats = [] } = useFlats()
  const createRoomMutation = useCreateRoom()
  const updateRoomMutation = useUpdateRoom()

  const [selectedFlatId, setSelectedFlatId] = useState(flatId || (flats[0]?.id ?? ''))
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('STANDARD')
  const [capacity, setCapacity] = useState(2)
  const [status, setStatus] = useState<RoomStatus>('ACTIVE')
  const [description, setDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setErrorMsg(null)
    if (roomToEdit) {
      setSelectedFlatId(roomToEdit.flat_id)
      setCode(roomToEdit.room_code)
      setName(roomToEdit.name)
      setRoomType(roomToEdit.room_type)
      setCapacity(roomToEdit.capacity)
      setStatus(roomToEdit.status || 'ACTIVE')
      setDescription(roomToEdit.description || '')
    } else {
      setSelectedFlatId(flatId || (flats[0]?.id ?? ''))
      setCode('')
      setName('')
      setRoomType('STANDARD')
      setCapacity(2)
      setStatus('ACTIVE')
      setDescription('')
    }
  }, [roomToEdit, flatId, flats, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    try {
      const finalCode = code.trim() || name.trim() || 'R-' + Math.floor(100 + Math.random() * 900)
      const finalName = name.trim() || finalCode

      if (roomToEdit) {
        await updateRoomMutation.mutateAsync({
          id: roomToEdit.id,
          flat_id: selectedFlatId,
          room_code: finalCode,
          name: finalName,
          room_type: roomType,
          capacity: Number(capacity),
          status,
          description: description.trim() || null,
        })
      } else {
        await createRoomMutation.mutateAsync({
          flat_id: selectedFlatId || flats[0]?.id,
          room_code: finalCode,
          name: finalName,
          room_type: roomType,
          capacity: Number(capacity),
          status,
          description: description.trim() || null,
        })
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save room:', err)
      setErrorMsg(err.message || 'রুম সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')
    }
  }

  const flatOptions = flats.map((f) => ({
    value: f.id,
    label: `${f.name} (${f.flat_code})`,
  }))

  const roomTypeOptions = [
    { value: 'STANDARD', label: 'স্ট্যান্ডার্ড রুম (Standard)' },
    { value: 'DELUXE', label: 'ডিলাক্স রুম (Deluxe)' },
    { value: 'MASTER', label: 'মাস্টার বেডরুম (Attached Bath)' },
  ]

  const statusOptions = [
    { value: 'ACTIVE', label: 'সক্রিয় (Active)' },
    { value: 'MAINTENANCE', label: 'মেরামত চলছে (Maintenance)' },
    { value: 'INACTIVE', label: 'নিষ্ক্রিয় (Inactive)' },
  ]

  const isSaving = createRoomMutation.isPending || updateRoomMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={roomToEdit ? 'রুমের তথ্য সম্পাদন (Edit Room)' : 'নতুন রুম যুক্ত করুন'}
      description={
        roomToEdit
          ? 'রুমের নাম, কোড, ধরন ও ধারণক্ষমতা আপডেট করুন'
          : 'ফ্ল্যাটের অধীনে নতুন রুম ও ধারণক্ষমতা নির্ধারণ করুন'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {flatOptions.length > 0 && (
          <Select
            label="ফ্ল্যাট নির্বাচন করুন"
            value={selectedFlatId}
            onChange={(e) => setSelectedFlatId(e.target.value)}
            options={flatOptions}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="রুম কোড (ঐচ্ছিক)"
            placeholder="যেমন: ROOM-202 বা A"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Input
            label="রুমের নাম"
            placeholder="যেমন: রুম ২০২ (দক্ষিণ দিক)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select
            label="রুমের ক্যাটাগরি"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            options={roomTypeOptions}
            required
          />
          <Input
            label="সিট ধারণক্ষমতা (Capacity)"
            type="number"
            min={1}
            max={8}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </div>

        <Select
          label="রুমের স্ট্যাটাস"
          value={status}
          onChange={(e) => setStatus(e.target.value as RoomStatus)}
          options={statusOptions}
          required
        />

        <Input
          label="সুবিধাসমূহ / বিবরণ"
          placeholder="যেমন: অ্যাটাচড ওয়াশরুম ও বারান্দা রয়েছে"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {roomToEdit ? 'পরিবর্তন সংরক্ষণ করুন' : 'রুম সংরক্ষণ করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RoomModal

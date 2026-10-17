import React, { useState } from 'react'
import { Modal, Input, Select, Button } from '@/components/common'
import { useCreateRoom, useFlats } from '../api/useAccommodation'

interface RoomModalProps {
  isOpen: boolean
  onClose: () => void
  flatId?: string
}

export const RoomModal: React.FC<RoomModalProps> = ({ isOpen, onClose, flatId }) => {
  const { data: flats = [] } = useFlats()
  const createRoomMutation = useCreateRoom()

  const [selectedFlatId, setSelectedFlatId] = useState(flatId || (flats[0]?.id ?? ''))
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [roomType, setRoomType] = useState('STANDARD')
  const [capacity, setCapacity] = useState(2)
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createRoomMutation.mutateAsync({
      flat_id: selectedFlatId || flats[0]?.id,
      room_code: code || 'ROOM-' + Math.floor(100 + Math.random() * 900),
      name,
      room_type: roomType,
      capacity: Number(capacity),
      description,
      status: 'ACTIVE',
    })
    onClose()
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="নতুন রুম যুক্ত করুন"
      description="ফ্ল্যাটের অধীনে নতুন রুম ও ধারণক্ষমতা নির্ধারণ করুন"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            label="রুম কোড"
            placeholder="যেমন: ROOM-202"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
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

        <Input
          label="সুবিধাসমূহ / বিবরণ"
          placeholder="যেমন: অ্যাটাচড ওয়াশরুম ও বারান্দা রয়েছে"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={createRoomMutation.isPending}>
            রুম সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default RoomModal

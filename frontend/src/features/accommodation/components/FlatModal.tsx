import React, { useState } from 'react'
import { Modal, Input, Select, Button } from '@/components/common'
import { useCreateFlat, useBuildings } from '../api/useAccommodation'

interface FlatModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId?: string
}

export const FlatModal: React.FC<FlatModalProps> = ({ isOpen, onClose, buildingId }) => {
  const { data: buildings = [] } = useBuildings()
  const createFlatMutation = useCreateFlat()

  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || (buildings[0]?.id ?? ''))
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [floorNumber, setFloorNumber] = useState(2)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createFlatMutation.mutateAsync({
      building_id: selectedBuildingId || buildings[0]?.id,
      flat_code: code || 'FLAT-' + Math.floor(10 + Math.random() * 90),
      name,
      floor_number: Number(floorNumber),
      status: 'ACTIVE',
    })
    onClose()
  }

  const buildingOptions = buildings.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.building_code})`,
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="নতুন ফ্ল্যাট যুক্ত করুন"
      description="বিল্ডিংয়ের অধীনে নতুন ফ্ল্যাট ও তলা নির্ধারণ করুন"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {buildingOptions.length > 0 && (
          <Select
            label="বিল্ডিং নির্বাচন করুন"
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            options={buildingOptions}
            required
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="ফ্ল্যাট কোড"
            placeholder="যেমন: FLAT-3B"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Input
            label="ফ্ল্যাটের নাম"
            placeholder="যেমন: ফ্ল্যাট ৩-বি"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <Input
          label="ফ্লোর নম্বর (Floor)"
          type="number"
          min={0}
          value={floorNumber}
          onChange={(e) => setFloorNumber(Number(e.target.value))}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={createFlatMutation.isPending}>
            ফ্ল্যাট সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default FlatModal

import React, { useState } from 'react'
import { Modal, Input, Button } from '@/components/common'
import { useCreateBuilding } from '../api/useAccommodation'

interface BuildingModalProps {
  isOpen: boolean
  onClose: () => void
}

export const BuildingModal: React.FC<BuildingModalProps> = ({ isOpen, onClose }) => {
  const createBuildingMutation = useCreateBuilding()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createBuildingMutation.mutateAsync({
      building_code: code || 'BLD-' + Math.floor(100 + Math.random() * 900),
      name,
      address,
      description,
      status: 'ACTIVE',
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="নতুন হোস্টেল বিল্ডিং যুক্ত করুন"
      description="ক্যাম্পাস বা নতুন আবাসিক ভবনের বিবরণ লিখুন"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Input
            label="বিল্ডিং কোড"
            placeholder="যেমন: BLD-02"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Input
            label="বিল্ডিংয়ের নাম"
            placeholder="যেমন: পদ্মা হোস্টেল ভবন"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <Input
          label="পূর্ণ ঠিকানা"
          placeholder="বাড়ি নং, রোড নং, এলাকা"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />

        <Input
          label="সুবিধাসমূহ / বিবরণ"
          placeholder="যেমন: লিফট, জেনারেটর, সিসিটিভি"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={createBuildingMutation.isPending}>
            সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BuildingModal

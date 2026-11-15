import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Input, Button } from '@/components/common'
import { useCreateBuilding, useUpdateBuilding, useAccommodation } from '../api/useAccommodation'
import type { Building, BuildingStatus } from '@/types/database'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

interface BuildingModalProps {
  isOpen: boolean
  onClose: () => void
  buildingToEdit?: Building | null
}

export const BuildingModal: React.FC<BuildingModalProps> = ({
  isOpen,
  onClose,
  buildingToEdit,
}) => {
  const createBuildingMutation = useCreateBuilding()
  const updateBuildingMutation = useUpdateBuilding()
  const { data: hierarchy = [] } = useAccommodation()

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<BuildingStatus>('ACTIVE')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setErrorMsg(null)
    if (buildingToEdit) {
      setCode(buildingToEdit.building_code || '')
      setName(buildingToEdit.name || '')
      setAddress(buildingToEdit.address || '')
      setDescription(buildingToEdit.description || '')
      setStatus(buildingToEdit.status || 'ACTIVE')
    } else {
      setCode('')
      setName('')
      setAddress('')
      setDescription('')
      setStatus('ACTIVE')
    }
  }, [buildingToEdit, isOpen])

  // Count active boarders currently residing in this building
  const occupiedBoardersCount = useMemo(() => {
    if (!buildingToEdit) return 0
    const bData = hierarchy.find((b) => b.id === buildingToEdit.id)
    if (!bData) return 0
    return (bData.flats || []).flatMap((f) =>
      (f.rooms || []).flatMap((r) =>
        (r.seats || []).filter((s: any) => s.status === 'OCCUPIED' || Boolean(s.occupant_name))
      )
    ).length
  }, [buildingToEdit, hierarchy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    try {
      if (buildingToEdit) {
        await updateBuildingMutation.mutateAsync({
          id: buildingToEdit.id,
          building_code: code.trim(),
          name: name.trim(),
          address: address.trim(),
          description: description.trim() || null,
          status,
        })
      } else {
        await createBuildingMutation.mutateAsync({
          building_code: code.trim() || 'BLD-' + Math.floor(100 + Math.random() * 900),
          name: name.trim(),
          address: address.trim(),
          description: description.trim() || null,
          status,
        })
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save building:', err)
      setErrorMsg(err.message || 'বিল্ডিং তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।')
    }
  }

  const isSaving = createBuildingMutation.isPending || updateBuildingMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={buildingToEdit ? 'বিল্ডিং সম্পাদনা ও স্ট্যাটাস পরিবর্তন' : 'নতুন হোস্টেল বিল্ডিং যুক্ত করুন'}
      description={
        buildingToEdit
          ? 'বিল্ডিংয়ের নাম, ঠিকানা ও সক্রিয়/নিষ্ক্রিয় স্ট্যাটাস হালনাগাদ করুন'
          : 'ক্যাম্পাস বা নতুন আবাসিক ভবনের বিবরণ লিখুন'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

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

        {/* Status Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-slate-300">
            বিল্ডিং স্ট্যাটাস (Building Status)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setStatus('ACTIVE')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                status === 'ACTIVE'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold block text-white">সক্রিয় (Active)</span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  ক্যাম্পাস চালু রয়েছে ও সিট বুকিং সচল
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatus('INACTIVE')}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                status === 'INACTIVE'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  status === 'INACTIVE' ? 'text-rose-400' : 'text-slate-500'
                }`}
              />
              <div>
                <span className="text-xs font-bold block text-white">নিষ্ক্রিয় (Inactive)</span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                  বিল্ডিং ছেড়ে দেওয়া হয়েছে / বন্ধ রয়েছে
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Active Boarders Warning if INACTIVE is chosen */}
        {status === 'INACTIVE' && occupiedBoardersCount > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>সতর্কবার্তা: এই ভবনে সক্রিয় বর্ডার বসবাস করছেন!</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              এই বিল্ডিংয়ের ফ্ল্যাটগুলোতে বর্তমানে <span className="font-bold underline text-white">{occupiedBoardersCount} জন</span> সক্রিয় বর্ডার অবস্থান করছেন।
              বিল্ডিং ছেড়ে দেওয়ার পূর্বে উক্ত বর্ডারদের অন্য ভবনে সিট বদলি (Transfer) অথবা সিট বাতিল/রিলিজ নিশ্চিত করুন।
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {buildingToEdit ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default BuildingModal

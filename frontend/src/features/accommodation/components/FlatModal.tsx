import React, { useState, useEffect, useMemo } from 'react'
import { Modal, Input, Select, Button } from '@/components/common'
import { useCreateFlat, useUpdateFlat, useBuildings, useAccommodation } from '../api/useAccommodation'
import type { Flat, FlatStatus } from '@/types/database'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

interface FlatModalProps {
  isOpen: boolean
  onClose: () => void
  buildingId?: string
  flatToEdit?: Flat | null
}

export const FlatModal: React.FC<FlatModalProps> = ({
  isOpen,
  onClose,
  buildingId,
  flatToEdit,
}) => {
  const { data: buildings = [] } = useBuildings()
  const { data: hierarchy = [] } = useAccommodation()
  const createFlatMutation = useCreateFlat()
  const updateFlatMutation = useUpdateFlat()

  const [selectedBuildingId, setSelectedBuildingId] = useState(
    buildingId || flatToEdit?.building_id || (buildings[0]?.id ?? '')
  )
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [floorNumber, setFloorNumber] = useState(2)
  const [status, setStatus] = useState<FlatStatus>('ACTIVE')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    setErrorMsg(null)
    if (flatToEdit) {
      setSelectedBuildingId(flatToEdit.building_id)
      setCode(flatToEdit.flat_code || '')
      setName(flatToEdit.name || '')
      setFloorNumber(flatToEdit.floor_number ?? 1)
      setStatus(flatToEdit.status || 'ACTIVE')
    } else {
      setSelectedBuildingId(buildingId || (buildings[0]?.id ?? ''))
      setCode('')
      setName('')
      setFloorNumber(2)
      setStatus('ACTIVE')
    }
  }, [flatToEdit, buildingId, buildings, isOpen])

  // Count active boarders currently residing in this flat
  const occupiedBoardersCount = useMemo(() => {
    if (!flatToEdit) return 0
    const allFlats = hierarchy.flatMap((b) => b.flats || [])
    const currentFlat = allFlats.find((f) => f.id === flatToEdit.id)
    if (!currentFlat) return 0
    return (currentFlat.rooms || []).flatMap((r) =>
      (r.seats || []).filter((s: any) => s.status === 'OCCUPIED' || Boolean(s.occupant_name))
    ).length
  }, [flatToEdit, hierarchy])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    try {
      if (flatToEdit) {
        await updateFlatMutation.mutateAsync({
          id: flatToEdit.id,
          building_id: selectedBuildingId || flatToEdit.building_id,
          flat_code: code.trim(),
          name: name.trim(),
          floor_number: Number(floorNumber),
          status,
        })
      } else {
        await createFlatMutation.mutateAsync({
          building_id: selectedBuildingId || buildings[0]?.id,
          flat_code: code.trim() || 'FLAT-' + Math.floor(10 + Math.random() * 90),
          name: name.trim(),
          floor_number: Number(floorNumber),
          status,
        })
      }
      onClose()
    } catch (err: any) {
      console.error('Failed to save flat:', err)
      setErrorMsg(err.message || 'ফ্ল্যাটের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।')
    }
  }

  const buildingOptions = buildings.map((b) => ({
    value: b.id,
    label: `${b.name} (${b.building_code})`,
  }))

  const isSaving = createFlatMutation.isPending || updateFlatMutation.isPending

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={flatToEdit ? 'ফ্ল্যাট সম্পাদনা ও স্ট্যাটাস পরিবর্তন' : 'নতুন ফ্ল্যাট যুক্ত করুন'}
      description={
        flatToEdit
          ? 'ফ্ল্যাটের নাম, কোড, ফ্লোর এবং সক্রিয়/নিষ্ক্রিয় স্ট্যাটাস হালনাগাদ করুন'
          : 'বিল্ডিংয়ের অধীনে নতুন ফ্ল্যাট ও তলা নির্ধারণ করুন'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

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

        {/* Status Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-medium text-slate-300">
            ফ্ল্যাট স্ট্যাটাস (Flat Status)
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
                  ফ্ল্যাট চালু রয়েছে ও সিট বরাদ্দ করা যাবে
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
                  ফ্ল্যাট ছেড়ে দেওয়া হয়েছে / বন্ধ রয়েছে
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
              <span>সতর্কবার্তা: এই ফ্ল্যাটে সক্রিয় বর্ডার বসবাস করছেন!</span>
            </div>
            <p className="leading-relaxed text-[11.5px]">
              এই ফ্ল্যাটে বর্তমানে <span className="font-bold underline text-white">{occupiedBoardersCount} জন</span> সক্রিয় বর্ডার অবস্থান করছেন।
              ফ্ল্যাটটি নিষ্ক্রিয় করার পূর্বে উক্ত বর্ডারদের অন্য ফ্ল্যাটে ট্রান্সফার করুন অথবা সিট খালি (রিলিজ/প্রস্থান) নিশ্চিত করুন।
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            বাতিল
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {flatToEdit ? 'আপডেট করুন' : 'ফ্ল্যাট সংরক্ষণ করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default FlatModal

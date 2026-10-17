import React, { useState, useEffect } from 'react'
import { X, Building2, Check, Shield, Save } from 'lucide-react'
import {
  type UserManagementItem,
  useAllBuildingsAndFlats,
  useUpdateUserFlatAssignments,
} from '../api/useUserManagement'
import { useAuthStore } from '../../../app/store/useAuthStore'

interface FlatAssignmentModalProps {
  user: UserManagementItem | null
  onClose: () => void
}

export const FlatAssignmentModal: React.FC<FlatAssignmentModalProps> = ({ user, onClose }) => {
  const { profile: currentUser } = useAuthStore()
  const { data: buildingsData, isLoading: isBuildingsLoading } = useAllBuildingsAndFlats()
  const updateAssignmentsMutation = useUpdateUserFlatAssignments()

  const [selectedFlatIds, setSelectedFlatIds] = useState<Set<string>>(new Set())
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (user) {
      const initial = new Set(user.assigned_flats.map((af) => af.flat_id))
      setSelectedFlatIds(initial)
      setIsSuccess(false)
      setErrorMessage('')
    }
  }, [user])

  if (!user) return null

  const toggleFlat = (flatId: string) => {
    const updated = new Set(selectedFlatIds)
    if (updated.has(flatId)) {
      updated.delete(flatId)
    } else {
      updated.add(flatId)
    }
    setSelectedFlatIds(updated)
  }

  const toggleBuildingAll = (flatIds: string[]) => {
    const allSelected = flatIds.every((id) => selectedFlatIds.has(id))
    const updated = new Set(selectedFlatIds)
    if (allSelected) {
      flatIds.forEach((id) => updated.delete(id))
    } else {
      flatIds.forEach((id) => updated.add(id))
    }
    setSelectedFlatIds(updated)
  }

  const handleSave = async () => {
    setErrorMessage('')
    try {
      await updateAssignmentsMutation.mutateAsync({
        userId: user.id,
        flatIds: Array.from(selectedFlatIds),
        assignedBy: currentUser?.id,
      })
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setErrorMessage(err.message || 'ফ্ল্যাট পারমিশন সংরক্ষণ ব্যর্থ হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>ফ্ল্যাট দায়িত্ব অ্যাসাইনমেন্ট (Flat Authorization)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ব্যবহারকারী: <span className="font-semibold text-slate-200">{user.full_name}</span> ({user.role})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
            <span>
              নির্বাচিত ফ্ল্যাটসমূহের ভাড়াটিয়া, মিল ও খরচের হিসাব শুধুমাত্র এই ইউজারের কাছে দৃশ্যমান ও অ্যাক্সেসযোগ্য থাকবে (Row Level Security & Flat Scope Isolation)।
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>ফ্ল্যাট পারমিশন সফলভাবে হালনাগাদ করা হয়েছে!</span>
            </div>
          )}

          {isBuildingsLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="inline-block w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
              <p>বিল্ডিং ও ফ্ল্যাট তালিকা লোড হচ্ছে...</p>
            </div>
          ) : (buildingsData ?? []).length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              কোনো সক্রিয় বিল্ডিং বা ফ্ল্যাট ডাটাবেসে নেই।
            </div>
          ) : (
            <div className="space-y-4">
              {buildingsData!.map((b: any) => {
                const flatList = (b.flats ?? []) as any[]
                const buildingFlatIds = flatList.map((f) => f.id)
                const isAllSelected = buildingFlatIds.length > 0 && buildingFlatIds.every((id) => selectedFlatIds.has(id))
                const selectedCount = buildingFlatIds.filter((id) => selectedFlatIds.has(id)).length

                return (
                  <div key={b.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white">
                          {b.name} <span className="font-mono text-slate-500">({b.building_code})</span>
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          ({selectedCount} / {flatList.length} নির্বাচিত)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBuildingAll(buildingFlatIds)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {isAllSelected ? 'সব বাদ দিন (Deselect All)' : 'সব নির্বাচন (Select All)'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {flatList.map((f: any) => {
                        const isChecked = selectedFlatIds.has(f.id)
                        return (
                          <label
                            key={f.id}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked
                                ? 'bg-indigo-600/20 border-indigo-500/60 text-white'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="font-medium truncate">{f.name}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleFlat(f.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-900 ml-2"
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/70 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            মোট নির্বাচিত ফ্ল্যাট: <span className="font-bold text-white">{selectedFlatIds.size}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updateAssignmentsMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateAssignmentsMutation.isPending || isSuccess}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{updateAssignmentsMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'পারমিশন সেভ করুন'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

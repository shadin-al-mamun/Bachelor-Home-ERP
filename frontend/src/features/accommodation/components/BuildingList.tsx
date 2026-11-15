import React, { useState, useMemo } from 'react'
import {
  Building as BuildingIcon,
  Plus,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Edit3,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useBuildings } from '../api/useAccommodation'
import type { Building } from '@/types/database'
import BuildingModal from './BuildingModal'

export const BuildingList: React.FC = () => {
  const { data: buildings = [], isLoading } = useBuildings()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const filteredBuildings = useMemo(() => {
    if (statusFilter === 'ALL') return buildings
    return buildings.filter((b) => b.status === statusFilter)
  }, [buildings, statusFilter])

  const activeCount = useMemo(() => buildings.filter((b) => b.status === 'ACTIVE').length, [buildings])
  const inactiveCount = useMemo(() => buildings.filter((b) => b.status === 'INACTIVE').length, [buildings])

  const handleEdit = (building: Building) => {
    setEditingBuilding(building)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingBuilding(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <BuildingIcon className="w-5 h-5 text-primary-400" />
            <span>হোস্টেল ভবন ও ক্যাম্পাস ডিরেক্টরি (Building Directory)</span>
          </h3>
          <p className="text-xs text-slate-400">
            হোস্টেলের সক্রিয় ও নিষ্ক্রিয় ভবনসমূহ পরিচালনা করুন এবং প্রয়োজন অনুযায়ী স্ট্যাটাস পরিবর্তন করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'ALL'
                ? 'bg-primary-600 text-white'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              সকল ({buildings.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
                }`}
            >
              সক্রিয় ({activeCount})
            </button>
            {inactiveCount > 0 && (
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === 'INACTIVE'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
                  }`}
              >
                নিষ্ক্রিয় ({inactiveCount})
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            নতুন বিল্ডিং
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-400 p-8 text-center">লোড হচ্ছে...</div>
      ) : filteredBuildings.length === 0 ? (
        <Card variant="glass" className="p-8 text-center border-slate-800">
          <p className="text-sm text-slate-400">কোনো ভবন পাওয়া যায়নি।</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBuildings.map((b) => {
            const isInactive = b.status === 'INACTIVE'

            return (
              <Card
                key={b.id}
                variant="glass"
                className={`p-5 transition-colors ${isInactive
                  ? 'border-rose-900/40 bg-slate-950/70 opacity-80'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                  }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{b.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary-600/15 text-primary-400 border border-primary-500/30">
                        {b.building_code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{b.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        নিষ্ক্রিয় / ছেড়ে দেওয়া
                      </span>
                    ) : (
                      <Badge status={b.status} showDot={true}>
                        সক্রিয় (Active)
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(b)}
                      className="text-xs py-1 px-2.5 border-slate-700 hover:border-primary-500 text-slate-300 hover:text-white"
                      leftIcon={<Edit3 className="w-3.5 h-3.5 text-primary-400" />}
                      title="বিল্ডিং সম্পাদনা ও স্ট্যাটাস পরিবর্তন"
                    >
                      সম্পাদনা
                    </Button>
                  </div>
                </div>

                {b.description && (
                  <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 leading-relaxed">
                    {b.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  {isInactive ? (
                    <span className="flex items-center gap-1 text-rose-400 font-medium text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      এই ক্যাম্পাসটি বর্তমানে ছেড়ে দেওয়া হয়েছে বা বন্ধ রয়েছে
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      সক্রিয় ক্যাম্পাস
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 font-mono">ID: {b.id.substring(0, 8)}...</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <BuildingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingBuilding(null)
        }}
        buildingToEdit={editingBuilding}
      />
    </div>
  )
}

export default BuildingList

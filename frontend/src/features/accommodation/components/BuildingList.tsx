import React, { useState } from 'react'
import { Building as BuildingIcon, Plus, MapPin, CheckCircle2 } from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useBuildings } from '../api/useAccommodation'
import BuildingModal from './BuildingModal'

export const BuildingList: React.FC = () => {
  const { data: buildings = [], isLoading } = useBuildings()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <BuildingIcon className="w-5 h-5 text-primary-400" />
            <span>হোস্টেল ভবন তালিকা (Building Directory)</span>
          </h3>
          <p className="text-xs text-slate-400">
            সকল সক্রিয় হোস্টেল ভবন ও ক্যাম্পাসের তালিকা
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          নতুন বিল্ডিং
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-400 p-8 text-center">লোড হচ্ছে...</div>
      ) : buildings.length === 0 ? (
        <Card variant="glass" className="p-8 text-center border-slate-800">
          <p className="text-sm text-slate-400">কোনো ভবন পাওয়া যায়নি।</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {buildings.map((b) => (
            <Card key={b.id} variant="glass" className="p-5 border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
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

                <Badge status={b.status} showDot={true}>
                  {b.status}
                </Badge>
              </div>

              {b.description && (
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80 leading-relaxed">
                  {b.description}
                </p>
              )}

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  সক্রিয় ক্যাম্পাস
                </span>
                <span className="text-[11px] text-slate-500">ID: {b.id.substring(0, 8)}...</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BuildingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}

export default BuildingList

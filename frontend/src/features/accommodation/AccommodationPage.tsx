import React, { useState } from 'react'
import {
  BedDouble,
  Building,
  DoorOpen,
  Sparkles,
} from 'lucide-react'
import SeatMatrixView from './components/SeatMatrixView'
import BuildingList from './components/BuildingList'
import FlatList from './components/FlatList'

export const AccommodationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SEATS' | 'BUILDINGS' | 'FLATS'>('SEATS')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-600/10 border border-primary-500/30 text-primary-300 text-[11px] font-medium mb-1">
            <Sparkles className="w-3 h-3 text-primary-400" />
            <span>Accommodation Hierarchy & Inventory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            আবাসন ও সিট ব্যবস্থাপনা
          </h1>
          <p className="text-xs text-slate-400">
            বিল্ডিং, ফ্ল্যাট, রুম ও ইন্টারঅ্যাক্টিভ সিট অকুপেন্সি গ্রিড পরিচালনা করুন
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 rounded-2xl glass-card border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('SEATS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'SEATS'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>সিট ম্যাট্রিক্স</span>
          </button>

          <button
            onClick={() => setActiveTab('BUILDINGS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'BUILDINGS'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>বিল্ডিং</span>
          </button>

          <button
            onClick={() => setActiveTab('FLATS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'FLATS'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            <span>ফ্ল্যাট ও রুম</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'SEATS' && (
        <SeatMatrixView
          onAllocateSeat={(seatId) => {
            console.log('Open allocate modal for seat:', seatId)
          }}
        />
      )}

      {activeTab === 'BUILDINGS' && <BuildingList />}

      {activeTab === 'FLATS' && <FlatList />}
    </div>
  )
}

export default AccommodationPage

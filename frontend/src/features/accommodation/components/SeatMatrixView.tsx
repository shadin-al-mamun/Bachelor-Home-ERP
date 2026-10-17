import React, { useState } from 'react'
import {
  BedDouble,
  Plus,
  Filter,
  User,
  Wrench,
  Ban,
  CheckCircle2,
  DollarSign,
  Search,
  ArrowRightLeft,
  LogOut,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useSeats, useBuildings, useFlats, useUpdateSeatStatus } from '../api/useAccommodation'
import { formatBDT } from '@/utils/date'
import SeatModal from './SeatModal'
import AllocateSeatModal from './AllocateSeatModal'
import TransferSeatModal, { type CurrentAllocationTransferInfo } from './TransferSeatModal'
import CancelAllocationModal, { type AllocationCancelInfo } from './CancelAllocationModal'
import type { SeatStatus } from '@/types/database'

interface SeatMatrixViewProps {
  onAllocateSeat?: (seatId: string) => void
}

export const SeatMatrixView: React.FC<SeatMatrixViewProps> = ({ onAllocateSeat }) => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL')
  const [selectedFlat, setSelectedFlat] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false)
  const [allocatingSeatId, setAllocatingSeatId] = useState<string | null>(null)
  const [transferringAllocation, setTransferringAllocation] = useState<CurrentAllocationTransferInfo | null>(null)
  const [cancellingAllocation, setCancellingAllocation] = useState<AllocationCancelInfo | null>(null)

  const { data: buildings = [] } = useBuildings()
  const { data: flats = [] } = useFlats(selectedBuilding !== 'ALL' ? selectedBuilding : undefined)
  const { data: seats = [], isLoading } = useSeats({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })

  const updateSeatStatusMutation = useUpdateSeatStatus()

  // Filter seats based on inputs
  const filteredSeats = seats.filter((seat) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchCode = seat.seat_code.toLowerCase().includes(q)
      const matchName = seat.seat_name.toLowerCase().includes(q)
      const matchOccupant = seat.occupant_name?.toLowerCase().includes(q)
      if (!matchCode && !matchName && !matchOccupant) return false
    }
    return true
  })

  const countByStatus = {
    TOTAL: seats.length,
    AVAILABLE: seats.filter((s) => s.status === 'AVAILABLE').length,
    OCCUPIED: seats.filter((s) => s.status === 'OCCUPIED').length,
    MAINTENANCE: seats.filter((s) => s.status === 'MAINTENANCE').length,
    INACTIVE: seats.filter((s) => s.status === 'INACTIVE').length,
  }

  const handleQuickStatusChange = (seatId: string, currentStatus: SeatStatus) => {
    const nextStatus: SeatStatus =
      currentStatus === 'AVAILABLE'
        ? 'MAINTENANCE'
        : currentStatus === 'MAINTENANCE'
        ? 'AVAILABLE'
        : 'AVAILABLE'
    updateSeatStatusMutation.mutate({ seatId, status: nextStatus })
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar & Actions */}
      <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-primary-400" />
              <span>ইন্টারঅ্যাক্টিভ সিট অকুপেন্সি গ্রিড (Seat Grid)</span>
            </h2>
            <p className="text-xs text-slate-400">
              হোস্টেলের প্রতিটি রুমের সিটের লাইভ স্ট্যাটাস ও বুকিং মনিটর
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSeatModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            নতুন সিট তৈরি করুন
          </Button>
        </div>

        {/* Quick KPI Counts Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              statusFilter === 'ALL'
                ? 'bg-primary-600/15 border-primary-500/40'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-medium">মোট সিট সংখ্যা</span>
            <span className="text-lg font-bold text-white tracking-tight">{countByStatus.TOTAL}</span>
          </button>

          <button
            onClick={() => setStatusFilter('AVAILABLE')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              statusFilter === 'AVAILABLE'
                ? 'bg-emerald-500/15 border-emerald-500/40'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-emerald-400 block font-medium">খালি সিট (Available)</span>
            <span className="text-lg font-bold text-emerald-300 tracking-tight">{countByStatus.AVAILABLE}</span>
          </button>

          <button
            onClick={() => setStatusFilter('OCCUPIED')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              statusFilter === 'OCCUPIED'
                ? 'bg-indigo-500/15 border-indigo-500/40'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-indigo-400 block font-medium">বরাদ্দকৃত (Occupied)</span>
            <span className="text-lg font-bold text-indigo-300 tracking-tight">{countByStatus.OCCUPIED}</span>
          </button>

          <button
            onClick={() => setStatusFilter('MAINTENANCE')}
            className={`p-2.5 rounded-xl border text-left transition-all ${
              statusFilter === 'MAINTENANCE'
                ? 'bg-amber-500/15 border-amber-500/40'
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span className="text-[10px] text-amber-400 block font-medium">মেরামত চলছে</span>
            <span className="text-lg font-bold text-amber-300 tracking-tight">{countByStatus.MAINTENANCE}</span>
          </button>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="সিট কোড বা বর্ডার নাম দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value)
                setSelectedFlat('ALL')
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="ALL">সকল বিল্ডিং (All Buildings)</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedFlat}
              onChange={(e) => setSelectedFlat(e.target.value)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              <option value="ALL">সকল ফ্ল্যাট (All Flats)</option>
              {flats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Visual Seat Matrix Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          সিটের তথ্য লোড হচ্ছে...
        </div>
      ) : filteredSeats.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-800 space-y-3">
          <BedDouble className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-300 font-semibold">কোনো সিট পাওয়া যায়নি</p>
          <p className="text-xs text-slate-500">ফিল্টার পরিবর্তন করুন বা নতুন সিট যুক্ত করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSeats.map((seat) => {
            const isAvailable = seat.status === 'AVAILABLE'
            const isOccupied = seat.status === 'OCCUPIED'
            const isMaintenance = seat.status === 'MAINTENANCE'

            return (
              <Card
                key={seat.id}
                variant="glass"
                className={`transition-all duration-300 border ${
                  isAvailable
                    ? 'hover:border-emerald-500/50 hover:shadow-glow-emerald border-emerald-500/20 bg-slate-900/70'
                    : isOccupied
                    ? 'hover:border-indigo-500/50 hover:shadow-glow-primary border-indigo-500/20 bg-slate-900/70'
                    : isMaintenance
                    ? 'border-amber-500/20 bg-slate-900/70'
                    : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Card Header: Code & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isAvailable
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : isOccupied
                            ? 'bg-indigo-500/15 text-indigo-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        <BedDouble className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-white block tracking-tight font-mono">
                          {seat.seat_code}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                          {seat.seat_name}
                        </span>
                      </div>
                    </div>

                    <Badge status={seat.status} showDot={true}>
                      {seat.status === 'AVAILABLE'
                        ? 'খালি'
                        : seat.status === 'OCCUPIED'
                        ? 'বরাদ্দকৃত'
                        : seat.status === 'MAINTENANCE'
                        ? 'মেরামত'
                        : 'নিষ্ক্রিয়'}
                    </Badge>
                  </div>

                  {/* Rent and Room Info */}
                  <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">মাসিক ডিফল্ট ভাড়া:</span>
                      <span className="font-semibold text-emerald-400 flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                        {formatBDT(seat.default_rent)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">সিটের ধরন:</span>
                      <span className="font-medium text-slate-200">
                        {seat.seat_type === 'SINGLE_BED' ? 'সিঙ্গেল বেড' : seat.seat_type}
                      </span>
                    </div>
                  </div>

                  {/* Occupant or Maintenance Status Info */}
                  {isOccupied && (
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-200">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-semibold truncate">{seat.occupant_name || 'বর্ডার বরাদ্দ'}</span>
                      </div>
                      <span className="text-[10px] text-indigo-300 font-mono">সক্রিয়</span>
                    </div>
                  )}

                  {isMaintenance && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>রক্ষণাবেক্ষণ চলছে • সাময়িক বুকিং স্থগিত</span>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/60">
                    {isAvailable ? (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full text-xs py-1.5"
                        onClick={() => {
                          setAllocatingSeatId(seat.id)
                          onAllocateSeat?.(seat.id)
                        }}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        সিট বরাদ্দ করুন (Allocate)
                      </Button>
                    ) : isOccupied ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[11px] py-1 text-primary-400 border-primary-500/30 hover:bg-primary-500/10"
                          onClick={() =>
                            setTransferringAllocation({
                              allocationId: `alloc-${seat.id}`,
                              boarderId: 'b-demo',
                              boarderName: seat.occupant_name || 'বর্তমান বর্ডার',
                              boarderCode: 'BDR-LIVE',
                              currentSeatId: seat.id,
                              currentSeatCode: seat.seat_code,
                              currentRent: seat.default_rent,
                            })
                          }
                          leftIcon={<ArrowRightLeft className="w-3 h-3" />}
                        >
                          স্থানান্তর
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-[11px] py-1 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                          onClick={() =>
                            setCancellingAllocation({
                              allocationId: `alloc-${seat.id}`,
                              boarderName: seat.occupant_name || 'বর্তমান বর্ডার',
                              boarderCode: 'BDR-LIVE',
                              seatCode: seat.seat_code,
                            })
                          }
                          leftIcon={<LogOut className="w-3 h-3" />}
                        >
                          প্রস্থান
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs py-1.5"
                        onClick={() => handleQuickStatusChange(seat.id, seat.status)}
                      >
                        সক্রিয় করুন (Mark Available)
                      </Button>
                    )}

                    {!isOccupied && (
                      <button
                        onClick={() => handleQuickStatusChange(seat.id, seat.status)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
                        title="স্ট্যাটাস পরিবর্তন"
                      >
                        {isAvailable ? <Wrench className="w-4 h-4 text-amber-400" /> : <Ban className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <SeatModal
        isOpen={isSeatModalOpen}
        onClose={() => setIsSeatModalOpen(false)}
      />

      <AllocateSeatModal
        isOpen={Boolean(allocatingSeatId)}
        onClose={() => setAllocatingSeatId(null)}
        preSelectedSeatId={allocatingSeatId || undefined}
      />

      <TransferSeatModal
        isOpen={Boolean(transferringAllocation)}
        onClose={() => setTransferringAllocation(null)}
        currentAllocation={transferringAllocation}
      />

      <CancelAllocationModal
        isOpen={Boolean(cancellingAllocation)}
        onClose={() => setCancellingAllocation(null)}
        allocation={cancellingAllocation}
      />
    </div>
  )
}

export default SeatMatrixView

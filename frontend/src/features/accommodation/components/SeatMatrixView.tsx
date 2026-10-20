import React, { useState, useMemo, useCallback } from 'react'
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
  DoorOpen,
  ArrowLeft,
  ArrowRight,
  Layers,
  Building,
  Edit3,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useSeats, useBuildings, useFlats, useRooms, useUpdateSeatStatus } from '../api/useAccommodation'
import { formatBDT } from '@/utils/date'
import SeatModal from './SeatModal'
import RoomModal from './RoomModal'
import AllocateSeatModal from './AllocateSeatModal'
import TransferSeatModal, { type CurrentAllocationTransferInfo } from './TransferSeatModal'
import CancelAllocationModal, { type AllocationCancelInfo } from './CancelAllocationModal'
import type { SeatStatus, Flat, Room } from '@/types/database'

interface SeatMatrixViewProps {
  onAllocateSeat?: (seatId: string) => void
}

export const SeatMatrixView: React.FC<SeatMatrixViewProps> = ({ onAllocateSeat }) => {
  // Navigation & Drilldown State
  const [selectedFlatId, setSelectedFlatId] = useState<string | null>(null)
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [allocatingSeatId, setAllocatingSeatId] = useState<string | null>(null)
  const [transferringAllocation, setTransferringAllocation] = useState<CurrentAllocationTransferInfo | null>(null)
  const [cancellingAllocation, setCancellingAllocation] = useState<AllocationCancelInfo | null>(null)

  // API Data
  const { data: buildings = [] } = useBuildings()
  const { data: flats = [] } = useFlats(selectedBuilding !== 'ALL' ? selectedBuilding : undefined)
  const { data: rooms = [] } = useRooms()
  const { data: seats = [], isLoading } = useSeats({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })

  const updateSeatStatusMutation = useUpdateSeatStatus()

  // Helper to resolve which flat a seat belongs to
  const getSeatFlatId = useCallback(
    (seat: any): string => {
      if (seat.room?.flat?.id) return seat.room.flat.id
      if (seat.room?.flat_id) return seat.room.flat_id
      const r = rooms.find((rm) => rm.id === seat.room_id)
      return r?.flat_id || 'UNASSIGNED'
    },
    [rooms]
  )

  // Calculate Flat-wise aggregated stats
  const flatStatsList = useMemo(() => {
    return flats.map((flat) => {
      const flatSeats = seats.filter((s) => getSeatFlatId(s) === flat.id)
      const available = flatSeats.filter((s) => s.status === 'AVAILABLE').length
      const occupied = flatSeats.filter((s) => s.status === 'OCCUPIED').length
      const maintenance = flatSeats.filter((s) => s.status === 'MAINTENANCE').length
      const inactive = flatSeats.filter((s) => s.status === 'INACTIVE').length
      const total = flatSeats.length
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

      // Resolve building name
      const buildingObj = buildings.find((b) => b.id === flat.building_id)

      return {
        flat,
        buildingName: buildingObj?.name || 'মেইন বিল্ডিং',
        total,
        available,
        occupied,
        maintenance,
        inactive,
        occupancyRate,
        seats: flatSeats,
      }
    })
  }, [flats, seats, buildings, getSeatFlatId])

  // Check for any unassigned seats
  const unassignedSeats = useMemo(() => {
    const flatIds = new Set(flats.map((f) => f.id))
    return seats.filter((s) => !flatIds.has(getSeatFlatId(s)))
  }, [seats, flats, getSeatFlatId])

  // Currently active flat in drill-down mode
  const activeFlatInfo = useMemo(() => {
    if (!selectedFlatId) return null
    if (selectedFlatId === 'UNASSIGNED') {
      return {
        flat: {
          id: 'UNASSIGNED',
          name: 'অন্যান্য / সাধারণ সিট (Unassigned)',
          flat_code: 'OTHER',
          building_id: '',
          floor_number: null,
          status: 'ACTIVE' as const,
          created_at: '',
          updated_at: '',
        } as Flat,
        buildingName: 'সাধারণ',
        total: unassignedSeats.length,
        available: unassignedSeats.filter((s) => s.status === 'AVAILABLE').length,
        occupied: unassignedSeats.filter((s) => s.status === 'OCCUPIED').length,
        maintenance: unassignedSeats.filter((s) => s.status === 'MAINTENANCE').length,
        inactive: unassignedSeats.filter((s) => s.status === 'INACTIVE').length,
        occupancyRate: 0,
        seats: unassignedSeats,
      }
    }
    return flatStatsList.find((f) => f.flat.id === selectedFlatId) || null
  }, [selectedFlatId, flatStatsList, unassignedSeats])

  // Filtered flats for top-level search
  const filteredFlats = useMemo(() => {
    if (!searchQuery) return flatStatsList
    const q = searchQuery.toLowerCase()
    return flatStatsList.filter(
      (f) =>
        f.flat.name.toLowerCase().includes(q) ||
        f.flat.flat_code.toLowerCase().includes(q) ||
        f.buildingName.toLowerCase().includes(q)
    )
  }, [flatStatsList, searchQuery])

  // Rooms belonging to the active flat
  const activeFlatRooms = useMemo(() => {
    if (!selectedFlatId || selectedFlatId === 'UNASSIGNED') return []
    return rooms.filter((r) => r.flat_id === selectedFlatId)
  }, [rooms, selectedFlatId])

  // Filtered seats inside the selected flat
  const seatsInActiveFlat = useMemo(() => {
    if (!activeFlatInfo) return []
    let list = activeFlatInfo.seats

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((s) => {
        const code = s.seat_code.toLowerCase()
        const name = s.seat_name.toLowerCase()
        const occupant = s.occupant_name?.toLowerCase() || ''
        return code.includes(q) || name.includes(q) || occupant.includes(q)
      })
    }

    if (statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter)
    }

    return list
  }, [activeFlatInfo, searchQuery, statusFilter])

  // Overall hostel stats
  const overallStats = useMemo(() => {
    return {
      totalFlats: flats.length,
      totalSeats: seats.length,
      available: seats.filter((s) => s.status === 'AVAILABLE').length,
      occupied: seats.filter((s) => s.status === 'OCCUPIED').length,
      maintenance: seats.filter((s) => s.status === 'MAINTENANCE').length,
    }
  }, [flats, seats])

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
    <div className="space-y-6 animate-fade-in">
      {/* ========================================================================= */}
      {/* 1. TOP OVERVIEW / BREADCRUMB HEADER */}
      {/* ========================================================================= */}
      {selectedFlatId && activeFlatInfo ? (
        /* Inside Flat Drilldown Header */
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFlatId(null)
                  setSearchQuery('')
                  setStatusFilter('ALL')
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
              >
                <ArrowLeft className="w-4 h-4 text-primary-400" />
                <span>সকল ফ্ল্যাট</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <DoorOpen className="w-5 h-5 text-primary-400" />
                    <span>{activeFlatInfo.flat.name}</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {activeFlatInfo.flat.flat_code}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeFlatInfo.flat.floor_number ? `${activeFlatInfo.flat.floor_number}ম তলা • ` : ''}
                  {activeFlatInfo.buildingName} • এই ফ্ল্যাটের সকল সিট অকুপেন্সি তালিকা
                </p>
              </div>
            </div>

            {/* Quick Switch Dropdown & Add Seat */}
            <div className="flex items-center gap-2">
              <select
                value={selectedFlatId}
                onChange={(e) => {
                  setSelectedFlatId(e.target.value)
                  setSearchQuery('')
                }}
                className="py-2 px-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-primary-500 cursor-pointer"
              >
                {flats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
                {unassignedSeats.length > 0 && (
                  <option value="UNASSIGNED">অন্যান্য সিট (Unassigned)</option>
                )}
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsSeatModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                নতুন সিট
              </Button>
            </div>
          </div>

          {/* KPI Statistics of this specific flat */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary-600/15 border-primary-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-slate-400 block font-medium">ফ্ল্যাটের মোট সিট</span>
              <span className="text-lg font-bold text-white tracking-tight">{activeFlatInfo.total}টি</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('AVAILABLE')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === 'AVAILABLE'
                  ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-emerald-400 block font-medium">খালি সিট (Available)</span>
              <span className="text-lg font-bold text-emerald-300 tracking-tight">{activeFlatInfo.available}টি</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('OCCUPIED')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === 'OCCUPIED'
                  ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-indigo-400 block font-medium">বরাদ্দকৃত (Occupied)</span>
              <span className="text-lg font-bold text-indigo-300 tracking-tight">{activeFlatInfo.occupied}টি</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('MAINTENANCE')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                statusFilter === 'MAINTENANCE'
                  ? 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="text-[10px] text-amber-400 block font-medium">মেরামত চলছে</span>
              <span className="text-lg font-bold text-amber-300 tracking-tight">{activeFlatInfo.maintenance}টি</span>
            </button>
          </div>

          {/* Seat Search within Flat */}
          <div className="relative flex items-center pt-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder={`${activeFlatInfo.flat.name} এর সিট কোড বা বর্ডার নাম দিয়ে খুঁজুন...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Rooms in this Flat with Edit Option */}
          {activeFlatRooms.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-primary-400" />
                  এই ফ্ল্যাটের রুমসমূহ ({activeFlatRooms.length}টি রুম)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null)
                    setIsRoomModalOpen(true)
                  }}
                  className="text-[11px] font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> নতুন রুম যোগ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {activeFlatRooms.map((room) => {
                  const roomSeats = activeFlatInfo.seats.filter((s) => s.room_id === room.id)
                  const roomAvailable = roomSeats.filter((s) => s.status === 'AVAILABLE').length
                  const roomOccupied = roomSeats.filter((s) => s.status === 'OCCUPIED').length

                  return (
                    <div
                      key={room.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-white truncate">{room.name}</span>
                          <span className="text-[10px] font-mono text-primary-400 bg-primary-950/40 px-1.5 py-0.5 rounded border border-primary-800/40 shrink-0">
                            {room.room_code}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>ক্যাপাসিটি: {room.capacity} সিট</span>
                          <span>•</span>
                          <span className="text-emerald-400">{roomAvailable} খালি</span>
                          <span>•</span>
                          <span className="text-indigo-400">{roomOccupied} বুকড</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoom(room)
                          setIsRoomModalOpen(true)
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-primary-600/30 border border-slate-700 hover:border-primary-500/50 text-slate-300 hover:text-primary-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0 shadow-sm"
                        title="রুম এডিট করুন"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary-400" />
                        <span>এডিট</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Top Level Flats Overview Filter Bar */
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-primary-400" />
                <span>ফ্ল্যাট ভিত্তিক আবাসন ব্যবস্থাপনা (Flats & Seat Overview)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ফ্ল্যাটের কার্ডে ক্লিক করে ভিতরে প্রবেশ করুন এবং প্রতিটি সিটের বিস্তারিত স্ট্যাটাস পরিচালনা করুন
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

          {/* Overall Hostel Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <DoorOpen className="w-3 h-3 text-primary-400" />
                মোট সক্রিয় ফ্ল্যাট
              </span>
              <span className="text-lg font-bold text-white tracking-tight">{overallStats.totalFlats}টি</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
                <BedDouble className="w-3 h-3 text-slate-400" />
                সর্বমোট সিট সংখ্যা
              </span>
              <span className="text-lg font-bold text-white tracking-tight">{overallStats.totalSeats}টি</span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-400 block font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                খালি সিট (Available)
              </span>
              <span className="text-lg font-bold text-emerald-300 tracking-tight">{overallStats.available}টি</span>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
              <span className="text-[10px] text-indigo-400 block font-medium flex items-center gap-1">
                <User className="w-3 h-3" />
                বরাদ্দকৃত (Occupied)
              </span>
              <span className="text-lg font-bold text-indigo-300 tracking-tight">{overallStats.occupied}টি</span>
            </div>
          </div>

          {/* Search & Building Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="ফ্ল্যাটের নাম বা কোড দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
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
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT: FLAT CARDS GRID OR SEATS GRID */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          সিট ও ফ্ল্যাটের তথ্য লোড হচ্ছে...
        </div>
      ) : selectedFlatId && activeFlatInfo ? (
        /* ========================================================================= */
        /* VIEW 2: INSIDE FLAT — SEATS GRID ("এ ফ্ল্যাট এর সকল সিট আগের মত শো করবে") */
        /* ========================================================================= */
        seatsInActiveFlat.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-slate-800 space-y-3">
            <BedDouble className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-semibold">এই ফ্ল্যাটে কোনো সিট পাওয়া যায়নি</p>
            <p className="text-xs text-slate-500">সিট ফিল্টার পরিবর্তন করুন বা নতুন সিট যুক্ত করুন।</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSeatModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="mt-2"
            >
              নতুন সিট যোগ করুন
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {seatsInActiveFlat.map((seat) => {
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
                          className="w-full text-xs py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
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
                          type="button"
                          onClick={() => handleQuickStatusChange(seat.id, seat.status)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors"
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
        )
      ) : (
        /* ========================================================================= */
        /* VIEW 1: TOP LEVEL — FLAT CARDS (ফ্ল্যাটের নাম ও সিট সংখ্যা সংক্রান্ত তথ্য) */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary-400" />
              ফ্ল্যাট তালিকা ({filteredFlats.length}টি)
            </span>
            <span className="text-xs text-slate-400">
              যেকোনো ফ্ল্যাটে ক্লিক করে সিটগুলো দেখুন
            </span>
          </div>

          {filteredFlats.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-slate-800 space-y-3">
              <DoorOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-300 font-semibold">কোনো ফ্ল্যাট পাওয়া যায়নি</p>
              <p className="text-xs text-slate-500">অনুসন্ধান ফিল্টার পরিবর্তন করুন।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFlats.map((item) => {
                const { flat, buildingName, total, available, occupied, maintenance, occupancyRate } = item

                return (
                  <div
                    key={flat.id}
                    onClick={() => {
                      setSelectedFlatId(flat.id)
                      setSearchQuery('')
                      setStatusFilter('ALL')
                    }}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-primary-500/60 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 cursor-pointer space-y-4 group relative overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Glow Accent on Hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-3.5">
                      {/* Flat Name & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary-600/15 border border-primary-500/30 text-primary-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                            <DoorOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-white group-hover:text-primary-300 transition-colors">
                              {flat.name}
                            </h3>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-500" />
                              <span>{buildingName}</span>
                              {flat.floor_number && (
                                <>
                                  <span>•</span>
                                  <span>{flat.floor_number}ম তলা</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
                          {flat.flat_code}
                        </span>
                      </div>

                      {/* Seat Count Badges Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {/* Total Seats */}
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/90 text-center">
                          <span className="text-[10px] text-slate-400 block font-medium">মোট সিট</span>
                          <span className="text-base font-bold text-white font-mono">{total}টি</span>
                        </div>

                        {/* Available Seats */}
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-center">
                          <span className="text-[10px] text-emerald-400 block font-medium">খালি সিট</span>
                          <span className="text-base font-bold text-emerald-300 font-mono">{available}টি</span>
                        </div>

                        {/* Occupied Seats */}
                        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-center">
                          <span className="text-[10px] text-indigo-400 block font-medium">বরাদ্দকৃত</span>
                          <span className="text-base font-bold text-indigo-300 font-mono">{occupied}টি</span>
                        </div>
                      </div>

                      {/* Maintenance Notice if any */}
                      {maintenance > 0 && (
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                          <span className="flex items-center gap-1.5 font-medium text-[11px]">
                            <Wrench className="w-3.5 h-3.5 text-amber-400" />
                            মেরামত চলছে
                          </span>
                          <span className="font-bold font-mono">{maintenance}টি সিট</span>
                        </div>
                      )}

                      {/* Occupancy Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">অকুপেন্সি হার:</span>
                          <span className="font-mono font-bold text-indigo-300">{occupancyRate}% পূর্ণ</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 flex">
                          <div
                            style={{ width: `${occupancyRate}%` }}
                            className="bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Action Link */}
                    <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-primary-400 group-hover:text-primary-300">
                      <span>সিটগুলো দেখুন ও পরিচালনা করুন</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                )
              })}

              {/* Card for Unassigned Seats if any */}
              {unassignedSeats.length > 0 && (
                <div
                  onClick={() => {
                    setSelectedFlatId('UNASSIGNED')
                    setSearchQuery('')
                    setStatusFilter('ALL')
                  }}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-dashed border-slate-700 hover:border-primary-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer space-y-4 group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
                        <BedDouble className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-white">অন্যান্য সিট (Unassigned)</h3>
                        <p className="text-xs text-slate-400">কোনো নির্দিষ্ট ফ্ল্যাটে অন্তর্ভুক্ত নয় এমন সিট</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">মোট সাধারণ সিট:</span>
                      <span className="font-bold text-white font-mono">{unassignedSeats.length}টি</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-primary-400">
                    <span>সিটগুলো দেখুন</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODALS */}
      {/* ========================================================================= */}
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

      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false)
          setEditingRoom(null)
        }}
        flatId={selectedFlatId !== 'UNASSIGNED' ? selectedFlatId || undefined : undefined}
        roomToEdit={editingRoom}
      />
    </div>
  )
}

export default SeatMatrixView

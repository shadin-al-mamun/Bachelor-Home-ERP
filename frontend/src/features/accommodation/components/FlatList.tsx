import React, { useState, useMemo } from 'react'
import {
  DoorOpen,
  Plus,
  BedDouble,
  Layers,
  Edit3,
  Megaphone,
  AlertTriangle,
  Building as BuildingIcon,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useFlats, useRooms, useBuildings } from '../api/useAccommodation'
import type { Room, Flat } from '@/types/database'
import FlatModal from './FlatModal'
import RoomModal from './RoomModal'
import { SendNoticeModal } from '@/features/notices/components/SendNoticeModal'

export const FlatList: React.FC = () => {
  const { data: buildings = [] } = useBuildings()
  const { data: flats = [], isLoading: isFlatsLoading } = useFlats()
  const { data: rooms = [], isLoading: isRoomsLoading } = useRooms()

  const [isFlatModalOpen, setIsFlatModalOpen] = useState(false)
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [activeFlatIdForRoom, setActiveFlatIdForRoom] = useState<string | undefined>(undefined)
  const [noticeFlat, setNoticeFlat] = useState<{ id: string; name: string } | null>(null)

  const filteredFlats = useMemo(() => {
    if (statusFilter === 'ALL') return flats
    return flats.filter((f) => f.status === statusFilter)
  }, [flats, statusFilter])

  const activeCount = useMemo(() => flats.filter((f) => f.status === 'ACTIVE').length, [flats])
  const inactiveCount = useMemo(() => flats.filter((f) => f.status === 'INACTIVE').length, [flats])

  const handleOpenNewFlatModal = () => {
    setEditingFlat(null)
    setIsFlatModalOpen(true)
  }

  const handleEditFlat = (flat: Flat) => {
    setEditingFlat(flat)
    setIsFlatModalOpen(true)
  }

  const handleOpenRoomModal = (flatId: string) => {
    setEditingRoom(null)
    setActiveFlatIdForRoom(flatId)
    setIsRoomModalOpen(true)
  }

  const handleOpenNewRoomModal = () => {
    setEditingRoom(null)
    setActiveFlatIdForRoom(undefined)
    setIsRoomModalOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setActiveFlatIdForRoom(room.flat_id)
    setIsRoomModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary-400" />
            <span>ফ্ল্যাট ও রুম কাঠামো (Flats & Rooms Hierarchy)</span>
          </h3>
          <p className="text-xs text-slate-400">
            প্রতিটি ফ্ল্যাট ও তার অন্তর্ভুক্ত রুমের ক্যাপাসিটি, সক্রিয়/নিষ্ক্রিয় অবস্থা ও বিবরণ পরিচালনা করুন
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              সকল ({flats.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              সক্রিয় ({activeCount})
            </button>
            {inactiveCount > 0 && (
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'INACTIVE'
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
            variant="outline"
            onClick={handleOpenNewRoomModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            নতুন রুম
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleOpenNewFlatModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            নতুন ফ্ল্যাট
          </Button>
        </div>
      </div>

      {isFlatsLoading || isRoomsLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">লোড হচ্ছে...</div>
      ) : filteredFlats.length === 0 ? (
        <Card variant="glass" className="p-8 text-center border-slate-800">
          <p className="text-sm text-slate-400">কোনো ফ্ল্যাট পাওয়া যায়নি।</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredFlats.map((flat) => {
            const flatRooms = rooms.filter((r) => r.flat_id === flat.id)
            const isInactive = flat.status === 'INACTIVE'
            const buildingObj = buildings.find((b) => b.id === flat.building_id)

            return (
              <Card
                key={flat.id}
                variant="glass"
                className={`overflow-hidden transition-all duration-300 ${
                  isInactive
                    ? 'border-rose-900/40 bg-slate-950/80 opacity-85'
                    : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                {/* Flat Header */}
                <div
                  className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isInactive
                      ? 'bg-rose-950/20 border-rose-900/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold ${
                        isInactive
                          ? 'bg-rose-600/15 border-rose-500/30 text-rose-400'
                          : 'bg-primary-600/15 border-primary-500/30 text-primary-400'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">{flat.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {flat.flat_code}
                        </span>
                        {isInactive && (
                          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            নিষ্ক্রিয় / ছেড়ে দেওয়া
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        {buildingObj && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <BuildingIcon className="w-3 h-3 text-slate-500" />
                            {buildingObj.name}
                          </span>
                        )}
                        <span>•</span>
                        <span>ফ্লোর নং: {flat.floor_number ?? 1}</span>
                        <span>•</span>
                        <span>মোট রুম: {flatRooms.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {!isInactive && (
                      <Badge status={flat.status} showDot={true}>
                        {flat.status}
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditFlat(flat)}
                      className="text-xs py-1 px-2.5 border-slate-700 hover:border-primary-500 text-slate-300 hover:text-white"
                      leftIcon={<Edit3 className="w-3.5 h-3.5 text-primary-400" />}
                      title="ফ্ল্যাটের তথ্য সম্পাদন ও স্ট্যাটাস পরিবর্তন"
                    >
                      ফ্ল্যাট এডিট
                    </Button>

                    {!isInactive && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setNoticeFlat({ id: flat.id, name: `${flat.name} (${flat.flat_code})` })}
                          className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          title="এই ফ্ল্যাটের সকল সদস্যকে নোটিশ পাঠান"
                        >
                          <Megaphone className="w-3.5 h-3.5 mr-1" />
                          নোটিশ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenRoomModal(flat.id)}
                          className="text-xs text-primary-400 hover:text-primary-300"
                        >
                          + রুম যোগ করুন
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Inactive notice if flat is inactive */}
                {isInactive && (
                  <div className="px-4 py-2.5 bg-rose-950/30 border-b border-rose-900/30 text-xs text-rose-300/90 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
                      এই ফ্ল্যাটটি বর্তমানে নিষ্ক্রিয় (ছেড়ে দেওয়া হয়েছে)। নতুন কোনো সিট বরাদ্দ বা বুকিং নেওয়া যাবে না। প্রয়োজন হলে &apos;ফ্ল্যাট এডিট&apos; এ গিয়ে পুনরায় সক্রিয় করতে পারবেন।
                    </span>
                  </div>
                )}

                {/* Rooms Under This Flat */}
                <div className="p-4">
                  {flatRooms.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      এই ফ্ল্যাটে এখনো কোনো রুম যুক্ত করা হয়নি।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {flatRooms.map((room) => (
                        <div
                          key={room.id}
                          className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 space-y-2.5 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-white text-xs truncate">
                                {room.name}
                              </span>
                              <span className="text-[10px] font-mono text-primary-400 bg-primary-950/40 px-1.5 py-0.5 rounded border border-primary-800/40 shrink-0">
                                {room.room_code}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleEditRoom(room)}
                              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-primary-600/30 border border-slate-700 hover:border-primary-500/50 text-slate-300 hover:text-primary-300 transition-all flex items-center gap-1.5 text-xs font-medium shrink-0 shadow-sm"
                              title="রুম এডিট করুন"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary-400" />
                              <span>এডিট</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 text-slate-300">
                              <BedDouble className="w-3.5 h-3.5 text-primary-400" />
                              ক্যাপাসিটি: {room.capacity} সিট
                            </span>
                            <Badge status={room.status} showDot={false} className="text-[10px] py-0 px-2">
                              {room.room_type}
                            </Badge>
                          </div>

                          {room.description && (
                            <p className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/60">
                              {room.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <FlatModal
        isOpen={isFlatModalOpen}
        onClose={() => {
          setIsFlatModalOpen(false)
          setEditingFlat(null)
        }}
        flatToEdit={editingFlat}
      />
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false)
          setEditingRoom(null)
        }}
        flatId={activeFlatIdForRoom}
        roomToEdit={editingRoom}
      />

      {/* Send Notice to Flat Modal */}
      <SendNoticeModal
        isOpen={Boolean(noticeFlat)}
        onClose={() => setNoticeFlat(null)}
        initialFlatId={noticeFlat?.id}
      />
    </div>
  )
}

export default FlatList

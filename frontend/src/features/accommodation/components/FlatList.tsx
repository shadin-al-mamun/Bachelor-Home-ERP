import React, { useState } from 'react'
import { DoorOpen, Plus, BedDouble, Layers } from 'lucide-react'
import { Button, Card, Badge } from '@/components/common'
import { useFlats, useRooms } from '../api/useAccommodation'
import FlatModal from './FlatModal'
import RoomModal from './RoomModal'

export const FlatList: React.FC = () => {
  const { data: flats = [], isLoading: isFlatsLoading } = useFlats()
  const { data: rooms = [], isLoading: isRoomsLoading } = useRooms()

  const [isFlatModalOpen, setIsFlatModalOpen] = useState(false)
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false)
  const [activeFlatIdForRoom, setActiveFlatIdForRoom] = useState<string | undefined>(undefined)

  const handleOpenRoomModal = (flatId: string) => {
    setActiveFlatIdForRoom(flatId)
    setIsRoomModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-primary-400" />
            <span>ফ্ল্যাট ও রুম কাঠামো (Flats & Rooms Hierarchy)</span>
          </h3>
          <p className="text-xs text-slate-400">
            প্রতিটি ফ্ল্যাট ও তার অন্তর্ভুক্ত রুমের ক্যাপাসিটি ও বিবরণ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsRoomModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            নতুন রুম
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsFlatModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            নতুন ফ্ল্যাট
          </Button>
        </div>
      </div>

      {isFlatsLoading || isRoomsLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">লোড হচ্ছে...</div>
      ) : flats.length === 0 ? (
        <Card variant="glass" className="p-8 text-center border-slate-800">
          <p className="text-sm text-slate-400">কোনো ফ্ল্যাট তৈরি করা হয়নি।</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {flats.map((flat) => {
            const flatRooms = rooms.filter((r) => r.flat_id === flat.id)

            return (
              <Card key={flat.id} variant="glass" className="border-slate-800 overflow-hidden">
                {/* Flat Header */}
                <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-600/15 border border-primary-500/30 text-primary-400 flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-white">{flat.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {flat.flat_code}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        ফ্লোর নং: {flat.floor_number} • মোট রুম: {flatRooms.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge status={flat.status} showDot={true}>
                      {flat.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenRoomModal(flat.id)}
                      className="text-xs text-primary-400 hover:text-primary-300"
                    >
                      + রুম যোগ করুন
                    </Button>
                  </div>
                </div>

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
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white text-xs truncate">
                              {room.name}
                            </span>
                            <span className="text-[10px] font-mono text-primary-400 bg-primary-950/40 px-1.5 py-0.5 rounded border border-primary-800/40">
                              {room.room_code}
                            </span>
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
      <FlatModal isOpen={isFlatModalOpen} onClose={() => setIsFlatModalOpen(false)} />
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        flatId={activeFlatIdForRoom}
      />
    </div>
  )
}

export default FlatList

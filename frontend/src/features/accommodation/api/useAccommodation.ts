import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { Building, Flat, Room, Seat, SeatStatus } from '@/types/database'

// Initial baseline mock data mirrored from 20261015000007_seed_initial_data.sql
let mockBuildings: Building[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    building_code: 'BLD-01',
    name: 'Sunflower Hostel (সানফ্লাওয়ার হোস্টেল)',
    address: 'House 42, Road 11, Sector 4, Uttara, Dhaka-1230',
    status: 'ACTIVE',
    description: 'Primary modern hostel campus equipped with CCTV, WiFi, and dining hall.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let mockFlats: Flat[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    building_id: '11111111-1111-1111-1111-111111111111',
    flat_code: 'FLAT-2A',
    name: 'Flat 2A (ফ্ল্যাট ২-এ)',
    floor_number: 2,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    building_id: '11111111-1111-1111-1111-111111111111',
    flat_code: 'FLAT-3B',
    name: 'Flat 3B (ফ্ল্যাট ৩-বি)',
    floor_number: 3,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222224',
    building_id: '11111111-1111-1111-1111-111111111111',
    flat_code: 'FLAT-4C',
    name: 'Flat 4C (ফ্ল্যাট ৪-সি)',
    floor_number: 4,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let mockRooms: Room[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    flat_id: '22222222-2222-2222-2222-222222222222',
    room_code: 'ROOM-101',
    name: 'Room 101 (মাস্টার বেডরুম)',
    room_type: 'DELUXE',
    capacity: 3,
    status: 'ACTIVE',
    description: 'Spacious master bedroom with attached washroom, balcony, and personal lockers.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333334',
    flat_id: '22222222-2222-2222-2222-222222222223',
    room_code: 'ROOM-201',
    name: 'Room 201 (স্ট্যান্ডার্ড রুম)',
    room_type: 'STANDARD',
    capacity: 2,
    status: 'ACTIVE',
    description: 'Cozy standard room with study tables and wardrobe.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '33333333-3333-3333-3333-333333333335',
    flat_id: '22222222-2222-2222-2222-222222222224',
    room_code: 'ROOM-301',
    name: 'Room 301 (প্রিমিয়াম ব্যালকনি রুম)',
    room_type: 'DELUXE',
    capacity: 2,
    status: 'ACTIVE',
    description: 'Premium room with scenic road view balcony and air conditioning.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

let mockSeats: (Seat & { room_name?: string; flat_name?: string; occupant_name?: string; room?: Room })[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    room_id: '33333333-3333-3333-3333-333333333333',
    seat_code: 'S-101-A',
    seat_name: 'Seat S-101-A (উইন্ডো সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4500,
    status: 'OCCUPIED',
    occupant_name: 'তানভীর আহমেদ',
    description: 'East facing window corner bed with reading lamp and power socket.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    room_id: '33333333-3333-3333-3333-333333333333',
    seat_code: 'S-101-B',
    seat_name: 'Seat S-101-B (মিডল সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4200,
    status: 'AVAILABLE',
    description: 'Middle single bed with dedicated under-bed storage drawer.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    room_id: '33333333-3333-3333-3333-333333333333',
    seat_code: 'S-101-C',
    seat_name: 'Seat S-101-C (ওয়াল সাইড সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4200,
    status: 'MAINTENANCE',
    description: 'Wall side single bed under maintenance.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    room_id: '33333333-3333-3333-3333-333333333334',
    seat_code: 'S-201-A',
    seat_name: 'Seat S-201-A (উইন্ডো সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4000,
    status: 'AVAILABLE',
    description: 'South facing bright window single bed.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444445',
    room_id: '33333333-3333-3333-3333-333333333334',
    seat_code: 'S-201-B',
    seat_name: 'Seat S-201-B (ডোর সাইড সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 3800,
    status: 'OCCUPIED',
    occupant_name: 'রাকিবুল হাসান',
    description: 'Standard single bed with locker.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444446',
    room_id: '33333333-3333-3333-3333-333333333335',
    seat_code: 'S-301-A',
    seat_name: 'Seat S-301-A (ব্যালকনি সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4800,
    status: 'AVAILABLE',
    description: 'Deluxe single bed right beside balcony access.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444447',
    room_id: '33333333-3333-3333-3333-333333333335',
    seat_code: 'S-301-B',
    seat_name: 'Seat S-301-B (মাস্টার সিট)',
    seat_type: 'SINGLE_BED',
    default_rent: 4800,
    status: 'AVAILABLE',
    description: 'Corner spacious single bed.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// 1. BUILDINGS
export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: async (): Promise<Building[]> => {
      if (!isSupabaseConfigured) {
        return mockBuildings
      }
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.warn('buildings fetch failed:', error.message)
        return []
      }
      return (data || []) as Building[]
    },
  })
}

export function useCreateBuilding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (building: Partial<Building>) => {
      if (!isSupabaseConfigured) {
        const newBuilding: Building = {
          id: crypto.randomUUID(),
          building_code: building.building_code || 'BLD-' + Math.floor(100 + Math.random() * 900),
          name: building.name || 'New Building',
          address: building.address || 'Dhaka',
          status: building.status || 'ACTIVE',
          description: building.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockBuildings = [newBuilding, ...mockBuildings]
        return newBuilding
      }

      const { data, error } = await supabase
        .from('buildings')
        .insert(building)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] })
    },
  })
}

// 2. FLATS
export function useFlats(buildingId?: string) {
  return useQuery({
    queryKey: ['flats', buildingId],
    queryFn: async (): Promise<Flat[]> => {
      if (!isSupabaseConfigured) {
        return buildingId ? mockFlats.filter((f) => f.building_id === buildingId) : mockFlats
      }
      let query = supabase.from('flats').select('*, building:buildings(*)')
      if (buildingId) {
        query = query.eq('building_id', buildingId)
      }
      const { data, error } = await query.order('name', { ascending: true })
      if (error) {
        console.warn('flats fetch failed:', error.message)
        return []
      }
      return (data || []) as Flat[]
    },
  })
}

export function useCreateFlat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (flat: Partial<Flat>) => {
      if (!isSupabaseConfigured) {
        const newFlat: Flat = {
          id: crypto.randomUUID(),
          building_id: flat.building_id || mockBuildings[0].id,
          flat_code: flat.flat_code || 'FLAT-' + Math.floor(10 + Math.random() * 90),
          name: flat.name || 'New Flat',
          floor_number: flat.floor_number || 1,
          status: flat.status || 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockFlats = [newFlat, ...mockFlats]
        return newFlat
      }

      const { data, error } = await supabase
        .from('flats')
        .insert(flat)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
    },
  })
}

// 3. ROOMS
export function useRooms(flatId?: string) {
  return useQuery({
    queryKey: ['rooms', flatId],
    queryFn: async (): Promise<Room[]> => {
      if (!isSupabaseConfigured) {
        return flatId ? mockRooms.filter((r) => r.flat_id === flatId) : mockRooms
      }
      let query = supabase.from('rooms').select('*, flat:flats(*)')
      if (flatId) {
        query = query.eq('flat_id', flatId)
      }
      const { data, error } = await query.order('name', { ascending: true })
      if (error) {
        console.warn('rooms fetch failed:', error.message)
        return []
      }
      return (data || []) as Room[]
    },
  })
}

export function useCreateRoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (room: Partial<Room>) => {
      if (!isSupabaseConfigured) {
        const newRoom: Room = {
          id: crypto.randomUUID(),
          flat_id: room.flat_id || mockFlats[0].id,
          room_code: room.room_code || 'ROOM-' + Math.floor(100 + Math.random() * 900),
          name: room.name || 'New Room',
          room_type: room.room_type || 'STANDARD',
          capacity: room.capacity || 2,
          status: room.status || 'ACTIVE',
          description: room.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockRooms = [newRoom, ...mockRooms]
        return newRoom
      }

      const { data, error } = await supabase
        .from('rooms')
        .insert(room)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })
}

// 4. SEATS
export interface SeatFilterParams {
  buildingId?: string
  flatId?: string
  roomId?: string
  status?: string
}

export function useSeats(params?: SeatFilterParams) {
  return useQuery({
    queryKey: ['seats', params],
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        let results = mockSeats.map((s) => {
          const r = mockRooms.find((rm) => rm.id === s.room_id)
          const f = mockFlats.find((fl) => fl.id === r?.flat_id)
          const b = mockBuildings.find((bl) => bl.id === f?.building_id)
          return {
            ...s,
            room: r ? { ...r, flat: f ? { ...f, building: b } : undefined } : undefined,
          }
        })
        if (params?.roomId) {
          results = results.filter((s) => s.room_id === params.roomId)
        }
        if (params?.status && params.status !== 'ALL') {
          results = results.filter((s) => s.status === params.status)
        }
        return results
      }

      let query = supabase
        .from('seats')
        .select(`
          *,
          room:rooms (
            id, name, room_code, flat_id,
            flat:flats (
              id, name, flat_code, floor_number,
              building:buildings (id, name)
            )
          ),
          allocations (
            id, status,
            boarder:boarders (id, full_name, boarder_code)
          )
        `)

      if (params?.roomId) {
        query = query.eq('room_id', params.roomId)
      }
      if (params?.status && params.status !== 'ALL') {
        query = query.eq('status', params.status)
      }

      const { data, error } = await query.order('seat_code', { ascending: true })
      if (error) {
        console.warn('seats fetch failed:', error.message)
        return []
      }
      return (data || []).map((s: any) => {
        const activeAlloc = s.allocations?.find((a: any) => a.status === 'ACTIVE')
        return {
          ...s,
          occupant_name: activeAlloc?.boarder?.full_name || s.occupant_name || null,
        }
      })
    },
  })
}

export function useCreateSeat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (seat: Partial<Seat>) => {
      if (!isSupabaseConfigured) {
        const newSeat = {
          id: crypto.randomUUID(),
          room_id: seat.room_id || mockRooms[0].id,
          seat_code: seat.seat_code || 'S-' + Math.floor(100 + Math.random() * 900),
          seat_name: seat.seat_name || 'Seat',
          seat_type: seat.seat_type || 'SINGLE_BED',
          default_rent: seat.default_rent || 4000,
          status: seat.status || 'AVAILABLE',
          description: seat.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        mockSeats = [newSeat, ...mockSeats]
        return newSeat
      }

      const { data, error } = await supabase
        .from('seats')
        .insert(seat)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] })
    },
  })
}

export function useUpdateSeatStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ seatId, status }: { seatId: string; status: SeatStatus }) => {
      if (!isSupabaseConfigured) {
        mockSeats = mockSeats.map((s) => (s.id === seatId ? { ...s, status } : s))
        return { success: true }
      }

      const { error } = await supabase
        .from('seats')
        .update({ status })
        .eq('id', seatId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] })
    },
  })
}

// ============================================================
// COMPOSITE HOOK: Full hierarchy for seat selection modals
// ============================================================

export interface RoomWithSeats {
  id: string
  room_code: string
  name: string
  room_type: string
  capacity: number
  status: string
  seats: (Seat & { occupant_name?: string })[]
}

export interface FlatWithRooms {
  id: string
  flat_code: string
  name: string
  floor_number?: number | null
  status: string
  rooms: RoomWithSeats[]
}

export interface BuildingWithFlats {
  id: string
  building_code: string
  name: string
  address: string
  status: string
  flats: FlatWithRooms[]
}

export function useAccommodation() {
  return useQuery({
    queryKey: ['accommodation', 'hierarchy'],
    queryFn: async (): Promise<BuildingWithFlats[]> => {
      if (!isSupabaseConfigured) {
        return mockBuildings.map((b) => ({
          ...b,
          flats: mockFlats
            .filter((f) => f.building_id === b.id)
            .map((f) => ({
              ...f,
              rooms: mockRooms
                .filter((r) => r.flat_id === f.id)
                .map((r) => ({
                  ...r,
                  seats: mockSeats.filter((s) => s.room_id === r.id),
                })),
            })),
        }))
      }

      const { data, error } = await supabase
        .from('buildings')
        .select(`*, flats (*, rooms (*, seats (*)))`)
        .order('name', { ascending: true })

      if (error) {
        console.warn('useAccommodation hierarchy fetch failed, falling back to mock:', error.message)
        return mockBuildings.map((b) => ({
          ...b,
          flats: mockFlats
            .filter((f) => f.building_id === b.id)
            .map((f) => ({
              ...f,
              rooms: mockRooms
                .filter((r) => r.flat_id === f.id)
                .map((r) => ({
                  ...r,
                  seats: mockSeats.filter((s) => s.room_id === r.id),
                })),
            })),
        }))
      }

      return (data || []) as BuildingWithFlats[]
    },
  })
}


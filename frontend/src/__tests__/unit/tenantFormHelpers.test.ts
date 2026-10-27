import { describe, it, expect } from 'vitest'
import {
  calculateAge,
  resolveRoommatesForBoarder,
  resolveFlatInfoForBoarder,
} from '@/features/settings/utils/tenantFormHelpers'
import type { BoarderWithRelations } from '@/features/boarders/api/useBoarders'

describe('tenantFormHelpers', () => {
  describe('calculateAge', () => {
    it('returns empty string for null or undefined or invalid date', () => {
      expect(calculateAge(null)).toBe('')
      expect(calculateAge(undefined)).toBe('')
      expect(calculateAge('invalid-date')).toBe('')
    })

    it('calculates age in Bengali numerals', () => {
      const birthDate = '2000-01-01'
      const ageStr = calculateAge(birthDate)
      expect(ageStr).toContain('বছর')
      // Bengali digits check
      expect(ageStr).toMatch(/[০-৯]+ বছর/)
    })
  })

  describe('resolveRoommatesForBoarder', () => {
    const mockBoarder1: BoarderWithRelations = {
      id: 'b-1',
      full_name: 'বোর্ডার এক',
      phone_number: '01711111111',
      date_of_birth: '1998-05-10',
      occupation: 'সফটওয়্যার ইঞ্জিনিয়ার',
      active_allocation: {
        id: 'alloc-1',
        boarder_id: 'b-1',
        seat_id: 'seat-101-a',
        start_date: '2026-01-01',
        is_active: true,
        seat: {
          id: 'seat-101-a',
          seat_number: 'A',
          room_id: 'room-1',
          room: {
            id: 'room-1',
            name: 'Room 101',
            flat_id: 'flat-4a',
            flat: {
              id: 'flat-4a',
              name: 'ফ্ল্যাট ৪এ',
              floor_number: 4,
              building: {
                id: 'bld-1',
                name: 'সানফ্লাওয়ার মেস',
                address: 'বাড়ি #৪২, রোড #১১',
              },
            },
          },
        },
      },
    } as unknown as BoarderWithRelations

    const mockBoarder2SameRoom: BoarderWithRelations = {
      id: 'b-2',
      full_name: 'বোর্ডার দুই (রুমমেট)',
      phone_number: '01822222222',
      date_of_birth: '1999-02-15',
      occupation: 'ব্যাংকার',
      active_allocation: {
        id: 'alloc-2',
        boarder_id: 'b-2',
        seat_id: 'seat-101-b',
        start_date: '2026-02-01',
        is_active: true,
        seat: {
          id: 'seat-101-b',
          seat_number: 'B',
          room_id: 'room-1',
          room: {
            id: 'room-1',
            name: 'Room 101',
            flat_id: 'flat-4a',
            flat: {
              id: 'flat-4a',
              name: 'ফ্ল্যাট ৪এ',
              floor_number: 4,
              building: {
                id: 'bld-1',
                name: 'সানফ্লাওয়ার মেস',
                address: 'বাড়ি #৪২, রোড #১১',
              },
            },
          },
        },
      },
    } as unknown as BoarderWithRelations

    const mockBoarder3SameFlatDifferentRoom: BoarderWithRelations = {
      id: 'b-3',
      full_name: 'বোর্ডার তিন (ফ্ল্যাটমেট)',
      phone_number: '01933333333',
      date_of_birth: '2001-08-20',
      occupation: 'শিক্ষার্থী',
      student_id: 'STU-123',
      active_allocation: {
        id: 'alloc-3',
        boarder_id: 'b-3',
        seat_id: 'seat-102-a',
        start_date: '2026-03-01',
        is_active: true,
        seat: {
          id: 'seat-102-a',
          seat_number: 'A',
          room_id: 'room-2',
          room: {
            id: 'room-2',
            name: 'Room 102',
            flat_id: 'flat-4a',
            flat: {
              id: 'flat-4a',
              name: 'ফ্ল্যাট ৪এ',
              floor_number: 4,
              building: {
                id: 'bld-1',
                name: 'সানফ্লাওয়ার মেস',
                address: 'বাড়ি #৪২, রোড #১১',
              },
            },
          },
        },
      },
    } as unknown as BoarderWithRelations

    it('returns empty array when target boarder is null', () => {
      expect(resolveRoommatesForBoarder(null, [mockBoarder1])).toEqual([])
    })

    it('prefers same-room roommates if available', () => {
      const roommates = resolveRoommatesForBoarder(mockBoarder1, [
        mockBoarder1,
        mockBoarder2SameRoom,
        mockBoarder3SameFlatDifferentRoom,
      ])

      expect(roommates.length).toBe(1)
      expect(roommates[0].name).toBe('বোর্ডার দুই (রুমমেট)')
      expect(roommates[0].phone).toBe('01822222222')
      expect(roommates[0].occupation).toBe('ব্যাংকার')
      expect(roommates[0].sl).toBe('১।')
    })

    it('falls back to same-flat roommates if no one else is in the same room', () => {
      // Boarder 1 has no roommates in room-1, only boarder 3 in room-2 (same flat)
      const roommates = resolveRoommatesForBoarder(mockBoarder1, [
        mockBoarder1,
        mockBoarder3SameFlatDifferentRoom,
      ])

      expect(roommates.length).toBe(1)
      expect(roommates[0].name).toBe('বোর্ডার তিন (ফ্ল্যাটমেট)')
      expect(roommates[0].phone).toBe('01933333333')
      expect(roommates[0].occupation).toBe('শিক্ষার্থী')
    })
  })

  describe('resolveFlatInfoForBoarder', () => {
    it('correctly formats flat, floor, and building info', () => {
      const mockBoarder: BoarderWithRelations = {
        id: 'b-test',
        active_allocation: {
          seat: {
            room: {
              name: 'রুম ২০২',
              flat: {
                name: 'ফ্ল্যাট ৩বি',
                floor_number: 3,
                building: {
                  name: 'গ্রীন ভিউ হোস্টেল',
                },
              },
            },
          },
        },
      } as unknown as BoarderWithRelations

      const info = resolveFlatInfoForBoarder(mockBoarder)
      expect(info.flatFloor).toContain('ফ্ল্যাট ৩বি')
      expect(info.flatFloor).toContain('৩ম তলা')
      expect(info.flatFloor).toContain('(রুম ২০২)')
      expect(info.houseHolding).toContain('গ্রীন ভিউ হোস্টেল')
    })
  })
})

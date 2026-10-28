import type { BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import type { RoommateInfo, FlatAddressInfo } from '../components/TenantPoliceForm'
import { toBengaliNumerals } from '../components/TenantPoliceForm'

/**
 * Calculates approximate age in Bengali numerals from birth date string (YYYY-MM-DD)
 */
export function calculateAge(dobStr?: string | null): string {
  if (!dobStr) return ''
  try {
    const dob = new Date(dobStr)
    if (isNaN(dob.getTime())) return ''
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age > 0 ? `${toBengaliNumerals(age)} বছর` : ''
  } catch {
    return ''
  }
}

/**
 * Resolves roommates for Serial 11:
 * Rule: Other boarders allocated in the same room.
 * If none in the same room, other boarders allocated in other rooms of the same flat.
 */
export function resolveRoommatesForBoarder(
  targetBoarder: BoarderWithRelations | null,
  allBoarders: BoarderWithRelations[] = []
): RoommateInfo[] {
  if (!targetBoarder) return []

  const targetAlloc = targetBoarder.active_allocation
  const targetSeat = targetAlloc?.seat
  const targetRoom = targetSeat?.room
  const targetFlat = targetRoom?.flat

  const roomId = targetRoom?.id
  const flatId = targetFlat?.id

  const otherBoarders = allBoarders.filter((b) => b.id !== targetBoarder.id)

  // 1. Try finding other active boarders in the same room
  if (roomId) {
    const sameRoom = otherBoarders.filter((b) => {
      const bRoomId = b.active_allocation?.seat?.room?.id
      return bRoomId === roomId
    })

    if (sameRoom.length > 0) {
      return sameRoom.slice(0, 4).map((b, idx) => ({
        sl: `${toBengaliNumerals(idx + 1)}।`,
        name: b.full_name,
        age: calculateAge(b.date_of_birth),
        occupation: b.occupation || (b.student_id ? 'শিক্ষার্থী' : 'কর্মজীবী'),
        phone: b.phone_number,
      }))
    }
  }

  // 2. Fallback: If no other boarders in this room, find other boarders in the same flat
  if (flatId) {
    const sameFlat = otherBoarders.filter((b) => {
      const bFlatId = b.active_allocation?.seat?.room?.flat?.id
      return bFlatId === flatId
    })

    if (sameFlat.length > 0) {
      return sameFlat.slice(0, 4).map((b, idx) => ({
        sl: `${toBengaliNumerals(idx + 1)}।`,
        name: b.full_name,
        age: calculateAge(b.date_of_birth),
        occupation: b.occupation || (b.student_id ? 'শিক্ষার্থী' : 'কর্মজীবী'),
        phone: b.phone_number,
      }))
    }
  }

  return []
}

/**
 * Extracts flat/building address tokens from a boarder's seat allocation
 */
export function resolveFlatInfoForBoarder(
  targetBoarder: BoarderWithRelations | null,
  fallbackBuildingAddress?: string
): FlatAddressInfo {
  const seat = targetBoarder?.active_allocation?.seat
  const flat = seat?.room?.flat
  const room = seat?.room
  const building = flat?.building

  const floorNumber = flat?.floor_number ? `${toBengaliNumerals(flat.floor_number)}ম তলা` : ''
  const flatName = flat?.name || ''
  const flatFloor = [flatName, floorNumber, room?.name ? `(${room.name})` : '']
    .filter(Boolean)
    .join(' / ') || 'ফ্ল্যাট ৪এ (৪র্থ তলা)'

  const buildingName = building?.name || 'সানফ্লাওয়ার হোস্টেল'
  const houseHolding = fallbackBuildingAddress || `${buildingName}, বাড়ি #৪২`
  const road = '৯ সাত্তার টাওয়ার'
  const area = 'শেরে বাংলা নগর'
  const postCode = '১২০৭'

  return {
    flatFloor,
    houseHolding,
    road,
    area,
    postCode,
  }
}

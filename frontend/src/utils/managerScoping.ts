import type { Profile } from '@/types/database'

/**
 * Checks if the current user profile has manager-level scoping applied.
 * Only users with role === 'MANAGER' are subject to manager scoping.
 * SUPER_ADMIN, ADMIN, ACCOUNTANT, AUDITOR maintain global visibility.
 */
export function isScopedManager(profile: Profile | null | undefined): boolean {
  return profile?.role === 'MANAGER'
}

/**
 * Checks if the user has administrative global view privilege.
 */
export function isGlobalAdmin(profile: Profile | null | undefined): boolean {
  if (!profile) return false
  return ['SUPER_ADMIN', 'ADMIN'].includes(profile.role)
}

/**
 * Checks whether a manager can access a specific flat.
 * Unscoped users (Admin, Super Admin) always return true.
 */
export function canManagerAccessFlat(
  flatId: string | null | undefined,
  assignedFlats: string[],
  isManager: boolean
): boolean {
  if (!isManager) return true
  if (!flatId) return false
  return assignedFlats.includes(flatId)
}

/**
 * Checks whether a manager can access a specific building.
 * Unscoped users (Admin, Super Admin) always return true.
 */
export function canManagerAccessBuilding(
  buildingId: string | null | undefined,
  assignedBuildings: string[],
  isManager: boolean
): boolean {
  if (!isManager) return true
  if (!buildingId) return false
  return assignedBuildings.includes(buildingId)
}

/**
 * Derives the list of building IDs from flats that belong to assigned flats.
 */
export function deriveAssignedBuildingsFromFlats<
  T extends { id: string; building_id?: string | null; building?: { id: string } | null }
>(allFlats: T[], assignedFlatIds: string[]): string[] {
  const buildingIdSet = new Set<string>()
  const flatSet = new Set(assignedFlatIds)

  allFlats.forEach((f) => {
    if (flatSet.has(f.id)) {
      const bId = f.building_id || f.building?.id
      if (bId) buildingIdSet.add(bId)
    }
  })

  return Array.from(buildingIdSet)
}

/**
 * Filters a list of buildings for a manager.
 * If user is not a manager, returns all buildings unchanged.
 */
export function filterBuildingsForManager<T extends { id: string }>(
  buildings: T[],
  assignedBuildings: string[],
  isManager: boolean
): T[] {
  if (!isManager) return buildings
  const allowedSet = new Set(assignedBuildings)
  return buildings.filter((b) => allowedSet.has(b.id))
}

/**
 * Filters a list of flats for a manager.
 * If user is not a manager, returns all flats unchanged.
 */
export function filterFlatsForManager<T extends { id: string }>(
  flats: T[],
  assignedFlats: string[],
  isManager: boolean
): T[] {
  if (!isManager) return flats
  const allowedSet = new Set(assignedFlats)
  return flats.filter((f) => allowedSet.has(f.id))
}

/**
 * Filters a list of rooms for a manager based on their assigned flats.
 */
export function filterRoomsForManager<
  T extends { flat_id?: string | null; flat?: { id: string } | null }
>(rooms: T[], assignedFlats: string[], isManager: boolean): T[] {
  if (!isManager) return rooms
  const allowedSet = new Set(assignedFlats)
  return rooms.filter((r) => {
    const fId = r.flat_id || r.flat?.id
    return fId ? allowedSet.has(fId) : false
  })
}

/**
 * Filters a list of seats for a manager based on room and flat relationships.
 */
export function filterSeatsForManager<
  T extends {
    room_id?: string | null
    room?: { flat_id?: string | null; flat?: { id: string } | null } | null
  }
>(seats: T[], assignedFlats: string[], isManager: boolean): T[] {
  if (!isManager) return seats
  const allowedSet = new Set(assignedFlats)
  return seats.filter((s) => {
    const fId = s.room?.flat_id || s.room?.flat?.id
    return fId ? allowedSet.has(fId) : false
  })
}

/**
 * Filters boarders so a manager ONLY sees boarders residing in (or booked for) their assigned flats.
 * Pending applicants with no allocation can be optionally viewed if not flat-specific.
 */
export function filterBoardersForManager<
  T extends {
    status?: string
    active_allocation?: {
      seat?: {
        room?: {
          flat_id?: string | null
          flat?: { id?: string; flat_code?: string; name?: string } | null
        } | null
      } | null
    } | null
  }
>(boarders: T[], assignedFlats: string[], isManager: boolean): T[] {
  if (!isManager) return boarders
  if (!assignedFlats || assignedFlats.length === 0) return []

  const allowedSet = new Set(assignedFlats.map((id) => id.toLowerCase()))

  return boarders.filter((b) => {
    const flatObj = b.active_allocation?.seat?.room?.flat
    const fId = (b.active_allocation?.seat?.room?.flat_id || flatObj?.id || '').toLowerCase()
    const fCode = (flatObj?.flat_code || '').toLowerCase()

    if (fId && allowedSet.has(fId)) return true
    if (fCode && allowedSet.has(fCode)) return true
    if (Array.from(allowedSet).some((af) => (fId && fId.includes(af)) || (fCode && fCode.includes(af)))) {
      return true
    }

    // Pending applicant with no allocated flat yet
    if (b.status === 'PENDING' && !fId) {
      return true
    }

    return false
  })
}

/**
 * Filters kitchen meal flat summaries for a manager.
 */
export function filterKitchenFlatsForManager<T extends { flat_id: string }>(
  kitchenFlats: T[],
  assignedFlats: string[],
  isManager: boolean
): T[] {
  if (!isManager) return kitchenFlats
  const allowedSet = new Set(assignedFlats)
  return kitchenFlats.filter((kf) => allowedSet.has(kf.flat_id))
}

/**
 * Filters receipts for manager isolation:
 * A manager can ONLY see receipts collected by themselves (collected_by === currentUserId)
 * OR receipts deposited into their assigned cash account / for boarders in their assigned flats.
 * Receipts collected by other managers are completely hidden!
 */
export function filterReceiptsForManager<
  T extends {
    collected_by?: string | null
    received_by?: string | null
    boarder_id?: string | null
    account_id?: string | null
    destination_account_id?: string | null
  }
>(
  receipts: T[],
  currentUserId: string | undefined,
  assignedFlats: string[],
  isManager: boolean,
  boarderToFlatMap?: Map<string, string>,
  assignedAccountId?: string | null
): T[] {
  if (!isManager) return receipts
  const allowedFlats = new Set(assignedFlats)

  return receipts.filter((r) => {
    // 1. Receipts collected directly by this manager
    const collectorId = r.received_by || r.collected_by
    if (currentUserId && collectorId === currentUserId) {
      return true
    }

    // 2. Receipts deposited into this manager's cash drawer
    const accId = r.destination_account_id || r.account_id
    if (assignedAccountId && accId === assignedAccountId) {
      return true
    }

    // 3. Receipts for a boarder residing in one of this manager's assigned flats
    if (boarderToFlatMap && r.boarder_id) {
      const flatId = boarderToFlatMap.get(r.boarder_id)
      if (flatId && allowedFlats.has(flatId)) {
        return true
      }
    }

    return false
  })
}

/**
 * Filters expenses for manager isolation:
 * A manager can ONLY see expenses they recorded/paid (paid_by === currentUserId)
 * OR expenses assigned to their flats/buildings or drawn from their assigned cash drawer.
 * Expenses recorded by other managers are completely hidden!
 */
export function filterExpensesForManager<
  T extends {
    paid_by?: string | null
    flat_id?: string | null
    building_id?: string | null
    source_account_id?: string | null
  }
>(
  expenses: T[],
  currentUserId: string | undefined,
  assignedFlats: string[],
  assignedBuildings: string[],
  isManager: boolean,
  assignedAccountId?: string | null
): T[] {
  if (!isManager) return expenses
  const allowedFlats = new Set(assignedFlats)
  const allowedBuildings = new Set(assignedBuildings)

  return expenses.filter((e) => {
    // 1. Expenses paid / recorded directly by this manager
    if (currentUserId && e.paid_by === currentUserId) {
      return true
    }

    // 2. Expenses drawn from this manager's cash drawer
    if (assignedAccountId && e.source_account_id === assignedAccountId) {
      return true
    }

    // 3. Expenses strictly tied to this manager's assigned flat
    if (e.flat_id && allowedFlats.has(e.flat_id)) {
      return true
    }

    // 4. Expenses strictly tied to this manager's assigned building
    if (e.building_id && allowedBuildings.has(e.building_id)) {
      return true
    }

    return false
  })
}

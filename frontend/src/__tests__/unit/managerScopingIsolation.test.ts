import { describe, it, expect } from 'vitest'
import {
  isScopedManager,
  isGlobalAdmin,
  canManagerAccessFlat,
  canManagerAccessBuilding,
  deriveAssignedBuildingsFromFlats,
  filterBuildingsForManager,
  filterFlatsForManager,
  filterRoomsForManager,
  filterSeatsForManager,
  filterBoardersForManager,
  filterKitchenFlatsForManager,
  filterReceiptsForManager,
  filterExpensesForManager,
} from '@/utils/managerScoping'
import { getVisibleFinancialAccounts } from '@/features/billing/api/useReceipts'
import type { Profile, FinancialAccount } from '@/types/database'

describe('Manager Building & Flat Scoping and Cross-Manager Isolation Engine', () => {
  // Mock IDs
  const SATTAR_TOWER_BLD_ID = 'bld-sattar-tower'
  const BITHIKA_HOUSE_BLD_ID = 'bld-bithika-house'

  const FLAT_206_ID = 'flat-206-id'
  const FLAT_207_ID = 'flat-207-id'
  const FLAT_301_ID = 'flat-301-bithika-id'

  // Mock Profiles
  const superAdminProfile: Profile = {
    id: 'p-owner',
    email: 'shadin0158@gmail.com',
    full_name: 'হোস্টেল এডমিন (মালিক)',
    phone_number: '01712394767',
    role: 'SUPER_ADMIN',
    is_active: true,
    preferred_language: 'bn',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const managerEnamulProfile: Profile = {
    id: 'p-manager-enamul',
    email: 'enamul@bachelorhome.erp',
    full_name: 'মোঃ এনামুল হক (ম্যানেজার)',
    phone_number: '01800000003',
    role: 'MANAGER',
    is_active: true,
    preferred_language: 'bn',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const managerTanvirProfile: Profile = {
    id: 'p-manager-tanvir',
    email: 'tanvir@bachelorhome.erp',
    full_name: 'ম্যানেজার তানভীর (ম্যানেজার ১)',
    phone_number: '01800000001',
    role: 'MANAGER',
    is_active: true,
    preferred_language: 'bn',
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Enamul is assigned ONLY Bithika House (Flat 301)
  const enamulAssignedFlats = [FLAT_301_ID]
  const enamulAssignedBuildings = [BITHIKA_HOUSE_BLD_ID]

  // Tanvir is assigned Sattar Tower (Flat 206, 207)
  const tanvirAssignedFlats = [FLAT_206_ID, FLAT_207_ID]
  const tanvirAssignedBuildings = [SATTAR_TOWER_BLD_ID]

  // Mock Buildings & Flats
  const allBuildings = [
    { id: SATTAR_TOWER_BLD_ID, name: 'সাত্তার টাওয়ার (Sattar Tower)' },
    { id: BITHIKA_HOUSE_BLD_ID, name: 'বিথীকা হাউজ (Bithika House)' },
  ]

  const allFlats = [
    { id: FLAT_206_ID, flat_code: 'FLAT-206', name: 'Flat-206', building_id: SATTAR_TOWER_BLD_ID },
    { id: FLAT_207_ID, flat_code: 'FLAT-207', name: 'Flat-207', building_id: SATTAR_TOWER_BLD_ID },
    { id: FLAT_301_ID, flat_code: 'FLAT-301', name: 'ফ্ল্যাট নং ৩০১ (বিথীকা হাউজ)', building_id: BITHIKA_HOUSE_BLD_ID },
  ]

  const allRooms = [
    { id: 'room-206-a', flat_id: FLAT_206_ID, name: 'Room 206-A' },
    { id: 'room-206-b', flat_id: FLAT_206_ID, name: 'Room 206-B' },
    { id: 'room-301-a', flat_id: FLAT_301_ID, name: 'Room 301-A (Bithika)' },
  ]

  const allSeats = [
    { id: 'seat-206-b1', room_id: 'room-206-b', room: { flat_id: FLAT_206_ID } },
    { id: 'seat-206-c1', room_id: 'room-206-a', room: { flat_id: FLAT_206_ID } },
    { id: 'seat-301-a1', room_id: 'room-301-a', room: { flat_id: FLAT_301_ID } },
  ]

  describe('1. Role Privilege & Assignment Scoping Checks', () => {
    it('correctly identifies manager role vs global admin roles', () => {
      expect(isScopedManager(managerEnamulProfile)).toBe(true)
      expect(isScopedManager(managerTanvirProfile)).toBe(true)
      expect(isScopedManager(superAdminProfile)).toBe(false)

      expect(isGlobalAdmin(superAdminProfile)).toBe(true)
      expect(isGlobalAdmin(managerEnamulProfile)).toBe(false)
    })

    it('derives assigned buildings accurately from flat assignments', () => {
      const derived = deriveAssignedBuildingsFromFlats(allFlats, enamulAssignedFlats)
      expect(derived).toEqual([BITHIKA_HOUSE_BLD_ID])
      expect(derived).not.toContain(SATTAR_TOWER_BLD_ID)
    })

    it('enforces flat and building level access predicates', () => {
      // Enamul can access Bithika House but NOT Sattar Tower
      expect(canManagerAccessBuilding(BITHIKA_HOUSE_BLD_ID, enamulAssignedBuildings, true)).toBe(true)
      expect(canManagerAccessBuilding(SATTAR_TOWER_BLD_ID, enamulAssignedBuildings, true)).toBe(false)

      expect(canManagerAccessFlat(FLAT_301_ID, enamulAssignedFlats, true)).toBe(true)
      expect(canManagerAccessFlat(FLAT_206_ID, enamulAssignedFlats, true)).toBe(false)
      expect(canManagerAccessFlat(FLAT_207_ID, enamulAssignedFlats, true)).toBe(false)

      // Tanvir can access Sattar Tower but NOT Bithika House
      expect(canManagerAccessBuilding(SATTAR_TOWER_BLD_ID, tanvirAssignedBuildings, true)).toBe(true)
      expect(canManagerAccessBuilding(BITHIKA_HOUSE_BLD_ID, tanvirAssignedBuildings, true)).toBe(false)

      // Super Admin bypasses restrictions
      expect(canManagerAccessBuilding(SATTAR_TOWER_BLD_ID, [], false)).toBe(true)
      expect(canManagerAccessFlat(FLAT_206_ID, [], false)).toBe(true)
    })
  })

  describe('2. Accommodation Isolation (Buildings, Flats, Rooms, Seats)', () => {
    it('restricts buildings: Md. Enamul Haque sees ONLY Bithika House', () => {
      const enamulBuildings = filterBuildingsForManager(allBuildings, enamulAssignedBuildings, true)
      expect(enamulBuildings).toHaveLength(1)
      expect(enamulBuildings[0].id).toBe(BITHIKA_HOUSE_BLD_ID)
      expect(enamulBuildings.some((b) => b.id === SATTAR_TOWER_BLD_ID)).toBe(false)

      // Super Admin sees all buildings
      const adminBuildings = filterBuildingsForManager(allBuildings, [], false)
      expect(adminBuildings).toHaveLength(2)
    })

    it('restricts flats: Md. Enamul Haque sees ONLY Flat-301 and NEVER Flat-206 or 207', () => {
      const enamulFlats = filterFlatsForManager(allFlats, enamulAssignedFlats, true)
      expect(enamulFlats).toHaveLength(1)
      expect(enamulFlats[0].id).toBe(FLAT_301_ID)
      expect(enamulFlats.some((f) => f.id === FLAT_206_ID)).toBe(false)
      expect(enamulFlats.some((f) => f.id === FLAT_207_ID)).toBe(false)

      // Tanvir sees only Sattar Tower flats
      const tanvirFlats = filterFlatsForManager(allFlats, tanvirAssignedFlats, true)
      expect(tanvirFlats).toHaveLength(2)
      expect(tanvirFlats.some((f) => f.id === FLAT_301_ID)).toBe(false)
    })

    it('restricts rooms: Md. Enamul Haque sees only rooms in Bithika House', () => {
      const enamulRooms = filterRoomsForManager(allRooms, enamulAssignedFlats, true)
      expect(enamulRooms).toHaveLength(1)
      expect(enamulRooms[0].id).toBe('room-301-a')
    })

    it('restricts seats: Md. Enamul Haque sees only seats in Bithika House', () => {
      const enamulSeats = filterSeatsForManager(allSeats, enamulAssignedFlats, true)
      expect(enamulSeats).toHaveLength(1)
      expect(enamulSeats[0].id).toBe('seat-301-a1')
    })
  })

  describe('3. Boarder & Meal Scoping Isolation', () => {
    const mockBoarders = [
      {
        id: 'b-imran',
        full_name: 'আল-ইমরান',
        boarder_code: 'BDR-2026-7652',
        status: 'ACTIVE',
        active_allocation: {
          seat: { room: { flat_id: FLAT_206_ID, flat: { id: FLAT_206_ID, flat_code: 'FLAT-206' } } },
        },
      },
      {
        id: 'b-hashem',
        full_name: 'হাশেম',
        boarder_code: 'BDR-2026-9890',
        status: 'ACTIVE',
        active_allocation: {
          seat: { room: { flat_id: FLAT_206_ID, flat: { id: FLAT_206_ID, flat_code: 'FLAT-206' } } },
        },
      },
      {
        id: 'b-bithika-boarder',
        full_name: 'সাকিব (বিথীকা হাউজ বোর্ডার)',
        boarder_code: 'BDR-2026-3011',
        status: 'ACTIVE',
        active_allocation: {
          seat: { room: { flat_id: FLAT_301_ID, flat: { id: FLAT_301_ID, flat_code: 'FLAT-301' } } },
        },
      },
      {
        id: 'b-applicant',
        full_name: 'নতুন আবেদনকারী',
        boarder_code: 'APP-1001',
        status: 'PENDING',
        active_allocation: null,
      },
    ]

    it('Md. Enamul Haque NEVER sees Sattar Tower boarders (Al-Imran, Hashem)', () => {
      const enamulBoarders = filterBoardersForManager(mockBoarders, enamulAssignedFlats, true)
      expect(enamulBoarders.some((b) => b.full_name === 'আল-ইমরান')).toBe(false)
      expect(enamulBoarders.some((b) => b.full_name === 'হাশেম')).toBe(false)

      // But can see boarders belonging to Bithika House and pending applicants
      expect(enamulBoarders.some((b) => b.id === 'b-bithika-boarder')).toBe(true)
      expect(enamulBoarders.some((b) => b.id === 'b-applicant')).toBe(true)
    })

    it('filters kitchen meal flat summaries: Bithika House manager sees ONLY Flat-301', () => {
      const kitchenSummaries = [
        { flat_id: FLAT_206_ID, flat_name: 'Flat-206', total_meals: 18 },
        { flat_id: FLAT_207_ID, flat_name: 'Flat-207', total_meals: 15 },
        { flat_id: FLAT_301_ID, flat_name: 'ফ্ল্যাট নং ৩০১ (বিথীকা হাউজ)', total_meals: 5 },
      ]

      const enamulKitchen = filterKitchenFlatsForManager(kitchenSummaries, enamulAssignedFlats, true)
      expect(enamulKitchen).toHaveLength(1)
      expect(enamulKitchen[0].flat_id).toBe(FLAT_301_ID)
      expect(enamulKitchen.some((k) => k.flat_id === FLAT_206_ID)).toBe(false)
      expect(enamulKitchen.some((k) => k.flat_id === FLAT_207_ID)).toBe(false)

      // Super Admin sees all 3 flats
      const adminKitchen = filterKitchenFlatsForManager(kitchenSummaries, [], false)
      expect(adminKitchen).toHaveLength(3)
    })
  })

  describe('4. Cross-Manager Financial Isolation (Receipts, Expenses & Accounts)', () => {
    const mockReceipts = [
      {
        id: 'rct-1',
        receipt_number: 'RCT-2026-001',
        amount: 5000,
        collected_by: managerTanvirProfile.id,
        boarder_id: 'b-imran',
      },
      {
        id: 'rct-2',
        receipt_number: 'RCT-2026-002',
        amount: 4500,
        collected_by: managerEnamulProfile.id,
        boarder_id: 'b-bithika-boarder',
      },
    ]

    const mockExpenses = [
      {
        id: 'exp-1',
        expense_voucher_no: 'EXP-001',
        amount: 1200,
        paid_by: managerTanvirProfile.id,
        building_id: SATTAR_TOWER_BLD_ID,
        flat_id: FLAT_206_ID,
      },
      {
        id: 'exp-2',
        expense_voucher_no: 'EXP-002',
        amount: 800,
        paid_by: managerEnamulProfile.id,
        building_id: BITHIKA_HOUSE_BLD_ID,
        flat_id: FLAT_301_ID,
      },
    ]

    const mockFinancialAccounts: FinancialAccount[] = [
      {
        id: 'acc-mgr-1',
        account_name: 'Manager Cash Box (ম্যানেজার ক্যাশ তানভীর)',
        account_type: 'CASH_MANAGER',
        account_number: 'MGR-CASH-01',
        bank_name: 'Cash Safe 1',
        opening_balance: 0,
        current_balance: 11954,
        is_active: true,
        assigned_manager_id: managerTanvirProfile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'acc-mgr-2',
        account_name: 'ম্যানেজার ক্যাশ ড্রয়ার (এনামুল হক)',
        account_type: 'CASH_MANAGER',
        account_number: 'MGR-CASH-02',
        bank_name: 'Cash Safe 2',
        opening_balance: 0,
        current_balance: 3500,
        is_active: true,
        assigned_manager_id: managerEnamulProfile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'acc-vault',
        account_name: 'Hostel Main Vault (মেইন ভল্ট)',
        account_type: 'CASH_OWNER',
        account_number: 'MAIN-VAULT-01',
        bank_name: 'Central Safe',
        opening_balance: 50000,
        current_balance: 50000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    it('Cross-Manager Receipt Isolation: Enamul cannot see Tanvir receipts and vice-versa', () => {
      const enamulReceipts = filterReceiptsForManager(
        mockReceipts,
        managerEnamulProfile.id,
        enamulAssignedFlats,
        true
      )
      expect(enamulReceipts).toHaveLength(1)
      expect(enamulReceipts[0].id).toBe('rct-2')
      expect(enamulReceipts.some((r) => r.collected_by === managerTanvirProfile.id)).toBe(false)

      const tanvirReceipts = filterReceiptsForManager(
        mockReceipts,
        managerTanvirProfile.id,
        tanvirAssignedFlats,
        true
      )
      expect(tanvirReceipts).toHaveLength(1)
      expect(tanvirReceipts[0].id).toBe('rct-1')
      expect(tanvirReceipts.some((r) => r.collected_by === managerEnamulProfile.id)).toBe(false)

      // Super Admin sees all receipts
      const adminReceipts = filterReceiptsForManager(mockReceipts, superAdminProfile.id, [], false)
      expect(adminReceipts).toHaveLength(2)
    })

    it('Cross-Manager Expense Isolation: Enamul cannot see Tanvir expenses and vice-versa', () => {
      const enamulExpenses = filterExpensesForManager(
        mockExpenses,
        managerEnamulProfile.id,
        enamulAssignedFlats,
        enamulAssignedBuildings,
        true
      )
      expect(enamulExpenses).toHaveLength(1)
      expect(enamulExpenses[0].id).toBe('exp-2')
      expect(enamulExpenses.some((e) => e.paid_by === managerTanvirProfile.id)).toBe(false)

      // Super Admin sees all expenses
      const adminExpenses = filterExpensesForManager(mockExpenses, superAdminProfile.id, [], [], false)
      expect(adminExpenses).toHaveLength(2)
    })

    it('Financial Account Isolation: Manager sees ONLY their own cash drawer, never another manager or central vault', () => {
      const enamulAccounts = getVisibleFinancialAccounts(mockFinancialAccounts, managerEnamulProfile)
      expect(enamulAccounts).toHaveLength(1)
      expect(enamulAccounts[0].account_number).toBe('MGR-CASH-02')
      expect(enamulAccounts[0].assigned_manager_id).toBe(managerEnamulProfile.id)

      const tanvirAccounts = getVisibleFinancialAccounts(mockFinancialAccounts, managerTanvirProfile)
      expect(tanvirAccounts).toHaveLength(1)
      expect(tanvirAccounts[0].account_number).toBe('MGR-CASH-01')
      expect(tanvirAccounts[0].assigned_manager_id).toBe(managerTanvirProfile.id)

      // Super Admin sees ALL accounts including Central Safe and both manager boxes
      const adminAccounts = getVisibleFinancialAccounts(mockFinancialAccounts, superAdminProfile)
      expect(adminAccounts).toHaveLength(3)
    })
  })

  describe('4. Dashboard Meal Preparation & Occupancy Scoping for Manager with 0 Boarders', () => {
    it('guarantees 0 meals today and tomorrow when a manager assigned flat has no boarders', () => {
      // Enamul is assigned FLAT_301_ID (Bithika House). Flat 301 currently has 0 allocations and 0 boarders.
      const isManager = isScopedManager(managerEnamulProfile)
      expect(isManager).toBe(true)

      const enamulFlats = [FLAT_301_ID]
      const allFlatsAllocations: any[] = [
        // Sattar Tower Flat-206 allocations
        { id: 'alloc-1', boarder_id: 'bdr-imran', seat: { room: { flat_id: FLAT_206_ID } } },
        { id: 'alloc-2', boarder_id: 'bdr-hashem', seat: { room: { flat_id: FLAT_206_ID } } },
      ]

      // Filter allocations strictly for Enamul
      const scopedAllocations = allFlatsAllocations.filter((a) => {
        const fId = a.seat?.room?.flat_id
        return fId && enamulFlats.includes(fId)
      })

      expect(scopedAllocations).toHaveLength(0)

      // Resolve scoped boarders
      const scopedBoarderIds = new Set<string>()
      scopedAllocations.forEach((a) => {
        if (a.boarder_id) scopedBoarderIds.add(a.boarder_id)
      })
      expect(scopedBoarderIds.size).toBe(0)

      // Active residents today/tomorrow for Enamul must be empty
      const residentBoarderIdsToday: string[] = Array.from(scopedBoarderIds)
      expect(residentBoarderIdsToday).toHaveLength(0)

      // Calculate meal counts
      let countToday = 0
      let countTomorrow = 0
      if (residentBoarderIdsToday.length > 0) {
        countToday = residentBoarderIdsToday.length * 2.5
        countTomorrow = residentBoarderIdsToday.length * 2.5
      }

      const effectiveResidentsToday = residentBoarderIdsToday.length
      const maxPossibleMealsToday = effectiveResidentsToday * 2.5
      const mealAttendanceRate = maxPossibleMealsToday > 0 ? (countToday / maxPossibleMealsToday) * 100 : 0
      const estimatedMonthlyMealBill = countToday * 30 * 60

      expect(countToday).toBe(0)
      expect(countTomorrow).toBe(0)
      expect(mealAttendanceRate).toBe(0)
      expect(estimatedMonthlyMealBill).toBe(0)
    })

    it('dynamically computes meals when boarders are later assigned to Bithika House', () => {
      const enamulFlats = [FLAT_301_ID]
      const newAllocations: any[] = [
        { id: 'alloc-301-1', boarder_id: 'bdr-sakib', seat: { room: { flat_id: FLAT_301_ID } } },
        { id: 'alloc-301-2', boarder_id: 'bdr-rakib', seat: { room: { flat_id: FLAT_301_ID } } },
      ]

      const scopedAllocations = newAllocations.filter((a) => {
        const fId = a.seat?.room?.flat_id
        return fId && enamulFlats.includes(fId)
      })
      expect(scopedAllocations).toHaveLength(2)

      const residentBoarderIdsToday = scopedAllocations.map((a) => a.boarder_id)
      const countToday = residentBoarderIdsToday.length * 2.5 // 2 * 2.5 = 5.0 meals
      const maxPossibleMealsToday = residentBoarderIdsToday.length * 2.5
      const mealAttendanceRate = (countToday / maxPossibleMealsToday) * 100
      const estimatedMonthlyMealBill = countToday * 30 * 60

      expect(countToday).toBe(5)
      expect(mealAttendanceRate).toBe(100)
      expect(estimatedMonthlyMealBill).toBe(9000)
    })
  })
})

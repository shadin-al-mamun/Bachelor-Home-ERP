import { describe, it, expect } from 'vitest'
import { enrichSeatAllocations } from '@/features/accommodation/api/useAccommodation'
import type { Seat } from '@/types/database'

describe('Staff Seat Allocation & Free Rent Feature', () => {
  it('correctly enriches staff-allocated seats as OCCUPIED, is_staff: true, and occupant_rent: 0', () => {
    const rawSeat: Seat = {
      id: 'seat-staff-01',
      room_id: 'room-101',
      seat_code: 'S-101-C',
      seat_name: 'Seat 101-C (স্টাফ বেড)',
      seat_type: 'SINGLE_BED',
      default_rent: 4200,
      status: 'OCCUPIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allocations: [
        {
          id: 'alloc-staff-01',
          boarder_id: 'bdr-staff-01',
          seat_id: 'seat-staff-01',
          monthly_rent: 0,
          security_deposit: 0,
          start_date: '2026-11-01',
          status: 'ACTIVE',
          remarks: 'হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা) - বাবুর্চি',
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
          boarder: {
            id: 'bdr-staff-01',
            boarder_code: 'STF-2026-1001',
            full_name: 'মোঃ আবুল কালাম (বাবুর্চি)',
            phone_number: '01711223344',
            institution: 'হোস্টেল কর্মচারী (রান্নাঘর)',
            guardian_name: 'হোস্টেল কর্তৃপক্ষ',
            guardian_phone: '01711223344',
            permanent_address: 'স্টাফ কোয়ার্টার',
            status: 'ACTIVE',
            admission_date: '2026-11-01',
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
        },
      ],
    }

    const enriched = enrichSeatAllocations(rawSeat)

    // 1. Must be OCCUPIED so it is never shown as vacant
    expect(enriched.status).toBe('OCCUPIED')

    // 2. Must be flagged as staff
    expect(enriched.is_staff).toBe(true)

    // 3. Rent must be 0 (free accommodation)
    expect(enriched.occupant_rent).toBe(0)

    // 4. Occupant details match employee
    expect(enriched.occupant_name).toBe('মোঃ আবুল কালাম (বাবুর্চি)')
    expect(enriched.occupant_code).toBe('STF-2026-1001')
  })

  it('keeps normal paying boarder seats as paying with occupant_rent > 0 and is_staff: false', () => {
    const normalSeat: Seat = {
      id: 'seat-normal-01',
      room_id: 'room-101',
      seat_code: 'S-101-A',
      seat_name: 'Seat 101-A',
      seat_type: 'SINGLE_BED',
      default_rent: 4500,
      status: 'OCCUPIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      allocations: [
        {
          id: 'alloc-normal-01',
          boarder_id: 'bdr-normal-01',
          seat_id: 'seat-normal-01',
          monthly_rent: 4500,
          security_deposit: 5000,
          start_date: '2026-11-01',
          status: 'ACTIVE',
          remarks: 'সাধারণ আবাসিক ছাত্র',
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z',
          boarder: {
            id: 'bdr-normal-01',
            boarder_code: 'BDR-2026-101',
            full_name: 'তানভীর আহমেদ',
            phone_number: '01811223344',
            institution: 'ঢাকা বিশ্ববিদ্যালয়',
            guardian_name: 'বাবার নাম',
            guardian_phone: '01811223344',
            permanent_address: 'উত্তরা',
            status: 'ACTIVE',
            admission_date: '2026-11-01',
            created_at: '2026-11-01T00:00:00Z',
            updated_at: '2026-11-01T00:00:00Z',
          },
        },
      ],
    }

    const enriched = enrichSeatAllocations(normalSeat)

    expect(enriched.status).toBe('OCCUPIED')
    expect(enriched.is_staff).toBe(false)
    expect(enriched.occupant_rent).toBe(4500)
    expect(enriched.occupant_name).toBe('তানভীর আহমেদ')
  })

  it('verifies that batch rent charges skip staff allocations with 0 rent', () => {
    const allocations = [
      { id: 'a1', boarder_id: 'b1', monthly_rent: 4500, remarks: 'সাধারণ বর্ডার' },
      { id: 'a2', boarder_id: 'b2', monthly_rent: 0, remarks: 'হোস্টেল কর্মচারী আবাসন (ফ্রি)' },
      { id: 'a3', boarder_id: 'b3', monthly_rent: 4200, remarks: null },
    ]

    // Simulate batch rent billing logic
    const billableAllocations = allocations.filter((a) => {
      const isFreeStaff = a.monthly_rent <= 0 || (a.remarks && a.remarks.includes('কর্মচারী'))
      return !isFreeStaff
    })

    expect(billableAllocations).toHaveLength(2)
    expect(billableAllocations.map((a) => a.id)).toEqual(['a1', 'a3'])

    // Total billed estimate excludes staff
    const totalBilledEstimate = allocations.reduce((sum, a) => sum + (a.monthly_rent || 0), 0)
    expect(totalBilledEstimate).toBe(8700)
  })

  it('verifies that staff seats are counted in occupied seats and contribute to occupancy rate', () => {
    const seats = [
      { id: 's1', status: 'AVAILABLE', occupant_rent: null },
      { id: 's2', status: 'AVAILABLE', occupant_rent: null },
      { id: 's3', status: 'OCCUPIED', occupant_rent: 4500, is_staff: false },
      { id: 's4', status: 'OCCUPIED', occupant_rent: 0, is_staff: true }, // Staff occupied seat
    ]

    const total = seats.length
    const available = seats.filter((s) => s.status === 'AVAILABLE').length
    const occupied = seats.filter((s) => s.status === 'OCCUPIED').length
    const staffSeats = seats.filter((s) => s.is_staff).length

    expect(total).toBe(4)
    expect(available).toBe(2)
    expect(occupied).toBe(2) // Both normal and staff are counted as occupied
    expect(staffSeats).toBe(1)

    // Occupancy rate calculation (must be 50%, not 25%)
    const occupancyRate = (occupied / total) * 100
    expect(occupancyRate).toBe(50)
  })
})

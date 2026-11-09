import { describe, it, expect } from 'vitest'
import { enrichSeatAllocations } from '@/features/accommodation/api/useAccommodation'

describe('Seat Allocation Enrichment - Vacant Advance Booking vs Handover', () => {
  it('correctly enriches a previously vacant seat with future booking (Seat C-1, Abu Bakar from 11 Nov 2026)', () => {
    const seatC1 = {
      id: 'seat-c-1',
      seat_code: 'Seat C-1',
      seat_name: 'Seat C-1',
      seat_type: 'SINGLE_BED',
      default_rent: 2900,
      status: 'OCCUPIED',
      allocations: [
        {
          id: 'alloc-abu-bakar',
          boarder_id: 'bdr-abu-bakar',
          seat_id: 'seat-c-1',
          status: 'ACTIVE',
          monthly_rent: 2900,
          start_date: '2026-11-11', // starts in the future (today is before 11 Nov)
          end_date: null,
          boarder: {
            id: 'bdr-abu-bakar',
            full_name: 'আবু বকর',
            boarder_code: 'BDR-2026-5784',
            phone_number: '01700000000',
            status: 'ACTIVE',
            leaving_date: null,
          },
        },
      ],
    }

    const enriched = enrichSeatAllocations(seatC1)

    // Critical assertion: Because Seat C-1 was previously empty, occupant_name MUST be null
    expect(enriched.occupant_name).toBeNull()
    expect(enriched.occupant_code).toBeNull()
    // It must NOT have a departure notice because no one was living there to depart
    expect(enriched.has_notice_to_vacate).toBe(false)
    expect(enriched.vacate_date).toBeNull()

    // It MUST have upcoming allocation for Abu Bakar
    expect(enriched.has_upcoming_allocation).toBe(true)
    expect(enriched.upcoming_occupant_name).toBe('আবু বকর')
    expect(enriched.upcoming_occupant_code).toBe('BDR-2026-5784')
    expect(enriched.upcoming_start_date).toBe('2026-11-11')
  })

  it('correctly handles handover when a seat has both a current resident leaving and upcoming booking (Seat B-1)', () => {
    const seatB1 = {
      id: 'seat-b-1',
      seat_code: 'Seat B-1',
      seat_name: 'Seat B-1',
      seat_type: 'SINGLE_BED',
      default_rent: 2400,
      status: 'OCCUPIED',
      allocations: [
        {
          id: 'alloc-imran',
          boarder_id: 'bdr-imran',
          seat_id: 'seat-b-1',
          status: 'ACTIVE',
          monthly_rent: 2400,
          start_date: '2026-10-20',
          end_date: '2026-11-30', // scheduled to vacate on 30 Nov
          cancellation_reason: 'সিট ছাড়ার নোটিশ',
          boarder: {
            id: 'bdr-imran',
            full_name: 'আল-ইমরান',
            boarder_code: 'BDR-2026-7652',
            phone_number: '01683877525',
            status: 'ACTIVE',
            leaving_date: '2026-11-30',
          },
        },
        {
          id: 'alloc-hashem',
          boarder_id: 'bdr-hashem',
          seat_id: 'seat-b-1',
          status: 'ACTIVE',
          monthly_rent: 2400,
          start_date: '2026-12-01', // starts 01 Dec 2026
          end_date: null,
          boarder: {
            id: 'bdr-hashem',
            full_name: 'হাশেম',
            boarder_code: 'BDR-2026-9890',
            phone_number: '01712394768',
            status: 'ACTIVE',
            leaving_date: null,
          },
        },
      ],
    }

    const enriched = enrichSeatAllocations(seatB1)

    // Current occupant is Al-Imran with notice
    expect(enriched.occupant_name).toBe('আল-ইমরান')
    expect(enriched.occupant_code).toBe('BDR-2026-7652')
    expect(enriched.has_notice_to_vacate).toBe(true)
    expect(enriched.vacate_date).toBe('2026-11-30')

    // Upcoming occupant is Hashem starting 01 Dec 2026
    expect(enriched.has_upcoming_allocation).toBe(true)
    expect(enriched.upcoming_occupant_name).toBe('হাশেম')
    expect(enriched.upcoming_occupant_code).toBe('BDR-2026-9890')
    expect(enriched.upcoming_start_date).toBe('2026-12-01')
  })
})

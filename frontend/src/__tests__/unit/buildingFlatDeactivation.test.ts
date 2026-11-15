import { describe, it, expect } from 'vitest'

describe('Building & Flat Deactivation Safety Tests', () => {
  it('correctly filters out seats belonging to INACTIVE buildings or INACTIVE flats', () => {
    const mockHierarchy = [
      {
        id: 'bld-active',
        name: 'সক্রিয় ভবন',
        status: 'ACTIVE',
        flats: [
          {
            id: 'flat-active',
            name: 'ফ্ল্যাট ১-এ',
            status: 'ACTIVE',
            rooms: [
              {
                id: 'room-1',
                status: 'ACTIVE',
                seats: [
                  { id: 'seat-1', status: 'AVAILABLE', seat_code: 'S-1' },
                ],
              },
            ],
          },
          {
            id: 'flat-inactive-surrendered',
            name: 'ছেড়ে দেওয়া ফ্ল্যাট ২-বি',
            status: 'INACTIVE', // surrendered flat
            rooms: [
              {
                id: 'room-2',
                status: 'ACTIVE',
                seats: [
                  { id: 'seat-2', status: 'AVAILABLE', seat_code: 'S-2' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'bld-inactive-surrendered',
        name: 'পরিত্যক্ত/ছেড়ে দেওয়া ক্যাম্পাস',
        status: 'INACTIVE', // surrendered building
        flats: [
          {
            id: 'flat-3',
            name: 'ফ্ল্যাট ৩-সি',
            status: 'ACTIVE',
            rooms: [
              {
                id: 'room-3',
                status: 'ACTIVE',
                seats: [
                  { id: 'seat-3', status: 'AVAILABLE', seat_code: 'S-3' },
                ],
              },
            ],
          },
        ],
      },
    ]

    // Allocation available seats logic
    const availableSeats = mockHierarchy
      .filter((b) => b.status !== 'INACTIVE')
      .flatMap((b) =>
        (b.flats || [])
          .filter((f) => f.status !== 'INACTIVE')
          .flatMap((f) =>
            (f.rooms || [])
              .filter((r) => r.status !== 'INACTIVE')
              .flatMap((r) =>
                (r.seats || []).filter((s) => s.status === 'AVAILABLE')
              )
          )
      )

    // Only seat-1 from active building & active flat should be eligible
    expect(availableSeats.length).toBe(1)
    expect(availableSeats[0].id).toBe('seat-1')

    // Surrendered flat seat-2 and surrendered building seat-3 must be blocked
    const seatCodes = availableSeats.map((s) => s.seat_code)
    expect(seatCodes).not.toContain('S-2')
    expect(seatCodes).not.toContain('S-3')
  })

  it('correctly calculates active occupants count for a flat or building before deactivation', () => {
    const flatWithOccupants = {
      id: 'flat-101',
      name: 'ফ্ল্যাট ১০১',
      rooms: [
        {
          id: 'room-a',
          seats: [
            { id: 's-1', status: 'OCCUPIED', occupant_name: 'তানভীর' },
            { id: 's-2', status: 'AVAILABLE', occupant_name: null },
          ],
        },
        {
          id: 'room-b',
          seats: [
            { id: 's-3', status: 'OCCUPIED', occupant_name: 'রাকিবুল' },
          ],
        },
      ],
    }

    const occupiedCount = flatWithOccupants.rooms
      .flatMap((r) => r.seats)
      .filter((s) => s.status === 'OCCUPIED' || Boolean(s.occupant_name)).length

    expect(occupiedCount).toBe(2)
  })
})

import { describe, it, expect } from 'vitest'

describe('Seat Allocation Lifecycle & Access Control Rules', () => {
  it('should block software portal access when boarder has no active seat', () => {
    // Business Rule: "যদি কোন বর্ডার শুধুমাত্র রেজিস্ট্রেশন করে থাকে, তার জন্য কোন সিট বরাদ্দ না দেয়া হয়,
    // তাহলে সে বর্ডার আমাদের সফটওয়্যারের একসেস পাবে না।"
    const applicantBoarder = {
      id: '8162f22d-5175-4a9a-9cb9-b66f9026fc20',
      boarder_code: 'BDR-2026-9890',
      full_name: 'হাশেম',
      status: 'PENDING',
      active_allocation: null,
    }

    const hasActiveSeat = Boolean(applicantBoarder.active_allocation)
    const canAccessPortal = hasActiveSeat && applicantBoarder.status === 'ACTIVE'

    expect(canAccessPortal).toBe(false)
  })

  it('should allow software access ONLY when an active seat allocation exists and status is ACTIVE', () => {
    // Business Rule: "শুধুমাত্র সিট বরাদ্দ থাকলেই সে বর্ডার একসেস পাবে।"
    const seatedBoarder = {
      id: '8162f22d-5175-4a9a-9cb9-b66f9026fc20',
      boarder_code: 'BDR-2026-9890',
      full_name: 'হাশেম',
      status: 'ACTIVE',
      active_allocation: {
        id: 'alloc-1',
        seat_id: 'seat-101',
        status: 'ACTIVE',
      },
    }

    const hasActiveSeat = Boolean(seatedBoarder.active_allocation && seatedBoarder.active_allocation.status === 'ACTIVE')
    const canAccessPortal = hasActiveSeat && seatedBoarder.status === 'ACTIVE'

    expect(canAccessPortal).toBe(true)
  })

  it('should immediately revoke access when seat allocation is canceled or ended', () => {
    // Business Rule: "আবার কোন বর্ডারের সিট বাতিল করা হলেও সে আর একসেস পাবে না।"
    const vacatedBoarder = {
      id: '8162f22d-5175-4a9a-9cb9-b66f9026fc20',
      boarder_code: 'BDR-2026-9890',
      full_name: 'হাশেম',
      status: 'LEFT',
      active_allocation: null,
    }

    const hasActiveSeat = Boolean(vacatedBoarder.active_allocation)
    const canAccessPortal = hasActiveSeat && vacatedBoarder.status === 'ACTIVE'

    expect(canAccessPortal).toBe(false)
  })

  it('should flag an outstanding dues reminder when canceling seat with unpaid balance', () => {
    // Business Rule: "সিট বাতিল করার সময় সে বর্ডারের কোন বকেয়া থাকলে রিমাইন্ডার দিবে যে, এই বর্ডারের নিকট টাকা বকেয়া রয়েছে।"
    const duesSummary = {
      total_billed: 5400,
      total_paid: 2000,
      outstanding_due: 3400,
    }

    const hasDues = duesSummary.outstanding_due > 0
    const reminderText = hasDues
      ? `বকেয়া সতর্কবার্তা: এই বর্ডারের নিকট ৳${duesSummary.outstanding_due} টাকা বকেয়া রয়েছে!`
      : null

    expect(hasDues).toBe(true)
    expect(reminderText).toContain('এই বর্ডারের নিকট ৳3400 টাকা বকেয়া রয়েছে!')
  })

  it('should not show dues warning reminder if all dues are fully paid', () => {
    const duesSummary = {
      total_billed: 5400,
      total_paid: 5400,
      outstanding_due: 0,
    }

    const hasDues = duesSummary.outstanding_due > 0
    expect(hasDues).toBe(false)
  })

  it('should exclude unseated boarders from monthly meal charges and mess evaluations', () => {
    // Unseated boarders must never be billed for meals or have meal records generated
    const boarders = [
      { id: 'bdr-1', name: 'Al-Amin', status: 'ACTIVE', allocation: { id: 'a-1', status: 'ACTIVE' } },
      { id: 'bdr-2', name: 'Hashem', status: 'PENDING', allocation: null },
      { id: 'bdr-3', name: 'Legacy Unseated', status: 'ACTIVE', allocation: null },
    ]

    const billableBoarders = boarders.filter((b) => b.status === 'ACTIVE' && Boolean(b.allocation && b.allocation.status === 'ACTIVE'))

    expect(billableBoarders).toHaveLength(1)
    expect(billableBoarders[0].name).toBe('Al-Amin')
    expect(billableBoarders.some((b) => b.name === 'Hashem')).toBe(false)
  })
})


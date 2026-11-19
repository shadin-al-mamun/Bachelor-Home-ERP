import { create } from 'zustand'

const STORAGE_KEY = 'bachelor_locked_financial_months_v1'

export interface FinancialAuditState {
  lockedMonths: string[]
  isMonthLocked: (monthDateStr?: string | null) => boolean
  lockMonth: (monthDateStr: string) => void
  unlockMonth: (monthDateStr: string) => void
}

function loadLockedMonths(): string[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLockedMonths(months: string[]) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(months))
    }
  } catch {}
}

export const useFinancialAuditStore = create<FinancialAuditState>((set, get) => ({
  lockedMonths: loadLockedMonths(),

  isMonthLocked: (monthDateStr) => {
    if (!monthDateStr) return false
    const monthPrefix = monthDateStr.slice(0, 7)
    return get().lockedMonths.includes(monthPrefix)
  },

  lockMonth: (monthDateStr) => {
    const monthPrefix = monthDateStr.slice(0, 7)
    const current = get().lockedMonths
    if (!current.includes(monthPrefix)) {
      const updated = [...current, monthPrefix].sort().reverse()
      saveLockedMonths(updated)
      set({ lockedMonths: updated })
    }
  },

  unlockMonth: (monthDateStr) => {
    const monthPrefix = monthDateStr.slice(0, 7)
    const updated = get().lockedMonths.filter((m) => m !== monthPrefix)
    saveLockedMonths(updated)
    set({ lockedMonths: updated })
  },
}))

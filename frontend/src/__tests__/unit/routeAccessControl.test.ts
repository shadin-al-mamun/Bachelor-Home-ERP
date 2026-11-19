import { describe, it, expect } from 'vitest'
import { resolveMenuIdFromPath } from '@/app/router'
import { useAccessControlStore } from '@/app/store/useAccessControlStore'

describe('Route Access Control Guard & Dynamic Menu Resolution', () => {
  it('correctly maps URL paths to their respective ERP menu IDs', () => {
    expect(resolveMenuIdFromPath('/expenses')).toBe('expenses')
    expect(resolveMenuIdFromPath('/expenses/123')).toBe('expenses')
    expect(resolveMenuIdFromPath('/finance/accounts')).toBe('cashbook')
    expect(resolveMenuIdFromPath('/accounts')).toBe('cashbook')
    expect(resolveMenuIdFromPath('/cash-custody')).toBe('cashbook')
    expect(resolveMenuIdFromPath('/billing/receipts')).toBe('collections')
    expect(resolveMenuIdFromPath('/billing/generate')).toBe('billing')
    expect(resolveMenuIdFromPath('/billing/dues')).toBe('billing')
    expect(resolveMenuIdFromPath('/meals/settings')).toBe('meals')
    expect(resolveMenuIdFromPath('/meals')).toBe('kitchen')
    expect(resolveMenuIdFromPath('/hr/staff')).toBe('hr')
    expect(resolveMenuIdFromPath('/hr/payroll')).toBe('hr')
    expect(resolveMenuIdFromPath('/settings/users')).toBe('governance')
    expect(resolveMenuIdFromPath('/settings/notices')).toBe('notices')
    expect(resolveMenuIdFromPath('/settings/audit-logs')).toBe('audit_logs')
    expect(resolveMenuIdFromPath('/accommodation')).toBe('accommodations')
    expect(resolveMenuIdFromPath('/boarders')).toBe('boarders')
    expect(resolveMenuIdFromPath('/dashboard')).toBe(null)
  })

  it('correctly enforces manager custom access for restricted routes', () => {
    const store = useAccessControlStore.getState()
    const managerId = 'mgr-test-route-1'

    // Super Admin always has access to all menus
    expect(store.hasMenuAccess('SUPER_ADMIN', 'expenses', 'any-id')).toBe(true)

    // Manager has default access to expenses
    expect(store.hasMenuAccess('MANAGER', 'expenses', managerId)).toBe(true)

    // Turn off expenses for this manager specifically
    store.toggleMenuForUser(managerId, 'expenses', 'MANAGER', false)
    expect(store.hasMenuAccess('MANAGER', 'expenses', managerId)).toBe(false)

    // Other manager still has access
    expect(store.hasMenuAccess('MANAGER', 'expenses', 'mgr-test-other')).toBe(true)
  })
})

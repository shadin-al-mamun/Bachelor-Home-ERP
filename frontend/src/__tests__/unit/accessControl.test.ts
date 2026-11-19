import { describe, it, expect, beforeEach } from 'vitest'
import {
  useAccessControlStore,
  ERP_MENU_DEFINITIONS,
} from '@/app/store/useAccessControlStore'

describe('Access Control Store & Role Permissions Matrix', () => {
  beforeEach(() => {
    localStorage.clear()
    useAccessControlStore.getState().resetAllToDefault()
  })

  it('provides unconditional access to SUPER_ADMIN for all menus and options', () => {
    const { hasMenuAccess, hasOptionAccess } = useAccessControlStore.getState()

    ERP_MENU_DEFINITIONS.forEach((menu) => {
      expect(hasMenuAccess('SUPER_ADMIN', menu.id)).toBe(true)
      menu.options.forEach((opt) => {
        expect(hasOptionAccess('SUPER_ADMIN', menu.id, opt.id)).toBe(true)
      })
    })
  })

  it('correctly maps default permissions for MANAGER', () => {
    const { hasMenuAccess, hasOptionAccess } = useAccessControlStore.getState()

    // Operational menus
    expect(hasMenuAccess('MANAGER', 'accommodations')).toBe(true)
    expect(hasMenuAccess('MANAGER', 'boarders')).toBe(true)
    expect(hasMenuAccess('MANAGER', 'cashbook')).toBe(true)
    expect(hasMenuAccess('MANAGER', 'meals')).toBe(true)
    expect(hasMenuAccess('MANAGER', 'collections')).toBe(true)

    // Specific permissions inside collections
    expect(hasOptionAccess('MANAGER', 'collections', 'collect_rent')).toBe(true)
    expect(hasOptionAccess('MANAGER', 'collections', 'print_receipt')).toBe(true)

    // Administrative governance menus should be disabled by default for MANAGER
    expect(hasMenuAccess('MANAGER', 'governance')).toBe(false)
    expect(hasMenuAccess('MANAGER', 'branding')).toBe(false)
    expect(hasMenuAccess('MANAGER', 'audit_logs')).toBe(false)
  })

  it('correctly maps default permissions for ACCOUNTANT', () => {
    const { hasMenuAccess, hasOptionAccess } = useAccessControlStore.getState()

    // Financial menus
    expect(hasMenuAccess('ACCOUNTANT', 'billing')).toBe(true)
    expect(hasMenuAccess('ACCOUNTANT', 'collections')).toBe(true)
    expect(hasMenuAccess('ACCOUNTANT', 'expenses')).toBe(true)
    expect(hasMenuAccess('ACCOUNTANT', 'incomes')).toBe(true)
    expect(hasMenuAccess('ACCOUNTANT', 'transfers')).toBe(true)
    expect(hasMenuAccess('ACCOUNTANT', 'reports')).toBe(true)

    // Meals should be disabled by default for accountant
    expect(hasMenuAccess('ACCOUNTANT', 'meals')).toBe(false)
    expect(hasOptionAccess('ACCOUNTANT', 'meals', 'kitchen_board')).toBe(false)
  })

  it('correctly maps default permissions for MEAL_OPERATOR', () => {
    const { hasMenuAccess, hasOptionAccess } = useAccessControlStore.getState()

    // Kitchen engine menus
    expect(hasMenuAccess('MEAL_OPERATOR', 'meals')).toBe(true)
    expect(hasOptionAccess('MEAL_OPERATOR', 'meals', 'kitchen_board')).toBe(true)
    expect(hasOptionAccess('MEAL_OPERATOR', 'meals', 'toggle_meals')).toBe(true)
    expect(hasOptionAccess('MEAL_OPERATOR', 'meals', 'bazaar_expense')).toBe(true)

    // Non-kitchen modules should be disabled
    expect(hasMenuAccess('MEAL_OPERATOR', 'accommodations')).toBe(false)
    expect(hasMenuAccess('MEAL_OPERATOR', 'billing')).toBe(false)
    expect(hasMenuAccess('MEAL_OPERATOR', 'cashbook')).toBe(false)
  })

  it('allows Super Admin to toggle menu access for an operator role', () => {
    const { toggleMenu, hasMenuAccess } = useAccessControlStore.getState()

    // Initially manager has meals
    expect(hasMenuAccess('MANAGER', 'meals')).toBe(true)

    // Super Admin turns off meals for Manager
    toggleMenu('MANAGER', 'meals', false)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'meals')).toBe(false)

    // Super Admin turns on governance for Manager
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'governance')).toBe(false)
    toggleMenu('MANAGER', 'governance', true)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'governance')).toBe(true)
  })

  it('allows Super Admin to toggle granular option access', () => {
    const { toggleOption, hasOptionAccess } = useAccessControlStore.getState()

    // Initially Manager can create expense
    expect(hasOptionAccess('MANAGER', 'expenses', 'create_expense')).toBe(true)

    // Super Admin revokes create_expense for Manager
    toggleOption('MANAGER', 'expenses', 'create_expense', false)
    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'expenses', 'create_expense')).toBe(false)

    // View expenses should still be allowed
    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'expenses', 'view_expenses')).toBe(true)
  })

  it('supports toggleAllForMenu and toggleAllForRole', () => {
    const { toggleAllForMenu, toggleAllForRole } = useAccessControlStore.getState()

    // Revoke all for role MEAL_OPERATOR
    toggleAllForRole('MEAL_OPERATOR', false)
    expect(useAccessControlStore.getState().hasMenuAccess('MEAL_OPERATOR', 'meals')).toBe(false)

    // Grant all for role AUDITOR
    toggleAllForRole('AUDITOR', true)
    ERP_MENU_DEFINITIONS.forEach((menu) => {
      expect(useAccessControlStore.getState().hasMenuAccess('AUDITOR', menu.id)).toBe(true)
    })

    // Toggle all for a specific menu
    toggleAllForMenu('MANAGER', 'accommodations', false)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'accommodations')).toBe(false)
    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'accommodations', 'view_matrix')).toBe(false)
  })

  it('saves and restores permissions from localStorage', async () => {
    const { toggleMenu, savePermissions, resetRoleToDefault } = useAccessControlStore.getState()

    // Toggle menu off
    toggleMenu('ADMIN', 'branding', false)
    expect(useAccessControlStore.getState().hasMenuAccess('ADMIN', 'branding')).toBe(false)

    // Save
    await savePermissions()
    const rawStored = localStorage.getItem('bachelor_erp_role_permissions')
    expect(rawStored).toBeTruthy()

    // Reset role to default restores original
    resetRoleToDefault('ADMIN')
    expect(useAccessControlStore.getState().hasMenuAccess('ADMIN', 'branding')).toBe(true)
  })

  it('supports individual user custom permissions (allows different managers to have different access)', () => {
    const { toggleMenuForUser, hasUserCustomPermissions, resetUserToRoleDefault } =
      useAccessControlStore.getState()

    const managerAnisId = 'mgr-anisuzzaman'
    const managerEnamulId = 'mgr-enamul-haque'
    const managerOtherId = 'mgr-standard'

    // Manager Anisuzzaman gets Cashbook enabled (default is true), but let's toggle off 'meals' for him
    toggleMenuForUser(managerAnisId, 'meals', 'MANAGER', false)
    expect(hasUserCustomPermissions(managerAnisId)).toBe(true)

    // Manager Enamul gets Cashbook turned OFF (e.g. not allowed to manage cash box)
    toggleMenuForUser(managerEnamulId, 'cashbook', 'MANAGER', false)
    expect(hasUserCustomPermissions(managerEnamulId)).toBe(true)

    // Standard manager has no custom overrides
    expect(hasUserCustomPermissions(managerOtherId)).toBe(false)

    // 1. Verify Manager Anisuzzaman's access
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'cashbook', managerAnisId)).toBe(true)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'meals', managerAnisId)).toBe(false)

    // 2. Verify Manager Enamul's access (Cashbook disabled for him, but meals is still active)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'cashbook', managerEnamulId)).toBe(false)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'meals', managerEnamulId)).toBe(true)

    // 3. Standard manager without override still gets role default (both cashbook and meals active)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'cashbook', managerOtherId)).toBe(true)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'meals', managerOtherId)).toBe(true)

    // 4. Resetting Enamul reverts him back to standard manager access
    resetUserToRoleDefault(managerEnamulId)
    expect(useAccessControlStore.getState().hasUserCustomPermissions(managerEnamulId)).toBe(false)
    expect(useAccessControlStore.getState().hasMenuAccess('MANAGER', 'cashbook', managerEnamulId)).toBe(true)
  })

  it('supports user-specific granular option permissions', () => {
    const { toggleOptionForUser } = useAccessControlStore.getState()
    const officerId = 'officer-special'

    // Disable 'create_expense' for this specific manager while keeping view_expenses enabled
    toggleOptionForUser(officerId, 'expenses', 'create_expense', 'MANAGER', false)

    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'expenses', 'create_expense', officerId)).toBe(false)
    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'expenses', 'view_expenses', officerId)).toBe(true)

    // Other manager still has create_expense enabled by default
    expect(useAccessControlStore.getState().hasOptionAccess('MANAGER', 'expenses', 'create_expense', 'other-mgr')).toBe(true)
  })
})

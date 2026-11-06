import { describe, it, expect, beforeEach } from 'vitest'
import {
  MOCK_ACCOUNTS,
  getVisibleFinancialAccounts,
  getManagerAssignedAccount,
  getStoredFinancialAccounts,
  saveStoredFinancialAccounts,
  ACCOUNTS_STORAGE_KEY,
} from '@/features/billing/api/useReceipts'
import type { Profile, FinancialAccount } from '@/types/database'

describe('Two Managers Position & Account Isolation', () => {
  const adminUser: Profile = {
    id: 'p-admin-1',
    full_name: 'অ্যাডমিন',
    email: 'admin@bachelorhome.com',
    phone_number: '01700000000',
    role: 'ADMIN',
    preferred_language: 'bn',
    is_active: true,
    created_at: '',
    updated_at: '',
  }

  const manager1: Profile = {
    id: 'p-manager-1',
    full_name: 'ম্যানেজার তানভীর (ম্যানেজার ১)',
    email: 'manager1@bachelorhome.com',
    phone_number: '01800000001',
    role: 'MANAGER',
    preferred_language: 'bn',
    is_active: true,
    created_at: '',
    updated_at: '',
  }

  const manager2: Profile = {
    id: 'p-manager-2',
    full_name: 'ম্যানেজার মেহেদী (ম্যানেজার ২)',
    email: 'manager2@bachelorhome.com',
    phone_number: '01800000002',
    role: 'MANAGER',
    preferred_language: 'bn',
    is_active: true,
    created_at: '',
    updated_at: '',
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('Admin can see all 4 financial accounts', () => {
    const visible = getVisibleFinancialAccounts(MOCK_ACCOUNTS, adminUser)
    expect(visible.length).toBe(4)
    expect(visible.some((a) => a.account_number === 'MGR-CASH-01')).toBe(true)
    expect(visible.some((a) => a.account_number === 'MGR-CASH-02')).toBe(true)
    expect(visible.some((a) => a.account_number === 'MAIN-VAULT-01')).toBe(true)
    expect(visible.some((a) => a.account_number === 'ADM-BANK-01')).toBe(true)
  })

  it('Manager 1 (তানভীর) can ONLY see their assigned account (MGR-CASH-01)', () => {
    const visible = getVisibleFinancialAccounts(MOCK_ACCOUNTS, manager1)
    expect(visible.length).toBe(1)
    expect(visible[0].account_number).toBe('MGR-CASH-01')
    expect(visible[0].account_name).toContain('Manager Cash Box')

    // Must NOT see Manager 2's account, Hostel Main Account, or Owner/Admin Account
    expect(visible.some((a) => a.account_number === 'MGR-CASH-02')).toBe(false)
    expect(visible.some((a) => a.account_number === 'MAIN-VAULT-01')).toBe(false)
    expect(visible.some((a) => a.account_number === 'ADM-BANK-01')).toBe(false)
  })

  it('Manager 2 (মেহেদী) can ONLY see their assigned account (MGR-CASH-02)', () => {
    const visible = getVisibleFinancialAccounts(MOCK_ACCOUNTS, manager2)
    expect(visible.length).toBe(1)
    expect(visible[0].account_number).toBe('MGR-CASH-02')
    expect(visible[0].account_name).toBe('ম্যানেজার ক্যাশ ড্রয়ার')

    // Must NOT see Manager 1's account, Hostel Main Account, or Owner/Admin Account
    expect(visible.some((a) => a.account_number === 'MGR-CASH-01')).toBe(false)
    expect(visible.some((a) => a.account_number === 'MAIN-VAULT-01')).toBe(false)
    expect(visible.some((a) => a.account_number === 'ADM-BANK-01')).toBe(false)
  })

  it('Total active funds calculation is properly isolated per user role', () => {
    // Admin calculates total active funds across all 4 accounts
    const adminAccounts = getVisibleFinancialAccounts(MOCK_ACCOUNTS, adminUser)
    const adminTotal = adminAccounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0)
    expect(adminTotal).toBe(46454) // 12404 + 0 + 24050 + 10000

    // Manager 1 calculates active funds only for their drawer
    const mgr1Accounts = getVisibleFinancialAccounts(MOCK_ACCOUNTS, manager1)
    const mgr1Total = mgr1Accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0)
    expect(mgr1Total).toBe(12404)

    // Manager 2 calculates active funds only for their drawer
    const mgr2Accounts = getVisibleFinancialAccounts(MOCK_ACCOUNTS, manager2)
    const mgr2Total = mgr2Accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0)
    expect(mgr2Total).toBe(0)
  })

  it('Resolves assigned account correctly via getManagerAssignedAccount', () => {
    const mgr1Acc = getManagerAssignedAccount(MOCK_ACCOUNTS, 'p-manager-1')
    expect(mgr1Acc?.account_number).toBe('MGR-CASH-01')

    const mgr2Acc = getManagerAssignedAccount(MOCK_ACCOUNTS, 'p-manager-2')
    expect(mgr2Acc?.account_number).toBe('MGR-CASH-02')
  })

  it('Persists Admin account assignment changes to storage correctly', () => {
    const modifiedAccounts: FinancialAccount[] = MOCK_ACCOUNTS.map((a) => {
      if (a.account_number === 'MGR-CASH-02') {
        return { ...a, assigned_manager_id: 'p-manager-1' }
      }
      return a
    })

    saveStoredFinancialAccounts(modifiedAccounts)
    expect(localStorage.getItem(ACCOUNTS_STORAGE_KEY)).not.toBeNull()
    const loaded = getStoredFinancialAccounts()

    const mgr2Account = loaded.find((a) => a.account_number === 'MGR-CASH-02')
    expect(mgr2Account?.assigned_manager_id).toBe('p-manager-1')
  })
})

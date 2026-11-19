import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { useAuthStore } from '@/app/store/useAuthStore'
import { downloadSystemJsonBackup } from '@/lib/exportUtils'

export function useSystemBackup() {
  const [isExporting, setIsExporting] = useState(false)
  const { profile } = useAuthStore()

  const generateFullBackup = async () => {
    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString()
      const backupData: Record<string, any> = {
        metadata: {
          app_name: 'Bachelor Home ERP',
          version: '2.0.0',
          exported_at: timestamp,
          exported_by: profile?.full_name || 'System Admin',
          timezone: 'Asia/Dhaka',
        },
        tables: {},
      }

      if (isSupabaseConfigured) {
        const tableNames = [
          'buildings',
          'flats',
          'rooms',
          'seats',
          'boarders',
          'allocations',
          'boarder_charges',
          'receipts',
          'expenses',
          'expense_categories',
          'financial_accounts',
          'account_transfers',
          'staff_members',
          'staff_advances',
          'payroll_sheets',
          'notices',
          'hostel_settings',
          'branding',
        ]

        for (const table of tableNames) {
          try {
            const { data } = await supabase.from(table).select('*')
            backupData.tables[table] = data || []
          } catch (e) {
            console.warn(`Could not export table ${table}:`, e)
            backupData.tables[table] = []
          }
        }
      } else {
        // Collect local storage fallback states
        const localKeys = [
          'bachelor_home_buildings_v1',
          'bachelor_home_flats_v1',
          'bachelor_home_seats_v1',
          'bachelor_home_boarders_v1',
          'bachelor_home_allocations_v1',
          'bachelor_home_receipts_v1',
          'bachelor_home_expenses_v1',
          'bachelor_home_financial_accounts_v1',
          'bachelor_home_staff_v1',
          'bachelor_home_payroll_v1',
          'bachelor_home_advances_v1',
          'bachelor_hostel_settings_v1',
          'bachelor_home_branding_v1',
        ]

        localKeys.forEach((key) => {
          try {
            const raw = localStorage.getItem(key)
            backupData.tables[key] = raw ? JSON.parse(raw) : null
          } catch {
            backupData.tables[key] = null
          }
        })
      }

      const datePart = timestamp.slice(0, 10)
      const timePart = timestamp.slice(11, 16).replace(':', '')
      const filename = `Bachelor_Home_ERP_FullBackup_${datePart}_${timePart}.json`

      downloadSystemJsonBackup(backupData, filename)
      return { success: true, filename }
    } catch (err: any) {
      console.error('Failed to generate full backup:', err)
      alert('সিস্টেম ব্যাকআপ তৈরিতে সমস্যা হয়েছে: ' + (err.message || 'অজ্ঞাত ত্রুটি'))
      return { success: false }
    } finally {
      setIsExporting(false)
    }
  }

  return {
    generateFullBackup,
    isExporting,
  }
}

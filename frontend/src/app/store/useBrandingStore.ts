import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface DayMealMenu {
  breakfast: string
  lunch: string
  dinner: string
}

export type DayKey =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'

export interface WeeklyMealMenu {
  saturday: DayMealMenu
  sunday: DayMealMenu
  monday: DayMealMenu
  tuesday: DayMealMenu
  wednesday: DayMealMenu
  thursday: DayMealMenu
  friday: DayMealMenu
}

export const DAY_ORDER: DayKey[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
]

export const DAY_METADATA: Record<DayKey, { nameBn: string; shortBn: string }> = {
  saturday: { nameBn: 'শনিবার', shortBn: 'শনি' },
  sunday: { nameBn: 'রবিবার', shortBn: 'রবি' },
  monday: { nameBn: 'সোমবার', shortBn: 'সোম' },
  tuesday: { nameBn: 'মঙ্গলবার', shortBn: 'মঙ্গল' },
  wednesday: { nameBn: 'বুধবার', shortBn: 'বুধ' },
  thursday: { nameBn: 'বৃহস্পতিবার', shortBn: 'বৃহঃ' },
  friday: { nameBn: 'শুক্রবার', shortBn: 'শুক্র' },
}

export const DEFAULT_WEEKLY_MEAL_MENU: WeeklyMealMenu = {
  saturday: {
    breakfast: 'ভুনা খিচুড়ি, ডিম ভাজি, আচার',
    lunch: 'সাদা ভাত, রুই মাছের ঝোল, আলু ভর্তা, ডাল',
    dinner: 'সাদা ভাত, মুরগির মাংস ভুনা, ঘন ডাল',
  },
  sunday: {
    breakfast: 'পরোটা, ডিম ওমলেট, মিক্স সবজি',
    lunch: 'সাদা ভাত, ডিম ভুনা, সবজি নিরামিষ, ডাল',
    dinner: 'সাদা ভাত, পাবদা মাছের ঝোল, বেগুন ভাজা, ডাল',
  },
  monday: {
    breakfast: 'রুটি, ডাল/সবজি, চা',
    lunch: 'সাদা ভাত, পাঙ্গাশ/তেলাপিয়া ভুনা, শাক ভাজি, ডাল',
    dinner: 'সাদা ভাত, মুরগির মাংসের ঝোল, মুগ ডাল',
  },
  tuesday: {
    breakfast: 'পরোটা, ডিম পোচ, সবজি ভাজি',
    lunch: 'সাদা ভাত, কই মাছের ঝোল, আলু-পটল ভাজি, ডাল',
    dinner: 'সাদা ভাত, মুরগির কষা মাংস, সালাদ, ডাল',
  },
  wednesday: {
    breakfast: 'লেবুর আচার দিয়ে নরম খিচুড়ি ও ডিম ভাজি',
    lunch: 'সাদা ভাত, মাছের কারি, ফুলকপি সবজি, ডাল',
    dinner: 'সাদা ভাত, ডিম ভুনা, ডাল চচ্চড়ি, ভর্তা',
  },
  thursday: {
    breakfast: 'রুটি, মিক্স সবজি ভাজি, চা',
    lunch: 'সাদা ভাত, কাতল মাছের ঝোল, ঢেঁড়শ ভাজি, ডাল',
    dinner: 'সাদা ভাত, চিকেন কারি, পাতলা ডাল',
  },
  friday: {
    breakfast: 'স্পেশাল পরোটা, বুটের ডাল, ডিম',
    lunch: 'স্পেশাল মোরগ পোলাও / বিরিয়ানি, সালাদ',
    dinner: 'সাদা ভাত, রুই মাছ ভুনা, ঘন ডাল, লেবু',
  },
}

export function getDayKeyFromDayIndex(dayIndex: number): DayKey {
  const map: Record<number, DayKey> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  }
  return map[dayIndex] || 'saturday'
}

export function getDayKeyFromDate(date: Date): DayKey {
  return getDayKeyFromDayIndex(date.getDay())
}

export function getDayKeyFromDateStr(dateStr: string): DayKey {
  if (!dateStr) return 'saturday'
  const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr)
  return isNaN(d.getTime()) ? 'saturday' : getDayKeyFromDayIndex(d.getDay())
}

export interface BrandingSettings {
  orgName: string
  shortName: string
  tagline: string
  address: string
  phone: string
  email: string
  emergencyContact: string
  receiptFooterNote: string
  receiptPrefix: string
  logoUrl: string | null
  appIconUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  hostelRules: string
  weeklyMealMenu: WeeklyMealMenu
}

interface BrandingState extends BrandingSettings {
  id: string | null
  isLoading: boolean
  isSaved: boolean
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>
  uploadCustomLogo: (file: File) => Promise<string>
  resetToDefault: () => Promise<void>
  initializeBranding: () => Promise<void>
}

const STORAGE_KEY = 'bachelor_erp_branding_settings'

export const DEFAULT_BRANDING: BrandingSettings = {
  orgName: 'ব্যাচেলর হোম ইআরপি',
  shortName: 'ব্যাচেলর হোম',
  tagline: 'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট',
  address: '',
  phone: '',
  email: '',
  emergencyContact: '',
  receiptFooterNote: 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।',
  receiptPrefix: 'RCT',
  logoUrl: '/pwa-512x512.svg',
  appIconUrl: '/pwa-192x192.svg',
  faviconUrl: '/favicon.svg',
  primaryColor: '#6366f1',
  hostelRules: `খাবার অন/অফ প্রতিদিন রাত ১০:০০ টার মধ্যে সম্পন্ন করতে হবে।
মাসের ১০ তারিখের মধ্যে মাসিক সিট ভাড়া ও মেস বিল পরিশোধ করতে হবে।
হোস্টেলের মূল গেট রাত ১১:০০ টায় বন্ধ হয়ে যায়।
বহিরাগত মেহমান নিয়ে আসার ক্ষেত্রে পূর্বানুমতি প্রযোজ্য।`,
  weeklyMealMenu: DEFAULT_WEEKLY_MEAL_MENU,
}

function applyFaviconToDOM(iconUrl: string) {
  try {
    let faviconLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
    if (!faviconLink) {
      faviconLink = document.createElement('link')
      faviconLink.rel = 'icon'
      document.head.appendChild(faviconLink)
    }
    faviconLink.href = iconUrl

    let appleTouchLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null
    if (!appleTouchLink) {
      appleTouchLink = document.createElement('link')
      appleTouchLink.rel = 'apple-touch-icon'
      document.head.appendChild(appleTouchLink)
    }
    appleTouchLink.href = iconUrl
  } catch (err) {
    console.warn('Could not apply dynamic favicon:', err)
  }
}

export const useBrandingStore = create<BrandingState>((set, get) => ({
  ...DEFAULT_BRANDING,
  id: null,
  isLoading: false,
  isSaved: false,

  initializeBranding: async () => {
    // 1. Try loading from localStorage first for instantaneous render
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const mergedWeeklyMenu = parsed.weeklyMealMenu
          ? { ...DEFAULT_WEEKLY_MEAL_MENU, ...parsed.weeklyMealMenu }
          : DEFAULT_WEEKLY_MEAL_MENU
        set((state) => ({ ...state, ...DEFAULT_BRANDING, ...parsed, weeklyMealMenu: mergedWeeklyMenu }))
        if (parsed.faviconUrl || parsed.logoUrl) {
          applyFaviconToDOM(parsed.faviconUrl || parsed.logoUrl)
        }
      }
    } catch (e) {
      console.warn('Failed to parse local branding settings:', e)
    }

    // 2. If Supabase configured, load remote organization settings
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          const mergedRemoteWeeklyMenu = data.weekly_meal_menu
            ? { ...DEFAULT_WEEKLY_MEAL_MENU, ...data.weekly_meal_menu }
            : (get().weeklyMealMenu || DEFAULT_WEEKLY_MEAL_MENU)
          set((state) => ({
            id: data.id || state.id,
            orgName: data.org_name || state.orgName,
            shortName: data.short_name || state.shortName,
            tagline: data.tagline || state.tagline,
            address: data.address !== undefined && data.address !== null ? data.address : state.address,
            phone: data.phone !== undefined && data.phone !== null ? data.phone : state.phone,
            email: data.email !== undefined && data.email !== null ? data.email : state.email,
            emergencyContact: data.emergency_contact !== undefined && data.emergency_contact !== null ? data.emergency_contact : state.emergencyContact,
            receiptFooterNote: data.receipt_footer_note || state.receiptFooterNote,
            receiptPrefix: data.receipt_prefix || state.receiptPrefix,
            logoUrl: data.logo_url || state.logoUrl,
            appIconUrl: data.app_icon_url || state.appIconUrl,
            faviconUrl: data.favicon_url || state.faviconUrl,
            primaryColor: data.primary_color || state.primaryColor,
            hostelRules: data.hostel_rules !== undefined && data.hostel_rules !== null ? data.hostel_rules : state.hostelRules,
            weeklyMealMenu: mergedRemoteWeeklyMenu,
          }))

          const current = get()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
          if (current.faviconUrl || current.logoUrl) {
            applyFaviconToDOM(current.faviconUrl || current.logoUrl || '/favicon.svg')
          }
        }
      } catch {
        // Table may not yet exist on Supabase, fallback silently
      }
    }
  },

  updateBranding: async (newSettings: Partial<BrandingSettings>) => {
    set({ isLoading: true, isSaved: false })

    const updated: BrandingSettings = {
      orgName: newSettings.orgName !== undefined ? newSettings.orgName : get().orgName,
      shortName: newSettings.shortName !== undefined ? newSettings.shortName : get().shortName,
      tagline: newSettings.tagline !== undefined ? newSettings.tagline : get().tagline,
      address: newSettings.address !== undefined ? newSettings.address : get().address,
      phone: newSettings.phone !== undefined ? newSettings.phone : get().phone,
      email: newSettings.email !== undefined ? newSettings.email : get().email,
      emergencyContact: newSettings.emergencyContact !== undefined ? newSettings.emergencyContact : get().emergencyContact,
      receiptFooterNote: newSettings.receiptFooterNote !== undefined ? newSettings.receiptFooterNote : get().receiptFooterNote,
      receiptPrefix: newSettings.receiptPrefix !== undefined ? newSettings.receiptPrefix : get().receiptPrefix,
      logoUrl: newSettings.logoUrl !== undefined ? newSettings.logoUrl : get().logoUrl,
      appIconUrl: newSettings.appIconUrl !== undefined ? newSettings.appIconUrl : get().appIconUrl,
      faviconUrl: newSettings.faviconUrl !== undefined ? newSettings.faviconUrl : get().faviconUrl,
      primaryColor: newSettings.primaryColor ?? get().primaryColor,
      hostelRules: newSettings.hostelRules !== undefined ? newSettings.hostelRules : get().hostelRules,
      weeklyMealMenu: newSettings.weeklyMealMenu !== undefined ? newSettings.weeklyMealMenu : get().weeklyMealMenu,
    }

    // Update state & localStorage
    set({ ...updated, isLoading: false, isSaved: true })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...updated }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bachelor_erp_branding_updated', { detail: updated }))
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e)
    }

    // Update DOM Favicon & Touch Icon
    if (updated.faviconUrl || updated.logoUrl) {
      applyFaviconToDOM(updated.faviconUrl || updated.logoUrl || '/favicon.svg')
    }

    // Attempt remote save to Supabase
    if (isSupabaseConfigured) {
      try {
        const payload: Record<string, any> = {
          org_name: updated.orgName,
          short_name: updated.shortName,
          tagline: updated.tagline,
          address: updated.address,
          phone: updated.phone,
          email: updated.email,
          emergency_contact: updated.emergencyContact,
          receipt_footer_note: updated.receiptFooterNote,
          receipt_prefix: updated.receiptPrefix,
          logo_url: updated.logoUrl,
          app_icon_url: updated.appIconUrl,
          favicon_url: updated.faviconUrl,
          hostel_rules: updated.hostelRules,
          weekly_meal_menu: updated.weeklyMealMenu,
          updated_at: new Date().toISOString(),
        }

        const currentId = get().id
        if (currentId) {
          const { error } = await supabase
            .from('organization_settings')
            .update(payload)
            .eq('id', currentId)

          if (error) {
            console.warn('organization_settings update error with payload:', error.message)
            // Fallback: update only core columns if migration not run yet
            await supabase
              .from('organization_settings')
              .update({
                org_name: updated.orgName,
                short_name: updated.shortName,
                tagline: updated.tagline,
                logo_url: updated.logoUrl,
                app_icon_url: updated.appIconUrl,
                favicon_url: updated.faviconUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', currentId)
          }
        } else {
          const { data: existing } = await supabase
            .from('organization_settings')
            .select('id')
            .limit(1)
            .maybeSingle()

          if (existing?.id) {
            set({ id: existing.id })
            const { error: updateErr } = await supabase
              .from('organization_settings')
              .update(payload)
              .eq('id', existing.id)

            if (updateErr) {
              console.warn('organization_settings update error with payload:', updateErr.message)
              await supabase
                .from('organization_settings')
                .update({
                  org_name: updated.orgName,
                  short_name: updated.shortName,
                  tagline: updated.tagline,
                  logo_url: updated.logoUrl,
                  app_icon_url: updated.appIconUrl,
                  favicon_url: updated.faviconUrl,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
            }
          } else {
            const { data: inserted, error: insertErr } = await supabase
              .from('organization_settings')
              .insert(payload)
              .select('id')
              .maybeSingle()

            if (inserted?.id) {
              set({ id: inserted.id })
            } else if (insertErr) {
              console.warn('organization_settings insert error:', insertErr.message)
            }
          }
        }
      } catch (err) {
        console.warn('Could not sync branding settings to Supabase table:', err)
      }
    }
  },

  uploadCustomLogo: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('অনুগ্রহ করে শুধুমাত্র ছবি (PNG, JPG, SVG, WebP) নির্বাচন করুন।'))
        return
      }

      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result as string

        // Create an Image object to convert and optimize into standard square canvas
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const size = 512
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')

          if (ctx) {
            // Fill background with elegant subtle dark or transparent
            ctx.clearRect(0, 0, size, size)

            // Draw image centered in square
            const hRatio = size / img.width
            const vRatio = size / img.height
            const ratio = Math.min(hRatio, vRatio)
            const centerShiftX = (size - img.width * ratio) / 2
            const centerShiftY = (size - img.height * ratio) / 2

            ctx.drawImage(
              img,
              0,
              0,
              img.width,
              img.height,
              centerShiftX,
              centerShiftY,
              img.width * ratio,
              img.height * ratio
            )

            const optimizedDataUrl = canvas.toDataURL('image/png', 0.95)

            // Update state with new logo
            await get().updateBranding({
              logoUrl: optimizedDataUrl,
              appIconUrl: optimizedDataUrl,
              faviconUrl: optimizedDataUrl,
            })

            resolve(optimizedDataUrl)
          } else {
            await get().updateBranding({
              logoUrl: base64Data,
              appIconUrl: base64Data,
              faviconUrl: base64Data,
            })
            resolve(base64Data)
          }
        }
        img.onerror = () => {
          reject(new Error('ছবিটি প্রসেস করতে ব্যর্থ হয়েছে।'))
        }
        img.src = base64Data
      }
      reader.onerror = () => reject(new Error('ফাইল পড়তে সমস্যা হয়েছে।'))
      reader.readAsDataURL(file)
    })
  },

  resetToDefault: async () => {
    set({ ...DEFAULT_BRANDING, isSaved: true })
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    applyFaviconToDOM(DEFAULT_BRANDING.faviconUrl!)
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      useBrandingStore.getState().initializeBranding()
    }
  })
}

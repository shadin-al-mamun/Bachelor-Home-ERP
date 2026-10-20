import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'

export interface BrandingSettings {
  orgName: string
  shortName: string
  tagline: string
  logoUrl: string | null
  appIconUrl: string | null
  faviconUrl: string | null
  primaryColor: string
}

interface BrandingState extends BrandingSettings {
  isLoading: boolean
  isSaved: boolean
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<void>
  uploadCustomLogo: (file: File) => Promise<string>
  resetToDefault: () => Promise<void>
  initializeBranding: () => Promise<void>
}

const STORAGE_KEY = 'bachelor_erp_branding_settings'

export const DEFAULT_BRANDING: BrandingSettings = {
  orgName: 'Bachelor Home',
  shortName: 'Bachelor Home',
  tagline: 'স্মার্ট মেস ও হোস্টেল ম্যানেজমেন্ট ERP',
  logoUrl: '/pwa-512x512.svg',
  appIconUrl: '/pwa-192x192.svg',
  faviconUrl: '/favicon.svg',
  primaryColor: '#6366f1',
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
  isLoading: false,
  isSaved: false,

  initializeBranding: async () => {
    // 1. Try loading from localStorage first for instantaneous render
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({ ...parsed })
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
          const remoteSettings: BrandingSettings = {
            orgName: data.org_name || DEFAULT_BRANDING.orgName,
            shortName: data.short_name || DEFAULT_BRANDING.shortName,
            tagline: data.tagline || DEFAULT_BRANDING.tagline,
            logoUrl: data.logo_url || DEFAULT_BRANDING.logoUrl,
            appIconUrl: data.app_icon_url || DEFAULT_BRANDING.appIconUrl,
            faviconUrl: data.favicon_url || DEFAULT_BRANDING.faviconUrl,
            primaryColor: DEFAULT_BRANDING.primaryColor,
          }
          set({ ...remoteSettings })
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteSettings))
          applyFaviconToDOM(remoteSettings.faviconUrl || remoteSettings.logoUrl || '/favicon.svg')
        }
      } catch {
        // Table may not yet exist on Supabase, fallback silently
      }
    }
  },

  updateBranding: async (newSettings: Partial<BrandingSettings>) => {
    set({ isLoading: true, isSaved: false })

    const updated: BrandingSettings = {
      orgName: newSettings.orgName ?? get().orgName,
      shortName: newSettings.shortName ?? get().shortName,
      tagline: newSettings.tagline ?? get().tagline,
      logoUrl: newSettings.logoUrl !== undefined ? newSettings.logoUrl : get().logoUrl,
      appIconUrl: newSettings.appIconUrl !== undefined ? newSettings.appIconUrl : get().appIconUrl,
      faviconUrl: newSettings.faviconUrl !== undefined ? newSettings.faviconUrl : get().faviconUrl,
      primaryColor: newSettings.primaryColor ?? get().primaryColor,
    }

    // Update state & localStorage
    set({ ...updated, isLoading: false, isSaved: true })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
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
        await supabase.from('organization_settings').upsert({
          org_name: updated.orgName,
          short_name: updated.shortName,
          tagline: updated.tagline,
          logo_url: updated.logoUrl,
          app_icon_url: updated.appIconUrl,
          favicon_url: updated.faviconUrl,
          updated_at: new Date().toISOString(),
        })
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

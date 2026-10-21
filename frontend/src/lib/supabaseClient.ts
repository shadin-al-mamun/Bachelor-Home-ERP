import { createClient } from '@supabase/supabase-js'

function sanitizeConfig(rawUrl?: string, rawKey?: string) {
  let url = (rawUrl || '').trim()
  let key = (rawKey || '').trim()

  // 1. Check if user accidentally swapped URL and Anon Key in environment variables
  if (url.startsWith('eyJ') && (key.startsWith('http://') || key.startsWith('https://'))) {
    const temp = url
    url = key
    key = temp
  }

  // 2. If user accidentally pasted the Supabase Dashboard URL (e.g. https://supabase.com/dashboard/project/xyz)
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i)
  if (dashboardMatch && dashboardMatch[1]) {
    url = `https://${dashboardMatch[1]}.supabase.co`
  }

  // 3. Remove trailing slashes and accidental path prefixes like /rest/v1 or /auth/v1
  if (url) {
    url = url.replace(/\/+$/, '')
    url = url.replace(/\/(rest|auth)\/v\d+.*$/i, '')
    url = url.replace(/\/+$/, '')
  }

  return {
    url: url || 'https://bachelor-home-erp-placeholder.supabase.co',
    key: key || 'placeholder-anon-key',
  }
}

const config = sanitizeConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const isSupabaseConfigured =
  Boolean(config.url) &&
  !config.url.includes('placeholder') &&
  Boolean(config.key) &&
  !config.key.includes('placeholder')

export const supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
})

export const createTempAuthClient = () => {
  return createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}



import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  assignedFlats: string[]
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean

  // Actions
  initializeAuth: () => Promise<void>
  setSession: (session: Session | null) => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
  signOut: () => Promise<void>
  hasRole: (roles: UserRole[]) => boolean
  hasFlatAccess: (flatId: string) => boolean
  setDemoUser: (role: UserRole) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  assignedFlats: [],
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,

  initializeAuth: async () => {
    set({ isLoading: true })

    try {
      if (!isSupabaseConfigured) {
        // Safe development default when Supabase environment variables are pending
        set({ isLoading: false, isInitialized: true })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await get().setSession(session)
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isInitialized: true })
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        await get().setSession(newSession)
      })
    } catch (err) {
      console.error('Failed to initialize auth:', err)
      set({ isLoading: false, isInitialized: true })
    }
  },

  setSession: async (session: Session | null) => {
    if (!session?.user) {
      set({
        user: null,
        profile: null,
        assignedFlats: [],
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      })
      return
    }

    set({ user: session.user, isAuthenticated: true, isLoading: true })
    await get().fetchProfile(session.user.id)
  },

  fetchProfile: async (userId: string) => {
    try {
      // 1. Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.warn('Profile fetch warning (may be unseeded user):', profileError.message)
      }

      // 2. Fetch user flat assignments if manager or operator
      const { data: assignmentsData } = await supabase
        .from('user_flat_assignments')
        .select('flat_id')
        .eq('user_id', userId)

      const flats = assignmentsData ? assignmentsData.map((a: { flat_id: string }) => a.flat_id) : []

      set({
        profile: profileData as Profile || null,
        assignedFlats: flats,
        isLoading: false,
        isInitialized: true,
      })
    } catch (err) {
      console.error('Error fetching user profile:', err)
      set({ isLoading: false, isInitialized: true })
    }
  },

  signOut: async () => {
    set({ isLoading: true })
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.error('Sign out error:', err)
      }
    }
    set({
      user: null,
      profile: null,
      assignedFlats: [],
      isAuthenticated: false,
      isLoading: false,
    })
  },

  hasRole: (roles: UserRole[]) => {
    const { profile } = get()
    if (!profile) return false
    return roles.includes(profile.role)
  },

  hasFlatAccess: (flatId: string) => {
    const { profile, assignedFlats } = get()
    if (!profile) return false
    if (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') return true
    return assignedFlats.includes(flatId)
  },

  setDemoUser: (role: UserRole) => {
    const mockUser: Partial<User> = {
      id: '00000000-0000-0000-0000-000000000099',
      email: `${role.toLowerCase()}@bachelorhome.erp`,
      created_at: new Date().toISOString(),
    }

    const mockProfile: Profile = {
      id: '00000000-0000-0000-0000-000000000099',
      email: `${role.toLowerCase()}@bachelorhome.erp`,
      full_name: role === 'SUPER_ADMIN' ? 'হোস্টেল এডমিন (মালিক)' : role === 'MANAGER' ? 'ম্যানেজার তানভীর' : 'বর্ডার রাকিবুল',
      phone_number: '01711000000',
      role,
      is_active: true,
      preferred_language: 'bn',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    set({
      user: mockUser as User,
      profile: mockProfile,
      assignedFlats: ['22222222-2222-2222-2222-222222222222'],
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    })
  },
}))

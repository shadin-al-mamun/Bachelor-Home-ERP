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
  setDemoUser: (role: UserRole, customProfile?: Partial<Profile>) => void
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

      // 2.5 second timeout to prevent UI freeze on unresponsive Supabase cloud servers
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase session timeout')), 2500)
      )

      const result = (await Promise.race([sessionPromise, timeoutPromise])) as {
        data: { session: Session | null }
        error?: unknown
      }

      if (result?.data?.session) {
        await get().setSession(result.data.session)
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isInitialized: true })
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        await get().setSession(newSession)
      })
    } catch (err) {
      console.warn('Supabase auth initialization skipped or timed out:', err)
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
        .maybeSingle()

      if (profileError) {
        console.warn('Profile fetch warning (may be unseeded user):', profileError.message)
      }

      const currentUser = get().user
      const isOwner =
        currentUser?.email === 'shadin0158@gmail.com' ||
        currentUser?.email === 'almamun0158@gmail.com' ||
        profileData?.phone_number === '01712394767' ||
        profileData?.email === 'shadin0158@gmail.com' ||
        profileData?.email === 'almamun0158@gmail.com'

      let resolvedProfile: Profile | null = (profileData as Profile) || null

      if (isOwner) {
        if (!resolvedProfile) {
          resolvedProfile = {
            id: userId,
            email: currentUser?.email || 'shadin0158@gmail.com',
            full_name: 'মোঃ আব্দুল্লাহ আল মামুন',
            phone_number: '01712394767',
            role: 'SUPER_ADMIN',
            is_active: true,
            preferred_language: 'bn',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        } else {
          resolvedProfile = {
            ...resolvedProfile,
            role: 'SUPER_ADMIN',
            phone_number: resolvedProfile.phone_number || '01712394767',
            full_name: resolvedProfile.full_name || 'মোঃ আব্দুল্লাহ আল মামুন',
          }
        }

        // Self-heal database in background if role or phone out of sync
        supabase.rpc('sync_owner_profile').then(() => {}, () => {})

        if (profileData?.role !== 'SUPER_ADMIN' || profileData?.phone_number !== '01712394767') {
          supabase
            .from('profiles')
            .upsert(
              {
                id: userId,
                email: currentUser?.email || 'shadin0158@gmail.com',
                full_name: 'মোঃ আব্দুল্লাহ আল মামুন',
                phone_number: '01712394767',
                role: 'SUPER_ADMIN',
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            )
            .then(() => {})
        }
      }

      // 2. Fetch user flat assignments if manager or operator
      const { data: assignmentsData } = await supabase
        .from('user_flat_assignments')
        .select('flat_id')
        .eq('user_id', userId)

      const flats = assignmentsData ? assignmentsData.map((a: { flat_id: string }) => a.flat_id) : []

      set({
        profile: resolvedProfile,
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

  setDemoUser: (role: UserRole, customProfile?: Partial<Profile>) => {
    const userId = customProfile?.id || '00000000-0000-0000-0000-000000000099'
    const userEmail = customProfile?.email || `${role.toLowerCase()}@bachelorhome.erp`

    const mockUser: Partial<User> = {
      id: userId,
      email: userEmail,
      created_at: new Date().toISOString(),
    }

    const defaultName =
      role === 'SUPER_ADMIN'
        ? 'হোস্টেল এডমিন (মালিক)'
        : role === 'MANAGER'
        ? 'ম্যানেজার তানভীর'
        : role === 'APPLICANT'
        ? 'নতুন আবেদনকারী'
        : 'বর্ডার রাকিবুল'

    const mockProfile: Profile = {
      id: userId,
      email: userEmail,
      full_name: customProfile?.full_name || defaultName,
      phone_number: customProfile?.phone_number || '01711000000',
      role,
      is_active: true,
      preferred_language: 'bn',
      avatar_url: customProfile?.avatar_url || null,
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

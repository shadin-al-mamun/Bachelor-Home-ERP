import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  user: User | null
  profile: Profile | null
  assignedFlats: string[]
  assignedBuildings: string[]
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
  hasBuildingAccess: (buildingId: string) => boolean
  setDemoUser: (role: UserRole, customProfile?: Partial<Profile>, customFlats?: string[], customBuildings?: string[]) => void
  updateProfileAvatar: (avatarUrl: string) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  assignedFlats: [],
  assignedBuildings: [],
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

      // Self-heal avatar_url: if profile.avatar_url is null, check if matching boarder has photo_url
      if (resolvedProfile && !resolvedProfile.avatar_url && isSupabaseConfigured) {
        try {
          const { data: bRow } = await supabase
            .from('boarders')
            .select('photo_url')
            .or(`user_id.eq.${userId},email.eq.${resolvedProfile.email || currentUser?.email}`)
            .not('photo_url', 'is', null)
            .limit(1)
            .maybeSingle()

          if (bRow?.photo_url) {
            resolvedProfile = { ...resolvedProfile, avatar_url: bRow.photo_url }
            supabase.from('profiles').update({ avatar_url: bRow.photo_url }).eq('id', userId).then(() => {})
          }
        } catch {
          // ignore
        }
      }

      // 2. Fetch user flat assignments if manager or operator
      const { data: assignmentsData } = await supabase
        .from('user_flat_assignments')
        .select(`
          flat_id,
          flat:flats (
            id,
            building_id
          )
        `)
        .eq('user_id', userId)

      const flats: string[] = []
      const buildingIds = new Set<string>()

      if (assignmentsData && Array.isArray(assignmentsData)) {
        assignmentsData.forEach((a: any) => {
          if (a.flat_id) flats.push(a.flat_id)
          const bId = a.flat?.building_id
          if (bId) buildingIds.add(bId)
        })
      }

      // If flat join did not return building IDs, resolve them via simple flats select
      if (flats.length > 0 && buildingIds.size === 0) {
        try {
          const { data: fRows } = await supabase
            .from('flats')
            .select('id, building_id')
            .in('id', flats)
          if (fRows) {
            fRows.forEach((f: any) => {
              if (f.building_id) buildingIds.add(f.building_id)
            })
          }
        } catch {
          // ignore
        }
      }

      set({
        profile: resolvedProfile,
        assignedFlats: flats,
        assignedBuildings: Array.from(buildingIds),
        isLoading: false,
        isInitialized: true,
      })
    } catch (err) {
      console.error('Error fetching user profile:', err)
      set({ isLoading: false, isInitialized: true })
    }
  },

  updateProfileAvatar: (avatarUrl: string) => {
    set((state) => ({
      profile: state.profile ? { ...state.profile, avatar_url: avatarUrl } : null,
    }))
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
      assignedBuildings: [],
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

  hasBuildingAccess: (buildingId: string) => {
    const { profile, assignedBuildings } = get()
    if (!profile) return false
    if (profile.role === 'SUPER_ADMIN' || profile.role === 'ADMIN') return true
    return assignedBuildings.includes(buildingId)
  },

  setDemoUser: (
    role: UserRole,
    customProfile?: Partial<Profile>,
    customFlats?: string[],
    customBuildings?: string[]
  ) => {
    const isManager2 =
      customProfile?.id === 'p-manager-2' ||
      customProfile?.phone_number === '01800000002' ||
      customProfile?.email === 'manager2@bachelorhome.erp'

    const isEnamul =
      customProfile?.full_name?.includes('এনামুল') ||
      customProfile?.email?.includes('enamul')

    const defaultId =
      role === 'SUPER_ADMIN'
        ? 'p-owner'
        : role === 'MANAGER'
        ? (isEnamul ? 'p-manager-enamul' : isManager2 ? 'p-manager-2' : 'p-manager-1')
        : role === 'APPLICANT'
        ? 'p-applicant'
        : 'p-imran'

    const userId = customProfile?.id || defaultId
    const defaultEmail =
      role === 'SUPER_ADMIN'
        ? 'shadin0158@gmail.com'
        : role === 'MANAGER'
        ? (isEnamul ? 'enamul@bachelorhome.erp' : isManager2 ? 'manager2@bachelorhome.erp' : 'manager@bachelorhome.erp')
        : `${role.toLowerCase()}@bachelorhome.erp`
    const userEmail = customProfile?.email || defaultEmail

    const mockUser: Partial<User> = {
      id: userId,
      email: userEmail,
      created_at: new Date().toISOString(),
    }

    const defaultName =
      role === 'SUPER_ADMIN'
        ? 'হোস্টেল এডমিন (মালিক)'
        : role === 'MANAGER'
        ? (isEnamul ? 'মোঃ এনামুল হক (ম্যানেজার)' : isManager2 ? 'ম্যানেজার মেহেদী (ম্যানেজার ২)' : 'ম্যানেজার তানভীর (ম্যানেজার ১)')
        : role === 'APPLICANT'
        ? 'নতুন আবেদনকারী'
        : 'বর্ডার রাকিবুল'

    const defaultPhone =
      role === 'SUPER_ADMIN'
        ? '01712394767'
        : role === 'MANAGER'
        ? (isEnamul ? '01800000003' : isManager2 ? '01800000002' : '01800000001')
        : '01711000000'

    const mockProfile: Profile = {
      id: userId,
      email: userEmail,
      full_name: customProfile?.full_name || defaultName,
      phone_number: customProfile?.phone_number || defaultPhone,
      role,
      is_active: true,
      preferred_language: 'bn',
      avatar_url: customProfile?.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const defaultAssignedFlats =
      customFlats !== undefined
        ? customFlats
        : role === 'MANAGER'
        ? (isEnamul ? ['22222222-2222-2222-2222-222222222224'] : ['22222222-2222-2222-2222-222222222222'])
        : []

    const defaultAssignedBuildings =
      customBuildings !== undefined
        ? customBuildings
        : role === 'MANAGER'
        ? ['11111111-1111-1111-1111-111111111111']
        : []

    set({
      user: mockUser as User,
      profile: mockProfile,
      assignedFlats: defaultAssignedFlats,
      assignedBuildings: defaultAssignedBuildings,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
    })
  },
}))

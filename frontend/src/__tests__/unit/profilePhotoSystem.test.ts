import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/app/store/useAuthStore'

describe('Profile Photo & Avatar System', () => {
  beforeEach(() => {
    useAuthStore.setState({
      profile: {
        id: 'test-user-123',
        email: 'staff@bachelorhome.erp',
        full_name: 'মোঃ তানভীর হাসান',
        phone_number: '01712394767',
        role: 'MANAGER',
        is_active: true,
        preferred_language: 'bn',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isAuthenticated: true,
    })
  })

  it('updates profile avatar in auth store when updateProfileAvatar is called', () => {
    const testAvatar = 'https://example.com/storage/v1/object/public/avatars/user123.jpg'
    
    expect(useAuthStore.getState().profile?.avatar_url).toBeNull()

    useAuthStore.getState().updateProfileAvatar(testAvatar)

    const updated = useAuthStore.getState().profile
    expect(updated?.avatar_url).toBe(testAvatar)
    expect(updated?.full_name).toBe('মোঃ তানভীর হাসান')
    expect(updated?.role).toBe('MANAGER')
  })

  it('clears profile avatar when empty string is passed to updateProfileAvatar', () => {
    useAuthStore.getState().updateProfileAvatar('https://example.com/avatar.jpg')
    expect(useAuthStore.getState().profile?.avatar_url).toBe('https://example.com/avatar.jpg')

    useAuthStore.getState().updateProfileAvatar('')
    expect(useAuthStore.getState().profile?.avatar_url).toBe('')
  })

  it('preserves applicant photo when setDemoUser is called with avatar_url', () => {
    const applicantPhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...'
    
    useAuthStore.getState().setDemoUser('APPLICANT', {
      id: 'app-999',
      full_name: 'আব্দুল করিম',
      email: 'karim@gmail.com',
      phone_number: '01712395847',
      role: 'APPLICANT',
      avatar_url: applicantPhoto,
    })

    const profile = useAuthStore.getState().profile
    expect(profile?.role).toBe('APPLICANT')
    expect(profile?.full_name).toBe('আব্দুল করিম')
    expect(profile?.avatar_url).toBe(applicantPhoto)
  })
})

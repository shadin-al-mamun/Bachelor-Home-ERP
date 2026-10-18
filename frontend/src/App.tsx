import React, { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/app/router'
import { useAuthStore } from '@/app/store/useAuthStore'
import type { UserRole } from '@/types/database'
import { Shield, Sparkles } from 'lucide-react'

export const App: React.FC = () => {
  const { initializeAuth, profile, setDemoUser, signOut, isAuthenticated } = useAuthStore()

  useEffect(() => {
    initializeAuth()
    // Default to Super Admin for smooth initial exploration
    if (!isAuthenticated) {
      setDemoUser('SUPER_ADMIN')
    }
  }, [])

  const handleRoleSwitch = (role: UserRole) => {
    setDemoUser(role)
    if (role === 'BOARDER') {
      router.navigate('/portal/dashboard')
    } else if (role === 'APPLICANT') {
      router.navigate('/portal/my-application')
    } else {
      const currentPath = router.state.location.pathname
      if (currentPath.startsWith('/portal') || currentPath === '/unauthorized') {
        router.navigate('/dashboard')
      }
    }
  }

  const handleGuestSwitch = () => {
    signOut()
    router.navigate('/login')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-bengali">
        {/* Primary Application Router */}
        <RouterProvider router={router} />

      {/* Floating Development Role Switcher Bar */}
      <aside aria-label="Role preview bar" className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl glass-card border border-indigo-500/30 shadow-2xl backdrop-blur-2xl">
        <div className="hidden sm:flex items-center gap-1 px-2 text-[11px] font-semibold text-indigo-300">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>রোল প্রিভিউ:</span>
        </div>

        <div className="flex items-center gap-1">
          {(['SUPER_ADMIN', 'MANAGER', 'BOARDER', 'APPLICANT'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
                profile?.role === role
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 border border-primary-400/40'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              {role === 'SUPER_ADMIN' ? 'এডমিন' : role === 'MANAGER' ? 'ম্যানেজার' : role === 'BOARDER' ? 'বর্ডার' : 'আবেদনকারী'}
            </button>
          ))}

          <button
            onClick={handleGuestSwitch}
            className="px-2 py-1 rounded-xl text-[10px] font-bold bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40 transition-colors"
            title="লগআউট প্রিভিউ"
          >
            গেস্ট
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1 px-1.5 text-[10px] text-slate-400 border-l border-slate-700/60 ml-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Prompt 09 & 10</span>
        </div>
      </aside>
    </div>
    </QueryClientProvider>
  )
}

export default App

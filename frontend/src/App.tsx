import React, { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/app/router'
import { useAuthStore } from '@/app/store/useAuthStore'
import type { UserRole } from '@/types/database'
import { Shield } from 'lucide-react'

export const App: React.FC = () => {
  const { initializeAuth, profile, setDemoUser, signOut } = useAuthStore()

  useEffect(() => {
    const initApp = async () => {
      await initializeAuth()
      // Default to Super Admin for smooth initial exploration if not already authenticated
      if (!useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().setDemoUser('SUPER_ADMIN')
      }
    }
    initApp()
  }, [initializeAuth])

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

  const [bypassCutoff, setBypassCutoff] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('erp_cutoff_bypass')
    return saved === null ? true : saved === 'true'
  })

  const toggleCutoffBypass = () => {
    const next = !bypassCutoff
    setBypassCutoff(next)
    localStorage.setItem('erp_cutoff_bypass', next ? 'true' : 'false')
    window.dispatchEvent(new Event('erp_cutoff_bypass_changed'))
    queryClient.invalidateQueries()
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
            <span>রোল:</span>
          </div>

          <div className="flex items-center gap-1">
            {(['SUPER_ADMIN', 'MANAGER', 'BOARDER', 'APPLICANT'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${profile?.role === role
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

            <button
              onClick={toggleCutoffBypass}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                bypassCutoff
                  ? 'bg-amber-950/70 text-amber-300 border-amber-500/50 hover:bg-amber-900/80'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700/60 hover:text-slate-300'
              }`}
              title="১০:০০ PM কাটঅফ বাইপাস টগল (রাত ১০টার পরেও মিল পরিবর্তন পরীক্ষা করার জন্য)"
            >
              <span>🧪 কাটঅফ বাইপাস: {bypassCutoff ? 'অন' : 'অফ'}</span>
            </button>
          </div>
        </aside>
      </div>
    </QueryClientProvider>
  )
}

export default App

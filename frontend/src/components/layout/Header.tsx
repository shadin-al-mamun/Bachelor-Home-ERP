import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Building2,
  Clock,
  Sun,
  Moon,
  LogOut,
  Wifi,
  WifiOff,
  User,
  Shield,
  Menu,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { Badge, LanguageSwitcher } from '@/components/common'
import { formatDhakaDate } from '@/utils/date'
import NotificationDropdown from './NotificationDropdown'

interface HeaderProps {
  onToggleSidebar?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t } = useTranslation()
  const { profile, signOut } = useAuthStore()
  const { logoUrl, orgName, initializeBranding } = useBrandingStore()
  const [dhakaTime, setDhakaTime] = useState(formatDhakaDate(new Date(), 'hh:mm:ss A'))
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    initializeBranding()
  }, [initializeBranding])

  // Live Dhaka Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setDhakaTime(formatDhakaDate(new Date(), 'hh:mm:ss A'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Online/Offline Listener for PWA
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Theme Sync
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <header className="sticky top-0 z-30 h-16 glass border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link
          to={(profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || !profile?.role) ? '/settings/hostel' : '/dashboard'}
          className="flex items-center gap-2.5 group cursor-pointer select-none"
          title="হোস্টেল সেটিংস"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-400 p-0.5 shadow-md shadow-primary-500/20 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-4 h-4 text-primary-400" />
              )}
            </div>
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-white tracking-tight block group-hover:text-primary-300 transition-colors">
              {orgName || t('app.title')}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Asia/Dhaka ERP
            </span>
          </div>
        </Link>
      </div>

      {/* Right: Controls & Profile */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* PWA Connection Status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs">
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Wifi className="w-3 h-3" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <WifiOff className="w-3 h-3" />
              Offline
            </span>
          )}
        </div>

        {/* Live Dhaka Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-primary-400" />
          <span>{dhakaTime}</span>
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Switcher */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Real-Time Notification Bell Dropdown */}
        <NotificationDropdown />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-300 flex items-center justify-center text-xs font-bold">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="hidden sm:block text-left pr-1">
              <span className="text-xs font-medium text-white block max-w-[120px] truncate">
                {profile?.full_name || 'ডেমো ইউজার'}
              </span>
              <span className="text-[10px] text-primary-400 block -mt-0.5">
                {profile?.role || 'SUPER_ADMIN'}
              </span>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-card border border-slate-700/80 shadow-2xl p-2 space-y-1 z-50">
              <div className="px-3 py-2 border-b border-slate-800/80">
                <p className="text-sm font-semibold text-white truncate">
                  {profile?.full_name || 'হোস্টেল এডমিন'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {profile?.email || 'admin@bachelorhome.erp'}
                </p>
                <div className="mt-1.5">
                  <Badge status="ACTIVE" showDot={true}>
                    {profile?.role || 'SUPER_ADMIN'}
                  </Badge>
                </div>
              </div>

              <div className="px-3 py-1.5 text-xs text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Zero-Trust RLS Active</span>
              </div>

              {/* Branding Link for Admins */}
              {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || !profile?.role) && (
                <Link
                  to="/settings/hostel"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-colors border border-amber-500/30 bg-amber-500/10"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">হোস্টেল সেটিংস</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setIsUserMenuOpen(false)
                  signOut()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট (Sign Out)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

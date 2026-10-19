import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Check,
  CheckCheck,
  ArrowRight,
  AlertTriangle,
  CalendarX,
  Utensils,
  Database,
  Info,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useNotifications } from '@/features/notifications/api/useNotifications'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import type { SystemNotification, NotificationType } from '@/types/database'
import { formatDhakaDate } from '@/utils/date'

interface NotificationDropdownProps {
  className?: string
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ className = '' }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    hasNewPulse,
    markAsRead,
    markAllAsRead,
    isMarkingAll,
    deleteNotification,
    triggerDemoNotification,
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'ALERT'>('ALL')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  // Filtered notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'UNREAD') return !notif.is_read
    if (activeTab === 'ALERT') return notif.type === 'ALERT' || notif.type === 'WARNING'
    return true
  })

  // Relative time helper
  const getRelativeTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'এইমাত্র (Just now)'
      if (diffMins < 60) return `${diffMins} মিনিট আগে`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`
      return formatDhakaDate(dateStr, 'DD MMM, hh:mm A')
    } catch {
      return dateStr
    }
  }

  // Helper to render type-specific icons and colors
  const getTypeConfig = (type: NotificationType) => {
    switch (type) {
      case 'ALERT':
        return {
          icon: AlertTriangle,
          colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          badgeText: 'জরুরি অ্যালার্ট',
        }
      case 'WARNING':
        return {
          icon: CalendarX,
          colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          badgeText: 'সতর্কবার্তা',
        }
      case 'MEAL':
        return {
          icon: Utensils,
          colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          badgeText: 'মিল সার্ভিস',
        }
      case 'SYSTEM':
        return {
          icon: Database,
          colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          badgeText: 'সিস্টেম হেলথ',
        }
      default:
        return {
          icon: Info,
          colorClass: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
          badgeText: 'তথ্য',
        }
    }
  }

  const handleActionClick = (notif: SystemNotification) => {
    if (!notif.is_read) {
      markAsRead(notif.id)
    }
    setIsOpen(false)
    if (notif.action_url) {
      navigate(notif.action_url)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen
            ? 'bg-slate-800 text-white border border-primary-500/50 shadow-lg shadow-primary-500/10'
            : 'bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/80 text-slate-300 hover:text-white'
        }`}
        title="নোটিফিকেশন সেন্টার (Notifications & Alerts)"
        aria-label="Open notifications"
        aria-expanded={isOpen}
      >
        <Bell className={`w-4 h-4 transition-transform ${hasNewPulse ? 'animate-bounce text-amber-400' : ''}`} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-md shadow-rose-500/40 border border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
            <span className="absolute -inset-0.5 rounded-full bg-rose-500 animate-ping opacity-75 -z-10" />
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[340px] sm:w-[420px] rounded-2xl glass-card border border-slate-700/80 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t('notifications.title', 'বিজ্ঞপ্তি ও অ্যালার্ট')}
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {unreadCount} {t('notifications.unread', 'অপঠিত')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('notifications.subtitle', 'রিয়েল-টাইম অপারেশনাল নোটিফিকেশন')}
                </p>
              </div>
            </div>

            {/* Mark All Read Action */}
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                disabled={isMarkingAll}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-primary-300 hover:text-primary-200 border border-slate-700 transition-colors disabled:opacity-50"
                title={t('notifications.markAllRead', 'সব পঠিত মার্ক করুন')}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t('notifications.markAllRead', 'সব পঠিত')}</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 bg-slate-950/60 border-b border-slate-800/60 text-xs">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {t('notifications.all', 'সকল')} ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'UNREAD'
                  ? 'bg-slate-800 text-rose-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {t('notifications.unread', 'অপঠিত')} ({unreadCount})
            </button>
            <button
              onClick={() => setActiveTab('ALERT')}
              className={`flex-1 py-1 rounded-lg font-medium transition-colors ${
                activeTab === 'ALERT'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {t('notifications.alerts', 'সতর্কতা')}
            </button>
          </div>

          {/* Chronological Notification Items */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-500">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-slate-300">কোনো নোটিফিকেশন নেই</p>
                <p className="text-xs text-slate-500">সব অপারেশনাল স্ট্যাটাস স্বাভাবিক ও আপ-টু-ডেট রয়েছে।</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const config = getTypeConfig(notif.type)
                const IconComponent = config.icon

                return (
                  <div
                    key={notif.id}
                    className={`p-3 sm:p-3.5 transition-colors relative group ${
                      notif.is_read
                        ? 'bg-slate-900/30 hover:bg-slate-900/60 opacity-80 hover:opacity-100'
                        : 'bg-slate-900/80 hover:bg-slate-800/80 border-l-2 border-primary-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Category Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${config.colorClass}`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-xs font-bold text-white tracking-tight line-clamp-1">
                            {notif.title}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/50 text-[11px]">
                          {/* Elapsed Time */}
                          <span className="text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {getRelativeTime(notif.created_at)}
                          </span>

                          {/* Action Button & Mark Read */}
                          <div className="flex items-center gap-1.5">
                            {!notif.is_read && (
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="পঠিত মার্ক করুন"
                              >
                                পঠিত
                              </button>
                            )}

                            {notif.action_url && (
                              <button
                                onClick={() => handleActionClick(notif)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary-600/20 hover:bg-primary-600/30 text-primary-300 hover:text-primary-200 border border-primary-500/30 text-[11px] font-bold transition-all"
                              >
                                <span>{t('notifications.review', 'রিভিউ করুন')}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}

                            <button
                              onClick={() => deleteNotification(notif.id)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="বিজ্ঞপ্তি মুছে ফেলুন"
                              aria-label="Delete notification"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer with Realtime Pulse & Test Trigger */}
          <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>রিয়েল-টাইম সিঙ্ক সক্রিয়</span>
            </div>

            {/* QA Demo trigger for testing in review (hidden in live mode) */}
            {!isSupabaseConfigured && (
              <button
                onClick={() => triggerDemoNotification('ALERT')}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                title="টেস্ট নোটিফিকেশন পুশ করুন"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>টেস্ট অ্যালার্ট</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown

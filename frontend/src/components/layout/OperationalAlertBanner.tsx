import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  X,
  Banknote,
  CalendarX,
  ShieldAlert,
} from 'lucide-react'
import { useNotifications } from '@/features/notifications/api/useNotifications'
import type { SystemNotification } from '@/types/database'

export const OperationalAlertBanner: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { operationalAlerts, markAsRead } = useNotifications()
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  // Visible alerts excluding locally dismissed ones
  const visibleAlerts = operationalAlerts.filter((a) => !dismissedIds.includes(a.id))

  if (visibleAlerts.length === 0) return null

  // Focus on the highest priority or most recent alert
  const topAlert = visibleAlerts[0]

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDismissedIds((prev) => [...prev, id])
  }

  const handleAction = (alert: SystemNotification) => {
    markAsRead(alert.id)
    if (alert.action_url) {
      navigate(alert.action_url)
    }
  }

  // Visual style determined by notification title / type
  const isHandover = topAlert.title.includes('হস্তান্তর') || topAlert.title.includes('Handover')
  const isVariance = topAlert.title.includes('ভ্যারিয়েন্স') || topAlert.title.includes('Variance')
  const isOverdue = topAlert.title.includes('বকেয়া') || topAlert.title.includes('Overdue')

  return (
    <div className="w-full mb-4 sm:mb-6 animate-in slide-in-from-top-3 duration-200">
      <div
        className={`relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-xl backdrop-blur-md transition-all ${
          isVariance
            ? 'bg-rose-950/60 border-rose-500/40 text-rose-100 shadow-rose-950/30'
            : isHandover
            ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-100 shadow-indigo-950/30'
            : 'bg-amber-950/60 border-amber-500/40 text-amber-100 shadow-amber-950/30'
        }`}
      >
        {/* Ambient Top Glow */}
        <div
          className={`absolute -top-12 left-1/4 w-48 h-24 rounded-full blur-2xl pointer-events-none opacity-40 ${
            isVariance ? 'bg-rose-500' : isHandover ? 'bg-indigo-500' : 'bg-amber-500'
          }`}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Icon & Message */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 border ${
                isVariance
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                  : isHandover
                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
              }`}
            >
              {isVariance ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : isHandover ? (
                <Banknote className="w-5 h-5 animate-bounce" />
              ) : isOverdue ? (
                <CalendarX className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white">
                  {isVariance
                    ? t('notifications.cashVariance', 'ক্যাশ ভ্যারিয়েন্স সতর্কতা')
                    : isHandover
                    ? t('notifications.handoverInflow', 'পেন্ডিং হ্যান্ডওভার অ্যালার্ট')
                    : t('notifications.overdueDues', 'বকেয়া বিল তাগাদা')}
                </span>
                {visibleAlerts.length > 1 && (
                  <span className="text-[10px] text-white/70 font-mono">
                    +{visibleAlerts.length - 1}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/95 leading-relaxed">
                {topAlert.message}
              </p>
            </div>
          </div>

          {/* Right Action & Dismiss */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {topAlert.action_url && (
              <button
                onClick={() => handleAction(topAlert)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                  isVariance
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                    : isHandover
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                }`}
              >
                <span>
                  {isVariance
                    ? 'ক্যাশ সেশন অডিট'
                    : isHandover
                    ? 'হ্যান্ডওভার গ্রহণ / রিভিউ'
                    : 'বকেয়া বিবরণ দেখুন'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={(e) => handleDismiss(topAlert.id, e)}
              className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="বিজ্ঞপ্তি বন্ধ করুন"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OperationalAlertBanner

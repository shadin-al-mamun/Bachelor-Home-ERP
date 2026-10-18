import React, { useState, useEffect } from 'react'
import { WifiOff, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react'

export const OfflineWarningToast: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setJustReconnected(true)
      const timer = setTimeout(() => setJustReconnected(false), 4000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setJustReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline && !justReconnected) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-bounce-in shadow-2xl transition-all duration-300"
    >
      {isOffline ? (
        <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl text-rose-100 flex items-start gap-3 shadow-rose-950/50">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
            <WifiOff className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>ইন্টারনেট সংযোগ বিচ্ছিন্ন (Offline Mode)</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              অফলাইনে থাকাকালীন কোনো আর্থিক ট্রানজেকশন, রেন্ট কালেকশন বা মিলের স্টেট পরিবর্তন সাবমিট করা যাবে না।
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-rose-400/80 font-mono">PWA Offline Safety Trap Active</span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-2.5 py-1 rounded-lg bg-rose-800/60 hover:bg-rose-700/80 text-[11px] font-semibold text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>রিফ্রেশ</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-xl text-emerald-100 flex items-center gap-3 shadow-emerald-950/50">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold text-white">
            ইন্টারনেট সংযোগ পুনরায় স্থাপিত হয়েছে (Back Online)
          </div>
        </div>
      )}
    </div>
  )
}

export default OfflineWarningToast

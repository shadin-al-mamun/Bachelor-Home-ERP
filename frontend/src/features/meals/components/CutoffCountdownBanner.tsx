import React, { useState, useEffect } from 'react'
import {
  Clock,
  AlertTriangle,
  Lock,
  Sparkles,
} from 'lucide-react'
import {
  getDhakaNow,
  isDhakaCutoffPassed,
  getRemainingCutoffSeconds,
} from '../api/useMeals'

interface CutoffCountdownBannerProps {
  cutoffTimeStr?: string
}

export const CutoffCountdownBanner: React.FC<CutoffCountdownBannerProps> = ({
  cutoffTimeStr = '22:00:00',
}) => {
  const [dhakaTime, setDhakaTime] = useState<Date>(getDhakaNow())
  const [remainingSecs, setRemainingSecs] = useState<number>(
    getRemainingCutoffSeconds(cutoffTimeStr)
  )
  const [cutoffPassed, setCutoffPassed] = useState<boolean>(
    isDhakaCutoffPassed(cutoffTimeStr)
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const now = getDhakaNow()
      setDhakaTime(now)
      setRemainingSecs(getRemainingCutoffSeconds(cutoffTimeStr))
      setCutoffPassed(isDhakaCutoffPassed(cutoffTimeStr))
    }, 1000)

    return () => clearInterval(timer)
  }, [cutoffTimeStr])

  // Breakdown remaining time into hours, minutes, seconds
  const hours = Math.floor(remainingSecs / 3600)
  const minutes = Math.floor((remainingSecs % 3600) / 60)
  const seconds = remainingSecs % 60

  // Format Bengali Time: HH:MM:SS AM/PM
  const timeFormatted = dhakaTime.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  // Evening Decision Window: 6:00 PM (18:00) to 10:00 PM (22:00) = 4 hours (14,400s)
  const totalWindowSecs = 14400
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.floor(((totalWindowSecs - remainingSecs) / totalWindowSecs) * 100))
  )

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-xl ${
        cutoffPassed
          ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 border-rose-500/40 shadow-rose-900/10'
          : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border-amber-500/40 shadow-amber-900/10'
      }`}
    >
      {/* Background ambient lighting */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all ${
          cutoffPassed ? 'bg-rose-500/15' : 'bg-amber-500/15'
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left Side: Real-time Dhaka Clock & Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>বাংলাদেশ সময় (Asia/Dhaka)</span>
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
              {timeFormatted}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            {cutoffPassed ? (
              <>
                <Lock className="w-5 h-5 text-rose-400 shrink-0" />
                <span>রাত ১০:০০ টা কাটঅফ সময় অতিক্রান্ত হয়েছে</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <span>আগামীকালের মিল পরিবর্তনের লাইভ কাউন্টডাউন</span>
              </>
            )}
          </h2>

          <p className="text-xs text-slate-300 max-w-xl">
            {cutoffPassed ? (
              <span>
                আজকের রাত ১০:০০ টার কাটঅফ সময় পার হয়ে গেছে। আগামীকালের মিল স্বয়ংক্রিয়ভাবে লক করা হয়েছে। তবে পরশু এবং পরবর্তী দিনের মিল এখনো পরিবর্তন করা যাবে।
              </span>
            ) : (
              <span>
                আগামীকালের ব্রেকফাস্ট, লাঞ্চ বা ডিনার অন/অফ করতে নিচের কাউন্টডাউন শেষ হওয়ার পূর্বেই সুইচ চাপুন। ১০:০০ টার পর স্বয়ংক্রিয় লক হবে।
              </span>
            )}
          </p>
        </div>

        {/* Right Side: Glowing Countdown Display */}
        <div className="shrink-0 self-start md:self-center">
          {cutoffPassed ? (
            <div className="px-5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  কাটঅফ লকড (Locked)
                </div>
                <div className="text-sm font-semibold text-rose-200 mt-0.5">
                  আগামীকালকের মিল সংরক্ষিত
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/40 shadow-inner flex flex-col items-center min-w-[240px]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                কাটঅফ বাকি (Remaining)
              </span>

              {/* Digital Countdown Digits */}
              <div className="flex items-center gap-2 font-mono text-2xl sm:text-3xl font-extrabold text-amber-300">
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-2.5 py-1 shadow">
                  {String(hours).padStart(2, '0')}
                  <span className="block text-[9px] font-normal text-amber-400/80 text-center -mt-1 font-sans">
                    ঘণ্টা
                  </span>
                </div>
                <span className="text-amber-500 animate-pulse">:</span>
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-2.5 py-1 shadow">
                  {String(minutes).padStart(2, '0')}
                  <span className="block text-[9px] font-normal text-amber-400/80 text-center -mt-1 font-sans">
                    মিনিট
                  </span>
                </div>
                <span className="text-amber-500 animate-pulse">:</span>
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl px-2.5 py-1 shadow">
                  {String(seconds).padStart(2, '0')}
                  <span className="block text-[9px] font-normal text-amber-400/80 text-center -mt-1 font-sans">
                    সেকেন্ড
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full mt-3 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${100 - progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import {
  Lock,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import type { MealSessionType } from '../api/useMeals'

interface MealSessionCardProps {
  session: MealSessionType
  isActive: boolean
  price: number
  mealDate: string
  isLocked: boolean
  lockReason?: string
  canOverride: boolean
  onToggle: () => void
  onOpenOverride: () => void
  isPending?: boolean
}

export const MealSessionCard: React.FC<MealSessionCardProps> = ({
  session,
  isActive,
  price,
  isLocked,
  lockReason,
  canOverride,
  onToggle,
  onOpenOverride,
  isPending = false,
}) => {
  // Session Visual Identifiers
  const config = {
    BREAKFAST: {
      nameBn: 'সকালের নাস্তা',
      nameEn: 'Breakfast',
      emoji: '🍳',
      timing: 'সকাল ০৭:৩০ − ০৯:০০',
      borderActive: 'border-amber-500/50 shadow-amber-500/10',
      gradientActive: 'from-amber-500/20 via-slate-900 to-slate-900',
      badgeActive: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      toggleTrack: 'bg-amber-500',
      priceColor: 'text-amber-400',
    },
    LUNCH: {
      nameBn: 'দুপুরের খাবার',
      nameEn: 'Lunch',
      emoji: '🍛',
      timing: 'দুপুর ০১:০০ − ০২:৩০',
      borderActive: 'border-emerald-500/50 shadow-emerald-500/10',
      gradientActive: 'from-emerald-500/20 via-slate-900 to-slate-900',
      badgeActive: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      toggleTrack: 'bg-emerald-500',
      priceColor: 'text-emerald-400',
    },
    DINNER: {
      nameBn: 'রাতের খাবার',
      nameEn: 'Dinner',
      emoji: '🍲',
      timing: 'রাত ০৮:৩০ − ১০:০০',
      borderActive: 'border-indigo-500/50 shadow-indigo-500/10',
      gradientActive: 'from-indigo-500/20 via-slate-900 to-slate-900',
      badgeActive: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      toggleTrack: 'bg-indigo-500',
      priceColor: 'text-indigo-400',
    },
  }[session]

  return (
    <div
      className={`relative rounded-3xl p-5 border transition-all duration-300 shadow-xl overflow-hidden flex flex-col justify-between group ${
        isActive
          ? `bg-gradient-to-b ${config.gradientActive} ${config.borderActive}`
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      } ${isLocked ? 'opacity-85' : ''}`}
    >
      {/* Background Subtle Accent Glow */}
      <div
        className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-all ${
          isActive
            ? session === 'BREAKFAST'
              ? 'bg-amber-500/15'
              : session === 'LUNCH'
              ? 'bg-emerald-500/15'
              : 'bg-indigo-500/15'
            : 'bg-transparent'
        }`}
      />

      {/* Top Session Details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-slate-950/70 border border-slate-800 shadow">
              {config.emoji}
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {config.nameBn}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                {config.nameEn}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isActive ? (
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${config.badgeActive}`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>চালু (ON)</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60">
              বন্ধ (OFF)
            </span>
          )}
        </div>

        {/* Time Window & Rate per Meal */}
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium">{config.timing}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 block leading-tight">মিল রেট</span>
            <span className={`text-xs font-bold font-mono ${config.priceColor}`}>
              ৳{price.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Switcher and Controls */}
      <div className="pt-5 border-t border-slate-800/80 flex items-center justify-between gap-3 mt-4">
        {/* Toggle Switch Component */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id={`toggle-${session.toLowerCase()}`}
            data-testid={`toggle-${session.toLowerCase()}`}
            disabled={isLocked || isPending}
            onClick={onToggle}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:cursor-not-allowed ${
              isActive ? config.toggleTrack : 'bg-slate-800'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                isActive ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {isPending ? (
                <div className="w-3 h-3 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
              ) : isActive ? (
                <Sparkles className="w-3 h-3 text-slate-900" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              )}
            </span>
          </button>

          <span className="text-xs font-semibold text-slate-300">
            {isActive ? 'খাবার খাব' : 'খাব না'}
          </span>
        </div>

        {/* Lock or Admin Override Indicator */}
        <div>
          {isLocked ? (
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60"
                title={lockReason}
              >
                <Lock className="w-3 h-3 text-rose-400" />
                <span>লকড</span>
              </span>

              {canOverride && (
                <button
                  type="button"
                  onClick={onOpenOverride}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 transition-colors flex items-center gap-1"
                  title="এডমিন কাটঅফ ওভাররাইড"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  <span>ওভাররাইড</span>
                </button>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              পরিবর্তনযোগ্য
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

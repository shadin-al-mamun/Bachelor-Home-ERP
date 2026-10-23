import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  UtensilsCrossed,
  DollarSign,
  Receipt,
  History,
  Plus,
  SlidersHorizontal,
  Clock,
  Printer,
  Activity,
  ChefHat,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { isMealManagerRole, useMealSettings } from '../api/useMeals'
import { useMealRateHistory } from '../api/useMealSettingsAndRates'
import { CreateMealRateModal } from './CreateMealRateModal'
import { StaffMealControlModal } from './StaffMealControlModal'

interface MealEngineTabsProps {
  onPrint?: () => void
  isLive?: boolean
  lastEventTime?: string | null
}

export const MealEngineTabs: React.FC<MealEngineTabsProps> = ({
  onPrint,
  isLive,
  lastEventTime,
}) => {
  const location = useLocation()
  const { profile } = useAuthStore()
  const canManage = isMealManagerRole(profile?.role)
  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN'

  const [isRateModalOpen, setIsRateModalOpen] = useState(false)
  const [isStaffMealControlOpen, setIsStaffMealControlOpen] = useState(false)

  const { data: currentSettings } = useMealSettings()
  const { data: rateHistory = [] } = useMealRateHistory()
  const activeRate = rateHistory.find((r) => !r.effective_to) || rateHistory[0]

  const cutoffTime = currentSettings?.cutoff_time
    ? currentSettings.cutoff_time.slice(0, 5)
    : '22:00'

  const navLinks = [
    {
      to: '/meals',
      label: 'কিচেন ও খাবার মনিটর',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      exact: true,
      description: 'আজকের ও আগামীকালের লাইভ মিল ও ফ্ল্যাট তালিকা',
    },
    {
      to: '/meals/settings',
      label: 'মিল রেট ও কাটঅফ সেটিংস',
      icon: <DollarSign className="w-4 h-4 text-amber-400" />,
      exact: true,
      description: 'এডমিন কর্তৃক খাবার রেট ও কাটঅফ সময় নির্ধারণ',
      badge: 'এডমিন',
    },
    {
      to: '/settings/hostel?tab=menu',
      label: 'সাপ্তাহিক খাবারের মেনু',
      icon: <ChefHat className="w-4 h-4 text-orange-400" />,
      exact: false,
      description: '৭ দিনের সকালের নাস্তা, দুপুর ও রাতের খাবার তালিকা নির্ধারণ',
      badge: 'মেনু',
    },
    {
      to: '/meals/billing',
      label: 'মাসিক মিল বিলিং ও চার্জেস',
      icon: <Receipt className="w-4 h-4 text-emerald-400" />,
      exact: true,
      description: 'মাসের মিল হিসাব ও চার্জ জেনারেট',
    },
    {
      to: '/meals/audit',
      label: 'মিল পরিবর্তন অডিট লগ',
      icon: <History className="w-4 h-4 text-indigo-400" />,
      exact: true,
      description: 'কাটঅফ ওভাররাইড ও পরিবর্তন ইতিহাস',
    },
  ]

  return (
    <div className="space-y-4 print:hidden">
      {/* Top Master Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-500 to-indigo-600 p-0.5 shadow-xl shadow-amber-600/20 flex items-center justify-center text-white shrink-0">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                খাবার ইঞ্জিন (Meal Engine Hub)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                স্মার্ট মেস ডাইনিং
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              লাইভ মিল হেডকাউন্ট, এডমিন রেট কনফিগারেশন, কাটঅফ পলিসি ও মাসিক অটো-বিলিং
            </p>
          </div>
        </div>

        {/* Action Controls & Live Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Indicator if on Kitchen Monitor */}
          {typeof isLive === 'boolean' && (
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                isLive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              <Activity className="w-3.5 h-3.5" />
              <span>{isLive ? 'রিয়েলটাইম সিঙ্ক' : 'কানেক্টিং...'}</span>
              {lastEventTime && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({lastEventTime})
                </span>
              )}
            </div>
          )}

          {/* New Meal Rate Trigger Button for Admins */}
          {isAdmin && (
            <button
              onClick={() => setIsRateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="নতুন মিল রেট সিডিউল নির্ধারণ করুন"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>নতুন রেট নির্ধারণ</span>
            </button>
          )}

          {/* Admin Override Trigger Button */}
          {canManage && (
            <button
              onClick={() => setIsStaffMealControlOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="যেকোনো বর্ডারের মিল অন বা অফ করুন"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>মিল অন/অফ পরিচালনা</span>
            </button>
          )}

          {/* Print Button (Optional) */}
          {onPrint && (
            <button
              onClick={onPrint}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="রান্নাঘরের প্রিন্ট শীট"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>প্রিন্ট শীট</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Rate Spotlight Banner */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-400 font-medium">বর্তমান কার্যকর রেট:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              🍳 নাস্তা: ৳{activeRate ? activeRate.breakfast_rate : '0'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono font-bold text-emerald-300 text-sm">
              🍛 দুপুর: ৳{activeRate ? activeRate.lunch_rate : '0'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono font-bold text-indigo-300 text-sm">
              🍲 রাত: ৳{activeRate ? activeRate.dinner_rate : '0'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] border-l border-slate-800 pl-3">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>কাটঅফ সময়:</span>
            <span className="font-mono font-bold text-slate-200">{cutoffTime} (রাত ১০:০০ টা)</span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsRateModalOpen(true)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 underline underline-offset-4 cursor-pointer"
          >
            <span>রেট পরিবর্তন করতে ক্লিক করুন</span>
            <span>➔</span>
          </button>
        )}
      </div>

      {/* 4 Master Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto scrollbar-none">
        {navLinks.map((tab) => {
          const isActive = tab.exact
            ? location.pathname === tab.to
            : tab.to.includes('?')
            ? location.pathname + location.search === tab.to
            : location.pathname.startsWith(tab.to)

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                  isActive ? 'bg-black/30 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* Modals */}
      <CreateMealRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
      />

      <StaffMealControlModal
        isOpen={isStaffMealControlOpen}
        onClose={() => setIsStaffMealControlOpen(false)}
      />
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  Settings,
  DollarSign,
  Receipt,
  History,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Save,
  Calendar,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useMealSettings } from './api/useMeals'
import {
  useMealRateHistory,
  useMealChangeAuditLogs,
  useMonthlyMealBillingPreview,
  useSaveMealSettingsMutation,
  useCreateMealRateMutation,
  useGenerateMonthlyMealChargesMutation,
} from './api/useMealSettingsAndRates'
import { MealEngineTabs } from './components/MealEngineTabs'
import { CreateMealRateModal } from './components/CreateMealRateModal'

export const MealSettingsPage: React.FC = () => {
  const location = useLocation()

  // Determine active tab from URL path
  const activeTab: 'SETTINGS' | 'BILLING' | 'AUDIT' =
    location.pathname === '/meals/billing'
      ? 'BILLING'
      : location.pathname === '/meals/audit'
      ? 'AUDIT'
      : 'SETTINGS'

  // Settings State
  const { data: currentSettings } = useMealSettings()
  const saveSettingsMutation = useSaveMealSettingsMutation()

  const [moduleEnabled, setModuleEnabled] = useState<boolean>(true)
  const [breakfastEnabled, setBreakfastEnabled] = useState<boolean>(true)
  const [lunchEnabled, setLunchEnabled] = useState<boolean>(true)
  const [dinnerEnabled, setDinnerEnabled] = useState<boolean>(true)
  const [cutoffTime, setCutoffTime] = useState<string>('22:00:00')
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null)

  // Initialize local settings when query loads
  useEffect(() => {
    if (currentSettings) {
      setModuleEnabled(currentSettings.is_meal_module_enabled)
      setBreakfastEnabled(currentSettings.breakfast_enabled)
      setLunchEnabled(currentSettings.lunch_enabled)
      setDinnerEnabled(currentSettings.dinner_enabled)
      setCutoffTime(currentSettings.cutoff_time || '22:00:00')
    }
  }, [currentSettings])

  // Rate Creation State
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false)
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [newBreakfastRate, setNewBreakfastRate] = useState<string>('')
  const [newLunchRate, setNewLunchRate] = useState<string>('')
  const [newDinnerRate, setNewDinnerRate] = useState<string>('')
  const [rateSuccessMsg, setRateSuccessMsg] = useState<string | null>(null)
  const [rateErrorMsg, setRateErrorMsg] = useState<string | null>(null)

  const createRateMutation = useCreateMealRateMutation()
  const { data: rateHistory = [], refetch: refetchRateHistory } = useMealRateHistory()
  const activeRate = rateHistory.find((r) => !r.effective_to) || rateHistory[0]

  // Prepopulate rate inputs from active rate
  useEffect(() => {
    if (activeRate) {
      setNewBreakfastRate(String(activeRate.breakfast_rate))
      setNewLunchRate(String(activeRate.lunch_rate))
      setNewDinnerRate(String(activeRate.dinner_rate))
    }
  }, [activeRate])

  // Monthly Meal Billing State
  const [billingMonth, setBillingMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) + '-01'
  )
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10)
  )
  const [billingSuccessMsg, setBillingSuccessMsg] = useState<string | null>(null)
  const {
    data: billingPreview,
    isLoading: isBillingLoading,
    refetch: refetchBilling,
  } = useMonthlyMealBillingPreview(billingMonth)
  const generateChargesMutation = useGenerateMonthlyMealChargesMutation()

  // Audit Logs State
  const [auditSearch, setAuditSearch] = useState<string>('')
  const { data: auditLogs = [], isLoading: isAuditLoading } = useMealChangeAuditLogs(50)

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.boarder_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.boarder_code.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.changer_name.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.session_changed.toLowerCase().includes(auditSearch.toLowerCase())
  )

  // Handlers
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSuccessMsg(null)
    try {
      await saveSettingsMutation.mutateAsync({
        isMealModuleEnabled: moduleEnabled,
        breakfastEnabled,
        lunchEnabled,
        dinnerEnabled,
        cutoffTime,
      })
      setSettingsSuccessMsg('গ্লোবাল মিল কনফিগারেশন সফলভাবে সংরক্ষিত হয়েছে।')
      setTimeout(() => setSettingsSuccessMsg(null), 4000)
    } catch (err: any) {
      alert(err.message || 'সেটিংস সংরক্ষণে ব্যর্থ হয়েছে।')
    }
  }

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault()
    setRateSuccessMsg(null)
    setRateErrorMsg(null)

    const bRate = parseFloat(newBreakfastRate)
    const lRate = parseFloat(newLunchRate)
    const dRate = parseFloat(newDinnerRate)

    if (isNaN(bRate) || isNaN(lRate) || isNaN(dRate) || bRate < 0 || lRate < 0 || dRate < 0) {
      setRateErrorMsg('মিলের রেট শূন্য বা ধনাত্মক সংখ্যা হতে হবে।')
      return
    }

    if (!rateEffectiveFrom) {
      setRateErrorMsg('কার্যকর শুরুর তারিখ নির্বাচন করুন।')
      return
    }

    try {
      const res = await createRateMutation.mutateAsync({
        effectiveFrom: rateEffectiveFrom,
        breakfastRate: bRate,
        lunchRate: lRate,
        dinnerRate: dRate,
      })
      setRateSuccessMsg(res?.message || 'নতুন মিল রেট সফলভাবে কার্যকর হয়েছে!')
      refetchRateHistory()
      setTimeout(() => setRateSuccessMsg(null), 4000)
    } catch (err: any) {
      setRateErrorMsg(err.message || 'নতুন রেট তৈরিতে ব্যর্থ হয়েছে।')
    }
  }

  const handleGenerateMealCharges = async () => {
    const unbilledCount =
      billingPreview?.preview_items.filter((item) => !item.already_billed).length || 0

    if (unbilledCount === 0) {
      alert('এই মাসের জন্য সকল সক্রিয় বর্ডারের মিল বিল ইতিমধ্যে তৈরি করা হয়েছে।')
      return
    }

    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে ${unbilledCount} জন বর্ডারের জন্য ${billingMonth} মাসের মিল বিল তৈরি করতে চান?`
    )
    if (!confirmed) return

    setBillingSuccessMsg(null)
    try {
      const res = await generateChargesMutation.mutateAsync({
        billingMonth,
        dueDate,
      })
      setBillingSuccessMsg(res.message || 'মাসিক খাবার বিল সফলভাবে জেনারেট হয়েছে।')
      refetchBilling()
    } catch (err: any) {
      alert(err.message || 'মিল বিল তৈরিতে ব্যর্থ হয়েছে।')
    }
  }

  const numBreakfast = parseFloat(newBreakfastRate) || 0
  const numLunch = parseFloat(newLunchRate) || 0
  const numDinner = parseFloat(newDinnerRate) || 0
  const totalDailyNew = numBreakfast + numLunch + numDinner

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Unified Master Header & Navigation Tabs */}
      <MealEngineTabs />

      {/* TAB 1: SYSTEM SETTINGS & MEAL RATES */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          {/* Rate Setup Feedback Messages */}
          {rateSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="font-semibold">{rateSuccessMsg}</span>
            </div>
          )}

          {rateErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span className="font-semibold">{rateErrorMsg}</span>
            </div>
          )}

          {/* Section 1: Prominent Meal Rates Configuration Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Card 1A: Current Active Rate Showcase (Left 5 Cols) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    বর্তমান কার্যকর মিল রেট
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    চলমান (Active)
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                      <span className="text-base">🍳</span>
                      <span>সকালের নাস্তা (Breakfast):</span>
                    </span>
                    <span className="text-lg font-extrabold font-mono text-amber-400">
                      ৳{activeRate ? Number(activeRate.breakfast_rate).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                      <span className="text-base">🍛</span>
                      <span>দুপুরের খাবার (Lunch):</span>
                    </span>
                    <span className="text-lg font-extrabold font-mono text-emerald-400">
                      ৳{activeRate ? Number(activeRate.lunch_rate).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-2">
                      <span className="text-base">🍲</span>
                      <span>রাতের খাবার (Dinner):</span>
                    </span>
                    <span className="text-lg font-extrabold font-mono text-indigo-400">
                      ৳{activeRate ? Number(activeRate.dinner_rate).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">দৈনিক ৩ বেলা ফুল মিল খরচ:</span>
                  <span className="text-base font-extrabold font-mono text-amber-300">
                    ৳{activeRate ? (Number(activeRate.breakfast_rate) + Number(activeRate.lunch_rate) + Number(activeRate.dinner_rate)).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>কার্যকর শুরুর তারিখ:</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {activeRate?.effective_from || 'নির্ধারিত হয়নি'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 1B: Direct Admin Meal Rate Setup Form (Right 7 Cols) */}
            <div className="lg:col-span-7 glass-card rounded-3xl border border-amber-500/30 p-6 space-y-5 relative shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    এডমিন মিলের রেট নির্ধারণ ও আপডেট ফর্ম
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    এখানে সরাসরি নতুন রেট লিখে সংরক্ষণ করলেই সিস্টেমে কার্যকর হয়ে যাবে
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                  এডমিন প্যানেল
                </span>
              </div>

              <form onSubmit={handleCreateRate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    কার্যকর শুরুর তারিখ (Effective From) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rateEffectiveFrom}
                    onChange={(e) => setRateEffectiveFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="text-[10px] text-slate-500">
                    পূর্ববর্তী রেট স্বয়ংক্রিয়ভাবে সমাপ্ত হয়ে এই তারিখ থেকে নতুন রেট গণনা শুরু হবে।
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  {/* Breakfast */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1.5">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <span>🍳 নাস্তা</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono font-bold">৳</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        placeholder="30"
                        value={newBreakfastRate}
                        onChange={(e) => setNewBreakfastRate(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">টাকা / মিল</span>
                  </div>

                  {/* Lunch */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-1.5">
                    <label className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <span>🍛 দুপুর</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono font-bold">৳</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        placeholder="65"
                        value={newLunchRate}
                        onChange={(e) => setNewLunchRate(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">টাকা / মিল</span>
                  </div>

                  {/* Dinner */}
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-1.5">
                    <label className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                      <span>🍲 রাত</span>
                      <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono font-bold">৳</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        placeholder="60"
                        value={newDinnerRate}
                        onChange={(e) => setNewDinnerRate(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">টাকা / মিল</span>
                  </div>
                </div>

                {/* Summary Pill & Submit Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800">
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>নতুন ফুল মিল হিসাব:</span>
                    <span className="text-sm font-extrabold font-mono text-amber-300">
                      ৳{totalDailyNew.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      (~৳{(totalDailyNew * 30).toFixed(0)}/মাস)
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={createRateMutation.isPending}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" />
                    <span>{createRateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'নতুন রেট সংরক্ষণ ও কার্যকর করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Section 2: Global Configuration & Rate History */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Cutoff Time & Session Switches (7 Cols) */}
            <div className="lg:col-span-7 glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-indigo-400" />
                    গ্লোবাল মিল পলিসি ও কাটঅফ সময়
                  </h3>
                  <p className="text-xs text-slate-400">
                    মিল ইঞ্জিন চালু/বন্ধ ও প্রতিদিনের স্বয়ংক্রিয় কাটঅফ সময় নির্ধারণ
                  </p>
                </div>

                {settingsSuccessMsg && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>সংরক্ষিত!</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Module Master Switch */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">মিল ইঞ্জিন সার্বিক চালু রাখুন</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      বন্ধ করলে বর্ডারদের মিল নির্বাচন সাময়িকভাবে স্থগিত থাকবে
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={moduleEnabled}
                    onChange={(e) => setModuleEnabled(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {/* Individual Session Toggles */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    সক্রিয় মিল সেশনসমূহ:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍳 নাস্তা (Breakfast)</span>
                      <input
                        type="checkbox"
                        checked={breakfastEnabled}
                        onChange={(e) => setBreakfastEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍛 দুপুর (Lunch)</span>
                      <input
                        type="checkbox"
                        checked={lunchEnabled}
                        onChange={(e) => setLunchEnabled(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍲 রাত (Dinner)</span>
                      <input
                        type="checkbox"
                        checked={dinnerEnabled}
                        onChange={(e) => setDinnerEnabled(e.target.checked)}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Cutoff Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      প্রতিদিনের কাটঅফ সময় (Asia/Dhaka) <span className="text-rose-400">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500">ডিফল্ট: রাত ১০:০০ টা (22:00)</span>
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={cutoffTime}
                    onChange={(e) => setCutoffTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    এই সময়ের পর বর্ডাররা স্বয়ংক্রিয়ভাবে আগামীকালের খাবার পরিবর্তন করতে পারবে না (শুধুমাত্র এডমিন ওভাররাইড কার্যকর হবে)।
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveSettingsMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'কাটঅফ সেটিংস সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Meal Rate History (5 Cols) */}
            <div className="lg:col-span-5 glass-card rounded-3xl border border-slate-800 p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    পূর্ববর্তী রেট সিডিউল হিস্ট্রি
                  </h3>
                  <p className="text-xs text-slate-400">
                    পূর্বে কার্যকর থাকা মিল রেটের নিরীক্ষা তালিকা
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {rateHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">কোনো পূর্ববর্তী রেট পাওয়া যায়নি।</p>
                ) : (
                  rateHistory.map((rate) => (
                    <div
                      key={rate.id}
                      className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-slate-200">
                          {rate.effective_from} ➔ {rate.effective_to ? rate.effective_to : <span className="text-emerald-400 font-bold">(চলমান)</span>}
                        </span>
                        {!rate.effective_to && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            সক্রিয়
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-900">
                        <div className="p-1.5 rounded-xl bg-slate-900">
                          <span className="text-[10px] text-amber-400 block font-medium">নাস্তা</span>
                          <span className="font-mono font-bold text-white">৳{rate.breakfast_rate}</span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-slate-900">
                          <span className="text-[10px] text-emerald-400 block font-medium">দুপুর</span>
                          <span className="font-mono font-bold text-white">৳{rate.lunch_rate}</span>
                        </div>
                        <div className="p-1.5 rounded-xl bg-slate-900">
                          <span className="text-[10px] text-indigo-400 block font-medium">রাত</span>
                          <span className="font-mono font-bold text-white">৳{rate.dinner_rate}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY MEAL BILLING */}
      {activeTab === 'BILLING' && (
        <div className="space-y-6">
          {billingSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="font-semibold">{billingSuccessMsg}</span>
            </div>
          )}

          <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-400" />
                  মাসিক খাবার বিল প্রিভিউ ও লেজার জেনারেশন
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  বর্ডারদের সারা মাসের গৃহিত মিল হিসাব করে স্বয়ংক্রিয়ভাবে বিলিং লেজারে চার্জ যোগ করুন
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400">বিলিং মাস:</span>
                  <input
                    type="month"
                    value={billingMonth.slice(0, 7)}
                    onChange={(e) => setBillingMonth(`${e.target.value}-01`)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-slate-400">পরিশোধের শেষ তারিখ:</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-transparent text-white text-xs font-mono focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleGenerateMealCharges}
                  disabled={generateChargesMutation.isPending || isBillingLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {generateChargesMutation.isPending
                      ? 'বিল তৈরি হচ্ছে...'
                      : 'মাসিক খাবার বিল তৈরি করুন'}
                  </span>
                </button>
              </div>
            </div>

            {/* Billing Table Preview */}
            <div className="overflow-x-auto">
              {isBillingLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  বিলিং প্রিভিউ লোড হচ্ছে...
                </div>
              ) : !billingPreview?.preview_items || billingPreview.preview_items.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  এই মাসের জন্য কোনো মিল বা বর্ডার পাওয়া যায়নি।
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">বর্ডার</th>
                      <th className="py-3 px-3">ফ্ল্যাট</th>
                      <th className="py-3 px-3 text-center">নাস্তা</th>
                      <th className="py-3 px-3 text-center">দুপুর</th>
                      <th className="py-3 px-3 text-center">রাত</th>
                      <th className="py-3 px-3 text-center">মোট মিল</th>
                      <th className="py-3 px-3 text-right">মোট বিল</th>
                      <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {billingPreview.preview_items.map((item) => (
                      <tr key={item.boarder_id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{item.boarder_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.boarder_code}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{item.flat_name}</td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-amber-400">
                          {item.breakfast_count}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400">
                          {item.lunch_count}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-400">
                          {item.dinner_count}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-white">
                          {item.total_meals}টি
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-300">
                          ৳{item.total_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.already_billed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              বিল তৈরি সম্পন্ন
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              অপেক্ষমান
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  কাটঅফ ও মিল পরিবর্তন অডিট ট্রেইল
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  বর্ডারদের মিল পরিবর্তন এবং এডমিন ওভাররাইডের অপরিবর্তনীয় টাইমস্ট্যাম্প লগ
                </p>
              </div>

              <input
                type="text"
                placeholder="বর্ডার নাম, কোড দিয়ে খুঁজুন..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full sm:w-64"
              />
            </div>

            <div className="overflow-x-auto">
              {isAuditLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  অডিট লগ লোড হচ্ছে...
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  কোনো অডিট লগ পাওয়া যায়নি।
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">তারিখ ও সময়</th>
                      <th className="py-3 px-3">বর্ডার</th>
                      <th className="py-3 px-3 text-center">মিল সেশন</th>
                      <th className="py-3 px-3 text-center">পরিবর্তন</th>
                      <th className="py-3 px-3">পরিবর্তনকারী</th>
                      <th className="py-3 px-3.5 text-right">টাইপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3">
                          <div className="text-slate-200 font-mono">
                            {new Date(log.changed_at).toLocaleDateString('bn-BD', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.changed_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{log.boarder_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            খাবারের তারিখ: {log.meal_date}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-300">
                          {log.session_changed}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="font-mono text-[11px] text-slate-400">
                            {log.old_value ? 'অন' : 'অফ'} ➔{' '}
                            <span
                              className={`font-bold ${
                                log.new_value ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {log.new_value ? 'অন' : 'অফ'}
                            </span>
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200">{log.changer_name}</div>
                          <div className="text-[10px] text-indigo-400">{log.changer_role}</div>
                        </td>

                        <td className="py-3 px-3.5 text-right">
                          {log.is_override ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <ShieldAlert className="w-3 h-3 text-amber-400" />
                                <span>এডমিন ওভাররাইড</span>
                              </span>
                              {log.override_reason && (
                                <p className="text-[10px] text-slate-400 mt-1 max-w-xs ml-auto italic">
                                  "{log.override_reason}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">বর্ডার সেলফ-সার্ভিস</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Rate Modal */}
      <CreateMealRateModal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
      />
    </div>
  )
}

export default MealSettingsPage

import React, { useState } from 'react'
import {
  Settings,
  DollarSign,
  Receipt,
  History,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Save,
  Calendar,
  UtensilsCrossed,
  FileCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMealSettings } from './api/useMeals'
import {
  useMealRateHistory,
  useMealChangeAuditLogs,
  useMonthlyMealBillingPreview,
  useSaveMealSettingsMutation,
  useCreateMealRateMutation,
  useGenerateMonthlyMealChargesMutation,
} from './api/useMealSettingsAndRates'

export const MealSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'BILLING' | 'AUDIT'>('SETTINGS')

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
  React.useEffect(() => {
    if (currentSettings) {
      setModuleEnabled(currentSettings.is_meal_module_enabled)
      setBreakfastEnabled(currentSettings.breakfast_enabled)
      setLunchEnabled(currentSettings.lunch_enabled)
      setDinnerEnabled(currentSettings.dinner_enabled)
      setCutoffTime(currentSettings.cutoff_time || '22:00:00')
    }
  }, [currentSettings])

  // Rate Creation Modal State
  const [isRateModalOpen, setIsRateModalOpen] = useState<boolean>(false)
  const [rateEffectiveFrom, setRateEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [newBreakfastRate, setNewBreakfastRate] = useState<string>('30')
  const [newLunchRate, setNewLunchRate] = useState<string>('65')
  const [newDinnerRate, setNewDinnerRate] = useState<string>('60')
  const createRateMutation = useCreateMealRateMutation()
  const { data: rateHistory = [] } = useMealRateHistory()

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
      setSettingsSuccessMsg('সিস্টেম সেটিংস সফলভাবে আপডেট ও সংরক্ষিত হয়েছে।')
      setTimeout(() => setSettingsSuccessMsg(null), 4000)
    } catch (err: any) {
      alert(err.message || 'সেটিংস সংরক্ষণে ব্যর্থ হয়েছে।')
    }
  }

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault()
    const bRate = parseFloat(newBreakfastRate)
    const lRate = parseFloat(newLunchRate)
    const dRate = parseFloat(newDinnerRate)

    if (isNaN(bRate) || isNaN(lRate) || isNaN(dRate) || bRate < 0 || lRate < 0 || dRate < 0) {
      alert('সঠিক রেট প্রবেশ করান।')
      return
    }

    try {
      await createRateMutation.mutateAsync({
        effectiveFrom: rateEffectiveFrom,
        breakfastRate: bRate,
        lunchRate: lRate,
        dinnerRate: dRate,
      })
      setIsRateModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'নতুন রেট তৈরিতে ব্যর্থ হয়েছে।')
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

  // Active Rate
  const activeRate = rateHistory.find((r) => !r.effective_to) || rateHistory[0]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-600/30 flex items-center justify-center text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                মিল রেট, বিলিং ও অডিট ইঞ্জিন
              </h1>
              <p className="text-xs text-slate-400">
                মিলের রেট কনফিগারেশন, মাসের শেষে স্বয়ংক্রিয় বিল জেনারেশন ও কাটঅফ অডিট ট্রেইল
              </p>
            </div>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center gap-2">
          <Link
            to="/meals"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
            <span>কিচেন মনিটর</span>
          </Link>
          <Link
            to="/meals/my-meals"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>মিল সিলেকশন</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'SETTINGS'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>সিস্টেম সেটিংস ও মিল রেট</span>
        </button>

        <button
          onClick={() => setActiveTab('BILLING')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'BILLING'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>মাসিক মিল বিলিং ও চার্জেস</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>মিল পরিবর্তন ও ওভাররাইড অডিট লগ</span>
        </button>
      </div>

      {/* TAB 1: SYSTEM SETTINGS & MEAL RATES */}
      {activeTab === 'SETTINGS' && (
        <div className="space-y-6">
          {settingsSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{settingsSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Global Settings Form */}
            <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  গ্লোবাল মিল কনফিগারেশন ও কাটঅফ সময়
                </h2>
                <p className="text-xs text-slate-400">
                  মিল ইঞ্জিন চালু/বন্ধ ও প্রতিদিনের কাটঅফ সময় নির্ধারণ
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-5">
                {/* Module Master Switch */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">মিল ইঞ্জিন সক্রিয় রাখুন</h4>
                    <p className="text-[11px] text-slate-400">
                      বন্ধ করলে বর্ডারদের মিল নির্বাচন সম্পূর্ণ স্থগিত থাকবে
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
                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍳 নাস্তা (Breakfast)</span>
                      <input
                        type="checkbox"
                        checked={breakfastEnabled}
                        onChange={(e) => setBreakfastEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍛 দুপুর (Lunch)</span>
                      <input
                        type="checkbox"
                        checked={lunchEnabled}
                        onChange={(e) => setLunchEnabled(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold text-white">🍲 রাত (Dinner)</span>
                      <input
                        type="checkbox"
                        checked={dinnerEnabled}
                        onChange={(e) => setDinnerEnabled(e.target.checked)}
                        className="w-4 h-4 accent-indigo-500 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Cutoff Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    এই সময়ের পর বর্ডাররা স্বয়ংক্রিয়ভাবে আগামীকালের খাবার পরিবর্তন করতে পারবে না।
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveSettingsMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-40"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveSettingsMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Current Active Rate Spotlight Card */}
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    বর্তমান কার্যকর মিল রেট
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    সক্রিয় (Active)
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      🍳 সকালের নাস্তা:
                    </span>
                    <span className="text-base font-extrabold font-mono text-amber-400">
                      ৳{activeRate?.breakfast_rate.toFixed(2) || '30.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      🍛 দুপুরের খাবার:
                    </span>
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      ৳{activeRate?.lunch_rate.toFixed(2) || '65.00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      🍲 রাতের খাবার:
                    </span>
                    <span className="text-base font-extrabold font-mono text-indigo-400">
                      ৳{activeRate?.dinner_rate.toFixed(2) || '60.00'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>কার্যকর তারিখ:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {activeRate?.effective_from || '2026-01-01'}
                  </span>
                </div>

                <button
                  onClick={() => setIsRateModalOpen(true)}
                  className="w-full mt-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন রেট সিডিউল তৈরি করুন</span>
                </button>
              </div>

              {/* Rate History Table */}
              <div className="glass-card rounded-3xl border border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  মিলের পূর্ববর্তী রেট হিস্ট্রি
                </h4>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rateHistory.map((rate) => (
                    <div
                      key={rate.id}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-mono font-bold text-slate-200">
                          {rate.effective_from} {rate.effective_to ? `➔ ${rate.effective_to}` : '(চলমান)'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          নাস্তা: ৳{rate.breakfast_rate} • দুপুর: ৳{rate.lunch_rate} • রাত: ৳{rate.dinner_rate}
                        </div>
                      </div>
                      {!rate.effective_to && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY MEAL BILLING & CHARGES */}
      {activeTab === 'BILLING' && (
        <div className="space-y-6">
          {billingSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{billingSuccessMsg}</span>
            </div>
          )}

          {/* Month Filter and Billing Action Bar */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  বিলিং মাস নির্বাচন করুন:
                </label>
                <input
                  type="month"
                  value={billingMonth.slice(0, 7)}
                  onChange={(e) => setBillingMonth(e.target.value + '-01')}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  পরিশোধের শেষ তারিখ (Due Date):
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-3 self-end md:self-center">
              <button
                onClick={handleGenerateMealCharges}
                disabled={generateChargesMutation.isPending || isBillingLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-40 flex items-center gap-2"
              >
                {generateChargesMutation.isPending ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>বিল জেনারেট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    <span>মাসিক খাবার বিল জেনারেট করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Billing Calculation Preview Table */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  বর্ডারদের প্রকৃত খাওয়া মিলের হিসাব ও বিলের পরিমাণ
                </h2>
                <p className="text-[11px] text-slate-400">
                  সক্রিয় রেট (নাস্তা: ৳{billingPreview?.rates.breakfast}, দুপুর: ৳{billingPreview?.rates.lunch}, রাত: ৳{billingPreview?.rates.dinner}) অনুযায়ী হিসাবকৃত
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-slate-300">
                মোট বর্ডার:{' '}
                <span className="text-amber-400">
                  {billingPreview?.preview_items.length || 0} জন
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {isBillingLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">বিলিং হিসাব করা হচ্ছে...</div>
              ) : billingPreview?.preview_items.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  নির্বাচিত মাসে কোনো মিলের রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">বর্ডার ও ফ্ল্যাট</th>
                      <th className="py-3 px-2 text-center">🍳 নাস্তা</th>
                      <th className="py-3 px-2 text-center">🍛 দুপুর</th>
                      <th className="py-3 px-2 text-center">🍲 রাত</th>
                      <th className="py-3 px-3 text-center">মোট মিল</th>
                      <th className="py-3 px-3.5 text-right">মিলের মোট বিল</th>
                      <th className="py-3 px-3 text-center">বিল স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {billingPreview?.preview_items.map((item) => (
                      <tr key={item.boarder_id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-white">{item.boarder_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.flat_name} • {item.boarder_code}
                          </div>
                        </td>

                        <td className="py-3 px-2 text-center font-mono text-slate-300">
                          {item.breakfast_count}
                        </td>

                        <td className="py-3 px-2 text-center font-mono text-slate-300">
                          {item.lunch_count}
                        </td>

                        <td className="py-3 px-2 text-center font-mono text-slate-300">
                          {item.dinner_count}
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                          {item.total_meals}টি
                        </td>

                        <td className="py-3 px-3.5 text-right font-mono font-extrabold text-white text-sm">
                          ৳{item.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {item.already_billed ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              বিল তৈরি হয়েছে
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              বিলিংয়ের জন্য প্রস্তুত
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

      {/* TAB 3: AUDIT LOG TRAIL */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                মিল পরিবর্তন ও কাটঅফ ওভাররাইড অডিট লগ
              </h2>
              <p className="text-[11px] text-slate-400">
                ডাটাবেসের অপরিবর্তনীয় জার্নাল (meal_change_audit) থেকে সংগৃহীত
              </p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="বর্ডার বা ইউজারের নাম দিয়ে খুঁজুন..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Table */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl p-5">
            <div className="overflow-x-auto">
              {isAuditLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">অডিট লগ লোড হচ্ছে...</div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">কোনো অডিট লগ পাওয়া যায়নি।</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5">তারিখ ও সময়</th>
                      <th className="py-3 px-3">বর্ডারের নাম</th>
                      <th className="py-3 px-3 text-center">মিল সেশন</th>
                      <th className="py-3 px-3 text-center">পরিবর্তন (Old ➔ New)</th>
                      <th className="py-3 px-3">পরিবর্তনকারী (Changed By)</th>
                      <th className="py-3 px-3.5 text-right">টাইপ ও কারণ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-mono text-slate-200">
                            {new Date(log.changed_at).toLocaleDateString([], {
                              day: 'numeric',
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

      {/* New Meal Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                নতুন মিল রেট সিডিউল নির্ধারণ
              </h3>
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  কার্যকর তারিখ (Effective From Date) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={rateEffectiveFrom}
                  onChange={(e) => setRateEffectiveFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  🍳 সকালের নাস্তা রেট (BDT ৳) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newBreakfastRate}
                  onChange={(e) => setNewBreakfastRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  🍛 দুপুরের খাবার রেট (BDT ৳) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newLunchRate}
                  onChange={(e) => setNewLunchRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  🍲 রাতের খাবার রেট (BDT ৳) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={newDinnerRate}
                  onChange={(e) => setNewDinnerRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700/80 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 text-[11px] text-slate-400 border border-slate-800">
                নতুন রেট কার্যকর হওয়ার দিন থেকে পরবর্তী সকল খাবারের বিলিংয়ে এটি হিসাবভুক্ত হবে।
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={createRateMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold disabled:opacity-40"
                >
                  {createRateMutation.isPending ? 'সংরক্ষণ হচ্ছে...' : 'রেট কার্যকর করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MealSettingsPage

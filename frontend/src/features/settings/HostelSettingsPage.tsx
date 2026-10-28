import React, { useState, useRef, useEffect } from 'react'
import {
  Building2,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Info,
  ArrowLeft,
  Users,
  ShieldAlert,
  KeyRound,
  MapPin,
  Phone,
  Mail,
  FileText,
  Printer,
  ShieldCheck,
  Building,
  Save,
  Megaphone,
  UtensilsCrossed,
  CalendarDays,
  ChefHat,
  Eye,
  Copy,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useBrandingStore,
  DEFAULT_BRANDING,
  DAY_ORDER,
  DAY_METADATA,
  DEFAULT_WEEKLY_MEAL_MENU,
  getDayKeyFromDate,
  type DayKey,
  type WeeklyMealMenu,
} from '@/app/store/useBrandingStore'
import { getDhakaNow } from '@/features/meals/api/useMeals'
import { useAuthStore } from '@/app/store/useAuthStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

export const HostelSettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')

  const {
    orgName,
    shortName,
    tagline,
    address,
    phone,
    email,
    emergencyContact,
    receiptFooterNote,
    receiptPrefix,
    logoUrl,
    hostelRules,
    weeklyMealMenu,
    updateBranding,
    uploadCustomLogo,
    resetToDefault,
    initializeBranding,
    isLoading,
  } = useBrandingStore()

  // Section switcher state
  const [activeSection, setActiveSection] = useState<
    'all' | 'menu' | 'general' | 'receipt' | 'rules' | 'logo'
  >(
    tabParam === 'menu'
      ? 'menu'
      : tabParam === 'general'
      ? 'general'
      : tabParam === 'receipt'
      ? 'receipt'
      : tabParam === 'rules'
      ? 'rules'
      : tabParam === 'logo'
      ? 'logo'
      : 'all'
  )

  // Form states
  const [formOrgName, setFormOrgName] = useState(orgName)
  const [formShortName, setFormShortName] = useState(shortName)
  const [formTagline, setFormTagline] = useState(tagline)
  const [formAddress, setFormAddress] = useState(address)
  const [formPhone, setFormPhone] = useState(phone)
  const [formEmail, setFormEmail] = useState(email)
  const [formEmergencyContact, setFormEmergencyContact] = useState(emergencyContact)
  const [formReceiptFooterNote, setFormReceiptFooterNote] = useState(receiptFooterNote)
  const [formReceiptPrefix, setFormReceiptPrefix] = useState(receiptPrefix)
  const [formHostelRules, setFormHostelRules] = useState(hostelRules)
  const [formWeeklyMealMenu, setFormWeeklyMealMenu] = useState<WeeklyMealMenu>(
    weeklyMealMenu || DEFAULT_WEEKLY_MEAL_MENU
  )

  // Asia/Dhaka day baseline for menu management
  const dhakaNow = getDhakaNow()
  const todayDayKey = getDayKeyFromDate(dhakaNow)
  const tomorrow = new Date(dhakaNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDayKey = getDayKeyFromDate(tomorrow)
  const todayDayMeta = DAY_METADATA[todayDayKey]
  const tomorrowDayMeta = DAY_METADATA[tomorrowDayKey]

  // Default to tomorrow's day tab because tomorrow's menu is what is actively chosen on boarder dashboards
  const [selectedDayTab, setSelectedDayTab] = useState<DayKey>(() => tomorrowDayKey)
  const [showFullWeeklyMenuModal, setShowFullWeeklyMenuModal] = useState<boolean>(false)
  const [rightPanelTab, setRightPanelTab] = useState<'receipt' | 'meal_card'>(
    tabParam === 'menu' ? 'meal_card' : 'receipt'
  )

  const handleCopyCurrentToTomorrow = () => {
    const currentMenu = formWeeklyMealMenu[selectedDayTab]
    setFormWeeklyMealMenu((prev) => ({
      ...prev,
      [tomorrowDayKey]: {
        breakfast: currentMenu?.breakfast || '',
        lunch: currentMenu?.lunch || '',
        dinner: currentMenu?.dinner || '',
      },
    }))
    setSelectedDayTab(tomorrowDayKey)
  }

  const handleApplyToAllDays = () => {
    if (
      window.confirm(
        `আপনি কি ${DAY_METADATA[selectedDayTab]?.nameBn}-এর এই মেনুটি সপ্তাহের সকল ৭ দিনের জন্যই নির্ধারণ করতে চান?`
      )
    ) {
      const currentMenu = formWeeklyMealMenu[selectedDayTab]
      setFormWeeklyMealMenu({
        saturday: { ...currentMenu },
        sunday: { ...currentMenu },
        monday: { ...currentMenu },
        tuesday: { ...currentMenu },
        wednesday: { ...currentMenu },
        thursday: { ...currentMenu },
        friday: { ...currentMenu },
      })
    }
  }

  // Sync tabParam on route change
  useEffect(() => {
    if (tabParam === 'menu') {
      setActiveSection('menu')
      setRightPanelTab('meal_card')
    } else if (tabParam === 'general') {
      setActiveSection('general')
      setRightPanelTab('receipt')
    } else if (tabParam === 'receipt') {
      setActiveSection('receipt')
      setRightPanelTab('receipt')
    } else if (tabParam === 'rules') {
      setActiveSection('rules')
      setRightPanelTab('receipt')
    } else if (tabParam === 'logo') {
      setActiveSection('logo')
      setRightPanelTab('receipt')
    }
  }, [tabParam])

  const handleSectionTabClick = (
    section: 'all' | 'menu' | 'general' | 'receipt' | 'rules' | 'logo'
  ) => {
    setActiveSection(section)
    if (section === 'menu') {
      setRightPanelTab('meal_card')
      setSearchParams({ tab: 'menu' })
    } else if (section === 'all') {
      setSearchParams({})
    } else {
      setRightPanelTab('receipt')
      setSearchParams({ tab: section })
    }
  }

  const [previewLogo, setPreviewLogo] = useState<string | null>(logoUrl)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initializeBranding()
  }, [initializeBranding])

  useEffect(() => {
    setFormOrgName(orgName)
    setFormShortName(shortName)
    setFormTagline(tagline)
    setFormAddress(address)
    setFormPhone(phone)
    setFormEmail(email)
    setFormEmergencyContact(emergencyContact)
    setFormReceiptFooterNote(receiptFooterNote)
    setFormReceiptPrefix(receiptPrefix)
    setFormHostelRules(hostelRules)
    setFormWeeklyMealMenu(weeklyMealMenu || DEFAULT_WEEKLY_MEAL_MENU)
    setPreviewLogo(logoUrl)
  }, [
    orgName,
    shortName,
    tagline,
    address,
    phone,
    email,
    emergencyContact,
    receiptFooterNote,
    receiptPrefix,
    hostelRules,
    weeklyMealMenu,
    logoUrl,
  ])

  const handleDayMealChange = (
    day: DayKey,
    session: 'breakfast' | 'lunch' | 'dinner',
    value: string
  ) => {
    setFormWeeklyMealMenu((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [session]: value,
      },
    }))
  }

  const handleResetMenuToDefault = () => {
    if (window.confirm('আপনি কি খাবারের মেনু স্ট্যান্ডার্ড পুষ্টিকর রুটিনে রিসেট করতে চান?')) {
      setFormWeeklyMealMenu(DEFAULT_WEEKLY_MEAL_MENU)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMessage(null)
    try {
      const dataUrl = await uploadCustomLogo(file)
      setPreviewLogo(dataUrl)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'লোগো আপলোড ব্যর্থ হয়েছে।')
    }
  }

  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)
    try {
      await updateBranding({
        orgName: formOrgName.trim() || DEFAULT_BRANDING.orgName,
        shortName: formShortName.trim() || DEFAULT_BRANDING.shortName,
        tagline: formTagline.trim() || DEFAULT_BRANDING.tagline,
        address: formAddress.trim() || DEFAULT_BRANDING.address,
        phone: formPhone.trim() || DEFAULT_BRANDING.phone,
        email: formEmail.trim() || DEFAULT_BRANDING.email,
        emergencyContact: formEmergencyContact.trim() || DEFAULT_BRANDING.emergencyContact,
        receiptFooterNote: formReceiptFooterNote.trim() || DEFAULT_BRANDING.receiptFooterNote,
        receiptPrefix: formReceiptPrefix.trim() || DEFAULT_BRANDING.receiptPrefix,
        hostelRules: formHostelRules.trim() || DEFAULT_BRANDING.hostelRules,
        weeklyMealMenu: formWeeklyMealMenu,
        logoUrl: previewLogo,
        appIconUrl: previewLogo,
        faviconUrl: previewLogo,
      })
      queryClient.invalidateQueries({ queryKey: ['live-organization-settings'] })
      queryClient.invalidateQueries({ queryKey: ['manager-helpline'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে।')
    }
  }

  const handleReset = async () => {
    if (window.confirm('আপনি কি ডিফল্ট হোস্টেল তথ্য ও ব্র্যান্ডিংয়ে ফিরে যেতে চান?')) {
      await resetToDefault()
      setPreviewLogo(DEFAULT_BRANDING.logoUrl)
      setFormOrgName(DEFAULT_BRANDING.orgName)
      setFormShortName(DEFAULT_BRANDING.shortName)
      setFormTagline(DEFAULT_BRANDING.tagline)
      setFormAddress(DEFAULT_BRANDING.address)
      setFormPhone(DEFAULT_BRANDING.phone)
      setFormEmail(DEFAULT_BRANDING.email)
      setFormEmergencyContact(DEFAULT_BRANDING.emergencyContact)
      setFormReceiptFooterNote(DEFAULT_BRANDING.receiptFooterNote)
      setFormReceiptPrefix(DEFAULT_BRANDING.receiptPrefix)
      setFormHostelRules(DEFAULT_BRANDING.hostelRules)
      setFormWeeklyMealMenu(DEFAULT_WEEKLY_MEAL_MENU)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const currentActiveLogo = previewLogo || DEFAULT_BRANDING.logoUrl || '/pwa-512x512.svg'

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/settings/users"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>কর্মকর্তা ও পদবী ব্যবস্থাপনা</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            সুপারএডমিন হোস্টেল কনফিগারেশন
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            হোস্টেল সেটিংস ও প্রোফাইল
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            হোস্টেলের নাম, ঠিকানা, হটলাইন, রিসিপ্ট ভাউচারের তথ্য ও লোগো পরিবর্তন করুন। এখানকার যাবতীয় তথ্য মানি রিসিপ্ট, ভাউচার, রিপোর্ট এবং সফটওয়্যার হেডারে সরাসরি শো করবে।
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            ডিফল্ট তথ্যে রিসেট
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSaveAllSettings()}
            disabled={isLoading}
            className="bg-primary-600 hover:bg-primary-500 shadow-md shadow-primary-500/20"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'সকল তথ্য সংরক্ষণ'}
          </Button>
        </div>
      </div>

      {/* Governance & Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <Link
          to="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>কর্মকর্তা ও পদবী ব্যবস্থাপনা</span>
        </Link>
        <Link
          to="/settings/hostel"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 whitespace-nowrap"
        >
          <Building2 className="w-4 h-4 text-slate-950" />
          <span>হোস্টেল সেটিংস</span>
        </Link>
        <Link
          to="/settings/notices"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>হোস্টেল নোটিশ ও ঘোষণা</span>
        </Link>
        <Link
          to="/settings/tenant-form"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>ভাড়াটিয়া নিবন্ধন ফরম</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
            DMP
          </span>
        </Link>
        <Link
          to="/settings/audit-logs"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>সিস্টেম অডিট ট্রেইল</span>
        </Link>
        {profile?.role === 'SUPER_ADMIN' && (
          <Link
            to="/settings/access-control"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>এক্সেস কন্ট্রোল ও পারমিশন</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
              SuperAdmin
            </span>
          </Link>
        )}
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">হোস্টেল তথ্য ও সেটিংস সফলভাবে সংরক্ষিত হয়েছে!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              মানি রিসিপ্ট ভাউচার, প্রিন্ট কপি, হেডার ও সাইডবারে নতুন তথ্য তাৎক্ষণিক আপডেট হয়েছে।
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub-Section Navigation Tabs (হোস্টেল সেটিংস সেকশন নির্বাচক) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 overflow-x-auto scrollbar-none shadow-md">
        <button
          type="button"
          onClick={() => handleSectionTabClick('menu')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer ${
            activeSection === 'menu'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 shrink-0" />
          <span>🍽️ সাপ্তাহিক খাবারের মেনু রুটিন</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSection === 'menu'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            বোর্ডার মিল
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSectionTabClick('general')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'general'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-indigo-400" />
          <span>সাধারণ তথ্য ও ঠিকানা</span>
        </button>

        <button
          type="button"
          onClick={() => handleSectionTabClick('receipt')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'receipt'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>মানি রিসিপ্ট ভাউচার</span>
        </button>

        <button
          type="button"
          onClick={() => handleSectionTabClick('rules')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'rules'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>হোস্টেল নিয়মাবলী</span>
        </button>

        <button
          type="button"
          onClick={() => handleSectionTabClick('logo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'logo'
              ? 'bg-primary-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>লোগো ও অ্যাপ আইকন</span>
        </button>

        <button
          type="button"
          onClick={() => handleSectionTabClick('all')}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'all'
              ? 'bg-slate-800 text-white shadow'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
          }`}
        >
          <span>সবগুলো সেকশন (All)</span>
        </button>
      </div>

      {/* Featured Quick Jump Banner when in 'all' view */}
      {activeSection === 'all' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>সাপ্তাহিক খাবারের মেনু রুটিন এডিটর</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  নতুন ফিচার
                </span>
              </h4>
              <p className="text-xs text-slate-300">
                বোর্ডারদের ড্যাশবোর্ডে আগামীকালের সকাল, দুপুর ও রাতের খাবারের বিবরণ লাইভ শো করতে চান?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSectionTabClick('menu')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 shrink-0 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>সরাসরি মেনু এডিটরে যান</span>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Inputs (Left) and Live Real-Time Receipt Voucher Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Configuration Form (renders when not in 'logo' mode) */}
          {activeSection !== 'logo' && (
            <form
              onSubmit={handleSaveAllSettings}
              className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-5"
            >
              {/* Section 1: Hostel Identity & Contact Information */}
              {(activeSection === 'all' || activeSection === 'general') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">হোস্টেলের সাধারণ তথ্য ও ঠিকানা</h2>
                      <p className="text-xs text-slate-400">
                        রিসিপ্ট এবং ভাউচারের উপরের অংশে এই তথ্যগুলো প্রদর্শিত হবে
                      </p>
                    </div>
                  </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary-400" />
                  <span>হোস্টেলের পূর্ণ নাম (Organization / Hostel Full Name)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formOrgName}
                  onChange={(e) => setFormOrgName(e.target.value)}
                  placeholder="যেমন: ব্যাচেলর হোম ইআরপি"
                  className="bg-slate-950/60 border-slate-700 text-sm"
                  required
                />
                <span className="text-[11px] text-slate-500 block">
                  এটি সফটওয়্যার হেডার এবং মানি রিসিপ্টের সবচেয়ে বড় শিরোনামে দেখাবে।
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  সংক্ষিপ্ত নাম (Short Name)
                </label>
                <Input
                  type="text"
                  value={formShortName}
                  onChange={(e) => setFormShortName(e.target.value)}
                  placeholder="যেমন: ব্যাচেলর হোম"
                  className="bg-slate-950/60 border-slate-700 text-sm"
                />
                <span className="text-[11px] text-slate-500 block">
                  সাইডবার ও মোবাইল অ্যাপে ব্যবহৃত হবে।
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  স্লোগান / ট্যাগলাইন (Tagline / Slogan)
                </label>
                <Input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="যেমন: স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট"
                  className="bg-slate-950/60 border-slate-700 text-sm"
                />
                <span className="text-[11px] text-slate-500 block">
                  রিসিপ্টের হোস্টেল নামের ঠিক নিচে দেখাবে।
                </span>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>হোস্টেলের পূর্ণ ঠিকানা (Hostel Address)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="হোস্টেলের পূর্ণ ঠিকানা লিখুন (যেমন: বাড়ি #১২, রোড #০৫, এলাকা, শহর)"
                  className="bg-slate-950/60 border-slate-700 text-sm font-medium"
                  required
                />
                <span className="text-[11px] text-amber-400/80 block">
                  ⚠️ রিসিপ্টের উপরে হোস্টেলের নামের নিচে ঠিকানায় এটিই সরাসরি প্রদর্শিত হবে।
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>হটলাইন / মোবাইল নম্বর</span>
                </label>
                <Input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="যেমন: ০১৭৪৪-০০০০০০"
                  className="bg-slate-950/60 border-slate-700 text-sm font-mono"
                />
                <span className="text-[11px] text-slate-500 block">
                  রিসিপ্টে "হটলাইন:" এর পর প্রদর্শিত হবে।
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>বিকল্প / হেল্পলাইন নম্বর</span>
                </label>
                <Input
                  type="text"
                  value={formEmergencyContact}
                  onChange={(e) => setFormEmergencyContact(e.target.value)}
                  placeholder="যেমন: ০১৭১১-০০০০০০"
                  className="bg-slate-950/60 border-slate-700 text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span>অফিসিয়াল ইমেইল (Email)</span>
                </label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="যেমন: info@bachelorhome.com"
                  className="bg-slate-950/60 border-slate-700 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Money Receipt Voucher Configuration */}
        {(activeSection === 'all' || activeSection === 'receipt') && (
          <div
            className={`space-y-4 ${
              activeSection === 'all' ? 'pt-6 border-t border-slate-800' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">মানি রিসিপ্ট ভাউচার ফুটার ও বার্তা</h3>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                ভাউচার ফুটার বার্তা / ভেরিফিকেশন নোট
              </label>
              <Input
                type="text"
                value={formReceiptFooterNote}
                onChange={(e) => setFormReceiptFooterNote(e.target.value)}
                placeholder="যেমন: সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। কোনো সিল বা স্বাক্ষরের প্রয়োজন নেই।"
                className="bg-slate-950/60 border-slate-700 text-sm"
              />
              <span className="text-[11px] text-slate-500 block">
                প্রতিটি প্রিন্ট ভাউচারের নিচের ভেরিফিকেশন অংশে এটি দৃশ্যমান হবে।
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                রিসিপ্ট নাম্বার প্রিফিক্স কোড
              </label>
              <Input
                type="text"
                value={formReceiptPrefix}
                onChange={(e) => setFormReceiptPrefix(e.target.value)}
                placeholder="RCT"
                className="bg-slate-950/60 border-slate-700 text-sm font-mono w-40"
              />
              <span className="text-[11px] text-slate-500 block">
                যেমন: {formReceiptPrefix || 'RCT'}-001004
              </span>
            </div>
          </div>
        )}

        {/* Section 3: আবাসিক নিয়মাবলী (Hostel Rules & Regulations) */}
        {(activeSection === 'all' || activeSection === 'rules') && (
          <div
            className={`space-y-4 ${
              activeSection === 'all' ? 'pt-6 border-t border-slate-800' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                আবাসিক নিয়মাবলী (বোর্ডার পোর্টালে সরাসরি প্রদর্শিত)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              বোর্ডার আইডির হোম ড্যাশবোর্ডের <strong className="text-slate-200">"হোস্টেল সহায়তা ও নিয়মাবলী"</strong> কার্ডে এই নিয়মগুলো লাইভ দৃশ্যমান হবে। প্রতিটি নিয়ম আলাদা লাইনে লিখুন।
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                হোস্টেল আবাসিক নিয়মাবলী তালিকা
              </label>
              <textarea
                rows={6}
                value={formHostelRules}
                onChange={(e) => setFormHostelRules(e.target.value)}
                placeholder="খাবার অন/অফ প্রতিদিন রাত ১০:০০ টার মধ্যে সম্পন্ন করতে হবে।&#10;মাসের ১০ তারিখের মধ্যে মাসিক সিট ভাড়া ও মেস বিল পরিশোধ করতে হবে।&#10;হোস্টেলের মূল গেট রাত ১১:০০ টায় বন্ধ হয়ে যায়।&#10;বহিরাগত মেহমান নিয়ে আসার ক্ষেত্রে পূর্বানুমতি প্রযোজ্য।"
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950/60 border border-slate-700 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-primary-500 font-sans"
              />
              <span className="text-[11px] text-slate-500 block">
                পরামর্শ: বুলেট চিহ্ন (•) দেওয়ার প্রয়োজন নেই, সিস্টেম প্রতিটি লাইনকে স্বয়ংক্রিয়ভাবে বুলেট পয়েন্টে সুন্দর করে সাজিয়ে দেবে।
              </span>
            </div>

            {/* Live Preview of Hostel Rules Card */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Info className="w-3.5 h-3.5" />
                  বোর্ডার পোর্টালে যেভাবে লাইভ প্রদর্শিত হবে:
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Live Preview
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span>আবাসিক নিয়মাবলি:</span>
                </div>
                <ul className="space-y-1.5 list-disc list-inside text-slate-400 text-[11px]">
                  {formHostelRules
                    .split('\n')
                    .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
                    .filter(Boolean)
                    .map((rule, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {rule}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: সাপ্তাহিক খাবারের মেনু রুটিন (Weekly Meal Menu Routine) */}
        {(activeSection === 'all' || activeSection === 'menu') && (
          <div
            id="weekly-food-menu"
            className={`space-y-4 ${
              activeSection === 'all' ? 'pt-6 border-t border-slate-800' : ''
            }`}
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>সাপ্তাহিক খাবারের মেনু রুটিন (Weekly Food Menu)</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      বোর্ডার আইডিতে লাইভ সিঙ্ক
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    সপ্তাহের ৭ দিনের সকালের নাস্তা, দুপুর এবং রাতের খাবারের মেনু নির্ধারণ করুন।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFullWeeklyMenuModal(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>পুরো সপ্তাহের রুটিন</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetMenuToDefault}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="ডিফল্ট পুষ্টিকর মেনু লোড করুন"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ডিফল্ট মেনু</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-relaxed space-y-1.5">
              <div className="flex items-start gap-2.5">
                <ChefHat className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-200">এডমিন নিয়ন্ত্রণ নির্দেশিকা ও সময়সূচি:</p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    আজ <strong className="text-white">{todayDayMeta?.nameBn}</strong>। বর্ডাররা রাত ১০:০০ টা পর্যন্ত আগামীকালের (<strong className="text-amber-300">{tomorrowDayMeta?.nameBn}</strong>) মিল অন/অফ করে, তাই বর্ডার আইডির হোম ড্যাশবোর্ডে আগামীকালের (<strong className="text-amber-300">{tomorrowDayMeta?.nameBn}</strong>) মেনু সক্রিয় থাকে। পুরো সপ্তাহের রুটিন পরিবর্তন করতে নিচের দিনগুলোর ট্যাবে ক্লিক করে প্রতিটি বেলার পুষ্টিকর খাবার সংরক্ষণ করুন।
                  </p>
                </div>
              </div>
            </div>

            {/* 7 Days of the Week Selection Tabs */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>সপ্তাহের দিন নির্বাচন করুন:</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (আজ: <span className="text-white font-medium">{todayDayMeta?.nameBn}</span> | আগামীকাল: <span className="text-amber-400 font-bold">{tomorrowDayMeta?.nameBn}</span>)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-primary-300 font-semibold bg-primary-500/10 px-2.5 py-0.5 rounded-md border border-primary-500/20">
                    এডিট করছেন: {DAY_METADATA[selectedDayTab]?.nameBn}
                  </span>
                  {selectedDayTab !== tomorrowDayKey && (
                    <button
                      type="button"
                      onClick={() => setSelectedDayTab(tomorrowDayKey)}
                      className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      ★ আগামীকাল ({tomorrowDayMeta?.nameBn})-এ যান
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {DAY_ORDER.map((dayKey) => {
                  const meta = DAY_METADATA[dayKey]
                  const isSelected = selectedDayTab === dayKey
                  const isToday = dayKey === todayDayKey
                  const isTomorrow = dayKey === tomorrowDayKey
                  const dayData = formWeeklyMealMenu[dayKey]
                  const hasData = Boolean(dayData?.breakfast || dayData?.lunch || dayData?.dinner)

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedDayTab(dayKey)}
                      className={`p-2 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-0.5 border cursor-pointer relative ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-[1.02]'
                          : isTomorrow
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                          : isToday
                          ? 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
                          : 'bg-slate-950/60 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-xs font-bold">{meta.nameBn}</span>
                      <span
                        className={`text-[9px] font-mono px-1 rounded ${
                          isSelected
                            ? 'bg-slate-950/20 text-slate-950 font-bold'
                            : isTomorrow
                            ? 'bg-amber-500/20 text-amber-300 font-bold'
                            : isToday
                            ? 'bg-slate-800 text-slate-300 font-medium'
                            : hasData
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {isTomorrow ? 'আগামীকাল ★' : isToday ? 'আজ' : hasData ? '✓ মেনু' : 'ফাঁকা'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Day Inputs: Breakfast, Lunch, Dinner */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-slate-800 text-xs gap-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-400" />
                  <span>{DAY_METADATA[selectedDayTab]?.nameBn}-এর খাবার মেনু নির্ধারণ</span>
                  {selectedDayTab === tomorrowDayKey && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ★ বর্ডার ড্যাশবোর্ডে আগামীকালের মেনু হিসেবে শো করবে
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedDayTab !== tomorrowDayKey && (
                    <button
                      type="button"
                      onClick={handleCopyCurrentToTomorrow}
                      className="text-[11px] font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      title="এই মেনু আগামীকালের তালিকায় কপি করুন"
                    >
                      <Copy className="w-3 h-3" />
                      <span>আগামীকালে ({tomorrowDayMeta?.nameBn}) কপি করুন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleApplyToAllDays}
                    className="text-[11px] font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="এই মেনু সব দিনে সেট করুন"
                  >
                    সকল দিনে সেট করুন
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                {/* Breakfast Menu Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <span className="text-base">🍳</span>
                    <span>সকালের নাস্তার মেনু (Breakfast Menu)</span>
                  </label>
                  <Input
                    type="text"
                    value={formWeeklyMealMenu[selectedDayTab]?.breakfast || ''}
                    onChange={(e) =>
                      handleDayMealChange(selectedDayTab, 'breakfast', e.target.value)
                    }
                    placeholder="যেমন: ভুনা খিচুড়ি, ডিম ভাজি, আচার / পরোটা, সবজি"
                    className="bg-slate-900 border-slate-700 text-sm focus:border-amber-500"
                  />
                </div>

                {/* Lunch Menu Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span className="text-base">🍛</span>
                    <span>দুপুরের খাবারের মেনু (Lunch Menu)</span>
                  </label>
                  <Input
                    type="text"
                    value={formWeeklyMealMenu[selectedDayTab]?.lunch || ''}
                    onChange={(e) =>
                      handleDayMealChange(selectedDayTab, 'lunch', e.target.value)
                    }
                    placeholder="যেমন: সাদা ভাত, রুই মাছের ঝোল, আলু ভর্তা, ডাল"
                    className="bg-slate-900 border-slate-700 text-sm focus:border-emerald-500"
                  />
                </div>

                {/* Dinner Menu Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <span className="text-base">🍲</span>
                    <span>রাতের খাবারের মেনু (Dinner Menu)</span>
                  </label>
                  <Input
                    type="text"
                    value={formWeeklyMealMenu[selectedDayTab]?.dinner || ''}
                    onChange={(e) =>
                      handleDayMealChange(selectedDayTab, 'dinner', e.target.value)
                    }
                    placeholder="যেমন: সাদা ভাত, মুরগির মাংস ভুনা, ঘন ডাল"
                    className="bg-slate-900 border-slate-700 text-sm focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <span className="text-xs text-slate-400">
            পরিবর্তন সম্পন্ন হলে নিচের বাটনে ক্লিক করে ডেটাবেজে সংরক্ষণ করুন।
          </span>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="bg-primary-600 hover:bg-primary-500 text-sm px-6 py-2.5 cursor-pointer shadow-lg shadow-primary-600/20"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isLoading
              ? 'সংরক্ষণ হচ্ছে...'
              : activeSection === 'menu'
              ? 'সাপ্তাহিক মেনু সংরক্ষণ করুন'
              : 'সকল হোস্টেল সেটিংস সংরক্ষণ'}
          </Button>
        </div>
      </form>
    )}

    {/* Section 5: Logo & App Branding Upload */}
    {(activeSection === 'all' || activeSection === 'logo') && (
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">হোস্টেল লোগো ও অ্যাপ আইকন</h2>
              <p className="text-xs text-slate-400">রিসিপ্টের বাম পাশে এবং সফটওয়্যার হেডারে এই লোগোটি শো করবে</p>
            </div>
          </div>

          {previewLogo && previewLogo !== DEFAULT_BRANDING.logoUrl && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>রিসেট</span>
            </button>
          )}
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/60 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            {currentActiveLogo ? (
              <img
                src={currentActiveLogo}
                alt="Active Logo"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <Building className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
            নতুন লোগো নির্বাচন করতে এখানে ক্লিক করুন
          </p>
          <p className="text-xs text-slate-500 mt-1">
            PNG, JPG, SVG, WebP (বর্গাকার ছবি সবচেয়ে ভালো দেখায়)
          </p>
        </div>
      </div>
    )}
  </div>

        {/* Right Column: Live Real-Time Preview (Receipt OR Boarder Meal Toggle) (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          {/* Preview Tab Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
              <button
                type="button"
                onClick={() => setRightPanelTab('receipt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rightPanelTab === 'receipt'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>মানি রিসিপ্ট</span>
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('meal_card')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rightPanelTab === 'meal_card'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>বোর্ডার মিল প্রিভিউ</span>
              </button>
            </div>

            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              লাইভ প্রিভিউ
            </span>
          </div>

          {rightPanelTab === 'receipt' ? (
            <>
              <p className="text-xs text-slate-400">
                বামপাশের ফর্মে নাম বা ঠিকানা পরিবর্তন করার সাথে সাথে রিসিপ্টের ওপর রিয়েল-টাইমে আপডেট দেখতে পাবেন:
              </p>

              {/* Styled Paper Receipt Voucher Card mirroring the real modal */}
              <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl space-y-5 animate-in fade-in select-none">
                {/* Receipt Header */}
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow overflow-hidden shrink-0 border border-slate-800">
                      {currentActiveLogo ? (
                        <img src={currentActiveLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                        {formOrgName || 'ব্যাচেলর হোম ইআরপি'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {formTagline || 'স্মার্ট ব্যাচেলর হোস্টেল ও মেস ম্যানেজমেন্ট'}
                      </p>
                      {(formAddress || formPhone) ? (
                        <p className="text-[10px] text-slate-600 font-semibold mt-0.5 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/60 inline-block">
                          {formAddress}
                          {formAddress && formPhone ? ' • ' : ''}
                          {formPhone ? `হটলাইন: ${formPhone}` : ''}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          (ঠিকানা ও হটলাইন এখনো সেট করা হয়নি)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      মানি রিসিপ্ট
                    </span>
                    <p className="text-xs font-mono font-black text-slate-800">
                      {formReceiptPrefix || 'RCT'}-001004
                    </p>
                    <p className="text-[10px] text-slate-500">
                      তারিখ: ২২ অক্টোবর ২০২৬
                    </p>
                  </div>
                </div>

                {/* Boarder & Payment Metadata */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold block text-[10px]">বর্ডার বিবরণী</span>
                    <p className="font-bold text-slate-900 text-xs">অপূর্ব সাহা</p>
                    <p className="font-mono text-slate-600">আইডি: BDR-2026-9803</p>
                    <p className="text-slate-600">মোবাইল: ০১৮৭০৬৩১৯৬৯</p>
                  </div>

                  <div className="space-y-0.5 text-right">
                    <span className="text-slate-400 font-semibold block text-[10px]">পেমেন্ট মাধ্যম ও একাউন্ট</span>
                    <p className="font-bold text-slate-800">নগদ ক্যাশ (Cash)</p>
                    <p className="text-slate-600">হিসাব: Manager Cash Box</p>
                    <p className="text-slate-500">কালেক্টর: ম্যানেজার</p>
                  </div>
                </div>

                {/* Table Mock */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold text-[10px]">
                      <tr>
                        <th className="py-1.5 px-2">ক্রমিক</th>
                        <th className="py-1.5 px-2">চার্জের বিবরণ</th>
                        <th className="py-1.5 px-2 text-right">টাকা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1.5 px-2 text-slate-500 font-mono">১</td>
                        <td className="py-1.5 px-2 font-medium text-slate-800">মাসিক সিট ভাড়া ফি</td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900">৳১,০০০.০০</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                        <td colSpan={2} className="py-2 px-2 text-right text-[11px]">
                          মোট গৃহীত টাকা (Total Paid):
                        </td>
                        <td className="py-2 px-2 text-right text-xs text-emerald-700 font-black">
                          ৳১,০০০.০০
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Verification Stamp Footer */}
                <div className="pt-3 flex items-center justify-between border-t border-slate-200 text-[10px]">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[220px]">
                      {formReceiptFooterNote || 'সফটওয়্যার জেনারেটেড ডিজিটাল ভাউচার। সিগনেচার প্রয়োজন নেই।'}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="w-24 border-b border-dashed border-slate-400 pb-0.5 font-semibold text-slate-700 text-[10px]">
                      ম্যানেজার
                    </div>
                    <span className="text-[9px] text-slate-500 block">আদায়কারীর স্বাক্ষর</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Boarder Dashboard Live Meal Card Preview */
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  বোর্ডার আইডির হোমপেজে মেনু যেভাবে প্রদর্শিত হবে:
                </p>
                {selectedDayTab === tomorrowDayKey ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    বর্ডার ড্যাশবোর্ডে এখনই লাইভ
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {DAY_METADATA[selectedDayTab]?.nameBn}-এর প্রিভিউ
                  </span>
                )}
              </div>

              {selectedDayTab !== tomorrowDayKey && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300/90 leading-relaxed space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-200">
                        বর্ডার ড্যাশবোর্ডে বর্তমানে আগামীকালের ({tomorrowDayMeta?.nameBn}) মেনু সক্রিয়
                      </p>
                      <p className="text-[11px] text-amber-300/80 mt-0.5">
                        বর্ডাররা রাত ১০:০০ টা পর্যন্ত আগামীকালের খাবার নির্ধারণ করে। তাই ড্যাশবোর্ডে আগামীকালের (<strong className="text-white">{tomorrowDayMeta?.nameBn}</strong>) মেনু দৃশ্যমান। আপনি বর্তমানে <strong className="text-white">{DAY_METADATA[selectedDayTab]?.nameBn}</strong>-এর প্রিভিউ দেখছেন।
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => setSelectedDayTab(tomorrowDayKey)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      আগামীকালের ({tomorrowDayMeta?.nameBn}) মেনু দেখুন
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCurrentToTomorrow}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    >
                      এই মেনু আগামীকালে কপি করুন
                    </button>
                  </div>
                </div>
              )}

              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">
                      খাবার দ্রুত নির্ধারণ প্রিভিউ ({DAY_METADATA[selectedDayTab]?.nameBn})
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    পরিবর্তন সক্রিয়
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Breakfast Preview */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🍳</span>
                        <div>
                          <div className="text-xs font-bold text-white">সকালের নাস্তা</div>
                          <div className="text-[10px] text-slate-400">০৭:৩০ − ০৯:০০ (৳২৫.০০)</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 text-slate-950">
                        খাব (ON)
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-start gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                        মেনু
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-snug">
                        {formWeeklyMealMenu[selectedDayTab]?.breakfast || 'মেনু নির্ধারিত হয়নি'}
                      </p>
                    </div>
                  </div>

                  {/* Lunch Preview */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🍛</span>
                        <div>
                          <div className="text-xs font-bold text-white">দুপুরের খাবার</div>
                          <div className="text-[10px] text-slate-400">০১:০০ − ০২:৩০ (৳৬৫.০০)</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-500 text-slate-950">
                        খাব (ON)
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-start gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                        মেনু
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-snug">
                        {formWeeklyMealMenu[selectedDayTab]?.lunch || 'মেনু নির্ধারিত হয়নি'}
                      </p>
                    </div>
                  </div>

                  {/* Dinner Preview */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🍲</span>
                        <div>
                          <div className="text-xs font-bold text-white">রাতের খাবার</div>
                          <div className="text-[10px] text-slate-400">০৮:৩০ − ১০:০০ (৳৬৫.০০)</div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-500 text-white">
                        খাব (ON)
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-start gap-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shrink-0">
                        মেনু
                      </span>
                      <p className="text-xs text-slate-200 font-medium leading-snug">
                        {formWeeklyMealMenu[selectedDayTab]?.dinner || 'মেনু নির্ধারিত হয়নি'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-primary-400 font-semibold">
              <Info className="w-4 h-4" />
              <span>কোথায় কোথায় এই তথ্যগুলো কাজ করবে?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>বর্ডার আইডির হোম ড্যাশবোর্ডে প্রতিদিন রাত ১০:০০ টা পর্যন্ত আগামীকালের খাবার মিল অন/অফের নিচে আগামীকালের মেনু কার্ড শো করবে</li>
              <li>বর্ডার মিল পোর্টালের প্রতি বেলার সিলেকশনের ভেতরে রুটিন অনুযায়ী প্রতিটি দিনের মেনু শো করবে</li>
              <li>বর্ডাররা "সাপ্তাহিক রুটিন" বাটনে ক্লিক করে পুরো সপ্তাহের (শনি থেকে শুক্র) ৭ দিনের তালিকা দেখতে পারবে</li>
              <li>সফটওয়্যারের ভেতর ব্যানার ও মেস নোটিশে সাপ্তাহিক পুষ্টিকর খাবারের তালিকা কার্যকর থাকবে</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Full Weekly Menu Routine Overview Modal */}
      {showFullWeeklyMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    সাপ্তাহিক সামগ্রিক খাবার রুটিন চার্ট (Saturday – Friday)
                  </h3>
                  <p className="text-xs text-slate-400">
                    ৭ দিনের সকাল, দুপুর ও রাতের সামগ্রিক খাবারের শিডিউল
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFullWeeklyMenuModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-300 border-b border-slate-800 text-[11px] font-semibold">
                  <tr>
                    <th className="p-3 w-28">বার / দিন</th>
                    <th className="p-3 text-amber-300">🍳 সকালের নাস্তা</th>
                    <th className="p-3 text-emerald-300">🍛 দুপুরের খাবার</th>
                    <th className="p-3 text-indigo-300">🍲 রাতের খাবার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                  {DAY_ORDER.map((dayKey) => {
                    const meta = DAY_METADATA[dayKey]
                    const menu = formWeeklyMealMenu[dayKey]
                    const isSelected = selectedDayTab === dayKey

                    return (
                      <tr
                        key={dayKey}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{meta.nameBn}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {menu?.breakfast || (
                            <span className="text-slate-600 italic">নির্ধারিত হয়নি</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {menu?.lunch || (
                            <span className="text-slate-600 italic">নির্ধারিত হয়নি</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 font-medium">
                          {menu?.dinner || (
                            <span className="text-slate-600 italic">নির্ধারিত হয়নি</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                মেনু সম্পাদনা করতে মডাল বন্ধ করে সংশ্লিষ্ট দিনে ক্লিক করুন।
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowFullWeeklyMenuModal(false)}
                className="bg-primary-600 hover:bg-primary-500 text-xs px-5 py-2"
              >
                ঠিক আছে (বন্ধ করুন)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HostelSettingsPage

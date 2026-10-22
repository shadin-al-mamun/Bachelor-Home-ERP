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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBrandingStore, DEFAULT_BRANDING } from '@/app/store/useBrandingStore'
import { useAuthStore } from '@/app/store/useAuthStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

export const HostelSettingsPage: React.FC = () => {
  const { profile } = useAuthStore()
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
    updateBranding,
    uploadCustomLogo,
    resetToDefault,
    initializeBranding,
    isLoading,
  } = useBrandingStore()

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
    logoUrl,
  ])

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
        logoUrl: previewLogo,
        appIconUrl: previewLogo,
        faviconUrl: previewLogo,
      })
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

      {/* Main Grid: Form Inputs (Left) and Live Real-Time Receipt Voucher Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration Forms (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Hostel Identity & Contact Information */}
          <form
            onSubmit={handleSaveAllSettings}
            className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">হোস্টেলের সাধারণ তথ্য ও ঠিকানা</h2>
                <p className="text-xs text-slate-400">রিসিপ্ট এবং ভাউচারের উপরের অংশে এই তথ্যগুলো প্রদর্শিত হবে</p>
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

            {/* Section 2: Money Receipt Voucher Configuration */}
            <div className="pt-4 border-t border-slate-800 space-y-4">
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

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="bg-primary-600 hover:bg-primary-500 text-sm px-6 py-2.5"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'হোস্টেল তথ্য সংরক্ষণ করুন'}
              </Button>
            </div>
          </form>

          {/* Section 3: Logo & App Branding Upload */}
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
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
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
        </div>

        {/* Right Column: Live Real-Time Receipt Voucher Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">লাইভ মানি রিসিপ্ট ভাউচার প্রিভিউ</h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              রিয়েলটাইম সিঙ্ক
            </span>
          </div>

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

          {/* Info Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-primary-400 font-semibold">
              <Info className="w-4 h-4" />
              <span>কোথায় কোথায় এই তথ্যগুলো কাজ করবে?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>অফিসিয়াল মানি রিসিপ্ট প্রিন্ট ও ডাউনলোড ভাউচার</li>
              <li>সফটওয়্যারের হেডার ব্র্যান্ডিং ও মোবাইল ড্রয়ার টাইটেল</li>
              <li>বোর্ডার পোর্টালে সাপোর্ট হটলাইন ও যোগাযোগ তথ্য</li>
              <li>মান্থলি বিলিং ও অডিট শিটের হেডার</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HostelSettingsPage

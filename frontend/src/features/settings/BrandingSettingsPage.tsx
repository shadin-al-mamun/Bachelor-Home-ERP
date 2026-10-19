import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  Layout,
  Globe,
  Trash2,
  Info,
  Layers,
  ArrowLeft,
  Building,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBrandingStore, DEFAULT_BRANDING } from '@/app/store/useBrandingStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'

export const BrandingSettingsPage: React.FC = () => {
  const {
    orgName,
    shortName,
    tagline,
    logoUrl,
    updateBranding,
    uploadCustomLogo,
    resetToDefault,
    initializeBranding,
    isLoading,
  } = useBrandingStore()

  const [formOrgName, setFormOrgName] = useState(orgName)
  const [formShortName, setFormShortName] = useState(shortName)
  const [formTagline, setFormTagline] = useState(tagline)
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
    setPreviewLogo(logoUrl)
  }, [orgName, shortName, tagline, logoUrl])

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

  const handleSaveTextSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    try {
      await updateBranding({
        orgName: formOrgName.trim() || DEFAULT_BRANDING.orgName,
        shortName: formShortName.trim() || DEFAULT_BRANDING.shortName,
        tagline: formTagline.trim() || DEFAULT_BRANDING.tagline,
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
    if (window.confirm('আপনি কি ডিফল্ট ব্যাচেলর হোম লোগো ও ব্র্যান্ডিংয়ে ফিরে যেতে চান?')) {
      await resetToDefault()
      setPreviewLogo(DEFAULT_BRANDING.logoUrl)
      setFormOrgName(DEFAULT_BRANDING.orgName)
      setFormShortName(DEFAULT_BRANDING.shortName)
      setFormTagline(DEFAULT_BRANDING.tagline)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  const currentActiveLogo: string = previewLogo || DEFAULT_BRANDING.logoUrl || '/pwa-512x512.svg'

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
          <div className="flex items-center gap-2 text-xs text-primary-400 font-semibold tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4" />
            সিস্টেম ব্র্যান্ডিং ও আইকন কন্ট্রোল
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            হোস্টেল লোগো ও মোবাইল অ্যাপ ব্র্যান্ডিং
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            আপনার হোস্টেলের নিজস্ব লোগো আপলোড করুন। এটি স্বয়ংক্রিয়ভাবে সফটওয়্যারের হেডার, সাইডবার, ব্রাউজার ট্যাব এবং মোবাইলের হোমস্ক্রিন অ্যাপ আইকন হিসেবে প্রদর্শিত হবে।
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
            ডিফল্ট লোগোতে ফিরুন
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">ব্র্যান্ডিং ও লোগো সফলভাবে সংরক্ষিত হয়েছে!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              সফটওয়্যার হেডার, সাইডবার এবং ব্রাউজার আইকন স্বয়ংক্রিয়ভাবে আপডেট হয়ে গেছে।
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Logo Upload & Name Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* Logo Upload Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">হোস্টেল লোগো আপলোড</h2>
                  <p className="text-xs text-slate-400">পিএনজি, জেপিজি, এসভিজি বা ওয়েবপি ফরম্যাট (সর্বোচ্চ ৫ মেগাবাইট)</p>
                </div>
              </div>

              {previewLogo && previewLogo !== DEFAULT_BRANDING.logoUrl && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>মুছে ফেলুন</span>
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
                  <ImageIcon className="w-8 h-8 text-slate-500" />
                )}
              </div>

              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm group-hover:text-indigo-300">
                <Upload className="w-4 h-4" />
                <span>নতুন লোগো ছবি নির্বাচন করুন</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">এখানে ক্লিক করে আপনার কম্পিউটার বা মোবাইল থেকে লোগো সিলেক্ট করুন</p>
            </div>
          </div>

          {/* Name & Title Configuration Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">অ্যাপ ও হোমস্ক্রিন নাম কনফিগারেশন</h2>
                <p className="text-xs text-slate-400">মোবাইলে আইকনের নিচে কী নাম শো করবে তা নির্ধারণ করুন</p>
              </div>
            </div>

            <form onSubmit={handleSaveTextSettings} className="space-y-4">
              <div>
                <Input
                  label="হোস্টেল / প্রতিষ্ঠানের পূর্ণ নাম"
                  value={formOrgName}
                  onChange={(e) => setFormOrgName(e.target.value)}
                  placeholder="যেমন: Bachelor Home ERP"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  সফটওয়্যারের শিরোনাম, লগইন স্ক্রিন ও চালানে এই পূর্ণ নামটি প্রদর্শিত হবে।
                </p>
              </div>

              <div>
                <Input
                  label="মোবাইল আইকনের নিচের নাম (Short Name)"
                  value={formShortName}
                  onChange={(e) => setFormShortName(e.target.value)}
                  placeholder="যেমন: Bachelor Home"
                  required
                />
                <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>মোবাইলে ইনস্টল করার পর অ্যাপ আইকনের ঠিক নিচে এই নামটি শো করবে (যেমন: <strong>Bachelor Home</strong>)।</span>
                </p>
              </div>

              <div>
                <Input
                  label="স্লোগান বা ট্যাগলাইন"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="যেমন: স্মার্ট হোস্টেল ও মেস ম্যানেজমেন্ট ERP"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="primary" type="submit" isLoading={isLoading}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ব্র্যান্ডিং ও সেটিংস সংরক্ষণ করুন
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Mockup Previews */}
        <div className="lg:col-span-5 space-y-6">
          {/* Mobile Home Screen Preview */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-bold text-white">মোবাইল হোমস্ক্রিন প্রিভিউ</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                PWA Live Mockup
              </span>
            </div>

            {/* Phone Screen Mockup Frame */}
            <div className="relative rounded-[32px] border-4 border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/80 p-5 shadow-2xl overflow-hidden min-h-[380px] flex flex-col justify-between">
              {/* Dynamic Island / Speaker notch */}
              <div className="mx-auto w-24 h-4 bg-slate-900 rounded-full border border-slate-800 shadow-inner flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-2" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium px-2 pt-1">
                <span>10:24</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">5G</span>
                  <div className="w-4 h-2 border border-slate-300 rounded-[2px] p-[1px]">
                    <div className="w-full h-full bg-slate-200 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* App Icons Grid */}
              <div className="py-6 grid grid-cols-3 gap-y-6 place-items-center">
                {/* Dummy app 1 */}
                <div className="flex flex-col items-center gap-1 opacity-60">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                    <Globe className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] text-slate-300">Chrome</span>
                </div>

                {/* TARGET APP: Bachelor Home */}
                <div className="flex flex-col items-center gap-1.5 group cursor-pointer animate-in zoom-in-95">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-[18px] bg-slate-900 p-1 border-2 border-primary-500/80 shadow-xl shadow-primary-500/30 flex items-center justify-center overflow-hidden transition-transform transform hover:scale-105">
                      <img
                        src={currentActiveLogo}
                        alt="Bachelor Home Icon"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                    {/* Notification badge simulation */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950">
                      1
                    </span>
                  </div>
                  {/* LABEL BELOW ICON: The exact text the user requested */}
                  <span className="text-xs font-bold text-white tracking-wide text-center drop-shadow-md">
                    {formShortName || 'Bachelor Home'}
                  </span>
                </div>

                {/* Dummy app 2 */}
                <div className="flex flex-col items-center gap-1 opacity-60">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
                    <Building className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] text-slate-300">Dormefy</span>
                </div>
              </div>

              {/* Bottom Dock simulation */}
              <div className="mt-auto bg-slate-900/60 backdrop-blur-md rounded-2xl p-2 border border-slate-800 flex items-center justify-around">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Software Navbar Preview */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Layout className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">হেডার ও সাইডবারে কেমন দেখাবে</h3>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={currentActiveLogo}
                  alt="Navbar Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-sm text-white block">
                  {formOrgName || 'Bachelor Home'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Asia/Dhaka ERP</span>
              </div>
            </div>
          </div>

          {/* PWA Refresh Guide Card */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>মোবাইলে নতুন লোগো ও নাম আপডেট করার নিয়ম:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li>লোগো পরিবর্তন করার পর ব্রাউজারে একবার <strong>Hard Refresh</strong> দিন।</li>
              <li>মোবাইলে পূর্বের আইকন থাকলে সেটি হোমস্ক্রিন থেকে রিমুভ করে ব্রাউজার থেকে আবার <strong>"Add to Home screen"</strong> বা <strong>"Install App"</strong> করুন।</li>
              <li>এখন আপনার আপলোডকৃত লোগো এবং নিচে <strong>Bachelor Home</strong> নাম স্বয়ংক্রিয়ভাবে দেখাবে।</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandingSettingsPage

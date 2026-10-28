import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Users,
  Building2,
  Megaphone,
  ShieldAlert,
  KeyRound,
  Download,
  Printer,
  CheckCircle2,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
  Loader2,
  UserCheck,
  ShieldCheck,
  Info,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useBrandingStore } from '@/app/store/useBrandingStore'
import { useBoarders, type BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import Button from '@/components/common/Button'
import TenantPoliceForm, {
  type FlatAddressInfo,
  type FormMetaInfo,
} from './components/TenantPoliceForm'
import SelectBoarderModal from './components/SelectBoarderModal'
import {
  resolveRoommatesForBoarder,
  resolveFlatInfoForBoarder,
} from './utils/tenantFormHelpers'
import {
  downloadTenantFormPDF,
  downloadTenantFormJPG,
  printTenantForm,
} from './utils/tenantFormPdfGenerator'

export const TenantRegistrationFormPage: React.FC = () => {
  const { profile } = useAuthStore()
  const { address: brandingAddress } = useBrandingStore()

  // Query all boarders
  const { data: boarders = [], isLoading } = useBoarders()

  // Currently selected boarder
  const [selectedBoarderId, setSelectedBoarderId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)
  const [downloadFeedbackMsg, setDownloadFeedbackMsg] = useState('ভাড়াটিয়া নিবন্ধন ফরম সফলভাবে ডাউনলোড হয়েছে!')
  const [zoomScale, setZoomScale] = useState<number>(100)
  const [isCustomizing, setIsCustomizing] = useState(false)

  // Auto-select first active boarder if available
  useEffect(() => {
    if (!selectedBoarderId && boarders.length > 0) {
      const firstActive = boarders.find((b) => b.status === 'ACTIVE') || boarders[0]
      setSelectedBoarderId(firstActive.id)
    }
  }, [boarders, selectedBoarderId])

  const selectedBoarder = useMemo(() => {
    return boarders.find((b) => b.id === selectedBoarderId) || (boarders[0] ?? null)
  }, [boarders, selectedBoarderId])

  // Custom metadata overrides
  const [customFlatFloor, setCustomFlatFloor] = useState('')
  const [customHouseHolding, setCustomHouseHolding] = useState('')
  const [customRoad, setCustomRoad] = useState('')
  const [customArea, setCustomArea] = useState('')
  const [customPostCode, setCustomPostCode] = useState('')
  const [customLandlordName, setCustomLandlordName] = useState('')
  const [customLandlordPhone, setCustomLandlordPhone] = useState('')

  // Sync defaults when selected boarder changes
  useEffect(() => {
    if (selectedBoarder) {
      const defaultFlat = resolveFlatInfoForBoarder(selectedBoarder, brandingAddress)
      setCustomFlatFloor(defaultFlat.flatFloor)
      setCustomHouseHolding(defaultFlat.houseHolding)
      setCustomRoad(defaultFlat.road)
      setCustomArea(defaultFlat.area)
      setCustomPostCode(defaultFlat.postCode)
      setCustomLandlordName('মোঃ আব্দুস সাত্তার')
      setCustomLandlordPhone('01718246365')
    }
  }, [selectedBoarder, brandingAddress])

  // Roommates for item 11 (roommates in the same room, or other rooms in the flat)
  const roommates = useMemo(() => {
    return resolveRoommatesForBoarder(selectedBoarder, boarders)
  }, [selectedBoarder, boarders])

  const flatInfo: FlatAddressInfo = useMemo(() => {
    return {
      flatFloor: customFlatFloor,
      houseHolding: customHouseHolding,
      road: customRoad,
      area: customArea,
      postCode: customPostCode,
    }
  }, [customFlatFloor, customHouseHolding, customRoad, customArea, customPostCode])

  const meta: FormMetaInfo = useMemo(() => {
    return {
      division: 'ঢাকা', // Fixed as required
      thana: 'শেরে বাংলা নগর', // Fixed as required
      allotmentDate:
        selectedBoarder?.active_allocation?.start_date ||
        selectedBoarder?.admission_date ||
        new Date().toISOString().split('T')[0],
      landlordName: customLandlordName || 'মোঃ আব্দুস সাত্তার',
      landlordPhone: customLandlordPhone || '01718246365',
      issueDate: new Date().toISOString().split('T')[0],
    }
  }, [selectedBoarder, customLandlordName, customLandlordPhone])

  // PDF Download Handler
  const handleDownloadPdf = async (boarderToDownload: BoarderWithRelations | null = selectedBoarder) => {
    if (!boarderToDownload) return
    setIsDownloading(true)
    setDownloadSuccess(false)

    try {
      const safeCode = (boarderToDownload.boarder_code || 'BDR').replace(/[^a-zA-Z0-9_-]/g, '_')
      const safeName = (boarderToDownload.full_name || 'Boarder').replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')
      const filename = `Tenant_Registration_Form_${safeCode}_${safeName}.pdf`

      const success = await downloadTenantFormPDF('tenant-police-form-print', filename)
      if (success) {
        setDownloadFeedbackMsg('ভাড়াটিয়া নিবন্ধন ফরম (PDF ফাইল) সফলভাবে ডাউনলোড হয়েছে!')
        setDownloadSuccess(true)
        setTimeout(() => setDownloadSuccess(false), 5000)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  // JPG Image Download Handler
  const handleDownloadJpg = async (boarderToDownload: BoarderWithRelations | null = selectedBoarder) => {
    if (!boarderToDownload) return
    setIsDownloading(true)
    setDownloadSuccess(false)

    try {
      const safeCode = (boarderToDownload.boarder_code || 'BDR').replace(/[^a-zA-Z0-9_-]/g, '_')
      const safeName = (boarderToDownload.full_name || 'Boarder').replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_')
      const filename = `Tenant_Registration_Form_${safeCode}_${safeName}.jpg`

      const success = await downloadTenantFormJPG('tenant-police-form-print', filename)
      if (success) {
        setDownloadFeedbackMsg('ভাড়াটিয়া নিবন্ধন ফরম (JPG ছবি) সফলভাবে ডাউনলোড হয়েছে!')
        setDownloadSuccess(true)
        setTimeout(() => setDownloadSuccess(false), 5000)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  // Print Handler
  const handlePrint = () => {
    printTenantForm('tenant-police-form-print')
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/settings/hostel"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>হোস্টেল সেটিংস</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            ঢাকা মেট্রোপলিটন পুলিশ (DMP) ভেরিফিকেশন
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            ভাড়াটিয়া নিবন্ধন ফরম
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            ঢাকা মেট্রোপলিটন পুলিশের (DMP) অফিসিয়াল ফরম্যাট অনুযায়ী যেকোনো বোর্ডারের তথ্য দিয়ে পুলিশ ভেরিফিকেশন ও ভাড়াটিয়া তথ্য ফরম স্বয়ংক্রিয়ভাবে ডাউনলোড ও প্রিন্ট করুন।
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Users className="w-4 h-4 mr-1.5 text-primary-400" />
            বর্ডার নির্বাচন পপআপ
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={!selectedBoarder}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-300" />
            প্রিন্ট করুন
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadJpg()}
            disabled={!selectedBoarder || isDownloading}
            className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 font-medium"
          >
            <ImageIcon className="w-4 h-4 mr-1.5 text-emerald-400" />
            জেপিজি ডাউনলোড
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleDownloadPdf()}
            disabled={!selectedBoarder || isDownloading}
            className="bg-gradient-to-r from-cyan-600 to-primary-600 hover:from-cyan-500 hover:to-primary-500 text-white shadow-lg shadow-cyan-600/25 font-bold px-4"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ডাউনলোড হচ্ছে...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-1.5" />
                ভাড়াটিয়া ফরম ডাউনলোড করুন
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Top Settings Navigation Tabs */}
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
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Building2 className="w-4 h-4 text-amber-400" />
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
        {/* Active New Tab */}
        <div className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 flex items-center gap-2 whitespace-nowrap">
          <FileText className="w-4 h-4 text-slate-950" />
          <span>ভাড়াটিয়া নিবন্ধন ফরম</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-950 text-cyan-300 font-bold uppercase">
            DMP
          </span>
        </div>
      </div>

      {/* Notifications */}
      {downloadSuccess && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{downloadFeedbackMsg}</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              নির্বাচিত বর্ডারের ছবি, ফ্ল্যাট ও রুমমেটদের বিবরণসহ অফিশিয়াল এ৪ ফরম্যাট সংরক্ষণ করা হয়েছে।
            </p>
          </div>
        </div>
      )}

      {/* Toolbar & Selector Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Left: Quick Dropdown Picker */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 min-w-0">
          <label className="text-xs font-semibold text-slate-300 whitespace-nowrap flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-primary-400" />
            বোর্ডার নির্বাচন করুন:
          </label>
          <div className="relative flex-1 w-full max-w-md">
            <select
              value={selectedBoarderId}
              onChange={(e) => setSelectedBoarderId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/40 appearance-none font-medium"
            >
              {boarders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name} ({b.boarder_code}) — {b.active_allocation?.seat?.seat_name || (b.status === 'ACTIVE' ? 'সিট বরাদ্দ' : 'আবেদনকারী')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="border-slate-700 text-primary-400 hover:bg-slate-800 whitespace-nowrap"
          >
            পপআপ লিস্টে খুঁজুন
          </Button>
        </div>

        {/* Right: Zoom & Customize Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`border text-xs ${
              isCustomizing
                ? 'bg-slate-800 border-primary-500/40 text-primary-300'
                : 'border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            {isCustomizing ? 'কাস্টমাইজ লুকান' : 'ঠিকানা কাস্টমাইজ'}
          </Button>

          {/* Scale Controller */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setZoomScale(75)}
              className={`px-2.5 py-1 rounded-lg ${
                zoomScale === 75 ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              ৭৫%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(100)}
              className={`px-2.5 py-1 rounded-lg ${
                zoomScale === 100 ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
              }`}
            >
              ১০০%
            </button>
          </div>
        </div>
      </div>

      {/* Address Customization Drawer / Box */}
      {isCustomizing && (
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              ফরমে প্রদর্শিত তথ্য কাস্টমাইজ করুন (ডানপাশের ফ্ল্যাট বক্স ও বাড়িওয়ালা)
            </h3>
            <span className="text-[11px] text-slate-400">পরিবর্তন ফরম প্রিভিউতে তাৎক্ষণিক দেখাবে</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">ফ্ল্যাট/তলা :</label>
              <input
                type="text"
                value={customFlatFloor}
                onChange={(e) => setCustomFlatFloor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">বাড়ী/হোল্ডিং :</label>
              <input
                type="text"
                value={customHouseHolding}
                onChange={(e) => setCustomHouseHolding(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">রাস্তা :</label>
              <input
                type="text"
                value={customRoad}
                onChange={(e) => setCustomRoad(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">এলাকা :</label>
              <input
                type="text"
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">পোস্ট কোড :</label>
              <input
                type="text"
                value={customPostCode}
                onChange={(e) => setCustomPostCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/60">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">১৬. বর্তমান বাড়িওয়ালার নাম :</label>
              <input
                type="text"
                value={customLandlordName}
                onChange={(e) => setCustomLandlordName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">১৬. বাড়িওয়ালার মোবাইল নম্বর :</label>
              <input
                type="text"
                value={customLandlordPhone}
                onChange={(e) => setCustomLandlordPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Notice Card */}
      <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs flex items-center justify-between gap-3 text-cyan-300">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong>সরাসরি এ৪ ফরম্যাট:</strong> ফরমের উপরে বিভাগ ‘ঢাকা’ ও থানা ‘শেরে বাংলা নগর’ ফিক্সড করা হয়েছে। ক্রমিক ১-৮ ও ১০ বর্ডারের আবেদন ও প্রোফাইল থেকে এবং ১১ নং এ সংশ্লিষ্ট রুম বা ফ্ল্যাটের অন্যান্য বর্ডারদের তালিকা বসেছে। ১৭ নং এ সিট বরাদ্দের তারিখ যুক্ত রয়েছে।
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDownloadJpg()}
            disabled={!selectedBoarder || isDownloading}
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs py-1"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            জেপিজি
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleDownloadPdf()}
            disabled={!selectedBoarder || isDownloading}
            className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-xs py-1"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            পিডিএফ
          </Button>
        </div>
      </div>

      {/* Live Form View Container */}
      <div className="flex justify-center items-start overflow-x-auto py-6 px-2 bg-slate-950/60 rounded-3xl border border-slate-800/90 shadow-inner">
        <div
          style={{
            transform: zoomScale === 75 ? 'scale(0.85)' : 'scale(1)',
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
          className="w-full flex justify-center"
        >
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              <span>বোর্ডারের তথ্য লোড হচ্ছে...</span>
            </div>
          ) : selectedBoarder ? (
            <TenantPoliceForm
              boarder={selectedBoarder}
              roommates={roommates}
              flatInfo={flatInfo}
              meta={meta}
              containerId="tenant-police-form-print"
            />
          ) : (
            <div className="text-center py-20 text-slate-400">
              কোনো বোর্ডার পাওয়া যায়নি। দয়া করে প্রথমে একজন বোর্ডার নিবন্ধন করুন।
            </div>
          )}
        </div>
      </div>

      {/* Select Boarder Popup Modal */}
      <SelectBoarderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        boarders={boarders}
        selectedBoarder={selectedBoarder}
        onSelectBoarder={(b) => setSelectedBoarderId(b.id)}
        onDownloadPdf={async (b) => {
          setSelectedBoarderId(b.id)
          // Wait a tick for DOM to update with selected boarder then download
          setTimeout(async () => {
            await handleDownloadPdf(b)
          }, 100)
        }}
        onDownloadJpg={async (b) => {
          setSelectedBoarderId(b.id)
          setTimeout(async () => {
            await handleDownloadJpg(b)
          }, 100)
        }}
        onPrint={handlePrint}
        isDownloading={isDownloading}
      />
    </div>
  )
}

export default TenantRegistrationFormPage

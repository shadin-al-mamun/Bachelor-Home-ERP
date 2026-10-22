import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useBoarder, getDocumentSignedUrl } from './api/useBoarders'
import ApplicantReviewModal from './components/ApplicantReviewModal'
import EditBoarderModal from './components/EditBoarderModal'
import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import { formatDateBn, formatCurrencyBn } from '@/utils/date'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  GraduationCap,
  MapPin,
  Calendar,
  BedDouble,
  FileText,
  CreditCard,
  Utensils,
  History,
  ShieldCheck,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Receipt,
  Clock,
  SlidersHorizontal,
} from 'lucide-react'
import { StaffMealControlModal } from '@/features/meals/components/StaffMealControlModal'
import { useAuthStore } from '@/app/store/useAuthStore'
import { isMealManagerRole } from '@/features/meals/api/useMeals'

export const BoarderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { data: boarder, isLoading, error } = useBoarder(id)
  const { profile } = useAuthStore()
  const canManageMeals = isMealManagerRole(profile?.role)
  const [activeTab, setActiveTab] = useState<'bio' | 'seat' | 'ledger' | 'meals'>('bio')
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isMealControlOpen, setIsMealControlOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  useEffect(() => {
    if (boarder?.nid_document_url) {
      setIsLoadingDoc(true)
      getDocumentSignedUrl(boarder.nid_document_url)
        .then((url) => setDocUrl(url))
        .catch(() => setDocUrl(null))
        .finally(() => setIsLoadingDoc(false))
    }
  }, [boarder?.nid_document_url])

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>বর্ডার প্রোফাইল বিস্তারিত লোড হচ্ছে...</span>
      </div>
    )
  }

  if (error || !boarder) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="glass-card p-8 rounded-2xl border border-rose-500/20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">বর্ডার প্রোফাইল পাওয়া যায়নি</h2>
          <p className="text-slate-400 text-sm">অনুরোধকৃত বর্ডারের তথ্য সিস্টেমে বিদ্যমান নেই।</p>
          <Link to="/boarders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              বর্ডার তালিকায় ফিরে যান
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const alloc = boarder.active_allocation

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Link */}
      <div>
        <Link
          to="/boarders"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          বর্ডার ডিরেক্টরিতে ফিরে যান
        </Link>
      </div>

      {/* Main Profile Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {boarder.photo_url ? (
              <img
                src={boarder.photo_url}
                alt={boarder.full_name}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-primary-500/40 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 ring-2 ring-slate-700">
                <User className="w-12 h-12" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 rounded-full border border-slate-700">
              <span className={`w-3 h-3 rounded-full block ${boarder.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {boarder.full_name}
              </h1>
              <span className="font-mono text-xs bg-primary-500/10 text-primary-400 border border-primary-500/20 px-2.5 py-1 rounded-lg">
                {boarder.boarder_code}
              </span>
              {boarder.status === 'ACTIVE' && <Badge status="ACTIVE">সক্রিয় বর্ডার</Badge>}
              {boarder.status === 'PENDING' && <Badge status="PENDING">অনুমোদন অপেক্ষমান</Badge>}
              {boarder.status === 'LEFT' && <Badge status="INACTIVE">হোস্টেল ত্যাগ করেছেন</Badge>}
              {boarder.status === 'REJECTED' && <Badge status="REJECTED">আবেদন বাতিল</Badge>}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <a href={`tel:${boarder.phone_number}`} className="hover:text-primary-400">
                  {boarder.phone_number}
                </a>
              </span>
              {boarder.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <a href={`mailto:${boarder.email}`} className="hover:text-primary-400">
                    {boarder.email}
                  </a>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                ভর্তি: {formatDateBn(boarder.admission_date)}
              </span>
              {alloc && (
                <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                  <BedDouble className="w-3.5 h-3.5" />
                  সিট: {alloc.seat?.seat_code} ({alloc.seat?.room?.name})
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'MANAGER' || !profile?.role) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs shadow-md shadow-indigo-600/20"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                প্রোফাইল সম্পাদন (Edit)
              </Button>
            )}
            {boarder.status === 'PENDING' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsReviewModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-500 text-xs"
              >
                <ShieldAlert className="w-4 h-4 mr-1.5" />
                আবেদন রিভিউ করুন
              </Button>
            )}
            <a href={`tel:${boarder.guardian_phone}`}>
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 text-xs">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                অভিভাবককে কল দিন
              </Button>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800 pt-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('bio')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'bio'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <User className="w-4 h-4" />
            বায়ো ও নথিপত্র
          </button>
          <button
            onClick={() => setActiveTab('seat')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'seat'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BedDouble className="w-4 h-4" />
            সিট ও ইতিহাস
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'ledger'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            ভাড়া ও বকেয়া লেজার
            {Number(boarder.total_due || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                ৳{boarder.total_due}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('meals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'meals'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Utensils className="w-4 h-4" />
            মিল রেকর্ডস
          </button>
        </div>
      </div>

      {/* Tab 1: Bio & Documents */}
      {activeTab === 'bio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Academic & Professional Info */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary-400" />
                শিক্ষাগত বা কর্মসংস্থান বিবরণ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">শিক্ষা প্রতিষ্ঠান / কোম্পানি</span>
                  <span className="text-white font-medium text-sm">{boarder.institution || 'তথ্য নেই'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">বিভাগ / পদবী</span>
                  <span className="text-white font-medium text-sm">{boarder.department || 'তথ্য নেই'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">শিক্ষার্থী / কর্মচারী আইডি</span>
                  <span className="text-white font-mono font-medium">{boarder.student_id || 'তথ্য নেই'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">শিক্ষাবর্ষ / সেশন</span>
                  <span className="text-white font-medium">{boarder.session || 'তথ্য নেই'}</span>
                </div>
              </div>
            </div>

            {/* Guardian & Emergency Contacts */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" />
                অভিভাবক ও জরুরি যোগাযোগের তথ্য
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">অভিভাবকের পূর্ণ নাম</span>
                  <span className="text-white font-medium text-sm">{boarder.guardian_name}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">সম্পর্ক</span>
                  <span className="text-white font-medium">{boarder.guardian_relation || 'অভিভাবক'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">অভিভাবকের মোবাইল</span>
                  <a
                    href={`tel:${boarder.guardian_phone}`}
                    className="text-primary-400 font-medium hover:underline inline-flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {boarder.guardian_phone}
                  </a>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-0.5">জরুরি যোগাযোগের নম্বর</span>
                  <span className="text-white font-medium">{boarder.emergency_contact || 'উল্লেখ নেই'}</span>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                ঠিকানার বিবরণ
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-1">স্থায়ী ঠিকানা</span>
                  <span className="text-slate-200 font-medium leading-relaxed">{boarder.permanent_address}</span>
                </div>
                {boarder.present_address && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-500 block mb-1">বর্তমান ঠিকানা</span>
                    <span className="text-slate-200 leading-relaxed">{boarder.present_address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Preview Column */}
          <div className="space-y-6">
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  এনআইডি / পাসপোর্ট কপি
                </h3>
                {docUrl && (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-400 hover:underline flex items-center gap-1"
                  >
                    বড় করে দেখুন <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {boarder.nid_passport_number && (
                <div className="text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block">NID / পাসপোর্ট নম্বর</span>
                  <span className="text-white font-mono font-bold text-sm tracking-wide">
                    {boarder.nid_passport_number}
                  </span>
                </div>
              )}

              <div className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  সুরক্ষিত স্টোরেজ: গোপনীয় নথিপত্র শুধুমাত্র অনুমোদিত অ্যাডমিন ও ম্যানেজার দেখতে পারেন।
                </span>
              </div>

              {/* Document Image */}
              <div className="relative min-h-[220px] max-h-[340px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
                {isLoadingDoc ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span>ডকুমেন্ট লোড হচ্ছে...</span>
                  </div>
                ) : docUrl ? (
                  <img
                    src={docUrl}
                    alt="Boarder Document"
                    className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-center p-6 text-slate-500 text-xs space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p>কোনো ডিজিটাল ডকুমেন্ট সংযুক্ত নেই।</p>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks Card */}
            {boarder.remarks && (
              <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300">
                <span className="text-slate-500 block mb-1">অ্যাডমিন নোট / মন্তব্য:</span>
                <p className="italic text-slate-300">{boarder.remarks}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Seat Allocation & History */}
      {activeTab === 'seat' && (
        <div className="space-y-6">
          {/* Active Allocation Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <BedDouble className="w-4 h-4 text-indigo-400" />
              বর্তমান বরাদ্দকৃত সিটের তথ্য
            </h3>

            {alloc && alloc.seat ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-indigo-400 block mb-1">সিট কোড ও নাম</span>
                  <span className="text-lg font-bold text-white block">{alloc.seat.seat_code}</span>
                  <span className="text-slate-400 text-[11px]">{alloc.seat.seat_name}</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-1">বিল্ডিং ও ফ্ল্যাট</span>
                  <span className="text-white font-medium text-sm block">
                    {alloc.seat.room?.flat?.name || 'ফ্ল্যাট ৪এ'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {alloc.seat.room?.name} • {alloc.seat.room?.flat?.building?.name || 'সানফ্লাওয়ার হোস্টেল'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-1">মাসিক সিট ভাড়া</span>
                  <span className="text-lg font-bold text-emerald-400 block">
                    {formatCurrencyBn(alloc.monthly_rent)}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    সিকিউরিটি ডিপোজিট: {formatCurrencyBn(alloc.security_deposit)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-500 block mb-1">বরাদ্দের শুরুর তারিখ</span>
                  <span className="text-white font-medium text-sm block">
                    {formatDateBn(alloc.start_date)}
                  </span>
                  <span className="text-emerald-400 text-[11px] font-semibold">
                    স্ট্যাটাস: অ্যাক্টিভ বরাদ্দ
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 space-y-3">
                <BedDouble className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm">এই বর্ডারের কোনো সক্রিয় সিট বরাদ্দ নেই।</p>
                <Link to="/accommodation/seats">
                  <Button variant="primary" size="sm" className="bg-primary-600 hover:bg-primary-500">
                    সিট বরাদ্দ করুন
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Allocation History Timeline */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-primary-400" />
              সিট পরিবর্তন ও অবস্থানের ইতিহাস
            </h3>

            {boarder.allocation_history && boarder.allocation_history.length > 0 ? (
              <div className="space-y-4 border-l-2 border-slate-800 ml-3 pl-5">
                {boarder.allocation_history.map((hist) => (
                  <div key={hist.id} className="relative group">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary-500 ring-4 ring-slate-900" />
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {hist.change_type === 'INITIAL_ALLOCATION'
                            ? 'প্রাথমিক সিট বরাদ্দ'
                            : hist.change_type === 'TRANSFER'
                            ? 'সিট স্থানান্তর (Transfer)'
                            : 'হোস্টেল প্রস্থান (Departure)'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {formatDateBn(hist.effective_date)}
                        </span>
                      </div>
                      <p className="text-slate-400">
                        {hist.previous_seat_code && `পূর্ববর্তী সিট: ${hist.previous_seat_code} ➔ `}
                        {hist.new_seat_code && `বরাদ্দকৃত সিট: ${hist.new_seat_code}`}
                      </p>
                      {hist.reason && <p className="text-slate-500 italic">কারণ: {hist.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">কোনো পূর্ববর্তী সিট পরিবর্তনের রেকর্ড পাওয়া যায়নি।</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Dues & Rent Charges Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-slate-500 block mb-1">মোট বিল / চার্জ</span>
              <span className="text-2xl font-bold text-white">
                {formatCurrencyBn(Number(boarder.total_paid || 0) + Number(boarder.total_due || 0))}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-emerald-400 block mb-1">পরিশোধিত অর্থ (Paid)</span>
              <span className="text-2xl font-bold text-emerald-400">
                {formatCurrencyBn(boarder.total_paid || 0)}
              </span>
            </div>
            <div className="glass-card p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <span className="text-xs text-rose-400 block mb-1">বর্তমান বকেয়া (Total Due)</span>
              <span className="text-2xl font-bold text-rose-400">
                {formatCurrencyBn(boarder.total_due || 0)}
              </span>
            </div>
          </div>

          {/* Charges List Table */}
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                মাসিক চার্জ ও ইনভয়েস বিবরণ
              </h3>
              <Link to={`/billing/receipts?boarderId=${boarder.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 shadow-sm"
                >
                  <Receipt className="w-3.5 h-3.5 mr-1" />
                  টাকা জমা নিন (Collect Receipt)
                </Button>
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase">
                    <th className="py-3 px-4">বিলিং মাস</th>
                    <th className="py-3 px-4">চার্জ টাইপ</th>
                    <th className="py-3 px-4">বিবরণ</th>
                    <th className="py-3 px-4">মোট পরিমাণ</th>
                    <th className="py-3 px-4">পরিশোধিত</th>
                    <th className="py-3 px-4">বকেয়া</th>
                    <th className="py-3 px-4">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {boarder.charges && boarder.charges.length > 0 ? (
                    boarder.charges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">
                          {charge.billing_month}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300">
                            {charge.charge_type === 'RENT' ? 'মাসিক ভাড়া' : 'মিল বিল'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{charge.description || '—'}</td>
                        <td className="py-3 px-4 font-semibold text-white">
                          {formatCurrencyBn(charge.amount)}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-medium">
                          {formatCurrencyBn(charge.paid_amount)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-400">
                          {formatCurrencyBn(charge.due_amount)}
                        </td>
                        <td className="py-3 px-4">
                          {charge.status === 'PAID' ? (
                            <Badge status="PAID">পরিশোধিত</Badge>
                          ) : charge.status === 'PARTIALLY_PAID' ? (
                            <Badge status="PENDING">আংশিক</Badge>
                          ) : (
                            <Badge status="REJECTED">অপরিশোধিত</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        কোনো চার্জ বা ইনভয়েস রেকর্ড নেই।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Meals Record */}
      {activeTab === 'meals' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                চলতি মাসের মিল অংশগ্রহণ ও সারাংশ
              </h3>

              {canManageMeals && (
                <button
                  type="button"
                  onClick={() => setIsMealControlOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>মিল অন/অফ পরিবর্তন (Staff Override)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-6">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">মোট গৃহীত মিল</span>
                <span className="text-2xl font-bold text-white">
                  {boarder.meal_summary?.total_meals || 0} টি
                </span>
                <span className="text-slate-400 text-[11px]">চলতি মাসে রেকর্ডকৃত</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">আনুমানিক মিল খরচ</span>
                <span className="text-2xl font-bold text-amber-400">
                  {formatCurrencyBn(boarder.meal_summary?.estimated_meal_cost || 0)}
                </span>
                <span className="text-slate-400 text-[11px]">বর্তমান গড় রেট অনুযায়ী</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block mb-1">আজকের মিল স্ট্যাটাস</span>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      boarder.meal_summary?.active_today?.breakfast
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    সকাল {boarder.meal_summary?.active_today?.breakfast ? '✓' : '✗'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      boarder.meal_summary?.active_today?.lunch
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    দুপুর {boarder.meal_summary?.active_today?.lunch ? '✓' : '✗'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      boarder.meal_summary?.active_today?.dinner
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    রাত {boarder.meal_summary?.active_today?.dinner ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span>
                মিল অন/অফ নিয়ম: প্রতিদিন রাত ১০:০০ টার মধ্যে পরবর্তী দিনের মিল নির্বাচন বা পরিবর্তন করতে হয়।
                পরবর্তী মডিউলে (Prompt 21 ও 22) পূর্ণাঙ্গ রিয়েলটাইম কিচেন কাউন্ট ভিউ যুক্ত থাকবে।
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ApplicantReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        applicant={boarder}
      />

      {/* Staff Meal Control Modal */}
      {isMealControlOpen && (
        <StaffMealControlModal
          isOpen={isMealControlOpen}
          onClose={() => setIsMealControlOpen(false)}
          initialBoarderId={boarder.id}
        />
      )}

      {/* Edit Boarder Profile Modal */}
      <EditBoarderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        boarder={boarder}
      />
    </div>
  )
}
export default BoarderDetailPage

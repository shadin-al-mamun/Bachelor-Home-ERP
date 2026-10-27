import React, { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Badge from '@/components/common/Badge'
import { formatDateBn } from '@/utils/date'
import {
  type BoarderWithRelations,
  useApproveApplicantMutation,
  useRejectApplicantMutation,
  getDocumentSignedUrl,
} from '../api/useBoarders'
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

interface ApplicantReviewModalProps {
  isOpen: boolean
  onClose: () => void
  applicant: BoarderWithRelations | null
}

export const ApplicantReviewModal: React.FC<ApplicantReviewModalProps> = ({
  isOpen,
  onClose,
  applicant,
}) => {
  const [docUrl, setDocUrl] = useState<string | null>(null)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const approveMutation = useApproveApplicantMutation()
  const rejectMutation = useRejectApplicantMutation()

  useEffect(() => {
    if (applicant && isOpen) {
      setIsRejecting(false)
      setRejectionReason('')
      setFeedbackMsg(null)

      if (applicant.nid_document_url) {
        setIsLoadingDoc(true)
        getDocumentSignedUrl(applicant.nid_document_url)
          .then((url) => setDocUrl(url || null))
          .catch(() => setDocUrl(null))
          .finally(() => setIsLoadingDoc(false))
      } else {
        setDocUrl(null)
      }
    }
  }, [applicant, isOpen])

  if (!applicant) return null

  const handleApprove = async () => {
    try {
      setFeedbackMsg(null)
      await approveMutation.mutateAsync({
        boarderId: applicant.id,
        remarks: 'আবেদনটি যাচাই করে অনুমোদন করা হলো।',
      })
      setFeedbackMsg({
        type: 'success',
        text: 'আবেদন সফলভাবে অনুমোদিত হয়েছে! বর্ডার এখন সিট বরাদ্দের জন্য প্রস্তুত।',
      })
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'অনুমোদন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
      })
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setFeedbackMsg({ type: 'error', text: 'অনুগ্রহ করে বাতিলের কারণ উল্লেখ করুন।' })
      return
    }

    try {
      setFeedbackMsg(null)
      await rejectMutation.mutateAsync({
        boarderId: applicant.id,
        reason: rejectionReason,
      })
      setFeedbackMsg({
        type: 'success',
        text: 'আবেদনটি বাতিল করা হয়েছে।',
      })
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'বাতিল করতে সমস্যা হয়েছে।',
      })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <span>নতুন বর্ডার আবেদন পর্যালোচনা ও ভেরিফিকেশন</span>
        </div>
      }
      maxWidth="3xl"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            বন্ধ করুন
          </Button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {!isRejecting ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejecting(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  আবেদন বাতিল
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  isLoading={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  আবেদন অনুমোদন করুন
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRejecting(false)}
                  disabled={rejectMutation.isPending}
                >
                  ফিরে যান
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleReject}
                  isLoading={rejectMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500"
                >
                  বাতিল নিশ্চিত করুন
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 pb-2">
        {/* Status Message */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Top Header Profile Banner */}
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4 bg-slate-900/60">
          <div className="relative">
            {applicant.photo_url ? (
              <img
                src={applicant.photo_url}
                alt={applicant.full_name}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover ring-2 ring-primary-500/30"
              />
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 ring-2 ring-slate-700">
                <User className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-slate-950 rounded-full">
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{applicant.full_name}</h3>
              <Badge status="PENDING">অনুমোদন অপেক্ষমান (PENDING)</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs text-slate-400">
              <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                আইডি: {applicant.boarder_code}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary-400" />
                {applicant.phone_number}
              </span>
              {applicant.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-primary-400" />
                  {applicant.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Details & Document Verification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: Bio, Academic & Guardian Info */}
          <div className="space-y-4">
            {/* Academic / Employment Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary-400" />
                শিক্ষাগত বা পেশাগত তথ্য
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">প্রতিষ্ঠান / কোম্পানি</span>
                  <span className="text-slate-200 font-medium">{applicant.institution || 'উল্লেখ নেই'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">বিভাগ / পদবী</span>
                  <span className="text-slate-200 font-medium">{applicant.department || applicant.occupation || 'উল্লেখ নেই'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">শিক্ষাগত যোগ্যতা</span>
                  <span className="text-slate-200 font-medium">{applicant.educational_qualification || 'স্নাতক'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">পেশা</span>
                  <span className="text-slate-200 font-medium">{applicant.occupation || 'শিক্ষার্থী'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">আইডি নম্বর</span>
                  <span className="text-slate-200 font-mono">{applicant.student_id || 'উল্লেখ নেই'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">সেশন / ধরন</span>
                  <span className="text-slate-200 font-medium">{applicant.session || 'উল্লেখ নেই'}</span>
                </div>
              </div>
            </div>

            {/* Guardian & Emergency Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                ব্যক্তিগত, অভিভাবক ও জরুরী তথ্য
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">পিতার নাম</span>
                  <span className="text-slate-200 font-medium">{applicant.father_name || applicant.guardian_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">জন্ম তারিখ</span>
                  <span className="text-slate-200 font-medium">{applicant.date_of_birth || 'উল্লেখ নেই'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">বৈবাহিক অবস্থা / ধর্ম</span>
                  <span className="text-slate-200 font-medium">{applicant.marital_status || 'অবিবাহিত'} • {applicant.religion || 'ইসলাম'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">জরুরি যোগাযোগ</span>
                  <span className="text-slate-200 font-medium">
                    {applicant.emergency_contact_name ? `${applicant.emergency_contact_name} (${applicant.emergency_contact_relation || 'অভিভাবক'})` : (applicant.emergency_contact || 'উল্লেখ নেই')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">অভিভাবকের নাম</span>
                  <span className="text-slate-200 font-medium">{applicant.guardian_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">অভিভাবকের ফোন</span>
                  <a
                    href={`tel:${applicant.guardian_phone}`}
                    className="text-primary-400 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {applicant.guardian_phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                ঠিকানা ও আবেদন তারিখ
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block">স্থায়ী ঠিকানা</span>
                  <span className="text-slate-200 font-medium">{applicant.permanent_address}</span>
                </div>
                {applicant.present_address && (
                  <div>
                    <span className="text-slate-500 block">বর্তমান ঠিকানা</span>
                    <span className="text-slate-200">{applicant.present_address}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    আবেদনের তারিখ:
                  </span>
                  <span className="text-slate-200 font-medium">{formatDateBn(applicant.admission_date)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Document Verification */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  এনআইডি / স্টুডেন্ট আইডি ডকুমেন্টস
                </h4>
                {docUrl && (
                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 hover:underline"
                  >
                    বড় করে দেখুন <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  {docUrl
                    ? 'সুরক্ষিত প্রিভিউ: সুপাবেজ প্রাইভেট বাকেট থেকে ১৫ মিনিটের সাইনড ইউআরএল তৈরি করা হয়েছে।'
                    : 'সুরক্ষিত ভেরিফিকেশন: কোনো ডিজিটাল কপি পাওয়া যায়নি বা অফলাইনে জমা হতে পারে।'}
                </span>
              </div>

              {applicant.nid_passport_number && (
                <div className="text-xs">
                  <span className="text-slate-500">NID / পাসপোর্ট নম্বর: </span>
                  <span className="text-white font-mono font-medium">{applicant.nid_passport_number}</span>
                </div>
              )}

              {/* Document Display Canvas */}
              <div className="relative min-h-[200px] max-h-[280px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-2">
                {isLoadingDoc ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span>ডকুমেন্ট লোড হচ্ছে...</span>
                  </div>
                ) : docUrl ? (
                  docUrl.startsWith('data:application/pdf') ||
                  docUrl.includes('.pdf') ||
                  applicant.nid_document_url?.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">পিডিএফ ডকুমেন্ট সংযুক্ত রয়েছে</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">সম্পূর্ণ ডকুমেন্ট দেখতে নিচের বাটনে ক্লিক করুন</p>
                      </div>
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
                      >
                        পিডিএফ ভিউয়ারে খুলুন <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <img
                      src={docUrl}
                      alt="NID/Student Document"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-300 rounded-lg"
                    />
                  )
                ) : (
                  <div className="text-center p-6 text-slate-500 text-xs space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p>কোনো ডিজিটাল ডকুমেন্ট আপলোড করা হয়নি।</p>
                    <p className="text-slate-600">আবেদনকারী সরাসরি অফিসে কপি জমা দিতে পারেন।</p>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks / Review Notes */}
            {applicant.remarks && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-xs text-slate-300">
                <span className="text-slate-500 block mb-1">আবেদনকারীর নোট / পূর্ব মন্তব্য:</span>
                <p className="italic">{applicant.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rejection Reason Input Drawer */}
        {isRejecting && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
              <XCircle className="w-4 h-4" />
              আবেদন বাতিলের কারণ উল্লেখ করুন
            </div>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="যেমন: ভুয়া ডকুমেন্ট, ফোন নম্বর বন্ধ পাওয়া গেছে, হোস্টেলে কোনো সিট খালি নেই..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
export default ApplicantReviewModal

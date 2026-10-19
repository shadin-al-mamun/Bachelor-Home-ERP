import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  ShieldCheck,
  Building2,
  LogOut,
  HelpCircle,
  FileText,
  User,
  Phone,
  CheckCircle,
  XCircle,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge } from '@/components/common'
import { useAuthStore } from '@/app/store/useAuthStore'
import { isSupabaseConfigured } from '@/lib/supabaseClient'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { formatDateBn } from '@/utils/date'

export const ApplicationStatusPage: React.FC = () => {
  const navigate = useNavigate()
  const { profile, signOut, setDemoUser } = useAuthStore()
  const { data: boarders = [] } = useBoarders()

  // Match the applicant by stored ID or code or profile email
  const currentApplicant = useMemo(() => {
    const storedId = localStorage.getItem('bachelor_erp_last_applicant_id')
    const storedCode = localStorage.getItem('bachelor_erp_last_applicant_code')

    if (storedId) {
      const found = boarders.find((b) => b.id === storedId)
      if (found) return found
    }
    if (storedCode) {
      const found = boarders.find((b) => b.boarder_code === storedCode)
      if (found) return found
    }
    if (profile?.email) {
      const found = boarders.find((b) => b.email === profile.email)
      if (found) return found
    }
    // Fallback to most recent PENDING boarder or first pending
    return boarders.find((b) => b.status === 'PENDING') || null
  }, [boarders, profile])

  const status = currentApplicant?.status || 'PENDING'
  const applicantName = currentApplicant?.full_name || profile?.full_name || 'নতুন আবেদনকারী'
  const applicantPhone = currentApplicant?.phone_number || profile?.phone_number || '017xxxxxxxx'
  const applicantCode = currentApplicant?.boarder_code || 'BDR-2026-NEW'
  const applicantDate = currentApplicant?.admission_date ? formatDateBn(currentApplicant.admission_date) : 'আজকে'

  const handleEnterBoarderPortal = () => {
    if (status !== 'ACTIVE') return
    if (!isSupabaseConfigured) {
      setDemoUser('BOARDER', {
        id: currentApplicant?.user_id || undefined,
        full_name: applicantName,
        email: currentApplicant?.email || `${applicantName}@bachelorhome.erp`,
        phone_number: applicantPhone,
        role: 'BOARDER',
      })
    }
    navigate('/portal/my-meals')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative py-12">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl z-10 space-y-5">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 p-0.5 shadow-xl shadow-amber-500/20 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            বর্ডার ভর্তি আবেদন স্ট্যাটাস
          </h1>
          <p className="text-xs text-slate-400">
            ব্যাচেলর হোম ইআরপি — আবেদনকারী ট্র্যাকিং পোর্টাল
          </p>
        </div>

        {/* Status Card */}
        <Card variant="glass" className="border-slate-800 shadow-2xl">
          <CardHeader className="text-center pb-4 border-b border-slate-800/80">
            <div className="flex justify-center mb-3">
              {status === 'PENDING' && (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse">
                  <Clock className="w-8 h-8" />
                </div>
              )}
              {status === 'ACTIVE' && (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
              )}
              {status === 'REJECTED' && (
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Badge
                status={status === 'ACTIVE' ? 'ACTIVE' : status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                showDot={true}
                className="text-sm px-3.5 py-1"
              >
                {status === 'PENDING' && 'পর্যালোচনাধীন (PENDING REVIEW)'}
                {status === 'ACTIVE' && 'অনুমোদিত ও সক্রিয় (APPROVED)'}
                {status === 'REJECTED' && 'প্রত্যাখ্যাত (REJECTED)'}
              </Badge>
            </div>

            <CardTitle className="justify-center text-lg mt-3">
              আবেদন কোড: <span className="text-primary-400 font-mono">{applicantCode}</span>
            </CardTitle>
            <CardDescription>
              জমার সময়: {applicantDate}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Status Narrative Notice */}
            {status === 'PENDING' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-2">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  আবেদনটি হোস্টেল কর্তৃপক্ষের পর্যালোচনায় রয়েছে:
                </p>
                <p>
                  আপনার আবেদনটি সফলভাবে জমা হয়েছে। হোস্টেল এডমিন বা ম্যানেজার এটি যাচাই করে সিট বরাদ্দ ও অনুমোদন প্রদান করবেন।
                </p>
                <p className="text-[11px] text-amber-300/80">
                  * এডমিন অনুমোদন করার সাথে সাথে এই পেজে স্ট্যাটাস আপডেট হবে এবং আপনার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে।
                </p>
              </div>
            )}

            {status === 'ACTIVE' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed space-y-2">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  অভিনন্দন! আপনার আবেদন অনুমোদিত হয়েছে:
                </p>
                <p>
                  হোস্টেল কর্তৃপক্ষ আপনার আবেদন ও নথিপত্র যাচাইপূর্বক অনুমোদন দিয়েছেন। আপনি এখন মূল সিস্টেমে প্রবেশ করতে পারবেন।
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnterBoarderPortal}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500"
                >
                  বর্ডার পোর্টালে প্রবেশ করুন
                </Button>
              </div>
            )}

            {status === 'REJECTED' && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed space-y-2">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  আবেদনটি অনুমোদন করা সম্ভব হয়নি:
                </p>
                <p>
                  {currentApplicant?.remarks ||
                    'দুঃখিত, পর্যাপ্ত সিট খালি না থাকায় বা তথ্যের অসামঞ্জস্যতার কারণে আবেদনটি বাতিল করা হয়েছে। বিস্তারিত জানতে হোস্টেল অফিসে যোগাযোগ করুন।'}
                </p>
              </div>
            )}

            {/* Applicant Details Summary */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 text-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                আপনার প্রদত্ত বিবরণ
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">আবেদনকারীর নাম:</span>
                  <span className="font-medium flex items-center gap-1 text-white">
                    <User className="w-3 h-3 text-slate-400" />
                    {applicantName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">মোবাইল নম্বর:</span>
                  <span className="font-medium flex items-center gap-1 text-white">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {applicantPhone}
                  </span>
                </div>
                {currentApplicant?.institution && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px]">প্রতিষ্ঠান / কর্মক্ষেত্র:</span>
                    <span className="font-medium flex items-center gap-1 text-white">
                      <GraduationCap className="w-3 h-3 text-slate-400" />
                      {currentApplicant.institution}
                    </span>
                  </div>
                )}
                {currentApplicant?.guardian_name && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">অভিভাবকের নাম:</span>
                    <span className="font-medium text-white">{currentApplicant.guardian_name}</span>
                  </div>
                )}
                {currentApplicant?.guardian_phone && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">অভিভাবকের ফোন:</span>
                    <span className="font-medium text-white">{currentApplicant.guardian_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Helpline Notice */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-primary-400 shrink-0" />
              <span>যেকোনো প্রয়োজনে হোস্টেল অফিসে যোগাযোগ করুন: 01700-000000</span>
            </div>
          </CardContent>

          <CardFooter className="justify-end pt-4 border-t border-slate-800/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              লগআউট
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default ApplicationStatusPage

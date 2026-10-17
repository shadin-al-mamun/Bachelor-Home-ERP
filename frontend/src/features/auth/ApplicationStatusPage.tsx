import React, { useState } from 'react'
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
} from 'lucide-react'
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge } from '@/components/common'
import { useAuthStore } from '@/app/store/useAuthStore'
import { formatDhakaDate } from '@/utils/date'

export const ApplicationStatusPage: React.FC = () => {
  const { profile, signOut } = useAuthStore()

  // Demo status toggler for testing
  const [mockStatus, setMockStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

  const applicationDate = formatDhakaDate(new Date())

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative py-12">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl z-10 space-y-6">
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
              {mockStatus === 'PENDING' && (
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse">
                  <Clock className="w-8 h-8" />
                </div>
              )}
              {mockStatus === 'APPROVED' && (
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
              )}
              {mockStatus === 'REJECTED' && (
                <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <XCircle className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <Badge
                status={mockStatus}
                showDot={true}
                className="text-sm px-3.5 py-1"
              >
                {mockStatus === 'PENDING' && 'পর্যালোচনাধীন (PENDING REVIEW)'}
                {mockStatus === 'APPROVED' && 'অনুমোদিত (APPROVED)'}
                {mockStatus === 'REJECTED' && 'প্রত্যাখ্যাত (REJECTED)'}
              </Badge>
            </div>

            <CardTitle className="justify-center text-lg mt-3">
              আবেদন কোড: <span className="text-primary-400 font-mono">BDR-7482</span>
            </CardTitle>
            <CardDescription>
              জমার সময়: {applicationDate}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Status Narrative Notice */}
            {mockStatus === 'PENDING' && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-2">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  আবেদনটি যাচাই প্রক্রিয়ায় রয়েছে:
                </p>
                <p>
                  আপনার আবেদনটি হোস্টেল ম্যানেজার বা অ্যাডমিনের পর্যালোচনায় আছে। হোস্টেলের আসন প্রাপ্যতা ও জাতীয় পরিচয়পত্র যাচাই শেষে কর্তৃপক্ষ অনুমোদন প্রদান করবেন।
                </p>
                <p className="text-[11px] text-amber-300/80">
                  * অনুমোদনের পর আপনার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে সক্রিয় হবে এবং আপনি মূল ড্যাশবোর্ডে প্রবেশ করে সিট ও মিল বুকিং করতে পারবেন।
                </p>
              </div>
            )}

            {mockStatus === 'APPROVED' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 leading-relaxed space-y-2">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  অভিনন্দন! আপনার আবেদন অনুমোদিত হয়েছে:
                </p>
                <p>
                  কর্তৃপক্ষ আপনার আবেদন যাচাইপূর্বক অনুমোদন দিয়েছেন। আপনাকে একটি সিট বরাদ্দ করা হয়েছে।
                </p>
              </div>
            )}

            {mockStatus === 'REJECTED' && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 leading-relaxed space-y-2">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  আবেদনটি অনুমোদন করা সম্ভব হয়নি:
                </p>
                <p>
                  দুঃখিত, বর্তমান সেশনে পর্যাপ্ত সিট খালি না থাকায় বা তথ্যের অসামঞ্জস্যতার কারণে আবেদনটি বাতিল করা হয়েছে। বিস্তারিত জানতে হোস্টেল অফিসে যোগাযোগ করুন।
                </p>
              </div>
            )}

            {/* Applicant Details Summary */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                আপনার প্রদত্ত প্রাথমিক বিবরণ
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">আবেদনকারীর নাম:</span>
                  <span className="font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {profile?.full_name || 'মোঃ আশিকুর রহমান'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">যোগাযোগ নম্বর:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {profile?.phone_number || '01712-345678'}
                  </span>
                </div>
              </div>
            </div>

            {/* Helpline Notice */}
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
              <HelpCircle className="w-4 h-4 text-primary-400 shrink-0" />
              <span>যেকোনো প্রয়োজনে হোস্টেল অফিসে যোগাযোগ করুন: 01700-000000</span>
            </div>
          </CardContent>

          <CardFooter className="justify-between pt-4 border-t border-slate-800/80">
            {/* Demo Status Toggler Button for Review Testing */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 mr-1">টেস্ট টগল:</span>
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setMockStatus(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    mockStatus === s ? 'bg-primary-600 border-primary-500 text-white' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  {s === 'PENDING' ? 'পেন্ডিং' : s === 'APPROVED' ? 'অনুমোদিত' : 'বাতিল'}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
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

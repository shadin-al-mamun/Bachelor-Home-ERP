import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  GraduationCap,
  FileText,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Upload,
  Check,
} from 'lucide-react'
import {
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/common'
import { useAuthStore } from '@/app/store/useAuthStore'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import { createBoarderApplication } from '@/features/boarders/api/useBoarders'

export const RegisterPortal: React.FC = () => {
  const navigate = useNavigate()
  const { setDemoUser } = useAuthStore()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Step 1: Personal Info
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('পিতা (Father)')
  const [presentAddress, setPresentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')

  // Step 2: Institution / Work
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [session, setSession] = useState('')

  // Step 3: Identity & Document
  const [nidNumber, setNidNumber] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)

  // Step 4: Password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name)
    }
  }

  const validateStep = (currentStep: number) => {
    setErrorMessage(null)
    if (currentStep === 1) {
      if (!fullName || !phoneNumber || !guardianName || !guardianPhone || !permanentAddress) {
        setErrorMessage('অনুগ্রহ করে সকল আবশ্যকীয় (*) ফিল্ড পূরণ করুন।')
        return false
      }
    } else if (currentStep === 2) {
      if (!institution) {
        setErrorMessage('শিক্ষা প্রতিষ্ঠান বা কর্মক্ষেত্রের নাম আবশ্যক।')
        return false
      }
    } else if (currentStep === 3) {
      if (!nidNumber) {
        setErrorMessage('জাতীয় পরিচয়পত্র বা পাসপোর্ট নম্বর আবশ্যক।')
        return false
      }
    } else if (currentStep === 4) {
      if (!password || password.length < 6) {
        setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
        return false
      }
      if (password !== confirmPassword) {
        setErrorMessage('দুটি পাসওয়ার্ডের মিল পাওয়া যায়নি।')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handlePrev = () => {
    setErrorMessage(null)
    setStep(step - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(4)) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      let createdUserId: string | undefined = undefined

      // If Supabase is configured: First create the user account in Supabase Auth
      if (isSupabaseConfigured) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone_number: phoneNumber,
              role: 'APPLICANT',
            },
          },
        })

        if (authError) {
          setErrorMessage(
            authError.message.includes('User already registered')
              ? 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। দয়া করে লগইন করুন।'
              : authError.message
          )
          setIsLoading(false)
          return
        }

        createdUserId = authData?.user?.id
      }

      // 2. Create boarder application in database with the linked user_id
      const createdBoarder = await createBoarderApplication({
        user_id: createdUserId,
        full_name: fullName,
        phone_number: phoneNumber,
        email,
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        guardian_relation: guardianRelation,
        present_address: presentAddress,
        permanent_address: permanentAddress,
        institution,
        department,
        student_id: studentId,
        session,
        nid_passport_number: nidNumber,
        nid_document_url: fileName ? `boarder-docs/${fileName}` : undefined,
      })

      // Store application reference for tracking
      localStorage.setItem('bachelor_erp_last_applicant_id', createdBoarder.id)
      localStorage.setItem('bachelor_erp_last_applicant_code', createdBoarder.boarder_code)

      // Set auth state as APPLICANT
      setDemoUser('APPLICANT', {
        id: createdUserId || createdBoarder.user_id || undefined,
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        role: 'APPLICANT',
      })

      navigate('/portal/my-application', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রেজিস্ট্রেশন প্রক্রিয়া ব্যর্থ হয়েছে।'
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const stepsList = [
    { num: 1, title: 'ব্যক্তিগত তথ্য', icon: <User className="w-4 h-4" /> },
    { num: 2, title: 'প্রতিষ্ঠান ও পড়ালেখা', icon: <GraduationCap className="w-4 h-4" /> },
    { num: 3, title: 'NID ও ডকুমেন্টস', icon: <FileText className="w-4 h-4" /> },
    { num: 4, title: 'পাসওয়ার্ড সেটআপ', icon: <Lock className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative py-12">
      <div className="w-full max-w-2xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 p-0.5 shadow-xl shadow-primary-500/25 mx-auto flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            নতুন বর্ডার ভর্তি আবেদন ফর্ম
          </h1>
          <p className="text-xs text-slate-400">
            হোস্টেল সিট পাওয়ার জন্য তথ্যগুলো সঠিকভাবে পূরণ করে আবেদন জমা দিন
          </p>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="glass p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
          {stepsList.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    step === s.num ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < stepsList.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-800 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <Card variant="glass" className="border-slate-800 shadow-2xl">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <CardTitle className="text-base flex items-center gap-2">
              {stepsList[step - 1].icon}
              <span>ধাপ {step}: {stepsList[step - 1].title}</span>
            </CardTitle>
            <CardDescription>
              ফর্মটি সাবমিট করার পর হোস্টেল কর্তৃপক্ষ যাচাই করে আপনার সিট চূড়ান্ত করবে
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* STEP 1: Personal Details */}
              {step === 1 && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="আপনার পূর্ণ নাম"
                      placeholder="জাতীয় পরিচয়পত্র অনুযায়ী"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    <Input
                      label="মোবাইল নম্বর"
                      placeholder="017xxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="ইমেইল অ্যাড্রেস"
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <Input
                      label="অভিভাবকের নাম"
                      placeholder="পিতা / মাতা / অভিভাবক"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      required
                    />
                    <Select
                      label="সম্পর্ক (Relation)"
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      options={[
                        { value: 'পিতা (Father)', label: 'পিতা (Father)' },
                        { value: 'মাতা (Mother)', label: 'মাতা (Mother)' },
                        { value: 'ভাই/বোন (Sibling)', label: 'ভাই/বোন (Sibling)' },
                        { value: 'অন্যান্য (Other)', label: 'অন্যান্য (Other)' },
                      ]}
                      required
                    />
                    <Input
                      label="অভিভাবকের মোবাইল নম্বর"
                      placeholder="জরুরি যোগাযোগের নম্বর"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="বর্তমান ঠিকানা"
                      placeholder="বর্তমান মেস/বাসা"
                      value={presentAddress}
                      onChange={(e) => setPresentAddress(e.target.value)}
                    />
                    <Input
                      label="স্থায়ী ঠিকানা"
                      placeholder="গ্রাম, ডাকঘর, থানা, জেলা"
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Institution / Job Details */}
              {step === 2 && (
                <div className="space-y-3.5">
                  <Input
                    label="শিক্ষা প্রতিষ্ঠান বা কর্মস্থলের নাম"
                    placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয় / সফটওয়্যার ফার্ম"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="বিভাগ বা পদবি"
                      placeholder="যেমন: সিএসই / সফটওয়্যার ইঞ্জিনিয়ার"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    />
                    <Input
                      label="স্টুডেন্ট / এমপ্লয়ি আইডি"
                      placeholder="আইডি নম্বর (যদি থাকে)"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                    />
                  </div>

                  <Input
                    label="শিক্ষাবর্ষ বা সেশন"
                    placeholder="যেমন: 2022-2023"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                  />
                </div>
              )}

              {/* STEP 3: NID & Documents */}
              {step === 3 && (
                <div className="space-y-4">
                  <Input
                    label="জাতীয় পরিচয়পত্র (NID) বা পাসপোর্ট নম্বর"
                    placeholder="১০ বা ১৭ ডিজিটের NID নম্বর"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      NID / স্টুডেন্ট আইডি ডকুমেন্টের কপি আপলোড করুন
                    </label>
                    <div className="border-2 border-dashed border-slate-700 hover:border-primary-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-900/40 relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <div className="w-10 h-10 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        {fileName ? (
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            {fileName}
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-slate-300">
                              ফাইল ব্রাউজ করতে ক্লিক করুন (PNG, JPG, PDF)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              সর্বোচ্চ সাইজ: ৫ মেগাবাইট (Supabase Vault Encrypted)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Password Creation */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-primary-600/10 border border-primary-500/30 text-xs text-primary-300">
                    <p className="font-semibold mb-1">লগইন ক্রেডেনশিয়াল নির্ধারণ করুন:</p>
                    <p className="text-slate-300">
                      আপনার প্রদানকৃত ইমেইল (<span className="text-white font-mono">{email}</span>) এবং নিচের পাসওয়ার্ড দিয়ে আপনি পরবর্তীতে স্ট্যাটাস দেখতে ও মিল সিলেক্ট করতে লগইন করবেন।
                    </p>
                  </div>

                  <Input
                    label="অ্যাকাউন্ট পাসওয়ার্ড"
                    type="password"
                    placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <Input
                    label="পাসওয়ার্ড নিশ্চিত করুন"
                    type="password"
                    placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </CardContent>

            <CardFooter className="justify-between pt-4 border-t border-slate-800/80">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  পূর্ববর্তী
                </Button>
              ) : (
                <Link to="/login">
                  <Button type="button" variant="ghost">
                    লগইন পেজে ফিরুন
                  </Button>
                </Link>
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  পরবর্তী ধাপ
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  আবেদন চূড়ান্ত জমা দিন
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

export default RegisterPortal

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
  Camera,
  Trash2,
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
  const [fatherName, setFatherName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('অবিবাহিত')
  const [religion, setReligion] = useState('ইসলাম')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('পিতা (Father)')
  const [presentAddress, setPresentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')

  // Step 2: Institution / Work
  const [educationalQualification, setEducationalQualification] = useState('স্নাতক (চলমান)')
  const [occupation, setOccupation] = useState('শিক্ষার্থী')
  const [institution, setInstitution] = useState('')
  const [workplaceAddress, setWorkplaceAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [session, setSession] = useState('')

  // Step 3: Identity & Document & Emergency Contact
  const [nidNumber, setNidNumber] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('পিতা')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [emergencyContactAddress, setEmergencyContactAddress] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFileName, setPhotoFileName] = useState<string | null>(null)

  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentPreview, setDocumentPreview] = useState<string | null>(null)
  const [documentFileName, setDocumentFileName] = useState<string | null>(null)
  const [documentFileType, setDocumentFileType] = useState<'image' | 'pdf' | null>(null)

  // Step 4: Password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleCopyGuardianToEmergency = () => {
    setEmergencyContactName(guardianName || fatherName)
    setEmergencyContactRelation(guardianRelation ? guardianRelation.split(' ')[0] : 'পিতা')
    setEmergencyContactPhone(guardianPhone)
    setEmergencyContactAddress(permanentAddress || presentAddress)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (!file.type.startsWith('image/')) {
        setErrorMessage('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল (JPG, PNG, WEBP) আপলোড করুন।')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।')
        return
      }
      setPhotoFile(file)
      setPhotoFileName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setPhotoFileName(null)
  }

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('ডকুমেন্টের সাইজ সর্বোচ্চ ১০ মেগাবাইট হতে পারবে।')
        return
      }
      setDocumentFile(file)
      setDocumentFileName(file.name)
      setDocumentFileType(file.type === 'application/pdf' ? 'pdf' : 'image')
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocumentPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveDocument = () => {
    setDocumentFile(null)
    setDocumentPreview(null)
    setDocumentFileName(null)
    setDocumentFileType(null)
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

        // Auto-confirm user account in Supabase to prevent unconfirmed email block
        try {
          await supabase.rpc('confirm_user_account', {
            p_email: email,
            p_phone: phoneNumber,
          })
        } catch {
          // ignore
        }
      }

      // Upload photo & document if provided
      let finalPhotoUrl: string | undefined = photoPreview || undefined
      let finalDocUrl: string | undefined = documentPreview || undefined

      if (isSupabaseConfigured) {
        // Upload photo to avatars bucket
        if (photoFile) {
          try {
            const ext = photoFile.name.split('.').pop() || 'jpg'
            const pPath = `avatars/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
            const { data: pData, error: pErr } = await supabase.storage
              .from('avatars')
              .upload(pPath, photoFile, { upsert: true, cacheControl: '3600' })
            if (!pErr && pData) {
              const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(pData.path)
              if (pubData?.publicUrl) {
                finalPhotoUrl = pubData.publicUrl
              }
            }
          } catch (e) {
            console.warn('Avatar storage upload failed, using data URL fallback:', e)
          }
        }

        // Upload NID document to boarder-documents bucket
        if (documentFile) {
          try {
            const cleanName = documentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const dPath = `nid_${Date.now()}_${cleanName}`
            const { data: dData, error: dErr } = await supabase.storage
              .from('boarder-documents')
              .upload(dPath, documentFile, { upsert: true, cacheControl: '3600' })
            if (!dErr && dData) {
              finalDocUrl = dData.path
            }
          } catch (e) {
            console.warn('Document storage upload failed, using data URL fallback:', e)
          }
        }
      }

      // 2. Create boarder application in database with the linked user_id
      const createdBoarder = await createBoarderApplication({
        user_id: createdUserId,
        full_name: fullName,
        phone_number: phoneNumber,
        email,
        photo_url: finalPhotoUrl,
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
        nid_document_url: finalDocUrl,

        // Police Verification & Tenant Form Fields
        father_name: fatherName || guardianName,
        date_of_birth: dateOfBirth,
        marital_status: maritalStatus,
        religion: religion,
        educational_qualification: educationalQualification,
        occupation: occupation,
        workplace_address: workplaceAddress,
        passport_number: passportNumber,
        emergency_contact_name: emergencyContactName || guardianName || fatherName,
        emergency_contact_relation: emergencyContactRelation || 'পিতা',
        emergency_contact_phone: emergencyContactPhone || guardianPhone,
        emergency_contact_address: emergencyContactAddress || permanentAddress || presentAddress,
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
                      label="পিতার নাম"
                      placeholder="পিতার পূর্ণ নাম"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="মোবাইল নম্বর"
                      placeholder="017xxxxxxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                    <Input
                      label="ইমেইল অ্যাড্রেস"
                      type="email"
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <Input
                      label="জন্ম তারিখ"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                    <Select
                      label="বৈবাহিক অবস্থা"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      options={[
                        { value: 'অবিবাহিত', label: 'অবিবাহিত (Unmarried)' },
                        { value: 'বিবাহিত', label: 'বিবাহিত (Married)' },
                        { value: 'অন্যান্য', label: 'অন্যান্য (Other)' },
                      ]}
                    />
                    <Select
                      label="ধর্ম"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                      options={[
                        { value: 'ইসলাম', label: 'ইসলাম (Islam)' },
                        { value: 'হিন্দু', label: 'হিন্দু (Hinduism)' },
                        { value: 'খ্রিস্টান', label: 'খ্রিস্টান (Christianity)' },
                        { value: 'বৌদ্ধ', label: 'বৌদ্ধ (Buddhism)' },
                        { value: 'অন্যান্য', label: 'অন্যান্য (Other)' },
                      ]}
                    />
                  </div>

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Select
                      label="পেশা (Occupation)"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      options={[
                        { value: 'শিক্ষার্থী', label: 'শিক্ষার্থী (Student)' },
                        { value: 'চাকুরীজীবী', label: 'চাকুরীজীবী (Job/Service)' },
                        { value: 'ব্যবসায়ী', label: 'ব্যবসায়ী (Business)' },
                        { value: 'ফ্রিল্যান্সার', label: 'ফ্রিল্যান্সার (Freelancer)' },
                        { value: 'অন্যান্য', label: 'অন্যান্য (Other)' },
                      ]}
                    />
                    <Select
                      label="সর্বোচ্চ শিক্ষাগত যোগ্যতা"
                      value={educationalQualification}
                      onChange={(e) => setEducationalQualification(e.target.value)}
                      options={[
                        { value: 'স্নাতক (চলমান)', label: 'স্নাতক (চলমান / Undergraduate)' },
                        { value: 'স্নাতক (পাস)', label: 'স্নাতক (পাস / Graduate)' },
                        { value: 'স্নাতকোত্তর', label: 'স্নাতকোত্তর (Post-Graduate)' },
                        { value: 'এইচ.এস.সি', label: 'এইচ.এস.সি (HSC / Equivalent)' },
                        { value: 'এস.এস.সি', label: 'এস.এস.সি (SSC / Equivalent)' },
                        { value: 'অন্যান্য', label: 'অন্যান্য (Other)' },
                      ]}
                    />
                  </div>

                  <Input
                    label="শিক্ষা প্রতিষ্ঠান বা কর্মস্থলের নাম"
                    placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয় / সফটওয়্যার ফার্ম"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    required
                  />

                  <Input
                    label="প্রতিষ্ঠান বা কর্মস্থলের ঠিকানা"
                    placeholder="অফিস বা ক্যাম্পাসের ঠিকানা"
                    value={workplaceAddress}
                    onChange={(e) => setWorkplaceAddress(e.target.value)}
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

              {/* STEP 3: NID & Documents & Emergency Contact */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Photo Upload Option */}
                  <div className="space-y-2 p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-primary-400" />
                        বোর্ডারের ছবি আপলোড (ভাড়াটিয়া নিবন্ধন ফরম ও আইডি কার্ডের জন্য)
                      </label>
                      <span className="text-[11px] text-slate-400">পাসপোর্ট সাইজ</span>
                    </div>

                    {photoPreview ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-primary-500/40 bg-slate-900 flex-shrink-0">
                          <img
                            src={photoPreview}
                            alt="Boarder Photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            {photoFileName || 'ছবি নির্বাচন করা হয়েছে'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            ভাড়াটিয়া পুলিশ ভেরিফিকেশন ফরমে এই ছবি প্রদর্শিত হবে
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="ছবি মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-700/80 hover:border-primary-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/40 relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center gap-3 text-slate-400 group-hover:text-slate-300">
                          <div className="w-9 h-9 rounded-xl bg-primary-600/10 text-primary-400 flex items-center justify-center flex-shrink-0">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-medium text-slate-300">
                              পাসপোর্ট সাইজ ছবি নির্বাচন করতে ক্লিক করুন
                            </p>
                            <p className="text-[11px] text-slate-500">
                              JPG, PNG বা WEBP (সর্বোচ্চ ৫ MB)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* NID & Passport */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Input
                      label="জাতীয় পরিচয়পত্র নম্বর (NID)"
                      placeholder="১০ বা ১৭ ডিজিটের NID নম্বর"
                      value={nidNumber}
                      onChange={(e) => setNidNumber(e.target.value)}
                      required
                    />
                    <Input
                      label="পাসপোর্ট নম্বর (যদি থাকে)"
                      placeholder="পাসপোর্ট নম্বর"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                    />
                  </div>

                  {/* Emergency Contact Section */}
                  <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200">
                          ১০. জরুরী যোগাযোগ (Emergency Contact)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          ভাড়াটিয়া নিবন্ধন ফরমের জন্য আবশ্যক জরুরী যোগাযোগের তথ্য
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyGuardianToEmergency}
                        className="text-xs text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 px-2.5 py-1 rounded-lg border border-primary-500/30 transition-colors w-fit"
                      >
                        অভিভাবকের তথ্য কপি করুন
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        label="নাম"
                        placeholder="জরুরী ব্যক্তির নাম"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                      />
                      <Input
                        label="সম্পর্ক"
                        placeholder="যেমন: পিতা / ভাই"
                        value={emergencyContactRelation}
                        onChange={(e) => setEmergencyContactRelation(e.target.value)}
                      />
                      <Input
                        label="মোবাইল নম্বর"
                        placeholder="017xxxxxxxx"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                      />
                    </div>
                    <Input
                      label="ঠিকানা"
                      placeholder="জরুরী যোগাযোগের পূর্ণ ঠিকানা"
                      value={emergencyContactAddress}
                      onChange={(e) => setEmergencyContactAddress(e.target.value)}
                    />
                  </div>

                  {/* NID / Student ID Document File Upload */}
                  <div className="space-y-2 p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        NID / স্টুডেন্ট আইডি ডকুমেন্টের কপি আপলোড
                      </label>
                      <span className="text-[11px] text-slate-400">ছবি বা PDF</span>
                    </div>

                    {documentPreview ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                        {documentFileType === 'pdf' ? (
                          <div className="w-14 h-14 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0 border border-rose-500/20">
                            <FileText className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-amber-500/40 bg-slate-900 flex-shrink-0">
                            <img
                              src={documentPreview}
                              alt="NID Document"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                            {documentFileName || 'ডকুমেন্ট নির্বাচন করা হয়েছে'}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {documentFileType === 'pdf' ? 'PDF ডকুমেন্ট' : 'আইডি কার্ডের ছবি'} (সুপাবেজ ভল্টে সুরক্ষিত)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveDocument}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="ডকুমেন্ট মুছুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-700/80 hover:border-amber-500/50 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-950/40 relative group">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleDocumentUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 group-hover:text-slate-300">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-300 block">
                              ফাইল ব্রাউজ করতে ক্লিক করুন (PNG, JPG, PDF)
                            </span>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              সর্বোচ্চ সাইজ: ১০ মেগাবাইট (Supabase Vault Protected)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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

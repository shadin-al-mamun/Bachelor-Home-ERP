import React, { useState, useEffect } from 'react'
import {
  X,
  UserPlus,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Phone,
  Mail,
  Lock,
  User,
} from 'lucide-react'
import {
  useCreateStaffUser,
  useAllBuildingsAndFlats,
} from '../api/useUserManagement'
import { useAuthStore } from '../../../app/store/useAuthStore'
import type { UserRole } from '../../../types/database'

interface CreateStaffModalProps {
  isOpen: boolean
  onClose: () => void
}

const AVAILABLE_STAFF_ROLES: {
  role: UserRole
  label: string
  desc: string
  requiresSuperAdmin?: boolean
}[] = [
  {
    role: 'MANAGER',
    label: 'হোস্টেল ম্যানেজার (Hostel Manager)',
    desc: 'দৈনিক ক্যাশ হেফাজত, শিফট ও বর্ডারদের অপারেশনাল ব্যবস্থাপনা',
  },
  {
    role: 'ACCOUNTANT',
    label: 'হিসাবরক্ষক (Accountant)',
    desc: 'খরচের ভাউচার এন্ট্রি, পেমেন্ট রিকনসিলিয়েশন ও আর্থিক লেজার',
  },
  {
    role: 'MEAL_OPERATOR',
    label: 'মিল অপারেটর (Kitchen & Meal Operator)',
    desc: 'দৈনিক মিল বুকিং মনিটরিং, কিচেন ট্যাগ ও বাজার হিসাব',
  },
  {
    role: 'ADMIN',
    label: 'হোস্টেল প্রশাসক (Hostel Admin)',
    desc: 'হোস্টেলের সিট বরাদ্দ, বিলিং ও অপারেশনাল সার্বিক দায়িত্ব',
  },
  {
    role: 'AUDITOR',
    label: 'নিরীক্ষক (Internal Auditor)',
    desc: 'সিস্টেম কমপ্লায়েন্স, বাতিল রসিদ ও অডিট লগ পর্যবেক্ষণ',
  },
  {
    role: 'SUPER_ADMIN',
    label: 'সুপার অ্যাডমিন (মালিক / প্রধান নির্বাহী)',
    desc: 'সম্পূর্ণ সিস্টেমের সর্বোচ্চ নিয়ন্ত্রণ ও রোল গভর্ন্যান্স',
    requiresSuperAdmin: true,
  },
]

export const CreateStaffModal: React.FC<CreateStaffModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile: currentUser } = useAuthStore()
  const { data: buildingsData = [] } = useAllBuildingsAndFlats()
  const createStaffMutation = useCreateStaffUser()

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedFlatIds, setSelectedFlatIds] = useState<Set<string>>(new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Success view state
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdInfo, setCreatedInfo] = useState<{
    fullName: string
    role: UserRole
    email: string
    phoneNumber: string
    password: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFullName('')
      setPhoneNumber('')
      setEmail('')
      setSelectedRole('MANAGER')
      setPassword(generatePassword())
      setShowPassword(false)
      setSelectedFlatIds(new Set())
      setErrorMessage(null)
      setIsSuccess(false)
      setCreatedInfo(null)
      setCopied(false)
    }
  }, [isOpen])

  // Helper to generate a strong readable initial password
  function generatePassword() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let rand = ''
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return `Bhr@${rand}26`
  }

  // Auto-fill suggested email when phone number is typed
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '')
    setPhoneNumber(val)
    if (!email || email.includes('@bachelorhome.erp')) {
      if (val.length >= 11) {
        setEmail(`${val}@bachelorhome.erp`)
      }
    }
  }

  const toggleFlat = (flatId: string) => {
    const updated = new Set(selectedFlatIds)
    if (updated.has(flatId)) {
      updated.delete(flatId)
    } else {
      updated.add(flatId)
    }
    setSelectedFlatIds(updated)
  }

  const toggleBuildingAll = (flatIds: string[]) => {
    const allSelected = flatIds.every((id) => selectedFlatIds.has(id))
    const updated = new Set(selectedFlatIds)
    if (allSelected) {
      flatIds.forEach((id) => updated.delete(id))
    } else {
      flatIds.forEach((id) => updated.add(id))
    }
    setSelectedFlatIds(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!fullName.trim()) {
      setErrorMessage('অনুগ্রহ করে কর্মকর্তার পুরো নাম লিখুন।')
      return
    }

    const cleanPhone = phoneNumber.replace(/[^\d]/g, '').trim()
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      setErrorMessage('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 01712345678)।')
      return
    }

    const targetEmail = email.trim() || `${cleanPhone}@bachelorhome.erp`
    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setErrorMessage('অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন।')
      return
    }

    if (!password.trim() || password.trim().length < 6) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }

    try {
      await createStaffMutation.mutateAsync({
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        email: targetEmail,
        password: password.trim(),
        role: selectedRole,
        flatIds: Array.from(selectedFlatIds),
      })

      setCreatedInfo({
        fullName: fullName.trim(),
        role: selectedRole,
        email: targetEmail,
        phoneNumber: cleanPhone,
        password: password.trim(),
      })
      setIsSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'কর্মকর্তা আইডি তৈরি করতে সমস্যা হয়েছে।')
    }
  }

  const handleCopyCredentials = () => {
    if (!createdInfo) return
    const roleObj = AVAILABLE_STAFF_ROLES.find((r) => r.role === createdInfo.role)
    const textToCopy = `🏢 ব্যাচেলর হোম ERP — কর্মকর্তা লগইন আইডি\n` +
      `--------------------------------------\n` +
      `নাম: ${createdInfo.fullName}\n` +
      `পদবী: ${roleObj?.label || createdInfo.role}\n` +
      `মোবাইল: ${createdInfo.phoneNumber}\n` +
      `লগইন ইমেইল: ${createdInfo.email}\n` +
      `পাসওয়ার্ড: ${createdInfo.password}\n` +
      `লগইন লিংক: ${window.location.origin}/login\n` +
      `--------------------------------------\n` +
      `*লগইন করার পর নিজ দায়িত্বে পাসওয়ার্ড পরিবর্তন করে নিন।*`

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (!isOpen) return null

  const canAssignFlats = ['MANAGER', 'MEAL_OPERATOR', 'ADMIN'].includes(selectedRole)
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-2xl max-h-[92vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>নতুন কর্মকর্তা / স্টাফ আইডি তৈরি করুন</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                এডমিন কর্তৃক হোস্টেল কর্মকর্তাদের জন্য নতুন লগইন আইডি ও পদবী নির্ধারণ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Success View */}
          {isSuccess && createdInfo ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">
                    কর্মকর্তা অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    উক্ত কর্মকর্তা এখন এই মোবাইল নম্বর বা ইমেইল এবং পাসওয়ার্ড দিয়ে সরাসরি সিস্টেমে লগইন করতে পারবেন।
                  </p>
                </div>
              </div>

              {/* Credential Card */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-white text-sm">লগইন ক্রেডেনশিয়ালস সামারি</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {createdInfo.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">কর্মকর্তার নাম</span>
                    <span className="text-white font-semibold text-sm block">{createdInfo.fullName}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">মোবাইল নম্বর</span>
                    <span className="text-indigo-300 font-mono font-semibold text-sm block">
                      {createdInfo.phoneNumber}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">লগইন আইডি / ইমেইল</span>
                    <span className="text-slate-200 font-mono text-xs block truncate">{createdInfo.email}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">লগইন পাসওয়ার্ড</span>
                    <span className="text-amber-400 font-mono font-bold text-sm block">{createdInfo.password}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>ক্লিপবোর্ডে কপি করা হয়েছে! (Copied)</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>সম্পূর্ণ লগইন তথ্য কপি করুন (হোয়াটসঅ্যাপ / SMS এর জন্য)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false)
                    setCreatedInfo(null)
                    setFullName('')
                    setPhoneNumber('')
                    setEmail('')
                    setPassword(generatePassword())
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  আরও একজন কর্মকর্তা যুক্ত করুন
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 rounded-xl transition-colors"
                >
                  সম্পন্ন (Done)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Full Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>কর্মকর্তার পুরো নাম</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মোঃ শামীম আহমেদ"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>পদবী ও প্রশাসনিক দায়িত্ব</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {AVAILABLE_STAFF_ROLES.filter(
                      (r) => !r.requiresSuperAdmin || isSuperAdmin
                    ).map((r) => (
                      <option key={r.role} value={r.role} className="bg-slate-900 text-white">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role explanation alert */}
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-indigo-400 font-bold">দায়িত্ব:</span>
                <span>
                  {AVAILABLE_STAFF_ROLES.find((r) => r.role === selectedRole)?.desc}
                </span>
              </div>

              {/* 2. Contact: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" />
                    <span>মোবাইল নম্বর (লগইন আইডি হিসেবে ব্যবহৃত)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    placeholder="017XXXXXXXX"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ইমেইল এড্রেস (অথবা ডিফল্ট আইডি)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@bachelorhome.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* 3. Password */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>প্রাথমিক লগইন পাসওয়ার্ড</span>
                    <span className="text-rose-400">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>নতুন পাসওয়ার্ড জেনারেট</span>
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  কর্মকর্তা পরবর্তীতে লগইন করার পর যেকোনো সময় পাসওয়ার্ড পরিবর্তন করতে পারবেন।
                </span>
              </div>

              {/* 4. Flat Assignment (if role supports it) */}
              {canAssignFlats && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ফ্ল্যাট দায়িত্ব অ্যাসাইনমেন্ট (ঐচ্ছিক)</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        ({selectedFlatIds.size} টি নির্বাচিত)
                      </span>
                    </label>
                  </div>

                  <div className="max-h-40 overflow-y-auto p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                    {buildingsData.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">কোনো বিল্ডিং বা ফ্ল্যাট পাওয়া যায়নি।</p>
                    ) : (
                      buildingsData.map((b) => {
                        const buildingFlatIds = (b.flats || []).map((f) => f.id)
                        const allSelected =
                          buildingFlatIds.length > 0 &&
                          buildingFlatIds.every((id) => selectedFlatIds.has(id))

                        return (
                          <div key={b.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1 border-b border-slate-800">
                              <span>{b.name} ({b.building_code})</span>
                              {buildingFlatIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleBuildingAll(buildingFlatIds)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                >
                                  {allSelected ? 'সব বাদ দিন' : 'সব সিলেক্ট'}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {(b.flats || []).map((f) => {
                                const isChecked = selectedFlatIds.has(f.id)
                                return (
                                  <label
                                    key={f.id}
                                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors ${
                                      isChecked
                                        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-200'
                                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-900'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleFlat(f.id)}
                                      className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                                    />
                                    <span className="truncate">{f.flat_code}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={createStaffMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={createStaffMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {createStaffMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>অ্যাকাউন্ট তৈরি নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateStaffModal

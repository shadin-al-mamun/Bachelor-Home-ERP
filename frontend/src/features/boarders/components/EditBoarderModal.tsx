import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  useUpdateBoarderMutation,
  useDeleteBoarderMutation,
  type BoarderWithRelations,
} from '../api/useBoarders'
import type { BoarderStatus } from '@/types/database'
import {
  User,
  Phone,
  GraduationCap,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface EditBoarderModalProps {
  isOpen: boolean
  onClose: () => void
  boarder: BoarderWithRelations | null
}

export const EditBoarderModal: React.FC<EditBoarderModalProps> = ({
  isOpen,
  onClose,
  boarder,
}) => {
  const navigate = useNavigate()
  const updateMutation = useUpdateBoarderMutation()
  const deleteMutation = useDeleteBoarderMutation()

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [nidPassportNumber, setNidPassportNumber] = useState('')
  const [institution, setInstitution] = useState('')
  const [department, setDepartment] = useState('')
  const [studentId, setStudentId] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianRelation, setGuardianRelation] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [presentAddress, setPresentAddress] = useState('')
  const [status, setStatus] = useState<BoarderStatus>('ACTIVE')
  const [remarks, setRemarks] = useState('')

  const [fatherName, setFatherName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('অবিবাহিত')
  const [religion, setReligion] = useState('ইসলাম')
  const [educationalQualification, setEducationalQualification] = useState('')
  const [occupation, setOccupation] = useState('')
  const [workplaceAddress, setWorkplaceAddress] = useState('')
  const [passportNumber, setPassportNumber] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [emergencyContactAddress, setEmergencyContactAddress] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (boarder) {
      setFullName(boarder.full_name || '')
      setPhoneNumber(boarder.phone_number || '')
      setEmail(boarder.email || '')
      setNidPassportNumber(boarder.nid_passport_number || '')
      setInstitution(boarder.institution || '')
      setDepartment(boarder.department || '')
      setStudentId(boarder.student_id || '')
      setGuardianName(boarder.guardian_name || '')
      setGuardianPhone(boarder.guardian_phone || '')
      setGuardianRelation(boarder.guardian_relation || 'পিতা')
      setPermanentAddress(boarder.permanent_address || '')
      setPresentAddress(boarder.present_address || '')
      setStatus(boarder.status || 'ACTIVE')
      setRemarks(boarder.remarks || '')

      // Police verification & tenant form fields
      setFatherName(boarder.father_name || boarder.guardian_name || '')
      setDateOfBirth(boarder.date_of_birth || '')
      setMaritalStatus(boarder.marital_status || 'অবিবাহিত')
      setReligion(boarder.religion || 'ইসলাম')
      setEducationalQualification(boarder.educational_qualification || '')
      setOccupation(boarder.occupation || 'শিক্ষার্থী')
      setWorkplaceAddress(boarder.workplace_address || boarder.institution || '')
      setPassportNumber(boarder.passport_number || '')
      setEmergencyContactName(boarder.emergency_contact_name || boarder.guardian_name || '')
      setEmergencyContactRelation(boarder.emergency_contact_relation || boarder.guardian_relation || 'পিতা')
      setEmergencyContactPhone(boarder.emergency_contact_phone || boarder.guardian_phone || '')
      setEmergencyContactAddress(boarder.emergency_contact_address || boarder.permanent_address || '')

      setErrorMsg(null)
      setIsSuccess(false)
      setIsConfirmDeleteOpen(false)
    }
  }, [boarder, isOpen])

  if (!boarder) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim() || !phoneNumber.trim()) {
      setErrorMsg('বোর্ডারের নাম এবং মোবাইল নম্বর আবশ্যক।')
      return
    }

    try {
      await updateMutation.mutateAsync({
        boarderId: boarder.id,
        fullName,
        phoneNumber,
        email,
        nidPassportNumber,
        institution,
        department,
        studentId,
        guardianName,
        guardianPhone,
        guardianRelation,
        permanentAddress,
        presentAddress,
        status,
        remarks,
        fatherName,
        dateOfBirth,
        maritalStatus,
        religion,
        educationalQualification,
        occupation,
        workplaceAddress,
        passportNumber,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        emergencyContactAddress,
      })

      setIsSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'তথ্য আপডেট করতে ব্যর্থ হয়েছে।'
      setErrorMsg(msg)
    }
  }

  const handleDelete = async () => {
    setErrorMsg(null)
    try {
      await deleteMutation.mutateAsync({ boarderId: boarder.id })
      setIsConfirmDeleteOpen(false)
      onClose()
      navigate('/boarders', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বোর্ডার অপসরণ করতে ব্যর্থ হয়েছে।'
      setErrorMsg(msg)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="বোর্ডার প্রোফাইল সম্পাদন (Edit Boarder Profile)"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>বোর্ডারের তথ্য সফলভাবে আপডেট হয়েছে!</span>
          </div>
        )}

        {/* Boarder Code Banner */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">বোর্ডার আইডি কোড</span>
            <span className="font-mono font-bold text-primary-400 text-sm">
              {boarder.boarder_code}
            </span>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">সদস্য স্ট্যাটাস</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BoarderStatus)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-primary-500"
            >
              <option value="ACTIVE">সক্রিয় (Active)</option>
              <option value="PENDING">অপেক্ষমান (Pending)</option>
              <option value="LEFT">প্রস্থানকৃত (Left)</option>
              <option value="REJECTED">বাতিল (Rejected)</option>
            </select>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
            <User className="w-3.5 h-3.5 text-primary-400" />
            ব্যক্তিগত তথ্য
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="বোর্ডারের পূর্ণ নাম *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="আসল নাম লিখুন"
              required
            />
            <Input
              label="মোবাইল নম্বর *"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="017XXXXXXXX"
              required
            />
            <Input
              label="ইমেইল ঠিকানা"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="boarder@example.com"
            />
            <Input
              label="জাতীয় পরিচয়পত্র / পাসপোর্ট নম্বর"
              value={nidPassportNumber}
              onChange={(e) => setNidPassportNumber(e.target.value)}
              placeholder="NID নম্বর"
            />
          </div>
        </div>

        {/* Section 2: Education / Work */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            শিক্ষা প্রতিষ্ঠান ও কর্মক্ষেত্র
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="প্রতিষ্ঠান / অফিস"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="যেমন: ঢাকা বিশ্ববিদ্যালয়"
            />
            <Input
              label="বিভাগ / পদবী"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="যেমন: অর্থনীতি / কর্মকর্তা"
            />
            <Input
              label="স্টুডেন্ট / অফিস আইডি"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="আইডি নম্বর"
            />
          </div>
        </div>

        {/* Section 3: Guardian Details */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            জরুরি যোগাযোগ ও অভিভাবক
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="অভিভাবকের নাম"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="অভিভাবকের নাম"
            />
            <Input
              label="অভিভাবকের মোবাইল"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
            <Input
              label="সম্পর্ক"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
              placeholder="যেমন: পিতা, মাতা, ভাই"
            />
          </div>
        </div>

        {/* Section 4: Address & Remarks */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            ঠিকানা ও বিশেষ মন্তব্য
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="স্থায়ী ঠিকানা"
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              placeholder="জেলা, থানা, গ্রাম"
            />
            <Input
              label="বর্তমান ঠিকানা"
              value={presentAddress}
              onChange={(e) => setPresentAddress(e.target.value)}
              placeholder="বর্তমান ঠিকানা"
            />
          </div>
          <Input
            label="বিশেষ মন্তব্য / নোট"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="বোর্ডার সংক্রান্ত কোনো বিশেষ তথ্য..."
          />
        </div>

        {/* Section 5: Police Verification & Tenant Registration Form Details */}
        <div className="space-y-3 pt-1 p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 border-b border-cyan-500/20 pb-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            ডিএমপি ভাড়াটিয়া নিবন্ধন ফরম সংক্রান্ত তথ্য
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="পিতার নাম"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              placeholder="পিতার নাম"
            />
            <Input
              label="জন্ম তারিখ"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="বৈবাহিক অবস্থা"
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              placeholder="যেমন: অবিবাহিত / বিবাহিত"
            />
            <Input
              label="ধর্ম"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
              placeholder="যেমন: ইসলাম / হিন্দু"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="পেশা"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="যেমন: শিক্ষার্থী / চাকুরীজীবী"
            />
            <Input
              label="শিক্ষাগত যোগ্যতা"
              value={educationalQualification}
              onChange={(e) => setEducationalQualification(e.target.value)}
              placeholder="যেমন: স্নাতক (সম্মান)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="প্রতিষ্ঠান / কর্মস্থলের পূর্ণ ঠিকানা"
              value={workplaceAddress}
              onChange={(e) => setWorkplaceAddress(e.target.value)}
              placeholder="অফিস বা প্রতিষ্ঠানের ঠিকানা"
            />
            <Input
              label="পাসপোর্ট নম্বর (যদি থাকে)"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              placeholder="পাসপোর্ট নম্বর"
            />
          </div>

          <div className="pt-2 border-t border-cyan-500/20">
            <p className="text-[11px] font-semibold text-cyan-300 mb-2">জরুরী যোগাযোগ (ক্রমিক ১০):</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input
                label="নাম"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="জরুরী ব্যক্তির নাম"
              />
              <Input
                label="সম্পর্ক"
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                placeholder="যেমন: পিতা / ভাই"
              />
              <Input
                label="মোবাইল নম্বর"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="017xxxxxxxx"
              />
            </div>
            <div className="mt-2.5">
              <Input
                label="জরুরী যোগাযোগের ঠিকানা"
                value={emergencyContactAddress}
                onChange={(e) => setEmergencyContactAddress(e.target.value)}
                placeholder="ঠিকানা"
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            {!isConfirmDeleteOpen ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                বোর্ডার মুছে ফেলুন (Delete)
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-semibold">নিশ্চিত?</span>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleDelete}
                  isLoading={deleteMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-500 text-xs py-1 px-2.5"
                >
                  হ্যাঁ, ডিলিট করুন
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsConfirmDeleteOpen(false)}
                  className="text-xs py-1 px-2 text-slate-400"
                >
                  না
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              বাতিল
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={updateMutation.isPending}
              className="bg-primary-600 hover:bg-primary-500 shadow-md shadow-primary-500/20"
            >
              তথ্য সংরক্ষণ করুন
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default EditBoarderModal

import React, { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAccommodation, type RoomWithSeats, type FlatWithRooms, type BuildingWithFlats } from '../api/useAccommodation'
import { useBoarders } from '@/features/boarders/api/useBoarders'
import { useStaffMembers } from '@/features/hr/api/useHR'
import { useAllocateSeatMutation } from '../api/useSeatAllocations'
import { formatCurrencyBn, formatDateBn } from '@/utils/date'
import type { Seat } from '@/types/database'
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient'
import {
  CheckCircle2,
  User,
  AlertCircle,
  BedDouble,
  ShieldCheck,
  Briefcase,
  PlusCircle,
} from 'lucide-react'

interface AllocateSeatModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedSeatId?: string
  preSelectedBoarderId?: string
}

interface AvailableSeat extends Seat {
  occupant_name?: string | null
  buildingName: string
  flatCode: string
  roomName: string
  has_notice_to_vacate?: boolean
  vacate_date?: string | null
  vacant_from_date?: string | null
  has_upcoming_allocation?: boolean
}

export const AllocateSeatModal: React.FC<AllocateSeatModalProps> = ({
  isOpen,
  onClose,
  preSelectedSeatId,
  preSelectedBoarderId,
}) => {
  const { data: seatMatrix = [] } = useAccommodation()
  const { data: allBoarders = [], isLoading: isLoadingBoarders } = useBoarders({ status: 'ALL' })
  const { data: staffMembers = [], isLoading: isLoadingStaff } = useStaffMembers()

  const [allocationType, setAllocationType] = useState<'BOARDER' | 'STAFF'>('BOARDER')

  // Boarder allocation state
  const [selectedBoarderId, setSelectedBoarderId] = useState(preSelectedBoarderId || '')

  // Staff allocation state
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [staffName, setStaffName] = useState<string>('')
  const [staffRole, setStaffRole] = useState<string>('বাবুর্চি / কুক')
  const [staffPhone, setStaffPhone] = useState<string>('')
  const [isNewStaffMode, setIsNewStaffMode] = useState<boolean>(false)

  // Common allocation fields
  const [selectedSeatId, setSelectedSeatId] = useState(preSelectedSeatId || '')
  const [monthlyRent, setMonthlyRent] = useState<number>(0)
  const [securityDeposit, setSecurityDeposit] = useState<number>(5000)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const allocateMutation = useAllocateSeatMutation()

  // Build available seats list from hierarchy (memoized to prevent infinite re-render cycles)
  const availableSeats: AvailableSeat[] = useMemo(() => {
    return (seatMatrix as BuildingWithFlats[])
      .filter((b: BuildingWithFlats) => b.status !== 'INACTIVE')
      .flatMap((b: BuildingWithFlats) =>
        (b.flats || [])
          .filter((f: FlatWithRooms) => f.status !== 'INACTIVE')
          .flatMap((f: FlatWithRooms) =>
            (f.rooms || [])
              .filter((r: RoomWithSeats) => r.status !== 'INACTIVE')
              .flatMap((r: RoomWithSeats) =>
                (r.seats || [])
                  .filter(
                    (s: any) =>
                      (s.status === 'AVAILABLE' && !s.has_upcoming_allocation) ||
                      s.id === preSelectedSeatId ||
                      (s.has_notice_to_vacate && !s.has_upcoming_allocation)
                  )
                  .map((s: any) => ({
                    ...s,
                    buildingName: b.name,
                    flatCode: f.flat_code,
                    roomName: r.name,
                  }))
              )
          )
      )
  }, [seatMatrix, preSelectedSeatId])

  // Selected seat object
  const selectedSeat = useMemo(() => {
    return availableSeats.find((s) => s.id === selectedSeatId) || null
  }, [selectedSeatId, availableSeats])

  // Eligible boarders: Either active boarder without a seat, or pending applicant awaiting allocation
  const eligibleBoarders = useMemo(() => {
    return allBoarders.filter(
      (b) =>
        b.id === preSelectedBoarderId ||
        (b.status === 'ACTIVE' && !b.active_allocation) ||
        b.status === 'PENDING'
    )
  }, [allBoarders, preSelectedBoarderId])

  // Form initialization
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setIsSuccess(false)
      setSelectedSeatId(preSelectedSeatId || '')
      setSelectedBoarderId(preSelectedBoarderId || '')
      setAllocationType('BOARDER')
      setSelectedStaffId('')
      setStaffName('')
      setStaffPhone('')
      setIsNewStaffMode(false)
    }
  }, [isOpen, preSelectedSeatId, preSelectedBoarderId])

  // Automatically update default rent and suggested start date when selected seat changes
  useEffect(() => {
    if (selectedSeat) {
      if (allocationType === 'BOARDER') {
        if (selectedSeat.default_rent) {
          setMonthlyRent(selectedSeat.default_rent)
        }
      } else {
        setMonthlyRent(0)
      }
      if (selectedSeat.has_notice_to_vacate && selectedSeat.vacant_from_date) {
        setStartDate(selectedSeat.vacant_from_date)
      }
    }
  }, [selectedSeat, allocationType])

  const handleSeatChange = (seatId: string) => {
    setSelectedSeatId(seatId)
    const seat = availableSeats.find((s) => s.id === seatId)
    if (seat) {
      if (allocationType === 'BOARDER') {
        setMonthlyRent(seat.default_rent)
      } else {
        setMonthlyRent(0)
      }
      if (seat.has_notice_to_vacate && seat.vacant_from_date) {
        setStartDate(seat.vacant_from_date)
      }
    }
  }

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId)
    if (staffId === 'NEW') {
      setIsNewStaffMode(true)
      setStaffName('')
      setStaffRole('বাবুর্চি / কুক')
      setStaffPhone('')
      setRemarks('হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা) - বাবুর্চি')
      return
    }
    setIsNewStaffMode(false)
    const st = staffMembers.find((s) => s.id === staffId)
    if (st) {
      setStaffName(st.full_name)
      const deptLabel =
        st.department === 'KITCHEN'
          ? 'বাবুর্চি / কিচেন স্টাফ'
          : st.department === 'CLEANING'
          ? 'ক্লিনার / পরিচ্ছন্নতাকর্মী'
          : st.department === 'MAINTENANCE'
          ? 'রক্ষণাবেক্ষণ কর্মী'
          : st.department === 'SECURITY'
          ? 'নিরাপত্তা প্রহরী (গার্ড)'
          : 'হোস্টেল স্টাফ'
      setStaffRole(deptLabel)
      setStaffPhone(st.phone_number || '')
      setRemarks(`হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা) - ${deptLabel}`)
    }
  }

  const handleTypeChange = (type: 'BOARDER' | 'STAFF') => {
    setAllocationType(type)
    setErrorMsg(null)
    if (type === 'STAFF') {
      setMonthlyRent(0)
      setSecurityDeposit(0)
      setRemarks('হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা)')
      if (staffMembers.length > 0 && !selectedStaffId) {
        handleStaffSelect(staffMembers[0].id)
      } else if (staffMembers.length === 0) {
        setIsNewStaffMode(true)
        setStaffRole('বাবুর্চি / কুক')
      }
    } else {
      if (selectedSeat?.default_rent) {
        setMonthlyRent(selectedSeat.default_rent)
      } else {
        setMonthlyRent(4500)
      }
      setSecurityDeposit(5000)
      setRemarks('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!selectedSeatId) {
      setErrorMsg('অনুগ্রহ করে একটি খালি সিট নির্বাচন করুন।')
      return
    }

    try {
      if (allocationType === 'BOARDER') {
        if (!selectedBoarderId) {
          setErrorMsg('অনুগ্রহ করে একজন সক্রিয় বর্ডার বা অপেক্ষমান আবেদনকারী নির্বাচন করুন।')
          return
        }
        if (monthlyRent <= 0) {
          setErrorMsg('আবাসিক বর্ডারের ক্ষেত্রে মাসিক সিট ভাড়া অবশ্যই ০ এর চেয়ে বেশি হতে হবে।')
          return
        }

        await allocateMutation.mutateAsync({
          boarderId: selectedBoarderId,
          seatId: selectedSeatId,
          monthlyRent,
          securityDeposit,
          startDate,
          remarks: remarks.trim() || undefined,
        })
      } else {
        // Staff Free Accommodation Mode
        const finalStaffName = staffName.trim()
        if (!finalStaffName) {
          setErrorMsg('অনুগ্রহ করে কর্মচারীর পূর্ণ নাম উল্লেখ করুন বা তালিকা থেকে নির্বাচন করুন।')
          return
        }

        let targetBoarderId = ''
        const effectivePhone = staffPhone.trim() || '01700000000'

        if (isSupabaseConfigured) {
          // Check if boarder record already exists for this staff member
          const { data: existingBdr } = await supabase
            .from('boarders')
            .select('id, status')
            .or(`phone_number.eq.${effectivePhone},full_name.ilike.%${finalStaffName}%`)
            .maybeSingle()

          if (existingBdr) {
            targetBoarderId = existingBdr.id
            await supabase
              .from('boarders')
              .update({
                status: 'ACTIVE',
                institution: `হোস্টেল কর্মচারী (${staffRole})`,
                department: staffRole,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingBdr.id)
          } else {
            // Create a dedicated staff resident record
            const staffCode = `STF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
            const { data: newBdr, error: bdrErr } = await supabase
              .from('boarders')
              .insert({
                full_name: finalStaffName,
                phone_number: effectivePhone,
                boarder_code: staffCode,
                institution: `হোস্টেল কর্মচারী (${staffRole})`,
                department: staffRole,
                guardian_name: 'হোস্টেল কর্তৃপক্ষ',
                guardian_phone: effectivePhone,
                permanent_address: 'হোস্টেল স্টাফ আবাসন',
                status: 'ACTIVE',
                admission_date: startDate || new Date().toISOString().slice(0, 10),
                remarks: remarks.trim() || `হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা) - ${staffRole}`,
              })
              .select('id')
              .single()

            if (bdrErr || !newBdr) {
              throw new Error(bdrErr?.message || 'কর্মচারীর তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।')
            }
            targetBoarderId = newBdr.id
          }
        } else {
          // Mock mode fallback ID
          targetBoarderId = selectedStaffId && selectedStaffId !== 'NEW' ? selectedStaffId : `stf-${Date.now()}`
        }

        // Allocate seat with 0 rent and 0 deposit
        await allocateMutation.mutateAsync({
          boarderId: targetBoarderId,
          seatId: selectedSeatId,
          monthlyRent: 0,
          securityDeposit: 0,
          startDate,
          remarks: remarks.trim() || `হোস্টেল কর্মচারী আবাসন (ফ্রি সুবিধা) - ${staffRole}`,
        })
      }

      setIsSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'সিট বরাদ্দ ব্যর্থ হয়েছে।'
      setErrorMsg(errorMessage)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="নতুন সিট বরাদ্দ সম্পন্ন করুন (Seat Allocation)"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              {allocationType === 'STAFF'
                ? "কর্মচারী সিট বরাদ্দ সফলভাবে সম্পন্ন হয়েছে! সিটের স্ট্যাটাস 'OCCUPIED' হলো এবং মাসিক ভাড়া ৳০ (ফ্রি আবাসন) হিসেবে ধার্য হয়েছে।"
                : "সিট বরাদ্দ সফলভাবে সম্পন্ন হয়েছে! সিটের স্ট্যাটাস 'OCCUPIED' এ পরিবর্তিত হলো।"}
            </span>
          </div>
        )}

        {/* Allocation Type Switcher (Boarder vs Staff) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 block">
            বরাদ্দের ধরন নির্বাচন করুন:
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('BOARDER')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                allocationType === 'BOARDER'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>👤 সাধারণ আবাসিক বর্ডার (ভাড়া প্রযোজ্য)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('STAFF')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                allocationType === 'STAFF'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>🛠️ হোস্টেল কর্মচারী / স্টাফ (ফ্রি আবাসন)</span>
            </button>
          </div>
        </div>

        {/* STAFF MODE NOTIFICATION BANNER */}
        {allocationType === 'STAFF' && (
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>কর্মচারী ফ্রি আবাসন সুবিধা (ভাড়া ও বকেয়া মুক্ত)</span>
            </div>
            <p className="text-[11.5px] text-slate-300 leading-relaxed">
              এই সিটটি সিস্টেমে <strong>'OCCUPIED' (পূর্ণ)</strong> হিসেবে সংরক্ষিত থাকবে এবং হোস্টেল অকুপেন্সি রেটে গণনা হবে (ফাঁকা দেখাবে না)। যেহেতু এটি কর্মচারী আবাসন, তাই মাসিক ভাড়া <strong>৳০</strong> হিসেবে গণ্য হবে এবং মাসিক ব্যাচ বিলিংয়ে কোনো বিল বা বকেয়া তৈরি হবে না।
            </p>
          </div>
        )}

        {/* BOARDER SELECTION (When in BOARDER mode) */}
        {allocationType === 'BOARDER' && (
          <div className="space-y-1.5">
            <label htmlFor="boarder-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary-400" />
              বর্ডার নির্বাচন করুন <span className="text-rose-400">*</span>
            </label>
            <select
              id="boarder-select"
              value={selectedBoarderId}
              onChange={(e) => setSelectedBoarderId(e.target.value)}
              disabled={Boolean(preSelectedBoarderId)}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-primary-500"
            >
              <option value="">বর্ডার নির্বাচন করুন...</option>
              {eligibleBoarders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name} ({b.boarder_code}) — {b.status === 'PENDING' ? '⏳ অপেক্ষমান আবেদন' : '✅ সক্রিয় বোর্ডার'} — {b.phone_number}
                </option>
              ))}
            </select>
            {isLoadingBoarders && (
              <p className="text-[11px] text-slate-400 mt-1">বর্ডার তালিকা লোড হচ্ছে...</p>
            )}
            {!isLoadingBoarders && eligibleBoarders.length === 0 && (
              <p className="text-[11px] text-amber-400 mt-1">
                বর্তমানে বরাদ্দহীন কোনো সক্রিয় বর্ডার বা অপেক্ষমান আবেদনকারী নেই।
              </p>
            )}
          </div>
        )}

        {/* STAFF SELECTION & INFORMATION (When in STAFF mode) */}
        {allocationType === 'STAFF' && (
          <div className="space-y-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                কর্মচারী নির্বাচন বা এন্ট্রি <span className="text-rose-400">*</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewStaffMode(false)
                    if (staffMembers.length > 0) handleStaffSelect(staffMembers[0].id)
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    !isNewStaffMode
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  স্টাফ তালিকা থেকে
                </button>
                <button
                  type="button"
                  onClick={() => handleStaffSelect('NEW')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-colors ${
                    isNewStaffMode
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-3 h-3" />
                  নতুন কর্মচারী
                </button>
              </div>
            </div>

            {!isNewStaffMode ? (
              <div className="space-y-2">
                <select
                  value={selectedStaffId}
                  onChange={(e) => handleStaffSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="">কর্মচারী নির্বাচন করুন...</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.staff_code}) — {s.department} — {s.phone_number || 'ফোন নম্বর নেই'}
                    </option>
                  ))}
                  <option value="NEW">➕ অন্য কর্মচারী (ম্যানুয়াল এন্ট্রি)</option>
                </select>
                {isLoadingStaff && (
                  <p className="text-[11px] text-slate-400">স্টাফ তালিকা লোড হচ্ছে...</p>
                )}
                {!isLoadingStaff && staffMembers.length === 0 && (
                  <p className="text-[11px] text-amber-400">
                    এইচআর মডিউলে কোনো স্টাফ পাওয়া যায়নি। নিচের অপশনে নাম লিখে নতুন এন্ট্রি দিন।
                  </p>
                )}
              </div>
            ) : null}

            {/* Editable or review staff details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <Input
                label="কর্মচারীর পূর্ণ নাম"
                value={staffName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStaffName(e.target.value)}
                placeholder="যেমন: মোঃ করিম (বাবুর্চি)"
                required
                className="text-xs"
              />
              <Input
                label="পদবী / দায়িত্ব"
                value={staffRole}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStaffRole(e.target.value)}
                placeholder="যেমন: হেড বাবুর্চি, ক্লিনার"
                required
                className="text-xs"
              />
              <Input
                label="মোবাইল নম্বর"
                value={staffPhone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStaffPhone(e.target.value)}
                placeholder="যেমন: 017XXXXXXXX"
                className="text-xs"
              />
            </div>
          </div>
        )}

        {/* Seat Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <BedDouble className="w-3.5 h-3.5 text-indigo-400" />
            খালি সিট নির্বাচন করুন <span className="text-rose-400">*</span>
          </label>
          <select
            value={selectedSeatId}
            onChange={(e) => handleSeatChange(e.target.value)}
            disabled={Boolean(preSelectedSeatId)}
            className="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="">সিট নির্বাচন করুন...</option>
            {availableSeats.map((s) => (
              <option key={s.id} value={s.id}>
                {s.seat_code} — {s.seat_name} ({s.flatCode}, {s.roomName}) — {formatCurrencyBn(s.default_rent)}
                {s.has_notice_to_vacate ? ` [${formatDateBn(s.vacant_from_date || '')} থেকে খালি]` : ''}
              </option>
            ))}
          </select>
          {selectedSeat?.has_notice_to_vacate && (
            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2 mt-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-0.5">
                <span className="font-semibold block">অগ্রিম বরাদ্দ (Advance Booking):</span>
                <span className="text-[11px] text-slate-300 block leading-relaxed">
                  এই সিটে বর্তমানে <strong>{selectedSeat.occupant_name || 'বর্তমান বর্ডার'}</strong> অবস্থান করছেন এবং <strong>{formatDateBn(selectedSeat.vacate_date || '')}</strong> তারিখে প্রস্থান করবেন। তাই নতুন বরাদ্দের জন্য <strong>{formatDateBn(selectedSeat.vacant_from_date || '')}</strong> তারিখ থেকে বরাদ্দ প্রদান করা হচ্ছে।
                </span>
              </div>
            </div>
          )}
          {availableSeats.length === 0 && (
            <p className="text-[11px] text-rose-400 mt-1">হোস্টেলে বর্তমানে কোনো খালি বা বরাদ্দযোগ্য সিট নেই।</p>
          )}
        </div>

        {/* Rent & Security Deposit */}
        {allocationType === 'BOARDER' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              type="number"
              label="মাসিক চুক্তিকৃত ভাড়া (৳)"
              value={monthlyRent || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMonthlyRent(Number(e.target.value))}
              placeholder="যেমন: ৪৫০০"
              required
              className="text-xs"
            />
            <Input
              type="number"
              label="সিকিউরিটি ডিপোজিট (৳)"
              value={securityDeposit || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecurityDeposit(Number(e.target.value))}
              placeholder="যেমন: ৫০০০"
              className="text-xs"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/20">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                মাসিক সিট ভাড়া (৳)
              </label>
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-mono font-bold">
                <span>৳০ (কর্মচারী ফ্রি আবাসন সুবিধা)</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (ডিফল্ট: {selectedSeat ? formatCurrencyBn(selectedSeat.default_rent) : '৳০'})
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                নিরাপত্তা জামানত / সিকিউরিটি (৳)
              </label>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs font-mono">
                ৳০ (কর্মচারীদের প্রযোজ্য নয়)
              </div>
            </div>
          </div>
        )}

        {/* Start Date & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label={selectedSeat?.has_notice_to_vacate ? 'অগ্রিম বরাদ্দ শুরুর তারিখ' : 'বরাদ্দ শুরুর তারিখ'}
            value={startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
            min={selectedSeat?.has_notice_to_vacate && selectedSeat.vacant_from_date ? selectedSeat.vacant_from_date : undefined}
            required
            className="text-xs"
          />
          <Input
            label="মন্তব্য / বিশেষ শর্তাবলী"
            value={remarks}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarks(e.target.value)}
            placeholder={allocationType === 'STAFF' ? 'হোস্টেল কর্মচারী আবাসন (ফ্রি)' : 'যেমন: উইন্ডো সাইড শর্তযুক্ত'}
            className="text-xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={allocateMutation.isPending}>
            বাতিল
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={allocateMutation.isPending}
            disabled={
              allocationType === 'BOARDER'
                ? !selectedBoarderId || !selectedSeatId
                : !staffName.trim() || !selectedSeatId
            }
            className={allocationType === 'STAFF' ? 'bg-purple-600 hover:bg-purple-500 text-white' : ''}
          >
            {allocationType === 'STAFF' ? 'কর্মচারী সিট বরাদ্দ নিশ্চিত করুন' : 'সিট বরাদ্দ নিশ্চিত করুন'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export default AllocateSeatModal

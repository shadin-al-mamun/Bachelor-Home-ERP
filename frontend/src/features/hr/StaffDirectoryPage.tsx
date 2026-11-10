import React, { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Building,
  Phone,
  Briefcase,
  DollarSign,
  CheckCircle2,
  XCircle,
  X,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useStaffMembers, useCreateStaffMember, useUpdateStaffMember } from './api/useHR'
import { useBuildings } from '@/features/accommodation/api/useAccommodation'
import type { StaffMember, StaffDepartment, CreateStaffMemberParams } from '@/types/hr'

const DEPARTMENTS: { value: StaffDepartment; label: string }[] = [
  { value: 'KITCHEN', label: 'কিচেন ও খাবার (Kitchen)' },
  { value: 'CLEANING', label: 'পরিচ্ছন্নতা (Cleaning)' },
  { value: 'SECURITY', label: 'নিরাপত্তা ও গার্ড (Security)' },
  { value: 'MAINTENANCE', label: 'রক্ষণাবেক্ষণ (Maintenance)' },
  { value: 'MANAGEMENT', label: 'ব্যবস্থাপনা (Management)' },
  { value: 'OTHER', label: 'অন্যান্য (Other)' },
]

export const StaffDirectoryPage: React.FC = () => {
  const { data: staffList = [], isLoading, refetch } = useStaffMembers()
  const { data: buildings = [] } = useBuildings()
  const createMutation = useCreateStaffMember()
  const updateMutation = useUpdateStaffMember()

  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)

  // Form State
  const [formData, setFormData] = useState<CreateStaffMemberParams>({
    full_name: '',
    phone_number: '',
    emergency_contact: '',
    designation: '',
    department: 'KITCHEN',
    nid_number: '',
    avatar_url: '',
    assigned_building_id: '',
    assigned_flat_id: '',
    joining_date: new Date().toISOString().slice(0, 10),
    monthly_salary: 0,
    payment_method: 'CASH',
    bank_or_mfs_account: '',
    notes: '',
  })

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.staff_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone_number?.includes(search) ||
        s.designation?.toLowerCase().includes(search.toLowerCase())

      const matchDept = selectedDept === 'ALL' || s.department === selectedDept
      return matchSearch && matchDept
    })
  }, [staffList, search, selectedDept])

  // Summary Metrics
  const totalStaff = staffList.length
  const activeStaff = staffList.filter((s) => s.is_active).length
  const totalSalaryBudget = staffList
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + (Number(s.monthly_salary) || 0), 0)
  const kitchenStaff = staffList.filter((s) => s.is_active && s.department === 'KITCHEN').length

  const handleOpenAdd = () => {
    setEditingStaff(null)
    setFormData({
      full_name: '',
      phone_number: '',
      emergency_contact: '',
      designation: '',
      department: 'KITCHEN',
      nid_number: '',
      avatar_url: '',
      assigned_building_id: buildings[0]?.id || '',
      assigned_flat_id: '',
      joining_date: new Date().toISOString().slice(0, 10),
      monthly_salary: 0,
      payment_method: 'CASH',
      bank_or_mfs_account: '',
      notes: '',
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff)
    setFormData({
      full_name: staff.full_name,
      phone_number: staff.phone_number,
      emergency_contact: staff.emergency_contact || '',
      designation: staff.designation,
      department: staff.department,
      nid_number: staff.nid_number || '',
      avatar_url: staff.avatar_url || '',
      assigned_building_id: staff.assigned_building_id || '',
      assigned_flat_id: staff.assigned_flat_id || '',
      joining_date: staff.joining_date || new Date().toISOString().slice(0, 10),
      monthly_salary: staff.monthly_salary,
      payment_method: staff.payment_method || 'CASH',
      bank_or_mfs_account: staff.bank_or_mfs_account || '',
      notes: staff.notes || '',
    })
    setIsAddModalOpen(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.phone_number.trim() || !formData.designation.trim()) {
      alert('কর্মচারীর নাম, মোবাইল ও পদবী অবশ্যই পূরণ করতে হবে।')
      return
    }

    try {
      if (editingStaff) {
        await updateMutation.mutateAsync({
          id: editingStaff.id,
          updates: {
            ...formData,
            monthly_salary: Number(formData.monthly_salary) || 0,
          },
        })
      } else {
        await createMutation.mutateAsync({
          ...formData,
          monthly_salary: Number(formData.monthly_salary) || 0,
        })
      }
      setIsAddModalOpen(false)
      refetch()
    } catch (err: any) {
      alert(err.message || 'কর্মচারী সংরক্ষণ করতে ব্যর্থ হয়েছে।')
    }
  }

  const handleToggleActive = async (staff: StaffMember) => {
    const nextStatus = !staff.is_active
    const confirmMsg = nextStatus
      ? `আপনি কি ${staff.full_name}-কে পুনরায় সক্রিয় করতে চান?`
      : `আপনি কি ${staff.full_name}-কে নিষ্ক্রিয় করতে চান?`

    if (window.confirm(confirmMsg)) {
      await updateMutation.mutateAsync({
        id: staff.id,
        updates: { is_active: nextStatus },
      })
      refetch()
    }
  }

  const formatDept = (dept: string) => {
    switch (dept) {
      case 'KITCHEN':
        return 'কিচেন ও খাবার'
      case 'CLEANING':
        return 'পরিচ্ছন্নতা'
      case 'SECURITY':
        return 'নিরাপত্তা ও গার্ড'
      case 'MAINTENANCE':
        return 'রক্ষণাবেক্ষণ'
      case 'MANAGEMENT':
        return 'ব্যবস্থাপনা'
      default:
        return 'অন্যান্য'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight">
              কর্মকর্তা ও কর্মচারী ডিরেক্টরি
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
              HR & Staff
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            বাবুর্চি, সহকারী বাবুর্চি, পরিচ্ছন্নতাকর্মী, গার্ড ও কর্মকর্তাদের প্রোফাইল ও বেতন ব্যবস্থাপনা।
          </p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs gap-2 px-4 py-2.5 rounded-xl shadow-lg shadow-primary-500/20"
        >
          <UserPlus className="w-4 h-4" />
          নতুন কর্মী যুক্ত করুন
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">মোট কর্মী সংখ্যা</span>
            <span className="text-2xl font-black font-mono text-white mt-0.5 block">{totalStaff} জন</span>
            <span className="text-[11px] text-emerald-400 font-semibold">{activeStaff} জন সক্রিয় কর্মী</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">মাসিক বেতন বাজেট</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              ৳{totalSalaryBudget.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400">নির্ধারিত মাসিক মূল বেতন</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">কিচেন ও খাবার স্টাফ</span>
            <span className="text-2xl font-black font-mono text-amber-300 mt-0.5 block">{kitchenStaff} জন</span>
            <span className="text-[11px] text-slate-400">প্রধান ও সহকারী বাবুর্চি</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 block">পরিচ্ছন্নতা ও সিকিউরিটি</span>
            <span className="text-2xl font-black font-mono text-cyan-400 mt-0.5 block">
              {staffList.filter((s) => s.is_active && (s.department === 'CLEANING' || s.department === 'SECURITY')).length} জন
            </span>
            <span className="text-[11px] text-slate-400">খালা ও গার্ড স্টাফ</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <BadgeCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="নাম, মোবাইল, কোড বা পদবী দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedDept('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedDept === 'ALL'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            সকল বিভাগ ({staffList.length})
          </button>
          {DEPARTMENTS.map((d) => (
            <button
              key={d.value}
              onClick={() => setSelectedDept(d.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDept === d.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {d.label.split(' ')[0]} ({staffList.filter((s) => s.department === d.value).length})
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">কর্মচারী তালিকা লোড হচ্ছে...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">কোনো কর্মচারী পাওয়া যায়নি।</p>
          <p className="text-xs text-slate-500 mt-1">অনুসন্ধান ফিল্টার পরিবর্তন করুন অথবা নতুন কর্মী যুক্ত করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className={`p-5 rounded-2xl border transition-all ${
                staff.is_active
                  ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-rose-950/40 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600/30 to-indigo-600/20 border border-primary-500/30 flex items-center justify-center text-white font-bold text-base shrink-0">
                    {staff.avatar_url ? (
                      <img src={staff.avatar_url} alt={staff.full_name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      staff.full_name.slice(0, 1)
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{staff.full_name}</span>
                      {staff.is_active ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </h3>
                    <p className="text-xs text-primary-400 font-medium">{staff.designation}</p>
                    <span className="text-[10px] font-mono text-slate-500">{staff.staff_code}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    staff.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {staff.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> বিভাগ:
                  </span>
                  <span className="font-semibold text-slate-200">{formatDept(staff.department)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> মোবাইল:
                  </span>
                  <span className="font-mono text-slate-200">{staff.phone_number}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> মাসিক মূল বেতন:
                  </span>
                  <span className="font-bold font-mono text-emerald-400 text-sm">
                    ৳{Number(staff.monthly_salary).toLocaleString('en-IN')}
                  </span>
                </div>

                {staff.assigned_building && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" /> ডিউটি ভবন:
                    </span>
                    <span className="text-slate-300 truncate max-w-[150px]">{staff.assigned_building.name}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(staff)}
                  className={`text-[11px] h-8 px-2.5 rounded-lg font-semibold ${
                    staff.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {staff.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(staff)}
                  className="text-[11px] h-8 px-3 rounded-lg font-semibold bg-slate-800/60 hover:bg-slate-800 text-slate-200"
                >
                  সম্পাদনা করুন
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-400" />
                {editingStaff ? 'কর্মচারী তথ্য সম্পাদনা' : 'নতুন কর্মচারী সংযোজন'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    পুরো নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: মো. রফিকুল ইসলাম"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    মোবাইল নম্বর <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    পদবী <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: প্রধান বাবুর্চি"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    বিভাগ (Department) <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as StaffDepartment })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    মাসিক মূল বেতন (টাকা) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="যেমন: 12000"
                    value={formData.monthly_salary || ''}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    যোগদানের তারিখ
                  </label>
                  <input
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    জাতীয় পরিচয়পত্র নম্বর (NID)
                  </label>
                  <input
                    type="text"
                    placeholder="এনআইডি নম্বর"
                    value={formData.nid_number}
                    onChange={(e) => setFormData({ ...formData, nid_number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    জরুরি যোগাযোগ (মোবাইল)
                  </label>
                  <input
                    type="text"
                    placeholder="অভিভাবক/নিকটাত্মীয়ের নম্বর"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    ডিউটি ভবন (ঐচ্ছিক)
                  </label>
                  <select
                    value={formData.assigned_building_id}
                    onChange={(e) => setFormData({ ...formData, assigned_building_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  >
                    <option value="">সকল ভবন / প্রযোজ্য নয়</option>
                    {buildings.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    পেমেন্ট মেথড
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                  >
                    <option value="CASH">ক্যাশ (নগদ)</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="BANK">ব্যাংক ট্রান্সফার</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  মন্তব্য / বিশেষ বিবরণ (ঐচ্ছিক)
                </label>
                <textarea
                  rows={2}
                  placeholder="অন্যান্য তথ্য লিখুন..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  বাতিল
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-4"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'সংরক্ষণ হচ্ছে...'
                    : editingStaff
                    ? 'আপডেট করুন'
                    : 'সংরক্ষণ করুন'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default StaffDirectoryPage

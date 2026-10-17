import React, { useState } from 'react'
import {
  Users,
  Search,
  Filter,
  Building2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import {
  useUsersList,
  useUpdateUserRoleAndStatus,
  type UserManagementItem,
} from './api/useUserManagement'
import { FlatAssignmentModal } from './components/FlatAssignmentModal'
import { useAuthStore } from '../../app/store/useAuthStore'
import { Navigate, Link } from 'react-router-dom'
import type { UserRole } from '../../types/database'

const SYSTEM_ROLES: { role: UserRole; label: string; desc: string; badgeColor: string }[] = [
  { role: 'SUPER_ADMIN', label: 'সুপার অ্যাডমিন / Super Admin', desc: 'Full System Control', badgeColor: 'bg-purple-950 text-purple-300 border-purple-800' },
  { role: 'ADMIN', label: 'অ্যাডমিন / Admin', desc: 'Hostel Operations & Management', badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800' },
  { role: 'MANAGER', label: 'ম্যানেজার / Manager', desc: 'Cash Custody & Shift Ops', badgeColor: 'bg-blue-950 text-blue-300 border-blue-800' },
  { role: 'ACCOUNTANT', label: 'অ্যাকাউন্ট্যান্ট / Accountant', desc: 'Vouchers & Financial Approvals', badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { role: 'MEAL_OPERATOR', label: 'মিল অপারেটর / Meal Operator', desc: 'Kitchen & Meal Overrides', badgeColor: 'bg-amber-950 text-amber-300 border-amber-800' },
  { role: 'BOARDER', label: 'বর্ডার / Resident Boarder', desc: 'Room Allocation & Self Service', badgeColor: 'bg-teal-950 text-teal-300 border-teal-800' },
  { role: 'APPLICANT', label: 'আবেদনকারী / Applicant', desc: 'Self-Registered Awaiting Approval', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700' },
  { role: 'AUDITOR', label: 'নিরীক্ষক / Auditor', desc: 'Read-only Audit & Compliance', badgeColor: 'bg-rose-950 text-rose-300 border-rose-800' },
]

export const UserManagementPage: React.FC = () => {
  const { profile: currentUser } = useAuthStore()

  // RBAC: Only SUPER_ADMIN can administer roles and user assignments
  if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
    return <Navigate to="/unauthorized" replace />
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [selectedUserForFlats, setSelectedUserForFlats] = useState<UserManagementItem | null>(null)

  const { data: users, isLoading } = useUsersList(searchQuery, roleFilter)
  const updateRoleMutation = useUpdateUserRoleAndStatus()

  const handleRoleChange = async (user: UserManagementItem, newRole: UserRole) => {
    if (user.id === currentUser?.id) {
      alert('আপনি নিজের সুপার অ্যাডমিন রোল পরিবর্তন করতে পারবেন না।')
      return
    }
    await updateRoleMutation.mutateAsync({
      userId: user.id,
      role: newRole,
      isActive: user.is_active,
    })
  }

  const handleStatusToggle = async (user: UserManagementItem) => {
    if (user.id === currentUser?.id) {
      alert('আপনি নিজের অ্যাকাউন্ট নিষ্ক্রিয় করতে পারবেন না।')
      return
    }
    await updateRoleMutation.mutateAsync({
      userId: user.id,
      role: user.role,
      isActive: !user.is_active,
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              RBAC & GOVERNANCE ADMINISTRATION
            </span>
            <span className="text-xs text-slate-500">• Section 11</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-8 h-8 text-indigo-400" />
            <span>ইউজার রোল ও ফ্ল্যাট পারমিশন</span>
            <span className="text-slate-500 font-light text-xl">| User Management</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            সিস্টেম ব্যবহারকারীদের রোল আপগ্রেড, সক্রিয়করণ এবং নির্দিষ্ট ফ্ল্যাট ব্যবহারের অধিকার প্রদান
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-right">
          <span className="text-[10px] uppercase font-semibold text-slate-500 block">মোট নিবন্ধিত ইউজার</span>
          <span className="text-lg font-bold text-slate-100 font-mono">
            {(users ?? []).length} জন
          </span>
        </div>
      </div>

      {/* Governance Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Link
          to="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          <span>ইউজার ও রোল পারমিশন (Users & Roles)</span>
        </Link>
        <Link
          to="/settings/audit-logs"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>সিস্টেম অডিট ট্রেইল (Audit Logs)</span>
        </Link>
      </div>

      {/* 2. Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="নাম, ফোন বা ইমেইল দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">সকল রোল (All Roles)</option>
            {SYSTEM_ROLES.map((r) => (
              <option key={r.role} value={r.role}>
                {r.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Users Table */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ইউজারের নাম ও প্রোফাইল</th>
                <th className="py-3 px-4">যোগাযোগ (Contact)</th>
                <th className="py-3 px-4">বর্তমান রোল (System Role)</th>
                <th className="py-3 px-4">অ্যাসাইনকৃত ফ্ল্যাটসমূহ</th>
                <th className="py-3 px-4 text-center">অ্যাকাউন্ট স্থিতি</th>
                <th className="py-3 px-4 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
                    <p>ইউজার তালিকা লোড হচ্ছে...</p>
                  </td>
                </tr>
              ) : (users ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    কোনো ইউজার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                users!.map((u, i) => {
                  const roleConfig = SYSTEM_ROLES.find((r) => r.role === u.role)
                  const canAssignFlats = ['MANAGER', 'MEAL_OPERATOR', 'ADMIN'].includes(u.role)
                  const assignedCount = u.assigned_flats?.length || 0

                  return (
                    <tr key={u.id} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block">{u.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="text-slate-300">{u.email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.phone_number || '—'}</div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          disabled={updateRoleMutation.isPending || u.id === currentUser?.id}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-slate-900 ${
                            roleConfig?.badgeColor || 'border-slate-700 text-slate-300'
                          }`}
                        >
                          {SYSTEM_ROLES.map((r) => (
                            <option key={r.role} value={r.role} className="bg-slate-900 text-slate-200">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Assigned Flats */}
                      <td className="py-3 px-4">
                        {canAssignFlats ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {assignedCount} টি ফ্ল্যাট
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedUserForFlats(u)}
                              className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 underline"
                            >
                              পরিবর্তন করুন
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">প্রযোজ্য নয় (Global / Resident)</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(u)}
                          disabled={u.id === currentUser?.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                            u.is_active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-emerald-950/80 hover:text-emerald-300 hover:border-emerald-800'
                          }`}
                          title="Click to toggle active/inactive"
                        >
                          {u.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>সক্রিয় (Active)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>নিষ্ক্রিয় (Blocked)</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {canAssignFlats && (
                          <button
                            type="button"
                            onClick={() => setSelectedUserForFlats(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
                              bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40
                              transition-colors"
                          >
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>ফ্ল্যাট দায়িত্ব</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Flat Assignment Modal */}
      {selectedUserForFlats && (
        <FlatAssignmentModal
          user={selectedUserForFlats}
          onClose={() => setSelectedUserForFlats(null)}
        />
      )}
    </div>
  )
}
export default UserManagementPage

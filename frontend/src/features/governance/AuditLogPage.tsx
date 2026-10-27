import React, { useState } from 'react'
import {
  ShieldAlert,
  Filter,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Database,
  User,
  Activity,
  Users,
  Sparkles,
  KeyRound,
  FileText,
} from 'lucide-react'
import { useAuditLogs, useAuditActors, type AuditLogItem, type AuditLogFilters } from './api/useAuditLogs'
import { AuditDiffModal } from './components/AuditDiffModal'
import { useAuthStore } from '../../app/store/useAuthStore'
import { Navigate, Link } from 'react-router-dom'

export const AuditLogPage: React.FC = () => {
  const { profile } = useAuthStore()

  const [filters, setFilters] = useState<AuditLogFilters>({
    tableName: 'ALL',
    action: 'ALL',
    actorId: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 25,
  })

  const [selectedLogForDiff, setSelectedLogForDiff] = useState<AuditLogItem | null>(null)

  const { data, isLoading } = useAuditLogs(filters)
  const { data: actors } = useAuditActors()

  // Governance RBAC check: only SUPER_ADMIN and AUDITOR can access immutable system audit logs
  if (profile && profile.role !== 'SUPER_ADMIN' && profile.role !== 'AUDITOR') {
    return <Navigate to="/unauthorized" replace />
  }

  const totalPages = Math.ceil((data?.totalCount || 0) / (filters.pageSize || 25))

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              IMMUTABLE APPEND-ONLY AUDIT TRAIL
            </span>
            <span className="text-xs text-slate-500">• Section 11 Governance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
            <span>সিস্টেম অডিট ট্রেইল</span>
            <span className="text-slate-500 font-light text-xl">| Audit Logs</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            সিস্টেমে কে, কখন, কোন আইপি থেকে কী ডাটা পরিবর্তন করেছে তার সম্পূর্ণ অপরিবর্তনশীল ট্র্যাকিং
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">মোট অডিট রেকর্ড</span>
            <span className="text-lg font-bold text-slate-100 font-mono">
              {(data?.totalCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Governance Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <Link
          to="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>ইউজার ও রোল পারমিশন</span>
        </Link>
        <Link
          to="/settings/branding"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          <span>হোস্টেল লোগো ও ব্র্যান্ডিং ব্যবস্থাপনা</span>
        </Link>
        <Link
          to="/settings/audit-logs"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 whitespace-nowrap"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>সিস্টেম অডিট ট্রেইল</span>
        </Link>
        <Link
          to="/settings/tenant-form"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-cyan-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>ভাড়াটিয়া নিবন্ধন ফরম</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
            DMP
          </span>
        </Link>
        {profile?.role === 'SUPER_ADMIN' && (
          <Link
            to="/settings/access-control"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>এক্সেস কন্ট্রোল ও পারমিশন</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
              SuperAdmin
            </span>
          </Link>
        )}
      </div>

      {/* 2. Filter Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-rose-400" />
          <span>অডিট অনুসন্ধান ও ফিল্টার (Filter Logs):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          {/* Table Name Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-rose-400" />
              <span>টার্গেট টেবিল (Table)</span>
            </label>
            <select
              value={filters.tableName}
              onChange={(e) => setFilters({ ...filters, tableName: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="ALL">সকল টেবিল (All Tables)</option>
              <option value="receipts">receipts (মানি রসিদ)</option>
              <option value="expenses">expenses (দৈনিক খরচ)</option>
              <option value="incomes">incomes (অন্যান্য আয়)</option>
              <option value="boarder_charges">boarder_charges (বিল চার্জ)</option>
              <option value="allocations">allocations (সিট বরাদ্দ)</option>
              <option value="boarders">boarders (বর্ডার রেজিস্ট্রি)</option>
              <option value="manager_cash_sessions">manager_cash_sessions (ক্যাশ ক্লোজিং)</option>
              <option value="owner_deposits">owner_deposits (ওনার ডিপোজিট)</option>
              <option value="cash_handovers">cash_handovers (ক্যাশ হস্তান্তর)</option>
              <option value="meal_selections">meal_selections (মিল নির্বাচন)</option>
              <option value="meal_change_audit">meal_change_audit (মিল অডিট)</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>অ্যাকশন টাইপ (Action)</span>
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="ALL">সকল অ্যাকশন (All Actions)</option>
              <option value="INSERT">INSERT (নতুন এন্ট্রি)</option>
              <option value="UPDATE">UPDATE (সংশোধন)</option>
              <option value="DELETE">DELETE (মুছে ফেলা)</option>
              <option value="VOID">VOID (বাতিল)</option>
              <option value="OVERRIDE">OVERRIDE (কাট-অফ ওভাররাইড)</option>
            </select>
          </div>

          {/* Actor Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>কর্মকর্তা (Actor / User)</span>
            </label>
            <select
              value={filters.actorId}
              onChange={(e) => setFilters({ ...filters, actorId: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="">সকল কর্মকর্তা (All Actors)</option>
              {(actors ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>শুরু (From)</span>
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>শেষ (To)</span>
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>
        </div>
      </div>

      {/* 3. Audit Log Table */}
      <div className="glass-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">সময়কাল (Asia/Dhaka)</th>
                <th className="py-3 px-4">কর্মকর্তা (Actor)</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
                <th className="py-3 px-4">টার্গেট টেবিল</th>
                <th className="py-3 px-4 font-mono">রেকর্ড আইডি (UUID)</th>
                <th className="py-3 px-4">আইপি অ্যাড্রেস</th>
                <th className="py-3 px-4 text-center">ডিফ যাচাই</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block w-8 h-8 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-2" />
                    <p>অডিট লগ লোড হচ্ছে... (Querying audit trail)</p>
                  </td>
                </tr>
              ) : (data?.logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    নির্বাচিত ফিল্টারে কোনো অডিট লগ পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                data!.logs.map((log, i) => (
                  <tr key={log.id} className={i % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-800/20'}>
                    <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {log.actor?.full_name || 'System / Auto Trigger'}
                      </div>
                      {log.actor?.role && (
                        <span className="text-[10px] text-indigo-400 font-mono">
                          {log.actor.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.action === 'INSERT'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.action === 'UPDATE'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : log.action === 'DELETE'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : log.action === 'VOID'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-purple-950 text-purple-400 border border-purple-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-300">
                      {log.table_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] max-w-xs truncate" title={log.record_id}>
                      {log.record_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ip_address || 'Internal RPC'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLogForDiff(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold
                          bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80
                          transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Inspect Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Toolbar */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            পৃষ্ঠা <span className="font-bold text-slate-200">{filters.page}</span> / {totalPages || 1}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={(filters.page ?? 1) <= 1}
              onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>পূর্ববর্তী (Prev)</span>
            </button>
            <button
              type="button"
              disabled={(filters.page ?? 1) >= totalPages}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 flex items-center gap-1"
            >
              <span>পরবর্তী (Next)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Diff Modal */}
      {selectedLogForDiff && (
        <AuditDiffModal
          log={selectedLogForDiff}
          onClose={() => setSelectedLogForDiff(null)}
        />
      )}
    </div>
  )
}
export default AuditLogPage

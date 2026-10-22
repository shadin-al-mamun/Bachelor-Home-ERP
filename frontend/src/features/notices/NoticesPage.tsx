import React, { useState } from 'react'
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  CalendarX,
  Utensils,
  Users,
  User,
  Building2,
  Clock,
  ShieldCheck,
  Search,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/app/store/useAuthStore'
import Button from '@/components/common/Button'
import { useNotices, useDeleteNotice } from './api/useNotices'
import type { NoticeType } from './api/useNotices'
import { SendNoticeModal } from './components/SendNoticeModal'
import { formatDhakaDate } from '@/utils/date'

export const NoticesPage: React.FC = () => {
  const { profile } = useAuthStore()
  const { data: notices = [], isLoading } = useNotices()
  const deleteNoticeMutation = useDeleteNotice()

  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [filterAudience, setFilterAudience] = useState<'ALL' | 'AUDIENCE_ALL' | 'FLAT' | 'SPECIFIC'>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`আপনি কি নিশ্চিত যে "${title}" নোটিশটি ডিলিট করতে চান?`)) {
      await deleteNoticeMutation.mutateAsync(id)
    }
  }

  // Filtered notices
  const filteredNotices = notices.filter((n) => {
    if (filterAudience === 'AUDIENCE_ALL' && n.target_audience !== 'ALL') return false
    if (filterAudience === 'FLAT' && n.target_audience !== 'FLAT') return false
    if (filterAudience === 'SPECIFIC' && n.target_audience !== 'SPECIFIC') return false
    if (filterType !== 'ALL' && n.type !== filterType) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = n.title.toLowerCase().includes(q)
      const matchMsg = n.message.toLowerCase().includes(q)
      const matchBoarder = n.target_boarder_name?.toLowerCase().includes(q)
      const matchFlat = n.target_flat_name?.toLowerCase().includes(q)
      return matchTitle || matchMsg || matchBoarder || matchFlat
    }
    return true
  })

  // KPI stats
  const totalCount = notices.length
  const allAudienceCount = notices.filter((n) => n.target_audience === 'ALL').length
  const flatAudienceCount = notices.filter((n) => n.target_audience === 'FLAT').length
  const specificCount = notices.filter((n) => n.target_audience === 'SPECIFIC').length

  const getTypeStyle = (type: NoticeType) => {
    switch (type) {
      case 'ALERT':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          label: 'জরুরি সতর্কতা',
        }
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          icon: <CalendarX className="w-4 h-4 text-amber-400" />,
          label: 'বকেয়া ও বিল তাগাদা',
        }
      case 'MEAL':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          badge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          icon: <Utensils className="w-4 h-4 text-cyan-400" />,
          label: 'মিল সংক্রান্ত',
        }
      default:
        return {
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
          badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
          icon: <Info className="w-4 h-4 text-indigo-400" />,
          label: 'সাধারণ ঘোষণা',
        }
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold tracking-wider uppercase mb-1">
            <Megaphone className="w-4 h-4" />
            নোটিশ ও ঘোষণা ব্যবস্থাপনা হাব
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            হোস্টেল নোটিশ ও ঘোষণা (Notice Board)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            সুপারএডমিন কর্তৃক সকল বোর্ডার, নির্দিষ্ট কোনো ফ্ল্যাট অথবা নির্দিষ্ট কোনো বোর্ডারকে নোটিশ পাঠান।
          </p>
        </div>

        <Button
          onClick={() => setIsSendModalOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/25 px-5"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          নতুন নোটিশ তৈরি ও প্রকাশ করুন
        </Button>
      </div>

      {/* Governance & Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        <Link
          to="/settings/users"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Users className="w-4 h-4 text-indigo-400" />
          <span>কর্মকর্তা ও পদবী ব্যবস্থাপনা</span>
        </Link>
        <Link
          to="/settings/hostel"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>হোস্টেল সেটিংস</span>
        </Link>
        <Link
          to="/settings/notices"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 whitespace-nowrap"
        >
          <Megaphone className="w-4 h-4 text-slate-950" />
          <span>হোস্টেল নোটিশ ও ঘোষণা</span>
        </Link>
        <Link
          to="/settings/audit-logs"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>সিস্টেম অডিট ট্রেইল</span>
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">মোট নোটিশ</span>
            <Megaphone className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">সর্বমোট প্রেরিত নোটিশ</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">সকল বোর্ডারদের জন্য</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{allAudienceCount}</div>
          <p className="text-[11px] text-emerald-400/70 mt-0.5">গণ-বিজ্ঞপ্তি বা ব্রডকাস্ট নোটিশ</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">ফ্ল্যাট ভিত্তিক নোটিশ</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{flatAudienceCount}</div>
          <p className="text-[11px] text-amber-400/70 mt-0.5">নির্দিষ্ট ফ্ল্যাটের জন্য প্রেরিত</p>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-indigo-400 mb-1">
            <span className="text-xs font-medium">নির্দিষ্ট বোর্ডারদের জন্য</span>
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{specificCount}</div>
          <p className="text-[11px] text-indigo-400/70 mt-0.5">ব্যক্তিগত বা একক তাগাদা</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Audience filter tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterAudience('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterAudience === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            সব ({totalCount})
          </button>
          <button
            onClick={() => setFilterAudience('AUDIENCE_ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterAudience === 'AUDIENCE_ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            সকল বোর্ডার ({allAudienceCount})
          </button>
          <button
            onClick={() => setFilterAudience('FLAT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterAudience === 'FLAT'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ফ্ল্যাট ভিত্তিক ({flatAudienceCount})
          </button>
          <button
            onClick={() => setFilterAudience('SPECIFIC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterAudience === 'SPECIFIC'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            নির্দিষ্ট বোর্ডার ({specificCount})
          </button>
        </div>

        {/* Category Filter & Search Input */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 shrink-0"
          >
            <option value="ALL">সকল ক্যাটাগরি</option>
            <option value="INFO">সাধারণ ঘোষণা</option>
            <option value="ALERT">জরুরি সতর্কতা</option>
            <option value="WARNING">বকেয়া ও বিল তাগাদা</option>
            <option value="MEAL">মিল সংক্রান্ত</option>
          </select>

          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নোটিশের বিষয় বা ফ্ল্যাট/প্রাপক খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">নোটিশ লোড হচ্ছে...</div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-slate-800 bg-slate-900/30 space-y-3">
            <Megaphone className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-base font-bold text-white">কোনো নোটিশ পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              এখনো কোনো নোটিশ প্রকাশ করা হয়নি। নতুন নোটিশ প্রকাশ করতে উপরের বাটনে ক্লিক করুন।
            </p>
            <Button
              size="sm"
              onClick={() => setIsSendModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              নতুন নোটিশ দিন
            </Button>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const typeConfig = getTypeStyle(notice.type)
            return (
              <div
                key={notice.id}
                className="p-5 sm:p-6 rounded-3xl border border-slate-800 bg-slate-900/50 hover:border-slate-700/80 transition-all space-y-3"
              >
                {/* Notice Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${typeConfig.badge}`}>
                      {typeConfig.icon}
                      {typeConfig.label}
                    </span>

                    {/* Target audience pill */}
                    {notice.target_audience === 'ALL' ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        সকল আবাসিক বোর্ডার
                      </span>
                    ) : notice.target_audience === 'FLAT' ? (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        ফ্ল্যাট: {notice.target_flat_name || 'ফ্ল্যাট'}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        নির্দিষ্ট বোর্ডার: {notice.target_boarder_name || 'বোর্ডার'}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDhakaDate(notice.created_at, 'DD MMM YYYY, hh:mm A')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleDelete(notice.id, notice.title)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="নোটিশ মুছে ফেলুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Body */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {notice.message}
                  </p>
                </div>

                {/* Footer Sender */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>প্রকাশক: {notice.created_by_name || 'সুপারএডমিন'}</span>
                  </div>
                  <span className="text-slate-400 text-[10px]">
                    স্ট্যাটাস: <strong className="text-emerald-400 font-medium">সক্রিয় (Active)</strong>
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal */}
      <SendNoticeModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  )
}

export default NoticesPage

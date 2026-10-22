import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoarders, type BoarderWithRelations } from './api/useBoarders'
import ApplicantReviewModal from './components/ApplicantReviewModal'
import EditBoarderModal from './components/EditBoarderModal'
import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import { formatDateBn } from '@/utils/date'
import type { BoarderStatus } from '@/types/database'
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Search,
  ShieldAlert,
  GraduationCap,
  BedDouble,
  Phone,
  Eye,
  SlidersHorizontal,
  Megaphone,
} from 'lucide-react'
import { SendNoticeModal } from '@/features/notices/components/SendNoticeModal'

export const BoarderListPage: React.FC = () => {
  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState<BoarderStatus | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewApplicant, setReviewApplicant] = useState<BoarderWithRelations | null>(null)
  const [editingBoarder, setEditingBoarder] = useState<BoarderWithRelations | null>(null)
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false)
  const [noticeTargetBoarder, setNoticeTargetBoarder] = useState<{ id: string; name: string } | null>(null)

  const { data: boarders = [], isLoading } = useBoarders({
    status: selectedStatus,
    search: searchQuery,
  })

  // Metrics for overview cards
  const { data: allBoarders = [] } = useBoarders({ status: 'ALL' })
  const totalCount = allBoarders.length
  const activeCount = allBoarders.filter((b) => b.status === 'ACTIVE').length
  const pendingCount = allBoarders.filter((b) => b.status === 'PENDING').length
  const leftCount = allBoarders.filter((b) => b.status === 'LEFT').length

  const getStatusBadge = (status: BoarderStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge status="ACTIVE">সক্রিয় (Active)</Badge>
      case 'PENDING':
        return <Badge status="PENDING">অপেক্ষমান (Pending)</Badge>
      case 'LEFT':
        return <Badge status="INACTIVE">প্রস্থানকৃত (Left)</Badge>
      case 'REJECTED':
        return <Badge status="REJECTED">বাতিলকৃত (Rejected)</Badge>
      default:
        return <Badge status="INACTIVE">{status}</Badge>
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-primary-400 font-semibold tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" />
            আবাসিক বোর্ডার ব্যবস্থাপনা ডিরেক্টরি
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            হোস্টেল আবাসিক বোর্ডার ও আবেদনকারী তালিকা
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            হোস্টেলের প্রকৃত আবাসিক সদস্য ও শিক্ষার্থীদের প্রোফাইল, নথিপত্র এবং সিট বরাদ্দ। (কর্মকর্তা ও কর্মচারীদের তালিকা আলাদাভাবে{' '}
            <Link to="/settings/users" className="text-indigo-400 hover:underline">
              কর্মকর্তা ও পদবী ব্যবস্থাপনা
            </Link>{' '}
            পেইজে সংরক্ষিত)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => {
              setNoticeTargetBoarder(null)
              setIsNoticeModalOpen(true)
            }}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs shadow-md shadow-indigo-600/20"
          >
            <Megaphone className="w-4 h-4 mr-1.5" />
            নোটিশ পাঠান
          </Button>

          <Link to="/register" target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              <UserPlus className="w-4 h-4 mr-1.5" />
              রেজিস্ট্রেশন লিংক
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">মোট বর্ডার</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <p className="text-xs text-slate-500 mt-1">সর্বমোট নিবন্ধিত প্রোফাইল</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">সক্রিয় বর্ডার</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white">{activeCount}</div>
          <p className="text-xs text-emerald-400/70 mt-1">বর্তমানে হোস্টেলে বসবাসরত</p>
        </div>

        <div
          onClick={() => setSelectedStatus('PENDING')}
          className={`glass-card p-4 rounded-xl border cursor-pointer transition-all ${
            selectedStatus === 'PENDING'
              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40'
              : 'border-slate-800 bg-slate-900/40 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">অপেক্ষমান আবেদন</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
            {pendingCount}
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                যাচাই প্রয়োজন
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">অনুমোদন অপেক্ষায় থাকা নতুন শিক্ষার্থী</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">প্রস্থানকৃত বর্ডার</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-slate-300">{leftCount}</div>
          <p className="text-xs text-slate-500 mt-1">হোস্টেল ত্যাগ সম্পন্ন</p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedStatus === 'ALL'
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            সব ({totalCount})
          </button>
          <button
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              selectedStatus === 'PENDING'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            অপেক্ষমান আবেদন
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedStatus === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            সক্রিয় বর্ডার ({activeCount})
          </button>
          <button
            onClick={() => setSelectedStatus('LEFT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              selectedStatus === 'LEFT'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            প্রস্থানকৃত ({leftCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="নাম, ফোন, কোড বা প্রতিষ্ঠান খুঁজুন..."
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            className="text-xs"
          />
        </div>
      </div>

      {/* Boarder Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">বর্ডার কোড ও ছবি</th>
                <th className="py-3.5 px-4">পূর্ণ নাম ও যোগাযোগ</th>
                <th className="py-3.5 px-4">প্রতিষ্ঠান / পেশা</th>
                <th className="py-3.5 px-4">বরাদ্দকৃত সিট ও রুম</th>
                <th className="py-3.5 px-4">ভর্তির তারিখ</th>
                <th className="py-3.5 px-4">স্ট্যাটাস</th>
                <th className="py-3.5 px-4 text-right">কার্যক্রম</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    বর্ডার তালিকা লোড হচ্ছে...
                  </td>
                </tr>
              ) : boarders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    কোনো বর্ডার বা আবেদনকারী পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                boarders.map((boarder) => {
                  const alloc = boarder.active_allocation
                  return (
                    <tr
                      key={boarder.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* Avatar & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {boarder.photo_url ? (
                            <img
                              src={boarder.photo_url}
                              alt={boarder.full_name}
                              className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 ring-1 ring-slate-700">
                              <Users className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-mono text-xs font-semibold text-primary-400 block">
                              {boarder.boarder_code}
                            </span>
                            <span className="text-[10px] text-slate-500">ID #{boarder.id.slice(-4)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Full Name & Phone */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/boarders/${boarder.id}`}
                          className="font-semibold text-white hover:text-primary-400 transition-colors block text-sm"
                        >
                          {boarder.full_name}
                        </Link>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {boarder.phone_number}
                          </span>
                        </div>
                      </td>

                      {/* Academic / Job */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-slate-200 block font-medium">
                              {boarder.institution || '—'}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {boarder.department ? `${boarder.department}` : ''}
                              {boarder.student_id ? ` (${boarder.student_id})` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Room & Seat */}
                      <td className="py-3 px-4">
                        {alloc && alloc.seat ? (
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <BedDouble className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-semibold text-indigo-300 block">
                                {alloc.seat.seat_code}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {alloc.seat.room?.name || 'রুম'}, {alloc.seat.room?.flat?.flat_code}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
                            সিট বরাদ্দ নেই
                          </span>
                        )}
                      </td>

                      {/* Admission Date */}
                      <td className="py-3 px-4 text-slate-300">
                        {formatDateBn(boarder.admission_date)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(boarder.status)}</td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {boarder.status === 'PENDING' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setReviewApplicant(boarder)}
                              className="bg-amber-600 hover:bg-amber-500 text-xs py-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                              আবেদন যাচাই
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNoticeTargetBoarder({ id: boarder.id, name: boarder.full_name })
                                  setIsNoticeModalOpen(true)
                                }}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs py-1 px-2"
                                title="এই বর্ডারকে নোটিশ পাঠান"
                              >
                                <Megaphone className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingBoarder(boarder)}
                                className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs py-1 px-2"
                                title="বোর্ডার তথ্য সম্পাদন করুন"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </Button>
                              <Link to={`/boarders/${boarder.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-300 hover:text-white text-xs py-1"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" />
                                  প্রোফাইল
                                </Button>
                              </Link>
                            </>
                          )}

                          {boarder.status === 'ACTIVE' && !boarder.active_allocation && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/accommodation/seats')}
                              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs py-1"
                            >
                              সিট দিন
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applicant Review Modal */}
      <ApplicantReviewModal
        isOpen={Boolean(reviewApplicant)}
        onClose={() => setReviewApplicant(null)}
        applicant={reviewApplicant}
      />

      {/* Edit Boarder Modal */}
      <EditBoarderModal
        isOpen={Boolean(editingBoarder)}
        onClose={() => setEditingBoarder(null)}
        boarder={editingBoarder}
      />

      {/* Send Notice Modal */}
      <SendNoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => {
          setIsNoticeModalOpen(false)
          setNoticeTargetBoarder(null)
        }}
        initialBoarderId={noticeTargetBoarder?.id}
        initialBoarderName={noticeTargetBoarder?.name}
      />
    </div>
  )
}
export default BoarderListPage

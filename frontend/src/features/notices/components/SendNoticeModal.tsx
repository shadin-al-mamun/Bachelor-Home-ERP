import React, { useState, useEffect } from 'react'
import {
  X,
  Megaphone,
  AlertTriangle,
  Info,
  CalendarX,
  Utensils,
  Users,
  User,
  Send,
  Sparkles,
} from 'lucide-react'
import Button from '@/components/common/Button'
import { useCreateNotice } from '../api/useNotices'
import type { NoticeType, TargetAudience } from '../api/useNotices'
import { useMealBoardersList } from '@/features/meals/api/useMeals'

interface SendNoticeModalProps {
  isOpen: boolean
  onClose: () => void
  initialBoarderId?: string | null
  initialBoarderName?: string | null
}

export const SendNoticeModal: React.FC<SendNoticeModalProps> = ({
  isOpen,
  onClose,
  initialBoarderId = null,
  initialBoarderName = null,
}) => {
  const { data: boardersList = [] } = useMealBoardersList()
  const createNoticeMutation = useCreateNotice()

  const [targetAudience, setTargetAudience] = useState<TargetAudience>(
    initialBoarderId ? 'SPECIFIC' : 'ALL'
  )
  const [selectedBoarderId, setSelectedBoarderId] = useState<string>(initialBoarderId || '')
  const [noticeType, setNoticeType] = useState<NoticeType>('INFO')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState(false)

  useEffect(() => {
    if (initialBoarderId) {
      setTargetAudience('SPECIFIC')
      setSelectedBoarderId(initialBoarderId)
    }
  }, [initialBoarderId])

  if (!isOpen) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg('অনুগ্রহ করে নোটিশের শিরোনাম লিখুন।')
      return
    }
    if (!message.trim()) {
      setErrorMsg('অনুগ্রহ করে বিস্তারিত নোটিশ বার্তা লিখুন।')
      return
    }
    if (targetAudience === 'SPECIFIC' && !selectedBoarderId) {
      setErrorMsg('অনুগ্রহ করে নির্দিষ্ট বোর্ডার নির্বাচন করুন।')
      return
    }

    let boarderName: string | null = null
    if (targetAudience === 'SPECIFIC') {
      const b = boardersList.find((item) => item.id === selectedBoarderId)
      boarderName = b ? b.full_name : initialBoarderName || 'বোর্ডার'
    }

    try {
      await createNoticeMutation.mutateAsync({
        title: title.trim(),
        message: message.trim(),
        type: noticeType,
        target_audience: targetAudience,
        target_boarder_id: targetAudience === 'SPECIFIC' ? selectedBoarderId : null,
        target_boarder_name: boarderName,
      })

      setSuccessMsg(true)
      setTimeout(() => {
        setSuccessMsg(false)
        setTitle('')
        setMessage('')
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'নোটিশ পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।')
    }
  }

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
          label: 'মিল ও কিচেন',
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

  const currentTypeConfig = getTypeStyle(noticeType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                বোর্ডারদের নোটিশ ও ঘোষণা পাঠান
              </h2>
              <p className="text-xs text-slate-400">
                সকল বোর্ডার অথবা নির্দিষ্ট কোনো বোর্ডারকে নোটিশ পাঠান
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>নোটিশটি সফলভাবে পাঠানো ও প্রকাশ করা হয়েছে!</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-5">
          {/* Target Audience Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              প্রাপক নির্বাচন করুন (Target Audience):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetAudience('ALL')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  targetAudience === 'ALL'
                    ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${targetAudience === 'ALL' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">সকল আবাসিক বোর্ডার</div>
                  <div className="text-[10px] text-slate-400">সকল বোর্ডারদের পোর্টালে যাবে</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('SPECIFIC')}
                className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                  targetAudience === 'SPECIFIC'
                    ? 'border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-500/30 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${targetAudience === 'SPECIFIC' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">নির্দিষ্ট বোর্ডার</div>
                  <div className="text-[10px] text-slate-400">শুধু নির্বাচিত বর্ডারের কাছে যাবে</div>
                </div>
              </button>
            </div>
          </div>

          {/* If specific boarder, dropdown list */}
          {targetAudience === 'SPECIFIC' && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                বোর্ডার নির্বাচন করুন:
              </label>
              <select
                value={selectedBoarderId}
                onChange={(e) => setSelectedBoarderId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- বোর্ডার বেছে নিন --</option>
                {boardersList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.full_name} ({b.phone_number || 'ফোন নম্বর নেই'}) {b.seat_code ? `— সিট: ${b.seat_code}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notice Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              নোটিশের ধরন (Notice Category):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'INFO', label: 'সাধারণ ঘোষণা', icon: Info, color: 'indigo' },
                { type: 'ALERT', label: 'জরুরি সতর্কতা', icon: AlertTriangle, color: 'rose' },
                { type: 'WARNING', label: 'বকেয়া ও বিল', icon: CalendarX, color: 'amber' },
                { type: 'MEAL', label: 'মিল সংক্রান্ত', icon: Utensils, color: 'cyan' },
              ].map((item) => {
                const IconComponent = item.icon
                const isSelected = noticeType === item.type
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setNoticeType(item.type as NoticeType)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/20 text-white ring-1 ring-indigo-500/40'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notice Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              নোটিশের শিরোনাম:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: আগামীকাল বিদ্যুৎ লাইন সংস্কার / বকেয়া বিল পরিশোধের তাগাদা"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Notice Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              বিস্তারিত বার্তা:
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="নোটিশের সম্পূর্ণ বিবরণ এখানে লিখুন..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {/* Live Preview Card */}
          {(title || message) && (
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/80 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                লাইভ প্রিভিউ (বোর্ডার যেমনটি দেখবে):
              </div>
              <div className={`p-3.5 rounded-xl border ${currentTypeConfig.bg} space-y-1.5`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    {currentTypeConfig.icon}
                    <span>{title || 'নোটিশের শিরোনাম'}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${currentTypeConfig.badge}`}>
                    {currentTypeConfig.label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {message || 'নোটিশের বিস্তারিত বার্তা এখানে দেখা যাবে...'}
                </p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-slate-300 text-xs"
            >
              বাতিল করুন
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createNoticeMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-5 shadow-lg shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {createNoticeMutation.isPending ? 'পাঠানো হচ্ছে...' : 'নোটিশ প্রকাশ করুন'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  User,
  CheckCircle2,
  AlertCircle,
  Palmtree,
  UtensilsCrossed,
  DoorOpen,
} from 'lucide-react'
import {
  useResidentStaffMeals,
  useStaffMealLeaveMutation,
  type ResidentStaffMealInfo,
} from '../api/useKitchenMeals'

export interface StaffMealLeaveModalProps {
  isOpen: boolean
  onClose: () => void
  initialStaffId?: string
  selectedDate?: string
}

export const StaffMealLeaveModal: React.FC<StaffMealLeaveModalProps> = ({
  isOpen,
  onClose,
  initialStaffId,
  selectedDate,
}) => {
  const effectiveDate = selectedDate || new Date().toISOString().slice(0, 10)
  const { data: staffList = [], isLoading, refetch } = useResidentStaffMeals(effectiveDate)
  const leaveMutation = useStaffMealLeaveMutation()

  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaffId || '')
  const [startDate, setStartDate] = useState(effectiveDate)
  const [endDate, setEndDate] = useState(effectiveDate)
  const [reason, setReason] = useState('ছুটিতে থাকায় খাবার বন্ধ (Staff on Leave)')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFeedback(null)
      if (initialStaffId) {
        setSelectedStaffId(initialStaffId)
      } else if (staffList.length > 0 && !selectedStaffId) {
        setSelectedStaffId(staffList[0].boarder_id)
      }
      setStartDate(effectiveDate)
      setEndDate(effectiveDate)
    }
  }, [isOpen, initialStaffId, staffList, effectiveDate])

  const selectedStaff: ResidentStaffMealInfo | undefined =
    staffList.find((s) => s.boarder_id === selectedStaffId) || staffList[0]

  const handleApplyLeave = async (isOnLeave: boolean) => {
    if (!selectedStaff) {
      setFeedback({ type: 'error', message: 'অনুগ্রহ করে একজন কর্মচারী নির্বাচন করুন।' })
      return
    }

    if (!startDate || !endDate) {
      setFeedback({ type: 'error', message: 'ছুটি শুরুর ও শেষের তারিখ দিন।' })
      return
    }

    if (startDate > endDate) {
      setFeedback({ type: 'error', message: 'শুরুর তারিখ অবশ্যই শেষের তারিখের আগে বা সমান হতে হবে।' })
      return
    }

    setFeedback(null)
    try {
      const res = await leaveMutation.mutateAsync({
        boarderId: selectedStaff.boarder_id,
        flatId: selectedStaff.flat_id,
        startDate,
        endDate,
        isOnLeave,
        reason: isOnLeave ? reason.trim() : undefined,
      })

      setFeedback({
        type: 'success',
        message: res.message || (isOnLeave ? 'ছুটি সফলভাবে কার্যকর ও মিল বন্ধ করা হয়েছে।' : 'মিল সফলভাবে চালু করা হয়েছে।'),
      })
      refetch()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অপারেশন সম্পন্ন করতে সমস্যা হয়েছে।'
      setFeedback({ type: 'error', message: msg })
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🛠️ হোস্টেল কর্মচারী ফ্রি মিল ও ছুটি ব্যবস্থাপনা"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2 border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        {/* Staff Selector */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-400" />
            আবাসিক কর্মচারী নির্বাচন করুন
          </label>
          {isLoading ? (
            <div className="py-2 text-slate-400">কর্মচারী তালিকা লোড হচ্ছে...</div>
          ) : staffList.length === 0 ? (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
              বর্তমানে কোনো কর্মচারীর নামে আসন বরাদ্দ নেই। সিট বরাদ্দ থেকে কর্মচারীদের ফ্রি আবাসন ও মিল বরাদ্দ দিতে পারেন।
            </div>
          ) : (
            <select
              value={selectedStaff?.boarder_id || ''}
              onChange={(e) => {
                setSelectedStaffId(e.target.value)
                setFeedback(null)
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
            >
              {staffList.map((s) => (
                <option key={s.boarder_id} value={s.boarder_id}>
                  {s.name} ({s.code}) — {s.role} — {s.flat_name} ({s.room_name}, {s.seat_name})
                  {s.is_on_leave ? ' [🏖️ ছুটিতে মিল অফ]' : ' [✅ মিল চালু]'}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Staff Status Details Card */}
        {selectedStaff && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-slate-900/90 border border-purple-500/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{selectedStaff.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedStaff.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-slate-300">
                    <DoorOpen className="w-3 h-3 text-indigo-400" />
                    {selectedStaff.flat_name} • {selectedStaff.room_name} ({selectedStaff.seat_name})
                  </span>
                  <span>• {selectedStaff.code}</span>
                  {selectedStaff.phone && <span>• 📞 {selectedStaff.phone}</span>}
                </div>
              </div>

              {/* Status Badge for effective date */}
              <div>
                {selectedStaff.is_on_leave ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    <Palmtree className="w-3 h-3 text-amber-400" />
                    ছুটিতে (মিল বন্ধ)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    উপস্থিত (ফ্রি মিল চালু)
                  </span>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                ফ্রি মিল সুবিধা: <strong>সম্পূর্ণ ফ্রি (মাসিক বিল প্রযোজ্য নয়)</strong>
              </span>
              <span className="text-slate-400 font-mono">
                নাস্তা: {selectedStaff.breakfast ? '✅' : '❌'} | দুপুর: {selectedStaff.lunch ? '✅' : '❌'} | রাত: {selectedStaff.dinner ? '✅' : '❌'}
              </span>
            </div>
          </div>
        )}

        {/* Leave Configuration Form */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Palmtree className="w-4 h-4 text-amber-400" />
            ছুটি ও খাবার বন্ধের সময়সূচী নির্ধারণ
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              type="date"
              label="ছুটি শুরুর তারিখ"
              value={startDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              required
              className="text-xs"
            />
            <Input
              type="date"
              label="ছুটি শেষের তারিখ"
              value={endDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              required
              className="text-xs"
            />
          </div>

          <Input
            label="ছুটির কারণ / মন্তব্য"
            value={reason}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
            placeholder="যেমন: গ্রামের বাড়ি গমন, পারিবারিক কাজ, অসুস্থতাজনিত ছুটি"
            className="text-xs"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {/* Turn ON / Resume Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyLeave(false)}
              disabled={leaveMutation.isPending || !selectedStaff}
              className="w-full sm:w-auto border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              ছুটি বাতিল ও মিল পুনরায় চালু করুন
            </Button>

            {/* Turn OFF / Apply Leave Button */}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleApplyLeave(true)}
              disabled={leaveMutation.isPending || !selectedStaff}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/30"
            >
              <Palmtree className="w-3.5 h-3.5 mr-1" />
              ছুটি কার্যকর ও মিল বন্ধ রাখুন
            </Button>
          </div>
        </div>

        {/* All Resident Staff Roster Overview */}
        <div className="space-y-2">
          <div className="font-bold text-slate-300 text-[11px] flex items-center justify-between">
            <span>সকল আবাসিক কর্মচারীদের লাইভ স্ট্যাটাস ({effectiveDate})</span>
            <span className="text-slate-500 font-normal">মোট {staffList.length} জন কর্মী</span>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40 max-h-48 overflow-y-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">নাম ও পদবী</th>
                  <th className="py-2 px-2">সিট</th>
                  <th className="py-2 px-2 text-center">আজকের মিল</th>
                  <th className="py-2 px-3 text-right">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-500">
                      কোনো আবাসিক কর্মচারী নেই।
                    </td>
                  </tr>
                ) : (
                  staffList.map((st) => (
                    <tr
                      key={st.boarder_id}
                      onClick={() => {
                        setSelectedStaffId(st.boarder_id)
                        setFeedback(null)
                      }}
                      className={`cursor-pointer transition-colors ${
                        st.boarder_id === selectedStaff?.boarder_id
                          ? 'bg-purple-950/30'
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-white">
                        <div>{st.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{st.role}</div>
                      </td>
                      <td className="py-2 px-2 text-slate-300 font-mono">
                        {st.flat_name} ({st.seat_name})
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {st.is_on_leave ? (
                          <span className="text-rose-400 font-bold">মিল অফ</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">চলমান</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {st.is_on_leave ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ছুটিতে
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            উপস্থিত
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            বন্ধ করুন
          </Button>
        </div>
      </div>
    </Modal>
  )
}

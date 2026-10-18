import React, { useState } from 'react'
import {
  X,
  Users,
  CheckCircle2,
  XCircle,
  Building,
  Calendar,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react'
import { useFlatBoarderMeals, updateMockFlatBoarderMeal } from '../api/useKitchenMeals'
import { useToggleMealMutation, isMealManagerRole } from '../api/useMeals'
import type { MealSessionType } from '../api/useMeals'
import { useAuthStore } from '@/app/store/useAuthStore'
import { StaffMealControlModal } from './StaffMealControlModal'

interface FlatBoarderBreakdownModalProps {
  flatId: string
  flatName: string
  buildingName: string
  mealDate: string
  isOpen: boolean
  onClose: () => void
}

export const FlatBoarderBreakdownModal: React.FC<FlatBoarderBreakdownModalProps> = ({
  flatId,
  flatName,
  buildingName,
  mealDate,
  isOpen,
  onClose,
}) => {
  const { profile } = useAuthStore()
  const canManage = isMealManagerRole(profile?.role)

  const { data: boarders = [], isLoading, refetch } = useFlatBoarderMeals(flatId, mealDate)
  const toggleMutation = useToggleMealMutation()

  // State to open dedicated control modal for a specific boarder
  const [controlTarget, setControlTarget] = useState<{
    boarderId: string
    session?: MealSessionType
  } | null>(null)

  if (!isOpen) return null

  // Calculate flat meal totals
  const totalBreakfast = boarders.filter((b) => b.breakfast).length
  const totalLunch = boarders.filter((b) => b.lunch).length
  const totalDinner = boarders.filter((b) => b.dinner).length
  const grandTotal = totalBreakfast + totalLunch + totalDinner

  const handleQuickToggle = async (
    boarderId: string,
    session: MealSessionType,
    currentState: boolean
  ) => {
    if (!canManage || toggleMutation.isPending) return

    try {
      await toggleMutation.mutateAsync({
        mealDate,
        session,
        newState: !currentState,
        targetBoarderId: boarderId,
        overrideReason: 'ম্যানেজার কর্তৃক ফ্ল্যাট তালিকা থেকে কুইক টগল',
      })
      updateMockFlatBoarderMeal(boarderId, session, !currentState, true, 'ম্যানেজার কর্তৃক ফ্ল্যাট তালিকা থেকে কুইক টগল')
      refetch()
    } catch (err: any) {
      alert(err.message || 'মিল পরিবর্তন করতে সমস্যা হয়েছে।')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{flatName}</span>
                <span className="text-xs font-normal text-slate-400">({buildingName})</span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>তারিখ: {mealDate}</span>
                <span>•</span>
                <span>মোট বর্ডার: {boarders.length} জন</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Headcount Summary Pills */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] font-semibold text-amber-400">🍳 নাস্তা</div>
            <div className="text-base font-bold font-mono text-amber-300 mt-0.5">
              {totalBreakfast} জন
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[10px] font-semibold text-emerald-400">🍛 দুপুর</div>
            <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
              {totalLunch} জন
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30">
            <div className="text-[10px] font-semibold text-indigo-400">🍲 রাত</div>
            <div className="text-base font-bold font-mono text-indigo-300 mt-0.5">
              {totalDinner} জন
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="text-[10px] font-semibold text-slate-400">📊 মোট মিল</div>
            <div className="text-base font-extrabold font-mono text-white mt-0.5">
              {grandTotal}টি
            </div>
          </div>
        </div>

        {/* Staff Quick Action Hint */}
        {canManage && (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>আইকনে ক্লিক করে সরাসরি অন/অফ করতে পারেন অথবা "মিল কন্ট্রোল" বাটনে ক্লিক করুন।</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
              Staff Bypass Active
            </span>
          </div>
        )}

        {/* Boarder Breakdown Table */}
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/60 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">লোড হচ্ছে...</div>
          ) : boarders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              এই ফ্ল্যাটে বর্তমানে কোনো বর্ডার সক্রিয় নেই।
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">বর্ডার ও রুম</th>
                  <th className="py-2.5 px-2 text-center">🍳 নাস্তা</th>
                  <th className="py-2.5 px-2 text-center">🍛 দুপুর</th>
                  <th className="py-2.5 px-2 text-center">🍲 রাত</th>
                  <th className="py-2.5 px-3 text-center">মোট মিল</th>
                  {canManage && <th className="py-2.5 px-3 text-right">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {boarders.map((b) => {
                  const bdrTotal = (b.breakfast ? 1 : 0) + (b.lunch ? 1 : 0) + (b.dinner ? 1 : 0)

                  return (
                    <tr key={b.boarder_id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{b.boarder_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {b.room_name} ({b.seat_name}) • {b.boarder_code}
                        </div>
                      </td>

                      {/* Breakfast Status Button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={!canManage || toggleMutation.isPending}
                          onClick={() => handleQuickToggle(b.boarder_id, 'BREAKFAST', b.breakfast)}
                          className={`p-1.5 rounded-xl transition-all ${
                            canManage ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
                          } ${
                            b.breakfast
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-600 hover:bg-slate-800'
                          }`}
                          title={canManage ? 'ক্লিক করে সকালের নাস্তা পরিবর্তন করুন' : undefined}
                        >
                          {b.breakfast ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Lunch Status Button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={!canManage || toggleMutation.isPending}
                          onClick={() => handleQuickToggle(b.boarder_id, 'LUNCH', b.lunch)}
                          className={`p-1.5 rounded-xl transition-all ${
                            canManage ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
                          } ${
                            b.lunch
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-600 hover:bg-slate-800'
                          }`}
                          title={canManage ? 'ক্লিক করে দুপুরের খাবার পরিবর্তন করুন' : undefined}
                        >
                          {b.lunch ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Dinner Status Button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={!canManage || toggleMutation.isPending}
                          onClick={() => handleQuickToggle(b.boarder_id, 'DINNER', b.dinner)}
                          className={`p-1.5 rounded-xl transition-all ${
                            canManage ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
                          } ${
                            b.dinner
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-slate-600 hover:bg-slate-800'
                          }`}
                          title={canManage ? 'ক্লিক করে রাতের খাবার পরিবর্তন করুন' : undefined}
                        >
                          {b.dinner ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Total and Override info */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-white">
                          {bdrTotal}টি মিল
                        </span>
                        {b.is_override && (
                          <div
                            className="text-[9px] text-amber-400 flex items-center justify-center gap-1 mt-0.5"
                            title={b.override_reason || 'ওভাররাইড'}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>ওভাররাইড</span>
                          </div>
                        )}
                      </td>

                      {/* Action Column */}
                      {canManage && (
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setControlTarget({ boarderId: b.boarder_id })}
                            className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-colors"
                          >
                            মিল নিয়ন্ত্রণ
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>ফ্ল্যাট কিচেন লিস্ট • Bachelor Home ERP</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>

      {/* Embedded Staff Control Modal when Action clicked */}
      {controlTarget && (
        <StaffMealControlModal
          isOpen={!!controlTarget}
          onClose={() => {
            setControlTarget(null)
            refetch()
          }}
          initialBoarderId={controlTarget.boarderId}
          initialDate={mealDate}
          initialSession={controlTarget.session}
        />
      )}
    </div>
  )
}

import React, { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  RotateCw,
  ArrowRight,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowUpRight,
  Building2,
  PieChart,
  UserPlus,
  PlusCircle,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useOwnerDashboard } from './api/useOwnerDashboard'
import BackupHealthWidget from './components/BackupHealthWidget'
import { StaffMealControlModal } from '@/features/meals/components/StaffMealControlModal'
import { useBoarders, type BoarderWithRelations } from '@/features/boarders/api/useBoarders'
import ApplicantReviewModal from '@/features/boarders/components/ApplicantReviewModal'
import { formatDateBn } from '@/utils/date'

export const OwnerDashboardPage: React.FC = () => {
  const { profile } = useAuthStore()
  const { data: dashboard, isLoading, refetch, isRefetching } = useOwnerDashboard()
  const { data: pendingBoarders = [], refetch: refetchPendingBoarders } = useBoarders({ status: 'PENDING' })

  const [reviewApplicant, setReviewApplicant] = useState<BoarderWithRelations | null>(null)
  const [trendMetric, setTrendMetric] = useState<'SURPLUS' | 'ALL'>('ALL')
  const [isStaffMealControlOpen, setIsStaffMealControlOpen] = useState(false)

  const kpis = dashboard?.kpis
  const cashFlowTrend = dashboard?.cash_flow_trend || []
  const flatOccupancy = dashboard?.flat_occupancy || []
  const duesAging = dashboard?.dues_aging || []
  const baseActivities = dashboard?.recent_activities || []

  // Prepend pending boarder applications to recent activity stream
  const recentActivities = [
    ...pendingBoarders.map((b) => ({
      id: 'act-pending-' + b.id,
      type: 'ADMISSION' as const,
      title: 'নতুন বর্ডার আবেদন জমা পড়েছে',
      subtitle: `${b.full_name} (${b.boarder_code}) — ${b.institution || 'অনলাইন আবেদন'}`,
      amount: undefined,
      time: 'অপেক্ষমান যাচাই',
      user_name: b.full_name,
      status: 'PENDING',
    })),
    ...baseActivities,
  ]

  // Max value for SVG/CSS Chart scaling
  const maxRevenue = Math.max(...cashFlowTrend.map((t) => t.revenue), 500000)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-6 sm:p-7 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>এক্সিকিউটিভ কন্ট্রোল ও রিয়েল-টাইম ওভারভিউ</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              স্বাগতম, {profile?.full_name || 'হোস্টেল এডমিন'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              হোস্টেলের সার্বিক আসন বিন্যাস, নগদ অর্থ প্রবাহ, মিল প্রস্তুতি এবং আর্থিক স্বাস্থ্যের লাইভ মনিটরিং ককপিট।
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <div className="px-3.5 py-1.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs font-mono">
              {new Date().toLocaleDateString('bn-BD', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="রিফ্রেশ করুন"
            >
              <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>


      {/* Pending Boarder Applications Section */}
      {pendingBoarders.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/60 border-2 border-amber-500/50 p-5 sm:p-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    নতুন বর্ডার ভর্তি আবেদন ({pendingBoarders.length}টি অপেক্ষমান)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    যাচাই ও অনুমোদন প্রয়োজন
                  </span>
                </div>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  অনলাইন পোর্টাল থেকে নতুন আবেদন জমা পড়েছে। অনুগ্রহ করে নথিপত্র ও আবেদনকারীর তথ্য যাচাই করে অনুমোদন করুন।
                </p>
              </div>
            </div>

            <Link
              to="/boarders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors self-start md:self-center"
            >
              <span>সকল আবেদন দেখুন</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Cards for each pending applicant */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
            {pendingBoarders.map((applicant) => (
              <div
                key={applicant.id}
                className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 hover:border-amber-400/60 transition-all space-y-3 shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {applicant.photo_url ? (
                        <img
                          src={applicant.photo_url}
                          alt={applicant.full_name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-amber-500/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 ring-1 ring-slate-700">
                          <UserPlus className="w-5 h-5 text-amber-400" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px]">
                          {applicant.full_name}
                        </h4>
                        <span className="font-mono text-[10px] font-semibold text-amber-400 block">
                          {applicant.boarder_code}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDateBn(applicant.admission_date)}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <span className="text-amber-400 font-medium">ফোন:</span>
                      <span>{applicant.phone_number}</span>
                    </div>
                    {applicant.institution && (
                      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{applicant.institution}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewApplicant(applicant)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>আবেদন যাচাই ও অনুমোদন</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 5 Master Executive KPI Cards */}
      {isLoading || !kpis ? (
        <div className="glass-card p-12 rounded-3xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400 font-medium">এক্সিকিউটিভ ডেটা লোড হচ্ছে...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Card 1: 🏢 Occupancy Rate */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/70 border border-indigo-500/30 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                অকুপেন্সি রেট
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {kpis.occupancy_rate}%
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white mt-2">
              {kpis.occupied_seats} <span className="text-xs font-normal text-slate-400">/ {kpis.total_seats} সিট</span>
            </div>

            {/* Progress bar */}
            <div className="w-full mt-3 bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: `${kpis.occupancy_rate}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
              <span className="text-emerald-400 font-semibold">{kpis.vacant_seats}টি সিট খালি</span>
              <span>{kpis.maintenance_seats}টি মেরামত</span>
            </div>
          </div>

          {/* Card 2: 💰 Financial Health (Revenue & Dues) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                ভাড়া ও রাজস্ব আদায়
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {kpis.collection_rate}% আদায়
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-300 mt-2">
              ৳{(kpis.total_collected_month / 1000).toFixed(1)}k
            </div>

            <p className="text-[10px] text-slate-400 mt-1">
              মোট বিল: ৳{kpis.total_billed_month.toLocaleString('en-IN')}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">বকেয়া বিল:</span>
              <span className="text-rose-400 font-bold font-mono">
                ৳{kpis.total_outstanding_dues.toLocaleString('en-IN')}
              </span>
            </div>

            <Link
              to="/billing"
              className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span>ভাড়া আদায় করুন</span>
              <span className="text-xs">➔</span>
            </Link>
          </div>

          {/* Card 3: 📉 Expenses & Net Operating Income (NOI) */}
          <div className={`p-4 sm:p-5 rounded-3xl bg-slate-900/70 border ${
            kpis.net_operating_income >= 0 ? 'border-cyan-500/30' : 'border-rose-500/30'
          } backdrop-blur-sm relative overflow-hidden group`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${
                kpis.net_operating_income >= 0 ? 'text-cyan-400' : 'text-rose-400'
              } uppercase tracking-wider flex items-center gap-1.5`}>
                {kpis.net_operating_income >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
                নিট পরিচালন উদ্বৃত্ত (NOI)
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                kpis.net_operating_income >= 0
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {kpis.net_operating_income >= 0 ? 'মুনাফা' : 'ঘাটতি'}
              </span>
            </div>

            <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              kpis.net_operating_income >= 0 ? 'text-cyan-300' : 'text-rose-400'
            } mt-2`}>
              ৳{(kpis.net_operating_income / 1000).toFixed(1)}k
            </div>

            <p className="text-[10px] text-slate-400 mt-1">
              খরচ: ৳{kpis.operating_expenses_month.toLocaleString('en-IN')}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">অন্যান্য আয়:</span>
              <span className="text-teal-400 font-bold font-mono">
                +৳{kpis.non_rent_incomes_month.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Card 4: 🍲 Meal Metrics */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-amber-400" />
                মিল প্রস্তুতি ও উপস্থিতি
              </span>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  লাইভ সিঙ্ক
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {kpis.meal_attendance_rate}%
                </span>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">আজকের মিল:</span>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-300 mt-0.5">
                  {kpis.active_meals_today} <span className="text-[10px] font-normal text-slate-400">টি</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">আগামীকাল প্রস্তুত:</span>
                <div key={kpis.active_meals_tomorrow} className="text-xl sm:text-2xl font-extrabold font-mono text-indigo-300 mt-0.5 animate-fade-in">
                  {kpis.active_meals_tomorrow} <span className="text-[10px] font-normal text-slate-400">টি</span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">মাসিক প্রাক্কলন:</span>
              <span className="text-amber-400 font-bold font-mono">
                ৳{kpis.estimated_monthly_meal_bill.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsStaffMealControlOpen(true)}
              className="mt-2 pt-1.5 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span className="flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                মিল অন/অফ পরিচালনা
              </span>
              <span className="text-xs">➔</span>
            </button>
          </div>

          {/* Card 5: 💼 Cash in Custody */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 shadow-xl relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-400" />
                ম্যানেজার ক্যাশ হেফাজত
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400 mt-2">
              ৳{kpis.cash_in_custody.toLocaleString('en-IN')}
            </div>

            <p className="text-[10px] text-amber-200/80 mt-1">
              ড্রয়ারে থাকা মোট নগদ টাকা
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">হেফাজতকারী:</span>
              <span className="text-slate-300 font-semibold">{kpis.cash_in_custody_source || 'ম্যানেজার ক্যাশ ড্রয়ার'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Database Backup & PITR Health Status Card */}
      {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'ADMIN' || profile?.role === 'AUDITOR') && (
        <BackupHealthWidget />
      )}

      {/* Fast Action Shortcuts Bar */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-2.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          দ্রুত পরিচালনা শর্টকাট (Quick Operations):
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <Link
            to="/boarders"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserPlus className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white truncate">
                বর্ডার তালিকা
              </span>
            </div>
            {pendingBoarders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shrink-0 animate-pulse">
                {pendingBoarders.length} অপেক্ষমান
              </span>
            )}
          </Link>

          <Link
            to="/billing"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-emerald-600/10 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group flex items-center gap-2.5"
          >
            <DollarSign className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              ভাড়া আদায়
            </span>
          </Link>

          <Link
            to="/expenses"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-rose-600/10 border border-slate-800 hover:border-rose-500/40 text-left transition-all group flex items-center gap-2.5"
          >
            <PlusCircle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              খরচ এন্ট্রি
            </span>
          </Link>

          <Link
            to="/finance/transfers"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-cyan-600/10 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group flex items-center gap-2.5"
          >
            <TrendingUp className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              ট্রান্সফার
            </span>
          </Link>

          <Link
            to="/meals"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-amber-600/10 border border-slate-800 hover:border-amber-500/40 text-left transition-all group flex items-center gap-2.5"
          >
            <PieChart className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              কিচেন মনিটর
            </span>
          </Link>

          <Link
            to="/reports"
            className="p-3 rounded-2xl bg-slate-950/80 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group flex items-center gap-2.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
              রিপোর্ট স্যুট
            </span>
          </Link>
        </div>
      </div>

      {/* Main Analytics Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): 6-Month Cash Flow Trend */}
        <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800/80 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                বিগত ৬ মাসের ক্যাশ ফ্লো ও মুনাফা ট্রেন্ড
              </h2>
              <p className="text-[11px] text-slate-400">
                আদায়কৃত রাজস্ব (Revenue) বনাম পরিচালন ব্যয় (Operating Expenses)
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px] font-semibold">
              <button
                onClick={() => setTrendMetric('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                উভয়
              </button>
              <button
                onClick={() => setTrendMetric('SURPLUS')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  trendMetric === 'SURPLUS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                নিট উদ্বৃত্ত
              </button>
            </div>
          </div>

          {/* Interactive Bar Chart Visualization */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-56 pt-6 pb-2 border-b border-slate-800">
              {cashFlowTrend.map((point) => {
                const revenueHeight = Math.round((point.revenue / maxRevenue) * 100)
                const expenseHeight = Math.round((point.expenses / maxRevenue) * 100)
                const surplusHeight = Math.round((point.surplus / maxRevenue) * 100)

                return (
                  <div key={point.month_label} className="flex flex-col items-center h-full justify-end group">
                    <div className="text-[9px] font-mono text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                      +{(point.surplus / 1000).toFixed(0)}k
                    </div>

                    <div className="w-full flex items-end justify-center gap-1 h-full">
                      {trendMetric === 'ALL' ? (
                        <>
                          {/* Revenue Bar */}
                          <div
                            className="w-1/2 max-w-[18px] bg-emerald-500 hover:bg-emerald-400 rounded-t-lg transition-all relative group/bar"
                            style={{ height: `${revenueHeight}%` }}
                            title={`রেভিনিউ: ৳${point.revenue.toLocaleString('en-IN')}`}
                          />
                          {/* Expense Bar */}
                          <div
                            className="w-1/2 max-w-[18px] bg-rose-500/80 hover:bg-rose-400 rounded-t-lg transition-all"
                            style={{ height: `${expenseHeight}%` }}
                            title={`ব্যয়: ৳${point.expenses.toLocaleString('en-IN')}`}
                          />
                        </>
                      ) : (
                        /* Surplus Bar */
                        <div
                          className="w-full max-w-[28px] bg-gradient-to-t from-cyan-600 to-teal-400 hover:brightness-110 rounded-t-lg transition-all"
                          style={{ height: `${surplusHeight}%` }}
                          title={`নিট উদ্বৃত্ত: ৳${point.surplus.toLocaleString('en-IN')}`}
                        />
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-slate-400 mt-2 truncate w-full text-center">
                      {point.month_label.split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span>আদায়কৃত রাজস্ব (Revenue)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500" />
                <span>পরিচালন ব্যয় (Expenses)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-cyan-400" />
                <span>নিট উদ্বৃত্ত (Net Surplus)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Dues Aging Summary */}
        <div className="glass-card rounded-3xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                বকেয়া এজিং সামারি (Dues Aging)
              </h3>
              <p className="text-[11px] text-slate-400">
                বকেয়ার মেয়াদভিত্তিক ঝুঁকির বিশ্লেষণ
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {duesAging.map((bucket) => {
              const badgeColor =
                bucket.bucket === '< 30 days'
                  ? 'text-teal-400 bg-teal-500/10 border-teal-500/30'
                  : bucket.bucket === '30-60 days'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : bucket.bucket === '60-90 days'
                  ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold'

              return (
                <div key={bucket.bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{bucket.bucket_bn}</span>
                    <span className="font-mono font-bold text-white">
                      ৳{bucket.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        bucket.bucket === '> 90 days' ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${bucket.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`px-1.5 py-0.2 rounded border ${badgeColor}`}>
                      {bucket.percentage}% অংশ
                    </span>
                    <span className="text-slate-400">{bucket.count} জন বর্ডার</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed mt-2">
            ⚠️ <span className="font-bold">রিমাইন্ডার নীতি:</span> ৬০ দিনের অধিক বকেয়া থাকা বর্ডারদের স্বয়ংক্রিয় নোটিশ প্রেরণ করা হয়।
          </div>
        </div>
      </div>

      {/* Bottom Grid: Building/Flat Occupancy Breakdown & Recent Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card A: Flat-wise Occupancy Breakdown */}
        <div className="glass-card rounded-3xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                ফ্ল্যাট ও তলা-ভিত্তিক অকুপেন্সি ডিস্ট্রিবিউশন
              </h3>
              <p className="text-[11px] text-slate-400">
                প্রতিটি ফ্ল্যাটের সিট পূর্ণতা ও খালি আসনের স্থিতি
              </p>
            </div>
            <Link
              to="/accommodation"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>বিস্তারিত গ্রিড</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {flatOccupancy.map((flat) => (
              <div
                key={flat.flat_id}
                className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{flat.flat_name}</span>
                    <span className="text-slate-400 text-[11px] ml-2">({flat.floor_number}ম তলা)</span>
                  </div>
                  <div className="font-mono font-bold text-slate-200">
                    {flat.occupied_seats}/{flat.total_seats} সিট
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 font-bold">
                      {flat.rate}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      flat.rate === 100
                        ? 'bg-emerald-500'
                        : flat.rate >= 80
                        ? 'bg-indigo-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${flat.rate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{flat.building_name}</span>
                  <span className={flat.vacant_seats > 0 ? 'text-amber-400 font-semibold' : 'text-slate-500'}>
                    {flat.vacant_seats > 0 ? `${flat.vacant_seats}টি সিট খালি` : 'সম্পূর্ণ পূর্ণ (Full)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card B: Live Recent Activity Stream */}
        <div className="glass-card rounded-3xl border border-slate-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                সাম্প্রতিক কার্যক্রমের লাইভ ফিড (Live Activities)
              </h3>
              <p className="text-[11px] text-slate-400">
                ভাড়া আদায়, খরচ অনুমোদন ও ভর্তি ট্রানজেকশন ট্র্যাকার
              </p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="space-y-2.5">
            {recentActivities.map((act) => {
              const isPayment = act.type === 'PAYMENT'
              const isExpense = act.type === 'EXPENSE'

              return (
                <div
                  key={act.id}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isPayment
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isExpense
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}
                    >
                      {isPayment ? (
                        <DollarSign className="w-4 h-4" />
                      ) : isExpense ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <Receipt className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{act.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">• {act.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {act.subtitle}
                      </p>
                    </div>
                  </div>

                  {act.amount && (
                    <div className="text-right whitespace-nowrap shrink-0">
                      <div
                        className={`font-mono font-bold text-xs ${
                          isPayment ? 'text-emerald-400' : isExpense ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {isPayment ? '+' : isExpense ? '−' : ''}৳{act.amount.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-500">{act.user_name}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Staff Meal Control Modal */}
      {isStaffMealControlOpen && (
        <StaffMealControlModal
          isOpen={isStaffMealControlOpen}
          onClose={() => {
            setIsStaffMealControlOpen(false)
            refetch()
          }}
        />
      )}

      {/* Applicant Review Modal */}
      <ApplicantReviewModal
        isOpen={Boolean(reviewApplicant)}
        onClose={() => {
          setReviewApplicant(null)
          refetchPendingBoarders()
          refetch()
        }}
        applicant={reviewApplicant}
      />
    </div>
  )
}

export default OwnerDashboardPage

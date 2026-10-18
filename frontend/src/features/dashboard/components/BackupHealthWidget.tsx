import React from 'react'
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  HardDrive,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import { useBackupHealth } from '@/features/notifications/api/useNotifications'
import { formatDhakaDate } from '@/utils/date'

export const BackupHealthWidget: React.FC = () => {
  const { backupStatus, isLoading, isVerifying, runManualHealthCheck } = useBackupHealth()

  if (isLoading || !backupStatus) {
    return (
      <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-800" />
          <div className="space-y-1.5">
            <div className="w-32 h-4 rounded bg-slate-800" />
            <div className="w-24 h-3 rounded bg-slate-800" />
          </div>
        </div>
      </div>
    )
  }

  const isHealthy = backupStatus.status === 'HEALTHY'
  const isWarning = backupStatus.status === 'WARNING'

  return (
    <div className="relative overflow-hidden p-5 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md shadow-xl">
      {/* Background ambient lighting */}
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isHealthy ? 'bg-emerald-500' : isWarning ? 'bg-amber-500' : 'bg-rose-500'
        }`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Status Icon & Title */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${
              isHealthy
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10'
                : isWarning
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
            }`}
          >
            {isHealthy ? (
              <ShieldCheck className="w-6 h-6" />
            ) : isWarning ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Database className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>ডাটাবেস ব্যাকআপ ও PITR স্ট্যাটাস</span>
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isHealthy
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {isHealthy ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    সক্রিয় ও সুরক্ষিত (Healthy)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    পর্যালোচনা প্রয়োজন
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                সর্বশেষ সফল ব্যাকআপ: {formatDhakaDate(backupStatus.last_backup_time, 'DD MMM YYYY, hh:mm A')}
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 font-mono text-slate-300">
                <HardDrive className="w-3 h-3 text-slate-500" />
                আকার: {backupStatus.file_size_formatted}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Policy & Manual Verification Button */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="hidden lg:block text-right pr-2">
            <span className="text-[11px] text-slate-400 block font-mono">
              {backupStatus.retention_policy}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {backupStatus.storage_provider}
            </span>
          </div>

          <button
            onClick={runManualHealthCheck}
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-60"
            title="ম্যানুয়াল ব্যাকআপ স্বাস্থ্য পরীক্ষা"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-primary-400' : ''}`} />
            <span>{isVerifying ? 'যাচাই হচ্ছে...' : 'স্বাস্থ্য পরীক্ষা'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default BackupHealthWidget

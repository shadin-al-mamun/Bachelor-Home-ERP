import React, { useState } from 'react'
import { X, Copy, Check, ArrowRight, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react'
import type { AuditLogItem } from '../api/useAuditLogs'

interface AuditDiffModalProps {
  log: AuditLogItem | null
  onClose: () => void
}

export const AuditDiffModal: React.FC<AuditDiffModalProps> = ({ log, onClose }) => {
  const [copied, setCopied] = useState(false)

  if (!log) return null

  const oldData = log.old_data || {}
  const newData = log.new_data || {}

  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)])).sort()

  const copyToClipboard = () => {
    const payload = JSON.stringify(
      {
        audit_id: log.id,
        table: log.table_name,
        action: log.action,
        record_id: log.record_id,
        timestamp: log.created_at,
        actor: log.actor?.full_name || log.actor_id,
        old_data: log.old_data,
        new_data: log.new_data,
      },
      null,
      2
    )
    navigator.clipboard.writeText(payload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                log.action === 'INSERT'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : log.action === 'UPDATE'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800'
                  : log.action === 'DELETE'
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : log.action === 'VOID'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-purple-950 text-purple-300 border border-purple-800'
              }`}
            >
              {log.action}
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>অডিট ডিটেইলস ও ডাটা ডিফারেন্স (JSON Diff)</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Table: <span className="text-indigo-400 font-semibold">{log.table_name}</span> • Record ID: {log.record_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700/60"
              title="Copy JSON Payload"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি হয়েছে' : 'Copy JSON'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit Meta Banner */}
        <div className="px-5 py-3 bg-slate-900/40 border-b border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block">কর্মকর্তা (Actor):</span>
            <span className="font-semibold text-slate-200">{log.actor?.full_name || 'System Auto'}</span>
            {log.actor?.role && (
              <span className="text-[10px] text-indigo-400 ml-1 font-mono">({log.actor.role})</span>
            )}
          </div>
          <div>
            <span className="text-slate-500 block">সময় (Asia/Dhaka):</span>
            <span className="font-mono text-slate-300">
              {new Date(log.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">আইপি অ্যাড্রেস (IP):</span>
            <span className="font-mono text-slate-300">{log.ip_address || 'Internal RPC'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">ইউজার এজেন্ট:</span>
            <span className="text-slate-400 truncate block max-w-xs text-[11px]" title={log.user_agent || ''}>
              {log.user_agent ? log.user_agent.slice(0, 30) + '...' : 'Direct Client'}
            </span>
          </div>
        </div>

        {/* Side-by-side / Key Diff View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between pb-2 border-b border-slate-800">
            <span>ফিল্ড নেম (Field Property)</span>
            <div className="flex items-center gap-6 pr-4">
              <span className="text-rose-400">পূর্বের মান (Old Data)</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-emerald-400">নতুন মান (New Data)</span>
            </div>
          </div>

          {allKeys.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              কোনো ডাটা রেকর্ড সংরক্ষিত নেই (Data payload empty).
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              {allKeys.map((key) => {
                const oldVal = oldData[key]
                const newVal = newData[key]
                const isAdded = oldVal === undefined && newVal !== undefined
                const isRemoved = oldVal !== undefined && newVal === undefined
                const isChanged = oldVal !== undefined && newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)
                const isUnchanged = !isAdded && !isRemoved && !isChanged

                const oldStr = oldVal !== undefined ? JSON.stringify(oldVal) : '—'
                const newStr = newVal !== undefined ? JSON.stringify(newVal) : '—'

                return (
                  <div
                    key={key}
                    className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                      isChanged
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                        : isAdded
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                        : isRemoved
                        ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                        : 'bg-slate-900/30 border-slate-800/40 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-[200px]">
                      {isAdded && <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {isRemoved && <MinusCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {isChanged && <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      <span className="font-semibold text-slate-300">{key}</span>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto text-xs w-full sm:w-auto justify-end">
                      {isUnchanged ? (
                        <span className="text-slate-400">{oldStr}</span>
                      ) : (
                        <>
                          <span className={`px-2 py-0.5 rounded ${isRemoved || isChanged ? 'bg-rose-950/60 text-rose-300 line-through' : 'text-slate-500'}`}>
                            {oldStr}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                          <span className={`px-2 py-0.5 rounded font-bold ${isAdded || isChanged ? 'bg-emerald-950/60 text-emerald-300' : 'text-slate-500'}`}>
                            {newStr}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900/70 border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  )
}

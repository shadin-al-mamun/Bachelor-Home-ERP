import React from 'react'
import { Filter, Calendar, Building2, User } from 'lucide-react'
import type { ReportFilterState } from '../types'
import { useReportsMetadata } from '../api/useReportsData'

interface ReportFilterBarProps {
  filters: ReportFilterState
  onChange: (updated: ReportFilterState) => void
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ filters, onChange }) => {
  const { data: meta } = useReportsMetadata()

  const setQuickPeriod = (preset: ReportFilterState['quickPeriod']) => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    if (preset === 'today') {
      start = today
      end = today
    } else if (preset === 'this_week') {
      const dayOfWeek = today.getDay()
      const diff = (dayOfWeek + 6) % 7
      start = new Date(today)
      start.setDate(today.getDate() - diff)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
    } else if (preset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    } else if (preset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
    } else if (preset === 'last_90_days') {
      start = new Date(today)
      start.setDate(today.getDate() - 90)
      end = today
    } else if (preset === 'this_year') {
      start = new Date(today.getFullYear(), 0, 1)
      end = new Date(today.getFullYear(), 11, 31)
    }

    onChange({
      ...filters,
      quickPeriod: preset,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    })
  }

  const availableFlats = (meta?.flats ?? []).filter((f) =>
    filters.buildingId ? f.building_id === filters.buildingId : true
  )

  return (
    <div className="filter-toolbar glass-card p-4 rounded-2xl mb-6 border border-slate-800/80 shadow-xl">
      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-300">দ্রুত সময়সীমা (Quick Filter):</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'today', label: 'আজকে / Today' },
              { key: 'this_week', label: 'এই সপ্তাহ / Week' },
              { key: 'this_month', label: 'চলতি মাস / Month' },
              { key: 'last_month', label: 'গত মাস / Last Month' },
              { key: 'last_90_days', label: '৯০ দিন / 90 Days' },
              { key: 'this_year', label: 'চলতি বছর / Year' },
            ] as const
          ).map((p) => {
            const isActive = filters.quickPeriod === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setQuickPeriod(p.key)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/50'
                    : 'bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700/40'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>শুরু তারিখ (From)</span>
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              onChange({
                ...filters,
                startDate: e.target.value,
                quickPeriod: 'custom',
              })
            }
            className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>শেষ তারিখ (To)</span>
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              onChange({
                ...filters,
                endDate: e.target.value,
                quickPeriod: 'custom',
              })
            }
            className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Building Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>বিল্ডিং (Building)</span>
          </label>
          <select
            value={filters.buildingId}
            onChange={(e) =>
              onChange({
                ...filters,
                buildingId: e.target.value,
                flatId: '', // Reset flat on building change
              })
            }
            className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">সকল বিল্ডিং / All Buildings</option>
            {(meta?.buildings ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.building_code})
              </option>
            ))}
          </select>
        </div>

        {/* Flat Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            <span>ফ্ল্যাট (Flat)</span>
          </label>
          <select
            value={filters.flatId}
            onChange={(e) => onChange({ ...filters, flatId: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">সকল ফ্ল্যাট / All Flats</option>
            {availableFlats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.flat_code})
              </option>
            ))}
          </select>
        </div>

        {/* Manager Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>ম্যানেজার (Staff / Manager)</span>
          </label>
          <select
            value={filters.managerId}
            onChange={(e) => onChange({ ...filters, managerId: e.target.value })}
            className="w-full px-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">সকল স্টাফ / All Managers</option>
            {(meta?.managers ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

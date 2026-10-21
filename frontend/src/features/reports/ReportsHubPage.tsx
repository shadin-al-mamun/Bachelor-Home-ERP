import React, { useState, useMemo } from 'react'
import {
  FileText,
  Calendar,
  TrendingUp,
  Receipt,
  PieChart,
  Building2,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowRightLeft,
  Clock,
  Shield,
  Trash2,
  Award,
  Search,
} from 'lucide-react'
import type { ReportId, ReportFilterState } from './types'
import { ALL_REPORTS, REPORT_CATEGORIES } from './reportDefinitions'
import { useReportsData } from './api/useReportsData'
import { ReportFilterBar } from './components/ReportFilterBar'
import { ReportTableRenderer } from './components/ReportTableRenderer'
import { ExportActions } from './components/ExportActions'
import { getReportExportData } from './reportExportData'
import {
  type ExportMetadata,
  exportToExcel,
  exportToPDF,
  triggerBrowserPrint,
} from '../../lib/exportUtils'

// Helper icon mapper
const REPORT_ICONS: Record<string, React.ElementType> = {
  Calendar,
  TrendingUp,
  FileText,
  Receipt,
  PieChart,
  Building2,
  BookOpen,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowRightLeft,
  Clock,
  Shield,
  Trash2,
  Award,
}

export const ReportsHubPage: React.FC = () => {
  // Default to current month (Local date)
  const today = new Date()
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`

  const [activeReportId, setActiveReportId] = useState<ReportId>('DAILY_INCOME_EXPENSE')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [filters, setFilters] = useState<ReportFilterState>({
    startDate: firstDay,
    endDate: lastDay,
    quickPeriod: 'this_month',
    buildingId: '',
    flatId: '',
    managerId: '',
    accountId: '',
  })

  // Query reports data
  const { data, isLoading } = useReportsData(filters)

  // Find active report details
  const activeReport = useMemo(() => {
    return ALL_REPORTS.find((r) => r.id === activeReportId) || ALL_REPORTS[0]
  }, [activeReportId])

  // Filter report list by search query and category
  const filteredReportsList = useMemo(() => {
    return ALL_REPORTS.filter((r) => {
      const matchCat = selectedCategory === 'ALL' || r.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      const matchSearch =
        !query ||
        r.titleEn.toLowerCase().includes(query) ||
        r.titleBn.toLowerCase().includes(query) ||
        r.descriptionEn.toLowerCase().includes(query)
      return matchCat && matchSearch
    })
  }, [selectedCategory, searchQuery])

  // Handle PDF Export
  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const { columns, rows, summaryRow } = getReportExportData(activeReportId, data)
      if (!columns.length) return

      const meta: ExportMetadata = {
        reportTitle: `${activeReport.titleEn} (${activeReport.titleBn})`,
        dateRange: `${filters.startDate} to ${filters.endDate}`,
        filtersApplied: [
          filters.buildingId ? 'Building Filtered' : '',
          filters.managerId ? 'Manager Filtered' : '',
        ]
          .filter(Boolean)
          .join(', ') || 'All System Data',
      }
      exportToPDF(
        activeReport.id.toLowerCase(),
        columns,
        rows,
        meta,
        summaryRow,
        'landscape'
      )
    } finally {
      setIsExporting(false)
    }
  }

  // Handle Excel Export
  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const { columns, rows, summaryRow } = getReportExportData(activeReportId, data)
      if (!columns.length) return

      const meta: ExportMetadata = {
        reportTitle: `${activeReport.titleEn} (${activeReport.titleBn})`,
        dateRange: `${filters.startDate} to ${filters.endDate}`,
        filtersApplied: [
          filters.buildingId ? 'Building Filtered' : '',
          filters.managerId ? 'Manager Filtered' : '',
        ]
          .filter(Boolean)
          .join(', ') || 'All Records',
      }
      await exportToExcel(
        activeReport.id.toLowerCase(),
        columns,
        rows,
        meta,
        summaryRow
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen text-slate-100 p-4 md:p-6 lg:p-8 max-w-[1700px] mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              PRD SECTION 7 • 16 OPERATIONAL & FINANCIAL REPORTS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-8 h-8 text-indigo-400" />
            <span>রিপোর্ট ও অডিট হাব</span>
            <span className="text-slate-500 font-light text-xl">| Reports Center</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            হিসাব, নগদ তহবিল, ফ্ল্যাট খরচ, বকেয়া এবং ম্যানেজার কমপ্লায়েন্সের সম্পূর্ণ ১৬টি অডিট রিপোর্ট
          </p>
        </div>

        {/* Export Toolbar */}
        <ExportActions
          onPrint={triggerBrowserPrint}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          isExporting={isExporting}
        />
      </div>

      {/* 2. Category Tabs & Search Bar */}
      <div className="no-print glass-panel p-3 rounded-2xl mb-6 flex flex-col lg:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            সব রিপোর্ট / All ({ALL_REPORTS.length})
          </button>
          {REPORT_CATEGORIES.map((cat) => {
            const count = ALL_REPORTS.filter((r) => r.category === cat.id).length
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat.titleBn} ({count})
              </button>
            )
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="রিপোর্ট খুঁজুন... (Search report)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* 3. Main Reporting Workspace (Sidebar + Table) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Navigation Pills (3 cols) */}
        <div className="no-print lg:col-span-3 space-y-2 max-h-[850px] overflow-y-auto pr-1">
          {filteredReportsList.map((r, index) => {
            const Icon = REPORT_ICONS[r.icon] || FileText
            const isActive = r.id === activeReportId
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveReportId(r.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-150 flex items-start gap-3 ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-mono text-slate-400">#{index + 1}</span>
                    <h3 className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {r.titleBn}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{r.titleEn}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right Content Area: Filter Toolbar + Data Sheet (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Active Report Header Card */}
          <div className="glass-card p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {activeReport.category}
                </span>
                <span className="text-xs text-slate-400">• ID: {activeReport.id}</span>
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <span>{activeReport.titleBn}</span>
                <span className="text-slate-400 font-normal text-sm">({activeReport.titleEn})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">{activeReport.descriptionBn}</p>
            </div>
          </div>

          {/* Global Filter Bar */}
          <ReportFilterBar filters={filters} onChange={setFilters} />

          {/* Printable Report Sheet */}
          <div className="report-print-sheet glass-card p-4 md:p-6 rounded-2xl border border-slate-800 shadow-2xl">
            {/* Print Header Banner (Only visible during print) */}
            <div className="print-header-banner hidden">
              <h1 className="text-xl font-bold text-black">BACHELOR HOME ERP — DHAKA, BANGLADESH</h1>
              <h2 className="text-base font-semibold text-gray-800">{activeReport.titleEn}</h2>
              <p className="text-xs text-gray-600">
                Period: {filters.startDate} to {filters.endDate} | Generated:{' '}
                {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
              </p>
            </div>

            {/* Render Active Table */}
            <ReportTableRenderer
              reportId={activeReportId}
              data={data}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
export default ReportsHubPage

import React, { useState, useMemo } from 'react'
import {
  FileSpreadsheet,
  Download,
  Printer,
  FileDown,
  X,
  Building,
  Calendar,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useMonthlyCollectionSheetData,
  getAvailableMonthOptions,
} from '../api/useMonthlyCollectionSheetData'
import { MonthlyCollectionSheetView } from './MonthlyCollectionSheetView'
import { exportMonthlySheetToExcel } from '../utils/monthlySheetExcelExport'
import { exportHtmlToPDF } from '../utils/htmlReportPdfExport'

interface MonthlyCollectionSheetModalProps {
  isOpen: boolean
  onClose: () => void
  initialFlatId?: string
  initialMonth?: string
}

export const MonthlyCollectionSheetModal: React.FC<MonthlyCollectionSheetModalProps> = ({
  isOpen,
  onClose,
  initialFlatId,
  initialMonth,
}) => {
  // Default to current date in Asia/Dhaka
  const today = new Date()
  const defaultMonthStr = initialMonth || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr)
  const [selectedFlatId, setSelectedFlatId] = useState<string>(initialFlatId || 'flat-206')
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false)

  // Query sheet data
  const {
    rows,
    totals,
    availableFlats,
    selectedFlatName,
    selectedFlatCode,
    selectedMonthBn,
    isLoading,
  } = useMonthlyCollectionSheetData(selectedMonth, selectedFlatId)

  const monthOptions = useMemo(() => {
    return getAvailableMonthOptions(selectedMonth)
  }, [selectedMonth])

  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(prevYM)
  }

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextYM = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(nextYM)
  }

  if (!isOpen) return null

  // Trigger print / PDF download
  const handleDownloadPDF = async () => {
    const el = document.querySelector('.monthly-sheet-container') as HTMLElement
    if (el) {
      await exportHtmlToPDF(
        el,
        `মাসিক_বিল_আদায়ের_শীট_${selectedFlatCode}_${selectedMonthBn.replace('/', '_')}`,
        { orientation: 'landscape' }
      )
    } else {
      window.print()
    }
  }

  // Trigger Excel export
  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true)
      await exportMonthlySheetToExcel(
        rows,
        totals,
        selectedMonthBn,
        selectedFlatCode,
        selectedFlatName
      )
    } finally {
      setIsExportingExcel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-[1500px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none print:bg-white">
        
        {/* 1. Modal Header & Control Toolbar (Hidden in print) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  অফিসিয়াল রেজিস্টার • ১৫টি নির্ধারিত কলাম
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>মাসিক বিল আদায়ের শীট</span>
                <span className="text-slate-400 font-light text-sm hidden sm:inline">
                  (Monthly Bill Collection Sheet)
                </span>
              </h2>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="self-end md:self-auto p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Interactive Selection Controls (Flat & Month) */}
        <div className="no-print p-4 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Flat Selector */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>ফ্ল্যাট নির্বাচন করুন *</span>
            </label>
            <select
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              {availableFlats.map((f) => {
                const label = f.name.includes(f.code) ? f.name : `${f.name} (${f.code})`
                return (
                  <option key={f.id} value={f.id}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Month Selector Dropdown with Prev/Next stepper */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>মাসের নাম ও বছর *</span>
            </label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={handlePrevMonth}
                title="পূর্ববর্তী মাস"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-100 font-bold focus:outline-none cursor-pointer py-1"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100 py-1 font-sans">
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextMonth}
                title="পরবর্তী মাস"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons: Download PDF / Print & Download Excel */}
          <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
            {/* Primary Download / Print Button (Exact Requirement) */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 min-w-[140px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>ডাউনলোড করুন (PDF)</span>
            </button>

            {/* Excel Download Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || rows.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="এক্সেল স্প্রেডশীট হিসেবে ডাউনলোড করুন"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>{isExportingExcel ? 'প্রস্তুত হচ্ছে...' : 'এক্সেল (.xlsx)'}</span>
            </button>

            {/* Toggle Preview Button */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>{showPreview ? 'প্রিভিউ লুকান' : 'প্রিভিউ দেখুন'}</span>
            </button>
          </div>
        </div>

        {/* 3. Live Sheet Body (Rendered Table) */}
        <div className="p-2 sm:p-5 overflow-y-auto flex-1 bg-slate-950/40 print:p-0 print:overflow-visible print:bg-white">
          {showPreview && (
            <div className="max-w-full mx-auto">
              {/* Quick Status Bar */}
              <div className="no-print mb-3 flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    মোট সদস্য: <strong>{rows.length} জন</strong> | ফ্ল্যাট: <strong>{selectedFlatName}</strong> | মাস:{' '}
                    <strong>{selectedMonthBn}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  ল্যান্ডস্কেপ ফরম্যাটে প্রিন্ট অথবা সেভ করতে &quot;ডাউনলোড করুন&quot; ক্লিক করুন
                </span>
              </div>

              {/* Printable Table Replica */}
              <MonthlyCollectionSheetView
                rows={rows}
                totals={totals}
                monthBn={selectedMonthBn}
                flatCode={selectedFlatCode}
                flatName={selectedFlatName}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>

        {/* 4. Modal Footer (Hidden in print) */}
        <div className="no-print p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>সফটওয়্যারের ডাটাবেস থেকে স্বয়ংক্রিয় হিসাবকৃত তথ্য</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              বন্ধ করুন
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / সেভ করুন</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

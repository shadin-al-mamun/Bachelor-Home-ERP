import React, { useState, useMemo } from 'react'
import {
  UtensilsCrossed,
  Download,
  Printer,
  FileDown,
  X,
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
} from 'lucide-react'
import {
  useMonthlyMealSheetData,
} from '../api/useMonthlyMealSheetData'
import { getAvailableMonthOptions } from '../api/useMonthlyCollectionSheetData'
import { MonthlyMealSheetView } from './MonthlyMealSheetView'
import { exportMonthlyMealSheetToExcel } from '../utils/monthlyMealSheetExcelExport'
import { exportHtmlToPDF } from '../utils/htmlReportPdfExport'

interface MonthlyMealSheetModalProps {
  isOpen: boolean
  onClose: () => void
  initialFlatId?: string
  initialMonth?: string
}

export const MonthlyMealSheetModal: React.FC<MonthlyMealSheetModalProps> = ({
  isOpen,
  onClose,
  initialFlatId,
  initialMonth,
}) => {
  // Default to current date in Asia/Dhaka
  const today = new Date()
  const defaultMonthStr =
    initialMonth ||
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonthStr)
  const [selectedFlatId, setSelectedFlatId] = useState<string>(
    initialFlatId || ''
  )
  const [showPreview, setShowPreview] = useState<boolean>(true)
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false)

  // Query sheet data
  const {
    rows,
    dayTotals,
    flatTotals,
    daysInMonth,
    availableFlats,
    selectedFlatName,
    selectedFlatCode,
    selectedMonthBn,
    isLoading,
  } = useMonthlyMealSheetData(selectedMonth, selectedFlatId)

  // Auto-select first available assigned flat if none selected or if selected is not in manager's scope
  React.useEffect(() => {
    if (availableFlats && availableFlats.length > 0) {
      if (!selectedFlatId || !availableFlats.some((f) => f.id === selectedFlatId)) {
        setSelectedFlatId(availableFlats[0].id)
      }
    }
  }, [availableFlats, selectedFlatId])

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
    const el = document.querySelector('.monthly-meal-container') as HTMLElement
    if (el) {
      await exportHtmlToPDF(
        el,
        `মাসিক_মিল_গণনা_শীট_${selectedFlatCode}_${selectedMonthBn.replace('/', '_')}`,
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
      await exportMonthlyMealSheetToExcel(
        rows,
        dayTotals,
        flatTotals,
        selectedMonthBn,
        selectedFlatCode,
        selectedFlatName,
        daysInMonth
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  অফিসিয়াল রেজিস্টার • ৩৬টি নির্ধারিত কলাম
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>মাসিক মিল গণনা শীট</span>
                <span className="text-slate-400 font-light text-sm hidden sm:inline">
                  (Monthly Meal Count Sheet)
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
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
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
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-slate-900 text-slate-100 py-1 font-sans"
                  >
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
              className="flex-1 px-4 py-2 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ডাউনলোড করুন (PDF)</span>
            </button>

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel || rows.length === 0}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title="Microsoft Excel ফরম্যাটে ডাউনলোড করুন"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>{isExportingExcel ? 'তৈরি হচ্ছে...' : 'Excel (.xlsx)'}</span>
            </button>

            {/* Toggle Preview Button */}
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition-colors"
              title={showPreview ? 'প্রিভিউ লুকান' : 'প্রিভিউ দেখুন'}
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Modal Body: Document Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-slate-950/40 print:p-0 print:bg-white print:overflow-visible">
          {showPreview ? (
            <div className="max-w-full mx-auto shadow-2xl print:shadow-none">
              <MonthlyMealSheetView
                rows={rows}
                dayTotals={dayTotals}
                flatTotals={flatTotals}
                daysInMonth={daysInMonth}
                monthBn={selectedMonthBn}
                flatCode={selectedFlatCode}
                flatName={selectedFlatName}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <CheckCircle className="w-12 h-12 text-amber-500/50 mx-auto" />
              <p className="text-base font-semibold text-slate-200">
                শীট প্রস্তুত রয়েছে ({rows.length} জন বর্ডার সদস্য)
              </p>
              <p className="text-xs text-slate-500">
                উপরের “ডাউনলোড করুন (PDF)” অথবা “Excel (.xlsx)” বাটনে ক্লিক করে ফাইলটি সংগ্রহ করুন।
              </p>
            </div>
          )}
        </div>

        {/* 4. Modal Footer: Helpful Info */}
        <div className="no-print p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>সকাল = ০.৫ মিল | দুপুর ও রাত = ১ মিল | মিল বন্ধ = ০</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ল্যান্ডস্কেপ প্রিন্ট / PDF সংরক্ষণ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default MonthlyMealSheetModal


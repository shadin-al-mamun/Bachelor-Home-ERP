import React, { useState, useEffect, useMemo } from 'react'
import { Download, FileDown, Building, Calendar, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react'
import {
  useMonthlyCollectionSheetData,
  getAvailableMonthOptions,
} from '../api/useMonthlyCollectionSheetData'
import { MonthlyCollectionSheetView } from './MonthlyCollectionSheetView'
import { MonthlyCollectionSheetModal } from './MonthlyCollectionSheetModal'
import { exportMonthlySheetToExcel } from '../utils/monthlySheetExcelExport'
import type { ReportFilterState } from '../types'

interface MonthlyCollectionSheetReportPanelProps {
  initialFlatId?: string
  initialMonth?: string
  filters?: ReportFilterState
  onFiltersChange?: (updated: ReportFilterState) => void
}

export const MonthlyCollectionSheetReportPanel: React.FC<MonthlyCollectionSheetReportPanelProps> = ({
  initialFlatId,
  initialMonth,
  filters,
  onFiltersChange,
}) => {
  const today = new Date()
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Derive initial values from filters or props
  const derivedMonth = filters?.startDate ? filters.startDate.slice(0, 7) : initialMonth || currentYM
  const derivedFlatId = filters?.flatId || initialFlatId || 'flat-206'

  const [selectedMonth, setSelectedMonth] = useState<string>(derivedMonth)
  const [selectedFlatId, setSelectedFlatId] = useState<string>(derivedFlatId)
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Sync when parent filter changes (e.g. from ReportFilterBar)
  useEffect(() => {
    if (filters?.startDate) {
      const parentYM = filters.startDate.slice(0, 7)
      if (parentYM && parentYM !== selectedMonth) {
        setSelectedMonth(parentYM)
      }
    }
    if (filters?.flatId && filters.flatId !== selectedFlatId) {
      setSelectedFlatId(filters.flatId)
    }
  }, [filters?.startDate, filters?.flatId])

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

  // Month options list
  const monthOptions = useMemo(() => {
    return getAvailableMonthOptions(selectedMonth)
  }, [selectedMonth])

  // Handle Month Change
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
    if (onFiltersChange && filters) {
      // Calculate start and end date for that month
      const [y, m] = newMonth.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      onFiltersChange({
        ...filters,
        startDate: `${newMonth}-01`,
        endDate: `${newMonth}-${String(lastDay).padStart(2, '0')}`,
        quickPeriod: 'custom',
      })
    }
  }

  // Handle Flat Change
  const handleFlatChange = (newFlatId: string) => {
    setSelectedFlatId(newFlatId)
    if (onFiltersChange && filters) {
      onFiltersChange({
        ...filters,
        flatId: newFlatId === 'ALL' ? '' : newFlatId,
      })
    }
  }

  // Step backward 1 month
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(y, m - 2, 1)
    const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    handleMonthChange(prevYM)
  }

  // Step forward 1 month
  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextYM = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    handleMonthChange(nextYM)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExcel = async () => {
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
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="no-print glass-panel p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/80 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Flat Dropdown */}
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={selectedFlatId}
              onChange={(e) => handleFlatChange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer shadow-inner"
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

          {/* Month Stepper & Select Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="পূর্ববর্তী মাস"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-transparent text-xs text-slate-100 font-bold focus:outline-none cursor-pointer py-1 pr-2"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100 py-1 font-sans">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="পরবর্তী মাস"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF / Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ডাউনলোড করুন (PDF)</span>
          </button>

          {/* Excel Export Button */}
          <button
            type="button"
            onClick={handleExcel}
            disabled={isExportingExcel || rows.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingExcel ? 'প্রস্তুত হচ্ছে...' : 'Excel (.xlsx)'}</span>
          </button>

          {/* Open in Dedicated Popup Modal Button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-colors cursor-pointer"
            title="পপআপ উইন্ডোতে সম্পূর্ণ বড় করে দেখুন"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Render Table */}
      <MonthlyCollectionSheetView
        rows={rows}
        totals={totals}
        monthBn={selectedMonthBn}
        flatCode={selectedFlatCode}
        flatName={selectedFlatName}
        isLoading={isLoading}
      />

      {/* Dedicated Popup Modal */}
      <MonthlyCollectionSheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialFlatId={selectedFlatId}
        initialMonth={selectedMonth}
      />
    </div>
  )
}

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useMonthlyMealSheetData,
} from '../api/useMonthlyMealSheetData'
import { getAvailableMonthOptions } from '../api/useMonthlyCollectionSheetData'
import { MonthlyMealSheetView } from './MonthlyMealSheetView'
import { exportMonthlyMealSheetToExcel } from '../utils/monthlyMealSheetExcelExport'
import { exportHtmlToPDF } from '../utils/htmlReportPdfExport'
import type { ReportFilterState, CustomReportExportHandlers } from '../types'

interface MonthlyMealSheetReportPanelProps {
  initialFlatId?: string
  initialMonth?: string
  filters?: ReportFilterState
  onFiltersChange?: (updated: ReportFilterState) => void
  customExportRef?: React.RefObject<CustomReportExportHandlers | null> | React.MutableRefObject<CustomReportExportHandlers | null>
}

export const MonthlyMealSheetReportPanel: React.FC<
  MonthlyMealSheetReportPanelProps
> = ({ initialFlatId, initialMonth, filters, onFiltersChange, customExportRef }) => {
  const today = new Date()
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // Derive initial values from filters or props
  const derivedMonth = filters?.startDate
    ? filters.startDate.slice(0, 7)
    : initialMonth || currentYM
  const derivedFlatId = filters?.flatId || initialFlatId || 'flat-206'

  const [selectedMonth, setSelectedMonth] = useState<string>(derivedMonth)
  const [selectedFlatId, setSelectedFlatId] = useState<string>(derivedFlatId)

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
    dayTotals,
    flatTotals,
    daysInMonth,
    availableFlats,
    selectedFlatName,
    selectedFlatCode,
    selectedMonthBn,
    isLoading,
  } = useMonthlyMealSheetData(selectedMonth, selectedFlatId)

  // Month options list
  const monthOptions = useMemo(() => {
    return getAvailableMonthOptions(selectedMonth)
  }, [selectedMonth])

  // Handle Month Change
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
    if (onFiltersChange && filters) {
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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleExcel = useCallback(async () => {
    await exportMonthlyMealSheetToExcel(
      rows,
      dayTotals,
      flatTotals,
      selectedMonthBn,
      selectedFlatCode,
      selectedFlatName,
      daysInMonth
    )
  }, [rows, dayTotals, flatTotals, selectedMonthBn, selectedFlatCode, selectedFlatName, daysInMonth])

  const handlePDF = useCallback(async () => {
    const el = document.querySelector('.monthly-meal-container') as HTMLElement
    if (el) {
      await exportHtmlToPDF(
        el,
        `মাসিক_মিল_গণনা_শীট_${selectedFlatCode}_${selectedMonthBn.replace('/', '_')}`,
        { orientation: 'landscape' }
      )
    }
  }, [selectedFlatCode, selectedMonthBn])

  // Register export handlers so the top header buttons trigger them directly
  useEffect(() => {
    if (customExportRef) {
      customExportRef.current = {
        exportExcel: handleExcel,
        exportPDF: handlePDF,
        print: handlePrint,
      }
    }
    return () => {
      if (customExportRef) {
        customExportRef.current = null
      }
    }
  }, [customExportRef, handleExcel, handlePDF, handlePrint])

  return (
    <div className="space-y-4">
      {/* Control Toolbar — Flat & Month Selectors only */}
      <div className="no-print glass-panel p-3 sm:p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Flat Dropdown */}
          <div className="flex items-center gap-1.5">
            <Building className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={selectedFlatId}
              onChange={(e) => handleFlatChange(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer shadow-inner"
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
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-transparent text-xs text-slate-100 font-bold focus:outline-none cursor-pointer py-1 pr-2"
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

        {/* Info hint */}
        <div className="text-[11px] text-slate-400 font-medium">
          উপরে ডানপাশের বাটনগুলো ব্যবহার করে <span className="text-amber-400 font-semibold">প্রিন্ট</span>, <span className="text-rose-400 font-semibold">PDF</span> বা <span className="text-emerald-400 font-semibold">Excel</span> ডাউনলোড করুন
        </div>
      </div>

      {/* Render Table */}
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
  )
}
export default MonthlyMealSheetReportPanel

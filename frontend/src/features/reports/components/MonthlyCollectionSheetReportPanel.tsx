import React, { useState } from 'react'
import { Download, FileDown, Building, Calendar } from 'lucide-react'
import { useMonthlyCollectionSheetData } from '../api/useMonthlyCollectionSheetData'
import { MonthlyCollectionSheetView } from './MonthlyCollectionSheetView'
import { exportMonthlySheetToExcel } from '../utils/monthlySheetExcelExport'

interface MonthlyCollectionSheetReportPanelProps {
  initialFlatId?: string
  initialMonth?: string
}

export const MonthlyCollectionSheetReportPanel: React.FC<MonthlyCollectionSheetReportPanelProps> = ({
  initialFlatId,
  initialMonth,
}) => {
  const today = new Date()
  const defaultMonth = initialMonth || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth)
  const [selectedFlatId, setSelectedFlatId] = useState<string>(initialFlatId || 'flat-206')
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false)

  const {
    rows,
    totals,
    availableFlats,
    selectedFlatName,
    selectedFlatCode,
    selectedMonthBn,
    isLoading,
  } = useMonthlyCollectionSheetData(selectedMonth, selectedFlatId)

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
      <div className="no-print glass-panel p-3 sm:p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60">
        <div className="flex flex-wrap items-center gap-3">
          {/* Flat Dropdown */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {availableFlats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          {/* Month Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ডাউনলোড করুন (PDF)</span>
          </button>
          <button
            type="button"
            onClick={handleExcel}
            disabled={isExportingExcel || rows.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExportingExcel ? 'প্রস্তুত হচ্ছে...' : 'Excel (.xlsx)'}</span>
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
    </div>
  )
}

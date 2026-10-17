import React from 'react'
import { Printer, FileDown, FileSpreadsheet } from 'lucide-react'

interface ExportActionsProps {
  onPrint?: () => void
  onExportPDF?: () => void
  onExportExcel?: () => void
  isExporting?: boolean
  className?: string
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  onPrint,
  onExportPDF,
  onExportExcel,
  isExporting = false,
  className = '',
}) => {
  return (
    <div className={`export-actions flex items-center gap-2 ${className}`}>
      {onPrint && (
        <button
          type="button"
          onClick={onPrint}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60
            transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Print this report sheet directly (Ctrl+P)"
        >
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>প্রিন্ট / Print</span>
        </button>
      )}

      {onExportPDF && (
        <button
          type="button"
          onClick={onExportPDF}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/50
            transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export formatted PDF document with page numbers"
        >
          <FileDown className="w-3.5 h-3.5 text-rose-400" />
          <span>PDF ডাউনলোড</span>
        </button>
      )}

      {onExportExcel && (
        <button
          type="button"
          onClick={onExportExcel}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/50
            transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export structured Excel workbook with styling and BDT formulas"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Excel স্প্রেডশিট</span>
        </button>
      )}
    </div>
  )
}

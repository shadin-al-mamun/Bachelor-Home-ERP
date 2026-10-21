/**
 * Bachelor Home ERP — Client-Side Export Engines (PDF & Excel)
 * Implements high-quality Excel exports (navy blue headers, BDT formatting)
 * and PDF generation (jspdf + jspdf-autotable, page numbers, summary footers)
 */

import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable, { type UserOptions } from 'jspdf-autotable'

export interface ExportColumn {
  header: string
  key: string
  width?: number
  align?: 'left' | 'center' | 'right'
  isCurrency?: boolean
  isDate?: boolean
}

export interface ExportMetadata {
  reportTitle: string
  generatedBy?: string
  dateRange?: string
  filtersApplied?: string
  subtitle?: string
}

/**
 * Format number into Bangladeshi Taka string (e.g. ৳ 12,500.00)
 */
export function formatBDT(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '৳ 0.00'
  return `৳ ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format clean number without currency symbol
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00'
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Format ISO date string into readable DD MMM YYYY
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * EXCEL EXPORTER using ExcelJS
 */
export async function exportToExcel(
  filename: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  metadata: ExportMetadata,
  summaryRow?: Record<string, unknown>
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bachelor Home ERP'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(metadata.reportTitle.slice(0, 31) || 'Report', {
    pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4
  })

  // Title Banner
  const titleRow = sheet.addRow(['BACHELOR HOME ERP — DHAKA, BANGLADESH'])
  titleRow.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } }

  const subTitleRow = sheet.addRow([metadata.reportTitle])
  subTitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } }

  // Metadata Details
  const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })
  const metaLine = [
    `Generated: ${nowStr} (Asia/Dhaka)`,
    metadata.dateRange ? `Period: ${metadata.dateRange}` : '',
    metadata.filtersApplied ? `Filters: ${metadata.filtersApplied}` : '',
  ]
    .filter(Boolean)
    .join('  |  ')

  const metaRow = sheet.addRow([metaLine])
  metaRow.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } }

  sheet.addRow([]) // blank spacer row

  // Table Headers
  const headerValues = columns.map((c) => c.header)
  const headerRow = sheet.addRow(headerValues)
  headerRow.height = 24

  headerRow.eachCell((cell, colIdx) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Navy blue
    }
    cell.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    cell.alignment = {
      vertical: 'middle',
      horizontal: columns[colIdx - 1]?.align || 'left',
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
  })

  // Table Data Rows
  data.forEach((item, rowIndex) => {
    const rowValues = columns.map((col) => {
      const val = item[col.key]
      if (val === null || val === undefined) return ''
      return val
    })
    const dataRow = sheet.addRow(rowValues)
    dataRow.height = 20

    const isEven = rowIndex % 2 === 0

    dataRow.eachCell((cell, colIdx) => {
      const col = columns[colIdx - 1]
      cell.font = { name: 'Arial', size: 9.5 }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col?.align || (col?.isCurrency ? 'right' : 'left'),
      }

      // Alternating row background
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        }
      }

      // Border
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }

      // Currency Formatting
      if (col?.isCurrency && typeof cell.value === 'number') {
        cell.numFmt = '"৳" #,##0.00;[Red]("৳" #,##0.00);"-"'
      }
    })
  })

  // Summary / Footer Row
  if (summaryRow) {
    const summaryValues = columns.map((col) => {
      const val = summaryRow[col.key]
      return val !== undefined && val !== null ? val : ''
    })
    const sumRow = sheet.addRow(summaryValues)
    sumRow.height = 22

    sumRow.eachCell((cell, colIdx) => {
      const col = columns[colIdx - 1]
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      }
      cell.alignment = {
        vertical: 'middle',
        horizontal: col?.align || (col?.isCurrency ? 'right' : 'left'),
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'double', color: { argb: 'FF1E293B' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      if (col?.isCurrency && typeof cell.value === 'number') {
        cell.numFmt = '"৳" #,##0.00;[Red]("৳" #,##0.00);"-"'
      }
    })
  }

  // Auto Column Widths
  columns.forEach((col, idx) => {
    let maxLen = col.header.length + 4
    data.forEach((row) => {
      const cellVal = String(row[col.key] ?? '')
      if (cellVal.length > maxLen) {
        maxLen = Math.min(cellVal.length + 3, 40)
      }
    })
    sheet.getColumn(idx + 1).width = Math.max(col.width || 12, maxLen)
  })

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * PDF EXPORTER using jsPDF & jspdf-autotable
 */
export function exportToPDF(
  filename: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[],
  metadata: ExportMetadata,
  summaryRow?: Record<string, unknown>,
  orientation: 'portrait' | 'landscape' = 'landscape'
): void {
  const doc = new jsPDF({
    orientation,
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const nowStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })

  const cleanHeaderForPDF = (header: string): string => {
    if (header.includes('/')) {
      const parts = header.split('/')
      return parts[parts.length - 1].replace(/৳/g, 'BDT').trim()
    }
    return header.replace(/৳/g, 'BDT').trim()
  }

  // Sanitize title for Helvetica font (remove Bengali characters in parentheses if present)
  const cleanTitle =
    metadata.reportTitle
      .replace(/\([^\)]*[\u0980-\u09FF]+[^\)]*\)/g, '')
      .replace(/[^\x00-\x7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Bachelor Home ERP Report'

  // Header Banner
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 58, 138) // Navy blue
  doc.text('BACHELOR HOME ERP', 40, 40)

  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42) // Dark Slate
  doc.text(cleanTitle, 40, 58)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)

  const metaLine = [
    `Generated: ${nowStr} (Asia/Dhaka)`,
    metadata.dateRange ? `Period: ${metadata.dateRange}` : '',
    metadata.filtersApplied ? `Filter: ${metadata.filtersApplied}` : '',
  ]
    .filter(Boolean)
    .join('  •  ')

  doc.text(metaLine, 40, 72)

  // Decorative header divider line
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(1)
  doc.line(40, 80, pageWidth - 40, 80)

  // Format table headers
  const head = [columns.map((col) => cleanHeaderForPDF(col.header))]

  // Format data body
  const body = data.map((item) =>
    columns.map((col) => {
      const val = item[col.key]
      if (val === null || val === undefined) return '—'
      if (col.isCurrency && typeof val === 'number') {
        return `BDT ${formatNumber(val)}`
      }
      return String(val)
    })
  )

  // Format foot row
  const foot = summaryRow
    ? [
        columns.map((col) => {
          const val = summaryRow[col.key]
          if (val === null || val === undefined) return ''
          if (col.isCurrency && typeof val === 'number') {
            return `BDT ${formatNumber(val)}`
          }
          return String(val)
        }),
      ]
    : undefined

  // Column styles for alignments
  const columnStyles: Record<number, { halign?: 'left' | 'center' | 'right' }> = {}
  columns.forEach((col, idx) => {
    if (col.align) {
      columnStyles[idx] = { halign: col.align }
    } else if (col.isCurrency) {
      columnStyles[idx] = { halign: 'right' }
    }
  })

  const tableOptions: UserOptions = {
    startY: 90,
    margin: { left: 40, right: 40, bottom: 40 },
    head,
    body,
    foot,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a Navy
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    columnStyles,
    didDrawPage: (hookData) => {
      // Footer page numbering: "Page X of Y"
      const str = `Page ${hookData.pageNumber}`
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(
        str,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      )
      doc.text(
        'Bachelor Home ERP — Confidential Operating Report',
        40,
        doc.internal.pageSize.getHeight() - 20
      )
    },
  }

  autoTable(doc, tableOptions)

  doc.save(`${filename.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Native Print Utility
 */
export function triggerBrowserPrint(): void {
  window.print()
}

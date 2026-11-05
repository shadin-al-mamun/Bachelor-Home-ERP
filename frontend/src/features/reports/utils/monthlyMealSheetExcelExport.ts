import ExcelJS from 'exceljs'
import type {
  BoarderMonthlyMealRow,
  DayMealTotal,
} from '../api/useMonthlyMealSheetData'

export async function exportMonthlyMealSheetToExcel(
  rows: BoarderMonthlyMealRow[],
  dayTotals: DayMealTotal[],
  flatTotals: {
    totalBreakfast: number
    totalLunch: number
    totalDinner: number
    overallGrandTotal: number
  },
  monthBn: string,
  flatCode: string,
  flatName: string,
  daysInMonth: number
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bachelor Home ERP'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('মাসিক মিল গণনা শীট', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ showGridLines: true }],
  })

  // 36 Columns: Col 1 (ক্রম), Col 2 (নাম), Col 3 (তারিখ/বেলা), Col 4..34 (১..৩১), Col 35 (মোট), Col 36 (সর্বমোট)
  const columnsConfig: Partial<ExcelJS.Column>[] = [
    { key: 'col1', width: 6 }, // ক্রম
    { key: 'col2', width: 22 }, // নাম
    { key: 'col3', width: 9 }, // তারিখ / বেলা
  ]

  // Day columns (1 to 31)
  for (let d = 1; d <= 31; d++) {
    columnsConfig.push({ key: `day_${d}`, width: 4.5 })
  }

  columnsConfig.push({ key: 'col_total', width: 8 }) // মোট
  columnsConfig.push({ key: 'col_grand', width: 10 }) // সর্বমোট

  sheet.columns = columnsConfig

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }

  // Row 1: Title Banner
  sheet.mergeCells('A1:AJ1')
  const r1 = sheet.getCell('A1')
  r1.value = 'ব্যাচেলর হোম'
  r1.font = { name: 'Arial', size: 16, bold: true }
  r1.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 26

  // Row 2: Subtitle
  sheet.mergeCells('A2:AJ2')
  const r2 = sheet.getCell('A2')
  r2.value = '-: মাসিক মিল গণনা শীট :-'
  r2.font = { name: 'Arial', size: 12, bold: true }
  r2.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(2).height = 22

  // Row 3: Meta Information
  sheet.mergeCells('A3:G3')
  const r3Left = sheet.getCell('A3')
  r3Left.value = `মাসের নামঃ ${monthBn}`
  r3Left.font = { name: 'Arial', size: 10.5, bold: true }
  r3Left.alignment = { horizontal: 'left', vertical: 'middle' }

  sheet.mergeCells('AC3:AJ3')
  const r3Right = sheet.getCell('AC3')
  r3Right.value = flatName && flatName !== flatCode ? `ফ্ল্যাট নম্বরঃ ${flatCode} (${flatName})` : `ফ্ল্যাট নম্বরঃ ${flatCode}`
  r3Right.font = { name: 'Arial', size: 10.5, bold: true }
  r3Right.alignment = { horizontal: 'right', vertical: 'middle' }
  sheet.getRow(3).height = 20

  // Row 4: Column Headers
  const headerRow = sheet.getRow(4)
  headerRow.height = 22

  headerRow.getCell(1).value = 'ক্রম'
  headerRow.getCell(2).value = 'নাম'
  headerRow.getCell(3).value = 'তারিখ'

  // Days 1 to 31 in Bengali
  const bnDays = [
    '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০',
    '১১', '১২', '১৩', '১৪', '১৫', '১৬', '১৭', '১৮', '১৯', '২০',
    '২১', '২২', '২৩', '২৪', '২৫', '২৬', '২৭', '২৮', '২৯', '৩০', '৩১',
  ]

  for (let d = 1; d <= 31; d++) {
    headerRow.getCell(3 + d).value = bnDays[d - 1]
  }

  headerRow.getCell(35).value = 'মোট'
  headerRow.getCell(36).value = 'সর্বমোট'

  for (let c = 1; c <= 36; c++) {
    const cell = headerRow.getCell(c)
    cell.font = { name: 'Arial', size: 9, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    }
    cell.border = borderStyle
  }

  // Data Rows
  let currentRow = 5
  rows.forEach((r) => {
    const rowA = currentRow // সকাল
    const rowB = currentRow + 1 // দুপুর
    const rowC = currentRow + 2 // রাত

    // Merge Sl No across 3 rows
    sheet.mergeCells(`A${rowA}:A${rowC}`)
    const cSl = sheet.getCell(`A${rowA}`)
    cSl.value = r.sl < 10 ? `০${r.sl}` : String(r.sl)
    cSl.alignment = { horizontal: 'center', vertical: 'middle' }
    cSl.font = { bold: true, size: 9.5 }

    // Merge Name across 3 rows
    sheet.mergeCells(`B${rowA}:B${rowC}`)
    const cName = sheet.getCell(`B${rowA}`)
    cName.value = r.boarderName
    cName.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
    cName.font = { bold: true, size: 9.5 }

    // Col 3: Meal labels
    sheet.getCell(`C${rowA}`).value = 'সকাল'
    sheet.getCell(`C${rowB}`).value = 'দুপুর'
    sheet.getCell(`C${rowC}`).value = 'রাত'

    // Days 1 to 31
    for (let d = 1; d <= 31; d++) {
      const colIdx = 3 + d
      const dCount = r.days[d - 1]
      const isValid = d <= daysInMonth

      // Breakfast (Row A)
      const bCell = sheet.getRow(rowA).getCell(colIdx)
      bCell.value = isValid ? (dCount ? (dCount.breakfast === 0.5 ? 0.5 : 0) : 0) : ''
      bCell.alignment = { horizontal: 'center', vertical: 'middle' }
      bCell.font = { size: 8.5 }

      // Lunch (Row B)
      const lCell = sheet.getRow(rowB).getCell(colIdx)
      lCell.value = isValid ? (dCount ? (dCount.lunch === 1 ? 1 : 0) : 0) : ''
      lCell.alignment = { horizontal: 'center', vertical: 'middle' }
      lCell.font = { size: 8.5 }

      // Dinner (Row C)
      const dCell = sheet.getRow(rowC).getCell(colIdx)
      dCell.value = isValid ? (dCount ? (dCount.dinner === 1 ? 1 : 0) : 0) : ''
      dCell.alignment = { horizontal: 'center', vertical: 'middle' }
      dCell.font = { size: 8.5 }
    }

    // Col 35: মোট (Breakfast total, Lunch total, Dinner total)
    const tBCell = sheet.getCell(`AI${rowA}`)
    tBCell.value = r.breakfastTotal
    tBCell.alignment = { horizontal: 'center', vertical: 'middle' }
    tBCell.font = { bold: true, size: 9 }

    const tLCell = sheet.getCell(`AI${rowB}`)
    tLCell.value = r.lunchTotal
    tLCell.alignment = { horizontal: 'center', vertical: 'middle' }
    tLCell.font = { bold: true, size: 9 }

    const tDCell = sheet.getCell(`AI${rowC}`)
    tDCell.value = r.dinnerTotal
    tDCell.alignment = { horizontal: 'center', vertical: 'middle' }
    tDCell.font = { bold: true, size: 9 }

    // Col 36: সর্বমোট (Merged across Row A, B, C)
    sheet.mergeCells(`AJ${rowA}:AJ${rowC}`)
    const grandCell = sheet.getCell(`AJ${rowA}`)
    grandCell.value = r.grandTotal
    grandCell.alignment = { horizontal: 'center', vertical: 'middle' }
    grandCell.font = { bold: true, size: 10, color: { argb: 'FF1E3A8A' } }

    // Apply borders and height
    for (let rowIdx = rowA; rowIdx <= rowC; rowIdx++) {
      const row = sheet.getRow(rowIdx)
      row.height = 17
      for (let c = 1; c <= 36; c++) {
        row.getCell(c).border = borderStyle
      }
    }

    currentRow += 3
  })

  // Summary Rows at Bottom
  const totRowA = currentRow
  const totRowB = currentRow + 1
  const totRowC = currentRow + 2

  sheet.mergeCells(`A${totRowA}:B${totRowC}`)
  const totLabel = sheet.getCell(`A${totRowA}`)
  totLabel.value = 'সর্বমোট মিল'
  totLabel.alignment = { horizontal: 'center', vertical: 'middle' }
  totLabel.font = { bold: true, size: 9.5 }

  sheet.getCell(`C${totRowA}`).value = 'সকাল'
  sheet.getCell(`C${totRowB}`).value = 'দুপুর'
  sheet.getCell(`C${totRowC}`).value = 'রাত'

  // Daily totals
  for (let d = 1; d <= 31; d++) {
    const colIdx = 3 + d
    const dt = dayTotals[d - 1]
    const isValid = d <= daysInMonth

    const cA = sheet.getRow(totRowA).getCell(colIdx)
    cA.value = isValid && dt ? dt.breakfast : ''
    cA.alignment = { horizontal: 'center', vertical: 'middle' }
    cA.font = { bold: true, size: 8 }

    const cB = sheet.getRow(totRowB).getCell(colIdx)
    cB.value = isValid && dt ? dt.lunch : ''
    cB.alignment = { horizontal: 'center', vertical: 'middle' }
    cB.font = { bold: true, size: 8 }

    const cC = sheet.getRow(totRowC).getCell(colIdx)
    cC.value = isValid && dt ? dt.dinner : ''
    cC.alignment = { horizontal: 'center', vertical: 'middle' }
    cC.font = { bold: true, size: 8 }
  }

  // Totals of breakfast, lunch, dinner
  sheet.getCell(`AI${totRowA}`).value = flatTotals.totalBreakfast
  sheet.getCell(`AI${totRowA}`).font = { bold: true }
  sheet.getCell(`AI${totRowA}`).alignment = { horizontal: 'center', vertical: 'middle' }

  sheet.getCell(`AI${totRowB}`).value = flatTotals.totalLunch
  sheet.getCell(`AI${totRowB}`).font = { bold: true }
  sheet.getCell(`AI${totRowB}`).alignment = { horizontal: 'center', vertical: 'middle' }

  sheet.getCell(`AI${totRowC}`).value = flatTotals.totalDinner
  sheet.getCell(`AI${totRowC}`).font = { bold: true }
  sheet.getCell(`AI${totRowC}`).alignment = { horizontal: 'center', vertical: 'middle' }

  // Overall grand total
  sheet.mergeCells(`AJ${totRowA}:AJ${totRowC}`)
  const ovGrand = sheet.getCell(`AJ${totRowA}`)
  ovGrand.value = flatTotals.overallGrandTotal
  ovGrand.alignment = { horizontal: 'center', vertical: 'middle' }
  ovGrand.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } }

  for (let rowIdx = totRowA; rowIdx <= totRowC; rowIdx++) {
    const row = sheet.getRow(rowIdx)
    row.height = 18
    for (let c = 1; c <= 36; c++) {
      const cell = row.getCell(c)
      cell.border = borderStyle
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      }
    }
  }

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `মাসিক_মিল_গণনা_শীট_${flatCode}_${monthBn.replace('/', '_')}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}


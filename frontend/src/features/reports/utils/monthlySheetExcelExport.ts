import ExcelJS from 'exceljs'
import type {
  MonthlyCollectionSheetRow,
  MonthlyCollectionSheetTotals,
} from '../api/useMonthlyCollectionSheetData'

export async function exportMonthlySheetToExcel(
  rows: MonthlyCollectionSheetRow[],
  totals: MonthlyCollectionSheetTotals,
  monthBn: string,
  flatCode: string,
  flatName: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bachelor Home ERP'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('মাসিক বিল আদায়ের শীট', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ showGridLines: true }],
  })

  // Set column widths
  sheet.columns = [
    { key: 'col1', width: 8 }, // ক্রঃনং
    { key: 'col2', width: 26 }, // সদস্যের নাম ও মোবাইল নম্বর
    { key: 'col3', width: 14 }, // এডভান্স ভাড়া
    { key: 'col4', width: 15 }, // পূর্ববর্তী মাসের পাওনা
    { key: 'col5', width: 16 }, // পূর্ববর্তী মাসের পাওনা আদায়
    { key: 'col6', width: 14 }, // ১ম
    { key: 'col7', width: 14 }, // ২য়
    { key: 'col8', width: 14 }, // ৩য়
    { key: 'col9', width: 14 }, // ৪র্থ
    { key: 'col10', width: 16 }, // চলতি মাসের মোট আদায়
    { key: 'col11', width: 14 }, // সিট ভাড়া
    { key: 'col12', width: 14 }, // সার্ভিস চার্জ
    { key: 'col13', width: 14 }, // মিল খরচ
    { key: 'col14', width: 16 }, // চলতি মাসের মোট খরচ
    { key: 'col15', width: 16 }, // দেনা/পাওনা
  ]

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  }

  // Row 1: Title Banner
  sheet.mergeCells('A1:O1')
  const r1 = sheet.getCell('A1')
  r1.value = 'ব্যাচেলর হোম'
  r1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF000000' } }
  r1.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 26

  // Row 2: Subtitle
  sheet.mergeCells('A2:O2')
  const r2 = sheet.getCell('A2')
  r2.value = '-: মাসিক বিল আদায়ের শীট :-'
  r2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF000000' } }
  r2.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(2).height = 22

  // Row 3: Meta line
  sheet.mergeCells('A3:E3')
  const r3Left = sheet.getCell('A3')
  r3Left.value = `মাসের নামঃ ${monthBn}`
  r3Left.font = { name: 'Arial', size: 11, bold: true }
  r3Left.alignment = { horizontal: 'left', vertical: 'middle' }

  sheet.mergeCells('K3:O3')
  const r3Right = sheet.getCell('K3')
  r3Right.value =
    flatName && flatName !== flatCode
      ? `ফ্ল্যাট নম্বরঃ ${flatCode} (${flatName})`
      : `ফ্ল্যাট নম্বরঃ ${flatCode}`
  r3Right.font = { name: 'Arial', size: 11, bold: true }
  r3Right.alignment = { horizontal: 'right', vertical: 'middle' }
  sheet.getRow(3).height = 20

  // Row 4 & 5: Two-tier Headers
  sheet.mergeCells('A4:A5')
  sheet.getCell('A4').value = 'ক্রঃনং'

  sheet.mergeCells('B4:B5')
  sheet.getCell('B4').value = 'সদস্যের নাম ও মোবাইল নম্বর'

  sheet.mergeCells('C4:C5')
  sheet.getCell('C4').value = 'এডভান্স\nভাড়া'

  sheet.mergeCells('D4:D5')
  sheet.getCell('D4').value = 'পূর্ববর্তী\nমাসের\nপাওনা'

  sheet.mergeCells('E4:E5')
  sheet.getCell('E4').value = 'পূর্ববর্তী\nমাসের পাওনা\nআদায়'

  sheet.mergeCells('F4:I4')
  sheet.getCell('F4').value = 'চলতি মাসে আদায়'

  sheet.getCell('F5').value = '১ম'
  sheet.getCell('G5').value = '২য়'
  sheet.getCell('H5').value = '৩য়'
  sheet.getCell('I5').value = '৪র্থ'

  sheet.mergeCells('J4:J5')
  sheet.getCell('J4').value = 'চলতি মাসের\nমোট আদায়'

  sheet.mergeCells('K4:M4')
  sheet.getCell('K4').value = 'চলতি মাসের খরচাদি'

  sheet.getCell('K5').value = 'সিট ভাড়া'
  sheet.getCell('L5').value = 'সার্ভিস\nচার্জ'
  sheet.getCell('M5').value = 'মিল খরচ'

  sheet.mergeCells('N4:N5')
  sheet.getCell('N4').value = 'চলতি\nমাসের মোট\nখরচ'

  sheet.mergeCells('O4:O5')
  sheet.getCell('O4').value = 'দেনা/পাওনা'

  // Style header cells
  for (let r = 4; r <= 5; r++) {
    const row = sheet.getRow(r)
    row.height = 24
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c)
      cell.font = { name: 'Arial', size: 10, bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' },
      }
      cell.border = borderStyle
    }
  }

  // Row 6: Column Numbers (১ to ১৫)
  const colNums = [
    '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '১০', '১১', '১২', '১৩', '১৪', '১৫',
  ]
  const row6 = sheet.getRow(6)
  row6.height = 18
  colNums.forEach((num, idx) => {
    const cell = row6.getCell(idx + 1)
    cell.value = num
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    }
    cell.border = borderStyle
  })

  // Data Rows
  let currentRow = 7
  rows.forEach((r) => {
    const rowA = currentRow
    const rowB = currentRow + 1

    // Merge columns 1, 2, 3, 4, 10, 11, 12, 13, 14, 15 across Row A & Row B
    sheet.mergeCells(`A${rowA}:A${rowB}`)
    const c1 = sheet.getCell(`A${rowA}`)
    c1.value = r.sl
    c1.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells(`B${rowA}:B${rowB}`)
    const c2 = sheet.getCell(`B${rowA}`)
    c2.value = r.boarderPhone ? `${r.boarderName}\n${r.boarderPhone}` : r.boarderName
    c2.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }

    sheet.mergeCells(`C${rowA}:C${rowB}`)
    const c3 = sheet.getCell(`C${rowA}`)
    c3.value = r.hasAdvance ? `${r.advanceAmount}/-` : 'দেওয়া নাই'
    c3.alignment = { horizontal: 'center', vertical: 'middle' }

    sheet.mergeCells(`D${rowA}:D${rowB}`)
    const c4 = sheet.getCell(`D${rowA}`)
    c4.value = r.previousDue > 0 ? `${r.previousDue}/-` : '—'
    c4.alignment = { horizontal: 'right', vertical: 'middle' }

    // Col 5: Upper = Amount, Lower = Voucher
    const c5A = sheet.getCell(`E${rowA}`)
    c5A.value = r.previousDueCollected > 0 ? `${r.previousDueCollected}/-` : '—'
    c5A.alignment = { horizontal: 'right', vertical: 'middle' }
    c5A.font = { bold: true, size: 9.5 }

    const c5B = sheet.getCell(`E${rowB}`)
    c5B.value = r.previousDueVouchers.length > 0 ? r.previousDueVouchers.join(', ') : '—'
    c5B.alignment = { horizontal: 'center', vertical: 'middle' }
    c5B.font = { size: 8, italic: true, color: { argb: 'FF64748B' } }

    // Cols 6-9: Payments 1 to 4
    for (let pIdx = 0; pIdx < 4; pIdx++) {
      const colLetter = ['F', 'G', 'H', 'I'][pIdx]
      const pay = r.payments[pIdx]

      const cellA = sheet.getCell(`${colLetter}${rowA}`)
      cellA.value = pay && pay.amount > 0 ? `${pay.amount}/-` : '—'
      cellA.alignment = { horizontal: 'right', vertical: 'middle' }
      cellA.font = { bold: true, size: 9.5 }

      const cellB = sheet.getCell(`${colLetter}${rowB}`)
      cellB.value = pay && pay.voucher ? pay.voucher : '—'
      cellB.alignment = { horizontal: 'center', vertical: 'middle' }
      cellB.font = { size: 8, italic: true, color: { argb: 'FF64748B' } }
    }

    // Col 10: Total Collected
    sheet.mergeCells(`J${rowA}:J${rowB}`)
    const c10 = sheet.getCell(`J${rowA}`)
    c10.value = r.totalCurrentCollected > 0 ? `${r.totalCurrentCollected}/-` : '০/-'
    c10.alignment = { horizontal: 'right', vertical: 'middle' }
    c10.font = { bold: true }

    // Col 11: Seat Rent
    sheet.mergeCells(`K${rowA}:K${rowB}`)
    const c11 = sheet.getCell(`K${rowA}`)
    c11.value = r.seatRent > 0 ? `${r.seatRent}/-` : '—'
    c11.alignment = { horizontal: 'right', vertical: 'middle' }

    // Col 12: Service Charge
    sheet.mergeCells(`L${rowA}:L${rowB}`)
    const c12 = sheet.getCell(`L${rowA}`)
    c12.value = r.serviceCharge > 0 ? `${r.serviceCharge}/-` : '—'
    c12.alignment = { horizontal: 'right', vertical: 'middle' }

    // Col 13: Meal Charge
    sheet.mergeCells(`M${rowA}:M${rowB}`)
    const c13 = sheet.getCell(`M${rowA}`)
    c13.value = r.mealCharge > 0 ? `${r.mealCharge}/-` : '—'
    c13.alignment = { horizontal: 'right', vertical: 'middle' }

    // Col 14: Total Current Expense
    sheet.mergeCells(`N${rowA}:N${rowB}`)
    const c14 = sheet.getCell(`N${rowA}`)
    c14.value = r.totalCurrentExpense > 0 ? `${r.totalCurrentExpense}/-` : '০/-'
    c14.alignment = { horizontal: 'right', vertical: 'middle' }
    c14.font = { bold: true }

    // Col 15: Net Balance
    sheet.mergeCells(`O${rowA}:O${rowB}`)
    const c15 = sheet.getCell(`O${rowA}`)
    const isNeg = r.netBalance < 0
    c15.value =
      r.netBalance === 0
        ? '০/-'
        : isNeg
        ? `-${Math.abs(r.netBalance)}/-`
        : `+${r.netBalance}/-`
    c15.alignment = { horizontal: 'right', vertical: 'middle' }
    c15.font = { bold: true, color: { argb: isNeg ? 'FFDC2626' : 'FF16A34A' } }

    // Apply borders to all cells in Row A and Row B
    for (let c = 1; c <= 15; c++) {
      sheet.getRow(rowA).getCell(c).border = borderStyle
      sheet.getRow(rowB).getCell(c).border = borderStyle
    }

    sheet.getRow(rowA).height = 20
    sheet.getRow(rowB).height = 18

    currentRow += 2
  })

  // Grand Total Summary Row
  sheet.mergeCells(`A${currentRow}:B${currentRow}`)
  const totLabel = sheet.getCell(`A${currentRow}`)
  totLabel.value = 'সর্বমোট'
  totLabel.font = { name: 'Arial', size: 10, bold: true }
  totLabel.alignment = { horizontal: 'center', vertical: 'middle' }

  const totC = sheet.getCell(`C${currentRow}`)
  totC.value = totals.advanceAmount > 0 ? `${totals.advanceAmount}/-` : '—'
  totC.alignment = { horizontal: 'right', vertical: 'middle' }
  totC.font = { bold: true }

  const totD = sheet.getCell(`D${currentRow}`)
  totD.value = totals.previousDue > 0 ? `${totals.previousDue}/-` : '—'
  totD.alignment = { horizontal: 'right', vertical: 'middle' }
  totD.font = { bold: true }

  const totE = sheet.getCell(`E${currentRow}`)
  totE.value = totals.previousDueCollected > 0 ? `${totals.previousDueCollected}/-` : '—'
  totE.alignment = { horizontal: 'right', vertical: 'middle' }
  totE.font = { bold: true }

  const totF = sheet.getCell(`F${currentRow}`)
  totF.value = totals.payment1 > 0 ? `${totals.payment1}/-` : '—'
  totF.alignment = { horizontal: 'right', vertical: 'middle' }
  totF.font = { bold: true }

  const totG = sheet.getCell(`G${currentRow}`)
  totG.value = totals.payment2 > 0 ? `${totals.payment2}/-` : '—'
  totG.alignment = { horizontal: 'right', vertical: 'middle' }
  totG.font = { bold: true }

  const totH = sheet.getCell(`H${currentRow}`)
  totH.value = totals.payment3 > 0 ? `${totals.payment3}/-` : '—'
  totH.alignment = { horizontal: 'right', vertical: 'middle' }
  totH.font = { bold: true }

  const totI = sheet.getCell(`I${currentRow}`)
  totI.value = totals.payment4 > 0 ? `${totals.payment4}/-` : '—'
  totI.alignment = { horizontal: 'right', vertical: 'middle' }
  totI.font = { bold: true }

  const totJ = sheet.getCell(`J${currentRow}`)
  totJ.value = totals.totalCurrentCollected > 0 ? `${totals.totalCurrentCollected}/-` : '০/-'
  totJ.alignment = { horizontal: 'right', vertical: 'middle' }
  totJ.font = { bold: true }

  const totK = sheet.getCell(`K${currentRow}`)
  totK.value = totals.seatRent > 0 ? `${totals.seatRent}/-` : '—'
  totK.alignment = { horizontal: 'right', vertical: 'middle' }
  totK.font = { bold: true }

  const totL = sheet.getCell(`L${currentRow}`)
  totL.value = totals.serviceCharge > 0 ? `${totals.serviceCharge}/-` : '—'
  totL.alignment = { horizontal: 'right', vertical: 'middle' }
  totL.font = { bold: true }

  const totM = sheet.getCell(`M${currentRow}`)
  totM.value = totals.mealCharge > 0 ? `${totals.mealCharge}/-` : '—'
  totM.alignment = { horizontal: 'right', vertical: 'middle' }
  totM.font = { bold: true }

  const totN = sheet.getCell(`N${currentRow}`)
  totN.value = totals.totalCurrentExpense > 0 ? `${totals.totalCurrentExpense}/-` : '০/-'
  totN.alignment = { horizontal: 'right', vertical: 'middle' }
  totN.font = { bold: true }

  const totO = sheet.getCell(`O${currentRow}`)
  const isTotNeg = totals.netBalance < 0
  totO.value =
    totals.netBalance === 0
      ? '০/-'
      : isTotNeg
      ? `-${Math.abs(totals.netBalance)}/-`
      : `+${totals.netBalance}/-`
  totO.alignment = { horizontal: 'right', vertical: 'middle' }
  totO.font = { bold: true, color: { argb: isTotNeg ? 'FFDC2626' : 'FF16A34A' } }

  for (let c = 1; c <= 15; c++) {
    const cell = sheet.getRow(currentRow).getCell(c)
    cell.border = borderStyle
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' },
    }
  }
  sheet.getRow(currentRow).height = 24

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `মাসিক_বিল_আদায়ের_শীট_${flatCode}_${monthBn.replace('/', '_')}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

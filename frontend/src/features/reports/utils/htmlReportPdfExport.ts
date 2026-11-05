import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface HtmlExportPdfOptions {
  orientation?: 'landscape' | 'portrait'
  marginMm?: number
  minWidth?: number
}

/**
 * High-fidelity HTML DOM to PDF Exporter with full native Bengali font support.
 * Captures the exact rendered DOM view (including table borders, Bengali numerals,
 * complex conjuncts, colors, and rowSpans) and exports it directly to an A4 PDF document.
 */
export async function exportHtmlToPDF(
  element: HTMLElement,
  filename: string,
  options?: HtmlExportPdfOptions
): Promise<void> {
  const orientation = options?.orientation || 'landscape'
  const marginMm = options?.marginMm ?? 5
  const baseMinWidth = options?.minWidth ?? 1600

  // Ensure target element scroll width is respected so columns are never cramped
  const targetScrollWidth = Math.max(element.scrollWidth, element.clientWidth, baseMinWidth)

  // Capture rendered element at 2.2x scale for ultra-sharp typography & crisp border lines
  const canvas = await html2canvas(element, {
    scale: 2.2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: targetScrollWidth + 80,
    onclone: (_clonedDoc, clonedElement) => {
      // Force cloned tree to render at full width without any horizontal scrollbars or clipping
      clonedElement.style.overflow = 'visible'
      clonedElement.style.width = `${targetScrollWidth}px`
      clonedElement.style.maxWidth = 'none'
      clonedElement.style.padding = '12px 16px'

      const scrollWrappers = clonedElement.querySelectorAll('.overflow-x-auto')
      scrollWrappers.forEach((w) => {
        const el = w as HTMLElement
        el.style.overflow = 'visible'
        el.style.width = '100%'
        el.style.maxWidth = 'none'
      })

      // Ensure all tables inside the cloned element render cleanly with full width
      const tables = clonedElement.querySelectorAll('table')
      tables.forEach((t) => {
        t.style.width = '100%'
        t.style.minWidth = `${targetScrollWidth - 40}px`
        t.style.maxWidth = 'none'
        t.style.borderCollapse = 'collapse'
      })

      // Ensure tr elements have no borders or backgrounds that could slice rowspan cells in html2canvas
      const trs = clonedElement.querySelectorAll('tr')
      trs.forEach((tr) => {
        const el = tr as HTMLElement
        el.style.border = 'none'
        el.style.borderBottom = 'none'
        el.style.borderTop = 'none'
        el.style.backgroundColor = 'transparent'
      })
    },
  })

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  })

  // Dimensions of A4 in mm: landscape = 297 x 210, portrait = 210 x 297
  const pdfPageWidth = orientation === 'landscape' ? 297 : 210
  const pdfPageHeight = orientation === 'landscape' ? 210 : 297

  const printWidth = pdfPageWidth - marginMm * 2
  const printHeight = pdfPageHeight - marginMm * 2

  const totalImgHeight = (canvas.height * printWidth) / canvas.width

  // If single page fits within printable boundary
  if (totalImgHeight <= printHeight) {
    // Vertically balance the table if it's shorter than the page
    const verticalTop =
      totalImgHeight < printHeight - 30
        ? Math.max(marginMm, Math.min(14, (pdfPageHeight - totalImgHeight) / 3))
        : marginMm

    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(
      imgData,
      'PNG',
      marginMm,
      verticalTop,
      printWidth,
      totalImgHeight,
      undefined,
      'FAST'
    )
  } else {
    // Multi-page splitting by slicing the master canvas vertically
    const pageCanvasHeight = Math.floor((printHeight * canvas.width) / printWidth)
    const totalPages = Math.ceil(canvas.height / pageCanvasHeight)

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage('a4', orientation)
      }

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      const currentSliceHeight = Math.min(
        pageCanvasHeight,
        canvas.height - i * pageCanvasHeight
      )
      pageCanvas.height = currentSliceHeight

      const ctx = pageCanvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, currentSliceHeight)
        ctx.drawImage(
          canvas,
          0,
          i * pageCanvasHeight,
          canvas.width,
          currentSliceHeight,
          0,
          0,
          pageCanvas.width,
          currentSliceHeight
        )

        const pageImgData = pageCanvas.toDataURL('image/png')
        const slicePrintHeight = (currentSliceHeight * printWidth) / canvas.width

        pdf.addImage(
          pageImgData,
          'PNG',
          marginMm,
          marginMm,
          printWidth,
          slicePrintHeight,
          undefined,
          'FAST'
        )
      }
    }
  }

  // Sanitize filename and save
  const safeName = filename
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
  const fullName = safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`
  pdf.save(fullName)
}

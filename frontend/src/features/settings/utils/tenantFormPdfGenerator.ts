import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Internal helper to render the form DOM element into a crisp, high-DPI canvas
 */
export async function captureTenantFormCanvas(elementId: string): Promise<HTMLCanvasElement | null> {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`[captureTenantFormCanvas] Element with id #${elementId} not found.`)
    return null
  }

  // Ensure all web fonts (such as Hind Siliguri) are fully loaded
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await (document as any).fonts.ready
    } catch {
      // ignore
    }
  }

  // Render the DOM element with 3x scale for crisp Bengali typography and vector-like lines
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc) => {
      const clonedEl = clonedDoc.getElementById(elementId)
      if (clonedEl) {
        clonedEl.style.width = '794px'
        clonedEl.style.maxWidth = '794px'
        clonedEl.style.minHeight = '1123px'
        clonedEl.style.transform = 'none'
        clonedEl.style.boxShadow = 'none'
        clonedEl.style.margin = '0 auto'

        // Lift all text fields cleanly above the dotted baseline in canvas render
        // so downloaded PDF/JPG matches the exact visual elevation shown in the browser preview
        const fields = clonedEl.querySelectorAll('.tenant-dotted-field')
        fields.forEach((f) => {
          const el = f as HTMLElement
          el.style.paddingBottom = '6px'
        })

        const values = clonedEl.querySelectorAll('.tenant-dotted-value')
        values.forEach((v) => {
          const el = v as HTMLElement
          el.style.display = 'inline-block'
          el.style.transform = 'translateY(-2px)'
        })
      }
    },
  })

  return canvas
}

/**
 * High-definition PDF generation for Dhaka Metropolitan Police Tenant Registration Form
 */
export async function downloadTenantFormPDF(
  elementId: string,
  filename: string = 'Tenant_Registration_Form.pdf'
): Promise<boolean> {
  try {
    const canvas = await captureTenantFormCanvas(elementId)
    if (!canvas) return false

    // Standard A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()

    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    pdf.save(filename)
    return true
  } catch (err) {
    console.error('[downloadTenantFormPDF] Error during PDF rendering:', err)
    return false
  }
}

export const downloadTenantFormPdf = downloadTenantFormPDF

/**
 * High-definition JPG Image download for Dhaka Metropolitan Police Tenant Registration Form
 */
export async function downloadTenantFormJPG(
  elementId: string,
  filename: string = 'Tenant_Registration_Form.jpg'
): Promise<boolean> {
  try {
    const canvas = await captureTenantFormCanvas(elementId)
    if (!canvas) return false

    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    const link = document.createElement('a')
    link.href = imgData
    link.download = filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? filename : `${filename}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return true
  } catch (err) {
    console.error('[downloadTenantFormJPG] Error during JPG export:', err)
    return false
  }
}

export const downloadTenantFormJpg = downloadTenantFormJPG

/**
 * Print utility for physical paper printing of the Tenant Registration Form
 */
export function printTenantForm(elementId: string): void {
  const element = document.getElementById(elementId)
  if (!element) {
    window.print()
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    window.print()
    return
  }

  // Extract Tailwind / inline stylesheet links from the current head
  const styleSheets = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="bn">
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}/" />
        <title>ভাড়াটিয়া নিবন্ধন ফরম — ঢাকা মেট্রোপলিটন পুলিশ</title>
        ${styleSheets}
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            color: #000000;
          }
          #${elementId} {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100% !important;
            box-shadow: none !important;
            padding: 24px 32px !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        <div style="display: flex; justify-content: center; align-items: flex-start; min-height: 100vh;">
          ${element.outerHTML}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
              window.close();
            }, 350);
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

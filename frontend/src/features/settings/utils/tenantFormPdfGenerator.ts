import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * High-definition PDF generation for Dhaka Metropolitan Police Tenant Registration Form
 */
export async function downloadTenantFormPDF(
  elementId: string,
  filename: string = 'Tenant_Registration_Form.pdf'
): Promise<boolean> {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`[downloadTenantFormPDF] Element with id #${elementId} not found.`)
    return false
  }

  try {
    // Render the DOM element with high DPI scale for crisp Bengali typography
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    })

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

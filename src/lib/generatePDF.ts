import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface PDFOptions {
  elementId: string
  nomeArquivo: string
  brandColors?: { primary: string; secondary?: string; light?: string }
  nomeTerapeuta?: string
  crfto?: string
}

export async function gerarPDF({
  elementId,
  nomeArquivo,
  brandColors = { primary: '#2d7a3a' },
  nomeTerapeuta = '',
  crfto = '',
}: PDFOptions): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Elemento do relatório não encontrado')

  // Ensure element is renderable (may be off-screen)
  const prevPosition = element.style.position
  const prevLeft = element.style.left
  const prevTop = element.style.top
  element.style.position = 'fixed'
  element.style.left = '-9999px'
  element.style.top = '0px'

  await new Promise(resolve => setTimeout(resolve, 400))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: 794,
    height: element.scrollHeight,
    windowWidth: 794,
    windowHeight: element.scrollHeight,
  })

  element.style.position = prevPosition
  element.style.left = prevLeft
  element.style.top = prevTop

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()   // 210mm
  const pageHeight = pdf.internal.pageSize.getHeight() // 297mm
  const marginH = 8
  const marginV = 8
  const contentWidth = pageWidth - marginH * 2
  const contentHeight = pageHeight - marginV * 2 - 8 // leave room for footer

  const pxToMm = 0.264583
  const scaleRatio = contentWidth / (canvas.width * pxToMm)
  const totalMM = canvas.height * pxToMm * scaleRatio
  const totalPages = Math.ceil(totalMM / contentHeight)

  // Parse brand color to RGB
  const hex = brandColors.primary.replace('#', '')
  const pr = parseInt(hex.slice(0, 2), 16) || 45
  const pg = parseInt(hex.slice(2, 4), 16) || 122
  const pb = parseInt(hex.slice(4, 6), 16) || 58

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage()

    const srcY = (page * contentHeight) / scaleRatio / pxToMm
    const srcH = Math.min((contentHeight / scaleRatio) / pxToMm, canvas.height - srcY)
    if (srcH <= 0) break

    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = srcH
    const ctx = pageCanvas.getContext('2d')!
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

    const imgData = pageCanvas.toDataURL('image/png', 1.0)
    const imgH = srcH * pxToMm * scaleRatio

    pdf.addImage(imgData, 'PNG', marginH, marginV, contentWidth, imgH)

    // Footer line (brand color)
    pdf.setDrawColor(pr, pg, pb)
    pdf.setLineWidth(0.4)
    pdf.line(marginH, pageHeight - 9, pageWidth - marginH, pageHeight - 9)

    // Footer text
    pdf.setFontSize(6.5)
    pdf.setTextColor(180, 180, 180)
    const footerLeft = `${nomeTerapeuta}${crfto ? ` | CRF/TO: ${crfto}` : ''} | Terapô.pro`
    const footerRight = `${page + 1} / ${totalPages}`
    pdf.text(footerLeft, marginH, pageHeight - 5)
    pdf.text(footerRight, pageWidth - marginH - 8, pageHeight - 5)
  }

  pdf.save(`${nomeArquivo}.pdf`)
}

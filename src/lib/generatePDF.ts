import jsPDF from 'jspdf'
import { formatarData } from './formatDate'

interface PDFOptions {
  nomeArquivo: string
  conteudo: string
  nomePaciente: string
  nomeTerapeuta?: string
  crfto?: string
  cidPrincipal: string
  financiamento: 'convenio' | 'particular'
  tuss?: string
  periodoInicio: string
  periodoFim: string
  tipoRelatorio?: string
  brandColors?: { primary: string; secondary?: string; light?: string }
  output?: 'save' | 'base64'
}

const TIPO_SUBTITULO: Record<string, string> = {
  evolucao: 'Relatório de Evolução',
  avaliacao: 'Relatório de Avaliação',
  alta: 'Relatório de Alta',
  encaminhamento: 'Relatório de Encaminhamento',
}

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [isNaN(r) ? 45 : r, isNaN(g) ? 122 : g, isNaN(b) ? 58 : b]
}

interface Segment { text: string; bold: boolean }

function splitBold(text: string): Segment[] {
  const parts: Segment[] = []
  const regex = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), bold: false })
    parts.push({ text: m[1], bold: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false })
  return parts.length ? parts : [{ text, bold: false }]
}

interface ParagraphOptions {
  fontSize?: number
  lineHeight?: number
  color?: RGB
  prefix?: string
  prefixColor?: RGB
  indent?: number
}

export async function gerarPDF(opts: PDFOptions): Promise<string | void> {
  const {
    nomeArquivo,
    conteudo,
    nomePaciente,
    nomeTerapeuta = '',
    crfto = '',
    cidPrincipal,
    financiamento,
    tuss,
    periodoInicio,
    periodoFim,
    tipoRelatorio,
    brandColors = { primary: '#2d7a3a' },
    output = 'save',
  } = opts

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginH = 18
  const marginTop = 18
  const marginBottom = 16
  const contentWidth = pageWidth - marginH * 2
  const maxY = pageHeight - marginBottom

  const [pr, pg, pb] = hexToRgb(brandColors.primary)

  let y = marginTop

  function addPageIfNeeded(needed: number) {
    if (y + needed > maxY) {
      pdf.addPage()
      y = marginTop
    }
  }

  function drawParagraph(text: string, x: number, maxWidth: number, options: ParagraphOptions = {}): void {
    const fontSize = options.fontSize ?? 9
    const lineHeight = options.lineHeight ?? 4.6
    const color = options.color ?? [70, 70, 70]
    const indent = options.indent ?? (options.prefix ? 5 : 0)
    const textX = x + indent
    const textMaxWidth = maxWidth - indent

    pdf.setFontSize(fontSize)
    const spaceWidth = pdf.getTextWidth(' ')

    const segments = splitBold(text)
    const words: { word: string; bold: boolean }[] = []
    segments.forEach(seg => {
      seg.text.split(/\s+/).filter(w => w.length > 0).forEach(w => words.push({ word: w, bold: seg.bold }))
    })

    addPageIfNeeded(lineHeight)
    if (options.prefix) {
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(options.prefixColor ? options.prefixColor[0] : color[0], options.prefixColor ? options.prefixColor[1] : color[1], options.prefixColor ? options.prefixColor[2] : color[2])
      pdf.text(options.prefix, x, y)
    }

    let cursorX = textX
    let firstWordOnLine = true
    for (const { word, bold } of words) {
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      const w = pdf.getTextWidth(word)
      if (!firstWordOnLine && cursorX + w > textX + textMaxWidth) {
        y += lineHeight
        addPageIfNeeded(lineHeight)
        cursorX = textX
        firstWordOnLine = true
      }
      pdf.setTextColor(color[0], color[1], color[2])
      pdf.text(word, cursorX, y)
      cursorX += w + spaceWidth
      firstWordOnLine = false
    }
    y += lineHeight
  }

  // Cabecalho: nome do terapeuta + CRF
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(pr, pg, pb)
  pdf.text(nomeTerapeuta || 'Terapeuta', pageWidth - marginH, y, { align: 'right' })
  y += 4
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(140, 140, 140)
  pdf.text('Terapeuta Ocupacional', pageWidth - marginH, y, { align: 'right' })
  if (crfto) {
    y += 3.6
    pdf.text('CRF/TO: ' + crfto, pageWidth - marginH, y, { align: 'right' })
  }
  y += 5

  pdf.setDrawColor(pr, pg, pb)
  pdf.setLineWidth(0.6)
  pdf.line(marginH, y, pageWidth - marginH, y)
  y += 8

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.setTextColor(pr, pg, pb)
  pdf.text('RELATÓRIO CLÍNICO DE TERAPIA OCUPACIONAL', pageWidth / 2, y, { align: 'center' })
  y += 5

  if (tipoRelatorio && TIPO_SUBTITULO[tipoRelatorio]) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(120, 120, 120)
    pdf.text(TIPO_SUBTITULO[tipoRelatorio], pageWidth / 2, y, { align: 'center' })
    y += 7
  } else {
    y += 3
  }

  const hoje = formatarData(new Date())
  const inicio = periodoInicio ? formatarData(periodoInicio) : hoje
  const fim = periodoFim ? formatarData(periodoFim) : hoje
  const financiamentoLabel = financiamento === 'convenio'
    ? 'Convênio' + (tuss ? (' — TUSS: ' + tuss) : '')
    : 'Particular'

  const meta: [string, string][] = [
    ['Paciente', nomePaciente],
    ['Período', inicio + ' a ' + fim],
    ['Diagnóstico (CID-10)', cidPrincipal || '—'],
    ['Financiamento', financiamentoLabel],
    ['Data de emissão', hoje],
  ]

  const colW = contentWidth / 2
  meta.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const mx = marginH + col * colW
    const my = y + row * 9
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(160, 160, 160)
    pdf.text(label, mx, my)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(8.5)
    pdf.setTextColor(50, 50, 50)
    pdf.text(value || '—', mx, my + 4)
  })
  const metaRows = Math.ceil(meta.length / 2)
  y += metaRows * 9 + 4

  pdf.setDrawColor(225, 225, 225)
  pdf.setLineWidth(0.3)
  pdf.line(marginH, y, pageWidth - marginH, y)
  y += 8

  // Corpo: parse do markdown gerado pela IA
  const linhas = conteudo.split('\n')
  for (const rawLinha of linhas) {
    const linha = rawLinha.trimEnd()
    if (!linha.trim()) {
      y += 3
      continue
    }

    if (/^-{3,}$/.test(linha.trim())) {
      addPageIfNeeded(6)
      y += 2
      pdf.setDrawColor(230, 230, 230)
      pdf.setLineWidth(0.25)
      pdf.line(marginH, y, pageWidth - marginH, y)
      y += 5
      continue
    }

    const h2 = linha.match(/^#{1,2}\s+(.*)/)
    if (h2) {
      addPageIfNeeded(11)
      y += 3
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9.5)
      pdf.setTextColor(pr, pg, pb)
      pdf.text(h2[1].toUpperCase(), marginH, y)
      y += 1.8
      pdf.setDrawColor(pr, pg, pb)
      pdf.setLineWidth(0.3)
      pdf.line(marginH, y, pageWidth - marginH, y)
      y += 6
      continue
    }

    const h3 = linha.match(/^#{3}\s+(.*)/)
    if (h3) {
      addPageIfNeeded(8)
      y += 2
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      pdf.setTextColor(90, 90, 90)
      pdf.text(h3[1].toUpperCase(), marginH, y)
      y += 5
      continue
    }

    const li = linha.match(/^[-*]\s+(.*)/)
    if (li) {
      drawParagraph(li[1], marginH, contentWidth, { prefix: '•', prefixColor: [pr, pg, pb] })
      continue
    }

    const liNum = linha.match(/^(\d+)\.\s+(.*)/)
    if (liNum) {
      drawParagraph(liNum[2], marginH, contentWidth, { prefix: liNum[1] + '.', indent: 7 })
      continue
    }

    drawParagraph(linha, marginH, contentWidth)
    y += 2
  }

  // Assinatura
  addPageIfNeeded(30)
  y += 6
  pdf.setDrawColor(pr, pg, pb)
  pdf.setLineWidth(0.6)
  pdf.line(marginH, y, pageWidth - marginH, y)
  y += 10
  pdf.setDrawColor(150, 150, 150)
  pdf.setLineWidth(0.2)
  pdf.line(marginH, y, marginH + 56, y)
  y += 5
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.setTextColor(50, 50, 50)
  pdf.text(nomeTerapeuta || 'Terapeuta', marginH, y)
  y += 4
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(120, 120, 120)
  pdf.text('Terapeuta Ocupacional', marginH, y)
  if (crfto) {
    y += 3.6
    pdf.text('CRF/TO: ' + crfto, marginH, y)
  }

  // Rodape com numeracao final de paginas
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setDrawColor(pr, pg, pb)
    pdf.setLineWidth(0.4)
    pdf.line(marginH, pageHeight - 12, pageWidth - marginH, pageHeight - 12)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(6.5)
    pdf.setTextColor(180, 180, 180)
    const footerLeft = (nomeTerapeuta ? nomeTerapeuta : '') + (crfto ? (' | CRF/TO: ' + crfto) : '') + ' | Terapô.pro'
    pdf.text(footerLeft, marginH, pageHeight - 7)
    pdf.text(i + ' / ' + totalPages, pageWidth - marginH, pageHeight - 7, { align: 'right' })
  }

  if (output === 'base64') {
    return pdf.output('datauristring').split(',')[1]
  }
  pdf.save(nomeArquivo + '.pdf')
}

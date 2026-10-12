/**
 * reportPdf.ts — builds the Individual impact report as a real .pdf file
 * (vector text + tables, not a screenshot) and downloads it.
 *
 * Loaded on demand from MyReports so jsPDF isn't in the page's initial bundle.
 * The built-in PDF font has no ₹ or subscript glyphs, so amounts are written
 * "Rs 1,234" and "tCO2e".
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ReportPdfData {
  name: string
  email: string
  periodLabel: string
  generated: string
  totals: { trees: number; tco2e: number; amount: number; projects: number; verifiedPct: number; verifiedTrees: number; fundings: number; verifiedFundings: number }
  months: { full: string; label: string; trees: number; amount: number; fundings: number }[]
  projects: { name: string; location: string; trees: number; tco2e: number; amount: number; share: number; fundings: number; verifiedFundings: number }[]
  entries: { date: string; id: string; project: string; trees: number; tco2e: number; amount: number; verified: boolean }[]
  tco2ePerTree: number
  filename: string
}

const GREEN: [number, number, number]  = [43, 83, 65]
const BAR: [number, number, number]    = [64, 145, 108]
const INK: [number, number, number]    = [17, 33, 33]
const MUTED: [number, number, number]  = [107, 123, 110]
const FAINT: [number, number, number]  = [154, 167, 156]
const LINE: [number, number, number]   = [234, 227, 218]
const CREAM: [number, number, number]  = [250, 247, 243]
const ORANGE: [number, number, number] = [240, 145, 37]

const rs  = (n: number) => `Rs ${Math.round(n).toLocaleString('en-IN')}`
const num = (n: number) => n.toLocaleString('en-IN')

export function downloadReportPdf(d: ReportPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  const CW = W - M * 2

  // ── Header band ────────────────────────────────────────────────────────────
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('five elements CARM', M, 11)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Impact report', M, 21)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Generated ${d.generated}`, W - M, 11, { align: 'right' })
  doc.setFillColor(...ORANGE)
  doc.rect(0, 30, W, 1.2, 'F')

  // ── Who / when ─────────────────────────────────────────────────────────────
  let y = 42
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(d.name, M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...MUTED)
  y += 6
  doc.text(`${d.email ? d.email + '   |   ' : ''}Period: ${d.periodLabel}`, M, y)

  // ── KPI boxes ──────────────────────────────────────────────────────────────
  y += 7
  const kpis: [string, string, string?][] = [
    ['Trees funded', num(d.totals.trees)],
    ['Carbon offset (est.)', `${d.totals.tco2e} tCO2e`],
    ['Total contributed', rs(d.totals.amount)],
    ['Projects backed', String(d.totals.projects)],
    ['Trees verified', `${d.totals.verifiedPct}%`, `${num(d.totals.verifiedTrees)} of ${num(d.totals.trees)}`],
  ]
  const gap = 3
  const bw = (CW - gap * (kpis.length - 1)) / kpis.length
  kpis.forEach(([label, value, sub], i) => {
    const x = M + i * (bw + gap)
    const dark = i === kpis.length - 1
    doc.setFillColor(...(dark ? GREEN : CREAM))
    doc.setDrawColor(...(dark ? GREEN : LINE))
    doc.roundedRect(x, y, bw, 22, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...(dark ? [210, 225, 215] as [number, number, number] : MUTED))
    doc.text(label, x + 3, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.setTextColor(...(dark ? [255, 255, 255] as [number, number, number] : INK))
    doc.text(value, x + 3, y + 14)
    if (sub) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(sub, x + 3, y + 19)
    }
  })
  y += 32

  // ── Monthly column chart (vector) ──────────────────────────────────────────
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Trees funded by month', M, y)
  y += 4
  const chartH = 42, axisW = 10
  const max = Math.max(1, ...d.months.map(m => m.trees))
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const yMax = [1, 2, 5, 10].map(s => s * pow).find(v => v >= max) ?? max
  const plotX = M + axisW, plotW = CW - axisW, plotTop = y + 4, plotBot = y + 4 + chartH
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  ;[0, yMax / 2, yMax].forEach(t => {
    const ty = plotBot - (t / yMax) * chartH
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(plotX, ty, plotX + plotW, ty)
    doc.setTextColor(...FAINT)
    doc.text(num(Math.round(t)), plotX - 2, ty + 1, { align: 'right' })
  })
  const band = plotW / Math.max(1, d.months.length)
  const barW = Math.min(7, band * 0.6)
  const every = band >= 9 ? 1 : band >= 4.5 ? 2 : 3
  const peak = d.months.reduce((pi, m, i, arr) => (m.trees > arr[pi].trees ? i : pi), 0)
  d.months.forEach((m, i) => {
    const cx = plotX + band * i + band / 2
    if (m.trees > 0) {
      const h = Math.max(0.8, (m.trees / yMax) * chartH)
      doc.setFillColor(...BAR)
      doc.roundedRect(cx - barW / 2, plotBot - h, barW, h, 0.8, 0.8, 'F')
      doc.rect(cx - barW / 2, plotBot - Math.min(h, 0.8), barW, Math.min(h, 0.8), 'F')   // square base
      if (i === peak) {
        doc.setTextColor(...INK)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.text(num(m.trees), cx, plotBot - h - 1.5, { align: 'center' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
      }
    }
    if (i % every === 0) {
      doc.setTextColor(...FAINT)
      doc.text(m.label, cx, plotBot + 4, { align: 'center' })
    }
  })
  y = plotBot + 15

  // ── Shared table look ──────────────────────────────────────────────────────
  const tableStyle = {
    theme: 'plain' as const,
    margin: { left: M, right: M },
    styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 }, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: CREAM, textColor: MUTED, fontStyle: 'bold' as const, fontSize: 7.5 },
    footStyles: { fillColor: CREAM, textColor: INK, fontStyle: 'bold' as const },
  }
  const sectionTitle = (title: string, at: number) => {
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(title, M, at)
  }
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  // ── Impact by project ──────────────────────────────────────────────────────
  sectionTitle('Impact by project', y)
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    head: [['Project', 'Location', 'Trees', 'Share', 'tCO2e', 'Amount', 'Evidence']],
    body: d.projects.map(p => [
      p.name, p.location || '-', num(p.trees), `${p.share}%`, String(p.tco2e), rs(p.amount),
      p.verifiedFundings === p.fundings ? 'Verified' : `${p.verifiedFundings} of ${p.fundings} verified`,
    ]),
    foot: [['Total', '', num(d.totals.trees), '100%', String(d.totals.tco2e), rs(d.totals.amount), `${d.totals.verifiedFundings} of ${d.totals.fundings}`]],
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    didParseCell: (c) => {
      if ((c.section === 'head' || c.section === 'foot') && [2, 3, 4, 5].includes(c.column.index)) c.cell.styles.halign = 'right'
      if (c.section === 'body' && c.column.index === 6) c.cell.styles.textColor = c.cell.raw === 'Verified' ? GREEN : [180, 110, 20]
    },
  })

  // ── All fundings ───────────────────────────────────────────────────────────
  y = lastY() + 10
  if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20 }
  sectionTitle('All fundings in this period', y)
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    head: [['Date', 'Entry', 'Project', 'Trees', 'tCO2e', 'Amount', 'Status']],
    body: d.entries.map(e => [
      e.date, `#${e.id.slice(0, 8).toUpperCase()}`, e.project, num(e.trees), String(e.tco2e), rs(e.amount),
      e.verified ? 'Verified' : 'Awaiting evidence',
    ]),
    columnStyles: { 1: { textColor: MUTED }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    didParseCell: (c) => {
      if (c.section === 'head' && [3, 4, 5].includes(c.column.index)) c.cell.styles.halign = 'right'
      if (c.section === 'body' && c.column.index === 6) c.cell.styles.textColor = c.cell.raw === 'Verified' ? GREEN : [180, 110, 20]
    },
  })

  // ── Method note ────────────────────────────────────────────────────────────
  y = lastY() + 9
  if (y > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); y = 20 }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...INK)
  doc.text('How these numbers are calculated', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  const note = `Carbon offset is an estimate of ${d.tco2ePerTree} tCO2e per funded tree. Amounts include the 10% platform fee. "Verified" means a partner's geo-tagged field evidence for those trees has been approved by Five Elements.`
  doc.text(doc.splitTextToSize(note, CW), M, y + 5)

  // ── Footer on every page ───────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(M, H - 12, W - M, H - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...FAINT)
    doc.text(`five elements CARM  |  Impact report  |  ${d.name}`, M, H - 7)
    doc.text(`Page ${i} of ${pages}`, W - M, H - 7, { align: 'right' })
  }

  doc.save(d.filename)
}

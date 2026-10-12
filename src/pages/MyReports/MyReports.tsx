import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Download, Printer, FileText, Sheet, ChevronDown } from 'lucide-react'
import IndividualLayout from '../ImpactHome/IndividualLayout'
import { useAuth } from '../../contexts/AuthContext'
import { fetchUserImpact } from '../../services/api'
import type { UserImpactEntry } from '../../services/api'
import MonthlyColumns, { type MonthDatum } from './MonthlyColumns'
import '../ImpactHome/ImpactHome.css'
import './MyReports.css'

type Period = 'all' | 'this-year' | 'last-year' | 'last-12'

const TCO2E_PER_TREE = 0.017
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmtINR  = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** [start, end] dates (inclusive) for a period; `all` starts at the first funding. */
function periodRange(period: Period, entries: UserImpactEntry[], now: Date): [Date, Date] {
  const y = now.getFullYear()
  switch (period) {
    case 'this-year': return [new Date(y, 0, 1), now]
    case 'last-year': return [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31, 23, 59, 59)]
    case 'last-12':   return [new Date(y, now.getMonth() - 11, 1), now]
    default: {
      const dates = entries.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()))
      const first = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : now
      return [new Date(first.getFullYear(), first.getMonth(), 1), now]
    }
  }
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv  = rows.map(r => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function MyReports() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [entries, setEntries] = useState<UserImpactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [period, setPeriod]   = useState<Period>('all')
  const [view, setView]       = useState<'chart' | 'table'>('chart')
  const [menuOpen, setMenuOpen] = useState(false)
  const [pdfBusy, setPdfBusy]   = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Download menu: close on outside click or Esc
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    fetchUserImpact(userId)
      .then(d => setEntries(d.entries))
      .catch((e: Error) => setError(e.message || 'Failed to load your report'))
      .finally(() => setLoading(false))
  }, [userId])

  const now = useMemo(() => new Date(), [])
  const [start, end] = useMemo(() => periodRange(period, entries, now), [period, entries, now])

  const inPeriod = useMemo(() => entries.filter(e => {
    const d = new Date(e.date)
    return d >= start && d <= end
  }), [entries, start, end])

  // ── Totals ────────────────────────────────────────────────────────────────
  const trees         = inPeriod.reduce((s, e) => s + (e.trees || 0), 0)
  const amount        = inPeriod.reduce((s, e) => s + (e.amount || 0), 0)
  const tco2e         = Math.round(trees * TCO2E_PER_TREE * 10) / 10
  const verified      = inPeriod.filter(e => e.verified)
  const verifiedTrees = verified.reduce((s, e) => s + (e.trees || 0), 0)
  const projectCount  = new Set(inPeriod.map(e => e.projectId || e.project)).size
  const verifiedPct   = trees > 0 ? Math.round((verifiedTrees / trees) * 100) : 0

  // ── Monthly series ────────────────────────────────────────────────────────
  const months = useMemo<MonthDatum[]>(() => {
    const out: MonthDatum[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const last = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur <= last) {
      out.push({
        key: monthKey(cur), label: MONTHS[cur.getMonth()], full: `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`,
        trees: 0, amount: 0, fundings: 0,
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    const byKey = new Map(out.map(m => [m.key, m]))
    for (const e of inPeriod) {
      const m = byKey.get(monthKey(new Date(e.date)))
      if (!m) continue
      m.trees += e.trees || 0
      m.amount += e.amount || 0
      m.fundings += 1
    }
    return out
  }, [start, end, inPeriod])

  // ── By project ────────────────────────────────────────────────────────────
  const byProject = useMemo(() => {
    const map = new Map<string, { id: string; name: string; location: string; fundings: number; verifiedFundings: number; trees: number; amount: number }>()
    for (const e of inPeriod) {
      const key = e.projectId || e.project
      const p = map.get(key) ?? { id: e.projectId, name: e.project, location: e.location, fundings: 0, verifiedFundings: 0, trees: 0, amount: 0 }
      p.fundings += 1
      if (e.verified) p.verifiedFundings += 1
      p.trees  += e.trees || 0
      p.amount += e.amount || 0
      map.set(key, p)
    }
    return [...map.values()].sort((a, b) => b.trees - a.trees)
  }, [inPeriod])

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'all',       label: 'All time' },
    { key: 'this-year', label: String(now.getFullYear()) },
    { key: 'last-year', label: String(now.getFullYear() - 1) },
    { key: 'last-12',   label: 'Last 12 months' },
  ]
  const periodLabel = period === 'all'
    ? `All time (${fmtDate(start)} – ${fmtDate(end)})`
    : `${fmtDate(start)} – ${fmtDate(end)}`

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['Date', 'Entry ID', 'Project', 'Location', 'Trees', 'tCO2e (est.)', 'Amount (INR)', 'Status'],
      ...inPeriod.map(e => [
        e.date, e.id, e.project, e.location, e.trees, e.tCO2e, Math.round(e.amount), e.verified ? 'Verified' : 'Awaiting evidence',
      ]),
      [],
      ['Total', '', '', '', trees, tco2e, Math.round(amount), `${verified.length} of ${inPeriod.length} verified`],
    ]
    downloadCsv(`impact-report-${period}-${monthKey(now)}.csv`, rows)
  }

  const displayName = user?.displayName || user?.email || ''

  async function exportPdf() {
    setPdfBusy(true)
    try {
      // jsPDF is only fetched when someone actually downloads.
      const { downloadReportPdf } = await import('./reportPdf')
      downloadReportPdf({
        name: displayName,
        email: user?.email || '',
        periodLabel,
        generated: fmtDate(now),
        totals: {
          trees, tco2e, amount, projects: projectCount, verifiedPct, verifiedTrees,
          fundings: inPeriod.length, verifiedFundings: verified.length,
        },
        months: months.map(m => ({ full: m.full, label: m.label, trees: m.trees, amount: m.amount, fundings: m.fundings })),
        projects: byProject.map(p => ({
          name: p.name, location: p.location, trees: p.trees,
          tco2e: Math.round(p.trees * TCO2E_PER_TREE * 10) / 10, amount: p.amount,
          share: trees > 0 ? Math.round((p.trees / trees) * 100) : 0,
          fundings: p.fundings, verifiedFundings: p.verifiedFundings,
        })),
        entries: inPeriod.map(e => ({
          date: fmtDate(new Date(e.date)), id: e.id, project: e.project,
          trees: e.trees, tco2e: e.tCO2e, amount: e.amount, verified: e.verified,
        })),
        tco2ePerTree: TCO2E_PER_TREE,
        filename: `impact-report-${period}-${monthKey(now)}.pdf`,
      })
    } finally {
      setPdfBusy(false)
    }
  }

  const canDownload = !loading && inPeriod.length > 0

  return (
    <IndividualLayout
      title="Reports"
      subtitle="Your personal impact report · print or export any period"
    >
      {error && <div className="db-error-banner">⚠ {error}</div>}

      {/* Period filter */}
      <div className="mr-toolbar no-print">
        <div className="mr-periods">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              className={`mr-period${period === p.key ? ' mr-period--active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mr-download" ref={menuRef}>
          <button
            type="button"
            className="mr-download__btn"
            onClick={() => setMenuOpen(o => !o)}
            disabled={!canDownload || pdfBusy}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Download size={15} /> {pdfBusy ? 'Preparing PDF…' : 'Download report'} <ChevronDown size={14} />
          </button>
          {menuOpen && (
            <div className="mr-download__menu" role="menu">
              <button type="button" role="menuitem" className="mr-download__item" onClick={() => { setMenuOpen(false); exportPdf() }}>
                <FileText size={16} />
                <span><strong>PDF document</strong><small>Formatted report · .pdf</small></span>
              </button>
              <button type="button" role="menuitem" className="mr-download__item" onClick={() => { setMenuOpen(false); exportCsv() }}>
                <Sheet size={16} />
                <span><strong>Spreadsheet</strong><small>All fundings for Excel · .csv</small></span>
              </button>
              <button type="button" role="menuitem" className="mr-download__item" onClick={() => { setMenuOpen(false); window.print() }}>
                <Printer size={16} />
                <span><strong>Print</strong><small>Send this page to a printer</small></span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report header (also heads the printed PDF) */}
      <div className="db-card mr-head">
        <div>
          <div className="mr-head__eyebrow">Impact report</div>
          <h2 className="mr-head__title">{displayName}</h2>
          <div className="mr-head__meta">{periodLabel}</div>
        </div>
        <div className="mr-head__right">
          <div className="mr-head__brand">five elements <strong>CARM</strong></div>
          <div className="mr-head__meta">Generated {fmtDate(now)}</div>
        </div>
      </div>

      {loading ? (
        <>
          <div className="mr-kpis">{[1, 2, 3, 4, 5].map(i => <div key={i} className="db-card db-skel" style={{ height: 96 }} />)}</div>
          <div className="db-card db-skel" style={{ height: 300 }} />
        </>
      ) : inPeriod.length === 0 ? (
        <div className="db-card mr-empty">
          <div className="mr-empty__icon">📊</div>
          <div className="mr-empty__title">No fundings in this period</div>
          <div className="mr-empty__sub">
            {entries.length > 0 ? 'Pick another period above to see your report.' : 'Fund your first trees and your report will build itself here.'}
          </div>
          {entries.length === 0 && (
            <button type="button" className="db-cta-btn" onClick={() => navigate('/impact/projects')}>Browse projects</button>
          )}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="mr-kpis">
            <div className="db-card mr-kpi">
              <span className="mr-kpi__label">Trees funded</span>
              <span className="mr-kpi__value">{trees.toLocaleString('en-IN')}</span>
            </div>
            <div className="db-card mr-kpi">
              <span className="mr-kpi__label">Carbon offset (est.)</span>
              <span className="mr-kpi__value">{tco2e} <small>tCO₂e</small></span>
            </div>
            <div className="db-card mr-kpi">
              <span className="mr-kpi__label">Total contributed</span>
              <span className="mr-kpi__value">{fmtINR(amount)}</span>
            </div>
            <div className="db-card mr-kpi">
              <span className="mr-kpi__label">Projects backed</span>
              <span className="mr-kpi__value">{projectCount}</span>
            </div>
            <div className="db-card mr-kpi mr-kpi--dark">
              <span className="mr-kpi__label">Trees verified</span>
              <span className="mr-kpi__value">{verifiedPct}%</span>
              <span className="mr-kpi__sub">{verifiedTrees.toLocaleString('en-IN')} of {trees.toLocaleString('en-IN')} trees</span>
            </div>
          </div>

          {/* Monthly chart */}
          <div className="db-card mr-card">
            <div className="mr-card__head">
              <div>
                <h3 className="mr-card__title">Trees funded by month</h3>
                <div className="mr-card__sub">{fmtINR(amount)} across {inPeriod.length} funding{inPeriod.length !== 1 ? 's' : ''}</div>
              </div>
              <div className="mr-toggle no-print">
                <button type="button" className={`mr-toggle__btn${view === 'chart' ? ' mr-toggle__btn--active' : ''}`} onClick={() => setView('chart')}>Chart</button>
                <button type="button" className={`mr-toggle__btn${view === 'table' ? ' mr-toggle__btn--active' : ''}`} onClick={() => setView('table')}>Table</button>
              </div>
            </div>
            {view === 'chart' ? (
              <MonthlyColumns data={months} />
            ) : (
              <div className="mr-table-scroll">
                <table className="mr-table">
                  <thead>
                    <tr><th>Month</th><th className="mr-num">Fundings</th><th className="mr-num">Trees</th><th className="mr-num">Amount</th></tr>
                  </thead>
                  <tbody>
                    {months.filter(m => m.fundings > 0).map(m => (
                      <tr key={m.key}>
                        <td>{m.full}</td>
                        <td className="mr-num">{m.fundings}</td>
                        <td className="mr-num">{m.trees.toLocaleString('en-IN')}</td>
                        <td className="mr-num mr-strong">{fmtINR(m.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mr-grid">
            {/* By project */}
            <div className="db-card mr-card mr-card--flush">
              <div className="mr-card__head mr-card__head--pad">
                <div>
                  <h3 className="mr-card__title">Impact by project</h3>
                  <div className="mr-card__sub">{projectCount} project{projectCount !== 1 ? 's' : ''} · share of your trees</div>
                </div>
              </div>
              <div className="mr-table-scroll">
                <table className="mr-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th className="mr-num">Trees</th>
                      <th className="mr-share-col">Share</th>
                      <th className="mr-num">tCO₂e</th>
                      <th className="mr-num">Amount</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProject.map(p => {
                      const share = trees > 0 ? Math.round((p.trees / trees) * 100) : 0
                      return (
                        <tr key={p.id || p.name}>
                          <td>
                            <div className="mr-project">{p.name}</div>
                            {p.location && <div className="mr-loc">{p.location}</div>}
                          </td>
                          <td className="mr-num">{p.trees.toLocaleString('en-IN')}</td>
                          <td className="mr-share-col">
                            <div className="mr-share">
                              <div className="mr-share__track"><div className="mr-share__fill" style={{ width: `${Math.max(share, 2)}%` }} /></div>
                              <span className="mr-share__pct">{share}%</span>
                            </div>
                          </td>
                          <td className="mr-num">{Math.round(p.trees * TCO2E_PER_TREE * 10) / 10}</td>
                          <td className="mr-num mr-strong">{fmtINR(p.amount)}</td>
                          <td>
                            {p.verifiedFundings === p.fundings ? (
                              <span className="ih-badge ih-badge--verified"><CheckCircle2 size={11} /> Verified</span>
                            ) : (
                              <span className="ih-badge ih-badge--in-progress"><Clock size={11} /> {p.verifiedFundings} of {p.fundings} verified</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="mr-num">{trees.toLocaleString('en-IN')}</td>
                      <td className="mr-share-col" />
                      <td className="mr-num">{tco2e}</td>
                      <td className="mr-num">{fmtINR(amount)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Evidence status */}
            <div className="db-card mr-card">
              <h3 className="mr-card__title">Evidence status</h3>
              <div className="mr-card__sub">Trees are verified once geo-tagged field evidence is approved</div>
              <div className="mr-meter" role="img" aria-label={`${verifiedPct}% of trees verified`}>
                <div className="mr-meter__fill" style={{ width: `${verifiedPct}%` }} />
              </div>
              <div className="mr-status">
                <div className="mr-status__row">
                  <span className="mr-status__label"><CheckCircle2 size={14} className="mr-status__icon--ok" /> Verified</span>
                  <span className="mr-status__val">{verifiedTrees.toLocaleString('en-IN')} trees · {verified.length} funding{verified.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="mr-status__row">
                  <span className="mr-status__label"><Clock size={14} className="mr-status__icon--wait" /> Awaiting evidence</span>
                  <span className="mr-status__val">{(trees - verifiedTrees).toLocaleString('en-IN')} trees · {inPeriod.length - verified.length} funding{inPeriod.length - verified.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="mr-method">
                <strong>How these numbers are calculated</strong>
                <p>Carbon offset is an estimate of {TCO2E_PER_TREE} tCO₂e per funded tree. Amounts include the 10% platform fee. "Verified" means a partner's field evidence for those trees has been approved by Five Elements.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </IndividualLayout>
  )
}

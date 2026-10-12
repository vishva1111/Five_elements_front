import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus2 } from 'lucide-react'
import BusinessLayout from './BusinessLayout'
import { fetchReports, createReport, type Report } from '../../services/api'
import Modal from '../../components/ui/Modal'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import { useToast } from '../../components/ui/Toast'
import './ReportsCentre.css'

const FRAMEWORKS = ['GHG Protocol', 'CSRD / ESRS', 'CDP', 'TCFD']

// ── Status pill ────────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const isPublished = status === 'Published'
  return (
    <span className={`rc-status-pill${isPublished ? ' rc-status-pill--published' : ' rc-status-pill--draft'}`}>
      <span className="rc-status-pill--dot" />
      {status}
    </span>
  )
}

// ── Summary stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rc-stat-card">
      <div className="rc-stat-card__label">{label}</div>
      <div className="rc-stat-card__value-row">
        <span className="rc-stat-card__num">{value}</span>
        {sub && <span className="rc-stat-card__sub">{sub}</span>}
      </div>
    </div>
  )
}

const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7B6E', marginBottom: 6 }
const fieldInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1px solid #E2D9D0', borderRadius: 8, padding: '9px 12px',
  fontSize: 13.5, fontFamily: 'inherit', color: '#112121', background: '#fff', outline: 'none',
}

export default function ReportsCentre() {
  const navigate = useNavigate()
  const toast = useToast()
  const thisYear = new Date().getFullYear()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showNew, setShowNew]     = useState(false)
  const [year, setYear]           = useState(thisYear)
  const [framework, setFramework] = useState(FRAMEWORKS[0])
  const [name, setName]           = useState('')
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
      .then(d => setReports(d.reports))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function openNew() {
    // Fresh form every time the popup opens.
    setYear(thisYear)
    setFramework(FRAMEWORKS[0])
    setName('')
    setCreateError(null)
    setShowNew(true)
  }

  async function handleCreate() {
    setCreating(true)
    setCreateError(null)
    try {
      const { report } = await createReport({ year, framework, name: name.trim() || undefined })
      setReports(prev => [report, ...prev])
      setShowNew(false)
      toast.success(`${report.name} created.`)
      navigate(`/business/reports/${encodeURIComponent(report.id)}`)
    } catch (e) {
      setCreateError((e as Error).message || 'Could not create the report')
    } finally {
      setCreating(false)
    }
  }

  const pg = usePagination(reports, 10)
  const publishedCount = reports.filter(r => r.status === 'Published').length
  const draftCount     = reports.filter(r => r.status === 'Draft').length
  const frameworks     = new Set(reports.map(r => r.framework).filter(Boolean)).size

  const isEmpty = !loading && !error && reports.length === 0
  const hasData = !loading && !error && reports.length > 0

  return (
    <BusinessLayout title="Reports" subtitle="GHG Protocol, CSRD and custom reports — generated from your funded, verified impact.">

      {/* Loading skeletons */}
      {loading && (
        <div className="rc-loading">
          <div className="rc-skel-strip">
            {[1, 2, 3, 4].map(i => <div key={i} className="db-skel rc-skel-stat" />)}
          </div>
          <div className="db-skel rc-skel-table" />
        </div>
      )}

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {isEmpty && (
        <div className="rc-empty">
          <div className="rc-empty__icon">📊</div>
          <h2 className="rc-empty__title">No reports yet</h2>
          <p className="rc-empty__sub">
            Generate your first report from your funded, verified impact — ready to print or share.
          </p>
          <button type="button" className="rc-generate-btn" onClick={openNew}>
            <span className="rc-generate-btn__plus">+</span> Generate new report
          </button>
        </div>
      )}

      {hasData && (
        <>
          {/* Summary strip */}
          <div className="rc-summary-strip">
            <StatCard label="Total reports"  value={String(reports.length)} />
            <StatCard label="Published"       value={String(publishedCount)} />
            <StatCard label="Drafts"          value={String(draftCount)} />
            <StatCard label="Frameworks used" value={String(frameworks)} />
          </div>

          {/* Toolbar */}
          <div className="rc-toolbar">
            <span className="rc-toolbar__title">All reports · newest first</span>
            <button type="button" className="rc-generate-btn" onClick={openNew}>
              <span className="rc-generate-btn__plus">+</span> Generate new report
            </button>
          </div>

          {/* Table */}
          <div className="rc-table-wrap">
            <div className="rc-table-scroll">
              <div className="rc-table-head">
                <div className="rc-th">Report ID</div>
                <div className="rc-th">Name</div>
                <div className="rc-th">Status</div>
                <div className="rc-th">Date</div>
                <div className="rc-th"></div>
              </div>

              {pg.items.map(r => (
                <div key={r.id} className="rc-table-row">
                  <div className="rc-td">
                    <span className="rc-report-id">{r.id}</span>
                  </div>
                  <div className="rc-td">
                    <span className="rc-report-name-icon">📄</span>
                    <span className="rc-report-name">{r.name}</span>
                  </div>
                  <div className="rc-td">
                    <StatusPill status={r.status} />
                  </div>
                  <div className="rc-td rc-date-cell">
                    {r.date}
                  </div>
                  <div className="rc-td">
                    <Link to={`/business/reports/${encodeURIComponent(r.id)}`} className="rc-view-link">View →</Link>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 16px 14px' }}><Pagination {...pg} noun="report" /></div>
          </div>
        </>
      )}

      {showNew && (
        <Modal
          icon={<FilePlus2 size={18} />}
          title="Generate a new report"
          subtitle="Built from your organisation's funding and verified evidence for the year you pick."
          error={createError}
          onClose={() => !creating && setShowNew(false)}
          width={520}
          footer={<>
            <button type="button" className="db-modal__cancel" onClick={() => setShowNew(false)} disabled={creating}>Cancel</button>
            <button type="button" className="db-modal__confirm" style={{ background: '#2B5341' }} onClick={handleCreate} disabled={creating}>
              {creating ? 'Generating…' : 'Generate report'}
            </button>
          </>}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <label>
              <span style={fieldLabel}>Year</span>
              <select style={fieldInput} value={year} onChange={e => setYear(Number(e.target.value))}>
                {Array.from({ length: 5 }, (_, i) => thisYear - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>
              <span style={fieldLabel}>Framework</span>
              <select style={fieldInput} value={framework} onChange={e => setFramework(e.target.value)}>
                {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span style={fieldLabel}>Report name (optional)</span>
            <input
              style={fieldInput}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={`${year} ${framework} impact report`}
              maxLength={120}
            />
          </label>
        </Modal>
      )}
    </BusinessLayout>
  )
}

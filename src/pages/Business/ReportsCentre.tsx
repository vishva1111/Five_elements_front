import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import { fetchReports, type Report } from '../../services/api'
import './ReportsCentre.css'

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

export default function ReportsCentre() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReports()
      .then(d => setReports(d.reports))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const publishedCount = reports.filter(r => r.status === 'Published').length
  const draftCount      = reports.filter(r => r.status === 'Draft').length
  const frameworks       = new Set(reports.map(r => r.framework).filter(Boolean)).size

  const isEmpty = !loading && !error && reports.length === 0
  const hasData = !loading && !error && reports.length > 0

  return (
    <BusinessLayout title="Reports" subtitle="CSRD, GHG Protocol, and custom reports — generated from your verified ledger data.">

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
            Generate your first CSRD or GHG Protocol report from your verified ledger data — ready to publish or export.
          </p>
          <button type="button" className="rc-generate-btn">
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
            <span className="rc-toolbar__title">All reports · sorted by date</span>
            <button type="button" className="rc-generate-btn">
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

              {reports.map(r => (
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
                  <div className={`rc-td rc-date-cell${r.status === 'Draft' ? ' rc-date-cell--due' : ''}`}>
                    {r.date}
                  </div>
                  <div className="rc-td">
                    <Link to={`/business/reports/${r.id}`} className="rc-view-link">View →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </BusinessLayout>
  )
}

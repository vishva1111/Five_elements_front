import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import BusinessLayout from './BusinessLayout'
import { fetchReportDetail, type ReportDetailData } from '../../services/api'
import './Dashboard.css'
import './ReportDetail.css'

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [report, setReport] = useState<ReportDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetchReportDetail(id)
      .then(d => setReport(d.report))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  function handleDownloadPdf() {
    window.print()
  }

  return (
    <BusinessLayout title="Report detail" subtitle={id || 'Report'}>
      <Link to="/business/reports" className="rd-back">
        <ArrowLeft size={14} /> Back to reports
      </Link>

      {loading && (
        <div className="rd-loading">
          <div className="db-skel rd-skel-header" />
          <div className="db-skel rd-skel-card" />
          <div className="db-skel rd-skel-card" />
        </div>
      )}

      {error && !loading && (
        <div className="db-error-banner">⚠ {error}</div>
      )}

      {!loading && !error && report && (
        <>
          {/* Header */}
          <div className="rd-header">
            <div className="rd-header__label">📄 Report detail</div>
            <h1 className="rd-header__title">{report.id}</h1>
            <div className="rd-header__sub">
              {report.orgName} · {report.framework} · {report.period}
              {report.status === 'Published' ? (
                <span className="rd-header__status">✓ {report.status}</span>
              ) : (
                <span className="rd-header__status rd-header__status--draft">{report.status}</span>
              )}
            </div>
          </div>

          {/* Emissions summary */}
          <div className="rd-card">
            <div className="rd-card__head">
              <h2 className="rd-card__title">Emissions summary</h2>
              <button type="button" className="rd-card__link" onClick={() => navigate('/business/source-data')}>
                View source records →
              </button>
            </div>
            <div className="rd-scope-grid">
              {report.scopeSummary.map(s => (
                <div key={s.label} className={`rd-scope-card${s.label === 'Total' ? ' rd-scope-card--total' : ''}`}>
                  <div className="rd-scope-card__label">{s.label}</div>
                  <span className="rd-scope-card__num">{s.value}</span>
                  <div className="rd-scope-card__desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Funding summary */}
          <div className="rd-card">
            <div className="rd-card__head">
              <h2 className="rd-card__title">Funding & offsets</h2>
              <Link to="/ledger" className="rd-card__link">View on ledger →</Link>
            </div>
            <div className="rd-funding-grid">
              <div>
                <div className="rd-funding-stat__label">Trees funded</div>
                <span className="rd-funding-stat__num">{report.funding.treesFundedFmt}</span>
              </div>
              <div>
                <div className="rd-funding-stat__label">Verified ledger entries</div>
                <span className="rd-funding-stat__num">{report.funding.verifiedLedgerEntries}</span>
              </div>
            </div>

            {report.ledgerEntries.length > 0 && (
              <div className="rd-ledger-table">
                <div className="rd-ledger-head">
                  <div className="rd-ledger-th">Date</div>
                  <div className="rd-ledger-th">Project</div>
                  <div className="rd-ledger-th">Trees</div>
                  <div className="rd-ledger-th">tCO₂e</div>
                  <div className="rd-ledger-th">Status</div>
                </div>
                {report.ledgerEntries.map(e => (
                  <div key={e.id} className="rd-ledger-row">
                    <div className="rd-ledger-td">{e.date}</div>
                    <div className="rd-ledger-td">{e.project}</div>
                    <div className="rd-ledger-td rd-ledger-td--num">{e.trees.toLocaleString('en-GB')}</div>
                    <div className="rd-ledger-td rd-ledger-td--num">{e.tCO2e.toFixed(2)}</div>
                    <div className="rd-ledger-td">
                      <span className={`rd-ledger-status${e.verified ? ' rd-ledger-status--verified' : ''}`}>
                        {e.verified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {report.ledgerEntries.length === 0 && (
              <p className="rd-ledger-empty">No ledger entries found for this organisation yet.</p>
            )}
          </div>

          {/* Actions */}
          <div className="rd-actions no-print">
            <button type="button" className="rd-btn rd-btn--primary" onClick={handleDownloadPdf}>
              <Download size={15} /> Download PDF
            </button>
          </div>
        </>
      )}
    </BusinessLayout>
  )
}

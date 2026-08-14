import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import { fetchReports, type Report } from '../../services/api'

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

  return (
    <BusinessLayout title="Reports" subtitle="CSRD, GHG Protocol, and custom reports — generated from your verified ledger data.">
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="db-skel" style={{ height: 48, borderRadius: 8 }} />)}
        </div>
      )}
      {error && (
        <div className="db-error-banner">⚠ {error}</div>
      )}
      {!loading && !error && reports.length === 0 && (
        <div className="db-portfolio-empty">
          <div className="db-portfolio-empty__title">No reports yet</div>
          <div className="db-portfolio-empty__sub">Generate your first report to see it here.</div>
          <button className="db-cta-btn">Generate new report</button>
        </div>
      )}
      {!loading && !error && reports.length > 0 && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EEE7DE' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#9AA79C', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Report ID</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#9AA79C', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#9AA79C', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#9AA79C', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F5F0EC' }}>
                    <td style={{ padding: '12px 12px' }}>
                      <code style={{ fontSize: 12, background: '#F5F0EC', padding: '2px 6px', borderRadius: 4, color: '#2B5341' }}>{r.id}</code>
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 500, color: '#112121' }}>{r.name}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <span className={r.status === 'Published' ? 'db-verified-badge' : 'db-element-badge'}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 12px', color: '#6B7B6E', fontSize: 12 }}>{r.date}</td>
                    <td style={{ padding: '12px 12px' }}>
                      <Link to={`/business/reports/${r.id}`} className="db-link">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="db-cta-btn">Generate new report</button>
          </div>
        </>
      )}
    </BusinessLayout>
  )
}
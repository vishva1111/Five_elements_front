import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

interface DashboardData {
  stats: {
    projectsActive:    number
    evidencePending:   number
    submissionsTotal:  number
    treesFunded:       number
    tco2eVerified:     string
    fundersCount:      number
  }
  recentSubmissions: {
    id:        string
    title:     string
    status:    string
    updatedAt: string
  }[]
  recentEvidence: {
    id:        string
    fileName:  string
    project:   string
    uploadedAt: string
  }[]
}

export default function PartnerDashboard() {
  const { session } = useAuth()
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/dashboard`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [session])

  const stats = data?.stats

  return (
    <PartnerLayout title="Partner dashboard">

      {/* Stats strip */}
      <div className="pl-stats">
        {[
          { label: 'Active projects',    val: loading ? '—' : String(stats?.projectsActive ?? 0) },
          { label: 'Evidence pending',   val: loading ? '—' : String(stats?.evidencePending ?? 0) },
          { label: 'Submissions',        val: loading ? '—' : String(stats?.submissionsTotal ?? 0) },
          { label: 'Trees funded',       val: loading ? '—' : (stats?.treesFunded ?? 0).toLocaleString() },
          { label: 'tCO₂e verified',     val: loading ? '—' : (stats?.tco2eVerified ?? '0') },
          { label: 'Funders',            val: loading ? '—' : String(stats?.fundersCount ?? 0) },
        ].map(s => (
          <div key={s.label} className="pl-stat">
            <div className="pl-stat__num">{s.val}</div>
            <div className="pl-stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Quick actions */}
        <div className="pl-card">
          <div className="pl-card__title">Quick actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { to: '/partner/projects/new', label: '+ Register new project',  color: '#2B5341' },
              { to: '/partner/evidence',     label: '📁 Upload evidence',       color: '#185FA5' },
              { to: '/partner/submissions',  label: '📋 View submissions',      color: '#6B7B6E' },
              { to: '/partner/team',         label: '👥 Manage team',           color: '#6B7B6E' },
            ].map(a => (
              <Link
                key={a.to}
                to={a.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 9,
                  background: '#F5F0EC', textDecoration: 'none',
                  fontSize: 13.5, fontWeight: 600, color: a.color,
                  transition: 'background 0.15s',
                }}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent submissions */}
        <div className="pl-card">
          <div className="pl-card__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Recent submissions
            <Link to="/partner/submissions" style={{ fontSize: 12, color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 36 }} />)}
            </div>
          ) : (data?.recentSubmissions?.length ?? 0) === 0 ? (
            <div style={{ fontSize: 13, color: '#9AA79C', padding: '12px 0' }}>No submissions yet.</div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data!.recentSubmissions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td><span className={`pl-badge pl-badge--${s.status}`}>{s.status}</span></td>
                    <td style={{ color: '#9AA79C', fontSize: 12 }}>{s.updatedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent evidence */}
        <div className="pl-card" style={{ gridColumn: '1 / -1' }}>
          <div className="pl-card__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Recent evidence uploads
            <Link to="/partner/evidence" style={{ fontSize: 12, color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>See all →</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 36 }} />)}
            </div>
          ) : (data?.recentEvidence?.length ?? 0) === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">📁</div>
              <div className="pl-empty__title">No evidence uploaded yet</div>
              <div className="pl-empty__sub">Upload geo-tagged photos, GPS files, or reports to support your project submissions.</div>
              <Link to="/partner/evidence" className="pl-btn pl-btn--primary">Upload evidence</Link>
            </div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Project</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {data!.recentEvidence.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>📎 {e.fileName}</td>
                    <td style={{ color: '#6B7B6E' }}>{e.project}</td>
                    <td style={{ color: '#9AA79C', fontSize: 12 }}>{e.uploadedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PartnerLayout>
  )
}
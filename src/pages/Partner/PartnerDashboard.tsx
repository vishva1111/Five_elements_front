import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import './Partner.css'

// project_submissions.status carries values like pending_review / in_review /
// needs_more_info, none of which have a .pl-badge-- class. Map them onto the
// six that Partner.css actually defines.
function badgeClass(s: string) {
  if (s === 'approved')        return 'approved'
  if (s === 'rejected')        return 'rejected'
  if (s === 'in_review')       return 'info'
  if (s === 'needs_more_info') return 'progress'
  return 'pending'
}

interface Alert {
  id:          string
  tone:        'warn' | 'info'
  message:     string
  actionLabel: string
  href:        string
}

interface ActiveProject {
  id:           string
  name:         string
  element:      string
  location:     string
  target:       number
  delivered:    number
  funded:       number
  owed:         number
  progressPct:  number
  fundersCount: number
  lastCapture:  string | null
}

interface FieldActivityItem {
  id:         string
  capturedBy: string
  project:    string
  species:    string | null
  quantity:   number
  eventType:  string
  capturedAt: string
}

interface DashboardData {
  stats: {
    projectsActive:    number
    evidencePending:   number
    submissionsTotal:  number
    treesFunded:       number
    tco2eVerified:     string
    fundersCount:      number
    unitsDelivered:    number
    unitsOwed:         number
  }
  alerts:         Alert[]
  activeProjects: ActiveProject[]
  fieldActivity:  FieldActivityItem[]
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
      `${API_URL}/api/partner/dashboard`,
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
          { label: 'Units funded',       val: loading ? '—' : (stats?.treesFunded ?? 0).toLocaleString('en-IN') },
          { label: 'Delivered (approved)', val: loading ? '—' : (stats?.unitsDelivered ?? 0).toLocaleString('en-IN') },
          // P2-01: the Partner's core obligation, and the platform's promise to
          // funders — it is never hidden behind a click.
          { label: 'Units owed to funders', val: loading ? '—' : (stats?.unitsOwed ?? 0).toLocaleString('en-IN'), owed: true },
          { label: 'tCO₂e verified',     val: loading ? '—' : (stats?.tco2eVerified ?? '0') },
        ].map(s => (
          <div
            key={s.label}
            className="pl-stat"
            style={s.owed ? { background: '#112121', borderColor: '#112121' } : undefined}
          >
            <div className="pl-stat__num" style={s.owed ? { color: '#F09125' } : undefined}>{s.val}</div>
            <div className="pl-stat__label" style={s.owed ? { color: '#AACBA7' } : undefined}>{s.label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Alert strip — every alert links to where it is resolved (P2-02). */}
      {!loading && (data?.alerts?.length ?? 0) > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {data!.alerts.map(a => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                background: a.tone === 'warn' ? '#FEF0E3' : '#EAF2FA',
                border: `1px solid ${a.tone === 'warn' ? '#F5C27A' : '#A8C8E8'}`,
                borderRadius: 10, padding: '11px 16px',
                fontSize: 13, color: a.tone === 'warn' ? '#8B3A00' : '#185FA5',
              }}
            >
              <span style={{ fontWeight: 600 }}>{a.tone === 'warn' ? '⚑' : 'ℹ'}</span>
              <span style={{ flex: 1, minWidth: 200 }}>{a.message}</span>
              <Link
                to={a.href}
                style={{ fontWeight: 700, color: 'inherit', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                {a.actionLabel} →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Active projects — delivery against target, per project */}
      {!loading && (data?.activeProjects?.length ?? 0) > 0 && (
        <div className="pl-card" style={{ marginBottom: 20 }}>
          <div className="pl-card__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            Active projects
            <Link to="/partner/projects" style={{ fontSize: 12, color: '#185FA5', fontWeight: 600, textDecoration: 'none' }}>All projects →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {data!.activeProjects.map(p => (
              <div key={p.id} style={{ border: '1px solid #EDE6DF', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#112121', lineHeight: 1.3 }}>{p.name}</div>
                  <span className="pl-badge pl-badge--approved" style={{ textTransform: 'capitalize' }}>{p.element}</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#9AA79C', margin: '4px 0 12px' }}>📍 {p.location || '—'}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#6B7B6E', marginBottom: 4 }}>
                  <span>{p.delivered.toLocaleString('en-IN')} / {p.target.toLocaleString('en-IN')} delivered</span>
                  <span style={{ fontWeight: 700, color: '#2B5341' }}>{p.progressPct}%</span>
                </div>
                <div style={{ height: 7, background: '#EFEAE4', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.progressPct}%`, background: '#2B5341' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginTop: 10, color: '#6B7B6E' }}>
                  <span>{p.fundersCount} funder{p.fundersCount === 1 ? '' : 's'}</span>
                  {p.owed > 0
                    ? <span style={{ color: '#8B3A00', fontWeight: 700 }}>{p.owed.toLocaleString('en-IN')} owed</span>
                    : <span style={{ color: '#2B5341', fontWeight: 700 }}>Up to date</span>}
                </div>
                {p.lastCapture && (
                  <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 6 }}>last capture {p.lastCapture}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Quick actions */}
        <div className="pl-card">
          <div className="pl-card__title">Quick actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { to: '/partner/projects/new', label: '+ Register new project',  color: '#2B5341' },
              { to: '/partner/trees/new',    label: '🌳 Add a tree',            color: '#2B5341' },
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
                    <td><span className={`pl-badge pl-badge--${badgeClass(s.status)}`}>{s.status.replace(/_/g, ' ')}</span></td>
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

        {/* Field activity — reassures the admin that work is flowing in */}
        <div className="pl-card" style={{ gridColumn: '1 / -1' }}>
          <div className="pl-card__title">Field activity</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 32 }} />)}
            </div>
          ) : (data?.fieldActivity?.length ?? 0) === 0 ? (
            <div style={{ fontSize: 13, color: '#9AA79C', padding: '12px 0' }}>
              No captures yet. Your field team's work will appear here as it arrives.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {data!.fieldActivity.map(a => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0', borderBottom: '0.5px solid #F0EDE8', fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 15 }}>🌱</span>
                  <span style={{ fontWeight: 600, color: '#112121' }}>{a.capturedBy}</span>
                  <span style={{ color: '#6B7B6E' }}>
                    {a.eventType.toLowerCase()} · {a.quantity}{a.species ? ` ${a.species}` : ''}
                  </span>
                  <span style={{ color: '#9AA79C', fontSize: 12 }}>{a.project}</span>
                  <span style={{ marginLeft: 'auto', color: '#9AA79C', fontSize: 12 }}>{a.capturedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  )
}
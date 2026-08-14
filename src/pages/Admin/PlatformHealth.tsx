import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface HealthMetric {
  name:    string
  value:   string
  status:  'ok' | 'warn' | 'error'
  detail?: string
}

interface QueueStat {
  name:    string
  depth:   number
  workers: number
  status:  'ok' | 'warn' | 'error'
}

interface RecentError {
  id:        string
  message:   string
  service:   string
  count:     number
  lastSeen:  string
  severity:  'error' | 'warn'
}

interface HealthData {
  metrics:      HealthMetric[]
  queues:       QueueStat[]
  recentErrors: RecentError[]
  lastUpdated:  string
}

const STATUS_ICON: Record<string, string> = { ok: '✅', warn: '⚠️', error: '🔴' }
const STATUS_COLOR: Record<string, string> = { ok: '#2E7D32', warn: '#E65100', error: '#C62828' }

export default function PlatformHealth() {
  const { session } = useAuth()

  const [data,    setData]    = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/admin/health`, { headers })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [session, refresh])

  const overallStatus = data?.metrics.some(m => m.status === 'error')
    ? 'error'
    : data?.metrics.some(m => m.status === 'warn')
      ? 'warn'
      : 'ok'

  return (
    <AdminLayout title="Platform health" subtitle={data?.lastUpdated ? `Updated ${data.lastUpdated}` : 'Live'}>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setRefresh(r => r + 1)} disabled={loading}>
          {loading ? 'Refreshing…' : '🔄 Refresh'}
        </button>
      </div>

      {/* Overall status banner */}
      {!loading && data && (
        <div className={`ad-alert ad-alert--${overallStatus === 'ok' ? 'success' : overallStatus === 'warn' ? 'warn' : 'danger'}`} style={{ marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
          {STATUS_ICON[overallStatus]} Platform is {overallStatus === 'ok' ? 'fully operational' : overallStatus === 'warn' ? 'degraded — some services need attention' : 'experiencing issues'}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 80 }} />)}
        </div>
      ) : !data ? (
        <div className="ad-empty">
          <div className="ad-empty__icon">📡</div>
          <div className="ad-empty__title">Health data unavailable</div>
          <div className="ad-empty__sub">Could not reach the health endpoint. Check backend connectivity.</div>
        </div>
      ) : (
        <>
          {/* Service metrics */}
          <div className="ad-card" style={{ marginBottom: 16 }}>
            <div className="ad-card__title">Service metrics</div>
            <div className="ad-grid-3" style={{ gap: 12 }}>
              {data.metrics.map(m => (
                <div key={m.name} style={{ padding: '14px 16px', background: '#F5F0EC', borderRadius: 12, borderLeft: `4px solid ${STATUS_COLOR[m.status]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.name}</div>
                    <span style={{ fontSize: 14 }}>{STATUS_ICON[m.status]}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: STATUS_COLOR[m.status] }}>{m.value}</div>
                  {m.detail && <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 2 }}>{m.detail}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Queue depths */}
          {data.queues.length > 0 && (
            <div className="ad-card" style={{ marginBottom: 16 }}>
              <div className="ad-card__title">Queue depths</div>
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Queue</th>
                    <th>Depth</th>
                    <th>Workers</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queues.map(q => (
                    <tr key={q.name}>
                      <td style={{ fontWeight: 600 }}>{q.name}</td>
                      <td style={{ fontWeight: 700, color: q.depth > 100 ? '#C62828' : q.depth > 20 ? '#E65100' : '#2E7D32' }}>{q.depth}</td>
                      <td style={{ color: '#6B7B6E' }}>{q.workers}</td>
                      <td><span className={`ad-badge ad-badge--${q.status === 'ok' ? 'approved' : q.status === 'warn' ? 'pending' : 'rejected'}`}>{q.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent errors */}
          <div className="ad-card">
            <div className="ad-card__title">Recent errors & warnings</div>
            {data.recentErrors.length === 0 ? (
              <div className="ad-empty" style={{ padding: '24px 0' }}>
                <div className="ad-empty__icon">✅</div>
                <div className="ad-empty__title">No recent errors</div>
              </div>
            ) : (
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Message</th>
                    <th>Count</th>
                    <th>Last seen</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentErrors.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600, fontSize: 12.5 }}>{e.service}</td>
                      <td style={{ fontSize: 12.5, color: '#6B7B6E', maxWidth: 320 }}>{e.message}</td>
                      <td style={{ fontWeight: 700, color: e.count > 10 ? '#C62828' : '#112121' }}>{e.count}</td>
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{e.lastSeen}</td>
                      <td><span className={`ad-badge ad-badge--${e.severity === 'error' ? 'rejected' : 'pending'}`}>{e.severity}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
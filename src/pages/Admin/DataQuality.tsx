import React, { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface Flag {
  id:          string
  type:        'duplicate' | 'anomaly' | 'fraud_risk' | 'missing_data'
  severity:    'high' | 'medium' | 'low'
  entity:      string
  entityId:    string
  description: string
  detectedAt:  string
  status:      'open' | 'resolved' | 'dismissed'
}

const TYPE_LABELS: Record<string, string> = {
  duplicate:    'Duplicate',
  anomaly:      'Anomaly',
  fraud_risk:   'Fraud risk',
  missing_data: 'Missing data',
}

const SEV_BADGE: Record<string, string> = {
  high:   'rejected',
  medium: 'pending',
  low:    'info',
}

export default function DataQuality() {
  const { session } = useAuth()

  const [flags,   setFlags]   = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'open' | 'resolved' | 'dismissed' | 'all'>('open')
  const [acting,  setActing]  = useState<string | null>(null)

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/data-quality`, { headers })
      .then(r => r.json())
      .then(d => setFlags(d.flags || []))
      .catch(() => setFlags([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? flags : flags.filter(f => f.status === filter)

  async function updateFlag(id: string, status: 'resolved' | 'dismissed') {
    setActing(id)
    try {
      await fetch(`${API}/api/admin/data-quality/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status }),
      })
      setFlags(prev => prev.map(f => f.id === id ? { ...f, status } : f))
    } catch { /* silent */ }
    finally { setActing(null) }
  }

  const openHigh = flags.filter(f => f.status === 'open' && f.severity === 'high').length

  return (
    <AdminLayout title="Data quality & fraud" subtitle={openHigh > 0 ? `${openHigh} high-severity open` : 'All clear'}>

      <div className="ad-stats ad-grid-4" style={{ marginBottom: 20 }}>
        <div className={`ad-stat ${openHigh > 0 ? 'ad-stat--danger' : 'ad-stat--ok'}`}>
          <div className="ad-stat__num">{openHigh}</div>
          <div className="ad-stat__label">High severity open</div>
        </div>
        <div className="ad-stat ad-stat--warn">
          <div className="ad-stat__num">{flags.filter(f => f.status === 'open' && f.severity === 'medium').length}</div>
          <div className="ad-stat__label">Medium severity open</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{flags.filter(f => f.status === 'open').length}</div>
          <div className="ad-stat__label">Total open flags</div>
        </div>
        <div className="ad-stat ad-stat--ok">
          <div className="ad-stat__num">{flags.filter(f => f.status === 'resolved').length}</div>
          <div className="ad-stat__label">Resolved</div>
        </div>
      </div>

      <div className="ad-tabs">
        {(['open', 'resolved', 'dismissed', 'all'] as const).map(f => (
          <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? flags.length : flags.filter(x => x.status === f).length})
          </button>
        ))}
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 52 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">🛡️</div>
            <div className="ad-empty__title">No {filter === 'all' ? '' : filter} flags</div>
            <div className="ad-empty__sub">Data quality looks good.</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Entity</th>
                <th>Description</th>
                <th>Detected</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id}>
                  <td><span className="ad-badge ad-badge--in_review">{TYPE_LABELS[f.type]}</span></td>
                  <td><span className={`ad-badge ad-badge--${SEV_BADGE[f.severity]}`}>{f.severity}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.entity}</div>
                    <div style={{ color: '#9AA79C', fontSize: 11 }}>{f.entityId}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: '#6B7B6E', maxWidth: 280 }}>{f.description}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{f.detectedAt}</td>
                  <td><span className={`ad-badge ad-badge--${f.status === 'open' ? 'pending' : f.status === 'resolved' ? 'approved' : 'info'}`}>{f.status}</span></td>
                  <td>
                    {f.status === 'open' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={acting === f.id} onClick={() => updateFlag(f.id, 'resolved')}>
                          {acting === f.id ? '…' : 'Resolve'}
                        </button>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" disabled={acting === f.id} onClick={() => updateFlag(f.id, 'dismissed')}>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
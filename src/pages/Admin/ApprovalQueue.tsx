import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface QueueItem {
  id:          string
  type:        'evidence' | 'project' | 'partner'
  title:       string
  submittedBy: string
  submittedAt: string
  element?:    string
  priority:    'high' | 'normal' | 'low'
}

const TYPE_LABELS: Record<string, string> = {
  evidence: 'Evidence',
  project:  'Project',
  partner:  'Partner application',
}

const TYPE_ROUTES: Record<string, string> = {
  evidence: '/admin/evidence',
  project:  '/admin/projects',
  partner:  '/admin/partners',
}

export default function ApprovalQueue() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [items,   setItems]   = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'evidence' | 'project' | 'partner'>('all')

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/queue`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)

  const counts = {
    evidence: items.filter(i => i.type === 'evidence').length,
    project:  items.filter(i => i.type === 'project').length,
    partner:  items.filter(i => i.type === 'partner').length,
  }

  const pendingCounts = { '/admin': items.length }

  return (
    <AdminLayout title="Approval queue" subtitle={`${items.length} pending`} pendingCounts={pendingCounts}>

      {/* Stats */}
      <div className="ad-stats ad-grid-3" style={{ marginBottom: 20 }}>
        <div className="ad-stat ad-stat--warn">
          <div className="ad-stat__num">{counts.evidence}</div>
          <div className="ad-stat__label">Evidence pending</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{counts.project}</div>
          <div className="ad-stat__label">Projects pending</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{counts.partner}</div>
          <div className="ad-stat__label">Partner applications</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="ad-tabs">
        {(['all', 'evidence', 'project', 'partner'] as const).map(f => (
          <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${items.length})` : `${TYPE_LABELS[f]} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">✅</div>
            <div className="ad-empty__title">Queue is clear</div>
            <div className="ad-empty__sub">No pending items. All submissions have been reviewed.</div>
          </div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title / Applicant</th>
                <th>Submitted by</th>
                <th>Element</th>
                <th>Date</th>
                <th>Priority</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`${TYPE_ROUTES[item.type]}/${item.id}`)}>
                  <td>
                    <span className={`ad-badge ad-badge--${item.type === 'evidence' ? 'in_review' : item.type === 'project' ? 'pending' : 'info'}`}>
                      {TYPE_LABELS[item.type]}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.title}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{item.submittedBy}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12.5, textTransform: 'capitalize' }}>{item.element || '—'}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{item.submittedAt}</td>
                  <td>
                    <span className={`ad-badge ad-badge--${item.priority === 'high' ? 'rejected' : item.priority === 'normal' ? 'pending' : 'approved'}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={e => { e.stopPropagation(); navigate(`${TYPE_ROUTES[item.type]}/${item.id}`) }}>
                      Review →
                    </button>
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
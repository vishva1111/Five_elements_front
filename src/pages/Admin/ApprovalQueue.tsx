import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import './Admin.css'

interface QueueItem {
  id:          string
  type:        'evidence' | 'project' | 'partner'
  title:       string
  detail?:     string
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

const ELEMENT_COLORS: Record<string, string> = {
  earth: '#8D6E4A', water: '#2E86C1', fire: '#E4572E', air: '#7FB3A8', space: '#6A4C93',
}

// Pending projects are reviewed in the submission queue and partner
// applications in Partner management — neither has a /:id route of its own.
const reviewPath = (item: QueueItem) => {
  const id = encodeURIComponent(item.id)
  if (item.type === 'project') return `/admin/submissions?focus=${id}`
  if (item.type === 'partner') return `/admin/partners?review=${id}`
  return `/admin/evidence/${id}`
}

export default function ApprovalQueue() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [items,   setItems]   = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all' | 'evidence' | 'project' | 'partner'>('all')

  useEffect(() => {
    fetch(
      `${API_URL}/api/admin/queue`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)

  const pg = usePagination(filtered, 10, filter)

  const counts = {
    evidence: items.filter(i => i.type === 'evidence').length,
    project:  items.filter(i => i.type === 'project').length,
    partner:  items.filter(i => i.type === 'partner').length,
  }

  const STATS = [
    { key: 'evidence' as const, label: 'Evidence pending',     tone: 'ad-stat--warn' },
    { key: 'project'  as const, label: 'Projects pending',     tone: 'ad-stat--ok' },
    { key: 'partner'  as const, label: 'Partner applications', tone: '' },
  ]

  return (
    <AdminLayout title="Approval queue" subtitle={loading ? undefined : `${items.length} pending`}>

      {/* Stats — click to filter */}
      <div className="ad-stats ad-grid-3">
        {STATS.map(s => (
          <button
            key={s.key}
            type="button"
            className={`ad-stat ad-stat--clickable ${s.tone}${filter === s.key ? ' ad-stat--selected' : ''}`}
            onClick={() => setFilter(filter === s.key ? 'all' : s.key)}
            aria-pressed={filter === s.key}
          >
            <div className="ad-stat__num">{loading ? '–' : counts[s.key]}</div>
            <div className="ad-stat__label">{s.label}</div>
          </button>
        ))}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon"><CheckCircle2 size={40} strokeWidth={1.5} color="#2B5341" /></div>
            <div className="ad-empty__title">{filter === 'all' ? 'Queue is clear' : `No pending ${TYPE_LABELS[filter].toLowerCase()} items`}</div>
            <div className="ad-empty__sub">Everything here has been reviewed. New submissions will show up automatically.</div>
          </div>
        ) : (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title / Applicant</th>
                <th>Submitted by</th>
                <th>Element</th>
                <th>Date</th>
                <th>Priority</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map(item => (
                <tr key={`${item.type}-${item.id}`} style={{ cursor: 'pointer' }} onClick={() => navigate(reviewPath(item))}>
                  <td>
                    <span className={`ad-badge ad-badge--${item.type}`}>{TYPE_LABELS[item.type]}</span>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.detail && <div className="ad-table__sub">{item.detail}</div>}
                  </td>
                  <td className="ad-table__muted">{item.submittedBy}</td>
                  <td className="ad-table__muted">
                    {item.element ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ELEMENT_COLORS[item.element.toLowerCase()] || '#9AA79C' }} />
                        {item.element}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="ad-table__muted">{item.submittedAt}</td>
                  <td>
                    <span className={`ad-badge ad-badge--${item.priority === 'high' ? 'rejected' : item.priority === 'low' ? 'approved' : 'neutral'}`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="ad-table__actions">
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={e => { e.stopPropagation(); navigate(reviewPath(item)) }}>
                      Review <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pg} noun="item" />
        </>
        )}
      </div>
    </AdminLayout>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FileSearch, Search } from 'lucide-react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { getValidAccessToken } from '../../services/authTokens'
import { API_URL } from '../../config/api'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import './Admin.css'

/** /admin/evidence — every evidence file by status; a row opens /admin/evidence/:id. */

type Status = 'pending_review' | 'approved' | 'rejected'
type Filter = Status | 'all'

interface EvidenceItem {
  id:          string
  title:       string
  fileName:    string
  fileType:    string
  size:        string
  submittedBy: string
  uploadedAt:  string | null
  element:     string
  treeCount:   number
  status:      Status
  reviewNotes: string
}

const STATUS_LABEL: Record<Status, string> = {
  pending_review: 'Pending',
  approved:       'Approved',
  rejected:       'Rejected',
}

const STATUS_BADGE: Record<Status, string> = {
  pending_review: 'ad-badge--pending',
  approved:       'ad-badge--approved',
  rejected:       'ad-badge--rejected',
}

const TABS: Filter[] = ['pending_review', 'approved', 'rejected', 'all']

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('en-GB') : '—'
}

export default function EvidenceList() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [items,   setItems]   = useState<EvidenceItem[]>([])
  const [counts,  setCounts]  = useState<Record<Status, number>>({ pending_review: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState<Filter>('pending_review')
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    if (!session) return
    let cancelled = false
    setLoading(true)
    setError('')
    ;(async () => {
      try {
        const token = await getValidAccessToken()
        const r = await fetch(`${API_URL}/api/admin/evidence?status=${filter}`, { headers: { Authorization: `Bearer ${token}` } })
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
        if (!cancelled) {
          setItems(d.items || [])
          setCounts(d.counts || { pending_review: 0, approved: 0, rejected: 0 })
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setItems([])
          setError(e instanceof Error ? e.message : 'Could not load evidence.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [session, filter])

  const q = search.trim().toLowerCase()
  const visible = q
    ? items.filter(i => [i.title, i.fileName, i.submittedBy, i.element].some(v => v.toLowerCase().includes(q)))
    : items

  const pg = usePagination(visible, 15, `${filter}|${q}`)
  const total = counts.pending_review + counts.approved + counts.rejected
  const tabCount = (f: Filter) => (f === 'all' ? total : counts[f])

  return (
    <AdminLayout title="Evidence review" subtitle={loading ? undefined : `${counts.pending_review} pending · ${total} total`}>

      <div className="ad-tabs">
        {TABS.map(f => (
          <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : STATUS_LABEL[f]} ({tabCount(f)})
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', maxWidth: 420 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9AA79C', pointerEvents: 'none' }} />
        <input
          type="search"
          className="ad-input"
          aria-label="Search evidence"
          placeholder="Search by project, file or partner"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 36 }}
        />
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0' }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="ad-skel" style={{ height: 44 }} />)}
          </div>
        ) : error ? (
          <div className="ad-empty">
            <div className="ad-empty__title">Could not load evidence</div>
            <div className="ad-empty__sub">{error}</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon"><FileSearch size={40} strokeWidth={1.5} color="#2B5341" /></div>
            <div className="ad-empty__title">
              {q ? 'No evidence matches your search' : filter === 'all' ? 'No evidence uploaded yet' : `No ${STATUS_LABEL[filter].toLowerCase()} evidence`}
            </div>
            <div className="ad-empty__sub">Evidence partners upload with their project submissions shows up here.</div>
          </div>
        ) : (
          <>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>File</th>
                  <th>Submitted by</th>
                  <th>Trees</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {pg.items.map(item => (
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/evidence/${encodeURIComponent(item.id)}`)}>
                    <td style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.element && <div className="ad-table__sub" style={{ textTransform: 'capitalize' }}>{item.element}</div>}
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ overflowWrap: 'anywhere' }}>{item.fileName}</div>
                      <div className="ad-table__sub">{item.size}</div>
                    </td>
                    <td className="ad-table__muted">{item.submittedBy}</td>
                    <td className="ad-table__muted">{item.treeCount ? item.treeCount.toLocaleString('en-IN') : '—'}</td>
                    <td className="ad-table__muted">{formatDate(item.uploadedAt)}</td>
                    <td>
                      <span className={`ad-badge ${STATUS_BADGE[item.status] || 'ad-badge--pending'}`} title={item.reviewNotes || undefined}>
                        {STATUS_LABEL[item.status] || item.status}
                      </span>
                    </td>
                    <td className="ad-table__actions">
                      <button
                        type="button"
                        className="ad-btn ad-btn--ghost ad-btn--sm"
                        onClick={e => { e.stopPropagation(); navigate(`/admin/evidence/${encodeURIComponent(item.id)}`) }}
                      >
                        {item.status === 'pending_review' ? 'Review' : 'View'} <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...pg} noun="file" />
          </>
        )}
      </div>
    </AdminLayout>
  )
}

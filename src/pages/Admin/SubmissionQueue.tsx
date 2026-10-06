import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, X } from 'lucide-react'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import './Admin.css'

interface EvidenceFile {
  id: string
  file_name: string
  file_type: string
  file_size: number | null
  file_url: string | null
}

interface Submission {
  id: string
  title: string
  element: string
  category: string | null
  location: string
  start_date: string
  end_date: string | null
  tree_count: number | null
  partner_type: string
  partner_name: string | null
  partner_review_status: string | null
  status: string
  submitted_by: string
  submitted_by_name: string | null
  submitted_at: string
  outcome: string | null
  evidence_files: EvidenceFile[]
}

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pending review' },
  { key: 'in_review',      label: 'In review' },
  { key: 'more_info',      label: 'More info needed' },
  { key: 'approved',       label: 'Approved' },
  { key: 'rejected',       label: 'Rejected' },
]

const STATUS_BADGE: Record<string, string> = {
  pending_review: 'pending',
  in_review:      'in_review',
  more_info:      'flagged',
  approved:       'approved',
  rejected:       'rejected',
  draft:          'neutral',
}

function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function SubmissionQueue() {
  const { session } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('pending_review')

  async function load(status: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/submissions?status=${status}`,
        { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setSubmissions(data.submissions || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  const pg = usePagination(submissions, 10, statusFilter)

  // Arriving from the approval queue (?focus=<id>) opens the page holding that
  // submission, then scrolls to it.
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const { setPage, pageSize } = pg
  useEffect(() => {
    if (!focusId || loading) return
    const idx = submissions.findIndex(s => s.id === focusId)
    if (idx >= 0) setPage(() => Math.floor(idx / pageSize) + 1)
    // Wait a tick for the page switch to render before scrolling.
    const t = setTimeout(() => {
      document.getElementById(`sub-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => clearTimeout(t)
  }, [focusId, loading])

  const activeLabel = STATUS_TABS.find(t => t.key === statusFilter)?.label || statusFilter

  return (
    <AdminLayout title="Submissions" subtitle={loading ? undefined : `${submissions.length} ${activeLabel.toLowerCase()}`}>

      <div className="ad-tabs">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`ad-tab${statusFilter === tab.key ? ' ad-tab--active' : ''}`}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="ad-alert ad-alert--danger">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="ad-skel" style={{ height: 150 }} />)}
        </div>
      ) : !error && submissions.length === 0 ? (
        <div className="ad-card">
          <div className="ad-empty">
            <div className="ad-empty__icon"><FileText size={38} strokeWidth={1.5} /></div>
            <div className="ad-empty__title">No submissions here</div>
            <div className="ad-empty__sub">Nothing is currently in “{activeLabel}”.</div>
          </div>
        </div>
      ) : <>{pg.items.map(sub => (
        <div
          key={sub.id}
          id={`sub-${sub.id}`}
          className="ad-card"
          style={{ padding: 0, overflow: 'hidden', ...(sub.id === focusId ? { borderColor: '#F09125', boxShadow: '0 0 0 3px rgba(240,145,37,0.15)' } : {}) }}
        >
          {/* Card header */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #F3EEE8', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className={`ad-badge ad-badge--${STATUS_BADGE[sub.status] || 'neutral'}`}>{sub.status.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#112121' }}>{sub.title}</span>
            <span className="ad-table__muted" style={{ marginLeft: 'auto' }}>
              {sub.submitted_by_name ? `${sub.submitted_by_name} · ` : ''}{fmtDate(sub.submitted_at)}
            </span>
          </div>

          {/* Card body */}
          <div className="ad-grid-4" style={{ padding: '16px 22px', rowGap: 14 }}>
            {[
              { label: 'Element',        value: sub.element ? sub.element.charAt(0).toUpperCase() + sub.element.slice(1) : '—' },
              { label: 'Location',       value: sub.location || '—' },
              { label: 'Category',       value: sub.category || '—' },
              { label: 'Trees',          value: sub.tree_count ? `~${sub.tree_count.toLocaleString()}` : '—' },
              { label: 'Partner',        value: sub.partner_name || (sub.partner_type === 'self' ? 'Self-executed' : '—') },
              { label: 'Partner review', value: sub.partner_review_status || 'pending' },
              { label: 'Evidence files', value: `${sub.evidence_files?.length || 0} file(s)` },
              { label: 'Outcome',        value: sub.outcome || '—' },
            ].map(r => (
              <div key={r.label}>
                <div className="ad-kv__label">{r.label}</div>
                <div className="ad-kv__value" style={{ textTransform: r.label === 'Partner review' || r.label === 'Outcome' ? 'capitalize' : undefined }}>{r.value}</div>
              </div>
            ))}
          </div>

          {/* Evidence file list */}
          {sub.evidence_files && sub.evidence_files.length > 0 && (
            <div style={{ padding: '0 22px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sub.evidence_files.map(f => (
                f.file_url ? (
                  <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer" className="ad-badge ad-badge--project" style={{ textDecoration: 'none', textTransform: 'none' }}>
                    <FileText size={12} /> {f.file_name}
                  </a>
                ) : (
                  <span key={f.id} className="ad-badge ad-badge--neutral" style={{ textTransform: 'none' }}>
                    <FileText size={12} /> {f.file_name}
                  </span>
                )
              ))}
            </div>
          )}

          {/* Action footer */}
          <SubmissionActions submissionId={sub.id} currentStatus={sub.status} token={session?.access_token || ''} onDone={() => load(statusFilter)} defaultExpanded={sub.id === focusId} />
        </div>
      ))}
      <Pagination {...pg} noun="submission" />
      </>}
    </AdminLayout>
  )
}

// ── Inline action panel ───────────────────────────────────────────────────────
function SubmissionActions({
  submissionId, currentStatus, token, onDone, defaultExpanded = false,
}: {
  submissionId: string
  currentStatus: string
  token: string
  onDone: () => void
  defaultExpanded?: boolean
}) {
  const [notes, setNotes]         = useState('')
  const [moreInfo, setMoreInfo]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [expanded, setExpanded]   = useState(defaultExpanded)
  // Shown once right after an approval that auto-created a default User for
  // the project — never re-fetchable, so it has to be caught here before
  // onDone() reloads the list and this row collapses to "has been approved."
  const [defaultUserCreds, setDefaultUserCreds] = useState<{ email: string; tempPassword: string; name: string } | null>(null)

  const footer: React.CSSProperties = { borderTop: '1px solid #F3EEE8', padding: '14px 22px', background: '#FCFAF8' }

  if (['approved', 'rejected'].includes(currentStatus) && !defaultUserCreds) {
    return (
      <div style={{ ...footer, fontSize: 12.5, color: '#9AA79C' }}>
        This submission has been {currentStatus}.
      </div>
    )
  }

  if (defaultUserCreds) {
    return (
      <div style={{ padding: '14px 22px' }}>
        <div className="ad-alert ad-alert--success" style={{ marginBottom: 0 }}>
          <div className="ad-panel-head" style={{ marginBottom: 0 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Project approved — a default User was created for it ✓
              </div>
              <div>
                <strong>{defaultUserCreds.email}</strong> ({defaultUserCreds.name}) can sign in with this password:
              </div>
              <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#112121', background: '#fff', border: '1px solid #A5D6A7', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
                {defaultUserCreds.tempPassword}
              </div>
              <div style={{ fontSize: 11.5, marginTop: 6, opacity: 0.85 }}>
                Shown once — copy it now. The partner can rename this account to a real person later from Team.
              </div>
            </div>
            <button
              type="button"
              className="ad-icon-btn"
              onClick={() => { setDefaultUserCreds(null); onDone() }}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function doAction(action: 'approve' | 'reject' | 'more_info', outcome?: string) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${API_URL}/api/admin/submissions/${submissionId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, outcome, reviewNotes: notes, moreInfoRequest: moreInfo }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      if (action === 'approve' && data.defaultUser) {
        setDefaultUserCreds(data.defaultUser)
      } else {
        onDone()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ ...footer, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!expanded ? (
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setExpanded(true)}>
          Review this submission
        </button>
      ) : (
        <>
          <textarea
            className="ad-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Review notes (shown to submitter on approve/reject)…"
            rows={2}
          />
          <textarea
            className="ad-textarea"
            value={moreInfo}
            onChange={e => setMoreInfo(e.target.value)}
            placeholder="More info request (only used if you click 'Request more info')…"
            rows={2}
          />
          {error && <div className="ad-alert ad-alert--danger" style={{ marginBottom: 0 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => doAction('approve', 'verified')} disabled={submitting}>
              Approve — Verified
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ borderColor: '#2B5341', color: '#2B5341' }} onClick={() => doAction('approve', 'self_reported')} disabled={submitting}>
              Approve — Self-reported
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ borderColor: '#F09125', color: '#7A4500' }} onClick={() => doAction('more_info')} disabled={submitting}>
              Request more info
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ color: '#C62828' }} onClick={() => doAction('reject')} disabled={submitting}>
              Reject
            </button>
            <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ marginLeft: 'auto' }} onClick={() => setExpanded(false)}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

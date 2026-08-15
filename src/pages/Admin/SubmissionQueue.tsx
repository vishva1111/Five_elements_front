import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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
  submitted_at: string
  outcome: string | null
  evidence_files: EvidenceFile[]
}

const STATUS_COLORS: Record<string, string> = {
  pending_review: '#F09125',
  in_review:      '#2B5341',
  more_info:      '#7A4500',
  approved:       '#27500A',
  rejected:       '#8B3A00',
  draft:          '#9AA79C',
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/submissions?status=${status}`,
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

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EC', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #EDE6DF', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/admin" style={{ fontSize: 13, color: '#6B7B6E', textDecoration: 'none' }}>← Admin</Link>
        <span style={{ color: '#D8CFC6' }}>|</span>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#112121', margin: 0 }}>Submission Review Queue</h1>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'pending_review', label: 'Pending review' },
            { key: 'in_review',      label: 'In review' },
            { key: 'more_info',      label: 'More info needed' },
            { key: 'approved',       label: 'Approved' },
            { key: 'rejected',       label: 'Rejected' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                height: 34, padding: '0 14px', borderRadius: 9999,
                border: statusFilter === tab.key ? 'none' : '1px solid #D8CFC6',
                background: statusFilter === tab.key ? '#2B5341' : '#FFFFFF',
                color: statusFilter === tab.key ? '#FFFFFF' : '#112121',
                fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7B6E', fontSize: 14 }}>Loading submissions…</div>
        )}
        {error && (
          <div style={{ background: '#FFF3E0', border: '1px solid #F09125', borderRadius: 12, padding: '14px 18px', color: '#7A4500', fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!loading && !error && submissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9AA79C', fontSize: 14 }}>
            No submissions with status "{statusFilter}".
          </div>
        )}

        {!loading && submissions.map(sub => (
          <div key={sub.id} style={{ background: '#FFFFFF', border: '1px solid #EDE6DF', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            {/* Card header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: STATUS_COLORS[sub.status] + '22',
                border: `1px solid ${STATUS_COLORS[sub.status]}`,
                borderRadius: 9999, padding: '3px 10px',
                fontSize: 11.5, fontWeight: 700, color: STATUS_COLORS[sub.status],
              }}>
                {sub.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#112121' }}>{sub.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9AA79C' }}>
                Submitted {fmtDate(sub.submitted_at)}
              </span>
            </div>

            {/* Card body */}
            <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {[
                { label: 'Element',  value: sub.element ? sub.element.charAt(0).toUpperCase() + sub.element.slice(1) : '—' },
                { label: 'Location', value: sub.location || '—' },
                { label: 'Category', value: sub.category || '—' },
                { label: 'Trees',    value: sub.tree_count ? `~${sub.tree_count.toLocaleString()}` : '—' },
                { label: 'Partner',  value: sub.partner_name || (sub.partner_type === 'self' ? 'Self-executed' : '—') },
                { label: 'Partner review', value: sub.partner_review_status || 'pending' },
                { label: 'Evidence files', value: `${sub.evidence_files?.length || 0} file(s)` },
                { label: 'Outcome',  value: sub.outcome || '—' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#9AA79C', minWidth: 110, flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, color: '#112121', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Evidence file list */}
            {sub.evidence_files && sub.evidence_files.length > 0 && (
              <div style={{ padding: '0 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {sub.evidence_files.map(f => (
                  f.file_url ? (
                    <a
                      key={f.id}
                      href={f.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 11.5, color: '#2B5341', background: '#EAF3DE', borderRadius: 6, padding: '3px 9px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {f.file_name}
                    </a>
                  ) : (
                    <span key={f.id} style={{ fontSize: 11.5, color: '#6B7B6E', background: '#F5F0EC', borderRadius: 6, padding: '3px 9px' }}>
                      {f.file_name}
                    </span>
                  )
                ))}
              </div>
            )}

            {/* Action footer */}
            <SubmissionActions submissionId={sub.id} currentStatus={sub.status} token={session?.access_token || ''} onDone={() => load(statusFilter)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inline action panel ───────────────────────────────────────────────────────
function SubmissionActions({
  submissionId, currentStatus, token, onDone,
}: {
  submissionId: string
  currentStatus: string
  token: string
  onDone: () => void
}) {
  const [notes, setNotes]         = useState('')
  const [moreInfo, setMoreInfo]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [expanded, setExpanded]   = useState(false)

  if (['approved', 'rejected'].includes(currentStatus)) {
    return (
      <div style={{ padding: '10px 20px', borderTop: '1px solid #EDE6DF', fontSize: 12, color: '#9AA79C' }}>
        This submission has been {currentStatus}.
      </div>
    )
  }

  async function doAction(action: 'approve' | 'reject' | 'more_info', outcome?: string) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/submissions/${submissionId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, outcome, reviewNotes: notes, moreInfoRequest: moreInfo }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ borderTop: '1px solid #EDE6DF', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          style={{ alignSelf: 'flex-start', height: 34, padding: '0 16px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          Review this submission
        </button>
      ) : (
        <>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Review notes (shown to submitter on approve/reject)…"
            rows={2}
            style={{ width: '100%', borderRadius: 9, border: '1px solid #D8CFC6', padding: '9px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
          />
          <textarea
            value={moreInfo}
            onChange={e => setMoreInfo(e.target.value)}
            placeholder="More info request (only used if you click 'Request more info')…"
            rows={2}
            style={{ width: '100%', borderRadius: 9, border: '1px solid #D8CFC6', padding: '9px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
          />
          {error && <div style={{ fontSize: 12.5, color: '#8B3A00' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => doAction('approve', 'verified')}
              disabled={submitting}
              style={{ height: 36, padding: '0 16px', borderRadius: 9, border: 'none', background: '#2B5341', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              Approve — Verified
            </button>
            <button
              onClick={() => doAction('approve', 'self_reported')}
              disabled={submitting}
              style={{ height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              Approve — Self-reported
            </button>
            <button
              onClick={() => doAction('more_info')}
              disabled={submitting}
              style={{ height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid #F09125', background: '#FFFBF5', color: '#7A4500', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              Request more info
            </button>
            <button
              onClick={() => doAction('reject')}
              disabled={submitting}
              style={{ height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#8B3A00', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              Reject
            </button>
            <button
              onClick={() => setExpanded(false)}
              style={{ height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontFamily: 'Inter, sans-serif', fontSize: 12.5, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
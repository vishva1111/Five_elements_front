import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface EvidenceFile {
  id: string
  file_name: string
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
  partner_role: string | null
  partner_review_status: string | null
  partner_review_notes: string | null
  partner_reviewed_at: string | null
  status: string
  submitted_at: string
  outcome: string | null
  evidence_files: EvidenceFile[]
}

const PARTNER_STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  pending:  { bg: '#FFF3E0', border: '#F09125', text: '#7A4500' },
  approved: { bg: '#EAF3DE', border: '#AACBA7', text: '#27500A' },
  rejected: { bg: '#FFF0EC', border: '#E07050', text: '#8B3A00' },
}

function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

export default function LinkedSubmissions() {
  const { session } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/linked-submissions`,
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

  useEffect(() => { load() }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EC', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #EDE6DF', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/partner" style={{ fontSize: 13, color: '#6B7B6E', textDecoration: 'none' }}>← Partner dashboard</Link>
        <span style={{ color: '#D8CFC6' }}>|</span>
        <h1 style={{ fontSize: 17, fontWeight: 800, color: '#112121', margin: 0 }}>Submissions linked to you</h1>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
        <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, marginBottom: 24 }}>
          These are project submissions where the submitter has named you as the executing partner.
          You can corroborate or raise a concern — the admin reviewer sees your response.
        </p>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7B6E', fontSize: 14 }}>Loading…</div>
        )}
        {error && (
          <div style={{ background: '#FFF3E0', border: '1px solid #F09125', borderRadius: 12, padding: '14px 18px', color: '#7A4500', fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {!loading && !error && submissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#9AA79C', fontSize: 14 }}>
            No submissions are currently linked to your account.
          </div>
        )}

        {!loading && submissions.map(sub => {
          const pStatus = sub.partner_review_status || 'pending'
          const colors  = PARTNER_STATUS_COLORS[pStatus] || PARTNER_STATUS_COLORS.pending

          return (
            <div key={sub.id} style={{ background: '#FFFFFF', border: '1px solid #EDE6DF', borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: colors.bg, border: `1px solid ${colors.border}`,
                  borderRadius: 9999, padding: '3px 10px',
                  fontSize: 11.5, fontWeight: 700, color: colors.text,
                }}>
                  {pStatus === 'pending' ? 'Awaiting your review' : pStatus === 'approved' ? 'You corroborated ✓' : 'You raised a concern'}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#112121' }}>{sub.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9AA79C' }}>
                  Submitted {fmtDate(sub.submitted_at)}
                </span>
              </div>

              {/* Details */}
              <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                {[
                  { label: 'Element',  value: sub.element ? sub.element.charAt(0).toUpperCase() + sub.element.slice(1) : '—' },
                  { label: 'Location', value: sub.location || '—' },
                  { label: 'Category', value: sub.category || '—' },
                  { label: 'Trees',    value: sub.tree_count ? `~${sub.tree_count.toLocaleString()}` : '—' },
                  { label: 'Your role', value: sub.partner_role || '—' },
                  { label: 'Admin status', value: sub.status.replace('_', ' ') },
                  { label: 'Evidence files', value: `${sub.evidence_files?.length || 0} file(s)` },
                  { label: 'Outcome', value: sub.outcome || 'Pending review' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#9AA79C', minWidth: 110, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ fontSize: 12.5, color: '#112121', fontWeight: 600 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Evidence files */}
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

              {/* Partner review notes (if already reviewed) */}
              {pStatus !== 'pending' && sub.partner_review_notes && (
                <div style={{ margin: '0 20px 14px', padding: '10px 14px', background: '#F5F0EC', borderRadius: 9, fontSize: 12.5, color: '#3a453c', lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700 }}>Your note: </span>{sub.partner_review_notes}
                </div>
              )}

              {/* Action panel */}
              <PartnerReviewActions
                submissionId={sub.id}
                currentStatus={pStatus}
                token={session?.access_token || ''}
                onDone={load}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Inline partner action panel ───────────────────────────────────────────────
function PartnerReviewActions({
  submissionId, currentStatus, token, onDone,
}: {
  submissionId: string
  currentStatus: string
  token: string
  onDone: () => void
}) {
  const [notes, setNotes]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [expanded, setExpanded]     = useState(false)

  if (currentStatus !== 'pending') {
    return (
      <div style={{ padding: '10px 20px', borderTop: '1px solid #EDE6DF', fontSize: 12, color: '#9AA79C' }}>
        You have already submitted your review for this submission.
      </div>
    )
  }

  async function doAction(action: 'approve' | 'reject') {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/linked-submissions/${submissionId}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, reviewNotes: notes }),
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
          style={{ alignSelf: 'flex-start', height: 36, padding: '0 16px', borderRadius: 9, border: '1px solid #2B5341', background: '#FFFFFF', color: '#2B5341', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          Submit your review
        </button>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#6B7B6E', margin: 0, lineHeight: 1.55 }}>
            Do you confirm that the work described in this submission was carried out as stated?
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional note (visible to admin and submitter)…"
            rows={2}
            style={{ width: '100%', borderRadius: 9, border: '1px solid #D8CFC6', padding: '9px 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
          />
          {error && <div style={{ fontSize: 12.5, color: '#8B3A00' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => doAction('approve')}
              disabled={submitting}
              style={{ height: 36, padding: '0 18px', borderRadius: 9, border: 'none', background: '#2B5341', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              Yes, I corroborate this ✓
            </button>
            <button
              onClick={() => doAction('reject')}
              disabled={submitting}
              style={{ height: 36, padding: '0 18px', borderRadius: 9, border: '1px solid #E07050', background: '#FFFFFF', color: '#8B3A00', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}
            >
              No, I have a concern
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
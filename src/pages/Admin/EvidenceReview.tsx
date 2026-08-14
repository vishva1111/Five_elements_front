import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Admin.css'

interface EvidenceDetail {
  id:            string
  submissionId:  string
  projectTitle:  string
  element:       string
  submittedBy:   string
  submittedAt:   string
  location:      string
  treeCount:     number
  description:   string
  evidenceNotes: string
  files:         { id: string; name: string; type: string; size: string; url?: string }[]
  status:        string
  reviewNotes?:  string
  partnerName?:  string
}

export default function EvidenceReview() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { session } = useAuth()

  const [detail,      setDetail]      = useState<EvidenceDetail | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [reviewNotes, setReviewNotes] = useState('')
  const [treesVerified, setTreesVerified] = useState('')
  const [co2eVerified,  setCo2eVerified]  = useState('')
  const [acting,      setActing]      = useState<'approve' | 'reject' | null>(null)
  const [done,        setDone]        = useState<'approved' | 'rejected' | null>(null)
  const [error,       setError]       = useState('')

  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    if (!id) return
    fetch(`${API}/api/admin/evidence/${id}`, { headers })
      .then(r => r.json())
      .then(d => {
        setDetail(d)
        setTreesVerified(String(d.treeCount || ''))
        setCo2eVerified(String(d.co2e || ''))
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [id])

  async function handleApprove() {
    if (!id) return
    setActing('approve')
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/evidence/${id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reviewNotes, treesVerified: parseInt(treesVerified, 10) || 0, co2eVerified: parseFloat(co2eVerified) || 0 }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setDone('approved')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  async function handleReject() {
    if (!id || !reviewNotes.trim()) { setError('Please add review notes explaining the rejection.'); return }
    setActing('reject')
    setError('')
    try {
      const res = await fetch(`${API}/api/admin/evidence/${id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reviewNotes }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setDone('rejected')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  if (loading) return (
    <AdminLayout title="Evidence review">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 80 }} />)}
      </div>
    </AdminLayout>
  )

  if (!detail) return (
    <AdminLayout title="Evidence review">
      <div className="ad-empty">
        <div className="ad-empty__icon">❓</div>
        <div className="ad-empty__title">Submission not found</div>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => navigate('/admin')}>← Back to queue</button>
      </div>
    </AdminLayout>
  )

  if (done) return (
    <AdminLayout title="Evidence review">
      <div className="ad-empty">
        <div className="ad-empty__icon">{done === 'approved' ? '✅' : '❌'}</div>
        <div className="ad-empty__title">
          {done === 'approved' ? 'Evidence approved — ledger entry created' : 'Evidence rejected — partner notified'}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="ad-btn ad-btn--primary" onClick={() => navigate('/admin')}>← Back to queue</button>
          {done === 'approved' && (
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => navigate('/admin/ledger')}>View ledger →</button>
          )}
        </div>
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout title="Evidence review" subtitle={detail.projectTitle}>

      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ marginBottom: 20 }} onClick={() => navigate('/admin')}>
        ← Back to queue
      </button>

      {error && <div className="ad-alert ad-alert--danger">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Left — submission details */}
        <div>
          {/* Meta */}
          <div className="ad-card">
            <div className="ad-card__title">Submission details</div>
            <div className="ad-grid-2" style={{ gap: 12 }}>
              {[
                { label: 'Project',       value: detail.projectTitle },
                { label: 'Element',       value: detail.element },
                { label: 'Submitted by',  value: detail.submittedBy },
                { label: 'Partner',       value: detail.partnerName || 'Self-submitted' },
                { label: 'Location',      value: detail.location },
                { label: 'Date',          value: detail.submittedAt },
                { label: 'Trees claimed', value: detail.treeCount?.toLocaleString() || '—' },
                { label: 'Status',        value: detail.status },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: '#9AA79C', fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
                  <div style={{ fontSize: 13.5, color: '#112121', fontWeight: 500 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {detail.description && (
            <div className="ad-card">
              <div className="ad-card__title">Project description</div>
              <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: 0 }}>{detail.description}</p>
            </div>
          )}

          {/* Evidence notes */}
          {detail.evidenceNotes && (
            <div className="ad-card">
              <div className="ad-card__title">Evidence notes (from submitter)</div>
              <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: 0 }}>{detail.evidenceNotes}</p>
            </div>
          )}

          {/* Files */}
          <div className="ad-card">
            <div className="ad-card__title">Evidence files ({detail.files.length})</div>
            {detail.files.length === 0 ? (
              <div style={{ color: '#9AA79C', fontSize: 13 }}>No files attached.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.files.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#F5F0EC', borderRadius: 10 }}>
                    <span style={{ fontSize: 20 }}>{f.type.startsWith('image') ? '🖼️' : f.type.includes('pdf') ? '📄' : '📎'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#112121' }}>{f.name}</div>
                      <div style={{ fontSize: 11.5, color: '#9AA79C' }}>{f.size} · {f.type}</div>
                    </div>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ textDecoration: 'none' }}>
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — review panel */}
        <div>
          <div className="ad-card" style={{ position: 'sticky', top: 20 }}>
            <div className="ad-card__title">Review decision</div>

            <div className="ad-field">
              <label className="ad-label" htmlFor="er-trees">Trees verified</label>
              <input id="er-trees" type="number" className="ad-input" value={treesVerified} onChange={e => setTreesVerified(e.target.value)} placeholder="e.g. 500" />
            </div>

            <div className="ad-field">
              <label className="ad-label" htmlFor="er-co2e">tCO₂e verified</label>
              <input id="er-co2e" type="number" step="0.01" className="ad-input" value={co2eVerified} onChange={e => setCo2eVerified(e.target.value)} placeholder="e.g. 12.5" />
            </div>

            <div className="ad-field">
              <label className="ad-label" htmlFor="er-notes">Review notes <span style={{ color: '#C62828' }}>*required for rejection</span></label>
              <textarea
                id="er-notes"
                className="ad-textarea"
                rows={4}
                placeholder="Add notes for the partner or for the ledger record…"
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="ad-btn ad-btn--primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleApprove}
                disabled={!!acting}
              >
                {acting === 'approve' ? 'Approving…' : '✅ Approve & create ledger entry'}
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--danger"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleReject}
                disabled={!!acting}
              >
                {acting === 'reject' ? 'Rejecting…' : '❌ Reject & notify partner'}
              </button>
              <button type="button" className="ad-btn ad-btn--ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/admin')}>
                Skip for now
              </button>
            </div>

            <div style={{ marginTop: 14, padding: '10px 12px', background: '#F5F0EC', borderRadius: 10, fontSize: 12, color: '#6B7B6E', lineHeight: 1.5 }}>
              <strong>Approve</strong> creates a public ledger entry and notifies the funder.<br />
              <strong>Reject</strong> sends the submission back to the partner with your notes.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
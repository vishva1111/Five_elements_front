import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import { useAuth } from '../../contexts/AuthContext'
import './SubmitProject.css'

type ReviewState = 'draft' | 'inreview' | 'moreinfo' | 'verified' | 'selfreported' | 'rejected'

function PentaSVG({ size = 34, fill = '#EAF3DE', stroke = '#2B5341' }: { size?: number; fill?: string; stroke?: string }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    const cx = size / 2, cy = size / 2, r = size / 2 - 2
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function fmtDate(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

function partnerTypeLabel(t: string) {
  if (t === 'registered')   return 'Platform partner'
  if (t === 'unregistered') return 'External partner (not on platform)'
  return 'Self-executed'
}

export default function ReviewSubmit() {
  const navigate = useNavigate()
  const { draft, updateDraft, clearDraft } = useSubmitProject()
  const { session } = useAuth()

  const [reviewState, setReviewState] = useState<ReviewState>('draft')
  const [declaration, setDeclaration] = useState(draft.declarationAccepted || false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit() {
    if (!declaration) { setError('Please accept the declaration before submitting.'); return }

    // Validate required fields before hitting the API
    const missing: string[] = []
    if (!draft.title)     missing.push('Project title')
    if (!draft.location)  missing.push('Location')
    if (!draft.startDate) missing.push('Start date')
    if (missing.length > 0) {
      setError(`Please complete the following required fields before submitting: ${missing.join(', ')}. Go back to "Project details" to fill them in.`)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/submit-project`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
          body: JSON.stringify({
            draftId: draft.draftId || undefined,
            element: draft.element, category: draft.category, type: draft.type,
            title: draft.title, description: draft.description, location: draft.location,
            startDate: draft.startDate, endDate: draft.endDate, treeCount: draft.treeCount,
            partnerType: draft.partnerType, partnerName: draft.partnerName,
            partnerContact: draft.partnerContact, partnerRole: draft.partnerRole,
            evidenceNotes: draft.evidenceNotes, fileCount: draft.evidenceFiles.length,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      clearDraft()
      // Redirect directly to the user's dashboard after successful submission
      navigate(data.redirectTo || '/impact')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── POST-SUBMISSION STATES ──────────────────────────────────────────────────

  if (reviewState === 'inreview') {
    return (
      <SubmitProjectLayout onSaveExit={() => navigate('/')}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 0 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#EAF3DE', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <path d="M4 14 9 19 22 7" fill="none" stroke="#2B5341" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#112121', margin: 0 }}>Submitted for review</h1>
            <p style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
              Your project is now in the admin review queue. We aim to complete reviews within 5 working days. You will receive an email when the outcome is ready.
            </p>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#27500A' }}>
                <PentaSVG size={10} fill="#2B5341" stroke="#2B5341" />
                In review
              </span>
              <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>{draft.title || 'Your project'}</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Submitted', value: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                { label: 'Reference', value: 'Pending' },
                { label: 'Evidence',  value: draft.evidenceFiles.length > 0 ? `${draft.evidenceFiles.length} file${draft.evidenceFiles.length !== 1 ? 's' : ''} attached` : 'No files' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ width: 90, fontSize: 12.5, color: '#6B7B6E', flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, color: '#112121', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Go to home</button>
            <button type="button" onClick={() => setReviewState('draft')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: '#2B5341', color: '#FFFFFF', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Submit another project</button>
          </div>

          {/* Dev state switcher */}
          <DevSwitcher current={reviewState} onChange={setReviewState} />
        </div>
      </SubmitProjectLayout>
    )
  }

  if (reviewState === 'moreinfo') {
    return (
      <SubmitProjectLayout onSaveExit={() => navigate('/')}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 0 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#112121', margin: 0 }}>More information needed</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFF3E0', border: '1px solid #F09125', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#7A4500' }}>
                Action required
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: 0 }}>The reviewer has a question before they can complete the assessment. Please respond below.</p>
          </div>

          <div style={{ border: '1.5px solid #F09125', borderRadius: 14, background: '#FFFBF5', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7A4500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reviewer note</div>
            <div style={{ fontSize: 13.5, color: '#112121', lineHeight: 1.65 }}>
              The GPS coordinates in photos 6 and 7 fall outside the boundary you drew in step 1. Can you confirm whether these photos were taken at the same site, or clarify the discrepancy?
            </div>
            <div style={{ fontSize: 12, color: '#6B7B6E' }}>Received 18 Aug 2026 - Reviewer: Admin</div>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 14, background: '#FFFFFF', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#112121' }}>Your response</label>
            <textarea
              rows={5}
              placeholder="Explain the discrepancy or provide additional context..."
              style={{ width: '100%', borderRadius: 10, border: '1.5px solid #D8CFC6', padding: '11px 13px', fontFamily: 'Inter,sans-serif', fontSize: 13.5, color: '#112121', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={{ height: 38, padding: '0 16px', borderRadius: 9, border: '1.5px dashed #AACBA7', background: '#FBF8F5', color: '#2B5341', fontFamily: 'Inter,sans-serif', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>+ Attach a file</button>
              <button type="button" style={{ marginLeft: 'auto', height: 38, padding: '0 20px', borderRadius: 9, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Send response</button>
            </div>
          </div>

          <DevSwitcher current={reviewState} onChange={setReviewState} />
        </div>
      </SubmitProjectLayout>
    )
  }

  if (reviewState === 'verified') {
    return (
      <SubmitProjectLayout onSaveExit={() => navigate('/')}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 0 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ width: 64, height: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <PentaSVG size={64} fill="#EAF3DE" stroke="#2B5341" />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#112121', margin: 0 }}>Project verified</h1>
            <p style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
              The reviewer has assessed your evidence and confirmed the project. It is now live on Five Elements with a Verified badge.
            </p>
          </div>

          <div style={{ border: '1.5px solid #AACBA7', borderRadius: 16, background: '#FBFDF8', overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #D4E8D0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#27500A' }}>
                <PentaSVG size={10} fill="#2B5341" stroke="#2B5341" />
                Verified
              </span>
              <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>Community tree planting - Yelahanka</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Verified on', value: '19 Aug 2026' },
                { label: 'Reference',   value: 'FE-2026-00412' },
                { label: 'Tier',        value: 'Verified' },
                { label: 'Reviewer note', value: 'Strong evidence - dated geolocated photos, corroborating invoice and a checkable NGO reference.' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ width: 110, fontSize: 12.5, color: '#6B7B6E', flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, color: '#112121', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Go to home</button>
            <button type="button" style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: '#2B5341', color: '#FFFFFF', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>View project page</button>
          </div>

          <DevSwitcher current={reviewState} onChange={setReviewState} />
        </div>
      </SubmitProjectLayout>
    )
  }

  if (reviewState === 'selfreported') {
    return (
      <SubmitProjectLayout onSaveExit={() => navigate('/')}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 0 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ width: 64, height: 64, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <PentaSVG size={64} fill="#F5F0EC" stroke="#AACBA7" />
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#112121', margin: 0 }}>Project published as Self-reported</h1>
            <p style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
              The reviewer has assessed your evidence. The project is live on Five Elements as Self-reported. You can strengthen the evidence and request a re-review at any time.
            </p>
          </div>

          <div style={{ border: '1px solid #D8CFC6', borderRadius: 16, background: '#FFFFFF', overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F5F0EC', border: '1px solid #D8CFC6', borderRadius: 9999, padding: '4px 11px', fontSize: 11.5, fontWeight: 700, color: '#6B7B6E' }}>
                <PentaSVG size={10} fill="#AACBA7" stroke="#AACBA7" />
                Self-reported
              </span>
              <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>Community tree planting - Yelahanka</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Reviewed on',   value: '19 Aug 2026' },
                { label: 'Reference',     value: 'FE-2026-00412' },
                { label: 'Tier',          value: 'Self-reported' },
                { label: 'Reviewer note', value: 'Photos are genuine but GPS data is incomplete. Adding a corroborating document or partner reference would support a Verified outcome.' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', gap: 12 }}>
                  <span style={{ width: 110, fontSize: 12.5, color: '#6B7B6E', flexShrink: 0 }}>{r.label}</span>
                  <span style={{ fontSize: 12.5, color: '#112121', fontWeight: 600 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 12, background: '#FFFFFF', padding: '14px 16px', fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>
            To lift this to Verified: add a corroborating document (invoice, certificate or partner report) and a checkable partner or registry reference, then request a re-review.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Go to home</button>
            <button type="button" style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Add more evidence</button>
          </div>

          <DevSwitcher current={reviewState} onChange={setReviewState} />
        </div>
      </SubmitProjectLayout>
    )
  }

  if (reviewState === 'rejected') {
    return (
      <SubmitProjectLayout onSaveExit={() => navigate('/')}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 0 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFF0E8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v9M12 17v2" stroke="#8B3A00" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#112121', margin: 0 }}>Project not accepted</h1>
            <p style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 1.65, maxWidth: 480, margin: 0 }}>
              The reviewer was unable to accept this submission. Please read the note below carefully before resubmitting.
            </p>
          </div>

          <div style={{ border: '1.5px solid #D4856A', borderRadius: 14, background: '#FFF5F0', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8B3A00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejection reason</div>
            <div style={{ fontSize: 13.5, color: '#112121', lineHeight: 1.65 }}>
              The photos submitted appear to be stock images rather than original photos of the work. We cannot accept submissions that do not show genuine evidence of the project described. Please resubmit with authentic photos taken at the site.
            </div>
            <div style={{ fontSize: 12, color: '#6B7B6E' }}>Reviewed 19 Aug 2026 - Reviewer: Admin</div>
          </div>

          <div style={{ border: '1px solid #EDE6DF', borderRadius: 12, background: '#FFFFFF', padding: '14px 16px', fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>
            If you believe this decision is incorrect, contact support with your reference number FE-2026-00412.
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => navigate('/')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Go to home</button>
            <button type="button" onClick={() => setReviewState('draft')} style={{ height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: '#F09125', color: '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>Resubmit with new evidence</button>
          </div>

          <DevSwitcher current={reviewState} onChange={setReviewState} />
        </div>
      </SubmitProjectLayout>
    )
  }

  // ── DRAFT STATE (default) ───────────────────────────────────────────────────
  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Review and submit</h1>
        <p>Check everything looks right before sending to the admin review queue. You can go back and edit any section.</p>
      </div>

      {error && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">{error}</div>
        </div>
      )}

      {/* Section 1: Project details — dynamic from draft */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Project details</div>
          <Link to="/submit-project/details" className="sp-review-section__edit">Edit</Link>
        </div>
        {[
          { label: 'Title',       value: draft.title       || '—' },
          { label: 'Element',     value: draft.element     ? draft.element.charAt(0).toUpperCase() + draft.element.slice(1) : '—' },
          { label: 'Category',    value: draft.category    || '—' },
          { label: 'Type',        value: draft.type        || '—' },
          { label: 'Location',    value: draft.location    || '—' },
          { label: 'Start date',  value: fmtDate(draft.startDate) },
          { label: 'End date',    value: draft.endDate ? fmtDate(draft.endDate) : 'Ongoing' },
          { label: 'Trees',       value: draft.treeCount   ? `~${Number(draft.treeCount).toLocaleString()}` : '—' },
          { label: 'Description', value: draft.description || '—' },
        ].map(r => (
          <div key={r.label} className="sp-review-row">
            <span className="sp-review-row__label">{r.label}</span>
            <span className="sp-review-row__value">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Section 2: Partner — dynamic from draft */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Executing partner</div>
          <Link to="/submit-project/partner" className="sp-review-section__edit">Edit</Link>
        </div>
        {draft.partnerType === 'self' ? (
          <div className="sp-review-row">
            <span className="sp-review-row__label">Executed by</span>
            <span className="sp-review-row__value">Self-executed (no external partner)</span>
          </div>
        ) : (
          [
            { label: 'Type',    value: partnerTypeLabel(draft.partnerType) },
            { label: 'Name',    value: draft.partnerName    || '—' },
            { label: 'Contact', value: draft.partnerContact || '—' },
            { label: 'Role',    value: draft.partnerRole    || '—' },
          ].map(r => (
            <div key={r.label} className="sp-review-row">
              <span className="sp-review-row__label">{r.label}</span>
              <span className="sp-review-row__value">{r.value}</span>
            </div>
          ))
        )}
      </div>

      {/* Section 3: Evidence — dynamic from draft */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Evidence</div>
          <Link to="/submit-project/evidence" className="sp-review-section__edit">Edit</Link>
        </div>
        {draft.evidenceFiles.length === 0 ? (
          <div className="sp-review-row">
            <span className="sp-review-row__label">Files</span>
            <span className="sp-review-row__value" style={{ color: '#9AA79C' }}>No files uploaded yet</span>
          </div>
        ) : (
          <>
            <div className="sp-review-row">
              <span className="sp-review-row__label">Files</span>
              <span className="sp-review-row__value">{draft.evidenceFiles.length} file{draft.evidenceFiles.length !== 1 ? 's' : ''} attached</span>
            </div>
            {draft.evidenceFiles.slice(0, 5).map((f, i) => (
              <div key={i} className="sp-review-row" style={{ paddingLeft: 8 }}>
                <span className="sp-review-row__label" style={{ color: '#9AA79C', fontSize: 12 }}>–</span>
                <span className="sp-review-row__value" style={{ fontSize: 12.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>{f.name}</span>
              </div>
            ))}
            {draft.evidenceFiles.length > 5 && (
              <div className="sp-review-row" style={{ paddingLeft: 8 }}>
                <span className="sp-review-row__label" style={{ color: '#9AA79C', fontSize: 12 }}>–</span>
                <span className="sp-review-row__value" style={{ fontSize: 12.5 }}>+{draft.evidenceFiles.length - 5} more files</span>
              </div>
            )}
          </>
        )}
        {draft.evidenceNotes && (
          <div className="sp-review-row">
            <span className="sp-review-row__label">Notes</span>
            <span className="sp-review-row__value">{draft.evidenceNotes}</span>
          </div>
        )}
      </div>

      {/* Declaration */}
      <div style={{ background: '#F5F0EC', borderRadius: 14, padding: '18px 20px', marginBottom: 8 }}>
<label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={declaration}
            onChange={e => { setDeclaration(e.target.checked); updateDraft({ declarationAccepted: e.target.checked }) }}
            style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, accentColor: '#2B5341' }}
          />
          <span style={{ fontSize: 13, color: '#3a453c', lineHeight: 1.6 }}>
            I declare that the information provided is accurate to the best of my knowledge, that I have the right to submit this project, and that the evidence files are genuine records of the work described.
          </span>
        </label>
      </div>

      <div className="sp-nav-row">
        <button type="button" onClick={() => navigate('/submit-project/evidence')} className="sp-btn-back">Back</button>
        <button
          type="button"
          className="sp-btn-continue"
          onClick={handleSubmit}
          disabled={submitting || !declaration}
        >
          {submitting ? 'Submitting...' : 'Submit for review'}
        </button>
      </div>

      <DevSwitcher current={reviewState} onChange={setReviewState} />
    </SubmitProjectLayout>
  )
}

function DevSwitcher({ current, onChange }: { current: ReviewState; onChange: (s: ReviewState) => void }) {
  const states: ReviewState[] = ['draft', 'inreview', 'moreinfo', 'verified', 'selfreported', 'rejected']
  return (
    <div style={{ marginTop: 32, padding: '12px 16px', background: '#F0EDE9', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7B6E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dev: preview state</span>
      {states.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${current === s ? '#2B5341' : '#D8CFC6'}`, background: current === s ? '#2B5341' : '#FFFFFF', color: current === s ? '#FFFFFF' : '#6B7B6E', fontFamily: 'Inter,sans-serif', fontSize: 11.5, fontWeight: current === s ? 700 : 400, cursor: 'pointer' }}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import { useAuth } from '../../contexts/AuthContext'
import './SubmitProject.css'

export default function ReviewSubmit() {
  const navigate = useNavigate()
  const { draft, updateDraft, clearDraft } = useSubmitProject()
  const { session } = useAuth()

  const [declaration, setDeclaration] = useState(draft.declarationAccepted || false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function handleSubmit() {
    if (!declaration) {
      setError('Please accept the declaration before submitting.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/submit-project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            element:        draft.element,
            category:       draft.category,
            type:           draft.type,
            title:          draft.title,
            description:    draft.description,
            location:       draft.location,
            startDate:      draft.startDate,
            endDate:        draft.endDate,
            treeCount:      draft.treeCount,
            partnerType:    draft.partnerType,
            partnerName:    draft.partnerName,
            partnerContact: draft.partnerContact,
            partnerRole:    draft.partnerRole,
            evidenceNotes:  draft.evidenceNotes,
            fileCount:      draft.evidenceFiles.length,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      clearDraft()

      // Redirect based on user role — individual → S7, business → B6
      // For now always go to impact home; business users will be redirected by the backend response
      const dest = data.redirectTo || '/impact'
      navigate(dest, { state: { submitted: true, submissionId: data.id } })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Review & submit</h1>
        <p>
          Check everything looks right before sending to the admin review queue.
          You can go back and edit any section.
        </p>
      </div>

      {error && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">{error}</div>
        </div>
      )}

      {/* Section 1: Project details */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Project details</div>
          <Link to="/submit-project/details" className="sp-review-section__edit">Edit</Link>
        </div>
        {[
          { label: 'Title',       value: draft.title || '—' },
          { label: 'Element',     value: draft.element || '—' },
          { label: 'Category',    value: draft.category || '—' },
          { label: 'Type',        value: draft.type || '—' },
          { label: 'Location',    value: draft.location || '—' },
          { label: 'Start date',  value: draft.startDate || '—' },
          { label: 'End date',    value: draft.endDate || 'Ongoing' },
          { label: 'Tree count',  value: draft.treeCount ? `~${Number(draft.treeCount).toLocaleString()}` : '—' },
          { label: 'Description', value: draft.description || '—' },
        ].map(r => (
          <div key={r.label} className="sp-review-row">
            <span className="sp-review-row__label">{r.label}</span>
            <span className="sp-review-row__value">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Section 2: Partner */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Executing partner</div>
          <Link to="/submit-project/partner" className="sp-review-section__edit">Edit</Link>
        </div>
        {[
          { label: 'Type',    value: draft.partnerType === 'self' ? 'Self-executed' : draft.partnerType === 'registered' ? 'Registered partner' : 'External organisation' },
          { label: 'Name',    value: draft.partnerType === 'self' ? '—' : (draft.partnerName || '—') },
          { label: 'Contact', value: draft.partnerContact || '—' },
          { label: 'Role',    value: draft.partnerRole || '—' },
        ].map(r => (
          <div key={r.label} className="sp-review-row">
            <span className="sp-review-row__label">{r.label}</span>
            <span className="sp-review-row__value">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Section 3: Evidence */}
      <div className="sp-review-section">
        <div className="sp-review-section__header">
          <div className="sp-review-section__title">Evidence</div>
          <Link to="/submit-project/evidence" className="sp-review-section__edit">Edit</Link>
        </div>
        <div className="sp-review-row">
          <span className="sp-review-row__label">Files</span>
          <span className="sp-review-row__value">{draft.evidenceFiles.length} file{draft.evidenceFiles.length !== 1 ? 's' : ''} attached</span>
        </div>
        {draft.evidenceFiles.slice(0, 5).map(f => (
          <div key={f.id} className="sp-review-row" style={{ paddingLeft: 8 }}>
            <span className="sp-review-row__label" style={{ color: '#9AA79C', fontSize: 12 }}>—</span>
            <span className="sp-review-row__value" style={{ fontSize: 12.5 }}>{f.name}</span>
          </div>
        ))}
        {draft.evidenceFiles.length > 5 && (
          <div className="sp-review-row">
            <span className="sp-review-row__label" />
            <span className="sp-review-row__value" style={{ fontSize: 12.5, color: '#9AA79C' }}>
              +{draft.evidenceFiles.length - 5} more
            </span>
          </div>
        )}
        {draft.evidenceNotes && (
          <div className="sp-review-row">
            <span className="sp-review-row__label">Notes</span>
            <span className="sp-review-row__value">{draft.evidenceNotes}</span>
          </div>
        )}
      </div>

      {/* Declaration */}
      <div style={{ background: '#F5F0EC', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
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

      {/* Footer nav */}
      <div className="sp-footer">
        <button type="button" className="sp-btn sp-btn--ghost" onClick={() => navigate('/submit-project/evidence')}>
          ← Back
        </button>
        <button
          type="button"
          className="sp-btn sp-btn--orange"
          onClick={handleSubmit}
          disabled={submitting || !declaration}
        >
          {submitting ? 'Submitting…' : 'Submit for review →'}
        </button>
      </div>
    </SubmitProjectLayout>
  )
}
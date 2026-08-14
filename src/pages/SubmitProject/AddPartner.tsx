import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import './SubmitProject.css'

const PARTNER_TYPES = [
  { id: 'registered', label: 'Registered Five Elements partner', desc: 'Search for a verified partner already on the platform.' },
  { id: 'unregistered', label: 'External organisation', desc: "An NGO or contractor not yet on the platform \u2014 we'll invite them." },
  { id: 'self', label: 'I executed this myself', desc: 'You or your team did the work directly, no third party.' },
]

export default function AddPartner() {
  const navigate = useNavigate()
  const { draft, updateDraft } = useSubmitProject()

  const [partnerType,    setPartnerType]    = useState(draft.partnerType || 'self')
  const [partnerName,    setPartnerName]    = useState(draft.partnerName || '')
  const [partnerContact, setPartnerContact] = useState(draft.partnerContact || '')
  const [partnerRole,    setPartnerRole]    = useState(draft.partnerRole || '')
  const [errors,         setErrors]         = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (partnerType !== 'self' && !partnerName.trim()) {
      e.partnerName = 'Organisation name is required'
    }
    return e
  }

  function handleNext() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    updateDraft({ partnerType, partnerName, partnerContact, partnerRole })
    navigate('/submit-project/evidence')
  }

  function handleBack() {
    updateDraft({ partnerType, partnerName, partnerContact, partnerRole })
    navigate('/submit-project/details')
  }

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Who executed this project?</h1>
        <p>
          Tell us about the organisation or individual who carried out the work on the ground.
          This helps our admin team verify the submission.
        </p>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">
            <strong>Please fix the highlighted fields before continuing.</strong>
          </div>
        </div>
      )}

      <div className="sp-cols">
        <div className="sp-col-main">

          {/* Partner type selector */}
          <div className="sp-field">
            <div className="sp-label">Partner type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PARTNER_TYPES.map(pt => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPartnerType(pt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 16px',
                    border: `1.5px solid ${partnerType === pt.id ? '#2B5341' : '#D8CFC6'}`,
                    borderRadius: 12,
                    background: partnerType === pt.id ? '#EAF3DE' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: `2px solid ${partnerType === pt.id ? '#2B5341' : '#D8CFC6'}`,
                    background: partnerType === pt.id ? '#2B5341' : '#fff',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {partnerType === pt.id && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#112121', marginBottom: 2 }}>{pt.label}</div>
                    <div style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.4 }}>{pt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Partner details — shown for registered / unregistered */}
          {partnerType !== 'self' && (
            <>
              <div className="sp-field">
                <label className="sp-label sp-label--required" htmlFor="c2-name">
                  {partnerType === 'registered' ? 'Search partner name' : 'Organisation name'}
                </label>
                <input
                  id="c2-name"
                  type="text"
                  className={`sp-input ${errors.partnerName ? 'sp-input--error' : ''}`}
                  placeholder={partnerType === 'registered' ? 'Type to search registered partners…' : 'e.g. Green Earth Foundation'}
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                />
                {errors.partnerName && <div className="sp-field-error">{errors.partnerName}</div>}
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="c2-contact">Contact email or phone</label>
                <input
                  id="c2-contact"
                  type="text"
                  className="sp-input"
                  placeholder="contact@partner.org"
                  value={partnerContact}
                  onChange={e => setPartnerContact(e.target.value)}
                />
                <div className="sp-field-hint">We may reach out to them during verification.</div>
              </div>

              <div className="sp-field">
                <label className="sp-label" htmlFor="c2-role">Their role in the project</label>
                <textarea
                  id="c2-role"
                  className="sp-textarea"
                  rows={2}
                  placeholder="e.g. Planted and maintained trees, provided GPS coordinates and photo evidence…"
                  value={partnerRole}
                  onChange={e => setPartnerRole(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Self-executed note */}
          {partnerType === 'self' && (
            <div style={{ background: '#F5F0EC', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>
                You'll be listed as the executing party. In the next step, add photos, GPS data, or any other evidence of the work you did.
              </div>
            </div>
          )}
        </div>

        {/* Side card */}
        <div className="sp-col-side">
          <div className="sp-side-card">
            <div className="sp-side-card__title">Why do we ask?</div>
            <p style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>
              Verification requires knowing who did the work. If the partner is already on Five Elements, we can cross-reference their records automatically.
            </p>
          </div>
          <div className="sp-side-card">
            <div className="sp-side-card__title">Project so far</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Title',    value: draft.title || '—' },
                { label: 'Element',  value: draft.element || '—' },
                { label: 'Location', value: draft.location || '—' },
              ].map(r => (
                <div key={r.label} className="sp-review-row">
                  <span className="sp-review-row__label">{r.label}</span>
                  <span className="sp-review-row__value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="sp-footer">
        <button type="button" className="sp-btn sp-btn--ghost" onClick={handleBack}>
          ← Back
        </button>
        <button type="button" className="sp-btn sp-btn--primary" onClick={handleNext}>
          Next: Add evidence →
        </button>
      </div>
    </SubmitProjectLayout>
  )
}
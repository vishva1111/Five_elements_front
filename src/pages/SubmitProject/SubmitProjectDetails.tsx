import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import './SubmitProject.css'

// ── Element definitions ───────────────────────────────────────────────────────
const ELEMENTS = [
  { id: 'earth', label: 'Earth', emoji: '🌍', color: '#2B5341', fill: '#EAF3DE', stroke: '#2B5341', live: true },
  { id: 'water', label: 'Water', emoji: '💧', color: '#185FA5', fill: '#EAF2FA', stroke: '#185FA5', live: false },
  { id: 'fire',  label: 'Fire',  emoji: '🔥', color: '#C0392B', fill: '#FEF0E3', stroke: '#C0392B', live: false },
  { id: 'air',   label: 'Air',   emoji: '🌬️', color: '#6B7B6E', fill: '#F5F0EC', stroke: '#9AA79C', live: false },
  { id: 'space', label: 'Space', emoji: '✨', color: '#6B7B6E', fill: '#F5F0EC', stroke: '#9AA79C', live: false },
]

const CATEGORIES = [
  'Afforestation & land',
  'Soil restoration',
  'Agroforestry',
  'Mangrove planting',
  'Urban greening',
  'Native forest restoration',
]

const TYPES = [
  'Community tree planting',
  'Native forest restoration',
  'Mangrove planting',
  'Urban greening',
  'Agroforestry system',
  'Soil carbon project',
]

// ── Pentagon SVG ──────────────────────────────────────────────────────────────
function PentaSVG({ fill, stroke }: { fill: string; stroke: string }) {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    return `${(17 + 14 * Math.cos(a)).toFixed(1)},${(17 + 14 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function SubmitProjectDetails() {
  const navigate = useNavigate()
  const { draft, updateDraft } = useSubmitProject()

  const [element,     setElement]     = useState(draft.element || 'earth')
  const [category,    setCategory]    = useState(draft.category || '')
  const [type,        setType]        = useState(draft.type || '')
  const [title,       setTitle]       = useState(draft.title || '')
  const [description, setDescription] = useState(draft.description || '')
  const [location,    setLocation]    = useState(draft.location || '')
  const [startDate,   setStartDate]   = useState(draft.startDate || '')
  const [endDate,     setEndDate]     = useState(draft.endDate || '')
  const [treeCount,   setTreeCount]   = useState(draft.treeCount || '')
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())    e.title    = 'Project title is required'
    if (!location.trim()) e.location = 'Location is required'
    if (!startDate)       e.startDate = 'Start date is required'
    return e
  }

  function handleNext() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    updateDraft({ element, category, type, title, description, location, startDate, endDate, treeCount })
    navigate('/submit-project/partner')
  }

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Tell us about the project</h1>
        <p>
          Work you've already done off-platform — completed or still going. It stays{' '}
          <strong>private to you</strong>: never in the public marketplace, never fundable by others.
        </p>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">
            <strong>{Object.keys(errors).length} thing{Object.keys(errors).length > 1 ? 's' : ''} need attention before you continue</strong>
            {' '}— {Object.values(errors).join(', ')}.
          </div>
        </div>
      )}

      <div className="sp-cols">
        {/* LEFT: form */}
        <div className="sp-col-main">

          {/* Element picker */}
          <div className="sp-field">
            <div className="sp-label">Element</div>
            <div className="sp-element-grid">
              {ELEMENTS.map(el => (
                <button
                  key={el.id}
                  type="button"
                  className={`sp-element-btn ${element === el.id ? 'sp-element-btn--selected' : ''}`}
                  onClick={() => el.live && setElement(el.id)}
                  disabled={!el.live}
                  aria-label={el.label}
                >
                  <PentaSVG fill={element === el.id ? el.fill : '#F5F0EC'} stroke={element === el.id ? el.stroke : '#D8CFC6'} />
                  <span className="sp-element-btn__label" style={{ color: element === el.id ? el.color : '#9AA79C' }}>
                    {el.label}
                  </span>
                  {!el.live && <span className="sp-element-btn__soon">Coming soon</span>}
                </button>
              ))}
            </div>
            <div className="sp-field-hint">Earth is live at beta. Four elements are coming soon.</div>
          </div>

          {/* Category & Type */}
          <div className="sp-grid-2">
            <div className="sp-field">
              <label className="sp-label" htmlFor="c1-cat">Category</label>
              <select id="c1-cat" className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="c1-type">Type</label>
              <select id="c1-type" className="sp-select" value={type} onChange={e => setType(e.target.value)}>
                <option value="">Select type…</option>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="sp-field">
            <label className="sp-label sp-label--required" htmlFor="c1-title">Project title</label>
            <input
              id="c1-title"
              type="text"
              className={`sp-input ${errors.title ? 'sp-input--error' : ''}`}
              placeholder="e.g. Sahyadri Reforestation 2023"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            {errors.title && <div className="sp-field-error">{errors.title}</div>}
          </div>

          {/* Description */}
          <div className="sp-field">
            <label className="sp-label" htmlFor="c1-desc">Description</label>
            <textarea
              id="c1-desc"
              className="sp-textarea"
              rows={3}
              placeholder="Briefly describe the project, its goals, and what was achieved…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="sp-field">
            <label className="sp-label sp-label--required" htmlFor="c1-loc">Location</label>
            <input
              id="c1-loc"
              type="text"
              className={`sp-input ${errors.location ? 'sp-input--error' : ''}`}
              placeholder="Village, district, state, country"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
            {errors.location && <div className="sp-field-error">{errors.location}</div>}
          </div>

          {/* Dates */}
          <div className="sp-grid-2">
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="c1-start">Start date</label>
              <input
                id="c1-start"
                type="date"
                className={`sp-input ${errors.startDate ? 'sp-input--error' : ''}`}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              {errors.startDate && <div className="sp-field-error">{errors.startDate}</div>}
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="c1-end">End date <span style={{ fontWeight: 400, textTransform: 'none', color: '#9AA79C' }}>(if complete)</span></label>
              <input
                id="c1-end"
                type="date"
                className="sp-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Tree count */}
          <div className="sp-field">
            <label className="sp-label" htmlFor="c1-trees">Approximate tree / unit count</label>
            <input
              id="c1-trees"
              type="number"
              className="sp-input"
              placeholder="e.g. 5000"
              min={0}
              value={treeCount}
              onChange={e => setTreeCount(e.target.value)}
            />
            <div className="sp-field-hint">Best estimate is fine — evidence will confirm the exact number.</div>
          </div>
        </div>

        {/* RIGHT: side card */}
        <div className="sp-col-side">
          <div className="sp-side-card">
            <div className="sp-side-card__title">Why submit a past project?</div>
            <p style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.6 }}>
              Get your existing work verified and on the public ledger. Once approved, it appears on your profile and generates a shareable certificate.
            </p>
          </div>
          <div className="sp-side-card">
            <div className="sp-side-card__title">What happens next</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n: '1', t: 'Add partner & evidence' },
                { n: '2', t: 'Admin reviews submission' },
                { n: '3', t: 'Ledger entry created' },
                { n: '4', t: 'Certificate issued' },
              ].map(s => (
                <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EAF3DE', color: '#2B5341', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{s.n}</span>
                  <span style={{ fontSize: 13, color: '#3a453c', lineHeight: 1.4 }}>{s.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="sp-footer">
        <div />
        <button type="button" className="sp-btn sp-btn--primary" onClick={handleNext}>
          Next: Executing partner →
        </button>
      </div>
    </SubmitProjectLayout>
  )
}
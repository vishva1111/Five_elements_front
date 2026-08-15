import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject } from './useSubmitProject'
import { useAuth } from '../../contexts/AuthContext'
import './SubmitProject.css'

// ── Element definitions ───────────────────────────────────────────────────────
const ELEMENTS = [
  { id: 'earth', label: 'Earth', color: '#2B5341', fill: '#EAF3DE', stroke: '#2B5341', live: true },
  { id: 'water', label: 'Water', color: '#185FA5', fill: '#EAF2FA', stroke: '#185FA5', live: false },
  { id: 'fire',  label: 'Fire',  color: '#C0392B', fill: '#FEF0E3', stroke: '#C0392B', live: false },
  { id: 'air',   label: 'Air',   color: '#6B7B6E', fill: '#F5F0EC', stroke: '#9AA79C', live: false },
  { id: 'ether', label: 'Ether', color: '#6B7B6E', fill: '#F5F0EC', stroke: '#9AA79C', live: false },
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

// ── Map placeholder ───────────────────────────────────────────────────────────
function MapPlaceholder({ location, onLocationChange, hasError }: {
  location: string
  onLocationChange: (v: string) => void
  hasError: boolean
}) {
  const [drawMode, setDrawMode] = useState<'poly' | 'point'>('poly')
  const [hasMarked, setHasMarked] = useState(!!location)

  return (
    <div style={{ border: hasError ? '1.5px solid #8B3A00' : '1px solid #D8CFC6', borderRadius: 14, overflow: 'hidden', background: '#FFFFFF' }}>
      {/* Map header */}
      <div style={{ padding: '11px 15px', borderBottom: '1px solid #EDE6DF', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2B5341', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Where the work happened</span>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', background: '#F5F0EC', borderRadius: 8, padding: 2, gap: 2 }}>
          {(['poly', 'point'] as const).map((mode, i) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDrawMode(mode)}
              style={{ height: 28, padding: '0 11px', borderRadius: 6, border: 'none', background: drawMode === mode ? '#FFFFFF' : 'transparent', color: drawMode === mode ? '#112121' : '#6B7B6E', fontFamily: 'Inter,sans-serif', fontSize: 11.5, fontWeight: drawMode === mode ? 700 : 400, cursor: 'pointer' }}
            >
              {i === 0 ? 'Draw area' : 'Drop point'}
            </button>
          ))}
        </div>
      </div>

      {/* Map area — SVG placeholder */}
      <div style={{ position: 'relative', background: '#F2F0E9', cursor: 'crosshair' }} onClick={() => { setHasMarked(true); if (!location) onLocationChange('Location marked on map') }}>
        <svg viewBox="0 0 400 220" style={{ display: 'block', width: '100%' }} role="img" aria-label="Map for marking the project location">
          <rect width="400" height="220" fill="#F2F0E9" />
          <path d="M0 175 C80 162 120 185 190 178 S330 183 400 168 L400 220 0 220 Z" fill="#DDE9F2" />
          <path d="M40 50 C 110 33, 200 68, 290 47 S 380 76, 400 68" stroke="#E2DAD1" strokeWidth="10" fill="none" opacity="0.8" />
          {hasMarked && drawMode === 'poly' && (
            <>
              <polygon points="96,62 268,44 336,98 288,174 128,180 66,124" fill="#EAF3DE" fillOpacity="0.75" stroke="#2B5341" strokeWidth="2" strokeDasharray="7 4" />
              {[[96,62],[268,44],[336,98],[288,174],[128,180],[66,124]].map(([x,y], i) => (
                <circle key={i} cx={x} cy={y} r="4.5" fill="#FFFFFF" stroke="#2B5341" strokeWidth="2" />
              ))}
            </>
          )}
          {hasMarked && drawMode === 'point' && (
            <>
              <circle cx="200" cy="110" r="26" fill="#2B5341" fillOpacity="0.12" stroke="#2B5341" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="200" cy="110" r="7" fill="#2B5341" stroke="#FFFFFF" strokeWidth="2.5" />
            </>
          )}
          {!hasMarked && (
            <>
              <text x="200" y="106" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="13" fontWeight="700" fill="#6B7B6E">Tap to drop a point, or draw an area</text>
              <text x="200" y="126" textAnchor="middle" fontFamily="Inter,sans-serif" fontSize="11" fill="#9AA69C">Search a place name or use your location</text>
            </>
          )}
        </svg>
      </div>

      {/* Map footer */}
      <div style={{ padding: '10px 15px', borderTop: '1px solid #EDE6DF', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <input
          type="text"
          value={location}
          onChange={e => onLocationChange(e.target.value)}
          placeholder="Type location or click map above"
          style={{ flex: 1, height: 32, border: '1px solid #D8CFC6', borderRadius: 8, padding: '0 10px', fontFamily: 'Inter,sans-serif', fontSize: 12.5, color: '#112121', background: '#FAFAF9' }}
        />
        {hasMarked && (
          <button type="button" onClick={() => { setHasMarked(false); onLocationChange('') }} style={{ height: 30, padding: '0 12px', borderRadius: 8, border: '1px solid #D8CFC6', background: '#FFFFFF', color: '#6B7B6E', fontFamily: 'Inter,sans-serif', fontSize: 11.5, cursor: 'pointer' }}>Clear</button>
        )}
      </div>
    </div>
  )
}

export default function SubmitProjectDetails() {
  const navigate = useNavigate()
  const { draft, updateDraft, saveDraftToAPI } = useSubmitProject()
  const { session } = useAuth()

  const [element,     setElement]     = useState(draft.element || 'earth')
  const [category,    setCategory]    = useState(draft.category || '')
  const [type,        setType]        = useState(draft.type || '')
  const [title,       setTitle]       = useState(draft.title || '')
  const [description, setDescription] = useState(draft.description || '')
  const [location,    setLocation]    = useState(draft.location || '')
  const [startDate,   setStartDate]   = useState(draft.startDate || '')
  const [endDate,     setEndDate]     = useState(draft.endDate || '')
  const [treeCount,   setTreeCount]   = useState(draft.treeCount || '')
  const [status,      setStatus]      = useState<'Completed' | 'Ongoing'>('Completed')
  const [selfFunded,  setSelfFunded]  = useState(true)
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  const [saving,      setSaving]      = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())    e.title    = 'Project title is required'
    if (!location.trim()) e.location = 'Location is required'
    if (!startDate)       e.startDate = 'Start date is required'
    return e
  }

  async function handleNext() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    const partial = { element, category, type, title, description, location, startDate, endDate, treeCount }
    setSaving(true)
    try {
      if (session?.access_token) {
        await saveDraftToAPI(partial, session.access_token)
      } else {
        updateDraft(partial)
      }
    } finally {
      setSaving(false)
    }
    navigate('/submit-project/partner')
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Tell us about the project</h1>
        <p>
          Work you've already done off-platform — completed or still going. It stays{' '}
          <strong>private to you</strong>: never in the public marketplace, never fundable by others.
        </p>
      </div>

      {hasErrors && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">
            <strong>{Object.keys(errors).length} thing{Object.keys(errors).length > 1 ? 's' : ''} need attention before you continue</strong>
            {' '}— a title, at least one date of work, and a location mark. Each is highlighted below.
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
                  aria-label={el.label + (el.live ? '' : ' — coming soon')}
                >
                  <PentaSVG fill={element === el.id ? el.fill : '#F5F0EC'} stroke={element === el.id ? el.stroke : '#D8CFC6'} />
                  <span className="sp-element-btn__label" style={{ color: element === el.id ? el.color : '#9AA79C' }}>
                    {el.label}
                  </span>
                  {!el.live && <span className="sp-element-btn__soon">Coming soon</span>}
                </button>
              ))}
            </div>
            <div className="sp-field-hint">Earth is live at beta. Four elements are coming soon — your past Earth work can start now.</div>
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
              placeholder="e.g. Lake-edge planting with our resident group"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            {errors.title && <div className="sp-field-error">{errors.title}</div>}
          </div>

          {/* Description */}
          <div className="sp-field">
            <label className="sp-label" htmlFor="c1-desc">What was done</label>
            <textarea
              id="c1-desc"
              className="sp-textarea"
              rows={4}
              placeholder="What was planted or restored, when, and why — in your own words."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* Completion status */}
          <div className="sp-field">
            <div className="sp-label">Completion status</div>
            <div style={{ display: 'inline-flex', background: '#F5F0EC', border: '1px solid #D8CFC6', borderRadius: 11, padding: 3, gap: 3 }}>
              {(['Completed', 'Ongoing'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{ height: 36, padding: '0 18px', borderRadius: 8, border: 'none', background: status === s ? '#112121' : 'transparent', color: status === s ? '#FFFFFF' : '#112121', fontFamily: 'Inter,sans-serif', fontSize: 13, fontWeight: status === s ? 700 : 400, cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="sp-field-hint" style={{ marginTop: 7 }}>
              {status === 'Completed'
                ? 'The work is finished — most past projects are. You can still add monitoring photos later.'
                : 'Still planting or maintaining — you can keep adding evidence as it continues.'}
            </div>
          </div>

          {/* Dates */}
          <div className="sp-field">
            <div className="sp-label sp-label--required">{status === 'Completed' ? 'Dates of work' : 'Work started'}</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                className={`sp-input ${errors.startDate ? 'sp-input--error' : ''}`}
                style={{ width: 190 }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                aria-label="Start date"
              />
              {status === 'Completed' && (
                <>
                  <span style={{ fontSize: 13, color: '#6B7B6E' }}>to</span>
                  <input
                    type="date"
                    className="sp-input"
                    style={{ width: 190 }}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    aria-label="End date"
                  />
                </>
              )}
            </div>
            {errors.startDate && <div className="sp-field-error">{errors.startDate}</div>}
            <div className="sp-field-hint">Dates are checked against your photos' capture dates — rough is fine, wrong is a flag.</div>
          </div>

          {/* Quantity + Self-funded */}
          <div className="sp-grid-2" style={{ alignItems: 'start' }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="c1-qty">Quantity</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="c1-qty"
                  type="number"
                  className="sp-input"
                  style={{ width: 110, textAlign: 'right' }}
                  placeholder="0"
                  min={0}
                  value={treeCount}
                  onChange={e => setTreeCount(e.target.value)}
                />
                <span style={{ fontSize: 13, color: '#6B7B6E' }}>trees planted</span>
              </div>
            </div>
            <div className="sp-field">
              <div className="sp-label">Self-funded</div>
              <button
                type="button"
                role="switch"
                aria-checked={selfFunded}
                onClick={() => setSelfFunded(f => !f)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: 'Inter,sans-serif' }}
              >
                <span style={{ width: 42, height: 24, borderRadius: 9999, background: selfFunded ? '#2B5341' : '#D8CFC6', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0, display: 'inline-block' }}>
                  <span style={{ position: 'absolute', top: 3, left: selfFunded ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(17,33,33,0.3)', transition: 'left 0.2s ease' }} />
                </span>
                <span style={{ fontSize: 13, color: '#112121', textAlign: 'left', lineHeight: 1.4 }}>
                  {selfFunded ? 'Yes — I paid for and commissioned this myself' : 'No — someone else funded it'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: map + info */}
        <div className="sp-col-side">
          <MapPlaceholder
            location={location}
            onLocationChange={setLocation}
            hasError={!!errors.location}
          />
          {errors.location && (
            <div style={{ background: '#FEF0E3', border: '1.5px solid #8B3A00', borderRadius: 12, padding: '11px 14px', fontSize: 12.5, color: '#8B3A00', lineHeight: 1.5, fontWeight: 700 }}>
              Mark where the work happened — your evidence photos' GPS will be checked against it.
            </div>
          )}
          <div style={{ background: '#FEF0E3', border: '1px solid #EF9F27', borderRadius: 12, padding: '12px 15px', fontSize: 12.5, color: '#8B3A00', lineHeight: 1.55 }}>
            <strong>Mark this honestly.</strong> Your photos' GPS is checked against this mark in the evidence step — the same check our field partners pass.
          </div>
          <div style={{ border: '1px solid #E2DAD1', borderRadius: 12, background: '#FBF8F5', padding: '12px 15px', fontSize: 12, color: '#6B7B6E', lineHeight: 1.65 }}>
            <strong style={{ color: '#112121' }}>What happens next</strong><br />
            Partner → evidence → review. A reviewer decides between two honest outcomes: <strong style={{ color: '#112121' }}>Verified</strong> (strong proof) or <strong style={{ color: '#27500A' }}>Self-reported</strong> (partial proof, upgradeable later). Either way it stays private to you.
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="sp-footer">
        <span style={{ fontSize: 12, color: '#6B7B6E' }}>Step 1 of 4 · saved as a draft automatically</span>
        <button type="button" className="sp-btn sp-btn--primary" onClick={handleNext} disabled={saving}>
          {saving ? 'Saving...' : 'Continue to partner →'}
        </button>
      </div>
    </SubmitProjectLayout>
  )
}
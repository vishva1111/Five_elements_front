import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

const ELEMENTS = ['Earth', 'Water', 'Fire', 'Air', 'Space']
const CATEGORIES = ['Afforestation & land', 'Soil restoration', 'Agroforestry', 'Mangrove planting', 'Urban greening']

export default function ProjectRegistration() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [element,     setElement]     = useState('Earth')
  const [category,    setCategory]    = useState('')
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [location,    setLocation]    = useState('')
  const [startDate,   setStartDate]   = useState('')
  const [endDate,     setEndDate]     = useState('')
  const [targetTrees, setTargetTrees] = useState('')
  const [targetArea,  setTargetArea]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim())    e.title    = 'Required'
    if (!location.trim()) e.location = 'Required'
    if (!startDate)       e.startDate = 'Required'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/projects`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ element, category, title, description, location, startDate, endDate, targetTrees, targetArea }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register project')
      navigate('/partner/submissions')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register project')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PartnerLayout title="Register a project">
      <div style={{ maxWidth: 720 }}>

        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Project details</div>

          {/* Element */}
          <div className="sp-field" style={{ marginBottom: 16 }}>
            <div className="sp-label">Element</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ELEMENTS.map(el => (
                <button
                  key={el}
                  type="button"
                  onClick={() => setElement(el)}
                  style={{
                    padding: '7px 16px', borderRadius: 9999,
                    border: `1.5px solid ${element === el ? '#2B5341' : '#D8CFC6'}`,
                    background: element === el ? '#EAF3DE' : '#fff',
                    color: element === el ? '#2B5341' : '#9AA79C',
                    fontWeight: element === el ? 700 : 500,
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {el}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 16 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="p3-cat">Category</label>
              <select id="p3-cat" className="sp-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="p3-title">Project title</label>
              <input id="p3-title" type="text" className={`sp-input ${errors.title ? 'sp-input--error' : ''}`} placeholder="e.g. Sahyadri Reforestation Phase 2" value={title} onChange={e => setTitle(e.target.value)} />
              {errors.title && <div className="sp-field-error">{errors.title}</div>}
            </div>
          </div>

          <div className="sp-field" style={{ marginBottom: 16 }}>
            <label className="sp-label" htmlFor="p3-desc">Description</label>
            <textarea id="p3-desc" className="sp-textarea" rows={3} placeholder="Describe the project goals, methodology, and expected outcomes…" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 16 }}>
            <label className="sp-label sp-label--required" htmlFor="p3-loc">Location</label>
            <input id="p3-loc" type="text" className={`sp-input ${errors.location ? 'sp-input--error' : ''}`} placeholder="Village, district, state, country" value={location} onChange={e => setLocation(e.target.value)} />
            {errors.location && <div className="sp-field-error">{errors.location}</div>}
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 16 }}>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="p3-start">Start date</label>
              <input id="p3-start" type="date" className={`sp-input ${errors.startDate ? 'sp-input--error' : ''}`} value={startDate} onChange={e => setStartDate(e.target.value)} />
              {errors.startDate && <div className="sp-field-error">{errors.startDate}</div>}
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="p3-end">End date</label>
              <input id="p3-end" type="date" className="sp-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="sp-grid-2">
            <div className="sp-field">
              <label className="sp-label" htmlFor="p3-trees">Target tree count</label>
              <input id="p3-trees" type="number" className="sp-input" placeholder="e.g. 10000" min={0} value={targetTrees} onChange={e => setTargetTrees(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="p3-area">Target area (hectares)</label>
              <input id="p3-area" type="number" className="sp-input" placeholder="e.g. 25" min={0} value={targetArea} onChange={e => setTargetArea(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button type="button" className="pl-btn pl-btn--ghost" onClick={() => navigate('/partner/dashboard')}>
            Cancel
          </button>
          <button type="button" className="pl-btn pl-btn--orange" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for admin review →'}
          </button>
        </div>
      </div>
    </PartnerLayout>
  )
}
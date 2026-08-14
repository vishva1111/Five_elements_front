import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

// ── Stepper steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Organisation',  sub: 'Who you are' },
  { label: 'Credentials',   sub: 'Proof of work' },
  { label: 'Review',        sub: 'Admin checks' },
]

type AppStatus = 'draft' | 'pending' | 'needs_info' | 'approved' | 'rejected'

export default function PartnerOnboarding() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [step,        setStep]        = useState(0)
  const [appStatus,   setAppStatus]   = useState<AppStatus>('draft')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // Form fields — step 0
  const [orgName,     setOrgName]     = useState('')
  const [orgType,     setOrgType]     = useState('')
  const [regNumber,   setRegNumber]   = useState('')
  const [website,     setWebsite]     = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail,setContactEmail]= useState('')
  const [contactPhone,setContactPhone]= useState('')
  const [address,     setAddress]     = useState('')

  // Form fields — step 1
  const [yearsActive, setYearsActive] = useState('')
  const [treeCount,   setTreeCount]   = useState('')
  const [references,  setReferences]  = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            orgName, orgType, regNumber, website,
            contactName, contactEmail, contactPhone, address,
            yearsActive, treeCount, references, description,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setAppStatus('pending')
      setStep(2)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p1-shell">
      <div className="p1-card">

        {/* Top band */}
        <div className="p1-topband">
          <svg width="34" height="34" viewBox="0 0 30 30" aria-hidden="true">
            <polygon points="15,2 27.5,10.5 22.9,24.5 7.1,24.5 2.5,10.5" fill="#AACBA7" />
            <polygon points="15,7 22.5,12.5 19.7,21 10.3,21 7.5,12.5" fill="#2B5341" />
          </svg>
          <div>
            <div className="p1-topband__title">Become an implementation partner</div>
            <div className="p1-topband__sub">
              Verified partners deliver the work funders pay for — every application is reviewed by a person.
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="p1-stepper">
          {STEPS.map((s, i) => {
            const done   = i < step
            const active = i === step
            return (
              <React.Fragment key={s.label}>
                <div className="p1-step">
                  <span className={`p1-step__dot p1-step__dot--${done ? 'done' : active ? 'active' : 'future'}`}>
                    {done ? '✓' : i + 1}
                  </span>
                  <div className="p1-step__info">
                    <div className="p1-step__label" style={{ color: active ? '#112121' : done ? '#2B5341' : '#9AA79C' }}>{s.label}</div>
                    <div className="p1-step__sub">{s.sub}</div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="p1-step__line" style={{ background: done ? '#2B5341' : '#D8CFC6' }} />
                  )}
                </div>
              </React.Fragment>
            )
          })}
          <div style={{ marginLeft: 'auto', fontSize: 11.5, color: '#6B7B6E', whiteSpace: 'nowrap', paddingLeft: 14 }}>
            Super Admin review — typically 3–5 days
          </div>
        </div>

        {/* Status banners */}
        {appStatus === 'pending' && (
          <div className="p1-banner p1-banner--pending">
            <strong>Application submitted.</strong> You can already explore your dashboard and invite your team — field capture unlocks when approved. We'll email you either way.
          </div>
        )}
        {appStatus === 'needs_info' && (
          <div className="p1-banner p1-banner--info">
            <strong>We need one more thing:</strong> your registration certificate was not legible. Re-upload a clear scan below — your application keeps its place in the queue.
          </div>
        )}
        {appStatus === 'rejected' && (
          <div className="p1-banner p1-banner--rejected">
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8B3A00', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Why it was declined</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4 }}>
              We could not verify the references provided. You can reapply after strengthening your delivery records.
            </div>
          </div>
        )}
        {appStatus === 'approved' && (
          <div className="p1-banner p1-banner--approved">
            <strong>Approved — welcome to Five Elements.</strong> Register your first Earth project to begin.{' '}
            <button type="button" onClick={() => navigate('/partner/dashboard')} style={{ background: 'none', border: 'none', color: '#AACBA7', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
              Go to dashboard →
            </button>
          </div>
        )}

        {error && (
          <div className="p1-banner p1-banner--info" style={{ margin: '14px 30px 0' }}>
            {error}
          </div>
        )}

        {/* Step 0: Organisation */}
        {step === 0 && (
          <div className="p1-form">
            {[
              { id: 'p1-org',   label: 'Organisation name *', val: orgName,      set: setOrgName,      ph: 'Terra Roots Foundation' },
              { id: 'p1-type',  label: 'Organisation type',   val: orgType,      set: setOrgType,      ph: 'NGO / Trust / Company / Cooperative' },
              { id: 'p1-reg',   label: 'Registration number', val: regNumber,    set: setRegNumber,    ph: 'FCRA / CIN / Trust deed no.' },
              { id: 'p1-web',   label: 'Website',             val: website,      set: setWebsite,      ph: 'https://terraroots.org' },
              { id: 'p1-cname', label: 'Contact name *',      val: contactName,  set: setContactName,  ph: 'Priya Nair' },
              { id: 'p1-email', label: 'Contact email *',     val: contactEmail, set: setContactEmail, ph: 'priya@terraroots.org' },
              { id: 'p1-phone', label: 'Contact phone',       val: contactPhone, set: setContactPhone, ph: '+91 98765 43210' },
              { id: 'p1-addr',  label: 'Registered address',  val: address,      set: setAddress,      ph: 'City, State, Country' },
            ].map(f => (
              <div key={f.id} className="sp-field">
                <label className="sp-label" htmlFor={f.id}>{f.label}</label>
                <input
                  id={f.id}
                  type="text"
                  className="sp-input"
                  placeholder={f.ph}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                />
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button
                type="button"
                className="pl-btn pl-btn--primary"
                onClick={() => setStep(1)}
                disabled={!orgName || !contactName || !contactEmail}
              >
                Next: Credentials →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Credentials */}
        {step === 1 && (
          <div className="p1-form">
            {[
              { id: 'p1-years', label: 'Years active in restoration', val: yearsActive, set: setYearsActive, ph: 'e.g. 7' },
              { id: 'p1-trees', label: 'Approx. trees planted to date', val: treeCount, set: setTreeCount, ph: 'e.g. 250,000' },
            ].map(f => (
              <div key={f.id} className="sp-field">
                <label className="sp-label" htmlFor={f.id}>{f.label}</label>
                <input id={f.id} type="text" className="sp-input" placeholder={f.ph} value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
            <div className="sp-field" style={{ gridColumn: '1 / -1' }}>
              <label className="sp-label" htmlFor="p1-refs">References (name + contact)</label>
              <textarea id="p1-refs" className="sp-textarea" rows={3} placeholder="Two references who can vouch for your delivery record…" value={references} onChange={e => setReferences(e.target.value)} />
            </div>
            <div className="sp-field" style={{ gridColumn: '1 / -1' }}>
              <label className="sp-label" htmlFor="p1-desc">Tell us about your work</label>
              <textarea id="p1-desc" className="sp-textarea" rows={4} placeholder="Describe your methodology, past projects, and why you want to join Five Elements…" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setStep(0)}>← Back</button>
              <button type="button" className="pl-btn pl-btn--orange" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit application →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: In review */}
        {step === 2 && appStatus === 'pending' && (
          <div style={{ padding: '32px 30px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#112121', marginBottom: 8 }}>Application under review</h2>
            <p style={{ fontSize: 14, color: '#6B7B6E', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
              Our team will review your application within 3–5 working days. You can explore your dashboard in the meantime.
            </p>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/dashboard')}>
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
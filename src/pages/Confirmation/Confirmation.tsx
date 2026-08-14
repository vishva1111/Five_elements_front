import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Confirmation.css'

// ── Pentagon checkmark ────────────────────────────────────────────────────────
function PentaCheck() {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    return `${(50 + 42 * Math.cos(a)).toFixed(1)},${(50 + 42 * Math.sin(a)).toFixed(1)}`
  }).join(' ')

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={pts} fill="#EAF3DE" stroke="#2B5341" strokeWidth="2" strokeLinejoin="round" />
      <text x="50" y="62" textAnchor="middle" fontSize="32">✓</text>
    </svg>
  )
}

export default function Confirmation() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // Optional query params passed from FundFlow on success
  const trees   = params.get('trees')   || '—'
  const tco2e   = params.get('tco2e')   || '—'
  const amount  = params.get('amount')  || '—'
  const project = params.get('project') || 'your project'

  return (
    <div className="conf-page">
      <div className="conf-card">
        {/* Icon */}
        <div className="conf-card__icon">
          <PentaCheck />
        </div>

        {/* Heading */}
        <div className="conf-badge">Payment confirmed</div>
        <h1 className="conf-h1">You're making an impact 🌍</h1>
        <p className="conf-sub">
          Your funding for <strong>{project}</strong> has been received.
          Verification and ledger entries follow delivery — we'll email you at each step.
        </p>

        {/* Stats strip */}
        <div className="conf-stats">
          <div className="conf-stat">
            <div className="conf-stat__num">{trees}</div>
            <div className="conf-stat__label">Trees funded</div>
          </div>
          <div className="conf-stat__divider" />
          <div className="conf-stat">
            <div className="conf-stat__num">{tco2e}</div>
            <div className="conf-stat__label">tCO₂e offset</div>
          </div>
          <div className="conf-stat__divider" />
          <div className="conf-stat">
            <div className="conf-stat__num">{amount}</div>
            <div className="conf-stat__label">Total paid</div>
          </div>
        </div>

        {/* What happens next */}
        <div className="conf-next">
          <div className="conf-next__title">What happens next</div>
          <div className="conf-next__steps">
            {[
              { icon: '📋', label: 'Partner receives funding and begins delivery' },
              { icon: '📸', label: 'Field evidence captured and uploaded to vault' },
              { icon: '✅', label: 'Admin verifies evidence and creates ledger entry' },
              { icon: '🔗', label: 'Your certificate is issued with a public ledger link' },
            ].map(s => (
              <div key={s.label} className="conf-next__step">
                <span className="conf-next__step-icon">{s.icon}</span>
                <span className="conf-next__step-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="conf-actions">
          <button
            type="button"
            className="conf-btn conf-btn--primary"
            onClick={() => navigate('/impact')}
          >
            See my impact →
          </button>
          <button
            type="button"
            className="conf-btn conf-btn--ghost"
            onClick={() => navigate('/projects')}
          >
            Fund another project
          </button>
        </div>
      </div>
    </div>
  )
}
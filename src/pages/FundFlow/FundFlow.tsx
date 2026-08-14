import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useProject } from '../../hooks/useProjects'
import { submitFunding } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import SignupModal from '../../components/auth/SignupModal'
import './FundFlow.css'

// ── Pentagon preset icon ──────────────────────────────────────────────────────
function PresetPenta({ selected }: { selected: boolean }) {
  const pts = (() => {
    const cx = 17, cy = 17.5, r = 15, rot = -Math.PI / 2
    return Array.from({ length: 5 }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / 5
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  })()
  const svg = `<svg width="100%" viewBox="0 0 34 34" aria-hidden="true">
    <polygon points="${pts}" fill="${selected ? '#FEF0E3' : 'none'}" stroke="${selected ? '#F09125' : '#AACBA7'}" stroke-width="${selected ? 2 : 1.5}" stroke-linejoin="round"/>
    <text x="17" y="22" text-anchor="middle" font-size="13">🌳</text>
  </svg>`
  return <div style={{ width: 34, height: 33 }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// ── Footprint pentagon icon ───────────────────────────────────────────────────
function FootPenta() {
  const pts = (() => {
    const cx = 26, cy = 26, r = 22, rot = -Math.PI / 2
    return Array.from({ length: 5 }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / 5
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
    }).join(' ')
  })()
  const svg = `<svg width="100%" viewBox="0 0 52 52" aria-hidden="true">
    <polygon points="${pts}" fill="#FFFFFF" stroke="#F09125" stroke-width="2" stroke-linejoin="round"/>
    <text x="26" y="33" text-anchor="middle" font-size="20">✈️</text>
  </svg>`
  return <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FundFlow() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const projectId = searchParams.get('project') || ''
  const { project, loading } = useProject(projectId)

  // State
  const [trees, setTrees] = useState(42)
  const [anon, setAnon] = useState(true)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeclined, setIsDeclined] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  // Footprint context — in production this would come from the estimator
  const hasFootprint = !!searchParams.get('tco2e')
  const footprintTco2e = searchParams.get('tco2e') || '1.6'

  // Presets
  const presetDefs = hasFootprint
    ? [{ count: 21, sub: 'Half' }, { count: 42, sub: 'Your flight' }, { count: 84, sub: 'Double' }, { count: 168, sub: 'A year' }]
    : [{ count: 10, sub: 'trees' }, { count: 25, sub: 'trees' }, { count: 50, sub: 'trees' }, { count: 100, sub: 'trees' }]

  const pricePerTree = project?.pricePerTree || 120
  const sub = trees * pricePerTree
  const fee = Math.round(sub * 0.1)
  const total = sub + fee

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  async function handleFund() {
    // S11: if not logged in, show inline signup modal first
    if (!user) {
      setShowSignup(true)
      return
    }
    setIsProcessing(true)
    setIsDeclined(false)
    try {
      await submitFunding({
        projectId: project?.id || projectId,
        trees,
        funderName: anon ? 'Anonymous' : (user.displayName || 'Funder'),
        paymentMethod: 'card',
        publicAttribution: !anon,
      })
      // S6: redirect to confirmation page with stats in query params
      const tco2e = (trees * 0.017).toFixed(2)
      const total = trees * (project?.pricePerTree || 120) * 1.1
      navigate(
        `/confirmation?trees=${trees}&tco2e=${tco2e}&amount=₹${Math.round(total).toLocaleString('en-IN')}&project=${encodeURIComponent(project?.name || 'your project')}`
      )
    } catch {
      setIsDeclined(true)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── S11: Inline signup modal ──────────────────────────────────────────────
  if (showSignup) {
    return (
      <div className="ff">
        <SignupModal
          onSuccess={() => {
            setShowSignup(false)
            // Re-trigger payment now that user is authenticated
            handleFund()
          }}
          onClose={() => setShowSignup(false)}
        />
      </div>
    )
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="ff">
        <div className="ff-success">
          <svg width="72" height="70" viewBox="0 0 60 58" aria-hidden="true">
            <polygon points="30,4 55.7,22.7 45.9,52.9 14.1,52.9 4.3,22.7" fill="#EAF3DE" stroke="#2B5341" strokeWidth="1.5" strokeLinejoin="round" />
            <text x="30" y="38" textAnchor="middle" fontSize="22">🌳</text>
          </svg>
          <h1 className="ff-success__title">Your trees are funded.</h1>
          <p className="ff-success__sub">
            <strong>{trees} trees</strong> in <strong>{project?.name || 'your project'}</strong> — funded in your name.
            Evidence will arrive as geo-tagged photos, and your entry will appear on the public ledger.
          </p>
          <div className="ff-success__stats">
            <div className="ff-success__stat">
              <span className="ff-success__stat-num">{trees}</span>
              <span className="ff-success__stat-label">trees funded</span>
            </div>
            <div className="ff-success__stat">
              <span className="ff-success__stat-num">{(trees * 0.017).toFixed(2)}</span>
              <span className="ff-success__stat-label">tCO₂e offset</span>
            </div>
            <div className="ff-success__stat">
              <span className="ff-success__stat-num">{fmt(total)}</span>
              <span className="ff-success__stat-label">total paid</span>
            </div>
          </div>
          <a href="/projects" className="ff-btn ff-btn--orange">Back to projects</a>
        </div>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ff">
        <div className="ff-fund">
          <div className="ff-skel" style={{ height: 200, borderRadius: 16 }} />
          <div className="ff-skel" style={{ height: 400, borderRadius: 16 }} />
        </div>
      </div>
    )
  }

  const summaryLine = `${trees} trees · ${fmt(total)}`

  return (
    <div className="ff">

      {/* Hidden SVG defs for pentagon clip-path */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <clipPath id="ffPentaThumb" clipPathUnits="objectBoundingBox">
            <polygon points="0.5,0 0.9755,0.3455 0.7939,0.9045 0.2061,0.9045 0.0245,0.3455" />
          </clipPath>
        </defs>
      </svg>

      <div className="ff-fund">

        {/* ── CONTEXT PANEL ── */}
        <aside className="ff-context">
          <div className="ff-ctx-card">

            {/* Mobile toggle header */}
            <button
              type="button"
              className="ff-ctx-toggle"
              onClick={() => setSummaryOpen(o => !o)}
            >
              <span className="ff-ctx-toggle__left">
                <span className="ff-ctx-toggle__label">You're offsetting</span>
                <span className="ff-ctx-toggle__value">{summaryLine}</span>
              </span>
              <span className="ff-ctx-toggle__caret" style={{ transform: summaryOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>

            {/* Details (always visible on desktop, toggled on mobile) */}
            <div className={`ff-ctx-details${summaryOpen ? ' ff-ctx-details--open' : ''}`}>
              <div className="ff-ctx-body">

                {/* Footprint block */}
                {hasFootprint ? (
                  <div className="ff-footprint">
                    <div className="ff-footprint__icon">
                      <FootPenta />
                    </div>
                    <div className="ff-footprint__info">
                      <span className="ff-footprint__num">{footprintTco2e} tCO₂e</span>
                      <span className="ff-footprint__note">from your flight · via the estimator</span>
                    </div>
                  </div>
                ) : (
                  <p className="ff-ctx-desc">
                    You're funding real trees in a verified Earth project. Every tree is geo-tagged and written to the public ledger.
                  </p>
                )}

                {/* Project summary */}
                <div className="ff-ctx-project">
                  <span className="ff-ctx-project__label">Your project</span>
                  <div className="ff-ctx-project__row">
                    <div className="ff-ctx-project__thumb">
                      <div className="ff-ctx-project__thumb-bg" />
                      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="ff-ctx-project__thumb-outline" aria-hidden="true">
                        <polygon points="0.5,0.02 0.965,0.35 0.788,0.9 0.212,0.9 0.035,0.35" fill="none" stroke="#2B5341" strokeWidth="0.016" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="ff-ctx-project__info">
                      <span className="ff-ctx-project__badge">🌍 Earth</span>
                      <span className="ff-ctx-project__name">{project?.name || 'Ahmedabad Urban Canopy — Phase 1'}</span>
                      <span className="ff-ctx-project__meta">{project?.partner || 'SEWA Green Collective'} · ✓ {project?.certification || 'Gold Standard'}</span>
                    </div>
                  </div>
                </div>

                {/* Certificate note */}
                <div className="ff-ctx-cert">
                  <span>📜</span>
                  <span>You'll receive a certificate and a public ledger entry.</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── PAYMENT PANEL ── */}
        <main className="ff-pay">
          <div className="ff-pay-card">

            {/* Tree presets */}
            <div className="ff-presets">
              <div className="ff-presets__header">
                <h2 className="ff-presets__title">How many trees?</h2>
                {hasFootprint && (
                  <span className="ff-presets__hint">Preset to fully offset your flight</span>
                )}
              </div>
              <div className="ff-presets__grid">
                {presetDefs.map(p => (
                  <button
                    key={p.count}
                    type="button"
                    className={`ff-preset-btn${trees === p.count ? ' ff-preset-btn--active' : ''}`}
                    onClick={() => setTrees(p.count)}
                  >
                    <PresetPenta selected={trees === p.count} />
                    <span className="ff-preset-btn__count">{p.count}</span>
                    <span className="ff-preset-btn__sub">{p.sub}</span>
                  </button>
                ))}
              </div>
              <div className="ff-custom-row">
                <label className="ff-custom-label">Custom amount</label>
                <div className="ff-custom-input-wrap">
                  <input
                    type="number"
                    min={1}
                    value={trees}
                    aria-label="Number of trees"
                    className="ff-custom-input"
                    onChange={e => setTrees(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="ff-custom-suffix">trees</span>
                </div>
              </div>
            </div>

            {/* Declined banner */}
            {isDeclined && (
              <div className="ff-declined">
                <span>⚠️</span>
                <p>Your bank declined this card. Try another card or method — your {trees} trees are still here.</p>
              </div>
            )}

            {/* Payment fields */}
            <div className="ff-payment">
              <div className="ff-payment__header">
                <h2 className="ff-payment__title">Payment</h2>
                <span className="ff-payment__secure">🔒 Secured · tokenised</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Card number"
                className="ff-input ff-input--mono"
              />
              <div className="ff-input-row">
                <input type="text" inputMode="numeric" placeholder="MM / YY" className="ff-input ff-input--mono" />
                <input type="text" inputMode="numeric" placeholder="CVV" className="ff-input ff-input--mono" />
              </div>
            </div>

            {/* Anonymity toggle */}
            <button
              type="button"
              className="ff-anon-toggle"
              onClick={() => setAnon(a => !a)}
            >
              <span className="ff-anon-toggle__text">
                <span className="ff-anon-toggle__title">Show my name on the public ledger</span>
                <span className="ff-anon-toggle__note">
                  {anon ? 'Your name will appear on the public ledger.' : "You\u2019ll appear as Anonymous."}
                </span>
              </span>
              <span className={`ff-switch${anon ? ' ff-switch--on' : ''}`}>
                <span className="ff-switch__thumb" />
              </span>
            </button>

            {/* Totals */}
            <div className="ff-totals">
              <div className="ff-totals__row">
                <span>{trees} trees × {fmt(pricePerTree)}</span>
                <span className="ff-totals__mono">{fmt(sub)}</span>
              </div>
              <div className="ff-totals__row">
                <span>Platform fee (10%)</span>
                <span className="ff-totals__mono">{fmt(fee)}</span>
              </div>
              <div className="ff-totals__total">
                <span className="ff-totals__total-label">Total</span>
                <span className="ff-totals__total-num">{fmt(total)}</span>
              </div>
            </div>

            {/* Fee disclosure */}
            <p className="ff-fee-note">
              Includes a 10% platform fee ({fmt(fee)}) that keeps the ledger running — the public record every tree is written to.
            </p>

            {/* CTA */}
            <button
              type="button"
              className={`ff-cta-btn${isProcessing ? ' ff-cta-btn--processing' : ''}`}
              disabled={isProcessing}
              onClick={handleFund}
            >
              {isProcessing && (
                <span className="ff-spinner" />
              )}
              {isProcessing ? 'Processing…' : `Fund ${trees} trees`}
            </button>

            <p className="ff-cta-note">You can review everything before it's final. No surprises.</p>
          </div>
        </main>
      </div>
    </div>
  )
}
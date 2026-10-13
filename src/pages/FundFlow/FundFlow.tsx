import React, { useState, useRef, useEffect } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useProject } from '../../hooks/useProjects'
import { submitFunding } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import './FundFlow.css'
import IndividualLayout from '../ImpactHome/IndividualLayout'

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
// Shared by both panels: /fund (the person's own funding) and /business/fund
// (their organisation's), each rendered inside its own panel shell.
export function FundFlowContent({ fundedAs = 'individual' }: { fundedAs?: 'individual' | 'business' }) {
  const isBusiness   = fundedAs === 'business'
  // Individuals browse inside their panel; Business users use the public marketplace.
  const projectsHref = isBusiness ? '/projects' : '/impact/projects'
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const projectId = searchParams.get('project') || ''
  const { project, loading } = useProject(projectId)

  // State
  const [trees, setTrees] = useState(42)
  const [showName, setShowName] = useState(true)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fundError, setFundError]   = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  // Trees still available in the project (null = the project has no target, so no limit).
  // Starts from the project's figures; the server's answer replaces it if it's fresher.
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!project) return
    const left = project.totalTrees > 0 ? Math.max(0, project.totalTrees - (project.fundedTrees || 0)) : null
    setRemaining(left)
  }, [project])

  // Never let the chosen amount exceed what's left.
  useEffect(() => {
    if (remaining !== null && remaining > 0 && trees > remaining) setTrees(remaining)
  }, [remaining, trees])

  const maxTrees    = remaining ?? Infinity
  const fullyFunded = remaining === 0

  // Demo card fields (pre-filled for testing)
  const [cardNumber, setCardNumber] = useState('1234 1234 1234 1234')
  const [cardExpiry, setCardExpiry] = useState('11/11')
  const [cardCvv, setCardCvv]       = useState('123')

  const location = useLocation()

  // Footprint context — passed via tco2e query param
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
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }
    setIsProcessing(true)
    setFundError(null)
    try {
      await submitFunding({
        projectId: project?.id || projectId,
        trees,
        // Always the real name — the partner and admin need to know who funded.
        // publicAttribution alone decides whether the public ledger shows it.
        funderName: user.displayName || user.email || 'Funder',
        paymentMethod: 'card',
        publicAttribution: showName,
        userId: user.id,
        fundedAs,
      })
      // The Confirmation page belongs to the Individual panel — a business
      // gets the success screen here instead.
      if (isBusiness) {
        setIsDone(true)
        return
      }
      // S6: redirect to confirmation page with stats in query params
      const tco2e = (trees * 0.017).toFixed(2)
      const total = trees * (project?.pricePerTree || 120) * 1.1
      navigate(
        `/confirmation?trees=${trees}&tco2e=${tco2e}&price=${pricePerTree}&amount=${encodeURIComponent(`₹${Math.round(total).toLocaleString('en-IN')}`)}&project=${encodeURIComponent(project?.name || 'your project')}`
      )
    } catch (err) {
      const e = err as Error & { remaining?: number }
      const msg = e.message || ''
      if (typeof e.remaining === 'number') setRemaining(e.remaining)
      setFundError(
        /trees? left|fully funded/i.test(msg) ? `${msg}. Please choose a smaller amount${e.remaining === 0 ? ' or another project' : ''}.`
        : /not accepting funding/i.test(msg) ? 'This project is not accepting funding right now. Please choose another project.'
        : /not found/i.test(msg)           ? 'This project could not be found. Please choose another project.'
        : /database update needed|business account/i.test(msg) ? msg
        : 'Something went wrong and your funding was not recorded. Please try again in a moment.'
      )
    } finally {
      setIsProcessing(false)
    }
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
            <strong>{trees} trees</strong> in <strong>{project?.name || 'your project'}</strong> — funded {isBusiness ? 'by your organisation' : 'in your name'}.
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
          {isBusiness ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/business/portfolio" className="ff-btn ff-btn--orange">View portfolio</Link>
              <Link to={projectsHref} className="ff-btn">Fund another project</Link>
            </div>
          ) : (
            <Link to={projectsHref} className="ff-btn ff-btn--orange">Back to projects</Link>
          )}
        </div>
      </div>
    )
  }

  // ── No project ID ─────────────────────────────────────────────────────────
  if (!projectId) {
    return (
      <div className="ff">
        <div className="ff-fund" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#6B7280', fontSize: 16, margin: 0 }}>No project selected. Please go back and choose a project to fund.</p>
          <Link to={projectsHref} className="ff-btn ff-btn--orange">Browse projects</Link>
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

  // ── Project not found ─────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="ff">
        <div className="ff-fund" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: '#6B7280', fontSize: 16, margin: 0 }}>We couldn't find this project. It may have been removed.</p>
          <Link to={projectsHref} className="ff-btn ff-btn--orange">Browse projects</Link>
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
                      <span className="ff-footprint__note">from your flight</span>
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
                      <span className="ff-ctx-project__name">{project.name}</span>
                      <span className="ff-ctx-project__meta">{project.partner || '—'}{project.certification ? ` · ✓ ${project.certification}` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Certificate note */}
                <div className="ff-ctx-cert">
                  <span>📜</span>
                  <span>{isBusiness
                    ? "It's added to your organisation's portfolio, ledger and reports, with a public ledger entry."
                    : "You'll receive a certificate and a public ledger entry."}</span>
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
                {remaining !== null ? (
                  <span className="ff-presets__hint">
                    {fullyFunded ? 'This project is fully funded' : `${remaining.toLocaleString('en-IN')} tree${remaining === 1 ? '' : 's'} left in this project`}
                  </span>
                ) : hasFootprint && (
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
                    disabled={p.count > maxTrees}
                    title={p.count > maxTrees ? `Only ${remaining} trees left in this project` : undefined}
                    style={p.count > maxTrees ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
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
                    max={remaining ?? undefined}
                    value={trees}
                    aria-label="Number of trees"
                    className="ff-custom-input"
                    disabled={fullyFunded}
                    onChange={e => setTrees(Math.min(maxTrees, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <span className="ff-custom-suffix">trees</span>
                </div>
              </div>
            </div>

            {/* Error banner */}
            {fundError && (
              <div className="ff-declined">
                <span>⚠️</span>
                <p>{fundError}</p>
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
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
              />
              <div className="ff-input-row">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM / YY"
                  className="ff-input ff-input--mono"
                  value={cardExpiry}
                  onChange={e => setCardExpiry(e.target.value)}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="CVV"
                  className="ff-input ff-input--mono"
                  value={cardCvv}
                  onChange={e => setCardCvv(e.target.value)}
                />
              </div>
            </div>

            {/* Anonymity toggle */}
            <button
              type="button"
              className="ff-anon-toggle"
              role="switch"
              aria-checked={showName}
              onClick={() => setShowName(s => !s)}
            >
              <span className="ff-anon-toggle__text">
                <span className="ff-anon-toggle__title">{isBusiness ? "Show our organisation's name on the public ledger" : 'Show my name on the public ledger'}</span>
                <span className="ff-anon-toggle__note">
                  {showName
                    ? (isBusiness ? "Your organisation\u2019s name will appear on the public ledger." : 'Your name will appear on the public ledger.')
                    : "You\u2019ll appear as Anonymous."}
                </span>
              </span>
              <span className={`ff-switch${showName ? ' ff-switch--on' : ''}`}>
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
              disabled={isProcessing || fullyFunded}
              onClick={handleFund}
            >
              {isProcessing && (
                <span className="ff-spinner" />
              )}
              {isProcessing ? 'Processing…' : fullyFunded ? 'Fully funded' : `Fund ${trees} trees`}
            </button>

            <p className="ff-cta-note">You can review everything before it's final. No surprises.</p>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── "Fund as" chooser — for people who hold both Individual and Business ─────
const FUND_AS = [
  { role: 'individual' as const, glyph: '🌍', title: 'As an individual', desc: 'Funded in your own name, shown in your impact home and certificate.', color: '#2B5341', tint: '#EAF3DE' },
  { role: 'business'   as const, glyph: '🏢', title: 'As your business',  desc: 'Funded by your organisation, counted in its portfolio and reports.', color: '#185FA5', tint: '#EAF2FA' },
]

function FundAsChooser({ onPick, onClose }: { onPick: (role: UserRole) => void; onClose: () => void }) {
  return (
    <Modal
      icon={<span style={{ fontSize: 18 }}>🌳</span>}
      title="Who is funding this project?"
      subtitle="Your account has both an Individual and a Business workspace."
      onClose={onClose}
      width={480}
      footer={
        <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #DDD5CB', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#3B4A40', cursor: 'pointer' }}>
          Cancel
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FUND_AS.map(o => (
          <button
            key={o.role}
            type="button"
            onClick={() => onPick(o.role)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%', background: '#fff', border: `1.5px solid ${o.color}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer' }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 12, background: o.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{o.glyph}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: o.color }}>{o.title}</span>
              <span style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.4 }}>{o.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

// Signed-in only — always shown inside the Individual panel shell.
export default function FundFlow() {
  const { user, setActiveRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Holding both roles while working as something other than Individual (e.g.
  // browsing the website as the Business) — ask whose funding this is instead
  // of silently funding in the personal name.
  const mustChoose = !!user
    && user.role !== 'individual'
    && user.roles.includes('individual')
    && user.roles.includes('business')

  function pick(role: UserRole) {
    if (role === 'individual') {
      setActiveRole('individual').catch(() => {})
      return
    }
    if (user?.role !== 'business') setActiveRole('business').catch(() => {})
    navigate(`/business/fund${location.search}`, { replace: true })
  }

  function cancel() {
    // React Router keeps the history index in history.state — go back when
    // there's somewhere to go back to, otherwise to the projects list.
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
    else navigate('/projects', { replace: true })
  }

  return (
    <IndividualLayout title="Fund trees" subtitle="Choose how many trees · pay securely">
      <FundFlowContent />
      {mustChoose && <FundAsChooser onPick={pick} onClose={cancel} />}
    </IndividualLayout>
  )
}

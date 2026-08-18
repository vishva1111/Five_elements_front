import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProject } from '../../hooks/useProjects'
import Navbar from '../../components/layout/Navbar'
import './ProjectDetail.css'

// ── Pentagon geometry helper ──────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

// ── Hero SVG (pentagon with gradient stroke + striped fill) ───────────────────
function HeroSVG() {
  const cx = 170, cy = 158, R = 150
  const outer = penta(cx, cy, R)
  const inner = penta(cx, cy, R - 10)
  const svg = `<svg width="100%" viewBox="0 0 340 320" role="img" aria-label="Project photo">
    <defs>
      <linearGradient id="pdHeroGrad" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#EF9F27"/>
        <stop offset="50%" stop-color="#AACBA7"/>
        <stop offset="100%" stop-color="#378ADD"/>
      </linearGradient>
      <pattern id="pdStripe" width="18" height="18" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="18" height="18" fill="#EAF3DE"/>
        <rect width="9" height="18" fill="#DCEBD0"/>
      </pattern>
      <clipPath id="pdHeroClip"><polygon points="${inner}"/></clipPath>
    </defs>
    <g clip-path="url(#pdHeroClip)">
      <rect x="0" y="0" width="340" height="320" fill="url(#pdStripe)"/>
      <text x="170" y="175" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11" fill="#27500A">project photo</text>
    </g>
    <polygon points="${outer}" fill="none" stroke="url(#pdHeroGrad)" stroke-width="3" stroke-linejoin="round"/>
  </svg>`
  return (
    <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
  )
}

// ── Map placeholder ───────────────────────────────────────────────────────────
function MapPlaceholder({ pinCount }: { pinCount: number }) {
  return (
    <div className="pd-map">
      <svg viewBox="0 0 600 220" preserveAspectRatio="none" className="pd-map__svg" aria-hidden="true">
        <path d="M60 40 H540 M60 90 H540 M60 140 H540 M60 190 H540" stroke="#CBD9BC" strokeWidth="1" />
        <path d="M120 30 V210 M240 30 V210 M360 30 V210 M480 30 V210" stroke="#CBD9BC" strokeWidth="1" />
        <polygon
          points="150,60 430,45 480,150 300,190 130,150"
          fill="rgba(43,83,65,0.10)"
          stroke="#2B5341"
          strokeWidth="2"
          strokeDasharray="7 5"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pd-map__label">project boundary · GPS evidence pins</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { project, loading, error } = useProject(id ?? '')
  const [tab, setTab] = useState<'overview' | 'evidence' | 'ledger'>('overview')
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // Loading
  if (loading) {
    return (
      <div className="pd">
        <Navbar />
        <div className="pd-breadcrumb">
          <div className="pd-skel" style={{ height: 14, width: 260 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 24px 4px' }}>
          <div className="pd-skel" style={{ width: 340, height: 320, borderRadius: 16 }} />
        </div>
        <div className="pd-cols" style={{ marginTop: 8 }}>
          <div className="pd-body">
            <div className="pd-skel" style={{ height: 32, width: '70%', marginBottom: 12 }} />
            <div className="pd-skel" style={{ height: 16, width: '50%', marginBottom: 8 }} />
            <div className="pd-skel" style={{ height: 80, width: '100%' }} />
          </div>
        </div>
      </div>
    )
  }

  // Error / not found
  if (error || !project) {
    return (
      <div className="pd">
        <Navbar />
        <div className="pd-cols" style={{ marginTop: 48 }}>
          <div className="pd-body" style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 18, color: '#112121', marginBottom: 16 }}>
              Project not found
            </p>
            <Link to="/projects" className="pd-btn pd-btn--orange">← Back to projects</Link>
          </div>
        </div>
      </div>
    )
  }

  const pct = project.totalTrees > 0
    ? Math.round((project.fundedTrees / project.totalTrees) * 100)
    : 0

  const isPaused = project.status === 'paused'
  const isCompleted = pct >= 100

  // Mock data for tabs (would come from API in production)
  const species = ['Neem', 'Peepal', 'Banyan', 'Gulmohar']
  const cobenefits = [
    { icon: '🌡️', title: 'Urban cooling', note: 'Reduces street temp by ~3°C' },
    { icon: '💧', title: 'Water retention', note: 'Improves groundwater recharge' },
    { icon: '🐦', title: 'Biodiversity', note: 'Habitat for 40+ bird species' },
  ]
  // Build evidence from evidenceEntries if available, else use mock
  const evidence = (project.evidenceEntries && project.evidenceEntries.length > 0)
    ? project.evidenceEntries.map((e, i) => ({
        id: e.id,
        qty: `${e.treeCount} trees`,
        species: e.species || 'Mixed',
        gps: e.lat && e.lng ? `${e.lat.toFixed(4)}° N, ${e.lng.toFixed(4)}° E` : 'GPS logged',
        date: new Date(e.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        bg: ['repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#DCEBD0 8px,#DCEBD0 16px)',
             'repeating-linear-gradient(135deg,#E4EFD6,#E4EFD6 8px,#D3E6C4 8px,#D3E6C4 16px)',
             'repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#D8E9CC 8px,#D8E9CC 16px)',
             'repeating-linear-gradient(135deg,#E1EEDA,#E1EEDA 8px,#CFE3C2 8px,#CFE3C2 16px)'][i % 4],
      }))
    : [
        { id: '1', qty: '200 trees', species: 'Neem', gps: '23.0225° N, 72.5714° E', date: 'Mar 2025', bg: 'repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#DCEBD0 8px,#DCEBD0 16px)' },
        { id: '2', qty: '150 trees', species: 'Peepal', gps: '23.0301° N, 72.5801° E', date: 'Apr 2025', bg: 'repeating-linear-gradient(135deg,#E4EFD6,#E4EFD6 8px,#D3E6C4 8px,#D3E6C4 16px)' },
        { id: '3', qty: '180 trees', species: 'Banyan', gps: '23.0189° N, 72.5698° E', date: 'May 2025', bg: 'repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#D8E9CC 8px,#D8E9CC 16px)' },
        { id: '4', qty: '120 trees', species: 'Gulmohar', gps: '23.0244° N, 72.5755° E', date: 'Jun 2025', bg: 'repeating-linear-gradient(135deg,#E1EEDA,#E1EEDA 8px,#CFE3C2 8px,#CFE3C2 16px)' },
      ]
  const ledger = (project.evidenceEntries && project.evidenceEntries.length > 0)
    ? project.evidenceEntries.map(e => ({
        id: e.id,
        qty: `${e.treeCount} trees planted`,
        date: new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        hash: e.txHash || '0x…',
      }))
    : [
        { id: '1', qty: '200 trees planted', date: 'Mar 15, 2025', hash: '0x4a7f…c3e1' },
        { id: '2', qty: '150 trees planted', date: 'Apr 22, 2025', hash: '0x9b2d…f7a4' },
        { id: '3', qty: '180 trees planted', date: 'May 30, 2025', hash: '0x1e8c…b2d9' },
        { id: '4', qty: '120 trees planted', date: 'Jun 18, 2025', hash: '0x7f3a…e5c2' },
      ]

  const hasEvidence = evidence.length > 0
  const lbItem = lightboxIdx !== null ? evidence[lightboxIdx] : null

  const ctaDisabled = isCompleted || isPaused
  const ctaLabel = isCompleted ? 'Fully funded' : isPaused ? 'Funding paused' : 'Fund this project'

  return (
    <div className="pd">
      <Navbar />

      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <Link to="/" className="pd-crumb-link">Five Elements</Link>
        <span className="pd-crumb-sep">›</span>
        <Link to="/projects" className="pd-crumb-link">Earth</Link>
        <span className="pd-crumb-sep">›</span>
        <span className="pd-crumb-link" style={{ cursor: 'pointer' }} onClick={() => navigate(-1)}>
          {project.category}
        </span>
        <span className="pd-crumb-sep">›</span>
        <span className="pd-crumb-current">{project.name}</span>
      </div>

      {/* Paused banner */}
      {isPaused && (
        <div className="pd-paused-wrap">
          <div className="pd-paused">
            <span className="pd-paused__icon">⏸</span>
            <p className="pd-paused__text">
              <strong>Funding paused.</strong> The executing partner is revising the planting schedule after an early monsoon. The page stays public and every logged entry remains verifiable.
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="pd-hero">
        <div className="pd-hero__inner">
          <HeroSVG />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="pd-cols">

        {/* Body */}
        <div className="pd-body">

          {/* Title block */}
          <div className="pd-title-block">
            <div className="pd-title-block__badges">
              <span className="pd-badge pd-badge--element">🌍 Earth · Prithvi</span>
              {project.verified && (
                <span className="pd-badge pd-badge--verified">✓ Verified</span>
              )}
              {isCompleted && (
                <span className="pd-badge pd-badge--funded">Fully funded</span>
              )}
            </div>
            <h1 className="pd-title">{project.name}</h1>
            <div className="pd-meta-row">
              <span>📍 {project.location}</span>
              <span>Executed by <strong className="pd-meta-executor">{project.partner}</strong></span>
            </div>
            <div className="pd-cert-row">
              <a href="#" className="pd-cert-link">
                ✓ {project.certification} · <span className="pd-cert-id">{project.certificationId}</span> ↗
              </a>
              <button className="pd-share-btn">Share</button>
            </div>
          </div>

          {/* Map */}
          <div className="pd-map-section">
            <div className="pd-map-section__header">
              <h2 className="pd-map-section__title">Where it's happening</h2>
              <span className="pd-map-section__note">{evidence.length} evidence locations</span>
            </div>
            <MapPlaceholder pinCount={evidence.length} />
          </div>

          {/* Tabs */}
          <div className="pd-tabs">
            {(['overview', 'evidence', 'ledger'] as const).map(t => (
              <button
                key={t}
                className={`pd-tab${tab === t ? ' pd-tab--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="pd-tab-content">
              <p className="pd-desc">{project.description || 'A native-species urban canopy across Ahmedabad\'s eastern wards, planted and tended by local women\'s cooperatives. Phase 1 restores shade, cools street temperatures, and rebuilds habitat on land that was bare for a decade.'}</p>
              <p className="pd-desc">Every tree is geo-tagged at planting and re-photographed on a fixed schedule. Nothing is counted until it is logged, verified, and written to the public ledger.</p>

              <div className="pd-species-section">
                <span className="pd-species-section__label">Species planted</span>
                <div className="pd-species-chips">
                  {species.map((s: string) => (
                    <span key={s} className="pd-species-chip">{s}</span>
                  ))}
                </div>
              </div>

              <div className="pd-cobenefits">
                {cobenefits.map((b: any) => (
                  <div key={b.title} className="pd-cobenefit-card">
                    <div className="pd-cobenefit-card__icon">{b.icon}</div>
                    <div className="pd-cobenefit-card__title">{b.title}</div>
                    <div className="pd-cobenefit-card__note">{b.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence tab */}
          {tab === 'evidence' && (
            <div className="pd-tab-content">
              {hasEvidence ? (
                <div className="pd-evidence-grid">
                  {evidence.map((e: any, idx: number) => (
                    <button
                      key={e.id}
                      className="pd-evidence-card"
                      onClick={() => setLightboxIdx(idx)}
                    >
                      <div className="pd-evidence-card__img" style={{ background: e.bg }}>
                        <span className="pd-evidence-card__date">{e.date}</span>
                      </div>
                      <div className="pd-evidence-card__body">
                        <span className="pd-evidence-card__qty">{e.qty} · {e.species}</span>
                        <span className="pd-evidence-card__gps">{e.gps}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="pd-empty">
                  <svg width="60" height="58" viewBox="0 0 60 58" aria-hidden="true">
                    <polygon points="30,4 55.7,22.7 45.9,52.9 14.1,52.9 4.3,22.7" fill="#EAF3DE" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
                    <text x="30" y="38" textAnchor="middle" fontSize="20">🌱</text>
                  </svg>
                  <p className="pd-empty__title">Planting begins March 2025.</p>
                  <p className="pd-empty__sub">Evidence appears here as it is logged — each entry geo-tagged, timestamped, and written to the public ledger.</p>
                </div>
              )}
            </div>
          )}

          {/* Ledger tab */}
          {tab === 'ledger' && (
            <div className="pd-tab-content">
              {hasEvidence ? (
                <div className="pd-ledger">
                  <div className="pd-ledger__note">
                    <span className="pd-ledger__dot" />
                    Approved entries only · anyone can verify these on the public ledger
                  </div>
                  {ledger.map((l: any) => (
                    <div key={l.id} className="pd-ledger-row">
                      <div className="pd-ledger-row__left">
                        <div className="pd-ledger-row__top">
                          <span className="pd-ledger-row__qty">{l.qty}</span>
                          <span className="pd-ledger-row__date">{l.date}</span>
                        </div>
                        <span className="pd-ledger-row__hash">{l.hash}</span>
                      </div>
                      <a href="#" className="pd-ledger-row__link">View on ledger ↗</a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pd-empty">
                  <span className="pd-empty__mono">▦</span>
                  <p className="pd-empty__title">No ledger entries yet.</p>
                  <p className="pd-empty__sub">The first entry is written the moment planting is verified. Until then, there is nothing to show — and we won't pretend otherwise.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="pd-side">
          <div className="pd-side-card">
            {/* Progress */}
            <div className="pd-side-progress">
              <div className="pd-side-progress__top">
                <span className="pd-side-progress__pct">{pct}%</span>
                <span className="pd-side-progress__count">
                  {project.fundedTrees.toLocaleString('en-IN')} / {project.totalTrees.toLocaleString('en-IN')} trees
                </span>
              </div>
              <div className="pd-side-progress__bar">
                <div className="pd-side-progress__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className="pd-side-progress__note">From approved ledger entries only</span>
            </div>

            {/* Stats */}
            <div className="pd-side-stats">
              <div className="pd-side-stat">
                <span className="pd-side-stat__num">{project.fundersCount ?? 47}</span>
                <span className="pd-side-stat__label">funders</span>
              </div>
              <div className="pd-side-stat">
                <span className="pd-side-stat__num pd-side-stat__num--mono">{project.lastEvidenceDate ?? 'Jun 2025'}</span>
                <span className="pd-side-stat__label">last evidence</span>
              </div>
            </div>

            {/* Price */}
            <div className="pd-side-price">
              <span className="pd-side-price__num">₹{project.pricePerTree}</span>
              <span className="pd-side-price__unit">per tree</span>
            </div>

            {/* CTA */}
            <button
              className={`pd-cta-btn${ctaDisabled ? ' pd-cta-btn--disabled' : ''}`}
              disabled={ctaDisabled}
              onClick={() => !ctaDisabled && navigate(`/fund?project=${project.slug || project.id}`)}
            >
              {ctaLabel}
            </button>

            {isPaused && (
              <span className="pd-side-reason">Funding is temporarily paused for this project.</span>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky bottom bar */}
      <div className="pd-sticky-bar">
        <div className="pd-sticky-bar__left">
          <span className="pd-sticky-bar__title">{project.name}</span>
          <span className="pd-sticky-bar__price">₹{project.pricePerTree} / tree</span>
        </div>
        <button
          className={`pd-cta-btn pd-cta-btn--sm${ctaDisabled ? ' pd-cta-btn--disabled' : ''}`}
          disabled={ctaDisabled}
          onClick={() => !ctaDisabled && navigate(`/fund?project=${project.slug || project.id}`)}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Evidence lightbox */}
      {lbItem && (
        <div className="pd-lightbox" onClick={() => setLightboxIdx(null)}>
          <div className="pd-lightbox__card" onClick={e => e.stopPropagation()}>
            <button className="pd-lightbox__close" onClick={() => setLightboxIdx(null)} aria-label="Close">×</button>
            <div className="pd-lightbox__img" style={{ background: lbItem.bg }}>
              <span className="pd-lightbox__img-date">📷 {lbItem.date}</span>
            </div>
            <div className="pd-lightbox__body">
              <span className="pd-lightbox__qty">{lbItem.qty} · {lbItem.species}</span>
              <div className="pd-lightbox__meta">
                <div className="pd-lightbox__meta-row">
                  <span className="pd-lightbox__meta-key">Captured</span>
                  <span className="pd-lightbox__meta-val">{lbItem.date}</span>
                </div>
                <div className="pd-lightbox__meta-row">
                  <span className="pd-lightbox__meta-key">GPS</span>
                  <span className="pd-lightbox__meta-val">{lbItem.gps}</span>
                </div>
                <div className="pd-lightbox__meta-row">
                  <span className="pd-lightbox__meta-key">Verified ID</span>
                  <span className="pd-lightbox__meta-val">EV-{String(lbItem.id).padStart(4, '0')}</span>
                </div>
              </div>
              <a href="#" className="pd-lightbox__ledger-link">View this entry on the ledger ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
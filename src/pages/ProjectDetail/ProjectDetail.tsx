import React, { useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useProject } from '../../hooks/useProjects'
import Navbar from '../../components/layout/Navbar'
import IndividualLayout from '../ImpactHome/IndividualLayout'
import './ProjectDetail.css'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import { useAuth, fundPath } from '../../contexts/AuthContext'

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

// ── Real Leaflet map with GPS pins + fencing polygon ─────────────────────────
interface GpsPin { lat: number; lng: number; label: string }
interface FencingPolygon { points: [number, number][]; areaSqM?: number; status?: string }

function ProjectMap({
  pinCount,
  locations,
  fencingPolygon,
}: {
  pinCount: number
  locations?: GpsPin[]
  fencingPolygon?: FencingPolygon | null
}) {
  const hasLocations = locations && locations.length > 0
  const hasFence = fencingPolygon && fencingPolygon.points && fencingPolygon.points.length >= 3

  // Compute map center: GPS pins → fence centroid → India default
  let center: [number, number] = [20.5937, 78.9629]
  let zoom = 5
  if (hasLocations) {
    const avgLat = locations!.reduce((s, l) => s + l.lat, 0) / locations!.length
    const avgLng = locations!.reduce((s, l) => s + l.lng, 0) / locations!.length
    center = [avgLat, avgLng]
    zoom = locations!.length === 1 ? 14 : 13
  } else if (hasFence) {
    const pts = fencingPolygon!.points
    const avgLat = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const avgLng = pts.reduce((s, p) => s + p[1], 0) / pts.length
    center = [avgLat, avgLng]
    zoom = 17
  }

  return (
    <div className="pd-map" style={{ position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '220px', width: '100%', borderRadius: '12px' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {/* Fencing boundary polygon */}
        {hasFence && (
          <Polygon
            positions={fencingPolygon!.points}
            pathOptions={{
              color: '#EF9F27',
              weight: 2.5,
              fillColor: '#EF9F27',
              fillOpacity: 0.12,
              dashArray: '6 4',
            }}
          >
            <Tooltip sticky>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 12 }}>
                🔒 Fenced boundary
                {fencingPolygon!.areaSqM
                  ? ` · ${Number(fencingPolygon!.areaSqM).toLocaleString('en-IN')} m²`
                  : ''}
              </span>
            </Tooltip>
          </Polygon>
        )}
        {/* GPS tree pins */}
        {hasLocations && locations!.map((loc, i) => (
          <CircleMarker
            key={i}
            center={[loc.lat, loc.lng]}
            radius={8}
            pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: '#2B5341', fillOpacity: 0.9 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 12 }}>
                🌳 {loc.label}<br />
                <span style={{ color: '#6B7B6E', fontSize: 11 }}>{loc.lat.toFixed(5)}° N, {loc.lng.toFixed(5)}° E</span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
      <span className="pd-map__label" style={{ position: 'absolute', bottom: 6, left: 10, zIndex: 1000, background: 'rgba(255,255,255,0.85)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#2B5341', fontWeight: 600 }}>
        {hasLocations
          ? `${locations!.length} GPS location${locations!.length !== 1 ? 's' : ''}${hasFence ? ' · fenced' : ''} · OpenStreetMap`
          : hasFence ? 'Fenced boundary · OpenStreetMap'
          : pinCount > 0 ? `${pinCount} evidence location${pinCount !== 1 ? 's' : ''}` : 'project location'}
      </span>
    </div>
  )
}

// ── Local data types ──────────────────────────────────────────────────────────
interface CoBenefit { icon: string; title: string; note: string }
interface EvidenceItem { id: string; qty: string; species: string; gps: string; date: string; bg: string; photoUrl: string | null }
interface LedgerRow { id: string; qty: string; date: string; hash: string }

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { project, loading, error } = useProject(id ?? '')
  // Reached from inside the Individual panel (/impact/projects/:id) — render in
  // the panel shell instead of the public website chrome.
  const inPanel = useLocation().pathname.startsWith('/impact/')
  const base    = inPanel ? '/impact/projects' : '/projects'
  const pdClass = `pd${inPanel ? ' pd--in-panel' : ''}`
  const shell   = (node: React.ReactNode, title = 'Project') => inPanel
    ? <IndividualLayout title={title} subtitle="Browse projects">{node}</IndividualLayout>
    : <>{node}</>
  const [tab, setTab] = useState<'overview' | 'evidence' | 'ledger'>('overview')
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  useModalBehavior(() => setLightboxIdx(null), lightboxIdx !== null)

  // Loading
  if (loading) {
    return shell(
      <div className={pdClass}>
        {!inPanel && <Navbar />}
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
    return shell(
      <div className={pdClass}>
        {!inPanel && <Navbar />}
        <div className="pd-cols" style={{ marginTop: 48 }}>
          <div className="pd-body" style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 18, color: '#112121', marginBottom: 16 }}>
              Project not found
            </p>
            <Link to={base} className="pd-btn pd-btn--orange">← Back to projects</Link>
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
  // Build evidence cards: prefer monitoring photos (real photo + GPS) matched by index,
  // falling back to ledger entry data when no monitoring record is available.
  const monPhotos = project.monitoringPhotos || []
  const bgPatterns = [
    'repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#DCEBD0 8px,#DCEBD0 16px)',
    'repeating-linear-gradient(135deg,#E4EFD6,#E4EFD6 8px,#D3E6C4 8px,#D3E6C4 16px)',
    'repeating-linear-gradient(135deg,#EAF3DE,#EAF3DE 8px,#D8E9CC 8px,#D8E9CC 16px)',
    'repeating-linear-gradient(135deg,#E1EEDA,#E1EEDA 8px,#CFE3C2 8px,#CFE3C2 16px)',
  ]
  const evidence = (project.evidenceEntries || []).map((e, i) => {
    const mon = monPhotos[i] ?? null
    const lat = mon?.lat ?? e.lat
    const lng = mon?.lng ?? e.lng
    return {
      id: e.id,
      qty: `${e.treeCount} trees`,
      species: e.species || 'Mixed',
      gps: lat != null && lng != null
        ? `${Number(lat).toFixed(4)}° N, ${Number(lng).toFixed(4)}° E`
        : 'GPS not recorded',
      date: new Date(mon?.surveyDate ?? e.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      bg: bgPatterns[i % 4],
      photoUrl: mon?.photoUrl ?? null,
    }
  })
  const ledger = (project.evidenceEntries || []).map(e => ({
    id: e.id,
    qty: `${e.treeCount} trees planted`,
    date: new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    hash: e.txHash || '—',
  }))

  const hasEvidence = evidence.length > 0
  const lbItem = lightboxIdx !== null ? evidence[lightboxIdx] : null

  const ctaDisabled = isCompleted || isPaused
  const ctaLabel = isCompleted ? 'Fully funded' : isPaused ? 'Funding paused' : 'Fund this project'

  return shell(
    <div className={pdClass}>
      {!inPanel && <Navbar />}

      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <Link to={inPanel ? '/impact' : '/'} className="pd-crumb-link">{inPanel ? 'Dashboard' : 'Five Elements'}</Link>
        <span className="pd-crumb-sep">›</span>
        <Link to={base} className="pd-crumb-link">Earth</Link>
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
              <a href={`https://registry.example.com/${project.certificationId}`} target="_blank" rel="noopener noreferrer" className="pd-cert-link">
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
            <ProjectMap
              pinCount={evidence.length}
              locations={project.evidenceLocations}
              fencingPolygon={project.fencingPolygon ?? null}
            />
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
                {cobenefits.map((b: CoBenefit) => (
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
                  {evidence.map((e: EvidenceItem, idx: number) => (
                    <button
                      key={e.id}
                      className="pd-evidence-card"
                      onClick={() => setLightboxIdx(idx)}
                    >
                      <div className="pd-evidence-card__img" style={{ background: e.photoUrl ? 'transparent' : e.bg }}>
                        {e.photoUrl
                          ? <img src={e.photoUrl} alt="Tree monitoring photo" className="pd-evidence-card__photo" />
                          : null}
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
                  {ledger.map((l: LedgerRow) => (
                    <div key={l.id} className="pd-ledger-row">
                      <div className="pd-ledger-row__left">
                        <div className="pd-ledger-row__top">
                          <span className="pd-ledger-row__qty">{l.qty}</span>
                          <span className="pd-ledger-row__date">{l.date}</span>
                        </div>
                        <span className="pd-ledger-row__hash">{l.hash}</span>
                      </div>
                      <Link to={`/ledger?q=${encodeURIComponent(l.id)}`} className="pd-ledger-row__link">View on ledger ↗</Link>
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
              onClick={() => !ctaDisabled && navigate(fundPath(user, `?project=${project.slug || project.id}`))}
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
          onClick={() => !ctaDisabled && navigate(fundPath(user, `?project=${project.slug || project.id}`))}
        >
          {ctaLabel}
        </button>
      </div>

      {/* Evidence lightbox */}
      {lbItem && (
        <div className="pd-lightbox" onClick={() => setLightboxIdx(null)}>
          <div className="pd-lightbox__card" onClick={e => e.stopPropagation()}>
            <button className="pd-lightbox__close" onClick={() => setLightboxIdx(null)} aria-label="Close">×</button>
            <div className="pd-lightbox__img" style={{ background: lbItem.photoUrl ? 'transparent' : lbItem.bg }}>
              {lbItem.photoUrl
                ? <img src={lbItem.photoUrl} alt="Tree monitoring photo" className="pd-lightbox__photo" />
                : null}
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
                  <span className="pd-lightbox__meta-val">EV-{String(lbItem.id).replace(/-/g, '').slice(-8).toUpperCase()}</span>
                </div>
              </div>
              <Link to={lbItem ? `/ledger?q=${encodeURIComponent(lbItem.id)}` : '/ledger'} className="pd-lightbox__ledger-link">View this entry on the ledger ↗</Link>
            </div>
          </div>
        </div>
      )}
    </div>,
    project.name
  )
}

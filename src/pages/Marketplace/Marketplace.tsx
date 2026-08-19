import React, { useState, useMemo, useCallback } from 'react'
import type { ProjectFilters } from '../../types'
import { Link, useNavigate } from 'react-router-dom'
import { useProjects, useProjectCategories } from '../../hooks/useProjects'
import './Marketplace.css'

// ── Pentagon geometry helper ──────────────────────────────────────────────────
function pentaPoints(cx: number, cy: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

// ── Element definitions ───────────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'earth', glyph: '🌍', name: 'Earth',  sanskrit: 'Prithvi', color: '#2B5341', bg: '#EAF3DE', active: true,
    phase: 'Active now', desc: 'Afforestation, reforestation, soil and land restoration across India.' },
  { key: 'water', glyph: '💧', name: 'Water',  sanskrit: 'Apah',    color: '#185FA5', bg: '#E6F1FB', active: false,
    phase: 'Arrives Phase 2', desc: 'Rivers, wetlands, oceans and clean-water access — restoring the flow that sustains all life.' },
  { key: 'fire',  glyph: '🔥', name: 'Fire',   sanskrit: 'Agni',    color: '#F09125', bg: '#FEF0E3', active: false,
    phase: 'Arrives Phase 2', desc: 'Clean energy and efficient cookstoves — replacing smoke and scarcity with warmth that heals.' },
  { key: 'air',   glyph: '🌬', name: 'Air',    sanskrit: 'Vayu',    color: '#534AB7', bg: '#EEEDFE', active: false,
    phase: 'Arrives Phase 3', desc: 'Emissions capture and air quality — clearing the breath shared by every living thing.' },
  { key: 'ether', glyph: '✨', name: 'Ether',  sanskrit: 'Akasha',  color: '#112121', bg: '#E8E8E8', active: false,
    phase: 'Arrives Phase 4', desc: 'Community, education and regenerative culture — the field that holds the other four together.' },
]

const PRICE_RANGES = [
  { label: 'Any' },
  { label: '₹0–100',   min: 0,   max: 100  },
  { label: '₹100–130', min: 100, max: 130  },
  { label: '₹130+',    min: 130, max: 99999 },
]

const PROGRESS_OPTIONS = [
  { label: 'Any',           value: 'any'     },
  { label: 'Under 50%',     value: 'under50' },
  { label: 'Over 50%',      value: 'over50'  },
]

const SORT_OPTIONS = [
  { label: 'Newest',   value: 'newest'   },
  { label: 'Price',    value: 'price'    },
  { label: 'Progress', value: 'progress' },
]

// ── Element pentagon icon ─────────────────────────────────────────────────────
function ElementIcon({ el, filled }: { el: typeof ELEMENTS[0]; filled: boolean }) {
  const pts = pentaPoints(30, 31, 25)
  return (
    <svg width="100%" viewBox="0 0 60 62" aria-hidden="true">
      <polygon
        points={pts}
        fill={filled ? el.color : 'none'}
        stroke={el.color}
        strokeWidth={filled ? 2 : 1.5}
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.5}
      />
      <text x="30" y="37" textAnchor="middle" fontSize="18" opacity={filled ? 1 : 0.5}>
        {el.glyph}
      </text>
    </svg>
  )
}

// ── Coming-soon modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ elementKey, onClose }: { elementKey: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent]   = useState(false)
  const el = ELEMENTS.find(e => e.key === elementKey)
  if (!el) return null

  const outerPts = pentaPoints(48, 50, 42)
  const innerPts = pentaPoints(48, 50, 33)

  return (
    <div className="mp-modal-overlay" onClick={onClose}>
      <div className="mp-modal" onClick={e => e.stopPropagation()}>
        <button className="mp-modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="mp-modal-icon">
          <svg width="100%" viewBox="0 0 96 100" aria-hidden="true">
            <polygon points={outerPts} fill={el.bg} stroke={el.color} strokeWidth="2" strokeLinejoin="round" />
            <polygon points={innerPts} fill="none" stroke={el.color} strokeWidth="0.75" strokeLinejoin="round" opacity="0.5" />
            <text x="48" y="58" textAnchor="middle" fontSize="30">{el.glyph}</text>
          </svg>
        </div>

        <div className="mp-modal-names">
          <span className="mp-modal-title">{el.name}</span>
          <span className="mp-modal-sanskrit">{el.sanskrit}</span>
        </div>

        <span className="mp-modal-phase" style={{ background: el.bg, color: el.color }}>{el.phase}</span>
        <p className="mp-modal-desc">{el.desc}</p>

        <div className="mp-modal-form-wrap">
          <label className="mp-modal-form-label">Get notified when {el.name} goes live</label>
          {!sent ? (
            <form className="mp-modal-form-row" onSubmit={e => { e.preventDefault(); setSent(true) }}>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="mp-modal-input"
              />
              <button type="submit" className="mp-modal-btn">Notify me</button>
            </form>
          ) : (
            <p className="mp-modal-sent">✓ You're on the list. We'll be in touch.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="mp-card mp-card--skeleton">
      <div className="mp-skel mp-skel--thumb" />
      <div className="mp-card__body" style={{ gap: 12 }}>
        <div className="mp-skel mp-skel--tag" />
        <div className="mp-skel mp-skel--title" />
        <div className="mp-skel mp-skel--bar" />
      </div>
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ project: p }: { project: any }) {
  const navigate = useNavigate()
  const pct = p.totalTrees > 0 ? Math.round((p.fundedTrees / p.totalTrees) * 100) : 0
  const el  = ELEMENTS.find(e => e.key === p.element) || ELEMENTS[0]
  // Per-element fallback dummy images (Unsplash, free to use)
  const ELEMENT_FALLBACKS: Record<string, string> = {
    earth: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop',
    water: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&auto=format&fit=crop',
    fire:  'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=600&auto=format&fit=crop',
    air:   'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop',
    ether: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop',
  }

  const imageUrl = p.coverImage || ELEMENT_FALLBACKS[p.element] || ELEMENT_FALLBACKS.earth

  const handleFund = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/fund?project=${p.slug || p.id}`)
  }

  return (
    <Link to={`/projects/${p.slug || p.id}`} className="mp-card">
      {/* Cover image thumbnail */}
      <div className="mp-card__thumb">
        <img
          src={imageUrl}
          alt={p.name}
          className="mp-card__thumb-bg"
          loading="lazy"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            img.style.display = 'none'
          }}
        />
        {/* Pentagon outline overlay */}
        <svg
          className="mp-card__thumb-outline"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points="50,2 98,36 80,92 20,92 2,36"
            fill="none"
            stroke={el.color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Element badge */}
        <span className="mp-card__el-badge" style={{ background: el.bg, borderColor: el.color + '66', color: el.color }}>
          {el.glyph} {el.name}
        </span>
      </div>

      {/* Card body */}
      <div className="mp-card__body">
        {/* Info */}
        <div className="mp-card__info">
          <h3 className="mp-card__title">{p.name}</h3>
          <span className="mp-card__location">📍 {p.location}</span>
        </div>

        {/* Standard badge */}
        {p.certification && (
          <span className="mp-card__standard">✓ {p.certification}</span>
        )}

        {/* Progress */}
        <div className="mp-card__progress">
          <div className="mp-card__progress-bar">
            <div className="mp-card__progress-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          {p.fundedTrees > 0 ? (
            <span className="mp-card__progress-label">
              {pct}% · {p.fundedTrees.toLocaleString('en-IN')} of {p.totalTrees.toLocaleString('en-IN')} trees
            </span>
          ) : (
            <span className="mp-card__progress-label mp-card__progress-label--none">
              Delivery in progress
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mp-card__footer">
        <div className="mp-card__price-wrap">
          <span className="mp-card__price">₹{p.pricePerTree}</span>
          <span className="mp-card__price-unit">per tree</span>
        </div>
        <button className="mp-card__fund-btn" onClick={handleFund}>
          Fund
        </button>
      </div>
    </Link>
  )
}

// ── Main Marketplace page ─────────────────────────────────────────────────────
export default function Marketplace() {
  const [activeElement, setActiveElement] = useState('earth')
  const [category,      setCategory]      = useState('All')
  const [priceRange,    setPriceRange]    = useState('Any')
  const [progress,      setProgress]      = useState('any')
  const [sort,          setSort]          = useState('newest')
  const [comingSoon,    setComingSoon]    = useState<string | null>(null)

  const { categories } = useProjectCategories()

  const filters = useMemo((): ProjectFilters => {
    const f: ProjectFilters = {
      element: activeElement,
      sort: sort as ProjectFilters['sort'],
    }
    if (category !== 'All') f.category = category
    const pr = PRICE_RANGES.find(r => r.label === priceRange)
    if (pr && pr.min !== undefined) { f.minPrice = pr.min; f.maxPrice = pr.max }
    if (progress === 'under50') f.progress = 'under50'
    if (progress === 'over50')  f.progress = 'over50'
    return f
  }, [activeElement, category, priceRange, progress, sort])

  const { projects, loading, error, refetch } = useProjects(filters)

  const clearFilters = useCallback(() => {
    setCategory('All')
    setPriceRange('Any')
    setProgress('any')
  }, [])

  const handleElementClick = (el: typeof ELEMENTS[0]) => {
    if (!el.active) { setComingSoon(el.key); return }
    setActiveElement(el.key)
    clearFilters()
  }

  const activeEl = ELEMENTS.find(e => e.key === activeElement) || ELEMENTS[0]
  const hasFilters = category !== 'All' || priceRange !== 'Any' || progress !== 'any'

  return (
    <div className="mp">

      {/* ── HEADER ── */}
      <div className="mp__header">
        <div className="mp__header-left">
          <Link to="/" className="mp__logo-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <svg width="26" height="27" viewBox="0 0 40 42" aria-hidden="true">
              <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="#112121" stroke="#2B5341" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M20 12 L22.3 18.6 L29.2 18.6 L23.6 22.7 L25.9 29.3 L20 25.2 L14.1 29.3 L16.4 22.7 L10.8 18.6 L17.7 18.6 Z" fill="none" stroke="#F09125" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <span className="mp__logo-text">five elements <strong>CARM</strong></span>
          </Link>
          <h1 className="mp__title">Fund a real project</h1>
        </div>
        <p className="mp__sub">
          Every project belongs to one element. Choose what you want to restore — start with Earth.
        </p>
      </div>

      {/* ── ELEMENT FILTER BAR ── */}
      <div className="mp__elements">
        <div className="mp__elements-inner">
          {ELEMENTS.map(el => (
            <button
              key={el.key}
              className={`mp__el-btn${activeElement === el.key ? ' mp__el-btn--active' : ''}${!el.active ? ' mp__el-btn--soon' : ''}`}
              onClick={() => handleElementClick(el)}
              aria-label={el.active ? `${el.name} — active filter` : `${el.name} — coming soon`}
            >
              <div className="mp__el-icon">
                <ElementIcon el={el} filled={activeElement === el.key} />
              </div>
              <span className="mp__el-name">{el.name}</span>
              {!el.active && <span className="mp__el-soon-badge">Coming soon</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── SHELL: rail + main ── */}
      <div className="mp__shell">

        {/* Left rail */}
        <aside className="mp__rail" aria-label="Filters">
          <div className="mp__rail-card">
            <div className="mp__rail-header">
              <span className="mp__rail-title">Refine</span>
              <button className="mp__clear-btn" onClick={clearFilters}>Clear</button>
            </div>

            {/* Category */}
            <div className="mp__filter-group">
              <span className="mp__filter-label">Category</span>
              <div className="mp__chips">
                {categories.map(c => (
                  <button
                    key={c}
                    className={`mp__chip${category === c ? ' mp__chip--active' : ''}`}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="mp__filter-group">
              <span className="mp__filter-label">Price / tree</span>
              <div className="mp__chips">
                {PRICE_RANGES.map(r => (
                  <button
                    key={r.label}
                    className={`mp__chip${priceRange === r.label ? ' mp__chip--active' : ''}`}
                    onClick={() => setPriceRange(r.label)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress */}
            <div className="mp__filter-group">
              <span className="mp__filter-label">Progress</span>
              <div className="mp__chips">
                {PROGRESS_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    className={`mp__chip${progress === p.value ? ' mp__chip--active' : ''}`}
                    onClick={() => setProgress(p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="mp__main">
          {/* Sort + count */}
          <div className="mp__sort-bar">
            <span className="mp__count">
              {loading ? '…' : `${projects.length} ${activeEl.name} ${projects.length === 1 ? 'project' : 'projects'}`}
            </span>
            <div className="mp__sort-group">
              <span className="mp__sort-label">Sort</span>
              <div className="mp__sort-tabs">
                {SORT_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    className={`mp__sort-tab${sort === s.value ? ' mp__sort-tab--active' : ''}`}
                    onClick={() => setSort(s.value)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mp__grid">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mp__state-box">
              <span className="mp__state-icon">🌾</span>
              <p className="mp__state-title">We couldn't load projects.</p>
              <p className="mp__state-sub">Something interrupted the connection. Your funding is safe — nothing was lost.</p>
              <button className="mp__state-btn" onClick={refetch}>Retry</button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && projects.length === 0 && (
            <div className="mp__state-box">
              <svg width="66" height="64" viewBox="0 0 60 58" aria-hidden="true">
                <polygon points="30,4 55.7,22.7 45.9,52.9 14.1,52.9 4.3,22.7" fill="#EAF3DE" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <p className="mp__state-title">No projects match these filters.</p>
              <p className="mp__state-sub">Try widening your search — there are more Earth projects waiting.</p>
              <button className="mp__state-btn" onClick={clearFilters}>Clear filters</button>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && projects.length > 0 && (
            <div className="mp__grid">
              {projects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </main>
      </div>

      {/* ── COMING SOON MODAL ── */}
      {comingSoon && (
        <ComingSoonModal elementKey={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  )
}
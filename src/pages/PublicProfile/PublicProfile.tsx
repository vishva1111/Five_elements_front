import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { TreePine, Leaf, MapPin, Globe, Share2, Copy, Check, ArrowLeft, ExternalLink } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { fetchProfile, type ProfileData } from '../../services/api'
import './PublicProfile.css'

// ── Pentagon geometry helper ──────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

// ── Avatar with initials inside pentagon ──────────────────────────────────────
function ProfileAvatar({ name, isOrg, size = 88 }: { name: string; isOrg: boolean; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
  const cx = size / 2, cy = size / 2, r = size * 0.44
  const pts = penta(cx, cy, r)
  const stroke = isOrg ? '#F09125' : '#AACBA7'
  const textColor = isOrg ? '#F09125' : '#AACBA7'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${name} avatar`}>
      <polygon points={pts} fill="#1A3330" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <text
        x={cx} y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.24}
        fontWeight="800"
        fill={textColor}
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        {initials}
      </text>
    </svg>
  )
}

// ── Radar chart (5-axis) ──────────────────────────────────────────────────────
function RadarChart({ values }: { values: number[] }) {
  const cx = 72, cy = 72, maxR = 60
  const axes = values.map((v, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const r = v * maxR
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const polyPts = axes.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const grid = (r: number) => penta(cx, cy, r)
  return (
    <svg width="144" height="144" viewBox="0 0 144 144" aria-label="Impact radar chart">
      <polygon points={grid(maxR)} fill="none" stroke="#2B5341" strokeWidth="0.8" />
      <polygon points={grid(maxR * 0.66)} fill="none" stroke="#2B5341" strokeWidth="0.5" />
      <polygon points={grid(maxR * 0.33)} fill="none" stroke="#2B5341" strokeWidth="0.5" />
      <polygon points={polyPts} fill="#2B5341" fillOpacity="0.45" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
      {axes.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill="#F09125" />
      ))}
    </svg>
  )
}

// ── Element filter tabs ───────────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'all',   name: 'All',   soon: false },
  { key: 'earth', name: 'Earth', soon: false },
  { key: 'water', name: 'Water', soon: true  },
  { key: 'fire',  name: 'Fire',  soon: true  },
  { key: 'air',   name: 'Air',   soon: true  },
  { key: 'ether', name: 'Ether', soon: true  },
]

// ── Tile detail modal ─────────────────────────────────────────────────────────
function TileModal({ tile, onClose }: { tile: any; onClose: () => void }) {
  return (
    <div className="pp-modal-backdrop" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <button className="pp-modal__close" onClick={onClose} aria-label="Close">✕</button>

        <div className="pp-modal__header">
          <div className="pp-modal__icon">{tile.icon}</div>
          <div>
            <div className="pp-modal__badges">
              <span className="pp-badge pp-badge--earth">🌍 Earth</span>
              <span className="pp-badge pp-badge--verified">✓ Verified</span>
            </div>
            <div className="pp-modal__title">{tile.type}</div>
            <div className="pp-modal__sub">Afforestation &amp; Land</div>
          </div>
        </div>

        <div className="pp-modal__body">
          <div className="pp-modal__qty-row">
            <div className="pp-modal__qty-icon">{tile.icon}</div>
            <div>
              <div className="pp-modal__qty">{tile.qty}</div>
              <div className="pp-modal__qty-meta">Funded {tile.date} · via five elements CARM</div>
            </div>
          </div>

          <div className="pp-modal__grid2">
            <div className="pp-modal__info-cell">
              <div className="pp-modal__info-label">Location</div>
              <div className="pp-modal__info-value">{tile.location || 'India'}</div>
            </div>
            <div className="pp-modal__info-cell">
              <div className="pp-modal__info-label">Standard · Registry</div>
              <div className="pp-modal__info-value pp-modal__info-value--mono">{tile.standard || 'Verra VCS'}</div>
            </div>
          </div>

          <div className="pp-modal__map-placeholder">
            <MapPin size={16} />
            <span>{tile.location || 'India'}</span>
          </div>

          <div className="pp-modal__actions">
            <button className="btn btn-primary btn-sm">Verify on public ledger</button>
            <Link to="/projects" className="btn btn-outline btn-sm">Project page →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PublicProfile() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState<'newest' | 'largest'>('newest')
  const [modal, setModal] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchProfile(id)
      .then(data => { setProfile(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  function copyUrl() {
    if (!profile) return
    navigator.clipboard.writeText(profile.shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="public-profile">
        <Navbar />
        <div className="pp-loading">
          <div className="pp-loading__spinner" />
          <p>Loading profile…</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="public-profile">
        <Navbar />
        <div className="pp-error">
          <h2>Profile not found</h2>
          <p>This profile doesn't exist or has been removed.</p>
          <Link to="/profiles" className="btn btn-primary btn-sm">← Back to profiles</Link>
        </div>
        <Footer />
      </div>
    )
  }

  const activeEl = ELEMENTS.find(e => e.key === filter)
  const isComingSoon = filter !== 'all' && activeEl?.soon
  const hasTiles = !isComingSoon

  const sortedTiles = [...(profile.tiles || [])].sort((a, b) => {
    if (sort === 'largest') {
      const aNum = parseFloat(a.qty) || 0
      const bNum = parseFloat(b.qty) || 0
      return bNum - aNum
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="public-profile">
      <Navbar />

      {/* ── Hero band ── */}
      <div className="pp-hero">
        <div className="container">
          <Link to="/profiles" className="pp-back-link">
            <ArrowLeft size={14} /> Explore profiles
          </Link>

          <div className="pp-hero__inner">
            {/* Identity */}
            <div className="pp-hero__identity">
              <ProfileAvatar name={profile.displayName} isOrg={profile.isOrg} size={88} />
              <div className="pp-hero__info">
                <span className={`pp-type-badge ${profile.isOrg ? 'pp-type-badge--org' : 'pp-type-badge--ind'}`}>
                  {profile.isOrg ? 'Business' : 'Individual'}
                </span>
                <h1 className="pp-hero__name">{profile.displayName}</h1>
                {profile.bio && <p className="pp-hero__bio">{profile.bio}</p>}
                <div className="pp-hero__meta">
                  {profile.metaLine && (
                    <span className="pp-hero__meta-item">
                      <MapPin size={13} /> {profile.metaLine}
                    </span>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="pp-hero__meta-item pp-hero__meta-item--link">
                      <Globe size={13} /> Website <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Radar */}
            <div className="pp-hero__radar">
              <RadarChart values={profile.radarValues} />
              <span className="pp-hero__radar-label">Impact across five elements</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="container">
        <div className="pp-stats">
          {profile.stats.map((s: any) => (
            <div key={s.label} className="pp-stat card">
              <div className="pp-stat__label">
                {s.label}
                <span className="pp-verified-badge">✓ Verified</span>
              </div>
              <div className="pp-stat__value">
                <span className="pp-stat__num">{s.value}</span>
                {s.unit && <span className="pp-stat__unit">{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Ledger note */}
        <div className="pp-ledger-note card">
          <span className="pp-ledger-note__icon">⛓</span>
          <span>
            Every figure here is backed by evidence on the{' '}
            <Link to="/ledger" className="pp-ledger-note__link">public ledger</Link>
            {' '}— this page shows only approved entries.
          </span>
        </div>
      </div>

      {/* ── Actions canvas ── */}
      <div className="container pp-section">
        <div className="pp-section__header">
          <div>
            <h2 className="pp-section__title">Every action, one by one</h2>
            <p className="pp-section__sub">{profile.tiles.length} verified actions · Earth element</p>
          </div>
          <div className="pp-sort">
            <span className="pp-sort__label">Sort</span>
            {(['newest', 'largest'] as const).map(s => (
              <button
                key={s}
                className={`pp-sort__btn ${sort === s ? 'pp-sort__btn--active' : ''}`}
                onClick={() => setSort(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Element filter */}
        <div className="pp-element-filter card">
          {ELEMENTS.map(el => (
            <button
              key={el.key}
              className={`pp-element-btn ${filter === el.key ? 'pp-element-btn--active' : ''} ${el.soon ? 'pp-element-btn--soon' : ''}`}
              onClick={() => setFilter(el.key)}
            >
              <svg width="22" height="22" viewBox="0 0 40 42" aria-hidden="true">
                <polygon
                  points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75"
                  fill={filter === el.key ? '#2B5341' : 'none'}
                  stroke={filter === el.key ? '#AACBA7' : '#2B5341'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{el.name}</span>
              {el.soon && <span className="pp-element-btn__soon">Soon</span>}
            </button>
          ))}
        </div>

        {/* Coming soon */}
        {isComingSoon && (
          <div className="pp-coming-soon card">
            <svg width="48" height="50" viewBox="0 0 40 42">
              <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="none" stroke="#2B5341" strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
            </svg>
            <h3>{activeEl?.name} arrives later</h3>
            <p>{activeEl?.name} projects are coming to the platform in a future phase. Actions funded then will appear here.</p>
          </div>
        )}

        {/* Tile grid */}
        {hasTiles && sortedTiles.length > 0 && (
          <div className="pp-tiles card">
            <div className="pp-tiles__grid">
              {sortedTiles.map((t: any, i: number) => (
                <button
                  key={i}
                  className="pp-tile"
                  onClick={() => setModal(t)}
                  aria-label={`View details for ${t.type}`}
                >
                  <div className="pp-tile__penta">
                    <span className="pp-tile__icon">{t.icon}</span>
                    <span className="pp-tile__qty">{t.qty}</span>
                    <span className="pp-tile__date">{t.date}</span>
                  </div>
                  <div className="pp-tile__label">{t.type}</div>
                </button>
              ))}
            </div>
            <p className="pp-tiles__hint">Click any tile to see details</p>
          </div>
        )}

        {hasTiles && sortedTiles.length === 0 && (
          <div className="pp-coming-soon card">
            <TreePine size={40} color="#2B5341" />
            <h3>No actions yet</h3>
            <p>This profile hasn't recorded any verified actions yet.</p>
          </div>
        )}
      </div>

      {/* ── Projects + Milestones + Share ── */}
      <div className="container pp-section">
        <div className="pp-bottom-grid">

          {/* Projects supported */}
          <div className="card pp-projects">
            <h2 className="pp-projects__title">Projects supported</h2>
            {profile.projects.length === 0 && (
              <p className="pp-projects__empty">No projects yet.</p>
            )}
            {profile.projects.map((p: any, i: number) => (
              <div key={i} className="pp-project-row">
                <div className="pp-project-row__avatar" style={{ background: p.hero }} />
                <div className="pp-project-row__info">
                  <div className="pp-project-row__name">{p.name}</div>
                  <div className="pp-project-row__meta">{p.location} · {p.standard}</div>
                </div>
                <Link to="/ledger" className="pp-project-row__link">Ledger →</Link>
              </div>
            ))}
          </div>

          <div className="pp-right-col">
            {/* Milestones */}
            <div className="card pp-milestones">
              <h2 className="pp-milestones__title">Milestones</h2>
              <div className="pp-milestones__grid">
                {profile.badges.map((b: any, i: number) => (
                  <div key={i} className="pp-milestone" style={{ opacity: b.opacity }}>
                    <svg width="44" height="46" viewBox="0 0 40 42">
                      <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill={b.fill} stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
                      <text x="20" y="26" textAnchor="middle" fontSize="13">{b.icon}</text>
                    </svg>
                    <span className="pp-milestone__label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="card pp-share">
              <div className="pp-share__header">
                <Share2 size={16} />
                <h2 className="pp-share__title">Share this profile</h2>
              </div>
              <p className="pp-share__note">{profile.shareNote}</p>
              <div className="pp-share__url-row">
                <span className="pp-share__url">{profile.shareUrl}</span>
                <button className="pp-share__copy-btn" onClick={copyUrl}>
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              {profile.isOrg && (
                <a href="#" className="pp-share__widget-link">Get the embeddable widget →</a>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Tile detail modal */}
      {modal && <TileModal tile={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
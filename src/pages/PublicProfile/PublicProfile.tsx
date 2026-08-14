import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchProfile, type ProfileData } from '../../services/api'

// ── Pentagon geometry ─────────────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number, rot = -Math.PI / 2): string {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

// ── Avatar SVG (org = building silhouette, individual = person) ───────────────
function AvatarSVG({ isOrg }: { isOrg: boolean }) {
  const pts = penta(52, 50, 46)
  const inner = isOrg
    ? `<rect x="20" y="30" width="64" height="44" rx="3" fill="#2B5341"/>
       <rect x="30" y="40" width="12" height="12" rx="1" fill="#AACBA7"/>
       <rect x="50" y="40" width="12" height="12" rx="1" fill="#AACBA7"/>
       <rect x="40" y="56" width="24" height="18" rx="1" fill="#AACBA7"/>`
    : `<circle cx="52" cy="38" r="14" fill="#AACBA7"/>
       <ellipse cx="52" cy="80" rx="22" ry="16" fill="#4a7a5e"/>`
  const svg = `<svg width="104" height="100" viewBox="0 0 104 100" role="img" aria-label="Profile avatar">
    <defs><clipPath id="ppAv"><polygon points="${pts}"/></clipPath></defs>
    <polygon points="${pts}" fill="none" stroke="#2B5341" stroke-width="2.5" stroke-linejoin="round"/>
    <g clip-path="url(#ppAv)">
      <rect x="0" y="0" width="104" height="100" fill="#1A3330"/>
      ${inner}
    </g>
  </svg>`
  return <div style={{ width: 104, height: 100 }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// ── Radar SVG (5-axis pentagon chart) ─────────────────────────────────────────
function RadarSVG({ values }: { values: number[] }) {
  const cx = 80, cy = 80, maxR = 68
  const axes = values.map((v, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const r = v * maxR
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
  const polyPts = axes.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const gridPts = (r: number) => penta(cx, cy, r)
  const svg = `<svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Impact radar">
    <polygon points="${gridPts(maxR)}" fill="none" stroke="#2B5341" stroke-width="0.8"/>
    <polygon points="${gridPts(maxR * 0.66)}" fill="none" stroke="#2B5341" stroke-width="0.5"/>
    <polygon points="${gridPts(maxR * 0.33)}" fill="none" stroke="#2B5341" stroke-width="0.5"/>
    <polygon points="${polyPts}" fill="#2B5341" fill-opacity="0.5" stroke="#AACBA7" stroke-width="1.5" stroke-linejoin="round"/>
    ${axes.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#F09125"/>`).join('')}
  </svg>`
  return <div style={{ width: 160, height: 160 }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// ── Element filter definitions ────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'earth', name: 'Earth', fill: '#2B5341', stroke: '#2B5341', pillBg: '#1A3330', pillBorder: '#2B5341', labelColor: '#AACBA7', soon: false, soonColor: '#2B5341' },
  { key: 'water', name: 'Water', fill: 'none',    stroke: '#24403c', pillBg: '#1A3330', pillBorder: '#24403c', labelColor: '#4a6a5a', soon: true,  soonColor: '#185FA5' },
  { key: 'fire',  name: 'Fire',  fill: 'none',    stroke: '#24403c', pillBg: '#1A3330', pillBorder: '#24403c', labelColor: '#4a6a5a', soon: true,  soonColor: '#F09125' },
  { key: 'air',   name: 'Air',   fill: 'none',    stroke: '#24403c', pillBg: '#1A3330', pillBorder: '#24403c', labelColor: '#4a6a5a', soon: true,  soonColor: '#534AB7' },
  { key: 'ether', name: 'Ether', fill: 'none',    stroke: '#24403c', pillBg: '#1A3330', pillBorder: '#24403c', labelColor: '#4a6a5a', soon: true,  soonColor: '#888' },
]


// ── Modal ─────────────────────────────────────────────────────────────────────
function TileModal({ tile, onClose }: { tile: any; onClose: () => void }) {
  const pts = penta(60, 58, 52)
  const svg = `<svg width="120" height="116" viewBox="0 0 120 116">
    <defs><clipPath id="ppmh"><polygon points="${pts}"/></clipPath></defs>
    <polygon points="${pts}" fill="none" stroke="#2B5341" stroke-width="2.5" stroke-linejoin="round"/>
    <g clip-path="url(#ppmh)">
      <rect x="0" y="0" width="120" height="116" fill="#2B5341"/>
      <ellipse cx="60" cy="96" rx="52" ry="34" fill="#4a7a5e"/>
      <circle cx="60" cy="46" r="16" fill="#AACBA7"/>
    </g>
  </svg>`
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.72)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 620, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', color: '#112121' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: '0.5px solid #AACBA7', cursor: 'pointer', fontSize: 14, color: '#112121', zIndex: 2 }}>✕</button>
        <div style={{ padding: '26px 26px 0', display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: 120, height: 116, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 11, color: '#2B5341', background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 6, padding: '2px 8px' }}>🌍 Earth</span>
              <span style={{ fontWeight: 700, fontSize: 10, color: '#fff', background: '#112121', borderRadius: 5, padding: '2px 7px' }}>✓ Verified</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 19, lineHeight: 1.2, marginBottom: 4 }}>{tile.type}</div>
            <div style={{ fontSize: 12.5, color: '#6B7B6E' }}>Afforestation & Land</div>
          </div>
        </div>
        <div style={{ padding: '20px 26px 26px' }}>
          <div style={{ background: '#F5F0EC', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0 }}>{tile.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{tile.qty}</div>
              <div style={{ fontSize: 12, color: '#6B7B6E' }}>Funded {tile.date} · via five elements CARM</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ border: '0.5px solid #EAE3DA', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 10.5, color: '#6B7B6E', marginBottom: 2 }}>Location</div>
              <div style={{ fontWeight: 700, fontSize: 12.5 }}>India</div>
            </div>
            <div style={{ border: '0.5px solid #EAE3DA', borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ fontSize: 10.5, color: '#6B7B6E', marginBottom: 2 }}>Standard · Registry</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>Verra VCS</div>
            </div>
          </div>
          <div style={{ height: 110, borderRadius: 12, background: 'linear-gradient(135deg,#EAF3DE,#d6e8cf)', border: '0.5px solid #AACBA7', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <span style={{ fontSize: 12.5, color: '#2B5341', fontWeight: 700 }}>India</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#6B7B6E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evidence</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {['linear-gradient(135deg,#2B5341,#4a7a5e)', 'linear-gradient(135deg,#3a5f2b,#6b8f4a)'].map((g, i) => (
              <div key={i} style={{ width: 72, height: 56, borderRadius: 8, background: g }} />
            ))}
            <div style={{ width: 72, height: 56, borderRadius: 8, background: 'linear-gradient(135deg,#4a7a5e,#AACBA7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#fff' }}>+4</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" style={{ flex: 1, background: '#F09125', color: '#fff', border: 'none', borderRadius: 9999, padding: '11px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13.5 }}>Verify on the public ledger</button>
            <Link to="/projects" style={{ flex: 1, background: '#fff', border: '1.5px solid #F09125', color: '#F09125', borderRadius: 9999, padding: '11px 0', fontWeight: 700, fontSize: 13.5, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Project page →</Link>
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

  const activeEl = ELEMENTS.find(e => e.key === filter)
  const isComingSoon = filter !== 'all' && activeEl?.soon
  const hasTiles = filter === 'all' || filter === 'earth'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#112121', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#AACBA7', fontSize: 14 }}>Loading profile…</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: '100vh', background: '#112121', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F09125', fontSize: 14 }}>Profile not found.</div>
      </div>
    )
  }

  function copyUrl() {
    navigator.clipboard.writeText(profile.shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#112121' }}>

      {/* Top bar */}
      <header style={{ background: '#112121', borderBottom: '0.5px solid #24403c', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="24" height="25" viewBox="0 0 40 42" aria-hidden="true">
          <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="none" stroke="#AACBA7" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M20 12 L22.3 18.6 L29.2 18.6 L23.6 22.7 L25.9 29.3 L20 25.2 L14.1 29.3 L16.4 22.7 L10.8 18.6 L17.7 18.6 Z" fill="none" stroke="#F09125" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#fff' }}>five elements <strong>CARM</strong></span>
        <span style={{ fontSize: 11.5, color: '#7c9a86' }}>· public profile</span>
        <div style={{ flex: 1 }} />
        <Link to="/" style={{ color: '#AACBA7', fontWeight: 700, fontSize: 12.5 }}>What is CARM? →</Link>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 72px' }}>

        {/* Section 1: Identity + headline */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: 1, minWidth: 320 }}>
            <AvatarSVG isOrg={profile.isOrg} />
            <div>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: '#fff', marginBottom: 5 }}>{profile.displayName}</h1>
              <div style={{ fontSize: 14, color: '#AACBA7', lineHeight: 1.45, marginBottom: 6, maxWidth: 420 }}>{profile.bio}</div>
              <div style={{ fontSize: 12, color: '#7c9a86' }}>{profile.metaLine}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <RadarSVG values={profile.radarValues} />
            <span style={{ fontSize: 11, color: '#7c9a86' }}>Impact across five elements</span>
          </div>
        </div>

        {/* Headline stats */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${profile.stats.length}, minmax(0,1fr))`, gap: 14, marginBottom: 14 }}>
          {profile.stats.map((s: any) => (
            <div key={s.label} style={{ background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 14, padding: '18px 18px 15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#AACBA7' }}>{s.label}</span>
                <span style={{ fontWeight: 700, fontSize: 9, color: '#112121', background: '#AACBA7', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>✓ Verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontWeight: 700, fontSize: 34, lineHeight: 1, color: '#F09125' }}>{s.value}</span>
                {s.unit && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#AACBA7' }}>{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Verification note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 10, padding: '11px 16px', marginBottom: 40 }}>
          <span style={{ color: '#AACBA7', fontSize: 14 }}>⛓</span>
          <span style={{ fontSize: 13, color: '#AACBA7', lineHeight: 1.4 }}>
            Every figure here is backed by evidence on the <a href="#" style={{ fontWeight: 700, color: '#F09125', textDecoration: 'underline' }}>public ledger</a> — this page shows only approved entries.
          </span>
        </div>

        {/* Section 2: Project canvas */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 3 }}>Every action, one by one</h2>
            <div style={{ fontSize: 13, color: '#7c9a86' }}>{profile.tiles.length} verified actions · Earth element</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#7c9a86', fontWeight: 700 }}>Sort</span>
            {(['newest', 'largest'] as const).map(s => (
              <button key={s} type="button" onClick={() => setSort(s)} style={{ background: sort === s ? '#2B5341' : 'transparent', color: sort === s ? '#fff' : '#7c9a86', border: `0.5px solid ${sort === s ? '#2B5341' : '#24403c'}`, borderRadius: 9999, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Element filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 14, padding: '12px 16px', marginBottom: 20 }}>
          <button type="button" onClick={() => setFilter('all')} style={{ background: filter === 'all' ? '#2B5341' : 'transparent', color: filter === 'all' ? '#fff' : '#7c9a86', border: `1px solid ${filter === 'all' ? '#2B5341' : '#24403c'}`, borderRadius: 10, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 12.5 }}>All</button>
          {ELEMENTS.map(e => (
            <div key={e.key} onClick={() => setFilter(e.key)} role="button" tabIndex={0} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 13px', borderRadius: 10, background: filter === e.key ? '#2B5341' : e.pillBg, border: `1px solid ${filter === e.key ? '#AACBA7' : e.pillBorder}`, minWidth: 68, cursor: 'pointer', opacity: e.soon ? 0.5 : 1 }}>
              <svg width="26" height="27" viewBox="0 0 40 42" aria-hidden="true">
                <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill={e.fill} stroke={e.stroke} strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: 10.5, color: filter === e.key ? '#fff' : e.labelColor }}>{e.name}</span>
            </div>
          ))}
        </div>

        {/* Coming soon state */}
        {isComingSoon && (
          <div style={{ background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 16, padding: '52px 32px', textAlign: 'center', marginBottom: 40 }}>
            <svg width="56" height="58" viewBox="0 0 40 42" style={{ marginBottom: 14 }}>
              <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="none" stroke={activeEl?.soonColor || '#2B5341'} strokeWidth="1.5" strokeDasharray="4 3" strokeLinejoin="round" />
            </svg>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#fff', marginBottom: 6 }}>{activeEl?.name} arrives later</div>
            <div style={{ fontSize: 13.5, color: '#AACBA7', lineHeight: 1.5, maxWidth: 380, margin: '0 auto' }}>
              {activeEl?.name} projects are coming to the platform in a future phase. Actions funded then will appear here — the framework keeps their place.
            </div>
          </div>
        )}

        {/* Pentagon tile grid */}
        {hasTiles && (
          <div style={{ background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 20, padding: '28px 24px 20px', marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '18px 14px' }}>
              {profile.tiles.map((t: any, i: number) => (
                <div key={i} onClick={() => setModal(t)} role="button" tabIndex={0} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.12s' }}>
                  <div style={{ width: 132, height: 128, clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)', background: '#22453c', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 10 }}>
                    <span style={{ fontSize: 30, lineHeight: 1 }}>{t.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.1 }}>{t.qty}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#7c9a86' }}>{t.date}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#AACBA7', lineHeight: 1.3, marginTop: 7, maxWidth: 140 }}>{t.type}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', fontSize: 11.5, color: '#7c9a86', marginTop: 20 }}>Older actions load as you scroll</div>
          </div>
        )}
        <div style={{ height: 32 }} />

        {/* Section 3: Projects + Share */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>
          {/* Projects supported */}
          <div style={{ background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 14 }}>Projects supported</div>
            {profile.projects.map((p: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 0', borderBottom: '0.5px solid #24403c' }}>
                <div style={{ width: 44, height: 44, clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)', background: p.hero, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: '#7c9a86' }}>{p.location} · {p.standard}</div>
                </div>
                <a href="#" style={{ fontWeight: 700, fontSize: 12, color: '#F09125', whiteSpace: 'nowrap' }}>Ledger →</a>
              </div>
            ))}
          </div>

          {/* Right column: Milestones + Share */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Milestones */}
            <div style={{ background: '#1A3330', border: '0.5px solid #2B5341', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 14 }}>Milestones</div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {profile.badges.map((b: any, i: number) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: 72, opacity: b.opacity }}>
                    <svg width="46" height="48" viewBox="0 0 40 42">
                      <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill={b.fill} stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
                      <text x="20" y="26" textAnchor="middle" fontSize="13">{b.icon}</text>
                    </svg>
                    <span style={{ fontSize: 10, color: '#AACBA7', textAlign: 'center', lineHeight: 1.25 }}>{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share */}
            <div style={{ background: '#22453c', border: '0.5px solid #2B5341', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 5 }}>Share this profile</div>
              <div style={{ fontSize: 12, color: '#AACBA7', marginBottom: 14, lineHeight: 1.45 }}>{profile.shareNote}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#112121', borderRadius: 9, padding: '9px 12px', marginBottom: 10 }}>
                <span style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: '#AACBA7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.shareUrl}</span>
                <button type="button" onClick={copyUrl} style={{ background: '#F09125', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{copied ? 'Copied!' : 'Copy'}</button>
              </div>
              {profile.isOrg && <a href="#" style={{ fontWeight: 700, fontSize: 12, color: '#F09125' }}>Get the embeddable widget →</a>}
            </div>
          </div>
        </div>
      </main>

      {/* Detail modal */}
      {modal && <TileModal tile={modal} onClose={() => setModal(null)} />}
    </div>
  )
}
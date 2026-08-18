import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchProjects, fetchPlatformStats } from '../../services/api'
import type { Project } from '../../types'
import './Landing.css'

// ── Pentagon helper ────────────────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function svgEl(s: string, style?: React.CSSProperties) {
  return (
    <div
      style={style || { width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: s }}
    />
  )
}

function heroSVG() {
  const cx = 190, cy = 178
  const outer = penta(cx, cy, 170)
  const inner = penta(cx, cy, 158)
  let g = '<defs>'
  g += '<linearGradient id="l0Grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#EF9F27"/><stop offset="50%" stop-color="#AACBA7"/><stop offset="100%" stop-color="#378ADD"/></linearGradient>'
  g += '<pattern id="l0Stripe" width="20" height="20" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#1A3330"/><rect width="10" height="20" fill="#20403B"/></pattern>'
  g += `<clipPath id="l0Clip"><polygon points="${inner}"/></clipPath></defs>`
  g += '<g clip-path="url(#l0Clip)"><rect x="0" y="0" width="380" height="360" fill="url(#l0Stripe)"/>'
  const glyphs = ['🌍', '💧', '🔥', '🌬', '✨']
  glyphs.forEach((gl, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    const x = cx + 96 * Math.cos(a), y = cy + 96 * Math.sin(a)
    g += `<text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle" font-size="26" opacity="0.9">${gl}</text>`
  })
  g += '<text x="190" y="188" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11" fill="#AACBA7">nature · all five elements</text></g>'
  g += `<polygon points="${outer}" fill="none" stroke="url(#l0Grad)" stroke-width="4" stroke-linejoin="round"/>`
  return svgEl(`<svg width="100%" viewBox="0 0 380 360" role="img" aria-label="A pentagon window onto nature, holding all five elements">${g}</svg>`, { width: '100%' })
}

function pathPenta(color: string, fillTint: string, glyph: string, size = 74) {
  const s = size, cx = s / 2, cy = s / 2 * 0.98, r = s / 2 - 4
  let g = `<polygon points="${penta(cx, cy, r)}" fill="${fillTint}" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`
  g += `<text x="${cx}" y="${cy + s * 0.13}" text-anchor="middle" font-size="${s * 0.38}">${glyph}</text>`
  return svgEl(`<svg width="100%" viewBox="0 0 ${s} ${s - 2}" aria-hidden="true">${g}</svg>`)
}

function stripPenta(el: { primary: string; active: boolean; glyph: string }) {
  const p = penta(48, 49, 42)
  const fill = el.active ? el.primary : 'none'
  let g = `<polygon points="${p}" fill="${fill}" stroke="${el.primary}" stroke-width="${el.active ? 2.5 : 1.5}" stroke-linejoin="round" opacity="${el.active ? '1' : '0.6'}"/>`
  g += `<text x="48" y="59" text-anchor="middle" font-size="28" opacity="${el.active ? '1' : '0.55'}">${el.glyph}</text>`
  return svgEl(`<svg width="100%" viewBox="0 0 96 94" aria-hidden="true">${g}</svg>`)
}

function stepPenta(glyph: string) {
  let g = `<polygon points="${penta(26, 26.5, 22)}" fill="#FEF0E3" stroke="#F09125" stroke-width="2" stroke-linejoin="round"/>`
  g += `<text x="26" y="34" text-anchor="middle" font-size="20">${glyph}</text>`
  return svgEl(`<svg width="100%" viewBox="0 0 52 53" aria-hidden="true">${g}</svg>`)
}

function avatarPenta(initials: string, color: string) {
  let g = `<polygon points="${penta(26, 26.5, 22)}" fill="${color}" stroke="#AACBA7" stroke-width="1.2" stroke-linejoin="round"/>`
  g += `<text x="26" y="31.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="700" font-size="13" fill="#F5F0EC">${initials}</text>`
  return svgEl(`<svg width="100%" viewBox="0 0 52 53" aria-hidden="true">${g}</svg>`)
}

// ── Nav logo SVG ───────────────────────────────────────────────────────────────
const NavLogo = () => (
  <svg width="30" height="31" viewBox="0 0 40 42" aria-hidden="true">
    <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="none" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M20 12 L22.3 18.6 L29.2 18.6 L23.6 22.7 L25.9 29.3 L20 25.2 L14.1 29.3 L16.4 22.7 L10.8 18.6 L17.7 18.6 Z" fill="none" stroke="#F09125" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
)

// ── Main component ─────────────────────────────────────────────────────────────
export default function Landing() {
  const [t, setT] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Real data from API
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([])
  const [platformStats, setPlatformStats] = useState({ treesFunded: 48213, tCO2eVerified: 1024, projectsActive: 6 })

  useEffect(() => {
    fetchProjects({ sort: 'newest' }).then(res => {
      setFeaturedProjects(res.data.slice(0, 3))
    }).catch(() => {/* keep empty, cards won't render */})

    fetchPlatformStats().then(stats => {
      setPlatformStats(stats)
    }).catch(() => {/* keep defaults */})
  }, [])

  // Animated counters
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setT(1); return }
    const start = performance.now(), dur = 1300
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur)
      setT(1 - Math.pow(1 - p, 3))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN')

  const elementOrder = [
    { name: 'Earth', glyph: '🌍', primary: '#2B5341', active: true },
    { name: 'Water', glyph: '💧', primary: '#185FA5', active: false },
    { name: 'Fire',  glyph: '🔥', primary: '#F09125', active: false },
    { name: 'Air',   glyph: '🌬', primary: '#534AB7', active: false },
    { name: 'Ether', glyph: '✨', primary: '#112121', active: false },
  ]
  const elements = elementOrder.map(el => ({
    ...el,
    icon: stripPenta(el),
    soon: !el.active,
    nameColor: el.active ? '#112121' : '#6B7B6E',
  }))

  const counters = [
    { value: fmt(platformStats.treesFunded * t),            label: 'trees funded' },
    { value: fmt(platformStats.tCO2eVerified * t) + ' tCO₂e', label: 'verified on the ledger' },
    { value: fmt(platformStats.projectsActive * t),         label: 'projects active' },
  ]

  const steps = [
    { n: 1, title: 'Measure', body: 'Individuals get a credible estimate in under two minutes; businesses measure Scope 1–3 from real activity data. Published factors, always cited.', icon: stepPenta('🧮') },
    { n: 2, title: 'Fund',    body: 'Back a real, specific Earth project — named trees in a named place, run by a named partner.', icon: stepPenta('🌍') },
    { n: 3, title: 'Prove',   body: 'Geo-tagged evidence arrives and every approved entry is written to a public ledger anyone can verify.', icon: stepPenta('📜') },
  ]

  const profiles = [
    { name: 'Aditi Sharma',           kind: 'Individual · Pune',    stat: '312 trees · 4.1 tCO₂e',    avatar: avatarPenta('AS', '#2B5341'), href: '/profiles' },
    { name: 'Meridian Manufacturing', kind: 'Business · Chennai',   stat: '12,400 trees · 214 tCO₂e', avatar: avatarPenta('MM', '#185FA5'), href: '/profiles' },
    { name: 'Rahul Nair',             kind: 'Individual · Kochi',   stat: '96 trees · 1.3 tCO₂e',     avatar: avatarPenta('RN', '#2B5341'), href: '/profiles' },
  ]


  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EC' }}>

      {/* ── NAV WRAPPER (position:relative so mobile menu anchors to it) ── */}
      <div className="l0-nav-wrap">
        <nav className="l0-nav">
          <Link to="/" className="l0-nav__brand">
            <NavLogo />
            <span className="l0-nav__name">five elements <strong>CARM</strong></span>
          </Link>
          <div className="l0-nav__right">
            <div className="l0-nav__links">
              <Link to="/projects">Projects</Link>
              <a href="#how">How it works</a>
              <Link to="/ledger">Ledger</Link>
              <Link to="/profiles">Explore profiles</Link>
            </div>
            <div className="l0-nav__actions">
              <Link to="/login" className="l0-nav__login">Log in</Link>
            </div>
            <button
              type="button"
              className="l0-nav__hamburger"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(o => !o)}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </nav>

        {/* ── MOBILE MENU ── */}
        {mobileMenuOpen && (
          <div className="l0-mobile-menu">
            <Link to="/projects" onClick={() => setMobileMenuOpen(false)}>Projects</Link>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <Link to="/ledger" onClick={() => setMobileMenuOpen(false)}>Ledger</Link>
            <Link to="/profiles" onClick={() => setMobileMenuOpen(false)}>Explore profiles</Link>
            <div className="l0-mobile-menu__actions">
              <Link to="/login" className="l0-nav__login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── HERO ── */}
      <header className="l0-hero">
        <div className="l0-hero__inner">
          <div className="l0-hero__copy" style={{ animation: 'fe-rise .5s ease' }}>
            <span className="l0-hero__badge">Where ancient wisdom meets climate science</span>
            <h1 className="l0-hero__h1">Climate action, rooted in the elements of nature.</h1>
            <p className="l0-hero__sub">Measure what you cause. Fund a real project. Prove it — on a public ledger anyone can check.</p>
            <div className="l0-hero__hint">
              <span style={{ color: '#AACBA7' }}>↓</span> Choose your path below — no account needed.
            </div>
          </div>
          <div className="l0-hero__visual" style={{ animation: 'fe-rise .6s ease' }}>
            <div style={{ width: '100%', maxWidth: 380 }}>{heroSVG()}</div>
          </div>
        </div>
        <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="l0-hero__wave" aria-hidden="true">
          <path d="M0 120 C 240 60, 480 160, 720 120 C 960 80, 1200 150, 1440 100 L1440 240 L0 240 Z" fill="#2B5341" fillOpacity="0.6" />
          <path d="M0 165 C 260 120, 520 195, 780 160 C 1020 128, 1240 185, 1440 150 L1440 240 L0 240 Z" fill="#2B5341" fillOpacity="0.75" />
        </svg>
      </header>

      {/* ── TWO-PATH CHOOSER / LOGIN / WORKSPACE ── */}
      <section className="l0-chooser-section">
        <div className="l0-chooser-section__inner">

          <div className="l0-path-grid">
            <Link to="/individual" className="l0-path-card l0-path-card--ind">
              <div style={{ width: 74, height: 72 }}>{pathPenta('#F09125', '#FEF0E3', '🌱')}</div>
              <div className="l0-path-card__body">
                <h2 className="l0-path-card__h2">For individuals</h2>
                <p className="l0-path-card__p">Measure your footprint, fund real projects, and watch your five-element impact grow.</p>
              </div>
              <span className="l0-path-card__cta l0-path-card__cta--orange">Start my impact →</span>
            </Link>
            <Link to="/business/settings" className="l0-path-card l0-path-card--biz">
              <div style={{ width: 74, height: 72 }}>{pathPenta('#185FA5', '#EAF2FA', '📊')}</div>
              <div className="l0-path-card__body">
                <h2 className="l0-path-card__h2">For businesses</h2>
                <p className="l0-path-card__p">Measure Scope 1–3, fund verified projects, and generate board-ready reports.</p>
              </div>
              <span className="l0-path-card__cta l0-path-card__cta--blue">Explore for business →</span>
            </Link>
          </div>
          <p className="l0-chooser-hint">Just looking? Either path works without an account — and your choice isn't binding.</p>


        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="l0-how" id="how">
        <div className="l0-how__inner">
          <div className="l0-how__head">
            <span className="l0-label">How it works</span>
            <h2 className="l0-how__h2">Measure · Fund · Prove</h2>
          </div>
          <div className="l0-steps-grid">
            {steps.map(s => (
              <div key={s.n} className="l0-step-card">
                <div className="l0-step-card__top">
                  <div style={{ width: 52, height: 50, flex: 'none' }}>{s.icon}</div>
                  <span className="l0-step-card__n">0{s.n}</span>
                </div>
                <h3 className="l0-step-card__h3">{s.title}</h3>
                <p className="l0-step-card__p">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF BAND ── */}
      <section className="l0-proof">
        <div className="l0-proof__inner">
          <div className="l0-counters">
            {counters.map((c, i) => (
              <div key={i} className="l0-counter-card">
                <span className="l0-counter-card__value">{c.value}</span>
                <span className="l0-counter-card__label">{c.label}</span>
              </div>
            ))}
          </div>
          <div className="l0-proof__verified">
            <span className="l0-proof__badge">✓ Verified</span>
            on the public ledger — <a href="#" className="l0-proof__link">check any entry yourself</a>.
          </div>
        </div>
      </section>

      {/* ── ELEMENTS STRIP ── */}
      <section className="l0-elements">
        <div className="l0-elements__inner">
          <h2 className="l0-elements__h2">Five elements. One planet. Start with Earth.</h2>
          <div className="l0-elements__grid">
            {elements.map(el => (
              <div key={el.name} className="l0-el-tile">
                <div style={{ width: 96, height: 92 }}>{el.icon}</div>
                <span className="l0-el-tile__name" style={{ color: el.nameColor }}>{el.name}</span>
                {el.soon   && <span className="l0-el-tile__badge l0-el-tile__badge--soon">Coming soon</span>}
                {el.active && <span className="l0-el-tile__badge l0-el-tile__badge--active">Active now</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROJECT VISIBILITY ── */}
      <section className="l0-projects">
        <div className="l0-projects__inner">
          <div className="l0-projects__head">
            <div className="l0-projects__head-copy">
              <span className="l0-label">Impact you can see</span>
              <h2 className="l0-projects__h2">Real projects, in named places</h2>
              <p className="l0-projects__sub">Every project is run by a named partner and reports geo-tagged evidence. Nothing counts until it's approved on the ledger.</p>
            </div>
            <Link to="/projects" className="l0-projects__all">Explore all projects →</Link>
          </div>
          <div className="l0-proj-grid">
            {featuredProjects.map(p => (
              <Link key={p.id} to={`/projects/${p.slug || p.id}`} className="l0-proj-card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                <img
                  src={p.coverImage || 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80'}
                  alt={p.name}
                  className="l0-proj-card__img-slot"
                  style={{ objectFit: 'cover', width: '100%' }}
                />
                <div className="l0-proj-card__body">
                  <div className="l0-proj-card__top">
                    <h3 className="l0-proj-card__h3">{p.name}</h3>
                    {p.verified && <span className="l0-proj-card__verified">✓ Verified</span>}
                  </div>
                  <span className="l0-proj-card__loc">{p.location}{p.partner ? ` · Partner: ${p.partner}` : ''}</span>
                  <div className="l0-proj-card__stats">
                    <span>{p.fundedTrees.toLocaleString('en-IN')} trees</span>
                    <span className="l0-proj-card__sep">|</span>
                    <span>{p.tCO2e} tCO₂e</span>
                    <span className="l0-proj-card__sep">|</span>
                    <span>{p.evidenceCount} evidence entries</span>
                  </div>
                  <span className="l0-proj-card__link">View project detail →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CUSTOMERS ── */}
      <section className="l0-customers">
        <div className="l0-customers__inner">
          <div className="l0-customers__head">
            <span className="l0-label">Customers</span>
            <h2 className="l0-customers__h2">Teams that measure, fund and prove with us</h2>
          </div>
          <div className="l0-logos">
            <span className="l0-logo">Meridian Mfg.</span>
            <span className="l0-logo l0-logo--italic">Banyan Hotels</span>
            <span className="l0-logo l0-logo--mono">KOVA foods</span>
            <span className="l0-logo l0-logo--upper">TrailWorks</span>
            <span className="l0-logo">Zephyr Labs</span>
            <span className="l0-logo l0-logo--italic">Aster &amp; Co.</span>
          </div>
          <div className="l0-testimonials">
            <div className="l0-testimonial">
              <span className="l0-testimonial__tag l0-testimonial__tag--biz">Business</span>
              <span className="l0-testimonial__stat">214 tCO₂e</span>
              <p className="l0-testimonial__p">verified against Meridian's Scope 1–3 inventory — every entry traceable in their CSRD report.</p>
              <span className="l0-testimonial__who">Meridian Manufacturing <span>· Chennai</span></span>
            </div>
            <div className="l0-testimonial">
              <span className="l0-testimonial__tag l0-testimonial__tag--ind">Individual</span>
              <span className="l0-testimonial__stat">312 trees</span>
              <p className="l0-testimonial__p">"I can point at my trees on a map and show my kids the evidence photos. That's why I stayed."</p>
              <span className="l0-testimonial__who">Aditi Sharma <span>· Pune</span></span>
            </div>
            <div className="l0-testimonial">
              <span className="l0-testimonial__tag l0-testimonial__tag--biz">Business</span>
              <span className="l0-testimonial__stat">9 of 12 sites</span>
              <p className="l0-testimonial__p">onboarded to source-level measurement in one quarter — bulk upload straight from utility bills.</p>
              <span className="l0-testimonial__who">Banyan Hotels <span>· Goa</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPLORE PROFILES ── */}
      <section className="l0-profiles">
        <div className="l0-profiles__inner">
          <div className="l0-profiles__head">
            <div>
              <h2 className="l0-profiles__h2">Impact in the open</h2>
              <p className="l0-profiles__sub">A few members who chose to make their verified impact public.</p>
            </div>
            <Link to="/profiles" className="l0-profiles__all">Explore all profiles →</Link>
          </div>
          <div className="l0-profiles__grid">
            {profiles.map(p => (
              <Link key={p.name} to={p.href} className="l0-profile-card">
                <div style={{ width: 52, height: 50, flex: 'none' }}>{p.avatar}</div>
                <div className="l0-profile-card__info">
                  <span className="l0-profile-card__name">{p.name}</span>
                  <span className="l0-profile-card__kind">{p.kind}</span>
                  <span className="l0-profile-card__stat">{p.stat}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="l0-cta-section">
        <div className="l0-cta-box">
          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="l0-cta-box__wave" aria-hidden="true">
            <path d="M0 80 C 240 40, 480 110, 720 80 C 960 55, 1200 100, 1440 65 L1440 160 L0 160 Z" fill="#1A3330" fillOpacity="0.55" />
          </svg>
          <h2 className="l0-cta-box__h2">Start your impact journey</h2>
          <p className="l0-cta-box__p">Two minutes to a credible estimate. No account, no signup wall — just a first honest number.</p>
          <div className="l0-cta-box__btns">
            <Link to="/projects" className="l0-btn l0-btn--orange">🌍 Fund new project</Link>
            <Link to="/submit-project/details" className="l0-btn l0-btn--ghost">Start with existing project</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="l0-footer">
        <div className="l0-footer__inner">
          <div className="l0-footer__grid">
            <div className="l0-footer__brand-col">
              <Link to="/" className="l0-footer__brand">
                <NavLogo />
                <span className="l0-nav__name">five elements <strong>CARM</strong></span>
              </Link>
              <p className="l0-footer__tagline">Climate action, rooted in the elements of nature. Measure, fund, prove — on a public ledger anyone can check.</p>
              <div className="l0-footer__subscribe">
                <input type="email" placeholder="Email for updates" className="l0-footer__email" />
                <button type="button" className="l0-footer__sub-btn">Subscribe</button>
              </div>
            </div>
            <div className="l0-footer__col">
              <span className="l0-footer__col-title">Platform</span>
              <Link to="/projects">Projects</Link>
              <a href="#">Public ledger</a>
              <Link to="/profiles">Explore profiles</Link>
            </div>
            <div className="l0-footer__col">
              <span className="l0-footer__col-title">For businesses</span>
              <a href="#">Targets &amp; SBTi</a>
              <a href="#">Regulatory reports</a>
              <a href="#">Project portfolio</a>
            </div>
            <div className="l0-footer__col">
              <span className="l0-footer__col-title">Company</span>
              <a href="#">About</a>
              <a href="#">Partners</a>
              <a href="#">Methodology</a>
              <a href="#">Contact</a>
            </div>
            <div className="l0-footer__col">
              <span className="l0-footer__col-title">Connect</span>
              <a href="#">LinkedIn</a>
              <a href="#">Instagram</a>
              <a href="#">YouTube</a>
              <a href="#">Help centre</a>
            </div>
          </div>
          <div className="l0-footer__bottom">
            <div className="l0-footer__bottom-left">
              <span className="l0-footer__copy">© 2026 Five Elements CARM · Rooted in Earth · Prithvi</span>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
            <span className="l0-footer__beta">Beta · Earth active. Water, Fire, Air &amp; Ether coming.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
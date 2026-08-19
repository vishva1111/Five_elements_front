import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './IndividualLanding.css'

// ── Pentagon SVG helper ──────────────────────────────────────────────────────
function pentaPoints(cx, cy, r, rot = -Math.PI / 2) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / 5
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')
}

// ── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, duration = 1300) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      // cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3)
      el.textContent = Math.round(eased * target).toLocaleString()
      if (progress < 1) requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { start = null; requestAnimationFrame(step) } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])
  return ref
}

// ── Element strip data ───────────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'earth',  glyph: '🌍', name: 'Earth',  active: true  },
  { key: 'water',  glyph: '💧', name: 'Water',  active: false },
  { key: 'fire',   glyph: '🔥', name: 'Fire',   active: false },
  { key: 'air',    glyph: '🌬', name: 'Air',    active: false },
  { key: 'ether',  glyph: '✨', name: 'Ether',  active: false },
]

// ── How-it-works steps ───────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01',
    emoji: '📊',
    title: 'Measure',
    desc: 'Use DEFRA-aligned factors to get a credible estimate of your footprint in under two minutes. No account needed.',
  },
  {
    num: '02',
    emoji: '🌍',
    title: 'Fund',
    desc: 'Back a real, named project — trees in a named place, run by a named partner. Every tree is yours.',
  },
  {
    num: '03',
    emoji: '✅',
    title: 'Prove',
    desc: 'Geo-tagged evidence arrives from the field. Every approved entry is written to the public ledger with a transaction hash.',
  },
]

// ── Main component ───────────────────────────────────────────────────────────
export default function IndividualLanding() {
  const treesRef  = useCounter(48213)
  const tco2Ref   = useCounter(1024)
  const projRef   = useCounter(6)

  return (
    <div className="il">

      {/* ── NAV ── */}
      <nav className="il__nav">
        <div className="il__nav-inner">
          <Link to="/" className="il__nav-logo">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <polygon points={pentaPoints(14, 14, 13)} fill="none" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
              <text x="14" y="19" textAnchor="middle" fontSize="13" fill="#AACBA7">🌍</text>
            </svg>
            <span>Five Elements</span>
          </Link>
          <div className="il__nav-links">
            <Link to="/projects">Projects</Link>
            <Link to="/ledger">Ledger</Link>
            <Link to="/business" className="il__nav-biz">For business</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="il__hero">
        {/* Pentagon SVG */}
        <div className="il__hero-penta" aria-hidden="true">
          <svg viewBox="0 0 320 320" width="320" height="320">
            <defs>
              <radialGradient id="ilGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2B5341" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2B5341" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="160" cy="160" r="140" fill="url(#ilGlow)" />
            {/* outer ring */}
            <polygon points={pentaPoints(160, 160, 130)} fill="none" stroke="#2B5341" strokeWidth="1" strokeLinejoin="round" opacity="0.4" />
            {/* mid ring */}
            <polygon points={pentaPoints(160, 160, 90)} fill="none" stroke="#2B5341" strokeWidth="0.75" strokeLinejoin="round" opacity="0.25" />
            {/* filled earth pentagon */}
            <polygon points={pentaPoints(160, 160, 110)} fill="#2B5341" fillOpacity="0.18" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
            {/* earth glyph */}
            <text x="160" y="175" textAnchor="middle" fontSize="52">🌍</text>
            {/* element dots on outer ring */}
            {ELEMENTS.slice(1).map((el, i) => {
              const a = -Math.PI / 2 + ((i + 1) * 2 * Math.PI) / 5
              const x = 160 + 130 * Math.cos(a)
              const y = 160 + 130 * Math.sin(a)
              return (
                <g key={el.key}>
                  <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="18" fill="#1A3330" stroke="#2B5341" strokeWidth="1" />
                  <text x={x.toFixed(1)} y={(y + 6).toFixed(1)} textAnchor="middle" fontSize="14" opacity="0.45">{el.glyph}</text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Hero text */}
        <div className="il__hero-text">
          <p className="il__hero-eyebrow">For individuals · Earth element</p>
          <h1 className="il__hero-h1">
            Your footprint.<br />Your trees.<br />Your proof.
          </h1>
          <p className="il__hero-sub">
            Two minutes to a credible estimate. Fund real trees in a real place.
            Get geo-tagged evidence you can actually show people.
          </p>
          <div className="il__hero-btns">
            <Link to="/fund" className="il__btn-primary">🌍 Fund a project</Link>
          </div>
        </div>

        {/* Organic wave divider */}
        <div className="il__wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z" fill="#F5F0EC" />
          </svg>
        </div>
      </section>

      {/* ── PROOF BAND (animated counters) ── */}
      <section className="il__proof">
        <div className="il__proof-inner">
          <div className="il__proof-stat">
            <span className="il__proof-num" ref={treesRef}>0</span>
            <span className="il__proof-label">trees funded</span>
          </div>
          <div className="il__proof-divider" aria-hidden="true" />
          <div className="il__proof-stat">
            <span className="il__proof-num" ref={tco2Ref}>0</span>
            <span className="il__proof-label">tCO₂e verified</span>
          </div>
          <div className="il__proof-divider" aria-hidden="true" />
          <div className="il__proof-stat">
            <span className="il__proof-num" ref={projRef}>0</span>
            <span className="il__proof-label">active projects</span>
          </div>
        </div>
      </section>

      {/* ── ELEMENT STRIP ── */}
      <section className="il__elements">
        <div className="il__elements-inner">
          {ELEMENTS.map((el) => (
            <div key={el.key} className={`il__el-pill${el.active ? ' il__el-pill--active' : ''}`}>
              <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                <polygon
                  points={pentaPoints(16, 16, 14)}
                  fill={el.active ? '#2B5341' : 'none'}
                  stroke={el.active ? '#2B5341' : '#AACBA7'}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <text x="16" y="21" textAnchor="middle" fontSize="13">{el.glyph}</text>
              </svg>
              <span className="il__el-name">{el.name}</span>
              {!el.active && <span className="il__el-soon">SOON</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="il__how">
        <div className="il__how-inner">
          <p className="il__section-label">HOW IT WORKS</p>
          <h2 className="il__section-h2">Three steps. Real impact.</h2>
          <div className="il__steps">
            {STEPS.map((s) => (
              <div key={s.num} className="il__step">
                <div className="il__step-top">
                  <div className="il__step-penta">
                    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
                      <polygon points={pentaPoints(26, 26, 22)} fill="#EAF3DE" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" />
                      <text x="26" y="33" textAnchor="middle" fontSize="20">{s.emoji}</text>
                    </svg>
                  </div>
                  <span className="il__step-num">{s.num}</span>
                </div>
                <h3 className="il__step-title">{s.title}</h3>
                <p className="il__step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF SECTION ── */}
      <section className="il__proof-section">
        <div className="il__proof-section-inner">
          <div className="il__proof-copy">
            <p className="il__section-label il__section-label--light">WHY IT'S DIFFERENT</p>
            <h2 className="il__proof-h2">Not a certificate.<br />Actual proof.</h2>
            <p className="il__proof-body">
              Most carbon offsets give you a PDF. We give you a ledger entry — with a geo-tagged photo,
              a GPS coordinate, and a transaction hash anyone can verify.
            </p>
          </div>
          <div className="il__proof-items">
            {[
              { icon: '📍', text: 'GPS coordinates for every tree' },
              { icon: '📸', text: 'Geo-tagged photos from the field' },
              { icon: '📜', text: 'Public ledger entry — immutable' },
              { icon: '🌳', text: 'Named partner, named location' },
            ].map((item) => (
              <div key={item.text} className="il__proof-item">
                <span className="il__proof-item-icon">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS / TRUST BAND ── */}
      <section className="il__trust">
        <div className="il__trust-inner">
          <p className="il__section-label">WHAT FUNDERS SAY</p>
          <h2 className="il__section-h2">Real people. Real trees.</h2>
          <div className="il__testimonials">
            {[
              {
                quote: "I finally feel like my offset actually means something. I can see the GPS pin, the photo, the ledger entry — it's real.",
                name: "Priya M.",
                role: "Individual funder · 312 trees",
                initials: "PM",
              },
              {
                quote: "Two minutes to calculate, five minutes to fund. The certificate arrived with a transaction hash I could actually verify.",
                name: "Arjun K.",
                role: "Individual funder · 120 trees",
                initials: "AK",
              },
              {
                quote: "Every other platform gave me a PDF. Five Elements gave me a ledger entry. That's the difference.",
                name: "Sneha R.",
                role: "Individual funder · 88 trees",
                initials: "SR",
              },
            ].map((t) => (
              <div key={t.name} className="il__testimonial">
                <p className="il__testimonial-quote">"{t.quote}"</p>
                <div className="il__testimonial-author">
                  <div className="il__testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="il__testimonial-name">{t.name}</div>
                    <div className="il__testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="il__footer-cta">
        <div className="il__footer-cta-inner">
          <p className="il__section-label il__section-label--light">READY TO START?</p>
          <h2 className="il__footer-cta-h2">Your trees are waiting.</h2>
          <p className="il__footer-cta-sub">
            Join thousands of individuals who fund verified trees — with geo-tagged proof, not just a certificate.
          </p>
          <div className="il__footer-cta-btns">
            <Link to="/fund" className="il__btn-primary">🌍 Fund a project</Link>
            <Link to="/projects" className="il__btn-ghost">Browse projects →</Link>
          </div>
          <div className="il__footer-cta-trust">
            <span>✓ No account needed to start</span>
            <span>✓ Every tree on the public ledger</span>
            <span>✓ Geo-tagged field evidence</span>
          </div>
        </div>
      </section>

      {/* ── SITE FOOTER ── */}
      <footer className="il__site-footer">
        <div className="il__site-footer-inner">
          <div className="il__site-footer-brand">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <polygon points={pentaPoints(11, 11, 10)} fill="none" stroke="#AACBA7" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <span>Five Elements CARM</span>
          </div>
          <div className="il__site-footer-links">
            <Link to="/ledger">Public ledger</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/business">For business</Link>
          </div>
          <p className="il__site-footer-copy">© 2026 Five Elements. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
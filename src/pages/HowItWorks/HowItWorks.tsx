import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './HowItWorks.css'

// ── Pentagon SVG helper ────────────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function StepPenta({ num, color }: { num: number; color: string }) {
  const cx = 36, cy = 36, r = 30
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <polygon points={penta(cx, cy, r)} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="16" fill={color} fontWeight="700">
        {num}
      </text>
    </svg>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    num: 1,
    color: '#AACBA7',
    title: 'Measure your footprint',
    body: 'Answer a few questions about your lifestyle or business operations. Our calculator estimates your annual CO₂e using IPCC-aligned emission factors — no account needed.',
    icon: '📏',
  },
  {
    num: 2,
    color: '#EF9F27',
    title: 'Choose a verified project',
    body: 'Browse real tree-planting and ecosystem-restoration projects, each mapped to one of the five classical elements. Every project is partner-run and independently verified.',
    icon: '🌍',
  },
  {
    num: 3,
    color: '#378ADD',
    title: 'Fund trees directly',
    body: 'Your contribution goes straight to the executing partner. No middlemen, no opaque carbon credits — just a direct link between your money and trees in the ground.',
    icon: '💸',
  },
  {
    num: 4,
    color: '#AACBA7',
    title: 'Evidence is logged on the ledger',
    body: 'Partners upload geo-tagged photos and GPS coordinates for every planting event. Each approved entry is written to the public ledger with a cryptographic hash.',
    icon: '📷',
  },
  {
    num: 5,
    color: '#EF9F27',
    title: 'Anyone can verify',
    body: 'The public ledger is open to everyone — no login required. Search by project, funder, or entry ID. Every record is timestamped and tamper-evident.',
    icon: '🔍',
  },
]

const PRINCIPLES = [
  {
    glyph: '🌍',
    color: '#AACBA7',
    title: 'Earth · Prithvi',
    body: 'Reforestation and soil restoration. Trees sequester carbon, anchor soil, and anchor communities.',
  },
  {
    glyph: '💧',
    color: '#378ADD',
    title: 'Water · Jal',
    body: 'Watershed protection and wetland restoration. Healthy water systems regulate climate and sustain life.',
  },
  {
    glyph: '🔥',
    color: '#E05C2A',
    title: 'Fire · Agni',
    body: 'Clean energy transitions. Replacing fossil combustion with renewable sources cuts emissions at the source.',
  },
  {
    glyph: '🌬',
    color: '#8BBFD4',
    title: 'Air · Vayu',
    body: 'Air quality and atmospheric health. Reducing particulates and greenhouse gases protects people and ecosystems.',
  },
  {
    glyph: '✨',
    color: '#C9A84C',
    title: 'Ether · Akasha',
    body: 'Biodiversity and sacred groves. Protecting ancient ecosystems preserves the living memory of the planet.',
  },
]

const FAQS = [
  {
    q: 'Is this a carbon offset scheme?',
    a: 'No. We do not sell carbon credits or offsets. We connect funders directly to verified tree-planting projects. The CO₂e figures are estimates to help you understand scale — not tradeable instruments.',
  },
  {
    q: 'How are partners verified?',
    a: 'Partners go through an onboarding review, sign a data-sharing agreement, and must submit geo-tagged evidence for every planting event. Admins review and approve each submission before it appears on the ledger.',
  },
  {
    q: 'What happens to my money?',
    a: 'Funds are transferred directly to the executing partner organisation. Five Elements charges a small platform fee to cover infrastructure and verification costs, disclosed at checkout.',
  },
  {
    q: 'Can I verify my own contribution?',
    a: 'Yes. Every approved ledger entry carries a public hash. You can search the public ledger by your name, project, or entry ID at any time — no account required.',
  },
  {
    q: 'What is the five-elements framework?',
    a: 'The five classical elements — Earth, Water, Fire, Air, and Ether — map to five categories of climate action. It is a way of thinking about planetary health holistically, rooted in ancient natural philosophy.',
  },
]

// ── Component ──────────────────────────────────────────────────────────────────
export default function HowItWorks() {
  return (
    <div className="hiw">
      <Navbar />

      {/* Hero */}
      <section className="hiw-hero">
        <div className="hiw-hero__inner">
          <p className="hiw-hero__eyebrow">Transparent by design</p>
          <h1 className="hiw-hero__title">How Five Elements works</h1>
          <p className="hiw-hero__sub">
            A direct, verifiable path from your contribution to trees in the ground —
            every step logged on a public ledger anyone can check.
          </p>
          <div className="hiw-hero__ctas">
            <Link to="/projects" className="hiw-btn hiw-btn--primary">Browse projects</Link>
            <Link to="/ledger" className="hiw-btn hiw-btn--ghost">View public ledger</Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="hiw-steps">
        <div className="hiw-section-inner">
          <h2 className="hiw-section-title">Five steps, zero opacity</h2>
          <div className="hiw-steps__grid">
            {STEPS.map(s => (
              <div key={s.num} className="hiw-step">
                <div className="hiw-step__penta">
                  <StepPenta num={s.num} color={s.color} />
                </div>
                <div className="hiw-step__icon">{s.icon}</div>
                <h3 className="hiw-step__title" style={{ color: s.color }}>{s.title}</h3>
                <p className="hiw-step__body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Elements */}
      <section className="hiw-elements">
        <div className="hiw-section-inner">
          <h2 className="hiw-section-title">The five elements of climate action</h2>
          <p className="hiw-elements__intro">
            Ancient wisdom mapped to modern climate science. Each element represents a
            category of restoration work — together they cover the full spectrum of
            planetary health.
          </p>
          <div className="hiw-elements__grid">
            {PRINCIPLES.map(el => (
              <div key={el.title} className="hiw-el-card">
                <span className="hiw-el-card__glyph">{el.glyph}</span>
                <h3 className="hiw-el-card__title" style={{ color: el.color }}>{el.title}</h3>
                <p className="hiw-el-card__body">{el.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ledger callout */}
      <section className="hiw-ledger-callout">
        <div className="hiw-section-inner hiw-ledger-callout__inner">
          <div className="hiw-ledger-callout__text">
            <h2 className="hiw-ledger-callout__title">The public ledger</h2>
            <p className="hiw-ledger-callout__body">
              Every approved planting event is written to a public, append-only ledger.
              Each entry carries a cryptographic hash, GPS coordinates, a photo, and a
              timestamp. No login required to read it.
            </p>
            <Link to="/ledger" className="hiw-btn hiw-btn--primary">Open the ledger ↗</Link>
          </div>
          <div className="hiw-ledger-callout__visual" aria-hidden="true">
            <svg width="180" height="170" viewBox="0 0 180 170">
              <polygon points={penta(90, 85, 78)} fill="none" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round" opacity="0.3" />
              <polygon points={penta(90, 85, 58)} fill="none" stroke="#AACBA7" strokeWidth="1" strokeLinejoin="round" opacity="0.2" />
              <polygon points={penta(90, 85, 38)} fill="none" stroke="#AACBA7" strokeWidth="1" strokeLinejoin="round" opacity="0.15" />
              <text x="90" y="91" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#AACBA7" opacity="0.7">verified · public</text>
            </svg>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="hiw-faq">
        <div className="hiw-section-inner">
          <h2 className="hiw-section-title">Common questions</h2>
          <div className="hiw-faq__list">
            {FAQS.map(f => (
              <details key={f.q} className="hiw-faq__item">
                <summary className="hiw-faq__q">{f.q}</summary>
                <p className="hiw-faq__a">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="hiw-bottom-cta">
        <div className="hiw-section-inner hiw-bottom-cta__inner">
          <h2 className="hiw-bottom-cta__title">Ready to make it real?</h2>
          <p className="hiw-bottom-cta__sub">Browse verified projects and fund trees that are tracked, photographed, and logged — permanently.</p>
          <Link to="/projects" className="hiw-btn hiw-btn--primary hiw-btn--lg">Browse projects →</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

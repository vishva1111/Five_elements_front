import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProjects } from '../../hooks/useProjects'
import './Dashboard.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface BasketItem {
  id: string
  name: string
  category: string
  qty: number
  pricePerTree: number
  standard: string
  hero: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const HERO_GRADIENTS = [
  'linear-gradient(135deg,#2B5341,#4a7a5e)',
  'linear-gradient(135deg,#3a5f2b,#6b8f4a)',
  'linear-gradient(135deg,#2b5341,#185f5a)',
  'linear-gradient(135deg,#1a4a35,#2B5341)',
  'linear-gradient(135deg,#2B5341,#3D7A5C)',
]

// ── Measured footprint (static for now — would come from emissions API) ───────
const FOOTPRINT = { total: 154.5, s1: 25.1, s2: 35.7, s3: 93.7 }

export default function BusinessFundFlow() {
  const navigate = useNavigate()
  const { projects, loading, error } = useProjects({ element: 'earth' })

  // Basket: start with first 3 projects pre-added
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [publicAttrib, setPublicAttrib] = useState(true)
  const [payMethod, setPayMethod] = useState<'card' | 'invoice'>('card')
  const [submitted, setSubmitted] = useState(false)

  // Populate basket from projects once loaded
  React.useEffect(() => {
    if (projects.length > 0 && basket.length === 0) {
      setBasket(
        projects.slice(0, 3).map((p, i) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'Afforestation & Land',
          qty: Math.max(50, Math.floor(Math.random() * 500 + 100)),
          pricePerTree: p.pricePerTree || 50,
          standard: p.certification || 'Verra VCS',
          hero: HERO_GRADIENTS[i % HERO_GRADIENTS.length],
        }))
      )
    }
  }, [projects])

  function removeItem(id: string) {
    setBasket(prev => prev.filter(b => b.id !== id))
  }

  const projectFunding = basket.reduce((s, b) => s + b.qty * b.pricePerTree, 0)
  const platformFee    = projectFunding * 0.1
  const total          = projectFunding + platformFee
  const totalTrees     = basket.reduce((s, b) => s + b.qty, 0)
  const coveredTco2    = totalTrees * 0.077 // ~77g CO2 per tree
  const coveragePct    = Math.min(100, Math.round((coveredTco2 / FOOTPRINT.total) * 100))

  return (
    <div style={{ minHeight: '100vh', background: '#F5F0EC' }}>
      {/* Top bar */}
      <header style={{ background: '#112121', padding: '13px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link to="/projects" style={{ color: '#AACBA7', fontWeight: 700, fontSize: 13 }}>← Marketplace</Link>
        <div style={{ width: 1, height: 20, background: '#2B5341' }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Fund projects</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#AACBA7' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2B5341', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>SC</div>
          Meridian Manufacturing
        </div>
      </header>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 28px 56px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 440px', gap: 24, alignItems: 'start' }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Measured footprint */}
          <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 16, padding: 22 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#112121', marginBottom: 4 }}>Your measured footprint</div>
            <div style={{ fontSize: 12.5, color: '#6B7B6E', marginBottom: 16 }}>FY 2025 · from your emissions inventory</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 36, color: '#112121' }}>{FOOTPRINT.total}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#6B7B6E' }}>tCO₂e</span>
            </div>
            <div style={{ display: 'flex', height: 12, borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${(FOOTPRINT.s1 / FOOTPRINT.total) * 100}%`, background: '#2B5341' }} />
              <div style={{ width: `${(FOOTPRINT.s2 / FOOTPRINT.total) * 100}%`, background: '#185FA5' }} />
              <div style={{ width: `${(FOOTPRINT.s3 / FOOTPRINT.total) * 100}%`, background: '#AACBA7' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { color: '#2B5341', label: 'Scope 1 · Direct',       val: FOOTPRINT.s1 },
                { color: '#185FA5', label: 'Scope 2 · Energy',       val: FOOTPRINT.s2 },
                { color: '#AACBA7', label: 'Scope 3 · Value chain',  val: FOOTPRINT.s3 },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ color: '#6B7B6E', flex: 1 }}>{s.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#112121' }}>{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Basket */}
          <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #EAE3DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Your basket</div>
              <span style={{ fontSize: 12, color: '#6B7B6E' }}>{basket.length} project{basket.length !== 1 ? 's' : ''} · all Earth</span>
            </div>

            {loading && <div style={{ padding: 20, color: '#9AA79C', fontSize: 13 }}>Loading projects…</div>}
            {error && <div style={{ padding: 20, color: '#C0392B', fontSize: 13 }}>Failed to load projects.</div>}

            {basket.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '0.5px solid #F4EEE6' }}>
                <div style={{ width: 52, height: 52, borderRadius: 9, background: b.hero, clipPath: 'polygon(50% 0%,100% 38%,82% 100%,18% 100%,0% 38%)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 10, color: '#2B5341', background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 5, padding: '1px 6px' }}>🌍 Earth</span>
                    <span style={{ fontSize: 11, color: '#6B7B6E' }}>{b.category}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#112121', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                  <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>{b.qty.toLocaleString()} trees · {b.standard}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: '#112121' }}>{fmt(b.qty * b.pricePerTree)}</div>
                  <button onClick={() => removeItem(b.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#6B7B6E', cursor: 'pointer', padding: 0 }}>Remove</button>
                </div>
              </div>
            ))}

            <div style={{ padding: '12px 20px' }}>
              <Link to="/projects" style={{ fontWeight: 700, fontSize: 13, color: '#185FA5' }}>+ Add more projects</Link>
            </div>
          </div>

          {/* Coverage */}
          {basket.length > 0 && (
            <div style={{ background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#27500A' }}>Coverage of your footprint</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 22, color: '#2B5341' }}>{coveragePct}%</div>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: '#fff', overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ width: `${coveragePct}%`, height: '100%', background: '#2B5341', transition: 'width 0.4s' }} />
              </div>
              <div style={{ fontSize: 13, color: '#3a453c', lineHeight: 1.5 }}>
                This basket covers <strong>{coveredTco2.toFixed(1)} of your measured {FOOTPRINT.total} tCO₂e</strong> ({coveragePct}%). Funding reduces impact — it does not make you "carbon neutral". The remaining {(FOOTPRINT.total - coveredTco2).toFixed(1)} tCO₂e is unfunded.
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: payment panel */}
        <div style={{ position: 'sticky', top: 24 }}>
          <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 16, padding: 22 }}>

            {submitted ? (
              /* Invoice issued state */
              <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 54, height: 54, margin: '0 auto 14px', borderRadius: 14, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🧾</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#112121', marginBottom: 8 }}>Invoice issued</div>
                <div style={{ fontSize: 14, color: '#3a453c', lineHeight: 1.55, marginBottom: 18 }}>
                  Projects are <strong>reserved</strong> and funding begins <strong>on payment receipt</strong>. Verification and ledger entries follow delivery — we'll email you at each step.
                </div>
                <div style={{ background: '#F5F0EC', borderRadius: 10, padding: 14, textAlign: 'left', fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.7 }}>
                  {[
                    ['Invoice',    'INV-2026-0417'],
                    ['PO number',  'PO-88231'],
                    ['Amount due', fmt(total)],
                    ['Terms',      'Net 30'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{k}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#112121', fontWeight: k === 'Amount due' ? 700 : 400 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button type="button" style={{ width: '100%', background: '#fff', border: '1.5px solid #F09125', color: '#F09125', borderRadius: 9999, padding: '11px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, marginTop: 16 }}>
                  ↧ Download invoice PDF
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/business/portfolio')}
                  style={{ width: '100%', background: '#2B5341', color: '#fff', border: 'none', borderRadius: 9999, padding: '11px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, marginTop: 10 }}
                >
                  View my portfolio →
                </button>
              </div>
            ) : (
              /* Payment form */
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#112121', marginBottom: 16 }}>Payment</div>

                {/* Method selector */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  {(['card', 'invoice'] as const).map(m => (
                    <div key={m} onClick={() => setPayMethod(m)} style={{ flex: 1, border: payMethod === m ? '1.5px solid #F09125' : '1px solid #AACBA7', borderRadius: 10, padding: 12, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 16, height: 16, borderRadius: '50%', border: payMethod === m ? '5px solid #F09125' : '1.5px solid #AACBA7', display: 'inline-block' }} />
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#112121', textTransform: 'capitalize' }}>{m === 'card' ? 'Card' : 'Invoice'}</span>
                      </div>
                      {m === 'invoice' && <div style={{ fontSize: 10, color: '#8B3A00', background: '#FEF0E3', borderRadius: 5, padding: '1px 6px', display: 'inline-block', marginTop: 6, marginLeft: 24 }}>Business Pro+</div>}
                    </div>
                  ))}
                </div>

                {/* Card fields */}
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7B6E', marginBottom: 6 }}>Card number</label>
                <div style={{ height: 44, border: '1px solid #AACBA7', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#9AA79C', marginBottom: 12 }}>•••• •••• •••• 4242</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7B6E', marginBottom: 6 }}>Expiry</label>
                    <div style={{ height: 44, border: '1px solid #AACBA7', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#9AA79C' }}>04 / 28</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7B6E', marginBottom: 6 }}>PO number <span style={{ color: '#9AA79C', fontWeight: 400 }}>(optional)</span></label>
                    <div style={{ height: 44, border: '1px solid #AACBA7', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#9AA79C' }}>PO-88231</div>
                  </div>
                </div>

                {/* Public attribution toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F5F0EC', borderRadius: 10, padding: '12px 14px', margin: '6px 0 16px' }}>
                  <div onClick={() => setPublicAttrib(p => !p)} style={{ width: 40, height: 24, borderRadius: 9999, background: publicAttrib ? '#2B5341' : '#D8CEC2', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 3, left: publicAttrib ? 'auto' : 3, right: publicAttrib ? 3 : 'auto', width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'all 0.2s' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#112121' }}>Public attribution</div>
                    <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>Show Meridian Manufacturing on funded projects &amp; the ledger</div>
                  </div>
                </div>

                {/* Totals */}
                <div style={{ borderTop: '0.5px solid #EAE3DA', paddingTop: 14, fontSize: 13, color: '#6B7B6E', lineHeight: 1.9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Project funding</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#112121' }}>{fmt(projectFunding)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Platform fee (10%)</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#112121' }}>{fmt(platformFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 6, borderTop: '0.5px solid #EAE3DA' }}>
                    <span style={{ fontWeight: 700, color: '#112121', fontSize: 14 }}>Total today</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#112121', fontSize: 16 }}>{fmt(total)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#6B7B6E', margin: '8px 0 12px', lineHeight: 1.4 }}>
                  The 10% fee ({fmt(platformFee)}) sustains verification, the public ledger and platform operations. Shown here, never hidden in a tooltip.
                </div>

                <button
                  type="button"
                  disabled={basket.length === 0}
                  onClick={() => setSubmitted(true)}
                  style={{ width: '100%', background: basket.length === 0 ? '#D8CEC2' : '#F09125', color: '#fff', border: 'none', borderRadius: 9999, padding: '13px 0', cursor: basket.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}
                >
                  Fund {totalTrees.toLocaleString()} trees across {basket.length} project{basket.length !== 1 ? 's' : ''}
                </button>
                <div style={{ fontSize: 11, color: '#6B7B6E', textAlign: 'center', marginTop: 9, lineHeight: 1.4 }}>
                  Verification and ledger entries follow delivery. This does not claim neutrality.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
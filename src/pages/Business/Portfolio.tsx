import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import { fetchPortfolio, type PortfolioData, type PortfolioProject } from '../../services/api'

// ── Element filter tabs ───────────────────────────────────────────────────────
const ELEMENTS = [
  { name: 'Earth', fill: '#2B5341', stroke: '#2B5341', pillBg: '#EAF3DE', pillBorder: '#2B5341', labelColor: '#2B5341', soon: false },
  { name: 'Water', fill: 'none',    stroke: '#C9BFB3', pillBg: '#fff',    pillBorder: '#EAE3DA', labelColor: '#9AA79C', soon: true },
  { name: 'Fire',  fill: 'none',    stroke: '#C9BFB3', pillBg: '#fff',    pillBorder: '#EAE3DA', labelColor: '#9AA79C', soon: true },
  { name: 'Air',   fill: 'none',    stroke: '#C9BFB3', pillBg: '#fff',    pillBorder: '#EAE3DA', labelColor: '#9AA79C', soon: true },
  { name: 'Ether', fill: 'none',    stroke: '#C9BFB3', pillBg: '#fff',    pillBorder: '#EAE3DA', labelColor: '#9AA79C', soon: true },
]

// ── Verification badge ────────────────────────────────────────────────────────
function VerBadge({ kind }: { kind: string }) {
  if (kind === 'verified')
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 10, color: '#fff', background: '#112121', borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap' }}>✓ Verified</span>
  if (kind === 'progress')
    return <span style={{ fontWeight: 700, fontSize: 10, color: '#8B3A00', background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap' }}>Delivery in progress</span>
  return <span style={{ fontWeight: 700, fontSize: 10, color: '#6B7B6E', background: '#F0EDE8', border: '0.5px solid #D8CEC2', borderRadius: 5, padding: '3px 8px', whiteSpace: 'nowrap' }}>Paused</span>
}

// ── Ledger icon ───────────────────────────────────────────────────────────────
function LedgerIcon({ on, entryId }: { on: boolean; entryId?: string }) {
  if (on) return <Link to={entryId ? `/ledger?entry=${entryId}` : '/ledger'} title="Public ledger entry" style={{ color: '#185FA5', fontSize: 15 }}>⛓</Link>
  return <span style={{ color: '#C9BFB3', fontSize: 12 }}>—</span>
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div style={{ background: '#F5F0EC', border: '0.5px solid #EAE3DA', borderRadius: 12, padding: '15px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B7B6E', marginBottom: 7 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 26, color: badge ? '#2B5341' : '#112121' }}>{value}</span>
        {badge && <span style={{ fontWeight: 700, fontSize: 9, color: '#fff', background: '#112121', borderRadius: 4, padding: '2px 5px' }}>{badge}</span>}
      </div>
    </div>
  )
}

export default function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'grid'>('table')

  useEffect(() => {
    fetchPortfolio()
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const isEmpty = !loading && !error && (!data || data.projects.length === 0)
  const hasData = !loading && !error && data && data.projects.length > 0

  return (
    <BusinessLayout title="Projects" subtitle="Proof that your spend created real, verified impact">
      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="db-skel" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
          <div className="db-skel" style={{ height: 60, borderRadius: 14 }} />
          <div className="db-skel" style={{ height: 300, borderRadius: 16 }} />
        </div>
      )}

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {(isEmpty || hasData) && (
        <>
          {/* Summary strip */}
          {data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 14, marginBottom: 20 }}>
              <StatCard label="Total funded"  value={data.summary.totalFunded} />
              <StatCard label="tCO₂e offset"  value={data.summary.verifiedTco2}   badge="✓ Verified" />
              <StatCard label="Trees"          value={data.summary.verifiedTrees}  badge="✓ Verified" />
              <StatCard label="Projects"       value={String(data.summary.projectCount)} />
              <div style={{ background: '#F5F0EC', border: '0.5px solid #EAE3DA', borderRadius: 12, padding: '15px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#6B7B6E', marginBottom: 7 }}>Elements</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 26, color: '#112121' }}>{data.summary.elementsActive}</span>
                  <span style={{ fontSize: 12, color: '#6B7B6E' }}>of {data.summary.elementsTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Element filter bar */}
          <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 14, padding: '14px 18px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 11.5, color: '#6B7B6E', marginRight: 4 }}>Filter by element</span>
              {ELEMENTS.map(e => (
                <div key={e.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 10, background: e.pillBg, border: `1px solid ${e.pillBorder}`, minWidth: 74, cursor: e.soon ? 'default' : 'pointer', opacity: e.soon ? 0.7 : 1 }}>
                  <svg width="30" height="31" viewBox="0 0 40 42" aria-hidden="true">
                    <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill={e.fill} stroke={e.stroke} strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontWeight: 700, fontSize: 11, color: e.labelColor }}>{e.name}</span>
                  {e.soon && <span style={{ fontSize: 8.5, color: '#9AA79C', fontWeight: 700, letterSpacing: '0.02em' }}>SOON</span>}
                </div>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', border: '0.5px solid #AACBA7', borderRadius: 8, overflow: 'hidden' }}>
                <button type="button" onClick={() => setView('table')} style={{ background: view === 'table' ? '#185FA5' : '#fff', color: view === 'table' ? '#fff' : '#6B7B6E', border: 'none', padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>☰ Table</button>
                <button type="button" onClick={() => setView('grid')} style={{ background: view === 'grid' ? '#185FA5' : '#fff', color: view === 'grid' ? '#fff' : '#6B7B6E', border: 'none', borderLeft: '0.5px solid #AACBA7', padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>▦ Grid</button>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {isEmpty && (
            <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 16, padding: '56px 40px', textAlign: 'center', maxWidth: 600, margin: '8px auto' }}>
              <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: 14, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🌱</div>
              <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#112121' }}>Fund your first project</h2>
              <p style={{ fontSize: 15, color: '#6B7B6E', lineHeight: 1.5, maxWidth: 420, margin: '0 auto 22px' }}>
                Offsets follow measurement — <strong>measure first</strong>, then fund verified projects to act on what you found. Your funded impact will appear here with full provenance.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Link to="/projects" className="db-cta-btn">Browse marketplace</Link>
                <Link to="/business/emissions" style={{ background: '#fff', border: '1.5px solid #F09125', color: '#F09125', borderRadius: 9999, padding: '11px 24px', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Go to Emissions</Link>
              </div>
            </div>
          )}

          {/* Table view */}
          {hasData && view === 'table' && (
            <div style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 16, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.1fr 1.2fr 92px 1.5fr 1.3fr 44px', padding: '0 18px', height: 42, alignItems: 'center', background: '#FAF7F3', borderBottom: '0.5px solid #AACBA7' }}>
                {['Project', 'Category', 'Partner · Location', 'Funded', 'Delivered / target', 'Verification · Standard', 'Led.'].map((h, i) => (
                  <div key={h} style={{ fontWeight: 700, fontSize: 11, color: '#6B7B6E', textAlign: i === 3 ? 'right' : i === 6 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>

              {/* Table rows */}
              {data!.projects.map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2.1fr 1.1fr 1.2fr 92px 1.5fr 1.3fr 44px', padding: '12px 18px', alignItems: 'center', borderBottom: '0.5px solid #F4EEE6', background: p.rowBg, transition: 'background 0.1s' }}>
                  {/* Project name */}
                  <div style={{ minWidth: 0, paddingRight: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 10, color: '#2B5341', background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>🌍 Earth</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#112121', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  </div>
                  {/* Category */}
                  <div style={{ fontSize: 12, color: '#6B7B6E', paddingRight: 8 }}>{p.category}</div>
                  {/* Partner · Location */}
                  <div style={{ paddingRight: 8 }}>
                    <div style={{ fontSize: 12, color: '#112121' }}>{p.partner}</div>
                    <div style={{ fontSize: 11, color: '#6B7B6E' }}>{p.location}</div>
                  </div>
                  {/* Funded */}
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12.5, color: '#112121' }}>{p.fundedAmountFmt}</div>
                  {/* Progress */}
                  <div style={{ paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#112121' }}>{p.fundedTrees.toLocaleString()} / {p.totalTrees.toLocaleString()}</span>
                      <span style={{ fontSize: 10.5, color: p.verificationStatus === 'verified' ? '#6B7B6E' : '#8B3A00' }}>{p.progressLabel}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#EEE7DE', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(p.progressPct, 100)}%`, height: '100%', background: p.barColor }} />
                    </div>
                  </div>
                  {/* Verification + Standard */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <VerBadge kind={p.verificationStatus} />
                    <span style={{ fontSize: 11, color: '#6B7B6E' }}>{p.standard}</span>
                  </div>
                  {/* Ledger */}
                  <div style={{ textAlign: 'center' }}>
                    <LedgerIcon on={p.hasLedgerEntry} entryId={p.ledgerEntryId} />
                  </div>
                </div>
              ))}

              {/* Footer strip */}
              <div style={{ padding: '12px 18px', background: '#FAF7F3', display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: '#6B7B6E' }}>
                  {data!.summary.projectCount} projects · <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2B5341' }}>{data!.summary.verifiedTco2} tCO₂e verified</span>
                </span>
                <span style={{ fontSize: 11.5, color: '#8B3A00', background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 6, padding: '3px 9px' }}>
                  Funded-but-unevidenced counted separately — never in verified totals
                </span>
              </div>
            </div>
          )}

          {/* Grid view */}
          {hasData && view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {data!.projects.map(p => (
                <div key={p.id} style={{ background: '#fff', border: '0.5px solid #AACBA7', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ height: 100, background: 'linear-gradient(135deg, #2B5341 0%, #3D7A5C 100%)' }} />
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: '#2B5341', background: '#EAF3DE', border: '0.5px solid #AACBA7', borderRadius: 5, padding: '1px 6px', fontWeight: 500 }}>🌍 Earth</span>
                      <VerBadge kind={p.verificationStatus} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#112121', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7B6E', marginBottom: 10 }}>{p.location}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7B6E' }}>
                      <span>Standard · {p.standard}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#112121' }}>{p.tco2e} tCO₂e</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </BusinessLayout>
  )
}
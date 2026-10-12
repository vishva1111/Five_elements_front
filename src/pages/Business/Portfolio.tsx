import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import { fetchPortfolio, type PortfolioData, type PortfolioProject } from '../../services/api'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import './Portfolio.css'

// ── Element filter tabs ───────────────────────────────────────────────────────
const ELEMENTS = [
  { key: 'earth', name: 'Earth', glyph: '🌍', color: '#2B5341', bg: '#EAF3DE' },
  { key: 'water', name: 'Water', glyph: '💧', color: '#185FA5', bg: '#E6F1FB' },
  { key: 'fire',  name: 'Fire',  glyph: '🔥', color: '#B4600E', bg: '#FEF0E3' },
  { key: 'air',   name: 'Air',   glyph: '💨', color: '#534AB7', bg: '#EEEDFE' },
  { key: 'ether', name: 'Ether', glyph: '✨', color: '#112121', bg: '#ECECEC' },
]

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

// ── Verification badge (this organisation's own fundings in the project) ─────
function VerBadge({ p }: { p: PortfolioProject }) {
  if (p.verification === 'verified')
    return <span className="pf-badge pf-badge--verified">✓ Verified</span>
  if (p.verification === 'partial')
    return <span className="pf-badge pf-badge--progress">{p.verifiedFundings} of {p.fundings} verified</span>
  return <span className="pf-badge pf-badge--progress">Awaiting evidence</span>
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, badge, sub }: { label: string; value: string; badge?: string; sub?: string }) {
  return (
    <div className="pf-stat-card">
      <div className="pf-stat-card__label">{label}</div>
      <div className="pf-stat-card__value-row">
        <span className="pf-stat-card__num">{value}</span>
        {badge && <span className="pf-stat-card__badge">{badge}</span>}
        {sub && <span className="pf-stat-card__sub">{sub}</span>}
      </div>
    </div>
  )
}

export default function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'grid'>('table')
  const [element, setElement] = useState<string>('all')

  useEffect(() => {
    fetchPortfolio()
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const projects = data?.projects ?? []
  const countByElement = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of projects) m[p.element] = (m[p.element] || 0) + 1
    return m
  }, [projects])

  const filtered = useMemo(
    () => element === 'all' ? projects : projects.filter(p => p.element === element),
    [projects, element],
  )
  const pg = usePagination(filtered, 10, `${element}|${view}`)

  const isEmpty = !loading && !error && projects.length === 0
  const hasData = !loading && !error && projects.length > 0
  const s = data?.summary

  return (
    <BusinessLayout title="Projects" subtitle="Proof that your spend created real, verified impact">

      {/* Loading skeletons */}
      {loading && (
        <div className="pf-loading">
          <div className="pf-skel-strip">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="db-skel pf-skel-stat" />)}
          </div>
          <div className="db-skel pf-skel-filter" />
          <div className="db-skel pf-skel-table" />
        </div>
      )}

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {(isEmpty || hasData) && s && (
        <>
          {/* Summary strip */}
          <div className="pf-summary-strip">
            <StatCard label="Total funded"  value={fmtINR(s.totalFunded)} />
            <StatCard label="tCO₂e (est.)"  value={s.tco2e.toLocaleString('en-IN')} />
            <StatCard
              label="Trees"
              value={s.trees.toLocaleString('en-IN')}
              badge={s.verifiedTrees > 0 ? `✓ ${s.verifiedTrees.toLocaleString('en-IN')} verified` : undefined}
            />
            <StatCard label="Projects"      value={String(s.projectCount)} />
            <div className="pf-stat-card">
              <div className="pf-stat-card__label">Elements</div>
              <div className="pf-stat-card__value-row">
                <span className="pf-stat-card__num">{s.elementsActive}</span>
                <span className="pf-stat-card__sub">of {s.elementsTotal}</span>
              </div>
            </div>
          </div>

          {/* Element filter bar */}
          {hasData && (
            <div className="pf-filter-bar">
              <div className="pf-filter-bar__inner">
                <span className="pf-filter-bar__label">Filter by element</span>
                <div className="pf-filter-bar__elements">
                  <button
                    type="button"
                    className="pf-element-pill"
                    onClick={() => setElement('all')}
                    style={{ background: element === 'all' ? '#EAF3DE' : '#fff', borderColor: element === 'all' ? '#2B5341' : '#EAE3DA', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 18 }}>⬠</span>
                    <span className="pf-element-pill__name" style={{ color: '#2B5341' }}>All</span>
                  </button>
                  {ELEMENTS.map(e => {
                    const n = countByElement[e.key] || 0
                    const active = element === e.key
                    return (
                      <button
                        key={e.key}
                        type="button"
                        className="pf-element-pill"
                        disabled={n === 0}
                        onClick={() => setElement(e.key)}
                        title={n === 0 ? `No ${e.name} projects funded yet` : `${n} ${e.name} project${n !== 1 ? 's' : ''}`}
                        style={{
                          background: active ? e.bg : '#fff',
                          borderColor: active ? e.color : '#EAE3DA',
                          opacity: n === 0 ? 0.55 : 1,
                          cursor: n === 0 ? 'default' : 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{e.glyph}</span>
                        <span className="pf-element-pill__name" style={{ color: n === 0 ? '#9AA79C' : e.color }}>{e.name}</span>
                        {n > 0 ? <span className="pf-element-pill__soon">{n}</span> : <span className="pf-element-pill__soon">—</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="pf-view-toggle">
                  <button type="button" onClick={() => setView('table')} className={`pf-view-btn${view === 'table' ? ' pf-view-btn--active' : ''}`}>☰ Table</button>
                  <button type="button" onClick={() => setView('grid')}  className={`pf-view-btn${view === 'grid'  ? ' pf-view-btn--active' : ''}`}>▦ Grid</button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {isEmpty && (
            <div className="pf-empty">
              <div className="pf-empty__icon">🌱</div>
              <h2 className="pf-empty__title">Fund your first project</h2>
              <p className="pf-empty__sub">
                Your funded projects will appear here with full provenance — what you funded, where, and how much of it is verified.
              </p>
              <div className="pf-empty__actions">
                <Link to="/projects" className="db-cta-btn">Browse marketplace</Link>
              </div>
            </div>
          )}

          {/* Table view */}
          {hasData && view === 'table' && (
            <div className="pf-table-wrap">
              <div className="pf-table-scroll">
                <div className="pf-table-head">
                  <div className="pf-th pf-col-project">Project</div>
                  <div className="pf-th pf-col-category">Category</div>
                  <div className="pf-th pf-col-partner">Partner · Location</div>
                  <div className="pf-th pf-col-funded pf-th--right">You funded</div>
                  <div className="pf-th pf-col-progress">Your trees verified</div>
                  <div className="pf-th pf-col-verify">Verification · Standard</div>
                  <div className="pf-th pf-col-led pf-th--center">Led.</div>
                </div>

                {pg.items.map(p => {
                  const el = ELEMENTS.find(e => e.key === p.element) || ELEMENTS[0]
                  const pct = p.trees > 0 ? Math.round((p.verifiedTrees / p.trees) * 100) : 0
                  return (
                    <div key={p.id} className="pf-table-row">
                      <div className="pf-td pf-col-project">
                        <div className="pf-project-element-tag">{el.glyph} {el.name}</div>
                        <Link to={`/projects/${p.slug || p.id}`} className="pf-project-name" style={{ textDecoration: 'none', color: 'inherit' }}>{p.name}</Link>
                      </div>
                      <div className="pf-td pf-col-category pf-td--muted">{p.category}</div>
                      <div className="pf-td pf-col-partner">
                        <div className="pf-partner-name">{p.partner}</div>
                        <div className="pf-partner-loc">{p.location}</div>
                      </div>
                      <div className="pf-td pf-col-funded pf-td--mono pf-td--right">{fmtINR(p.amount)}</div>
                      <div className="pf-td pf-col-progress">
                        <div className="pf-progress-header">
                          <span className="pf-progress-trees">{p.verifiedTrees.toLocaleString('en-IN')} / {p.trees.toLocaleString('en-IN')}</span>
                          <span className="pf-progress-label" style={{ color: pct === 100 ? '#6B7B6E' : '#8B3A00' }}>{pct}%</span>
                        </div>
                        <div className="pf-progress-track">
                          <div className="pf-progress-fill" style={{ width: `${Math.max(pct, 2)}%`, background: pct === 100 ? '#2B5341' : '#F5C27A' }} />
                        </div>
                      </div>
                      <div className="pf-td pf-col-verify">
                        <VerBadge p={p} />
                        <span className="pf-standard-label">{p.standard}</span>
                      </div>
                      <div className="pf-td pf-col-led pf-td--center">
                        <Link to="/business/ledger" title="Your ledger entries" className="pf-ledger-link">⛓</Link>
                      </div>
                    </div>
                  )
                })}

                <div className="pf-table-footer">
                  <span className="pf-table-footer__text">
                    {filtered.length} project{filtered.length !== 1 ? 's' : ''} ·{' '}
                    <span className="pf-table-footer__mono">{fmtINR(filtered.reduce((t, p) => t + p.amount, 0))} funded</span>
                  </span>
                  <span className="pf-table-footer__note">
                    Funded-but-unevidenced trees are counted separately — never in verified totals
                  </span>
                </div>
              </div>
              <div style={{ padding: '0 16px 14px' }}><Pagination {...pg} noun="project" /></div>
            </div>
          )}

          {/* Grid view */}
          {hasData && view === 'grid' && (
            <>
              <div className="pf-grid">
                {pg.items.map(p => {
                  const el = ELEMENTS.find(e => e.key === p.element) || ELEMENTS[0]
                  return (
                    <Link key={p.id} to={`/projects/${p.slug || p.id}`} className="pf-grid-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="pf-grid-card__hero" />
                      <div className="pf-grid-card__body">
                        <div className="pf-grid-card__tags">
                          <span className="pf-grid-card__element-tag">{el.glyph} {el.name}</span>
                          <VerBadge p={p} />
                        </div>
                        <div className="pf-grid-card__name">{p.name}</div>
                        <div className="pf-grid-card__location">{p.location}</div>
                        <div className="pf-grid-card__footer">
                          <span className="pf-grid-card__standard">{p.trees.toLocaleString('en-IN')} trees · {fmtINR(p.amount)}</span>
                          <span className="pf-grid-card__tco2">{p.tco2e} tCO₂e</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
              <Pagination {...pg} noun="project" />
            </>
          )}
        </>
      )}
    </BusinessLayout>
  )
}

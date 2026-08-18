import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import BusinessLayout from './BusinessLayout'
import { fetchPortfolio, type PortfolioData, type PortfolioProject } from '../../services/api'
import './Portfolio.css'

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
    return <span className="pf-badge pf-badge--verified">✓ Verified</span>
  if (kind === 'progress')
    return <span className="pf-badge pf-badge--progress">Delivery in progress</span>
  return <span className="pf-badge pf-badge--paused">Paused</span>
}

// ── Ledger icon ───────────────────────────────────────────────────────────────
function LedgerIcon({ on, entryId }: { on: boolean; entryId?: string }) {
  if (on) return <Link to={entryId ? `/ledger?entry=${entryId}` : '/ledger'} title="Public ledger entry" className="pf-ledger-link">⛓</Link>
  return <span className="pf-ledger-empty">—</span>
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
        <div className="pf-loading">
          <div className="pf-skel-strip">
            {[1,2,3,4,5].map(i => <div key={i} className="db-skel pf-skel-stat" />)}
          </div>
          <div className="db-skel pf-skel-filter" />
          <div className="db-skel pf-skel-table" />
        </div>
      )}

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {(isEmpty || hasData) && (
        <>
          {/* Summary strip */}
          {data && (
            <div className="pf-summary-strip">
              <StatCard label="Total funded"  value={data.summary.totalFunded} />
              <StatCard label="tCO₂e offset"  value={data.summary.verifiedTco2}   badge="✓ Verified" />
              <StatCard label="Trees"          value={data.summary.verifiedTrees}  badge="✓ Verified" />
              <StatCard label="Projects"       value={String(data.summary.projectCount)} />
              <div className="pf-stat-card">
                <div className="pf-stat-card__label">Elements</div>
                <div className="pf-stat-card__value-row">
                  <span className="pf-stat-card__num">{data.summary.elementsActive}</span>
                  <span className="pf-stat-card__sub">of {data.summary.elementsTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Element filter bar */}
          <div className="pf-filter-bar">
            <div className="pf-filter-bar__inner">
              <span className="pf-filter-bar__label">Filter by element</span>
              <div className="pf-filter-bar__elements">
                {ELEMENTS.map(e => (
                  <div
                    key={e.name}
                    className="pf-element-pill"
                    style={{ background: e.pillBg, borderColor: e.pillBorder, opacity: e.soon ? 0.7 : 1, cursor: e.soon ? 'default' : 'pointer' }}
                  >
                    <svg width="28" height="29" viewBox="0 0 40 42" aria-hidden="true">
                      <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill={e.fill} stroke={e.stroke} strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    <span className="pf-element-pill__name" style={{ color: e.labelColor }}>{e.name}</span>
                    {e.soon && <span className="pf-element-pill__soon">SOON</span>}
                  </div>
                ))}
              </div>
              <div className="pf-view-toggle">
                <button type="button" onClick={() => setView('table')} className={`pf-view-btn${view === 'table' ? ' pf-view-btn--active' : ''}`}>☰ Table</button>
                <button type="button" onClick={() => setView('grid')}  className={`pf-view-btn${view === 'grid'  ? ' pf-view-btn--active' : ''}`}>▦ Grid</button>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {isEmpty && (
            <div className="pf-empty">
              <div className="pf-empty__icon">🌱</div>
              <h2 className="pf-empty__title">Fund your first project</h2>
              <p className="pf-empty__sub">
                Offsets follow measurement — <strong>measure first</strong>, then fund verified projects to act on what you found. Your funded impact will appear here with full provenance.
              </p>
              <div className="pf-empty__actions">
                <Link to="/projects" className="db-cta-btn">Browse marketplace</Link>
                <Link to="/business/emissions" className="pf-empty__secondary-btn">Go to Emissions</Link>
              </div>
            </div>
          )}

          {/* Table view */}
          {hasData && view === 'table' && (
            <div className="pf-table-wrap">
              {/* Scrollable table container */}
              <div className="pf-table-scroll">
                {/* Table header */}
                <div className="pf-table-head">
                  <div className="pf-th pf-col-project">Project</div>
                  <div className="pf-th pf-col-category">Category</div>
                  <div className="pf-th pf-col-partner">Partner · Location</div>
                  <div className="pf-th pf-col-funded pf-th--right">Funded</div>
                  <div className="pf-th pf-col-progress">Delivered / target</div>
                  <div className="pf-th pf-col-verify">Verification · Standard</div>
                  <div className="pf-th pf-col-led pf-th--center">Led.</div>
                </div>

                {/* Table rows */}
                {data!.projects.map((p: PortfolioProject) => (
                  <div key={p.id} className="pf-table-row" style={{ background: p.rowBg }}>
                    <div className="pf-td pf-col-project">
                      <div className="pf-project-element-tag">🌍 Earth</div>
                      <div className="pf-project-name">{p.name}</div>
                    </div>
                    <div className="pf-td pf-col-category pf-td--muted">{p.category}</div>
                    <div className="pf-td pf-col-partner">
                      <div className="pf-partner-name">{p.partner}</div>
                      <div className="pf-partner-loc">{p.location}</div>
                    </div>
                    <div className="pf-td pf-col-funded pf-td--mono pf-td--right">{p.fundedAmountFmt}</div>
                    <div className="pf-td pf-col-progress">
                      <div className="pf-progress-header">
                        <span className="pf-progress-trees">{p.fundedTrees.toLocaleString()} / {p.totalTrees.toLocaleString()}</span>
                        <span className="pf-progress-label" style={{ color: p.verificationStatus === 'verified' ? '#6B7B6E' : '#8B3A00' }}>{p.progressLabel}</span>
                      </div>
                      <div className="pf-progress-track">
                        <div className="pf-progress-fill" style={{ width: `${Math.min(p.progressPct, 100)}%`, background: p.barColor }} />
                      </div>
                    </div>
                    <div className="pf-td pf-col-verify">
                      <VerBadge kind={p.verificationStatus} />
                      <span className="pf-standard-label">{p.standard}</span>
                    </div>
                    <div className="pf-td pf-col-led pf-td--center">
                      <LedgerIcon on={p.hasLedgerEntry} entryId={p.ledgerEntryId ?? undefined} />
                    </div>
                  </div>
                ))}

                {/* Footer strip */}
                <div className="pf-table-footer">
                  <span className="pf-table-footer__text">
                    {data!.summary.projectCount} projects · <span className="pf-table-footer__mono">{data!.summary.verifiedTco2} tCO₂e verified</span>
                  </span>
                  <span className="pf-table-footer__note">
                    Funded-but-unevidenced counted separately — never in verified totals
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Grid view */}
          {hasData && view === 'grid' && (
            <div className="pf-grid">
              {data!.projects.map((p: PortfolioProject) => (
                <div key={p.id} className="pf-grid-card">
                  <div className="pf-grid-card__hero" />
                  <div className="pf-grid-card__body">
                    <div className="pf-grid-card__tags">
                      <span className="pf-grid-card__element-tag">🌍 Earth</span>
                      <VerBadge kind={p.verificationStatus} />
                    </div>
                    <div className="pf-grid-card__name">{p.name}</div>
                    <div className="pf-grid-card__location">{p.location}</div>
                    <div className="pf-grid-card__footer">
                      <span className="pf-grid-card__standard">Standard · {p.standard}</span>
                      <span className="pf-grid-card__tco2">{p.tco2e} tCO₂e</span>
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
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock } from 'lucide-react'
import { fetchDashboard, fetchBusinessOrg, type DashboardData } from '../../services/api'
import { API_URL as API } from '../../config/api'
import { getValidAccessToken } from '../../services/authTokens'
import { ProjectHero, RadarChart } from '../../components/dashboard/DashboardVisuals'
import BusinessLayout from './BusinessLayout'
import './Dashboard.css'

interface TreeRecord {
  id: string
  photo_url: string
  latitude: number
  longitude: number
  species: string
  health_status: string
  notes?: string
  submitted_at: string
  synced: boolean
  project_id?: string
}

type Period = 'all' | 'this-year' | 'last-year'

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [period, setPeriod]   = useState<Period>('all')
  const [orgSaved, setOrgSaved] = useState<boolean | null>(null)
  const [treeRecords, setTreeRecords] = useState<TreeRecord[]>([])
  const [treeLoading, setTreeLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setData(await fetchDashboard())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTreeRecords = useCallback(async () => {
    setTreeLoading(true)
    try {
      // The backend returns captures from the projects this account funded.
      const token = await getValidAccessToken()
      const res = await fetch(`${API}/api/dashboard/tree-records`, { headers: { Authorization: `Bearer ${token ?? ''}` } })
      const json = await res.json()
      setTreeRecords(res.ok ? (json.records ?? []) : [])
    } catch {
      setTreeRecords([])
    }
    setTreeLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadTreeRecords() }, [loadTreeRecords])
  useEffect(() => {
    // Only drives the onboarding checklist — a missing org table just means "not done".
    fetchBusinessOrg().then(d => setOrgSaved(d.org.saved)).catch(() => setOrgSaved(false))
  }, [])

  // ── Totals for the selected period ─────────────────────────────────────────
  const thisYear = new Date().getFullYear()
  const fundings = useMemo(() => (data?.fundings ?? []).filter(f => {
    if (period === 'all') return true
    const y = new Date(f.date).getFullYear()
    return period === 'this-year' ? y === thisYear : y === thisYear - 1
  }), [data, period, thisYear])

  const totals = useMemo(() => {
    const trees         = fundings.reduce((s, f) => s + f.trees, 0)
    const verifiedTrees = fundings.filter(f => f.verified).reduce((s, f) => s + f.trees, 0)
    return {
      trees,
      verifiedTrees,
      verifiedPct: trees > 0 ? Math.round((verifiedTrees / trees) * 100) : 0,
      amount:   fundings.reduce((s, f) => s + f.amount, 0),
      tco2e:    Math.round(trees * 0.017 * 10) / 10,
      projects: new Set(fundings.map(f => f.projectId)).size,
    }
  }, [fundings])

  // Projects this account funded in the period, largest contribution first.
  const portfolio = useMemo(() => {
    const meta = new Map((data?.projects ?? []).map(p => [p.id, p]))
    const map = new Map<string, { trees: number; amount: number; fundings: number; verified: number }>()
    for (const f of fundings) {
      const g = map.get(f.projectId) ?? { trees: 0, amount: 0, fundings: 0, verified: 0 }
      g.trees += f.trees; g.amount += f.amount; g.fundings += 1
      if (f.verified) g.verified += 1
      map.set(f.projectId, g)
    }
    return [...map.entries()]
      .filter(([id]) => meta.has(id))
      .map(([id, g]) => ({ ...meta.get(id)!, mine: g }))
      .sort((a, b) => b.mine.amount - a.mine.amount)
  }, [data, fundings])

  const hasAnyFunding = (data?.fundings.length ?? 0) > 0
  const periodLabel = period === 'all' ? 'All time' : period === 'this-year' ? String(thisYear) : String(thisYear - 1)

  return (
    <BusinessLayout
      title="Dashboard"
      subtitle={`Board brief · updated ${data?.updatedAt ?? '—'}`}
      actions={
        <>
          <select
            className="db-topbar__period-btn db-period-select"
            value={period}
            onChange={e => setPeriod(e.target.value as Period)}
            aria-label="Period"
          >
            <option value="all">All time</option>
            <option value="this-year">{thisYear}</option>
            <option value="last-year">{thisYear - 1}</option>
          </select>
          <button type="button" className="db-topbar__report-btn" onClick={() => navigate('/business/reports')}>
            Generate report
          </button>
        </>
      }
    >

      {/* LOADING */}
      {loading && (
        <div className="db-grid-2">
          {[1, 2].map(i => <div key={i} className="db-card db-skel" style={{ height: 240 }} />)}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="db-error-banner">
          ⚠ {error} — <button type="button" onClick={load} className="db-link">Retry</button>
        </div>
      )}

      {/* EMPTY — no funding yet */}
      {!loading && !error && !hasAnyFunding && (
        <div style={{ maxWidth: 640, margin: '16px auto 0' }}>
          <div className="db-welcome-badge">Welcome to CARM</div>
          <h2 className="db-onboard-title">Let's build your first board brief.</h2>
          <p className="db-onboard-sub">
            Three steps to a dashboard you can defend to an auditor.
            Every number here stays traceable to its source record.
          </p>
          <div className="db-onboard-steps">
            {[
              { n: 1, title: 'Add your organisation profile', sub: 'Legal name, industry, employee count and financial year.', to: '/business/settings', done: !!orgSaved },
              { n: 2, title: 'Browse & fund a project', sub: 'Pick a verified project from the marketplace to start your portfolio.', to: '/projects', done: false },
              { n: 3, title: 'Generate your first report', sub: 'Turn your funded, verified impact into a report you can share.', to: '/business/reports', done: false },
            ].map(step => (
              <div key={step.n} className="db-onboard-step" onClick={() => navigate(step.to)} role="link" tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') navigate(step.to) }}>
                <div className="db-onboard-step__num db-onboard-step__num--active">{step.done ? '✓' : step.n}</div>
                <div className="db-onboard-step__body">
                  <div className="db-onboard-step__title">{step.title}</div>
                  <div className="db-onboard-step__sub">{step.sub}</div>
                </div>
                <span className="db-onboard-step__cta db-onboard-step__cta--active">{step.done ? 'Done' : 'Start →'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POPULATED */}
      {!loading && !error && hasAnyFunding && (
        <>
          <div className="db-grid-2">

            {/* Your impact */}
            <div className="db-card db-impact-card">
              <div className="db-impact-card__header">
                <div className="db-impact-card__title">Your impact · {periodLabel}</div>
                <Link to="/business/ledger" className="db-link" style={{ fontSize: 12 }}>Ledger →</Link>
              </div>
              <div className="db-impact-card__body">
                <div className="db-impact-radar">
                  <RadarChart treesFunded={totals.trees} />
                </div>
                <div className="db-impact-stats">
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num">{totals.trees.toLocaleString('en-IN')}</span>
                      {totals.verifiedTrees > 0 && (
                        <span className="db-verified-badge">✓ {totals.verifiedTrees.toLocaleString('en-IN')} verified</span>
                      )}
                    </div>
                    <div className="db-impact-stat__label">trees funded · Earth</div>
                  </div>
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num db-impact-stat__num--mono">{totals.tco2e.toFixed(1)}</span>
                      <span className="db-impact-stat__unit">tCO₂e</span>
                    </div>
                    <div className="db-impact-stat__label">estimated offset</div>
                  </div>
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num">{totals.projects}</span>
                      <span className="db-stat-divider" />
                      <span className="db-impact-stat__num">{fmtINR(totals.amount)}</span>
                    </div>
                    <div className="db-impact-stat__label">projects funded · total contributed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence status */}
            <div className="db-card db-target-card">
              <div className="db-target-card__header">
                <div className="db-target-card__title">Evidence status</div>
              </div>
              <div className="db-evidence">
                <div className="db-evidence__big">
                  <span className="db-evidence__pct">{totals.verifiedPct}%</span>
                  <span className="db-evidence__of">of your funded trees have approved field evidence</span>
                </div>
                <div className="db-evidence__meter">
                  <div className="db-evidence__fill" style={{ width: `${totals.verifiedPct}%` }} />
                </div>
                <div className="db-evidence__row">
                  <span><CheckCircle2 size={14} className="db-evidence__ok" /> Verified</span>
                  <span>{totals.verifiedTrees.toLocaleString('en-IN')} trees</span>
                </div>
                <div className="db-evidence__row">
                  <span><Clock size={14} className="db-evidence__wait" /> Awaiting evidence</span>
                  <span>{(totals.trees - totals.verifiedTrees).toLocaleString('en-IN')} trees</span>
                </div>
              </div>
            </div>
          </div>

          {/* Funded portfolio */}
          <div className="db-portfolio-header">
            <div>
              <h2 className="db-portfolio-title">Funded portfolio</h2>
              <div className="db-portfolio-sub">The projects your organisation funded · {periodLabel}</div>
            </div>
            <Link to="/business/portfolio" className="db-link">View all projects →</Link>
          </div>

          <div className="db-grid-3">
            {portfolio.length > 0 ? portfolio.slice(0, 3).map(p => {
              const allVerified = p.mine.verified === p.mine.fundings
              const status   = allVerified ? 'Verified' : p.mine.verified > 0 ? 'Partly verified' : 'Awaiting evidence'
              const statusBg = allVerified ? '#185FA5' : p.mine.verified > 0 ? '#2B5341' : '#8B3A00'
              const pct = p.totalTrees > 0 ? Math.round((p.fundedTrees / p.totalTrees) * 100) : 0
              return (
                <div key={p.id} className="db-project-card" onClick={() => navigate(`/projects/${p.slug || p.id}`)}>
                  <div className="db-project-card__hero-wrap">
                    <ProjectHero statusBg={statusBg} status={status} />
                  </div>
                  <div className="db-project-card__body">
                    <div className="db-project-card__tags">
                      <span className="db-element-badge">{p.elGlyph} {p.element}</span>
                      {allVerified && <span className="db-verified-badge">✓ Verified</span>}
                    </div>
                    <div className="db-project-card__name">{p.name}</div>
                    <div className="db-project-card__location">{p.location}</div>
                    <div style={{ margin: '8px 0 4px' }}>
                      <div className="db-progress-track">
                        <div className="db-progress-fill" style={{ width: `${Math.min(Math.max(pct, 1), 100)}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9AA79C', marginTop: 3 }}>
                        <span>Project: {p.fundedTrees.toLocaleString('en-IN')} of {p.totalTrees.toLocaleString('en-IN')} trees</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div className="db-project-card__footer">
                      <span className="db-project-card__standard">You · {p.mine.trees.toLocaleString('en-IN')} trees</span>
                      <span className="db-project-card__tco2">{fmtINR(p.mine.amount)}</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="db-portfolio-empty">
                <div className="db-portfolio-empty__title">No funding in {periodLabel}</div>
                <div className="db-portfolio-empty__sub">Pick another period above, or fund a new project.</div>
              </div>
            )}
          </div>

          {/* Field evidence */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 className="db-portfolio-title">🌿 Field evidence from your projects</h2>
                <div className="db-portfolio-sub">Latest geo-tagged tree captures from the projects you funded</div>
              </div>
              <button type="button" className="db-cta-btn" onClick={loadTreeRecords} style={{ fontSize: 12, padding: '6px 14px' }}>
                ↻ Refresh
              </button>
            </div>

            {treeLoading && (
              <div style={{ color: '#9AA79C', fontSize: 13, padding: '20px 0' }}>Loading field captures…</div>
            )}

            {!treeLoading && treeRecords.length === 0 && (
              <div className="db-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📍</div>
                <div style={{ fontWeight: 600, color: '#112121', marginBottom: 6 }}>No field captures yet</div>
                <div style={{ fontSize: 13, color: '#6B7B6E' }}>
                  When partners record trees in the projects you funded, the photos and GPS points appear here.
                </div>
              </div>
            )}

            {!treeLoading && treeRecords.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {treeRecords.map(rec => {
                  const healthColor = rec.health_status === 'healthy' ? '#22c55e' : rec.health_status === 'sick' ? '#f59e0b' : rec.health_status === 'dead' ? '#ef4444' : '#9AA79C'
                  const healthEmoji = rec.health_status === 'healthy' ? '✅' : rec.health_status === 'sick' ? '⚠️' : rec.health_status === 'dead' ? '❌' : '❓'
                  const date = new Date(rec.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  const projectName = data?.projects.find(p => p.id === rec.project_id)?.name
                  return (
                    <div key={rec.id} className="db-card" style={{ padding: 0, overflow: 'hidden' }}>
                      {rec.photo_url ? (
                        <img
                          src={rec.photo_url}
                          alt={rec.species}
                          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: 100, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🌳</div>
                      )}
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: '#112121' }}>{rec.species}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: healthColor, background: healthColor + '18', borderRadius: 12, padding: '2px 8px' }}>
                            {healthEmoji} {rec.health_status ? rec.health_status.charAt(0).toUpperCase() + rec.health_status.slice(1) : 'Unknown'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6B7B6E', marginBottom: 4 }}>
                          📍 {rec.latitude != null && rec.longitude != null
                            ? `${Number(rec.latitude).toFixed(5)}, ${Number(rec.longitude).toFixed(5)}`
                            : 'No GPS location'}
                        </div>
                        {rec.notes && (
                          <div style={{ fontSize: 12, color: '#6B7B6E', marginBottom: 4, fontStyle: 'italic' }}>{rec.notes}</div>
                        )}
                        <div style={{ fontSize: 11, color: '#9AA79C', marginBottom: 4 }}>{date}</div>
                        {projectName && (
                          <div style={{ fontSize: 11, color: '#2B5341', background: '#e8f5e9', borderRadius: 8, padding: '2px 8px', display: 'inline-block', fontWeight: 600 }}>
                            🌍 {projectName}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </BusinessLayout>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { TreePine, Leaf, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import { fetchUserImpact, fetchPlatformStats } from '../../services/api'
import type { UserImpactEntry, UserImpactStats } from '../../services/api'
import { ProjectHero, RadarChart } from '../../components/dashboard/DashboardVisuals'
import IndividualLayout from './IndividualLayout'
import './ImpactHome.css'

const fmtINR  = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const ELEMENT_GLYPH: Record<string, string> = {
  earth: '🌍', water: '💧', fire: '🔥', air: '💨', ether: '✨',
}

interface ProjectShare {
  projectId: string
  name: string
  location: string
  element: string
  trees: number
  tCO2e: number
  amount: number
  fundings: number
  verifiedFundings: number
}

export default function ImpactHome() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries]   = useState<UserImpactEntry[]>([])
  const [stats, setStats]       = useState<UserImpactStats>({ trees: 0, tCO2e: 0, projects: 0, fundsInvested: 0 })
  const [platStats, setPlatStats] = useState({ treesFunded: 0, tCO2eVerified: 0, projectsActive: 0 })
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError]     = useState<string | null>(null)
  const [reloadKey, setReloadKey]     = useState(0)

  // Redirect users who have NO individual role at all.
  // Multi-role users (e.g. individual + business) are allowed here even
  // when their active DB role is 'business'.
  // Guard: only redirect once roles array is fully loaded (length > 0).
  useEffect(() => {
    if (
      !authLoading &&
      user &&
      user.roles.length > 0 &&
      !user.roles.includes('individual')
    ) {
      navigate(ROLE_HOME[user.role] ?? '/', { replace: true })
    }
  }, [authLoading, user, navigate])

  // Fetch user-specific impact data
  const userId = user?.id
  useEffect(() => {
    if (authLoading || !userId) return

    setDataLoading(true)
    setDataError(null)

    Promise.all([
      fetchUserImpact(userId),
      // Platform totals are a side panel — never let them hide the user's own data.
      fetchPlatformStats().catch(() => ({ treesFunded: 0, tCO2eVerified: 0, projectsActive: 0 })),
    ])
      .then(([impact, plat]) => {
        setEntries(impact.entries)
        setStats(impact.stats)
        setPlatStats(plat)
      })
      .catch((err: Error) => setDataError(err.message || 'Failed to load impact data'))
      .finally(() => setDataLoading(false))
  }, [authLoading, userId, reloadKey])

  // One card per funded project, largest first.
  const projectShares = useMemo<ProjectShare[]>(() => {
    const map = new Map<string, ProjectShare>()
    for (const e of entries) {
      const key = e.projectId || e.project
      const cur = map.get(key) ?? {
        projectId: e.projectId, name: e.project, location: e.location, element: e.element || 'earth',
        trees: 0, tCO2e: 0, amount: 0, fundings: 0, verifiedFundings: 0,
      }
      cur.trees    += e.trees || 0
      cur.tCO2e    += e.tCO2e || 0
      cur.amount   += e.amount || 0
      cur.fundings += 1
      if (e.verified) cur.verifiedFundings += 1
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.trees - a.trees)
  }, [entries])

  const displayName   = user?.displayName || user?.email || ''
  const firstName     = displayName.split(' ')[0]
  const hasData       = entries.length > 0
  const recentEntries = entries.slice(0, 5)
  const verifiedCount = entries.filter(e => e.verified).length
  const platformShare = platStats.treesFunded > 0
    ? Math.min(100, (stats.trees / platStats.treesFunded) * 100)
    : 0
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <IndividualLayout
      title="Dashboard"
      subtitle={`My impact · updated ${today}`}
      actions={
        <button type="button" className="db-topbar__report-btn" onClick={() => navigate('/impact/projects')}>
          🌳 Fund trees
        </button>
      }
    >

      {/* ERROR */}
      {dataError && (
        <div className="db-error-banner">
          ⚠ Could not load your data: {dataError} — <button type="button" onClick={() => setReloadKey(k => k + 1)} className="db-link">Retry</button>
        </div>
      )}

      {/* LOADING */}
      {dataLoading && (
        <>
          <div className="db-grid-2">
            {[1, 2].map(i => <div key={i} className="db-card db-skel" style={{ height: 240 }} />)}
          </div>
          <div className="db-grid-3">
            {[1, 2, 3].map(i => <div key={i} className="db-card db-skel" style={{ height: 300 }} />)}
          </div>
        </>
      )}

      {!dataLoading && (
        <>
          {/* Impact + Platform row */}
          <div className="db-grid-2">

            {/* My impact */}
            <div className="db-card db-impact-card">
              <div className="db-impact-card__header">
                <div className="db-impact-card__title">
                  {hasData ? `Your impact, ${firstName}` : `Welcome, ${firstName}`}
                </div>
                <Link to="/my-projects" className="db-link" style={{ fontSize: 12 }}>My projects →</Link>
              </div>
              <div className="db-impact-card__body">
                <div className="db-impact-radar">
                  <RadarChart treesFunded={stats.trees} />
                </div>
                <div className="db-impact-stats">
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num">{stats.trees.toLocaleString('en-IN')}</span>
                      {verifiedCount > 0 && <span className="db-verified-badge">✓ {verifiedCount} verified</span>}
                    </div>
                    <div className="db-impact-stat__label">trees funded · Earth</div>
                  </div>
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num db-impact-stat__num--mono">{stats.tCO2e.toFixed(1)}</span>
                      <span className="db-impact-stat__unit">tCO₂e</span>
                    </div>
                    <div className="db-impact-stat__label">estimated carbon offset</div>
                  </div>
                  <div className="db-impact-stat">
                    <div className="db-impact-stat__row">
                      <span className="db-impact-stat__num">{stats.projects}</span>
                      <span className="ind-stat-divider" />
                      <span className="db-impact-stat__num">{fmtINR(stats.fundsInvested)}</span>
                    </div>
                    <div className="db-impact-stat__label">projects backed · total contributed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform */}
            <div className="db-card db-target-card">
              <div className="db-target-card__header">
                <div className="db-target-card__title">Your share of CARM</div>
              </div>
              <div className="ind-share">
                <div className="ind-share__big">
                  <span className="ind-share__pct">{platformShare < 1 && platformShare > 0 ? '<1' : Math.round(platformShare)}%</span>
                  <span className="ind-share__of">of all trees funded on the platform are yours</span>
                </div>
                <div className="db-progress-track ind-share__track">
                  <div className="db-progress-fill ind-share__fill" style={{ width: `${Math.max(platformShare, hasData ? 2 : 0)}%` }} />
                </div>
                <div className="ind-share__stats">
                  <div>
                    <span className="ind-share__num">{(platStats.treesFunded || 0).toLocaleString('en-IN')}</span>
                    <span className="ind-share__lbl">trees funded</span>
                  </div>
                  <div>
                    <span className="ind-share__num">{(platStats.tCO2eVerified || 0).toLocaleString('en-IN')}</span>
                    <span className="ind-share__lbl">tCO₂e verified</span>
                  </div>
                  <div>
                    <span className="ind-share__num">{platStats.projectsActive || 0}</span>
                    <span className="ind-share__lbl">active projects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Funded projects */}
          <div className="db-portfolio-header">
            <div>
              <h2 className="db-portfolio-title">My funded projects</h2>
              <div className="db-portfolio-sub">Where your trees are growing · evidence arrives as geo-tagged photos</div>
            </div>
            {hasData && <Link to="/my-projects" className="db-link">View all projects →</Link>}
          </div>

          <div className="db-grid-3">
            {projectShares.length > 0 ? projectShares.map(p => {
              const allVerified = p.verifiedFundings === p.fundings
              const someVerified = p.verifiedFundings > 0
              const status   = allVerified ? 'Verified' : someVerified ? 'Partly verified' : 'Awaiting evidence'
              const statusBg = allVerified ? '#185FA5' : someVerified ? '#2B5341' : '#8B3A00'
              const sharePct = stats.trees > 0 ? Math.round((p.trees / stats.trees) * 100) : 0
              return (
                <div
                  key={p.projectId || p.name}
                  className="db-project-card"
                  onClick={() => p.projectId && navigate(`/impact/projects/${p.projectId}`)}
                >
                  <div className="db-project-card__hero-wrap">
                    <ProjectHero statusBg={statusBg} status={status} />
                  </div>
                  <div className="db-project-card__body">
                    <div className="db-project-card__tags">
                      <span className="db-element-badge">{ELEMENT_GLYPH[p.element] || '🌍'} {p.element}</span>
                      {allVerified && <span className="db-verified-badge">✓ Verified</span>}
                    </div>
                    <div className="db-project-card__name">{p.name}</div>
                    <div className="db-project-card__location">{p.location || '—'}</div>
                    <div style={{ margin: '8px 0 4px' }}>
                      <div className="db-progress-track ind-card-track">
                        <div className="db-progress-fill ind-card-fill" style={{ width: `${Math.max(sharePct, 2)}%` }} />
                      </div>
                      <div className="ind-card-labels">
                        <span>{p.trees.toLocaleString('en-IN')} trees</span>
                        <span>{sharePct}% of your trees</span>
                      </div>
                    </div>
                    <div className="db-project-card__footer">
                      <span className="db-project-card__standard">Contributed · {fmtINR(p.amount)}</span>
                      <span className="db-project-card__tco2">{(Math.round(p.tCO2e * 10) / 10)} tCO₂e</span>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="db-portfolio-empty">
                <div className="db-portfolio-empty__title">No projects funded yet</div>
                <div className="db-portfolio-empty__sub">
                  Browse verified projects and fund your first trees — they'll show up here.
                </div>
                <button type="button" className="db-cta-btn" onClick={() => navigate('/impact/projects')}>
                  Browse projects
                </button>
              </div>
            )}
          </div>

          {/* Recent fundings */}
          {hasData && (
            <>
              <div className="db-portfolio-header">
                <div>
                  <h2 className="db-portfolio-title">Recent fundings</h2>
                  <div className="db-portfolio-sub">Each funding is written to the public ledger once its evidence is approved</div>
                </div>
                <Link to="/my-ledger" className="db-link">My ledger →</Link>
              </div>

              <div className="db-card ind-recent">
                {recentEntries.map(entry => (
                  <div key={entry.id} className="ih-entry">
                    <div className="ih-entry__icon"><TreePine size={18} /></div>
                    <div className="ih-entry__left">
                      <span className="ih-entry__project">{entry.project}</span>
                      <div className="ih-entry__meta">
                        <span><TreePine size={12} /> {entry.trees} trees</span>
                        <span><Leaf size={12} /> {entry.tCO2e} tCO₂e</span>
                        <span>{fmtDate(entry.date)}</span>
                      </div>
                    </div>
                    <div className="ih-entry__right">
                      {entry.amount > 0 && <span className="ih-entry__amount">{fmtINR(entry.amount)}</span>}
                      {entry.verified ? (
                        <span className="ih-badge ih-badge--verified"><CheckCircle2 size={11} /> Verified</span>
                      ) : (
                        <span className="ih-badge ih-badge--in-progress"><Clock size={11} /> Awaiting evidence</span>
                      )}
                    </div>
                  </div>
                ))}
                {entries.length > recentEntries.length && (
                  <div className="ih-entries__more">
                    <Link to="/my-projects" className="ih-link">
                      +{entries.length - recentEntries.length} more — view all my projects →
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {!hasData && !dataError && (
            <div className="ind-hint">
              <AlertCircle size={14} /> Every tree you fund is geo-tagged in the field and recorded on the public ledger.
            </div>
          )}
        </>
      )}
    </IndividualLayout>
  )
}

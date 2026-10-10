import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchDashboard, type DashboardData, type DashboardProject } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { FiveElementsIcon } from '../../components/ui/FiveElementsLogo'
import './Dashboard.css'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import ProfileModal from '../../components/ui/ProfileModal'
import { ProjectHero, RadarChart } from '../../components/dashboard/DashboardVisuals'

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

const NAV_ITEMS = [
  { icon: '▤',  label: 'Projects',       to: '/business/portfolio' },
  { icon: '▦',  label: 'Reports',        to: '/business/reports' },
  { icon: '◎',  label: 'Public profile', to: '/business/public-profile' },
  { icon: '◍',  label: 'Team',           to: '/business/team' },
  { icon: '⚙',  label: 'Settings',       to: '/business/settings' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, user, session } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  useModalBehavior(() => setShowLogoutModal(false), showLogoutModal)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treeRecords, setTreeRecords] = useState<TreeRecord[]>([])
  const [treeLoading, setTreeLoading] = useState(true)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const d = await fetchDashboard()
      setData(d)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTreeRecords = useCallback(async () => {
    setTreeLoading(true)
    try {
      // The backend scopes this to the signed-in user.
      const res = await fetch(`${API}/api/dashboard/tree-records`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const json = await res.json()
      setTreeRecords(res.ok ? (json.records ?? []) : [])
    } catch {
      setTreeRecords([])
    }
    setTreeLoading(false)
  }, [session?.access_token])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadTreeRecords() }, [loadTreeRecords])

  const isMobile  = typeof window !== 'undefined' && window.innerWidth <= 768
  const sidebarW  = collapsed ? '64px' : '240px'
  const labelDisp = collapsed ? 'none' : 'block'

  const hasData   = !loading && !error && data != null
  const isEmpty   = hasData && (data!.portfolio.length === 0 && (data!.impact.treesFunded === 0))
  const isData    = hasData && !isEmpty

  const impact    = data?.impact
  const portfolio = data?.portfolio ?? []
  const period    = data?.period    ?? 'FY 2025'
  const updatedAt = data?.updatedAt ?? '—'

  return (
    <div className="db-shell">

      {/* MOBILE OVERLAY */}
      <div
        className={`db-sidebar-overlay${mobileOpen ? ' db-sidebar-overlay--visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* SIDEBAR */}
      <aside
        className={`db-sidebar${mobileOpen ? ' db-sidebar--open' : ''}`}
        style={{ width: sidebarW }}
      >
        <div className="db-sidebar__logo">
          <FiveElementsIcon size={26} />
          <span className="db-sidebar__brand" style={{ display: labelDisp }}>
            five elements <strong>CARM</strong>
          </span>
        </div>

        <nav className="db-sidebar__nav">
          <div className="db-nav db-nav--active">
            <span className="db-nav__icon">▦</span>
            <span className="db-nav__label" style={{ display: labelDisp }}>Dashboard</span>
          </div>
          <div style={{ height: 8 }} />
          {NAV_ITEMS.map(n => (
            <Link key={n.to} to={n.to} className="db-nav">
              <span className="db-nav__icon">{n.icon}</span>
              <span className="db-nav__label" style={{ display: labelDisp }}>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="db-sidebar__user" role="button" tabIndex={0} title="View profile" style={{ cursor: 'pointer' }} onClick={() => setShowProfile(true)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(true) } }}>
          <div className="db-sidebar__avatar">{initials}</div>
          <div className="db-sidebar__user-info" style={{ display: labelDisp }}>
            <div className="db-sidebar__user-name">{user?.displayName || 'User'}</div>
            <div className="db-sidebar__user-org">{user?.email || ''}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="db-nav db-nav--logout"
          title="Sign out"
        >
          <span className="db-nav__icon">⏻</span>
          <span className="db-nav__label" style={{ display: labelDisp }}>Sign out</span>
        </button>

        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

        {/* Logout confirmation modal */}
        {showLogoutModal && (
          <div className="db-modal-overlay" onClick={() => setShowLogoutModal(false)}>
            <div className="db-modal" onClick={e => e.stopPropagation()}>
              <div className="db-modal__icon">⏻</div>
              <h3 className="db-modal__title">Sign out?</h3>
              <p className="db-modal__sub">You will be redirected to the login page.</p>
              <div className="db-modal__actions">
                <button type="button" className="db-modal__cancel" onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button type="button" className="db-modal__confirm" onClick={handleLogout}>Sign out</button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <div className="db-main">

        <header className="db-topbar">
          <button
            type="button"
            className="db-topbar__toggle"
            onClick={() => {
              if (window.innerWidth <= 768) {
                setMobileOpen(o => !o)
              } else {
                setCollapsed(c => !c)
              }
            }}
            aria-label="Toggle sidebar"
          >☰</button>
          <div className="db-topbar__title-wrap">
            <h1 className="db-topbar__title">Dashboard</h1>
            <div className="db-topbar__sub">Board brief · updated {updatedAt}</div>
          </div>
          <div className="db-topbar__period">
            <button type="button" className="db-topbar__period-btn">
              <span style={{ color: '#185FA5' }}>◷</span>
              <span>{period}</span>
              <span style={{ color: '#6B7B6E' }}>▾</span>
            </button>
          </div>
          <button
            type="button"
            className="db-topbar__report-btn"
            onClick={() => navigate('/business/reports')}
          >Generate report</button>
        </header>

        <main className="db-content">

          {/* LOADING */}
          {loading && (
            <div className="db-grid-2">
              {[1, 2].map(i => (
                <div key={i} className="db-card db-skel" style={{ height: 240 }} />
              ))}
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="db-error-banner">
              ⚠ {error} — <button onClick={load} className="db-link">Retry</button>
            </div>
          )}

          {/* EMPTY */}
          {isEmpty && (
            <div style={{ maxWidth: 640, margin: '16px auto 0' }}>
              <div className="db-welcome-badge">Welcome to CARM</div>
              <h2 className="db-onboard-title">Let's build your first board brief.</h2>
              <p className="db-onboard-sub">
                Three steps to a dashboard you can defend to an auditor.
                Every number you enter stays traceable to its source record.
              </p>
              <div className="db-onboard-steps">
                {[
                  {
                    n: 1,
                    title: 'Add your organisation profile',
                    sub: 'Legal entity, employee count, reporting boundary and fiscal year.',
                    to: '/business/settings',
                    cta: 'Start →',
                    active: true,
                  },
                  {
                    n: 2,
                    title: 'Browse & fund a project',
                    sub: 'Pick a verified carbon project from the marketplace to start your portfolio.',
                    to: '/business/portfolio',
                    cta: 'Locked',
                    active: false,
                  },
                  {
                    n: 3,
                    title: 'Set a reduction target',
                    sub: 'Pick a baseline year and a science-based target to track against.',
                    to: '/business/targets',
                    cta: 'Locked',
                    active: false,
                  },
                ].map(step => (
                  <div
                    key={step.n}
                    className={`db-onboard-step${step.active ? '' : ' db-onboard-step--locked'}`}
                    onClick={() => step.active && navigate(step.to)}
                  >
                    <div className={`db-onboard-step__num${step.active ? ' db-onboard-step__num--active' : ''}`}>
                      {step.n}
                    </div>
                    <div className="db-onboard-step__body">
                      <div className="db-onboard-step__title">{step.title}</div>
                      <div className="db-onboard-step__sub">{step.sub}</div>
                    </div>
                    <span className={`db-onboard-step__cta${step.active ? ' db-onboard-step__cta--active' : ''}`}>
                      {step.cta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POPULATED */}
          {isData && (
            <>
              {/* Impact + Target row */}
              <div className="db-grid-2">

                {/* Verified impact */}
                <div className="db-card db-impact-card">
                  <div className="db-impact-card__header">
                    <div className="db-impact-card__title">Verified impact</div>
                    <Link to="/business/emissions" className="db-link" style={{ fontSize: 12 }}>Emissions hub →</Link>
                  </div>
                  <div className="db-impact-card__body">
                    <div className="db-impact-radar">
                      <RadarChart treesFunded={impact?.treesFunded ?? 0} />
                    </div>
                    <div className="db-impact-stats">
                      <div className="db-impact-stat">
                        <div className="db-impact-stat__row">
                          <span className="db-impact-stat__num">
                            {(impact?.treesFunded ?? 0).toLocaleString()}
                          </span>
                          <span className="db-verified-badge">✓ Verified</span>
                        </div>
                        <div className="db-impact-stat__label">trees funded · Earth</div>
                      </div>
                      <div className="db-impact-stat">
                        <div className="db-impact-stat__row">
                          <span className="db-impact-stat__num db-impact-stat__num--mono">
                            {(impact?.tco2eVerified ?? 0).toFixed(1)}
                          </span>
                          <span className="db-impact-stat__unit">tCO₂e</span>
                          <span className="db-verified-badge">✓ Verified</span>
                        </div>
                        <div className="db-impact-stat__label">offset · ledger-confirmed</div>
                      </div>
                      <div className="db-impact-stat">
                        <div className="db-impact-stat__row">
                          <span className="db-impact-stat__num">{impact?.projectsFunded ?? 0}</span>
                        </div>
                        <div className="db-impact-stat__label">projects funded</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Science-based target */}
                <div className="db-card db-target-card">
                  <div className="db-target-card__header">
                    <div className="db-target-card__title">Science-based target</div>
                  </div>
                  <div className="db-target-empty">
                    <div className="db-target-empty__title">No target set</div>
                    <div className="db-target-empty__sub">
                      Set a reduction target to track progress against your baseline year.
                    </div>
                    <button
                      type="button"
                      className="db-cta-btn"
                      onClick={() => navigate('/business/targets')}
                    >Set a target</button>
                  </div>
                </div>
              </div>

              {/* Portfolio */}
              <div className="db-portfolio-header">
                <div>
                  <h2 className="db-portfolio-title">Funded portfolio</h2>
                  <div className="db-portfolio-sub">All five elements · Earth active, four coming soon</div>
                </div>
                <Link to="/business/portfolio" className="db-link">View all projects →</Link>
              </div>

              <div className="db-grid-3">
                {portfolio.length > 0
                  ? portfolio.map((p: DashboardProject) => (
                    <div
                      key={p.id}
                      className="db-project-card"
                      onClick={() => navigate(`/projects/${p.slug}`)}
                    >
                      <div className="db-project-card__hero-wrap">
                        <ProjectHero statusBg={p.statusBg} status={p.status} />
                      </div>
                      <div className="db-project-card__body">
                        <div className="db-project-card__tags">
                          <span className="db-element-badge">{p.elGlyph} {p.element}</span>
                          {p.verified && <span className="db-verified-badge">✓ Verified</span>}
                        </div>
                        <div className="db-project-card__name">{p.name}</div>
                        <div className="db-project-card__location">{p.location}</div>
                        {/* Progress bar */}
                        <div style={{ margin: '8px 0 4px' }}>
                          <div style={{ height: 4, background: '#EAE3DA', borderRadius: 9999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(p.progressPct, 100)}%`, background: '#2B5341', borderRadius: 9999, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9AA79C', marginTop: 3 }}>
                            <span>{p.fundedTrees.toLocaleString()} funded</span>
                            <span>{p.progressPct}%</span>
                          </div>
                        </div>
                        <div className="db-project-card__footer">
                          <span className="db-project-card__standard">Standard · {p.standard}</span>
                          <span className="db-project-card__tco2">{p.tco2} tCO₂e</span>
                        </div>
                      </div>
                    </div>
                  ))
                  : (
                    <div className="db-portfolio-empty">
                      <div className="db-portfolio-empty__title">No projects funded yet</div>
                      <div className="db-portfolio-empty__sub">
                        Browse the marketplace to fund your first project.
                      </div>
                      <button
                        type="button"
                        className="db-cta-btn"
                        onClick={() => navigate('/business/portfolio')}
                      >Browse projects</button>
                    </div>
                  )
                }
              </div>
            {/* ── Field Captures: Sundarbans Tree Belt ── */}
            <div style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 className="db-portfolio-title">🌿 Field Captures — All Projects</h2>
                  <div className="db-portfolio-sub">Live tree records submitted by field users via TreeApp</div>
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
                    Field users can submit tree records via the TreeApp mobile app.<br />
                    Records tagged to <strong>Sundarbans Tree Belt</strong> will appear here.
                  </div>
                </div>
              )}

              {!treeLoading && treeRecords.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {treeRecords.map(rec => {
                    const healthColor = rec.health_status === 'healthy' ? '#22c55e' : rec.health_status === 'sick' ? '#f59e0b' : rec.health_status === 'dead' ? '#ef4444' : '#9AA79C'
                    const healthEmoji = rec.health_status === 'healthy' ? '✅' : rec.health_status === 'sick' ? '⚠️' : rec.health_status === 'dead' ? '❌' : '❓'
                    const date = new Date(rec.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
                          {rec.project_id && (
                            <div style={{ fontSize: 11, color: '#2B5341', background: '#e8f5e9', borderRadius: 8, padding: '2px 8px', display: 'inline-block', fontWeight: 600 }}>
                              🌍 {rec.project_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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
        </main>
      </div>
    </div>
  )
}
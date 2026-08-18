import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchDashboard, type DashboardData, type DashboardProject } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import './Dashboard.css'

const NAV_ITEMS = [
  { icon: '▤',  label: 'Projects',       to: '/business/portfolio' },
  { icon: '▦',  label: 'Reports',        to: '/business/reports' },
  { icon: '◎',  label: 'Public profile', to: '/business/public-profile' },
  { icon: '◍',  label: 'Team',           to: '/business/team' },
  { icon: '⚙',  label: 'Settings',       to: '/business/settings' },
]

function penta(cx: number, cy: number, r: number, rot = -Math.PI / 2) {
  const pts: [number, number][] = []
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}
function str(pts: [number, number][]) {
  return pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

// Pentagon hero thumbnail for project cards
function ProjectHero({ heroBg, statusBg, status }: { heroBg: string; statusBg: string; status: string }) {
  const cx = 200, cy = 96, R = 82
  const outer = str(penta(cx, cy, R))
  const inner = str(penta(cx, cy, R - 8))
  const svg = `<svg width="100%" viewBox="0 0 400 192" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="phGrad${cx}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#1a3330"/>
        <stop offset="100%" stop-color="#2B5341"/>
      </linearGradient>
      <clipPath id="phClip${cx}"><polygon points="${inner}"/></clipPath>
    </defs>
    <rect x="0" y="0" width="400" height="192" fill="#1a3330"/>
    <g clip-path="url(#phClip${cx})">
      <rect x="0" y="0" width="400" height="192" fill="url(#phGrad${cx})"/>
    </g>
    <polygon points="${outer}" fill="none" stroke="rgba(170,203,167,0.25)" stroke-width="2" stroke-linejoin="round"/>
  </svg>`
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
      <span
        className="db-project-card__status-badge"
        style={{ background: statusBg, position: 'absolute', top: 12, right: 12 }}
      >{status}</span>
    </div>
  )
}

function RadarChart({ treesFunded }: { treesFunded: number }) {
  const S = 160, cx = 80, cy = 78, R = 54
  const order: [string, string, number][] = [
    ['Earth', '#2B5341', treesFunded > 0 ? 0.85 : 0],
    ['Water', '#185FA5', 0],
    ['Fire',  '#F09125', 0],
    ['Air',   '#534AB7', 0],
    ['Ether', '#112121', 0],
  ]
  let g = ''
  ;[0.25, 0.5, 0.75, 1].forEach(f => {
    g += `<polygon points="${str(penta(cx, cy, R * f))}" fill="none" stroke="rgba(43,83,65,0.13)" stroke-width="0.75" stroke-linejoin="round"/>`
  })
  const tips = penta(cx, cy, R)
  tips.forEach(p => {
    g += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="rgba(43,83,65,0.13)" stroke-width="0.75"/>`
  })
  tips.forEach((p, i) => {
    const el = order[i]
    const active = el[2] > 0
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const lx = cx + (R + 13) * Math.cos(a)
    const ly = cy + (R + 13) * Math.sin(a)
    g += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="${active ? '700' : '400'}" font-size="8.5" fill="${active ? '#2B5341' : '#9AA79C'}" opacity="${active ? '1' : '0.5'}">${el[0]}</text>`
  })
  const dp = order.map((el, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const f = Math.max(el[2], 0.02)
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)] as [number, number]
  })
  g += `<polygon points="${str(dp)}" fill="#2B5341" fill-opacity="0.30" stroke="#2B5341" stroke-width="1.75" stroke-linejoin="round"/>`
  const et = dp[0]
  g += `<circle cx="${et[0].toFixed(1)}" cy="${et[1].toFixed(1)}" r="4" fill="#F09125"/><circle cx="${et[0].toFixed(1)}" cy="${et[1].toFixed(1)}" r="4" fill="none" stroke="#fff" stroke-width="1.4"/>`
  return (
    <div
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" viewBox="0 0 ${S} ${S}" preserveAspectRatio="xMidYMid meet">${g}</svg>` }}
    />
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => { load() }, [load])

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
          <svg width="26" height="27" viewBox="0 0 40 42" aria-hidden="true">
            <polygon points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75" fill="none" stroke="#2B5341" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M20 12 L22.3 18.6 L29.2 18.6 L23.6 22.7 L25.9 29.3 L20 25.2 L14.1 29.3 L16.4 22.7 L10.8 18.6 L17.7 18.6 Z" fill="none" stroke="#F09125" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
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

        <div className="db-sidebar__user">
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
                        <ProjectHero heroBg={p.heroBg} statusBg={p.statusBg} status={p.status} />
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
            </>
          )}
        </main>
      </div>
    </div>
  )
}
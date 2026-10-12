import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, AlignJustify, BookOpen, BarChart2, Award, LogOut,
} from 'lucide-react'
import NotificationBell from '../../components/ui/NotificationBell'
import { FiveElementsIcon } from '../../components/ui/FiveElementsLogo'
import { useAuth } from '../../contexts/AuthContext'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import ProfileModal from '../../components/ui/ProfileModal'
import '../Business/Dashboard.css'
import './IndividualLayout.css'

// `soon` items have no page yet — shown disabled instead of linking to a
// route that doesn't exist (which fell through to the marketing Landing page).
// Everything an Individual needs lives inside this panel — no item links out
// to the public website. `also` lists extra paths that light up the item.
const NAV_ITEMS: { icon: typeof LayoutGrid; label: string; to: string; soon?: boolean; also?: string[] }[] = [
  { icon: LayoutGrid,   label: 'Dashboard',       to: '/impact', also: ['/impact/projects', '/fund', '/confirmation'] },
  { icon: AlignJustify, label: 'My Projects',     to: '/my-projects',     also: ['/certificate'] },
  { icon: BookOpen,     label: 'My Ledger',       to: '/my-ledger' },
  { icon: BarChart2,    label: 'Reports',         to: '/my-reports' },
  { icon: Award,        label: 'Certificates',    to: '/certificates', soon: true },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface IndividualLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  /** Extra buttons on the right of the top bar (before the bell) */
  actions?: React.ReactNode
}

/**
 * Shared shell (sidebar + topbar) for all individual-role pages.
 * Same look as the Business console (BusinessLayout) so both dashboards
 * feel like one product.
 */
export default function IndividualLayout({ children, title, subtitle, actions }: IndividualLayoutProps) {
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  useModalBehavior(() => setShowLogoutModal(false), showLogoutModal)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const sidebarW  = collapsed ? '64px' : '240px'
  const labelDisp = isMobile || !collapsed ? 'block' : 'none'

  const displayName = user?.displayName || user?.email || 'User'
  const initials    = getInitials(displayName) || 'U'

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function handleToggle() {
    if (isMobile) setMobileOpen(o => !o)
    else setCollapsed(c => !c)
  }

  return (
    <div className="db-shell">

      {/* Mobile overlay backdrop */}
      {isMobile && (
        <div
          className={`db-sidebar-overlay${mobileOpen ? ' db-sidebar-overlay--visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`db-sidebar${isMobile && mobileOpen ? ' db-sidebar--open' : ''}`}
        style={isMobile ? undefined : { width: sidebarW }}
      >
        <div className="db-sidebar__logo">
          <FiveElementsIcon size={26} />
          <span className="db-sidebar__brand" style={{ display: labelDisp }}>
            five elements <strong>CARM</strong>
          </span>
        </div>

        <nav className="db-sidebar__nav">
          {NAV_ITEMS.map(({ icon: Icon, label, to, soon, also }) => {
            if (soon) {
              return (
                <span key={to} className="db-nav ind-nav--soon" aria-disabled="true" title={`${label} — coming soon`}>
                  <span className="db-nav__icon"><Icon size={16} /></span>
                  <span className="db-nav__label" style={{ display: labelDisp }}>{label}</span>
                  {labelDisp === 'block' && <span className="ind-nav__soon">Soon</span>}
                </span>
              )
            }
            // '/impact' must match exactly — every panel path starts with it
            const isActive = (to === '/impact' ? location.pathname === to : location.pathname.startsWith(to))
              || (also ?? []).some(p => location.pathname.startsWith(p))
            return (
              <Link
                key={to}
                to={to}
                className={`db-nav${isActive ? ' db-nav--active' : ''}`}
                title={label}
              >
                <span className="db-nav__icon"><Icon size={16} /></span>
                <span className="db-nav__label" style={{ display: labelDisp }}>{label}</span>
              </Link>
            )
          })}
        </nav>

        <div
          className="db-sidebar__user"
          role="button"
          tabIndex={0}
          title="View profile"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowProfile(true)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(true) } }}
        >
          <div className="db-sidebar__avatar">{initials}</div>
          <div className="db-sidebar__user-info" style={{ display: labelDisp }}>
            <div className="db-sidebar__user-name">{displayName}</div>
            <div className="db-sidebar__user-org">{user?.email || ''}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          className="db-nav db-nav--logout"
          title="Sign out"
        >
          <span className="db-nav__icon"><LogOut size={15} /></span>
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
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >☰</button>
          <div className="db-topbar__title-wrap">
            <h1 className="db-topbar__title">{title}</h1>
            {subtitle && <div className="db-topbar__sub">{subtitle}</div>}
          </div>
          <div className="db-topbar__actions">
            {actions}
            <NotificationBell />
          </div>
        </header>

        <main className="db-content">
          {children}
        </main>
      </div>
    </div>
  )
}

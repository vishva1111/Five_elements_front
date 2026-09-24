import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationBell from '../../components/ui/NotificationBell'
import { useAuth } from '../../contexts/AuthContext'
import { FiveElementsIcon } from '../../components/ui/FiveElementsLogo'
import '../Business/Dashboard.css'

const NAV_ITEMS = [
  { icon: '⬡',  label: 'Dashboard',     to: '/partner/dashboard' },
  { icon: '🌱', label: 'Projects',      to: '/partner/projects' },
  { icon: '🧑‍🤝‍🧑', label: 'Users',         to: '/partner/users' },
  { icon: '🌳', label: 'My trees',      to: '/partner/trees' },
  { icon: '📁', label: 'Evidence vault',to: '/partner/evidence' },
  { icon: '📋', label: 'Submissions',   to: '/partner/submissions' },
  { icon: '🔗', label: 'Linked to me',  to: '/partner/linked-submissions' },
  { icon: '✅', label: 'Tasks',         to: '/partner/tasks' },
  { icon: '💰', label: 'Funders',       to: '/partner/funders' },
  { icon: '👥', label: 'Team',          to: '/partner/team' },
  { icon: '⚙',  label: 'Settings',      to: '/partner/settings' },
]

interface PartnerLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function PartnerLayout({ children, title, subtitle }: PartnerLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  const sidebarW  = collapsed ? '64px' : '240px'
  const labelDisp = collapsed ? 'none' : 'block'

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'PA'

  return (
    <div className="db-shell">

      {/* SIDEBAR */}
      <aside className="db-sidebar" style={{ width: sidebarW }}>
        <div className="db-sidebar__logo">
          <FiveElementsIcon size={26} />
          <span className="db-sidebar__brand" style={{ display: labelDisp }}>
            five elements <strong>CARM</strong>
          </span>
        </div>

        <nav className="db-sidebar__nav">
          {NAV_ITEMS.map(n => {
            const isActive = n.to === '/partner/dashboard'
              ? location.pathname === '/partner/dashboard' || location.pathname === '/partner'
              : location.pathname.startsWith(n.to)
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`db-nav${isActive ? ' db-nav--active' : ''}`}
              >
                <span className="db-nav__icon">{n.icon}</span>
                <span className="db-nav__label" style={{ display: labelDisp }}>{n.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="db-sidebar__user">
          <div className="db-sidebar__avatar">{initials}</div>
          <div className="db-sidebar__user-info" style={{ display: labelDisp }}>
            <div className="db-sidebar__user-name">{user?.displayName || 'Partner'}</div>
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
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >☰</button>
          <div className="db-topbar__title-wrap">
            <h1 className="db-topbar__title">{title}</h1>
            {subtitle && <div className="db-topbar__sub">{subtitle}</div>}
          </div>
          <div className="db-topbar__actions">
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
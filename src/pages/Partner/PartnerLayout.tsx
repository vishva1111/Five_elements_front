import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../components/ui/NotificationBell'
import './Partner.css'

// ── Nav items ─────────────────────────────────────────────────────────────────
const NAV = [
  { path: '/partner/dashboard',    icon: '⬡', label: 'Dashboard' },
  { path: '/partner/projects',     icon: '🌱', label: 'Projects' },
  { path: '/partner/evidence',     icon: '📁', label: 'Evidence vault' },
  { path: '/partner/submissions',  icon: '📋', label: 'Submissions' },
  { path: '/partner/funders',      icon: '💰', label: 'Funders' },
  { path: '/partner/team',         icon: '👥', label: 'Team' },
  { path: '/partner/settings',     icon: '⚙️', label: 'Settings' },
]

interface PartnerLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function PartnerLayout({ children, title }: PartnerLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={`pl-shell ${collapsed ? 'pl-shell--collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="pl-sidebar">
        {/* Brand */}
        <div className="pl-sidebar__brand">
          <svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true">
            <polygon points="15,2 27.5,10.5 22.9,24.5 7.1,24.5 2.5,10.5" fill="#2B5341" />
            <polygon points="15,7 22.5,12.5 19.7,21 10.3,21 7.5,12.5" fill="#AACBA7" />
          </svg>
          {!collapsed && <span className="pl-sidebar__brand-name">Five Elements</span>}
        </div>

        {/* Zone label */}
        {!collapsed && (
          <div className="pl-sidebar__zone">Partner zone</div>
        )}

        {/* Nav */}
        <nav className="pl-sidebar__nav">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `pl-nav-item ${isActive ? 'pl-nav-item--active' : ''}`
              }
            >
              <span className="pl-nav-item__icon">{item.icon}</span>
              {!collapsed && <span className="pl-nav-item__label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + sign out */}
        <div className="pl-sidebar__bottom">
          {!collapsed && (
            <div className="pl-sidebar__user">
              <div className="pl-sidebar__avatar">
                {(user?.displayName || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="pl-sidebar__user-info">
                <div className="pl-sidebar__user-name">{user?.displayName || 'Partner'}</div>
                <div className="pl-sidebar__user-role">Partner admin</div>
              </div>
            </div>
          )}
          <button
            type="button"
            className="pl-sidebar__signout"
            onClick={handleSignOut}
            title="Sign out"
          >
            ↩
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          type="button"
          className="pl-sidebar__toggle"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </aside>

      {/* Main content */}
      <main className="pl-main">
        <div className="pl-page-header">
          {title && <h1 className="pl-page-title">{title}</h1>}
          <div className="pl-page-header__actions">
            <NotificationBell />
          </div>
        </div>
        <div className="pl-content">
          {children}
        </div>
      </main>
    </div>
  )
}
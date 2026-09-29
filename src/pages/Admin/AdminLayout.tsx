import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../components/ui/NotificationBell'
import { FiveElementsIcon } from '../../components/ui/FiveElementsLogo'
import './Admin.css'

interface NavItem {
  icon:   string
  label:  string
  path:   string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { icon: '📋', label: 'Approval queue',     path: '/admin' },
  { icon: '🔍', label: 'Evidence review',    path: '/admin/evidence' },
  { icon: '🤝', label: 'Partner management', path: '/admin/partners' },
  { icon: '👥', label: 'Users & tenants',    path: '/admin/users' },
  { icon: '🌿', label: 'Projects oversight', path: '/admin/projects' },
  { icon: '✅', label: 'Task management',    path: '/admin/tasks' },
  { icon: '🛡️', label: 'Data quality',       path: '/admin/data-quality' },
  { icon: '📒', label: 'Ledger admin',       path: '/admin/ledger' },
  { icon: '💳', label: 'Finance console',    path: '/admin/finance' },
  { icon: '📡', label: 'Platform health',    path: '/admin/health' },
  { icon: '⚙️', label: 'Configuration',      path: '/admin/config' },
  { icon: '🌳', label: 'Tree Records',        path: '/admin/tree-records' },
]

interface Props {
  title:    string
  subtitle?: string
  children: React.ReactNode
  pendingCounts?: Record<string, number>
}

export default function AdminLayout({ title, subtitle, children, pendingCounts = {} }: Props) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

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

  const email    = user?.email || 'admin'
  const initials = email.slice(0, 2).toUpperCase()

  function isActive(path: string) {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  function handleToggle() {
    if (isMobile) setMobileOpen(o => !o)
    else setCollapsed(v => !v)
  }

  const showLabels = isMobile ? true : !collapsed

  return (
    <div className="ad-shell">

      {/* Mobile overlay backdrop */}
      {isMobile && (
        <div
          className={`db-sidebar-overlay${mobileOpen ? ' db-sidebar-overlay--visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`ad-sidebar${!isMobile && collapsed ? ' ad-sidebar--collapsed' : ''}${isMobile && mobileOpen ? ' ad-sidebar--mobile-open' : ''}`}>
        <div className="ad-sidebar__brand">
          <div className="ad-sidebar__logo">
            <FiveElementsIcon size={28} />
          </div>
          {showLabels && (
            <div>
              <div className="ad-sidebar__name">Five Elements</div>
              <div className="ad-sidebar__zone">Super Admin</div>
            </div>
          )}
        </div>

        <nav className="ad-nav">
          {NAV_ITEMS.map(item => {
            const badge = pendingCounts[item.path] || 0
            return (
              <button
                key={item.path}
                type="button"
                className={`ad-nav__item${isActive(item.path) ? ' ad-nav__item--active' : ''}`}
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false) }}
                title={!showLabels ? item.label : undefined}
              >
                <span className="ad-nav__icon">{item.icon}</span>
                {showLabels && <span className="ad-nav__label">{item.label}</span>}
                {showLabels && badge > 0 && (
                  <span className="ad-nav__badge">{badge > 99 ? '99+' : badge}</span>
                )}
              </button>
            )
          })}
        </nav>

        {!isMobile && (
          <button type="button" className="ad-collapse-btn" onClick={() => setCollapsed(v => !v)}>
            {collapsed ? '→' : '←'}
          </button>
        )}

        <div className="ad-sidebar__footer">
          <div className="ad-sidebar__avatar">{initials}</div>
          {showLabels && (
            <div className="ad-sidebar__user">
              <div className="ad-sidebar__uname">{email}</div>
              <div className="ad-sidebar__urole">Super Admin</div>
            </div>
          )}
          <button type="button" className="ad-sidebar__signout" title="Sign out" onClick={() => { signOut(); navigate('/login') }}>
            ↩
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ad-main">
        <div className="ad-topbar">
          <button
            type="button"
            className="ad-topbar__hamburger"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >☰</button>
          <div>
            <span className="ad-topbar__title">{title}</span>
            {subtitle && <span className="ad-topbar__sub">— {subtitle}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            <NotificationBell />
          </div>
        </div>
        <div className="ad-content">{children}</div>
      </main>
    </div>
  )
}
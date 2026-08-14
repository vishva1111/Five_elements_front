import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import NotificationBell from '../../components/ui/NotificationBell'
import './Dashboard.css'

const NAV_ITEMS = [
  { icon: '▦',  label: 'Dashboard',      to: '/business' },
  { icon: '▤',  label: 'Projects',       to: '/business/portfolio' },
  { icon: '📊', label: 'Reports',        to: '/business/reports' },
  { icon: '◎',  label: 'Public profile', to: '/business/public-profile' },
  { icon: '◍',  label: 'Team',           to: '/business/team' },
  { icon: '⚙',  label: 'Settings',       to: '/business/settings' },
]

interface BusinessLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function BusinessLayout({ children, title, subtitle }: BusinessLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const sidebarW  = collapsed ? '64px' : '240px'
  const labelDisp = collapsed ? 'none' : 'block'

  return (
    <div className="db-shell">

      {/* SIDEBAR */}
      <aside className="db-sidebar" style={{ width: sidebarW }}>
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
          {NAV_ITEMS.map(n => {
            const isActive = n.to === '/business'
              ? location.pathname === '/business'
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
          <div className="db-sidebar__avatar">SC</div>
          <div className="db-sidebar__user-info" style={{ display: labelDisp }}>
            <div className="db-sidebar__user-name">Sarah Chen</div>
            <div className="db-sidebar__user-org">Meridian Manufacturing</div>
          </div>
        </div>
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
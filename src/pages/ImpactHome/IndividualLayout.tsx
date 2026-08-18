import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, AlignJustify, BookOpen, BarChart2, Award, CircleUser,
  Bell, LogOut, Menu, X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './ImpactHome.css'

const NAV_ITEMS = [
  { icon: LayoutGrid,    label: 'Dashboard',     href: '/impact' },
  { icon: AlignJustify,  label: 'My Projects',   href: '/my-projects' },
  { icon: BookOpen,      label: 'Ledger',        href: '/ledger' },
  { icon: BarChart2,     label: 'Reports',       href: '/reports' },
  { icon: Award,         label: 'Certificates',  href: '/certificates' },
  { icon: CircleUser,    label: 'Public profile',href: '/profile' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface IndividualLayoutProps {
  children: React.ReactNode
  title: string
  topLabel?: string
}

/**
 * Shared shell (sidebar + topbar) for all individual-role pages
 * (Dashboard, My Projects, Ledger, Reports, Certificates, Public profile).
 * Keeps the sidebar persistent so navigating between these pages never
 * drops back to the public marketing layout / opens a new tab.
 */
export default function IndividualLayout({ children, title, topLabel = 'MY IMPACT' }: IndividualLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const displayName = user?.displayName || user?.email || 'User'
  const initials    = getInitials(displayName)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="ih-shell">

      {/* ── Sidebar ── */}
      <aside className={`ih-sidebar ${sidebarOpen ? 'ih-sidebar--open' : ''}`}>
        {/* Brand */}
        <div className="ih-sidebar__brand">
          <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
            <polygon points="20,3 37,13.5 31,34 9,34 3,13.5" fill="none" stroke="#F09125" strokeWidth="1.8"/>
            <text x="20" y="25" textAnchor="middle" fontSize="14" fill="#F09125">★</text>
          </svg>
          <span className="ih-sidebar__brand-text">five elements <strong>CARM</strong></span>
        </div>

        {/* User pill */}
        <div className="ih-sidebar__user">
          <div className="ih-sidebar__avatar">{initials}</div>
          <div className="ih-sidebar__user-info">
            <span className="ih-sidebar__user-name">{displayName}</span>
            <span className="ih-sidebar__user-role">Individual</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="ih-sidebar__nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = href === '/impact'
              ? location.pathname === '/impact'
              : location.pathname.startsWith(href)
            return (
              <Link
                key={label}
                to={href}
                className={`ih-sidebar__nav-item ${active ? 'ih-sidebar__nav-item--active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom — user card + sign out */}
        <div className="ih-sidebar__bottom">
          <div className="ih-sidebar__user-card">
            <div className="ih-sidebar__avatar">{initials}</div>
            <div className="ih-sidebar__user-info">
              <span className="ih-sidebar__user-name">{displayName}</span>
              <span className="ih-sidebar__user-email">{user?.email}</span>
            </div>
          </div>
          <button className="ih-sidebar__signout" onClick={handleSignOut}>
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="ih-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ── */}
      <main className="ih-main">

        {/* Top bar */}
        <header className="ih-topbar">
          <button className="ih-topbar__menu" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="ih-topbar__title">
            <span className="ih-topbar__label">{topLabel}</span>
            <h1 className="ih-topbar__name">{title}</h1>
          </div>
          <div className="ih-topbar__actions">
            <button className="ih-topbar__bell">
              <Bell size={20} />
            </button>
            <div className="ih-topbar__avatar">{initials}</div>
          </div>
        </header>

        <div className="ih-content">
          {children}
        </div>
      </main>
    </div>
  )
}

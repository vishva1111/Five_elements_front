import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import NotificationBell from '../../components/ui/NotificationBell'
import { FiveElementsIcon } from '../../components/ui/FiveElementsLogo'
import './Admin.css'
import ProfileModal from '../../components/ui/ProfileModal'
import { API_URL } from '../../config/api'
import {
  ClipboardCheck, Inbox, FileSearch, Handshake, Users, Sprout, ListChecks,
  ShieldCheck, BookOpen, CreditCard, Activity, Settings, TreePine,
  LogOut, Menu, type LucideIcon,
} from 'lucide-react'
import { useModalBehavior } from '../../hooks/useModalBehavior'

interface NavItem {
  icon:   LucideIcon
  label:  string
  path:   string
}

const NAV_ITEMS: NavItem[] = [
  { icon: ClipboardCheck, label: 'Approval queue',     path: '/admin' },
  { icon: Inbox,          label: 'Submissions',        path: '/admin/submissions' },
  { icon: FileSearch,     label: 'Evidence review',    path: '/admin/evidence' },
  { icon: Handshake,      label: 'Partner management', path: '/admin/partners' },
  { icon: Users,          label: 'Users & tenants',    path: '/admin/users' },
  { icon: Sprout,         label: 'Projects oversight', path: '/admin/projects' },
  { icon: ListChecks,     label: 'Submission review',  path: '/admin/tasks' },
  { icon: ShieldCheck,    label: 'Data quality',       path: '/admin/data-quality' },
  { icon: BookOpen,       label: 'Ledger admin',       path: '/admin/ledger' },
  { icon: CreditCard,     label: 'Finance console',    path: '/admin/finance' },
  { icon: Activity,       label: 'Platform health',    path: '/admin/health' },
  { icon: Settings,       label: 'Configuration',      path: '/admin/config' },
  { icon: TreePine,       label: 'Tree records',       path: '/admin/tree-records' },
]

// Last known queue size, kept across page changes so the sidebar badge
// doesn't blink out while each page refetches it.
let cachedQueueCount = 0

interface Props {
  title:    string
  subtitle?: string
  children: React.ReactNode
  pendingCounts?: Record<string, number>
}

export default function AdminLayout({ title, subtitle, children, pendingCounts = {} }: Props) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, session, signOut } = useAuth()
  const [collapsed, setCollapsed]   = useState(false)
  const [queueCount, setQueueCount] = useState(cachedQueueCount)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut]   = useState(false)

  useModalBehavior(() => { if (!signingOut) setConfirmSignOut(false) }, confirmSignOut)

  async function handleSignOut() {
    setSigningOut(true)
    try { await signOut() } finally {
      setSigningOut(false)
      setConfirmSignOut(false)
      navigate('/login')
    }
  }

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Approval-queue badge on every admin page, not just the queue itself.
  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_URL}/api/admin/queue/count`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.total === 'number') { cachedQueueCount = d.total; setQueueCount(d.total) } })
      .catch(() => {})
  }, [session?.access_token, location.pathname])

  const badges: Record<string, number> = { '/admin': queueCount, ...pendingCounts }

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const email    = user?.email || 'admin'
  const initials = email.slice(0, 2).toUpperCase()

  function isActive(path: string) {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
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
            const badge = badges[item.path] || 0
            const Icon  = item.icon
            return (
              <button
                key={item.path}
                type="button"
                className={`ad-nav__item${isActive(item.path) ? ' ad-nav__item--active' : ''}`}
                onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false) }}
                title={!showLabels ? item.label : undefined}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className="ad-nav__icon"><Icon size={18} strokeWidth={1.9} /></span>
                {showLabels && <span className="ad-nav__label">{item.label}</span>}
                {badge > 0 && (
                  <span className={`ad-nav__badge${showLabels ? '' : ' ad-nav__badge--dot'}`}>{showLabels ? (badge > 99 ? '99+' : badge) : ''}</span>
                )}
              </button>
            )
          })}
        </nav>

        <div className={`ad-sidebar__footer${showLabels ? '' : ' ad-sidebar__footer--stacked'}`}>
          <div
            role="button" tabIndex={0} title="View profile"
            style={{ display: 'flex', alignItems: 'center', gap: 'inherit', flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => setShowProfile(true)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(true) } }}
          >
            <div className="ad-sidebar__avatar">{initials}</div>
            {showLabels && (
              <div className="ad-sidebar__user">
                <div className="ad-sidebar__uname">{email}</div>
                <div className="ad-sidebar__urole">Super Admin</div>
              </div>
            )}
          </div>
        </div>
        <div className="ad-sidebar__signout-wrap">
          <button
            type="button"
            className="ad-sidebar__signout"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => setConfirmSignOut(true)}
          >
            <LogOut size={17} />
            {showLabels && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Sign-out confirmation */}
      {confirmSignOut && (
        <div className="ad-modal-overlay" onClick={() => { if (!signingOut) setConfirmSignOut(false) }}>
          <div className="ad-modal" role="dialog" aria-modal="true" aria-labelledby="ad-signout-title" onClick={e => e.stopPropagation()}>
            <div className="ad-modal__icon"><LogOut size={22} /></div>
            <h3 id="ad-signout-title" className="ad-modal__title">Sign out?</h3>
            <p className="ad-modal__sub">You will be signed out of the admin panel and taken to the login page.</p>
            <div className="ad-modal__actions">
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setConfirmSignOut(false)} disabled={signingOut} autoFocus>
                Cancel
              </button>
              <button type="button" className="ad-btn ad-btn--danger" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="ad-main">
        <div className="ad-topbar">
          <button
            type="button"
            className="ad-topbar__hamburger"
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          ><Menu size={20} /></button>
          <div className="ad-topbar__heading">
            <h1 className="ad-topbar__title">{title}</h1>
            {subtitle && <span className="ad-topbar__sub">{subtitle}</span>}
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
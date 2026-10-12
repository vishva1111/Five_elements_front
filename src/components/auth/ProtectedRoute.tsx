import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import PageLoading from '../ui/PageLoading'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, only these roles can access this route */
  allowedRoles?: UserRole[]
  /**
   * Only users who actually hold one of allowedRoles get in — no "higher role
   * may enter" hierarchy. For pages built on the account's own data (the
   * Business console), where a Partner or Admin without the role would just
   * hit empty or forbidden screens.
   */
  strictRoles?: boolean
}

// ── Role Hierarchy ─────────────────────────────────────────────────────────────
// admin (3) > partner (2) > business (1) = individual (1)
// A higher-level role can access routes meant for lower-level roles.
const ROLE_LEVEL: Record<UserRole, number> = {
  individual: 1,
  business:   1,
  field_user: 1,
  partner:    2,
  admin:      3,
}

/**
 * Wraps a route to require authentication.
 * - If not logged in → redirect to /login (preserving the intended URL)
 * - If logged in but wrong role → redirect to the user's correct home
 * - If loading → show a minimal spinner
 * - Hierarchy: admin > partner > business = individual
 *   (higher-level roles can access lower-level routes)
 */
export default function ProtectedRoute({ children, allowedRoles, strictRoles = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <PageLoading />
  }

  // Not authenticated → go to login, remember where they were trying to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  // Account pending approval → show maintenance page (admin users bypass this)
  // Not approved yet, or suspended/rejected by an admin — no access until active.
  if ((user.status === 'pending' || user.status === 'suspended') && !user.roles.includes('admin')) {
    return <Navigate to="/maintenance" replace />
  }

  // ── Role hierarchy check ───────────────────────────────────────────────────
  // If allowedRoles is specified, check access using hierarchy:
  // 1. Exact role match (user has one of the allowed roles), OR
  // 2. User's highest role level >= minimum required role level
  //    (e.g. admin can access partner/business/individual routes,
  //           partner can access business/individual routes)
  if (allowedRoles) {
    // The active role always counts — some older profiles have a role that's
    // missing from their roles list (same rule as the backend's requireRole).
    const held = Array.from(new Set([...user.roles, user.role]))
    const userMaxLevel = Math.max(...held.map(r => ROLE_LEVEL[r] ?? 0))
    const requiredMinLevel = Math.min(...allowedRoles.map(r => ROLE_LEVEL[r] ?? 99))
    const hasExactRole = allowedRoles.some(r => held.includes(r))
    const hasHigherRole = !strictRoles && userMaxLevel > requiredMinLevel

    if (!hasExactRole && !hasHigherRole) {
      const home = ROLE_HOME[user.role] ?? '/'
      // Never redirect to the page we're already on — that loops forever.
      if (location.pathname === home) {
        return (
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: '#6B7B6E', fontSize: 15 }}>
            Your account doesn't have access to this page. Please contact the Five Elements team.
          </div>
        )
      }
      return <Navigate to={home} replace />
    }
  }

  return <>{children}</>
}
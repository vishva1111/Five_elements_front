import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'
import PageLoading from '../ui/PageLoading'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, only these roles can access this route */
  allowedRoles?: UserRole[]
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
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
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
  if (user.status === 'pending' && !user.roles.includes('admin')) {
    return <Navigate to="/maintenance" replace />
  }

  // ── Role hierarchy check ───────────────────────────────────────────────────
  // If allowedRoles is specified, check access using hierarchy:
  // 1. Exact role match (user has one of the allowed roles), OR
  // 2. User's highest role level >= minimum required role level
  //    (e.g. admin can access partner/business/individual routes,
  //           partner can access business/individual routes)
  if (allowedRoles) {
    const userMaxLevel = Math.max(...user.roles.map(r => ROLE_LEVEL[r] ?? 0))
    const requiredMinLevel = Math.min(...allowedRoles.map(r => ROLE_LEVEL[r] ?? 99))
    const hasExactRole = allowedRoles.some(r => user.roles.includes(r))
    const hasHigherRole = userMaxLevel > requiredMinLevel

    if (!hasExactRole && !hasHigherRole) {
      return <Navigate to={ROLE_HOME[user.role]} replace />
    }
  }

  return <>{children}</>
}
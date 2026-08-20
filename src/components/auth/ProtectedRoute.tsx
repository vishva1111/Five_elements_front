import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import type { UserRole } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, only these roles can access this route */
  allowedRoles?: UserRole[]
}

/**
 * Wraps a route to require authentication.
 * - If not logged in → redirect to /login (preserving the intended URL)
 * - If logged in but wrong role → redirect to the user's correct home
 * - If loading → show a minimal spinner
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F5F0EC',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #EAE3DA',
          borderTopColor: '#2B5341',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Not authenticated → go to login, remember where they were trying to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  // Authenticated but wrong role → redirect to their correct home.
  // Check user.roles (ALL roles) not user.role (active role) so that
  // multi-role users can access any of their allowed dashboards.
  if (allowedRoles && !allowedRoles.some(r => user.roles.includes(r))) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return <>{children}</>
}
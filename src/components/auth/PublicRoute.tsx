import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import PageLoading from '../ui/PageLoading'

/**
 * Wraps a public website page. A signed-in Individual never sees the public
 * site — they're sent to the matching page inside their own panel, and only
 * reach the website again after signing out.
 */
export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoading />

  if (user && user.role === 'individual') {
    return <Navigate to={panelPathFor(location.pathname, location.search)} replace />
  }

  return <>{children}</>
}

function panelPathFor(pathname: string, search: string): string {
  const project = pathname.match(/^\/projects\/([^/]+)\/?$/)
  if (project) return `/impact/projects/${project[1]}`
  if (/^\/projects\/?$/.test(pathname)) return `/impact/projects${search}`
  if (/^\/ledger\/?$/.test(pathname)) return '/my-ledger'
  return '/impact'
}

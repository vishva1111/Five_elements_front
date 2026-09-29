import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_URL as BACKEND } from '../config/api'
import { setTokens, getTokens, clearTokens, getValidAccessToken } from '../services/authTokens'

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = 'individual' | 'business' | 'partner' | 'admin' | 'field_user'

export interface AuthUser {
  id: string
  email: string
  role: UserRole          // active role (selected or single)
  roles: UserRole[]       // all roles this user has
  displayName: string
  isFirstLogin: boolean
  status: string          // 'active' | 'pending' | etc.
}

// Every page that reads `session` only ever uses `session.access_token` for
// the Authorization header — this is the full shape that's actually needed,
// not the full Supabase Session type this used to carry.
export interface AuthSession {
  access_token: string
}

interface AuthContextValue {
  user: AuthUser | null
  session: AuthSession | null
  loading: boolean
  signIn:        (email: string, password: string) => Promise<{ error: string | null }>
  signUp:        (fullName: string, email: string, password: string, role?: UserRole) => Promise<{ error: string | null; emailConfirmationRequired?: boolean; roleAdded?: boolean }>
  signOut:       () => Promise<void>
  setActiveRole: (role: UserRole) => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn:        async () => ({ error: null }),
  signUp:        async () => ({ error: null }),
  signOut:       async () => {},
  setActiveRole: async () => {},
})

// ── Role → home route map ─────────────────────────────────────────────────────
export const ROLE_HOME: Record<UserRole, string> = {
  individual: '/impact',
  business:   '/business',
  partner:    '/partner',
  admin:      '/admin',
  // Field users work in the mobile app; the web app has no console for them,
  // so send them somewhere real rather than to an undefined route.
  field_user: '/impact',
}

interface MeResponse {
  id: string
  email: string
  role: UserRole
  roles: UserRole[]
  displayName: string
  isFirstLogin: boolean
  status: string
}

function toAuthUser(me: MeResponse): AuthUser {
  return {
    id:           me.id,
    email:        me.email,
    role:         me.role,
    roles:        me.roles?.length ? me.roles : [me.role],
    displayName:  me.displayName,
    isFirstLogin: me.isFirstLogin,
    status:       me.status,
  }
}

// Supabase drops the session in the URL fragment after an OAuth redirect
// (#access_token=...&refresh_token=...&expires_in=...) — the SDK used to
// auto-detect and consume this; now this does it by hand, once, on load.
function consumeOAuthCallbackHash(): boolean {
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token=')) return false

  const params = new URLSearchParams(hash.slice(1))
  const access_token  = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  const expires_in    = params.get('expires_in')
  if (!access_token || !refresh_token) return false

  setTokens({ access_token, refresh_token, expires_in: expires_in ? Number(expires_in) : undefined })
  // Drop the tokens out of the URL/history — they shouldn't linger visibly.
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return true
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mirrors what the Supabase SDK's autoRefreshToken did: refresh a couple of
  // minutes before the access token actually expires, and keep `session` (the
  // thing ~30 pages read for their Authorization header) up to date.
  function scheduleRefresh(expiresAt: number) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const now = Math.floor(Date.now() / 1000)
    const delayMs = Math.max((expiresAt - now - 120) * 1000, 5000)
    refreshTimerRef.current = setTimeout(runScheduledRefresh, delayMs)
  }

  async function runScheduledRefresh() {
    const stored = getTokens()
    if (!stored) return
    try {
      const res = await fetch(`${BACKEND}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stored.refreshToken }),
      })
      if (!res.ok) {
        clearTokens()
        setUser(null)
        setSession(null)
        return
      }
      const json = await res.json()
      setTokens(json.session)
      setSession({ access_token: json.session.access_token })
      scheduleRefresh(json.session.expires_at)
    } catch {
      // Network blip — try again shortly rather than signing the user out.
      refreshTimerRef.current = setTimeout(runScheduledRefresh, 30_000)
    }
  }

  async function hydrateFromStoredTokens(): Promise<void> {
    const accessToken = await getValidAccessToken()
    if (!accessToken) {
      setUser(null)
      setSession(null)
      return
    }

    setSession({ access_token: accessToken })
    const stored = getTokens()
    if (stored) scheduleRefresh(stored.expiresAt)

    try {
      const res = await fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!res.ok) {
        clearTokens()
        setUser(null)
        setSession(null)
        return
      }
      setUser(toAuthUser(await res.json()))
    } catch {
      // Backend unreachable — keep the session (it may just be a network
      // blip) but no profile to show; ProtectedRoute stays in loading state
      // rather than bouncing to a wrong-role redirect.
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      consumeOAuthCallbackHash()
      await hydrateFromStoredTokens()
      if (!cancelled) setLoading(false)
    }

    init()

    return () => {
      cancelled = true
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error ?? 'Login failed' }

      setTokens(json.session)
      setSession({ access_token: json.session.access_token })
      const expiresAt = json.session.expires_at ?? Math.floor(Date.now() / 1000) + (json.session.expires_in ?? 3600)
      scheduleRefresh(expiresAt)

      const meRes = await fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${json.session.access_token}` } })
      if (meRes.ok) setUser(toAuthUser(await meRes.json()))

      return { error: null }
    } catch (err: any) {
      return { error: err?.message ?? 'Network error — could not reach server' }
    }
  }

  async function signUp(
    fullName: string,
    email: string,
    password: string,
    role: UserRole = 'individual'
  ): Promise<{ error: string | null; emailConfirmationRequired?: boolean; roleAdded?: boolean }> {
    try {
      const res = await fetch(`${BACKEND}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role }),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error || 'Signup failed.' }
      return {
        error: null,
        emailConfirmationRequired: json.emailConfirmationRequired,
        roleAdded: json.roleAdded,
      }
    } catch (err: any) {
      return { error: err?.message ?? 'Network error — could not reach server' }
    }
  }

  async function signOut() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const stored = getTokens()
    if (stored) {
      // Best-effort — sign-out must never hang on a network round trip.
      fetch(`${BACKEND}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored.accessToken}` },
      }).catch(() => {})
    }
    clearTokens()
    setUser(null)
    setSession(null)
  }

  // Switch active role (for multi-role users) — also updates profile.role in DB
  // Returns a Promise so callers can await DB persistence before navigating.
  async function setActiveRole(role: UserRole): Promise<void> {
    if (!user) return
    // Update local state immediately for snappy UI
    setUser({ ...user, role })
    // Await DB update so that a hard refresh reads the correct role
    const accessToken = await getValidAccessToken()
    await fetch(`${BACKEND}/api/auth/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
      body: JSON.stringify({ role }),
    })
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, setActiveRole }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

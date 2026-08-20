import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = 'individual' | 'business' | 'partner' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole          // active role (selected or single)
  roles: UserRole[]       // all roles this user has
  displayName: string
  isFirstLogin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
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
}

// ── Helper: fetch profile row ─────────────────────────────────────────────────
async function fetchProfile(userId: string): Promise<{
  role: UserRole
  roles: UserRole[]
  displayName: string
  isFirstLogin: boolean
} | null> {
  // Try auth_id column first
  const { data: byAuthId } = await supabase
    .from('profiles')
    .select('role, roles, display_name, is_first_login')
    .eq('auth_id', userId)
    .maybeSingle()

  if (byAuthId) {
    const roles = (byAuthId.roles as UserRole[]) || [(byAuthId.role as UserRole) || 'individual']
    return {
      role:         (byAuthId.role as UserRole) || 'individual',
      roles:        roles.length > 0 ? roles : [(byAuthId.role as UserRole) || 'individual'],
      displayName:  byAuthId.display_name || '',
      isFirstLogin: byAuthId.is_first_login ?? false,
    }
  }

  // Fallback: some profiles (test users) have UUID stored as id
  const { data: byId } = await supabase
    .from('profiles')
    .select('role, roles, display_name, is_first_login')
    .eq('id', userId)
    .maybeSingle()

  if (!byId) return null

  const roles = (byId.roles as UserRole[]) || [(byId.role as UserRole) || 'individual']
  return {
    role:         (byId.role as UserRole) || 'individual',
    roles:        roles.length > 0 ? roles : [(byId.role as UserRole) || 'individual'],
    displayName:  byId.display_name || '',
    isFirstLogin: byId.is_first_login ?? false,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  async function hydrateUser(supabaseUser: User, supabaseSession: Session) {
    // Retry profile fetch up to 2 times — avoids stale/null profile on slow DB
    let profile = await fetchProfile(supabaseUser.id)
    if (!profile) {
      await new Promise(r => setTimeout(r, 500))
      profile = await fetchProfile(supabaseUser.id)
    }

    // If profile still null, do NOT default to 'individual' — use empty roles
    // so ProtectedRoute stays in loading state rather than wrong-role redirect.
    const activeRole = (profile?.role ?? 'individual') as UserRole
    const roles      = profile?.roles?.length
      ? profile.roles as UserRole[]
      : [activeRole]

    setSession(supabaseSession)
    setUser({
      id:           supabaseUser.id,
      email:        supabaseUser.email ?? '',
      role:         activeRole,
      roles,
      displayName:  profile?.displayName ?? supabaseUser.email ?? '',
      isFirstLogin: profile?.isFirstLogin ?? false,
    })
  }

  useEffect(() => {
    let initialised = false

    // Step 1: getSession gives us the current session immediately on mount.
    // We await hydrateUser fully before setLoading(false) so ProtectedRoute
    // always sees the correct role on hard refresh.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await hydrateUser(s.user, s)
      }
      initialised = true
      setLoading(false)
    })

    // Step 2: onAuthStateChange handles subsequent sign-in / sign-out events.
    // Skip INITIAL_SESSION (getSession already handled it) and TOKEN_REFRESHED
    // (token refresh should not re-hydrate user — it would overwrite the active
    // role the user selected and cause spurious redirects).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'TOKEN_REFRESHED') {
        // Just update the session token, don't re-fetch profile from DB
        if (s) setSession(s)
        return
      }

      if (s?.user) {
        await hydrateUser(s.user, s)
      } else {
        setUser(null)
        setSession(null)
      }

      // If getSession somehow hasn't finished yet, mark loading done here too
      if (!initialised) {
        initialised = true
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data.session?.user) {
      await hydrateUser(data.session.user, data.session)
    }
    return { error: null }
  }

  async function signUp(
    fullName: string,
    email: string,
    password: string,
    role: UserRole = 'individual'
  ): Promise<{ error: string | null; emailConfirmationRequired?: boolean; roleAdded?: boolean }> {
    const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
    } catch {
      // Fallback: call Supabase directly if backend is unreachable
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: fullName.trim() } },
      })
      if (error) return { error: error.message }
      return { error: null, emailConfirmationRequired: !data.session }
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
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
    await supabase
      .from('profiles')
      .update({ role })
      .eq('auth_id', user.id)
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
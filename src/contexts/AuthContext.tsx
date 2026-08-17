import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = 'individual' | 'business' | 'partner' | 'admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  displayName: string
  isFirstLogin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>
  signUp:  (fullName: string, email: string, password: string) => Promise<{ error: string | null; emailConfirmationRequired?: boolean }>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn:  async () => ({ error: null }),
  signUp:  async () => ({ error: null }),
  signOut: async () => {},
})

// ── Role → home route map ─────────────────────────────────────────────────────
export const ROLE_HOME: Record<UserRole, string> = {
  individual: '/submit-project/details',
  business:   '/business',
  partner:    '/partner',
  admin:      '/admin',
}

// ── Helper: fetch profile row ─────────────────────────────────────────────────
// profiles.id is a text slug; auth_id links to auth.users.id (UUID).
// Try auth_id first, fall back to id for legacy/test users whose UUID is stored as id.
async function fetchProfile(userId: string): Promise<{ role: UserRole; displayName: string; isFirstLogin: boolean } | null> {
  // Try auth_id column first
  const { data: byAuthId } = await supabase
    .from('profiles')
    .select('role, display_name, is_first_login')
    .eq('auth_id', userId)
    .maybeSingle()

  if (byAuthId) {
    return {
      role:         (byAuthId.role as UserRole) || 'individual',
      displayName:  byAuthId.display_name || '',
      isFirstLogin: byAuthId.is_first_login ?? false,
    }
  }

  // Fallback: some profiles (test users) have UUID stored as id
  const { data: byId } = await supabase
    .from('profiles')
    .select('role, display_name, is_first_login')
    .eq('id', userId)
    .maybeSingle()

  if (!byId) return null

  return {
    role:         (byId.role as UserRole) || 'individual',
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
    const profile = await fetchProfile(supabaseUser.id)
    setSession(supabaseSession)
    setUser({
      id:           supabaseUser.id,
      email:        supabaseUser.email ?? '',
      role:         profile?.role ?? 'individual',
      displayName:  profile?.displayName ?? supabaseUser.email ?? '',
      isFirstLogin: profile?.isFirstLogin ?? false,
    })
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await hydrateUser(s.user, s)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (s?.user) {
        await hydrateUser(s.user, s)
      } else {
        setUser(null)
        setSession(null)
      }
      setLoading(false)
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
    password: string
  ): Promise<{ error: string | null; emailConfirmationRequired?: boolean }> {
    const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    try {
      const res = await fetch(`${BACKEND}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error || 'Signup failed.' }
      return { error: null, emailConfirmationRequired: json.emailConfirmationRequired }
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

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
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
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
})

// ── Role → home route map ─────────────────────────────────────────────────────
export const ROLE_HOME: Record<UserRole, string> = {
  individual: '/impact',
  business:   '/business',
  partner:    '/partner',
  admin:      '/admin',
}

// ── Helper: fetch profile row ─────────────────────────────────────────────────
async function fetchProfile(userId: string): Promise<{ role: UserRole; displayName: string; isFirstLogin: boolean } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name, is_first_login')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    role:         (data.role as UserRole) || 'individual',
    displayName:  data.display_name || '',
    isFirstLogin: data.is_first_login ?? false,
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

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
/**
 * authTokens.ts — the frontend's own session storage.
 *
 * Used to be the Supabase SDK's job (persistSession + autoRefreshToken):
 * it kept the access/refresh token in localStorage and quietly refreshed the
 * access token before it expired. Now that the frontend never talks to
 * Supabase directly, this is that same job, done by hand against the
 * backend's own /api/auth/refresh.
 */
import { API_URL } from '../config/api'

const ACCESS_TOKEN_KEY  = 'fe_access_token'
const REFRESH_TOKEN_KEY = 'fe_refresh_token'
const EXPIRES_AT_KEY    = 'fe_expires_at'

export interface RawSession {
  access_token:  string
  refresh_token: string
  expires_at?:   number   // unix seconds
  expires_in?:   number   // seconds from now
}

export interface StoredSession {
  accessToken:  string
  refreshToken: string
  expiresAt:    number    // unix seconds
}

export function setTokens(session: RawSession): void {
  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600)
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.access_token)
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token)
    localStorage.setItem(EXPIRES_AT_KEY, String(expiresAt))
  } catch {
    // Private browsing / storage blocked — session just won't survive a reload.
  }
}

export function getTokens(): StoredSession | null {
  try {
    const accessToken  = localStorage.getItem(ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const expiresAt     = localStorage.getItem(EXPIRES_AT_KEY)
    if (!accessToken || !refreshToken || !expiresAt) return null
    return { accessToken, refreshToken, expiresAt: Number(expiresAt) }
  } catch {
    return null
  }
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
  } catch {
    // Nothing to do if storage isn't available.
  }
}

// Refresh the access token a minute before it actually expires, so a request
// that's mid-flight when the clock ticks over doesn't get caught out.
const REFRESH_MARGIN_SECONDS = 60

// Concurrent callers (a page that fires several API calls at once) share one
// in-flight refresh instead of each racing the backend separately.
let refreshInFlight: Promise<string | null> | null = null

async function doRefresh(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) { clearTokens(); return null }
    const json = await res.json()
    setTokens(json.session)
    return json.session.access_token as string
  } catch {
    // Network hiccup — keep the stored (soon-to-expire) token rather than
    // wiping a session over a blip; the next call tries again.
    return null
  }
}

/** A currently-usable access token, refreshing first if it's about to expire. */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getTokens()
  if (!tokens) return null

  const now = Math.floor(Date.now() / 1000)
  if (tokens.expiresAt - now > REFRESH_MARGIN_SECONDS) {
    return tokens.accessToken
  }

  if (!refreshInFlight) {
    refreshInFlight = doRefresh(tokens.refreshToken).finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

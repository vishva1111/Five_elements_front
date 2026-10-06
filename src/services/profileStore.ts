/**
 * profileStore — the signed-in user's profile (GET /api/auth/profile), kept in
 * memory so the "My profile" popup opens with its data already there.
 *
 * AuthContext preloads it as soon as a user is signed in; the popup shows the
 * cached copy instantly and refreshes it in the background. Keyed by user id
 * (not token) so a routine token refresh doesn't empty it.
 */
import { API_URL } from '../config/api'

export interface ProfileData {
  account: {
    name:        string
    email:       string
    role:        string
    roles:       string[]
    status:      string
    location:    string | null
    memberSince: string | null
  }
  organisation: {
    orgName:      string | null
    orgType:      string | null
    website:      string | null
    contactName:  string | null
    contactEmail: string | null
    contactPhone: string | null
    address:      string | null
    status:       string | null
  } | null
}

let cache: { userId: string; data: ProfileData } | null = null
let inflight: { userId: string; promise: Promise<ProfileData> } | null = null

export function getCachedProfile(userId: string | undefined): ProfileData | null {
  return userId && cache?.userId === userId ? cache.data : null
}

/** Fetches (or joins the request already in flight) and refreshes the cache. */
export function loadProfile(token: string, userId: string): Promise<ProfileData> {
  if (inflight?.userId === userId) return inflight.promise
  const promise = fetch(`${API_URL}/api/auth/profile`, { headers: { Authorization: `Bearer ${token}` } })
    .then(async res => {
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not load profile')
      cache = { userId, data: json as ProfileData }
      return cache.data
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null })
  inflight = { userId, promise }
  return promise
}

export function clearProfileCache() {
  cache = null
  inflight = null
}

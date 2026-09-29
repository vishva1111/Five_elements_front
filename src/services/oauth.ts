/**
 * oauth.ts — builds the "Sign in with <provider>" redirect by hand.
 *
 * Previously `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })`.
 * That call never queried the database either — it just built this exact URL
 * and navigated to it (this app uses the SDK's default implicit flow, not
 * PKCE, confirmed against the installed @supabase/auth-js source). Building
 * the same URL directly means the OAuth button doesn't need the Supabase
 * client at all.
 *
 * The provider round-trip (browser -> Supabase -> Google/Microsoft/Apple ->
 * back to Supabase -> back here) still necessarily passes through Supabase's
 * own domain — that's inherent to how OAuth redirects work, not something
 * any backend proxy can avoid.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export type OAuthProvider = 'google' | 'azure' | 'apple'

export function signInWithOAuth(provider: OAuthProvider, redirectTo: string): void {
  const params = [`provider=${encodeURIComponent(provider)}`, `redirect_to=${encodeURIComponent(redirectTo)}`]
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?${params.join('&')}`
}

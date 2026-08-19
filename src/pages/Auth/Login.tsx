import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import './Login.css'

// ── Icons ─────────────────────────────────────────────────────────────────────
function LogoIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <polygon points="22,3 41,15 34,37 10,37 3,15" fill="#2B5341" />
      <path d="M22 12 C16 18 16 28 22 32 C28 28 28 18 22 12Z" fill="#F5F0EC" opacity="0.85" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="13" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      const intended = (location.state as { from?: string })?.from
      if (intended && intended !== '/login') {
        navigate(intended, { replace: true })
      } else {
        navigate(user.isFirstLogin ? '/welcome' : ROLE_HOME[user.role], { replace: true })
      }
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setBusy(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setBusy(false)
    if (err) {
      const isNotFound = /invalid login credentials/i.test(err) || /user not found/i.test(err)
      setError(isNotFound ? '__not_found__' : err)
    }
    // Navigation handled by useEffect once user state updates
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google',  options: { redirectTo: window.location.origin + '/welcome' } })
  }
  async function handleMicrosoft() {
    await supabase.auth.signInWithOAuth({ provider: 'azure',   options: { redirectTo: window.location.origin + '/welcome' } })
  }
  async function handleApple() {
    await supabase.auth.signInWithOAuth({ provider: 'apple',   options: { redirectTo: window.location.origin + '/welcome' } })
  }

  return (
    <div className="li-page">
      {/* Logo */}
      <div className="li-logo-wrap">
        <LogoIcon />
      </div>

      {/* Card */}
      <div className="li-card">
        <h1 className="li-card__title">Welcome back</h1>
        <p className="li-card__sub">Log in to continue where you left off.</p>

        <form className="li-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="li-field">
            <label className="li-field__label" htmlFor="li-email">EMAIL</label>
            <input
              id="li-email"
              type="email"
              className="li-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </div>

          {/* Password */}
          <div className="li-field">
            <label className="li-field__label" htmlFor="li-pw">PASSWORD</label>
            <div className="li-pw-wrap">
              <input
                id="li-pw"
                type={showPw ? 'text' : 'password'}
                className="li-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
              />
              <button
                type="button"
                className="li-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {error && (
            <div className="li-error" role="alert">
              {error === '__not_found__' ? (
                <>
                  No account found with this email.{' '}
                  <Link to="/signup" className="li-error__link">Create a new account →</Link>
                </>
              ) : error}
            </div>
          )}

          <button type="submit" className="li-btn-primary" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        {/* Forgot password */}
        <div className="li-forgot-wrap">
          <a href="#" className="li-forgot">Forgot password?</a>
        </div>

        {/* Divider */}
        <div className="li-or">or</div>

        {/* Social */}
        <div className="li-social">
          <button type="button" className="li-social__btn" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon /> Continue with Google
          </button>
          <button type="button" className="li-social__btn" onClick={handleMicrosoft} disabled={busy}>
            <MicrosoftIcon /> Continue with Microsoft
          </button>
          <button type="button" className="li-social__btn" onClick={handleApple} disabled={busy}>
            <AppleIcon /> Continue with Apple
          </button>
        </div>

        <p className="li-social__hint">
          Microsoft suits business workspaces · Apple suits personal accounts
        </p>

        <p className="li-terms">
          By logging in you agree to the{' '}
          <a href="#">terms</a> and <a href="#">privacy policy</a>.
        </p>
      </div>

      {/* Sign up link */}
      <p className="li-signup-line">
        Don't have an account? <Link to="/signup">Create account</Link>
      </p>
    </div>
  )
}
import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import './Login.css'

// ── Pentagon logo ─────────────────────────────────────────────────────────────
function PentaLogo() {
  return (
    <svg width="44" height="46" viewBox="0 0 40 42" aria-hidden="true">
      <polygon
        points="20,4 36.2,15.75 30.0,34.75 10.0,34.75 3.83,15.75"
        fill="none" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path
        d="M20 12 L22.3 18.6 L29.2 18.6 L23.6 22.7 L25.9 29.3 L20 25.2 L14.1 29.3 L16.4 22.7 L10.8 18.6 L17.7 18.6 Z"
        fill="none" stroke="#F09125" strokeWidth="1.4" strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { signIn, user } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  // If already logged in, redirect immediately
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
      setError(err)
      return
    }
    // Navigation handled by the useEffect above once user state updates
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-card__brand">
          <PentaLogo />
          <span className="login-card__brand-name">five elements <strong>CARM</strong></span>
        </div>

        <h1 className="login-card__h1">Welcome back</h1>
        <p className="login-card__sub">Log in to continue where you left off.</p>

        <form className="login-card__form" onSubmit={handleSubmit} noValidate>
          <label className="login-card__label">
            <span>Email</span>
            <input
              type="email"
              className="login-card__input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </label>

          <label className="login-card__label">
            <span>Password</span>
            <input
              type="password"
              className="login-card__input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
            />
          </label>

          {error && (
            <div className="login-card__error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-card__btn"
            disabled={busy}
          >
            {busy ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <div className="login-card__footer">
          <a href="#" className="login-card__forgot">Forgot password?</a>
          <span className="login-card__divider">·</span>
          <Link to="/" className="login-card__back">Back to home</Link>
        </div>

        
      </div>
    </div>
  )
}
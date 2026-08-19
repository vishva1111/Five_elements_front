import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import './Signup.css'

// ── Password strength ─────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#E8E2DA' }
  let s = 0
  if (pw.length >= 8)  s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const map = [
    { label: '',          color: '#E8E2DA' },
    { label: 'Weak',      color: '#E05252' },
    { label: 'Fair',      color: '#F09125' },
    { label: 'Good',      color: '#F0C125' },
    { label: 'Strong',    color: '#6BAF6B' },
    { label: 'Excellent', color: '#2B5341' },
  ]
  const idx = Math.min(s, 5)
  return { score: idx, label: map[idx].label, color: map[idx].color }
}

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
type Role = 'individual' | 'business'

export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [role,     setRole]     = useState<Role>('individual')
  const [fullName, setFullName] = useState('')
  const [orgName,  setOrgName]  = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [roleAdded, setRoleAdded] = useState(false)
  const [busy,     setBusy]     = useState(false)

  const strength = getStrength(password)
  const strengthPct = ['0%', '20%', '40%', '65%', '85%', '100%'][strength.score]

  function validate() {
    const e: Record<string, string> = {}
    if (!fullName.trim())                              e.fullName = 'Please enter your name.'
    if (role === 'business' && !orgName.trim())        e.orgName  = 'Please enter your organisation name.'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email.'
    if (password.length < 8)                           e.password = 'Password must be at least 8 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setApiError(null)
    const { error: err, emailConfirmationRequired, roleAdded: added } = await signUp(fullName, email, password, role)
    setBusy(false)
    if (err) { setApiError(err); return }
    if (added) { setRoleAdded(true); return }
    if (emailConfirmationRequired) { setSuccess(true); return }
    navigate('/welcome', { replace: true })
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

  // ── Role added screen (existing account, new role added) ───────────────────
  if (roleAdded) {
    return (
      <div className="su-page">
        <div className="su-logo-wrap">
          <LogoIcon />
        </div>
        <div className="su-card">
          <div className="su-success">
            <div className="su-success__icon">✓</div>
            <strong>{role === 'business' ? 'Business' : 'Individual'} access added!</strong>
            <p>
              Your existing account now has both Individual and Business access.
              Log in and choose which workspace to open.
            </p>
            <Link to="/login" className="su-btn-primary su-btn-primary--link">
              Go to Login →
            </Link>
          </div>
        </div>
        <p className="su-signin-line">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    )
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="su-page">
        <div className="su-logo-wrap">
          <LogoIcon />
        </div>
        <div className="su-card">
          <div className="su-success">
            <div className="su-success__icon">✓</div>
            <strong>Account created!</strong>
            <p>Check your email to confirm your address, then log in.</p>
            <Link to="/login" className="su-btn-primary su-btn-primary--link">
              Go to Login →
            </Link>
          </div>
        </div>
        <p className="su-signin-line">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    )
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="su-page">
      {/* Top-left brand bar */}
      <div className="su-topbar">
        <a href="/" className="su-brand">
          <span className="su-brand__icon">⬠</span>
          <span className="su-brand__text">
            five elements <strong className="su-brand__accent">CARM</strong>
          </span>
        </a>
      </div>

      {/* Card */}
      <div className="su-card">
        <h1 className="su-card__title">Create your account</h1>
        <p className="su-card__sub">Measure what you cause, fund what's real, see it proven.</p>

        {/* Role chooser */}
        <p className="su-role-label">I'M JOINING AS</p>
        <div className="su-role-row">
          <button
            type="button"
            className={`su-role-card${role === 'individual' ? ' su-role-card--ind' : ''}`}
            onClick={() => setRole('individual')}
          >
            <span className="su-role-card__name">Individual</span>
            <span className="su-role-card__desc">Measure your footprint, fund projects, build your impact home.</span>
          </button>
          <button
            type="button"
            className={`su-role-card${role === 'business' ? ' su-role-card--biz' : ''}`}
            onClick={() => setRole('business')}
          >
            <span className="su-role-card__name">Business</span>
            <span className="su-role-card__desc">Scope 1–3 measurement, team workspace, board-ready reports.</span>
          </button>
        </div>

        <form className="su-form" onSubmit={handleSubmit} noValidate>
          {/* Full name */}
          <div className="su-field">
            <label className="su-field__label" htmlFor="su-name">FULL NAME</label>
            <input
              id="su-name"
              type="text"
              className={`su-input${errors.fullName ? ' su-input--err' : ''}`}
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoComplete="name"
              disabled={busy}
            />
            {errors.fullName && <span className="su-field__error">{errors.fullName}</span>}
          </div>

          {/* Org name — business only */}
          {role === 'business' && (
            <div className="su-field">
              <label className="su-field__label" htmlFor="su-org">ORGANISATION NAME</label>
              <input
                id="su-org"
                type="text"
                className={`su-input${errors.orgName ? ' su-input--err' : ''}`}
                placeholder="e.g. Acme Pvt. Ltd."
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                autoComplete="organization"
                disabled={busy}
              />
              {errors.orgName && <span className="su-field__error">{errors.orgName}</span>}
            </div>
          )}

          {/* Email */}
          <div className="su-field">
            <label className="su-field__label" htmlFor="su-email">EMAIL</label>
            <input
              id="su-email"
              type="email"
              className={`su-input${errors.email ? ' su-input--err' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
            {errors.email && <span className="su-field__error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="su-field">
            <label className="su-field__label" htmlFor="su-pw">PASSWORD</label>
            <div className="su-pw-wrap">
              <input
                id="su-pw"
                type={showPw ? 'text' : 'password'}
                className={`su-input${errors.password ? ' su-input--err' : ''}`}
                placeholder="12+ characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={busy}
              />
              <button
                type="button"
                className="su-pw-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            {/* Strength bar */}
            <div className="su-strength-track">
              <div
                className="su-strength-fill"
                style={{ width: strengthPct, background: strength.color }}
              />
            </div>
            <span className="su-strength-hint">
              {strength.label
                ? <><strong style={{ color: strength.color }}>{strength.label}</strong> — longer is stronger. A passphrase beats symbols.</>
                : <>Good — longer is stronger. A passphrase beats symbols.</>
              }
            </span>
            {errors.password && <span className="su-field__error">{errors.password}</span>}
          </div>

          {apiError && <div className="su-api-error" role="alert">{apiError}</div>}

          <button type="submit" className="su-btn-primary" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div className="su-or">or</div>

        {/* Social */}
        <div className="su-social">
          <button type="button" className="su-social__btn" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon /> Continue with Google
          </button>
          <button type="button" className="su-social__btn" onClick={handleMicrosoft} disabled={busy}>
            <MicrosoftIcon /> Continue with Microsoft
          </button>
          <button type="button" className="su-social__btn" onClick={handleApple} disabled={busy}>
            <AppleIcon /> Continue with Apple
          </button>
        </div>

        <p className="su-social__hint">
          Microsoft suits business workspaces · Apple suits personal accounts
        </p>

        <p className="su-terms">
          By creating an account you agree to the{' '}
          <a href="#">terms</a> and <a href="#">privacy policy</a>.
        </p>

        <div className="su-partner-note">
          Field partners don't sign up here — they join through partner onboarding by invitation.{' '}
          New accounts land on the <a href="#">one-time welcome choice</a>, then your{' '}
          <a href="#">impact home</a>.
        </div>
      </div>

      {/* Sign in */}
      <p className="su-signin-line">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}
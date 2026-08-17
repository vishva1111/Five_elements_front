import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Navbar from '../../components/layout/Navbar'
import './Signup.css'

// ── Password strength helper ──────────────────────────────────────────────────
function getStrength(pw: string): { level: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { level: 0, label: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return { level: score as 0 | 1 | 2 | 3 | 4, label: labels[score] }
}

const STRENGTH_CLASS: Record<number, string> = {
  1: 'su-strength__bar--weak',
  2: 'su-strength__bar--fair',
  3: 'su-strength__bar--good',
  4: 'su-strength__bar--strong',
}

// ── Social icons ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022"/>
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00"/>
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF"/>
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="currentColor">
      <path d="M14.05 9.55c-.02-2.07 1.69-3.07 1.77-3.12-0.97-1.41-2.47-1.6-3-1.63-1.28-.13-2.5.75-3.15.75-.65 0-1.65-.73-2.72-.71-1.4.02-2.69.81-3.41 2.06-1.46 2.52-.37 6.26 1.05 8.31.7 1 1.52 2.13 2.61 2.09 1.05-.04 1.45-.67 2.72-.67 1.27 0 1.63.67 2.74.65 1.13-.02 1.84-1.02 2.53-2.03.8-1.16 1.13-2.29 1.15-2.35-.03-.01-2.27-.87-2.29-3.35zM11.9 3.3c.58-.7.97-1.67.86-2.64-.83.03-1.84.55-2.44 1.24-.54.62-1.01 1.61-.88 2.56.92.07 1.86-.47 2.46-1.16z"/>
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  const strength = getStrength(password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim())    { setError('Please enter your full name.'); return }
    if (!email)              { setError('Please enter your email.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setBusy(true)
    setError(null)

    const { error: err, emailConfirmationRequired } = await signUp(fullName, email, password)

    setBusy(false)

    if (err) { setError(err); return }

    if (emailConfirmationRequired) {
      setSuccess('Account created! Check your email to confirm your address, then log in.')
      return
    }

    navigate('/welcome', { replace: true })
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/welcome' } })
  }
  async function handleMicrosoft() {
    await supabase.auth.signInWithOAuth({ provider: 'azure', options: { redirectTo: window.location.origin + '/welcome' } })
  }
  async function handleApple() {
    await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo: window.location.origin + '/welcome' } })
  }

  return (
    <div className="su-page">
      <Navbar dark={true} />

      {/* Dark hero band */}
      <div className="su-hero">
        <div className="su-hero__inner">
          <p className="su-hero__eyebrow">CREATE ACCOUNT</p>
          <h1 className="su-hero__h1">Start your impact journey</h1>
          <p className="su-hero__sub">No card required. Takes less than a minute.</p>
        </div>
      </div>

      {/* Card */}
      <div className="su-body">
        <div className="su-card">

          {success ? (
            <div className="su-success">
              <span className="su-success__icon">✓</span>
              <div>
                <strong>Account created!</strong>
                <p>{success.replace('Account created! ', '')}</p>
              </div>
            </div>
          ) : (
            <form className="su-form" onSubmit={handleSubmit} noValidate>
              {/* Full name */}
              <label className="su-label">
                <span>Full name</span>
                <input
                  type="text"
                  className="su-input"
                  placeholder="e.g. Priya Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={busy}
                />
              </label>

              {/* Email */}
              <label className="su-label">
                <span>Email</span>
                <input
                  type="email"
                  className="su-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy}
                />
              </label>

              {/* Password */}
              <label className="su-label">
                <span>Password</span>
                <input
                  type="password"
                  className="su-input"
                  placeholder="12+ characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                />
                {password.length > 0 && (
                  <>
                    <div className="su-strength">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`su-strength__bar${strength.level >= i ? ' ' + STRENGTH_CLASS[Math.min(strength.level, i)] : ''}`}
                        />
                      ))}
                    </div>
                    <span className="su-strength__hint">
                      {strength.label} — longer is stronger. A passphrase beats symbols.
                    </span>
                  </>
                )}
              </label>

              {error && (
                <div className="su-error" role="alert">{error}</div>
              )}

              <button type="submit" className="su-btn-primary" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          )}

          {!success && (
            <>
              <div className="su-or"><span>or</span></div>

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
            </>
          )}

          <div className="su-partner-note">
            Field partners don't sign up here — they join through partner onboarding by invitation.
          </div>

          <div className="su-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
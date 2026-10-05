import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import FiveElementsLogo from '../../components/ui/FiveElementsLogo'
import './Login.css'

const MIN_PASSWORD = 8

/** Same frame as the Login page: brand bar + centred card. */
function AuthCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="li-page">
      <div className="li-topbar">
        <a href="/" className="li-brand">
          <FiveElementsLogo size={30} variant="full" theme="dark" />
        </a>
      </div>
      <div className="li-card">
        <h1 className="li-card__title">{title}</h1>
        <p className="li-card__sub">{sub}</p>
        {children}
      </div>
    </div>
  )
}

function PasswordField({ id, label, value, onChange, disabled, autoComplete }: {
  id: string; label: string; value: string; onChange: (v: string) => void; disabled: boolean; autoComplete: string
}) {
  return (
    <div className="li-field">
      <label className="li-field__label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        className="li-input"
        placeholder="••••••••"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
      />
    </div>
  )
}

async function postJson(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Something went wrong — please try again.')
  return json
}

function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`
  if (password !== confirm) return 'The two passwords do not match.'
  return null
}

// ── /forgot-password ──────────────────────────────────────────────────────────
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Please enter your email.'); return }
    setBusy(true); setError(null)
    try {
      const d = await postJson('/api/auth/forgot-password', { email: email.trim() })
      setSent(d.message)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Forgot password" sub="Enter your email and we'll send you a link to choose a new password.">
      {sent ? (
        <div className="li-success" role="status">{sent}</div>
      ) : (
        <form className="li-form" onSubmit={handleSubmit} noValidate>
          <div className="li-field">
            <label className="li-field__label" htmlFor="fp-email">EMAIL</label>
            <input
              id="fp-email"
              type="email"
              className="li-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={busy}
            />
          </div>
          {error && <div className="li-error" role="alert">{error}</div>}
          <button type="submit" className="li-btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
      <div className="li-forgot-wrap">
        <Link to="/login" className="li-forgot">← Back to log in</Link>
      </div>
    </AuthCard>
  )
}

// ── /reset-password?token=… (link from the reset email) ──────────────────────
export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(token ? null : 'This reset link is incomplete — request a new one.')
  const [done, setDone]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = checkNewPassword(password, confirm)
    if (problem) { setError(problem); return }
    setBusy(true); setError(null)
    try {
      await postJson('/api/auth/reset-password', { token, password })
      setDone(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Choose a new password" sub={`At least ${MIN_PASSWORD} characters.`}>
      {done ? (
        <>
          <div className="li-success" role="status">Your password has been changed. You can log in with it now.</div>
          <div className="li-forgot-wrap">
            <Link to="/login" className="li-forgot">Go to log in →</Link>
          </div>
        </>
      ) : (
        <>
          <form className="li-form" onSubmit={handleSubmit} noValidate>
            <PasswordField id="rp-pw" label="NEW PASSWORD" value={password} onChange={setPassword} disabled={busy || !token} autoComplete="new-password" />
            <PasswordField id="rp-pw2" label="CONFIRM NEW PASSWORD" value={confirm} onChange={setConfirm} disabled={busy || !token} autoComplete="new-password" />
            {error && <div className="li-error" role="alert">{error}</div>}
            <button type="submit" className="li-btn-primary" disabled={busy || !token}>
              {busy ? 'Saving…' : 'Save new password'}
            </button>
          </form>
          <div className="li-forgot-wrap">
            <Link to="/forgot-password" className="li-forgot">Request a new link</Link>
          </div>
        </>
      )}
    </AuthCard>
  )
}

// ── /account/password (signed in) ─────────────────────────────────────────────
export function ChangePassword() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone]   = useState(false)
  const home = user ? ROLE_HOME[user.role] : '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!current) { setError('Enter your current password.'); return }
    const problem = checkNewPassword(password, confirm)
    if (problem) { setError(problem); return }
    setBusy(true); setError(null)
    try {
      await postJson('/api/auth/change-password', { currentPassword: current, newPassword: password }, session?.access_token)
      setDone(true)
      setCurrent(''); setPassword(''); setConfirm('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Change password" sub={user?.email ? `Signed in as ${user.email}` : 'Set a new password for your account.'}>
      {done ? (
        <div className="li-success" role="status">Your password has been changed.</div>
      ) : (
        <form className="li-form" onSubmit={handleSubmit} noValidate>
          <PasswordField id="cp-cur" label="CURRENT PASSWORD" value={current} onChange={setCurrent} disabled={busy} autoComplete="current-password" />
          <PasswordField id="cp-pw" label="NEW PASSWORD" value={password} onChange={setPassword} disabled={busy} autoComplete="new-password" />
          <PasswordField id="cp-pw2" label="CONFIRM NEW PASSWORD" value={confirm} onChange={setConfirm} disabled={busy} autoComplete="new-password" />
          {error && <div className="li-error" role="alert">{error}</div>}
          <button type="submit" className="li-btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        </form>
      )}
      <div className="li-forgot-wrap">
        <button type="button" className="li-forgot" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => navigate(home)}>
          ← Back to my dashboard
        </button>
      </div>
    </AuthCard>
  )
}

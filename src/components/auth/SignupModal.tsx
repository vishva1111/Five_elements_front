import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './SignupModal.css'

interface SignupModalProps {
  onSuccess: () => void
  onClose: () => void
}

/**
 * S11 — Inline signup modal shown when an unauthenticated user tries to pay
 * in the FundFlow. On account creation, calls onSuccess() so the parent
 * can proceed with the payment.
 */
export default function SignupModal({ onSuccess, onClose }: SignupModalProps) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)
  const [mode,     setMode]     = useState<'signup' | 'login'>('signup')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Email and password are required.'); return }
    setBusy(true)
    setError(null)

    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (err) { setError(err.message); setBusy(false); return }

      // Insert profile row with role = 'individual'
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:             data.user.id,
          display_name:   name || email.split('@')[0],
          role:           'individual',
          is_first_login: false, // they're completing a payment — skip welcome screen
        })
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setBusy(false); return }
    }

    setBusy(false)
    onSuccess()
  }

  return (
    <div className="smodal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="smodal-card" role="dialog" aria-modal="true" aria-label="Create account to continue">
        {/* Close */}
        <button type="button" className="smodal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div className="smodal-badge">Almost there</div>
        <h2 className="smodal-h2">
          {mode === 'signup' ? 'Create a free account to complete your funding' : 'Log in to continue'}
        </h2>
        <p className="smodal-sub">
          Your basket is saved. {mode === 'signup' ? 'Sign up in seconds — no card required yet.' : 'Log in and your basket will be waiting.'}
        </p>

        {/* Form */}
        <form className="smodal-form" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <label className="smodal-label">
              <span>Your name</span>
              <input
                type="text"
                className="smodal-input"
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={busy}
                autoComplete="name"
              />
            </label>
          )}

          <label className="smodal-label">
            <span>Email</span>
            <input
              type="email"
              className="smodal-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
              autoComplete="email"
            />
          </label>

          <label className="smodal-label">
            <span>Password</span>
            <input
              type="password"
              className="smodal-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>

          {error && <div className="smodal-error" role="alert">{error}</div>}

          <button type="submit" className="smodal-btn" disabled={busy}>
            {busy ? (mode === 'signup' ? 'Creating account…' : 'Logging in…') : (mode === 'signup' ? 'Create account & continue' : 'Log in & continue')}
          </button>
        </form>

        {/* Toggle */}
        <div className="smodal-toggle">
          {mode === 'signup' ? (
            <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(null) }}>Log in</button></>
          ) : (
            <>New here? <button type="button" onClick={() => { setMode('signup'); setError(null) }}>Create account</button></>
          )}
        </div>
      </div>
    </div>
  )
}
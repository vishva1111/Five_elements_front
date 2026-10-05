import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_HOME } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import './Welcome.css'

// ── Pentagon helper ───────────────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function PathCard({
  glyph,
  color,
  fillTint,
  title,
  desc,
  cta,
  onClick,
}: {
  glyph: string
  color: string
  fillTint: string
  title: string
  desc: string
  cta: string
  onClick: () => void
}) {
  const p = penta(36, 37, 30)
  return (
    <button type="button" className="welcome-path-card" onClick={onClick} style={{ borderColor: color }}>
      <div className="welcome-path-card__icon">
        <svg width="72" height="74" viewBox="0 0 72 74" aria-hidden="true">
          <polygon points={p} fill={fillTint} stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <text x="36" y="46" textAnchor="middle" fontSize="26">{glyph}</text>
        </svg>
      </div>
      <div className="welcome-path-card__body">
        <div className="welcome-path-card__title" style={{ color }}>{title}</div>
        <div className="welcome-path-card__desc">{desc}</div>
      </div>
      <span className="welcome-path-card__cta" style={{ background: color }}>{cta}</span>
    </button>
  )
}

export default function Welcome() {
  const navigate = useNavigate()
  const { user, session } = useAuth()

  const name = user?.displayName?.split(' ')[0] || 'there'
  // Funding and submitting projects are individual/business journeys.
  const showPaths = !user || user.role === 'individual' || user.role === 'business'

  // Shown once: clear the first-login flag so the next sign-in goes straight to the dashboard.
  useEffect(() => {
    if (!session?.access_token) return
    fetch(`${API_URL}/api/auth/first-login-done`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {})
  }, [session?.access_token])

  return (
    <div className="welcome-page">
      <div className="welcome-inner">
        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-badge">First time here</div>
          <h1 className="welcome-h1">Welcome, {name} 👋</h1>
          <p className="welcome-sub">
            {showPaths
              ? "You're in. Choose how you'd like to start — you can always come back and do both."
              : "You're in. Your dashboard is ready."}
          </p>
        </div>

        {/* Accounts made by an admin or partner start on an emailed temporary password */}
        <p className="welcome-sub" style={{ marginTop: -8 }}>
          Signed in with a temporary password? <Link to="/account/password">Set your own password →</Link>
        </p>

        {/* Two paths */}
        {showPaths && (
        <div className="welcome-paths">
          <PathCard
            glyph="🌍"
            color="#2B5341"
            fillTint="#EAF3DE"
            title="Fund a project"
            desc="Browse verified Earth projects and start building your impact portfolio right now."
            cta="Browse projects →"
            onClick={() => navigate('/projects')}
          />
          <PathCard
            glyph="📋"
            color="#185FA5"
            fillTint="#EAF2FA"
            title="Bring an existing project"
            desc="Already running a carbon project? Submit it for verification and get it on the public ledger."
            cta="Submit a project →"
            onClick={() => navigate('/submit-project')}
          />
        </div>
        )}

        {/* Skip */}
        <button
          type="button"
          className="welcome-skip"
          onClick={() => navigate(user ? ROLE_HOME[user.role] : '/')}
        >
          {showPaths ? 'Skip for now — take me to my dashboard' : 'Go to my dashboard →'}
        </button>
      </div>
    </div>
  )
}
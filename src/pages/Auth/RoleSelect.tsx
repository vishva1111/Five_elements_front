import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, ROLE_HOME, UserRole } from '../../contexts/AuthContext'
import './RoleSelect.css'

// ── Pentagon helper ───────────────────────────────────────────────────────────
function penta(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

const ROLE_CONFIG: Record<string, { glyph: string; color: string; fillTint: string; title: string; desc: string; cta: string }> = {
  individual: {
    glyph:    '🌍',
    color:    '#2B5341',
    fillTint: '#EAF3DE',
    title:    'Individual',
    desc:     'Your personal impact home — fund projects, track your footprint, build your portfolio.',
    cta:      'Go to my impact home →',
  },
  business: {
    glyph:    '🏢',
    color:    '#185FA5',
    fillTint: '#EAF2FA',
    title:    'Business',
    desc:     'Scope 1–3 measurement, team workspace, and board-ready sustainability reports.',
    cta:      'Go to business dashboard →',
  },
  partner: {
    glyph:    '🤝',
    color:    '#7B4F12',
    fillTint: '#FDF3E3',
    title:    'Field Partner',
    desc:     'Manage projects, capture field data, and track submissions.',
    cta:      'Go to partner dashboard →',
  },
  admin: {
    glyph:    '⚙️',
    color:    '#4A1D96',
    fillTint: '#F3EEFF',
    title:    'Admin',
    desc:     'Platform administration, approvals, and oversight.',
    cta:      'Go to admin panel →',
  },
}

function RoleCard({
  roleKey,
  onClick,
}: {
  roleKey: string
  onClick: () => void
}) {
  const cfg = ROLE_CONFIG[roleKey]
  if (!cfg) return null
  const p = penta(36, 37, 30)
  return (
    <button
      type="button"
      className="rs-card"
      onClick={onClick}
      style={{ borderColor: cfg.color }}
    >
      <div className="rs-card__icon">
        <svg width="72" height="74" viewBox="0 0 72 74" aria-hidden="true">
          <polygon points={p} fill={cfg.fillTint} stroke={cfg.color} strokeWidth="2" strokeLinejoin="round" />
          <text x="36" y="46" textAnchor="middle" fontSize="26">{cfg.glyph}</text>
        </svg>
      </div>
      <div className="rs-card__body">
        <div className="rs-card__title" style={{ color: cfg.color }}>{cfg.title}</div>
        <div className="rs-card__desc">{cfg.desc}</div>
      </div>
      <span className="rs-card__cta" style={{ background: cfg.color }}>{cfg.cta}</span>
    </button>
  )
}

export default function RoleSelect() {
  const navigate = useNavigate()
  const { user, setActiveRole } = useAuth()

  const name  = user?.displayName?.split(' ')[0] || 'there'
  const roles = user?.roles ?? []

  async function handleSelect(role: UserRole) {
    await setActiveRole(role)
    navigate(ROLE_HOME[role], { replace: true })
  }

  return (
    <div className="rs-page">
      {/* Top-left brand bar */}
      <div className="rs-topbar">
        <a href="/" className="rs-brand">
          <span className="rs-brand__icon">⬠</span>
          <span className="rs-brand__text">
            five elements <strong className="rs-brand__accent">CARM</strong>
          </span>
        </a>
      </div>

      <div className="rs-inner">
        <div className="rs-header">
          <div className="rs-badge">Multiple accounts</div>
          <h1 className="rs-h1">Welcome back, {name} 👋</h1>
          <p className="rs-sub">
            You have access to multiple workspaces. Which one would you like to open?
          </p>
        </div>

        <div className="rs-cards">
          {roles.map(role => (
            <RoleCard
              key={role}
              roleKey={role}
              onClick={() => handleSelect(role as UserRole)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
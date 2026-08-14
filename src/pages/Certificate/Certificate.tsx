import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import './Certificate.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CertificateData {
  id: string
  recipientName: string
  projectName: string
  element: string
  partner: string
  location: string
  treesFunded: number
  tco2e: string
  issuedAt: string
  ledgerEntryId?: string
  ledgerUrl?: string
  verificationCode: string
}

// ── Pentagon SVG ──────────────────────────────────────────────────────────────
function PentaSeal({ size = 120 }: { size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.42
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <polygon points={pts} fill="#EAF3DE" stroke="#2B5341" strokeWidth="2.5" strokeLinejoin="round" />
      <polygon
        points={Array.from({ length: 5 }, (_, i) => {
          const a = -Math.PI / 2 + i * 2 * Math.PI / 5
          const ri = r * 0.55
          return `${(cx + ri * Math.cos(a)).toFixed(1)},${(cy + ri * Math.sin(a)).toFixed(1)}`
        }).join(' ')}
        fill="none" stroke="#AACBA7" strokeWidth="1.5" strokeLinejoin="round"
      />
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={size * 0.28} fill="#2B5341" fontWeight="bold">✓</text>
    </svg>
  )
}

export default function Certificate() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [cert, setCert]     = useState<CertificateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const headers: Record<string, string> = {}
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/certificate/${id}`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setCert(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, session])

  if (loading) {
    return (
      <div className="cert-page">
        <div className="cert-card cert-card--loading">
          <div className="cert-skel cert-skel--icon" />
          <div className="cert-skel cert-skel--title" />
          <div className="cert-skel cert-skel--body" />
        </div>
      </div>
    )
  }

  if (error || !cert) {
    return (
      <div className="cert-page">
        <div className="cert-card">
          <p className="cert-error">⚠ {error || 'Certificate not found.'}</p>
          <Link to="/impact" className="cert-back-link">← Back to impact</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cert-page">
      <div className="cert-card">
        {/* Seal */}
        <div className="cert-seal">
          <PentaSeal size={110} />
        </div>

        {/* Header */}
        <div className="cert-badge">Certificate of Impact</div>
        <h1 className="cert-h1">This certifies that</h1>
        <div className="cert-recipient">{cert.recipientName}</div>
        <p className="cert-desc">
          has funded <strong>{cert.treesFunded.toLocaleString()} trees</strong> through the{' '}
          <strong>{cert.projectName}</strong> project, sequestering an estimated{' '}
          <strong>{cert.tco2e} tCO₂e</strong> of carbon.
        </p>

        {/* Details grid */}
        <div className="cert-details">
          {[
            { label: 'Project',   value: cert.projectName },
            { label: 'Element',   value: cert.element },
            { label: 'Partner',   value: cert.partner },
            { label: 'Location',  value: cert.location },
            { label: 'Trees',     value: cert.treesFunded.toLocaleString() },
            { label: 'tCO₂e',    value: cert.tco2e },
            { label: 'Issued',    value: cert.issuedAt },
            { label: 'Cert ID',   value: cert.id.slice(0, 12).toUpperCase() },
          ].map(d => (
            <div key={d.label} className="cert-detail">
              <div className="cert-detail__label">{d.label}</div>
              <div className="cert-detail__value">{d.value}</div>
            </div>
          ))}
        </div>

        {/* Verification code */}
        <div className="cert-verify">
          <div className="cert-verify__label">Verification code</div>
          <div className="cert-verify__code">{cert.verificationCode}</div>
        </div>

        {/* Actions */}
        <div className="cert-actions">
          {cert.ledgerEntryId && (
            <Link
              to={`/ledger?entry=${cert.ledgerEntryId}`}
              className="cert-btn cert-btn--ledger"
            >
              ⛓ Verify on ledger
            </Link>
          )}
          <button
            type="button"
            className="cert-btn cert-btn--share"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'My Impact Certificate', url: window.location.href })
              } else {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
          >
            Share certificate
          </button>
          <button
            type="button"
            className="cert-btn cert-btn--print"
            onClick={() => window.print()}
          >
            ↧ Download / Print
          </button>
        </div>

        <Link to="/my-projects" className="cert-back-link">← Back to my projects</Link>
      </div>
    </div>
  )
}
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useAuth } from '../../contexts/AuthContext'
import './MyProjects.css'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MyProject {
  id: string
  name: string
  element: string
  category: string
  partner: string
  location: string
  treesFunded: number
  tco2e: string
  fundedAt: string
  verificationStatus: 'verified' | 'progress' | 'pending'
  hasLedgerEntry: boolean
  ledgerEntryId?: string
  certificateId?: string
}

// ── Verification badge ────────────────────────────────────────────────────────
function VerBadge({ status }: { status: string }) {
  if (status === 'verified')
    return <span className="mp-badge mp-badge--verified">✓ Verified</span>
  if (status === 'progress')
    return <span className="mp-badge mp-badge--progress">Delivery in progress</span>
  return <span className="mp-badge mp-badge--pending">Pending</span>
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="mp-empty">
      <div className="mp-empty__icon">🌱</div>
      <h2 className="mp-empty__title">No projects yet</h2>
      <p className="mp-empty__sub">Fund your first project to start building your impact portfolio.</p>
      <Link to="/projects" className="mp-empty__btn">Browse projects →</Link>
    </div>
  )
}

export default function MyProjects() {
  const navigate = useNavigate()
  const { user, session } = useAuth()
  const [projects, setProjects] = useState<MyProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!session?.access_token) return

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/my-projects`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProjects(data.projects || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <div className="mp-page">
      <Navbar />

      <div className="mp-header">
        <div className="mp-header__inner">
          <Link to="/impact" className="mp-back">← Back to impact</Link>
          <h1 className="mp-header__title">My projects & evidence</h1>
          <p className="mp-header__sub">
            {user?.displayName || 'Your'} funded portfolio · all evidence on the public ledger
          </p>
        </div>
      </div>

      <div className="mp-body">
        {loading && (
          <div className="mp-loading">
            {[1, 2, 3].map(i => <div key={i} className="mp-skel" />)}
          </div>
        )}

        {error && (
          <div className="mp-error">⚠ {error}</div>
        )}

        {!loading && !error && projects.length === 0 && <EmptyState />}

        {!loading && !error && projects.length > 0 && (
          <div className="mp-list">
            {projects.map(p => (
              <div key={p.id} className="mp-card">
                {/* Left: element glyph */}
                <div className="mp-card__glyph">🌍</div>

                {/* Middle: project info */}
                <div className="mp-card__body">
                  <div className="mp-card__meta">
                    <span className="mp-card__element">{p.element}</span>
                    <span className="mp-card__category">{p.category}</span>
                    <span className="mp-card__location">{p.location}</span>
                  </div>
                  <div className="mp-card__name">{p.name}</div>
                  <div className="mp-card__stats">
                    <span>{p.treesFunded.toLocaleString()} trees</span>
                    <span className="mp-card__dot">·</span>
                    <span>{p.tco2e} tCO₂e</span>
                    <span className="mp-card__dot">·</span>
                    <span>{p.partner}</span>
                  </div>
                  <div className="mp-card__badges">
                    <VerBadge status={p.verificationStatus} />
                    {p.hasLedgerEntry && (
                      <Link
                        to={p.ledgerEntryId ? `/ledger?entry=${p.ledgerEntryId}` : '/ledger'}
                        className="mp-card__ledger-link"
                      >
                        ⛓ Verify on ledger
                      </Link>
                    )}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="mp-card__actions">
                  {p.certificateId && (
                    <button
                      type="button"
                      className="mp-card__btn mp-card__btn--cert"
                      onClick={() => navigate(`/certificate/${p.certificateId}`)}
                    >
                      🏅 Certificate
                    </button>
                  )}
                  <div className="mp-card__date">Funded {p.fundedAt}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
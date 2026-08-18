import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  TreePine, Leaf, MapPin, ExternalLink,
  TrendingUp, Award, ChevronRight,
  Sprout, AlertCircle
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchUserImpact, fetchPlatformStats } from '../../services/api'
import type { UserImpactEntry, UserImpactStats } from '../../services/api'
import IndividualLayout from './IndividualLayout'
import './ImpactHome.css'

function getCO2Rank(tCO2e: number): string {
  if (tCO2e === 0) return '—'
  if (tCO2e >= 10) return 'Top 5%'
  if (tCO2e >= 5)  return 'Top 12%'
  if (tCO2e >= 2)  return 'Top 25%'
  return 'Top 50%'
}

export default function ImpactHome() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries]   = useState<UserImpactEntry[]>([])
  const [stats, setStats]       = useState<UserImpactStats>({ trees: 0, tCO2e: 0, projects: 0, fundsInvested: 0 })
  const [platStats, setPlatStats] = useState({ treesFunded: 0, tCO2eVerified: 0, projectsActive: 0 })
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError]     = useState<string | null>(null)

  // Redirect non-individual users away
  useEffect(() => {
    if (!authLoading && user && user.role !== 'individual') {
      navigate('/', { replace: true })
    }
  }, [authLoading, user, navigate])

  // Fetch user-specific impact data
  useEffect(() => {
    if (authLoading || !user) return

    setDataLoading(true)
    setDataError(null)

    Promise.all([
      fetchUserImpact(user.id),
      fetchPlatformStats(),
    ])
      .then(([impact, plat]) => {
        setEntries(impact.entries)
        setStats(impact.stats)
        setPlatStats(plat)
      })
      .catch((err: Error) => setDataError(err.message || 'Failed to load impact data'))
      .finally(() => setDataLoading(false))
  }, [authLoading, user])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="ih-shell">
        <div className="ih-loading-screen">
          <div className="ih-spinner" />
          <p>Loading your impact…</p>
        </div>
      </div>
    )
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="ih-shell">
        <div className="ih-loading-screen">
          <AlertCircle size={40} color="#F09125" />
          <p>Please <Link to="/login" className="ih-link">log in</Link> to view your impact dashboard.</p>
        </div>
      </div>
    )
  }

  const displayName = user.displayName || user.email
  const recentEntries = entries.slice(0, 4)
  const hasData     = entries.length > 0

  return (
    <IndividualLayout title={displayName} topLabel="MY IMPACT">

      {/* ── Error banner ── */}
      {dataError && (
        <div className="ih-error-banner">
          <AlertCircle size={16} />
          <span>Could not load your data: {dataError}</span>
        </div>
      )}

      {/* ── KPI cards ── */}
      <section className="ih-kpi-row">
        <div className="ih-kpi-card ih-kpi-card--green">
          <div className="ih-kpi-card__icon">🌳</div>
          <div className="ih-kpi-card__body">
            <span className="ih-kpi-card__num">
              {dataLoading ? '—' : stats.trees.toLocaleString()}
            </span>
            <span className="ih-kpi-card__label">Trees Funded</span>
          </div>
          <TrendingUp size={16} className="ih-kpi-card__trend" />
        </div>

        <div className="ih-kpi-card ih-kpi-card--teal">
          <div className="ih-kpi-card__icon">🌿</div>
          <div className="ih-kpi-card__body">
            <span className="ih-kpi-card__num">
              {dataLoading ? '—' : <>{stats.tCO2e} <small>tCO₂e</small></>}
            </span>
            <span className="ih-kpi-card__label">Carbon Offset</span>
          </div>
          <TrendingUp size={16} className="ih-kpi-card__trend" />
        </div>

        <div className="ih-kpi-card ih-kpi-card--amber">
          <div className="ih-kpi-card__icon">🗺️</div>
          <div className="ih-kpi-card__body">
            <span className="ih-kpi-card__num">
              {dataLoading ? '—' : stats.projects}
            </span>
            <span className="ih-kpi-card__label">Projects Backed</span>
          </div>
          <ChevronRight size={16} className="ih-kpi-card__trend" />
        </div>

        <div className="ih-kpi-card ih-kpi-card--dark">
          <div className="ih-kpi-card__icon">🏅</div>
          <div className="ih-kpi-card__body">
            <span className="ih-kpi-card__num">
              {dataLoading ? '—' : getCO2Rank(stats.tCO2e)}
            </span>
            <span className="ih-kpi-card__label">CO₂ Rank</span>
          </div>
          <ChevronRight size={16} className="ih-kpi-card__trend" />
        </div>
      </section>

      {/* ── Middle row: Map + Platform stats ── */}
      <section className="ih-mid-row">
        {/* Map */}
        <div className="ih-card ih-map-card">
          <div className="ih-card__header">
            <h2>Where your trees are growing</h2>
            {hasData && (
              <span className="ih-card__meta">
                {stats.trees} trees · {stats.projects} project{stats.projects !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!hasData && !dataLoading ? (
            <div className="ih-empty-map">
              <Sprout size={36} color="#40916C" />
              <p>No trees funded yet</p>
              <span>Fund your first project to see your trees on the map</span>
              <Link to="/projects" className="ih-btn ih-btn--primary" style={{ marginTop: 8 }}>
                Browse projects →
              </Link>
            </div>
          ) : (
            <div className="ih-map-placeholder">
              <MapPin size={36} color="#2D6A4F" />
              <p>Interactive map — geo-tagged tree locations</p>
              <span>Coming soon: live satellite view of your funded areas</span>
            </div>
          )}
        </div>

        {/* Platform stats */}
        <div className="ih-card ih-platform-card">
          <p className="ih-platform-card__label">PLATFORM TOTAL</p>
          <div className="ih-platform-card__stat">
            <span className="ih-platform-card__num">
              {(platStats.treesFunded || 0).toLocaleString()}
            </span>
            <span>trees funded</span>
          </div>
          <div className="ih-platform-card__stat">
            <span className="ih-platform-card__num">
              {(platStats.tCO2eVerified || 0).toLocaleString()}
            </span>
            <span>tCO₂e verified</span>
          </div>
          <div className="ih-platform-card__stat">
            <span className="ih-platform-card__num">
              {platStats.projectsActive || 0}
            </span>
            <span>active projects</span>
          </div>
        </div>
      </section>

      {/* ── Ledger entries ── */}
      <section className="ih-card ih-ledger-card">
        <div className="ih-card__header">
          <h2>My Ledger Entries</h2>
          {hasData && (
            <div style={{ display: 'flex', gap: 16 }}>
              <Link to="/my-projects" className="ih-link">My projects & evidence →</Link>
              <Link to="/ledger" className="ih-link">See all →</Link>
            </div>
          )}
        </div>

        {dataLoading ? (
          <div className="ih-loading">
            <div className="ih-spinner ih-spinner--sm" />
            <span>Loading your entries…</span>
          </div>
        ) : !hasData ? (
          <div className="ih-empty">
            <Sprout size={40} color="#40916C" />
            <p>No ledger entries yet</p>
            <span>Once you fund a project, your verified impact entries will appear here.</span>
            <Link to="/projects" className="ih-btn ih-btn--primary" style={{ marginTop: 12 }}>
              Fund your first project →
            </Link>
          </div>
        ) : (
          <div className="ih-entries">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="ih-entry">
                <div className="ih-entry__left">
                  <span className="ih-entry__id">{entry.id}</span>
                  <span className="ih-entry__project">{entry.project}</span>
                  <div className="ih-entry__meta">
                    <span><TreePine size={12} /> {entry.trees} trees</span>
                    <span><Leaf size={12} /> {entry.tCO2e} tCO₂e</span>
                    <span>{entry.date}</span>
                  </div>
                </div>
                <div className="ih-entry__right">
                  {entry.verified && (
                    <span className="ih-badge ih-badge--verified">✓ Verified</span>
                  )}
                  {entry.txHash && (
                    <a href="#" className="ih-tx-link">
                      {entry.txHash.slice(0, 12)}… <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {entries.length > 4 && (
              <div className="ih-entries__more">
                <Link to="/ledger" className="ih-link">
                  +{entries.length - 4} more entries — view all on ledger →
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── CTA ── */}
      <section className="ih-cta">
        <div className="ih-cta__text">
          <h2>
            {hasData ? 'Keep growing your impact' : 'Start your climate journey'}
          </h2>
          <p>
            {hasData
              ? 'Fund more trees, back more projects, build a verifiable record of your climate action.'
              : 'Fund real reforestation projects and build a transparent, verified record of your climate impact.'}
          </p>
        </div>
        <div className="ih-cta__btns">
          <Link to="/projects" className="ih-btn ih-btn--primary">
            {hasData ? 'Fund more trees →' : 'Browse projects →'}
          </Link>
          <Link to="/ledger" className="ih-btn ih-btn--outline">View public ledger</Link>
        </div>
      </section>

    </IndividualLayout>
  )
}

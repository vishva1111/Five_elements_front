import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, MapPin, Search, Handshake, ArrowUpRight, BookOpen } from 'lucide-react'
import IndividualLayout from '../ImpactHome/IndividualLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL } from '../../config/api'
import { getValidAccessToken } from '../../services/authTokens'
import '../ImpactHome/ImpactHome.css'
import './MyProjects.css'

// ── Types ─────────────────────────────────────────────────────────────────────
// One row per funding, as the API returns it.
interface Funding {
  id: string
  projectId: string | null
  projectSlug: string | null
  name: string
  element: string
  category: string
  partner: string
  location: string
  treesFunded: number
  tco2e: string
  amount: number
  fundedAt: string
  fundedAtRaw: string | null
  verificationStatus: 'verified' | 'progress' | 'pending'
  certificateId?: string | null
}

// One card per project — a project funded twice shows once, with both fundings.
interface ProjectGroup {
  key: string
  projectId: string | null
  slug: string | null
  name: string
  element: string
  category: string
  partner: string
  location: string
  trees: number
  tco2e: number
  amount: number
  fundings: number
  verifiedFundings: number
  firstFunded: number
  lastFunded: number
  certificateId: string | null
}

type Filter = 'all' | 'verified' | 'pending'

const ELEMENT: Record<string, { glyph: string; color: string; bg: string }> = {
  earth: { glyph: '🌍', color: '#2B5341', bg: '#EAF3DE' },
  water: { glyph: '💧', color: '#185FA5', bg: '#E6F1FB' },
  fire:  { glyph: '🔥', color: '#B4600E', bg: '#FEF0E3' },
  air:   { glyph: '💨', color: '#534AB7', bg: '#EEEDFE' },
  ether: { glyph: '✨', color: '#112121', bg: '#ECECEC' },
}

const fmtINR  = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const fmtDate = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function MyProjects() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [fundings, setFundings] = useState<Funding[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filter, setFilter]     = useState<Filter>('all')
  const [search, setSearch]     = useState('')

  // Keyed on the user, not the access token — the token refreshes in the
  // background and must not reload (and flash) the whole page.
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    getValidAccessToken()
      .then(token => fetch(`${API_URL}/api/my-projects`, { headers: { Authorization: `Bearer ${token ?? ''}` } }))
      .then(async r => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok || data.error) throw new Error(data.error || `HTTP ${r.status}`)
        setFundings(data.projects || [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [userId])

  const groups = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string, ProjectGroup>()
    for (const f of fundings) {
      const key = f.projectId || f.name
      const at  = f.fundedAtRaw ? new Date(f.fundedAtRaw).getTime() : 0
      const g = map.get(key) ?? {
        key, projectId: f.projectId, slug: f.projectSlug, name: f.name,
        element: (f.element || 'earth').toLowerCase(), category: f.category, partner: f.partner, location: f.location,
        trees: 0, tco2e: 0, amount: 0, fundings: 0, verifiedFundings: 0,
        firstFunded: at || Infinity, lastFunded: at, certificateId: null,
      }
      g.trees    += f.treesFunded || 0
      g.tco2e    += parseFloat(f.tco2e) || 0
      g.amount   += f.amount || 0
      g.fundings += 1
      if (f.verificationStatus === 'verified') g.verifiedFundings += 1
      if (at) { g.firstFunded = Math.min(g.firstFunded, at); g.lastFunded = Math.max(g.lastFunded, at) }
      if (f.certificateId && !g.certificateId) g.certificateId = f.certificateId
      map.set(key, g)
    }
    return [...map.values()].sort((a, b) => b.lastFunded - a.lastFunded)
  }, [fundings])

  const totals = useMemo(() => ({
    projects: groups.length,
    trees:    groups.reduce((s, g) => s + g.trees, 0),
    amount:   groups.reduce((s, g) => s + g.amount, 0),
    verified: groups.filter(g => g.verifiedFundings === g.fundings).length,
  }), [groups])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter(g => {
      const isVerified = g.verifiedFundings === g.fundings
      if (filter === 'verified' && !isVerified) return false
      if (filter === 'pending' && isVerified) return false
      return !q || [g.name, g.location, g.partner, g.category].some(v => (v || '').toLowerCase().includes(q))
    })
  }, [groups, filter, search])

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: 'all',      label: 'All projects',      count: groups.length },
    { key: 'verified', label: 'Verified',          count: totals.verified },
    { key: 'pending',  label: 'Awaiting evidence', count: groups.length - totals.verified },
  ]

  return (
    <IndividualLayout
      title="My Projects"
      subtitle="Every project you've funded · evidence arrives as geo-tagged photos"
      actions={
        <button type="button" className="db-topbar__report-btn" onClick={() => navigate('/impact/projects')}>
          🌳 Fund more trees
        </button>
      }
    >
      {error && <div className="db-error-banner">⚠ Could not load your projects: {error}</div>}

      {/* Summary */}
      <div className="myp-summary">
        <div className="db-card myp-stat">
          <span className="myp-stat__label">Projects backed</span>
          <span className="myp-stat__num">{loading ? '—' : totals.projects}</span>
        </div>
        <div className="db-card myp-stat">
          <span className="myp-stat__label">Trees funded</span>
          <span className="myp-stat__num">{loading ? '—' : totals.trees.toLocaleString('en-IN')}</span>
        </div>
        <div className="db-card myp-stat">
          <span className="myp-stat__label">Fully verified</span>
          <span className="myp-stat__num">{loading ? '—' : `${totals.verified} of ${totals.projects}`}</span>
        </div>
        <div className="db-card myp-stat myp-stat--dark">
          <span className="myp-stat__label">Total contributed</span>
          <span className="myp-stat__num">{loading ? '—' : fmtINR(totals.amount)}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="myp-toolbar">
        <div className="myp-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              className={`myp-tab${filter === t.key ? ' myp-tab--active' : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <span className="myp-tab__count">{t.count}</span>
            </button>
          ))}
        </div>
        <label className="myp-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Search project, place or partner"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="myp-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="db-card db-skel" style={{ height: 230 }} />)}
        </div>
      ) : groups.length === 0 && !error ? (
        <div className="db-card myp-empty">
          <div className="myp-empty__icon">🌱</div>
          <div className="myp-empty__title">No projects yet</div>
          <div className="myp-empty__sub">Fund your first project to start building your impact portfolio.</div>
          <button type="button" className="db-cta-btn" onClick={() => navigate('/impact/projects')}>Browse projects</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="db-card myp-empty">
          <div className="myp-empty__title">No projects match</div>
          <div className="myp-empty__sub">Try a different search or filter.</div>
        </div>
      ) : (
        <div className="myp-grid">
          {visible.map(g => {
            const el       = ELEMENT[g.element] || ELEMENT.earth
            const verified = g.verifiedFundings === g.fundings
            const pct      = Math.round((g.verifiedFundings / g.fundings) * 100)
            const link     = g.slug || g.projectId
            return (
              <div key={g.key} className="db-card myp-card">
                <div className="myp-card__top">
                  <div className="myp-card__glyph" style={{ background: el.bg }}>{el.glyph}</div>
                  <div className="myp-card__heading">
                    <div className="myp-card__tags">
                      <span className="myp-tag" style={{ color: el.color, background: el.bg }}>
                        {g.element.charAt(0).toUpperCase() + g.element.slice(1)}
                      </span>
                      {g.category && <span className="myp-card__category">{g.category}</span>}
                    </div>
                    <h3 className="myp-card__name">{g.name}</h3>
                    <div className="myp-card__meta">
                      {g.location && <span><MapPin size={12} /> {g.location}</span>}
                      {g.partner && <span><Handshake size={12} /> {g.partner}</span>}
                    </div>
                  </div>
                  {verified ? (
                    <span className="ih-badge ih-badge--verified myp-card__status"><CheckCircle2 size={11} /> Verified</span>
                  ) : (
                    <span className="ih-badge ih-badge--in-progress myp-card__status"><Clock size={11} /> Awaiting evidence</span>
                  )}
                </div>

                <div className="myp-card__stats">
                  <div>
                    <span className="myp-card__num">{g.trees.toLocaleString('en-IN')}</span>
                    <span className="myp-card__lbl">trees</span>
                  </div>
                  <div>
                    <span className="myp-card__num">{(Math.round(g.tco2e * 10) / 10)}</span>
                    <span className="myp-card__lbl">tCO₂e (est.)</span>
                  </div>
                  <div>
                    <span className="myp-card__num">{fmtINR(g.amount)}</span>
                    <span className="myp-card__lbl">contributed</span>
                  </div>
                </div>

                <div className="myp-card__evidence">
                  <div className="myp-card__evidence-row">
                    <span>Evidence</span>
                    <span>{g.verifiedFundings} of {g.fundings} funding{g.fundings !== 1 ? 's' : ''} verified</span>
                  </div>
                  <div className="myp-card__track">
                    <div className="myp-card__fill" style={{ width: `${Math.max(pct, verified ? 100 : 3)}%` }} />
                  </div>
                </div>

                <div className="myp-card__foot">
                  <span className="myp-card__date">
                    {g.fundings > 1
                      ? `Funded ${g.fundings}× · last ${fmtDate(g.lastFunded)}`
                      : `Funded ${fmtDate(g.lastFunded)}`}
                  </span>
                  <div className="myp-card__actions">
                    {g.certificateId && (
                      <Link to={`/certificate/${g.certificateId}`} className="myp-link">🏅 Certificate</Link>
                    )}
                    <Link to="/my-ledger" className="myp-link"><BookOpen size={13} /> Ledger</Link>
                    {link && (
                      <Link to={`/impact/projects/${link}`} className="myp-link myp-link--primary">
                        View project <ArrowUpRight size={13} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </IndividualLayout>
  )
}

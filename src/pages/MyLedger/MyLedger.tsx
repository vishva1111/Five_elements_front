import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Search } from 'lucide-react'
import IndividualLayout from '../ImpactHome/IndividualLayout'
import { useAuth } from '../../contexts/AuthContext'
import { fetchUserImpact } from '../../services/api'
import type { UserImpactEntry } from '../../services/api'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import '../ImpactHome/ImpactHome.css'
import './MyLedger.css'

type StatusFilter = 'all' | 'verified' | 'pending'

const fmtINR  = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * The signed-in Individual's own ledger — every funding they've made, with its
 * verification status. Lives inside the panel; the public website ledger is
 * only reachable after signing out.
 */
export default function MyLedger() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [entries, setEntries] = useState<UserImpactEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<StatusFilter>('all')

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setError(null)
    fetchUserImpact(userId)
      .then(d => setEntries(d.entries))
      .catch((e: Error) => setError(e.message || 'Failed to load your ledger'))
      .finally(() => setLoading(false))
  }, [userId])

  const verifiedCount = entries.filter(e => e.verified).length
  const totalTrees    = entries.reduce((s, e) => s + (e.trees || 0), 0)
  const totalAmount   = entries.reduce((s, e) => s + (e.amount || 0), 0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e =>
      (status === 'all' || (status === 'verified' ? e.verified : !e.verified)) &&
      (!q || e.project.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
    )
  }, [entries, search, status])

  const pg = usePagination(filtered, 10, `${status}|${search}`)

  const TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all',      label: 'All',               count: entries.length },
    { key: 'verified', label: 'Verified',          count: verifiedCount },
    { key: 'pending',  label: 'Awaiting evidence', count: entries.length - verifiedCount },
  ]

  return (
    <IndividualLayout title="My Ledger" subtitle="Every tree you've funded · verified as evidence arrives">

      {error && <div className="db-error-banner">⚠ {error}</div>}

      {/* Summary */}
      <div className="ml-summary">
        <div className="db-card ml-stat">
          <span className="ml-stat__num">{loading ? '—' : entries.length}</span>
          <span className="ml-stat__label">Ledger entries</span>
        </div>
        <div className="db-card ml-stat">
          <span className="ml-stat__num">{loading ? '—' : totalTrees.toLocaleString('en-IN')}</span>
          <span className="ml-stat__label">Trees funded</span>
        </div>
        <div className="db-card ml-stat">
          <span className="ml-stat__num">{loading ? '—' : verifiedCount}</span>
          <span className="ml-stat__label">Verified</span>
        </div>
        <div className="db-card ml-stat ml-stat--dark">
          <span className="ml-stat__num">{loading ? '—' : fmtINR(totalAmount)}</span>
          <span className="ml-stat__label">Total contributed</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="ml-toolbar">
        <div className="ml-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              className={`ml-tab${status === t.key ? ' ml-tab--active' : ''}`}
              onClick={() => setStatus(t.key)}
            >
              {t.label} <span className="ml-tab__count">{t.count}</span>
            </button>
          ))}
        </div>
        <label className="ml-search">
          <Search size={14} />
          <input
            type="search"
            placeholder="Search by project or entry ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Table */}
      <div className="db-card ml-table-card">
        {loading ? (
          <div className="ml-loading">
            {[1, 2, 3, 4].map(i => <div key={i} className="db-skel ml-skel-row" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="ml-empty">
            <div className="ml-empty__icon">🌱</div>
            <div className="ml-empty__title">Your ledger is empty</div>
            <div className="ml-empty__sub">Fund your first trees — each funding becomes an entry here.</div>
            <button type="button" className="db-cta-btn" onClick={() => navigate('/impact/projects')}>Browse projects</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ml-empty">
            <div className="ml-empty__title">No entries match</div>
            <div className="ml-empty__sub">Try a different search or filter.</div>
          </div>
        ) : (
          <div className="ml-table-scroll">
            <table className="ml-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th className="ml-num">Trees</th>
                  <th className="ml-num">tCO₂e</th>
                  <th className="ml-num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pg.items.map(e => (
                  <tr
                    key={e.id}
                    className="ml-row"
                    onClick={() => e.projectId && navigate(`/impact/projects/${e.projectId}`)}
                    title="Open project"
                  >
                    <td><span className="ml-id">#{e.id.slice(0, 8).toUpperCase()}</span></td>
                    <td className="ml-muted">{fmtDate(e.date)}</td>
                    <td>
                      <div className="ml-project">{e.project}</div>
                      {e.location && <div className="ml-loc">{e.location}</div>}
                    </td>
                    <td className="ml-num">{e.trees.toLocaleString('en-IN')}</td>
                    <td className="ml-num">{e.tCO2e}</td>
                    <td className="ml-num ml-strong">{e.amount > 0 ? fmtINR(e.amount) : '—'}</td>
                    <td>
                      {e.verified ? (
                        <span className="ih-badge ih-badge--verified"><CheckCircle2 size={11} /> Verified</span>
                      ) : (
                        <span className="ih-badge ih-badge--in-progress"><Clock size={11} /> Awaiting evidence</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && <div className="ml-pager"><Pagination {...pg} noun="record" /></div>}
      </div>
    </IndividualLayout>
  )
}

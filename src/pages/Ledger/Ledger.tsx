import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CheckCircle, Search, Sprout, HandCoins, Download, ChevronLeft, ChevronRight, ChevronDown, MapPin, ExternalLink,
} from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLedger } from '../../hooks/useLedger'
import { fetchLedgerProjects, ledgerExportUrl } from '../../services/api'
import type { LedgerEntry, LedgerEntryType } from '../../types'
import './Ledger.css'

const PAGE_SIZE = 25
const COLUMNS = 8

// Short, human-readable ref from the order id's random suffix (e.g. "#KOXDP").
function shortRef(id: string): string {
  return `#${id.split('-').pop()?.toUpperCase() ?? id}`
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function projectHref(entry: LedgerEntry): string | null {
  const key = entry.projectSlug || entry.projectId
  return key ? `/projects/${encodeURIComponent(key)}` : null
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="ledger__detail-item">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function EntryDetails({ entry }: { entry: LedgerEntry }) {
  const tree = entry.tree
  const href = projectHref(entry)

  return (
    <div className="ledger__detail">
      {tree && tree.photos.length > 0 && (
        <div className="ledger__photos">
          {tree.photos.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="ledger__photo">
              <img src={url} alt={`${tree.species || 'Tree'} photo ${i + 1}`} loading="lazy" />
            </a>
          ))}
        </div>
      )}

      <dl className="ledger__detail-grid">
        {tree?.species && (
          <DetailItem label="Species">
            {tree.species}
            {tree.scientificName && <em className="ledger__sci-name"> {tree.scientificName}</em>}
          </DetailItem>
        )}
        {tree?.code && <DetailItem label="Tree tag">{tree.code}</DetailItem>}
        {tree?.condition && <DetailItem label="Condition">{tree.condition}</DetailItem>}
        {tree?.heightM != null && <DetailItem label="Height">{tree.heightM} m</DetailItem>}
        {tree?.plantedOn && <DetailItem label="Planted on">{formatDate(tree.plantedOn)}</DetailItem>}
        {tree?.lat != null && tree?.lng != null && (
          <DetailItem label="GPS">
            <a
              href={`https://www.google.com/maps?q=${tree.lat},${tree.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ledger__detail-link"
            >
              <MapPin size={13} /> {tree.lat.toFixed(5)}, {tree.lng.toFixed(5)}
            </a>
          </DetailItem>
        )}

        {entry.type === 'funded' && <DetailItem label="Reference">{shortRef(entry.id)}</DetailItem>}
        {entry.type === 'funded' && <DetailItem label="Funded on">{formatDate(entry.date)}</DetailItem>}
        {entry.verifiedAt && <DetailItem label="Verified on">{formatDate(entry.verifiedAt)}</DetailItem>}
        {entry.projectLocation && <DetailItem label="Project location">{entry.projectLocation}</DetailItem>}
        {entry.partner && <DetailItem label="Planting partner">{entry.partner}</DetailItem>}
        <DetailItem label="Entry ID"><code className="ledger__entry-id">{entry.id}</code></DetailItem>
      </dl>

      <p className="ledger__detail-note">
        {entry.type === 'funded'
          ? 'Funded tCO₂e is an estimate. Trees are verified separately as planting evidence is approved on this project.'
          : tree
            ? 'Captured on the ground by the field team with photo and GPS, then approved by a reviewer.'
            : 'Verified from evidence submitted by the planting partner and approved by a reviewer.'}
        {href && (
          <>
            {' '}
            <Link to={href} className="ledger__detail-link">
              {entry.type === 'funded' ? 'See planting progress' : 'View project'} <ExternalLink size={12} />
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

export default function Ledger() {
  const location = useLocation()
  const [search, setSearch] = useState(() => {
    // Pre-populate search from ?q= query param (e.g. linked from ProjectDetail)
    return new URLSearchParams(location.search).get('q') ?? ''
  })
  const [type, setType]         = useState<LedgerEntryType | ''>('')
  const [project, setProject]   = useState('')
  const [page, setPage]         = useState(0)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  const { entries, total, summary, stats, loading, error, search: appliedSearch } = useLedger({
    search, type, project, limit: PAGE_SIZE, offset: page * PAGE_SIZE,
  })

  // Sync if the URL changes while the component is mounted
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') ?? ''
    setSearch(q)
    setPage(0)
  }, [location.search])

  useEffect(() => {
    fetchLedgerProjects().then(setProjects).catch(() => { /* dropdown just stays empty */ })
  }, [])

  // Collapse any open row when the visible page changes
  useEffect(() => { setExpanded(null) }, [entries])

  // Esc closes the open row
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstShown = total === 0 ? 0 : page * PAGE_SIZE + 1
  const lastShown  = Math.min(total, (page + 1) * PAGE_SIZE)
  const filtered   = !!(appliedSearch || type || project)

  const toggle = (id: string) => setExpanded(cur => (cur === id ? null : id))

  return (
    <div className="ledger">
      <Navbar />

      {/* Header */}
      <div className="ledger__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>PUBLIC LEDGER</p>
          <h1 className="ledger__title">Every entry, open to anyone</h1>
          <p className="ledger__sub">
            Every funding and verified planting entry is written here. Nothing counts until it's on the ledger.
          </p>
          <div className="ledger__stats">
            <div className="ledger__stat">
              <span className="stat-number">{stats.treesFunded.toLocaleString()}</span>
              <span>trees funded</span>
            </div>
            <div className="ledger__stat">
              <span className="stat-number">{stats.tCO2eVerified.toLocaleString()} tCO₂e</span>
              <span>verified</span>
            </div>
            <div className="ledger__stat">
              <span className="stat-number">{total.toLocaleString()}</span>
              <span>{filtered ? 'matching entries' : 'ledger entries'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="ledger__search-bar">
        <div className="container ledger__toolbar">
          <div className="ledger__search-wrap">
            <Search size={16} className="ledger__search-icon" />
            <input
              type="text"
              placeholder="Search by project, funder, or reference (e.g. #KOXDP)..."
              className="ledger__search-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <select
            className="ledger__select"
            value={type}
            onChange={(e) => { setType(e.target.value as LedgerEntryType | ''); setPage(0) }}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="planted">Planted</option>
            <option value="funded">Funded</option>
          </select>
          <select
            className="ledger__select ledger__select--project"
            value={project}
            onChange={(e) => { setProject(e.target.value); setPage(0) }}
            aria-label="Filter by project"
          >
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <a
            className="ledger__export"
            href={ledgerExportUrl({ search: appliedSearch, type, project })}
            download
          >
            <Download size={15} /> CSV
          </a>
        </div>
      </div>

      <div className="container ledger__body">
        {/* Totals for the current filters */}
        {summary && (
          <div className="ledger__summary">
            {type !== 'planted' && (
              <div className="ledger__summary-item">
                <span className="ledger__summary-value ledger__summary-value--funded">
                  {summary.treesFunded.toLocaleString()}
                </span>
                <span className="ledger__summary-label">Trees funded</span>
              </div>
            )}
            {type !== 'funded' && (
              <div className="ledger__summary-item">
                <span className="ledger__summary-value ledger__summary-value--planted">
                  {summary.treesPlanted.toLocaleString()}
                </span>
                <span className="ledger__summary-label">Trees planted &amp; verified</span>
              </div>
            )}
            {type !== 'funded' && (
              <div className="ledger__summary-item">
                <span className="ledger__summary-value">{summary.tCO2eVerified.toLocaleString()}</span>
                <span className="ledger__summary-label">tCO₂e verified</span>
              </div>
            )}
            {type !== 'planted' && (
              <div className="ledger__summary-item">
                <span className="ledger__summary-value ledger__summary-value--muted">
                  ~{summary.tCO2eEstimated.toLocaleString()}
                </span>
                <span className="ledger__summary-label">tCO₂e estimated (funded)</span>
              </div>
            )}
            {filtered && <span className="ledger__summary-scope">for current filters</span>}
          </div>
        )}

        {/* Table */}
        <div className="ledger__table-wrap">
          <table className="ledger__table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Project</th>
                <th>Funder</th>
                <th>Trees</th>
                <th>tCO₂e</th>
                <th>Status</th>
                <th aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLUMNS} className="ledger__empty">Loading entries…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={COLUMNS} className="ledger__empty">Failed to load entries. Please try again.</td>
                </tr>
              )}
              {!loading && !error && entries.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS} className="ledger__empty">No entries match your search.</td>
                </tr>
              )}
              {!loading && !error && entries.map((entry) => {
                const href = projectHref(entry)
                const open = expanded === entry.id
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      className={`ledger__row ledger__row--clickable${open ? ' ledger__row--open' : ''}`}
                      onClick={() => toggle(entry.id)}
                    >
                      <td className="ledger__type">
                        {entry.type === 'planted' ? (
                          <span className="ledger__type-label ledger__type-label--planted">
                            <Sprout size={14} /> Planted
                          </span>
                        ) : (
                          <span className="ledger__type-label ledger__type-label--funded">
                            <HandCoins size={14} /> Funded
                            <span className="ledger__ref">· {shortRef(entry.id)}</span>
                          </span>
                        )}
                      </td>
                      <td className="ledger__date">{entry.date}</td>
                      <td className="ledger__project">
                        {href ? (
                          <Link to={href} className="ledger__project-link" onClick={(e) => e.stopPropagation()}>
                            {entry.project}
                          </Link>
                        ) : entry.project}
                        {entry.projectLocation && <span className="ledger__location">{entry.projectLocation}</span>}
                      </td>
                      <td className="ledger__funder">{entry.funderLabel}</td>
                      <td className="ledger__trees">{entry.trees.toLocaleString()}</td>
                      <td className="ledger__co2">
                        {entry.estimated ? (
                          <span
                            className="ledger__co2--est"
                            title="Estimated at funding time. Verified tCO₂e is recorded when planting evidence is approved."
                          >
                            ~{entry.tCO2e} <span className="ledger__est-tag">est.</span>
                          </span>
                        ) : entry.tCO2e > 0 ? entry.tCO2e : (
                          <span className="ledger__co2--none" title="tCO₂e not recorded for this entry">—</span>
                        )}
                      </td>
                      <td>
                        {entry.verified ? (
                          <span className="badge badge-verified">
                            <CheckCircle size={11} /> Verified
                          </span>
                        ) : (
                          <span
                            className="badge badge-recorded"
                            title="Funding recorded. Trees are verified separately when planting evidence is approved."
                          >
                            Recorded
                          </span>
                        )}
                      </td>
                      <td className="ledger__expand-cell">
                        <button
                          type="button"
                          className="ledger__expand-btn"
                          aria-expanded={open}
                          aria-label={open ? 'Hide details' : 'Show details'}
                          onClick={(e) => { e.stopPropagation(); toggle(entry.id) }}
                        >
                          <ChevronDown size={16} />
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="ledger__detail-row">
                        <td colSpan={COLUMNS}>
                          <EntryDetails entry={entry} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="ledger__pager">
            <span className="ledger__pager-info">
              Showing {firstShown.toLocaleString()}–{lastShown.toLocaleString()} of {total.toLocaleString()}
            </span>
            <div className="ledger__pager-btns">
              <button
                className="ledger__pager-btn"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="ledger__pager-page">Page {page + 1} of {pageCount}</span>
              <button
                className="ledger__pager-btn"
                onClick={() => setPage(p => p + 1)}
                disabled={page + 1 >= pageCount || loading}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        <p className="ledger__note">
          Entries are never edited in place: a correction is written as a new entry that replaces the old one.
          Funded tCO₂e is an estimate until planting is verified. Click any row for photos, GPS and full details.
        </p>
      </div>

      <Footer />
    </div>
  )
}

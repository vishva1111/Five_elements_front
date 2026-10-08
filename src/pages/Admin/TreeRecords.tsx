import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Camera, Eye, LayoutGrid, Map as MapIcon, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import AdminLayout from './AdminLayout'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import TreeMap from '../../components/map/TreeMap'
import TreeDetailModal from '../../components/tree/TreeHistory'
import PhotoLightbox from '../../components/tree/PhotoLightbox'
import { taskStatus, conditionTone, conditionColor, capitalise, formatDate, DEFAULT_PROJECT_COLOR } from '../../components/tree/treeLabels'
import './TreeRecords.css'

interface LatestAudit {
  round: number
  status: string
  date: string | null
  condition: string | null
  health: string | null
  survival: string | null
  photo: string | null
}

interface TreeRecord {
  id: string
  tree_code: string
  user_id: string
  project_id: string | null
  project_name: string | null
  project_color: string | null
  photo_url: string
  photo_urls: string[]
  photo_count: number
  latitude: number | null
  longitude: number | null
  species: string
  health_status: string
  tree_condition: string | null
  stage: string | null
  notes: string | null
  submitted_at: string
  survey_date: string | null
  synced: boolean
  audit_count: number
  latest_audit: LatestAudit | null
}

// Refetch on this interval instead of a live push subscription — new
// captures show up within POLL_MS instead of instantly, in exchange for the
// admin gallery not needing its own Supabase realtime connection.
const POLL_MS = 60_000

const hasPoint = (r: TreeRecord) => Number(r.latitude) !== 0 && Number(r.longitude) !== 0 && r.latitude != null && r.longitude != null
const conditionOf = (r: TreeRecord) => (r.latest_audit?.condition || r.tree_condition || r.health_status || '').trim()

export default function TreeRecords() {
  const { session } = useAuth()
  const [records, setRecords] = useState<TreeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'cards' | 'map'>('cards')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ photos: { url: string; label?: string }[]; start: number } | null>(null)

  const [condition, setCondition] = useState('all')
  const [project, setProject] = useState('all')
  const [auditFilter, setAuditFilter] = useState('all')
  const [stage, setStage] = useState('all')
  const [search, setSearch] = useState('')

  const fetchRecords = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/tree-records?with=audit&limit=1000`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load tree records')
      setRecords(json.records || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load tree records')
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    fetchRecords()
    // Background refresh only while this tab is open in front of someone.
    const tick = () => { if (document.visibilityState === 'visible') fetchRecords(false) }
    const interval = setInterval(tick, POLL_MS)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [fetchRecords])

  const options = useMemo(() => ({
    conditions: [...new Set(records.map(conditionOf).map(c => c.toLowerCase()).filter(Boolean))].sort(),
    projects: [...new Map(records.filter(r => r.project_id).map(r => [r.project_id!, r.project_name || r.project_id!])).entries()].sort((a, b) => a[1].localeCompare(b[1])),
    audits: [...new Set(records.map(r => r.latest_audit?.status || 'none'))],
    stages: [...new Set(records.map(r => r.stage).filter(Boolean) as string[])].sort(),
  }), [records])

  const q = search.trim().toLowerCase()
  const filtered = records.filter(r =>
    (condition === 'all' || conditionOf(r).toLowerCase() === condition) &&
    (project === 'all' || r.project_id === project) &&
    (auditFilter === 'all' || (r.latest_audit?.status || 'none') === auditFilter) &&
    (stage === 'all' || r.stage === stage) &&
    (!q || [r.tree_code, r.species, r.project_name || ''].some(v => v.toLowerCase().includes(q))))
  const filtersOn = condition !== 'all' || project !== 'all' || auditFilter !== 'all' || stage !== 'all' || !!q

  // Keyed on the filters so the background poll doesn't throw you back to page 1.
  const pg = usePagination(filtered, 10, `${condition}|${project}|${auditFilter}|${stage}|${q}`)

  const stats = {
    total: filtered.length,
    healthy: filtered.filter(r => ['healthy', 'alive', 'good'].includes(conditionOf(r).toLowerCase())).length,
    attention: filtered.filter(r => ['average', 'moderate', 'stressed', 'sick', 'fair', 'poor', 'diseased', 'damaged'].includes(conditionOf(r).toLowerCase())).length,
    dead: filtered.filter(r => ['dead', 'missing'].includes(conditionOf(r).toLowerCase())).length,
    audited: filtered.filter(r => r.audit_count > 0).length,
  }

  return (
    <AdminLayout title="Tree Records" subtitle="Every tree, its photos and its audit history">
      <div className="tree-records-page">
        {/* Header */}
        <div className="tr-header">
          <div>
            <h1 className="tr-title">🌳 Tree Records</h1>
            <p className="tr-subtitle">Photos, location, condition and the full audit history of every tree — synced from the mobile app</p>
          </div>
          <button className="tr-refresh-btn" onClick={() => fetchRecords()} disabled={loading}>
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="tr-stats" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <div className="tr-stat-card tr-stat-total"><span className="tr-stat-num">{stats.total}</span><span className="tr-stat-label">Trees</span></div>
          <div className="tr-stat-card tr-stat-healthy"><span className="tr-stat-num">{stats.healthy}</span><span className="tr-stat-label">✅ Healthy</span></div>
          <div className="tr-stat-card tr-stat-sick"><span className="tr-stat-num">{stats.attention}</span><span className="tr-stat-label">⚠️ Needs attention</span></div>
          <div className="tr-stat-card tr-stat-dead"><span className="tr-stat-num">{stats.dead}</span><span className="tr-stat-label">❌ Dead / missing</span></div>
          <div className="tr-stat-card tr-stat-total"><span className="tr-stat-num">{stats.audited}</span><span className="tr-stat-label">🔍 Audited</span></div>
        </div>

        {/* Filters */}
        <div className="tr-filters" style={{ alignItems: 'center' }}>
          <input
            type="search"
            aria-label="Search trees"
            placeholder="Search tree ID, species or project"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selectCss, minWidth: 230 }}
          />
          <select aria-label="Condition" value={condition} onChange={e => setCondition(e.target.value)} style={selectCss}>
            <option value="all">Any condition</option>
            {options.conditions.map(c => <option key={c} value={c}>{capitalise(c)}</option>)}
          </select>
          <select aria-label="Project" value={project} onChange={e => setProject(e.target.value)} style={selectCss}>
            <option value="all">All projects</option>
            {options.projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select aria-label="Stage" value={stage} onChange={e => setStage(e.target.value)} style={selectCss}>
            <option value="all">Any stage</option>
            {options.stages.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select aria-label="Latest audit" value={auditFilter} onChange={e => setAuditFilter(e.target.value)} style={selectCss}>
            <option value="all">Any audit</option>
            {options.audits.map(a => <option key={a} value={a}>{a === 'none' ? 'No audit yet' : `Latest audit: ${taskStatus(a).label}`}</option>)}
          </select>
          {filtersOn && (
            <button type="button" className="tr-filter-btn" onClick={() => { setSearch(''); setCondition('all'); setProject('all'); setStage('all'); setAuditFilter('all') }}>
              <X size={13} style={{ verticalAlign: -2 }} /> Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2, padding: 3, background: '#EFEAE3', borderRadius: 10 }}>
            {([['cards', <LayoutGrid size={15} key="i" />, 'Cards'], ['map', <MapIcon size={15} key="i" />, 'Map']] as const).map(([v, icon, label]) => (
              <button key={v} type="button" onClick={() => setView(v)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                background: view === v ? '#fff' : 'transparent', boxShadow: view === v ? '0 1px 3px rgba(17,33,33,0.12)' : 'none', fontWeight: view === v ? 700 : 600, color: view === v ? '#1C2B22' : '#6B7B6E',
              }}>{icon}{label}</button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="tr-error">
            ⚠️ {error}
            {error.includes('tree_records') && (
              <span> — Please create the <code>tree_records</code> table in Supabase first.</span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && <div className="tr-loading">Loading tree records...</div>}

        {/* Empty */}
        {!loading && !error && records.length === 0 && (
          <div className="tr-empty">
            <span className="tr-empty-icon">🌱</span>
            <p>No tree records yet.</p>
            <p className="tr-empty-sub">Records will appear here when field users submit from the mobile app.</p>
          </div>
        )}
        {!loading && records.length > 0 && filtered.length === 0 && (
          <div className="tr-empty"><span className="tr-empty-icon">🔍</span><p>No trees match these filters.</p></div>
        )}

        {/* Map */}
        {!loading && filtered.length > 0 && view === 'map' && (
          <>
            <TreeMap
              height={560}
              points={filtered.filter(hasPoint).map(r => ({
                id: r.id, latitude: Number(r.latitude), longitude: Number(r.longitude), color: conditionColor(conditionOf(r)),
                label: `${r.tree_code} · ${r.species}`,
                sublabel: [r.project_name, conditionOf(r) && capitalise(conditionOf(r)), r.audit_count ? `${r.audit_count} audit${r.audit_count === 1 ? '' : 's'}` : 'no audit'].filter(Boolean).join(' · '),
              }))}
              onPointClick={setDetailId}
              emptyText="None of these trees has a GPS location."
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#6B7B6E', margin: '10px 0' }}>
              {['Healthy', 'Average', 'Poor', 'Dead'].map(c => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: conditionColor(c) }} />{c}</span>
              ))}
              <span style={{ marginLeft: 'auto' }}>{filtered.filter(hasPoint).length} of {filtered.length} trees have a location · click a dot for details</span>
            </div>
          </>
        )}

        {/* Records Grid */}
        {!loading && filtered.length > 0 && view === 'cards' && (
          <div className="tr-grid">
            {pg.items.map(record => {
              const photos = record.photo_urls.length ? record.photo_urls : record.photo_url ? [record.photo_url] : []
              const cover = record.latest_audit?.photo || photos[photos.length - 1] || null
              const cond = conditionOf(record)
              const tone = conditionTone(cond)
              const la = record.latest_audit
              const laStatus = la ? taskStatus(la.status) : null
              return (
                <div key={record.id} className="tr-card">
                  {/* Photo */}
                  <div className="tr-photo-wrap" onClick={() => photos.length ? setViewer({ photos: photos.map((u, i) => ({ url: u, label: `${record.tree_code} · photo ${i + 1}` })), start: Math.max(0, photos.indexOf(cover || '')) }) : setDetailId(record.id)}>
                    {cover ? (
                      <img src={cover} alt={record.species} className="tr-photo" loading="lazy" />
                    ) : (
                      <div className="tr-photo-placeholder">📷</div>
                    )}
                    <div className="tr-photo-overlay">🔍 {photos.length > 1 ? `View all ${photos.length}` : 'View'}</div>
                    {record.photo_count > 0 && (
                      <span style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(17,33,33,0.72)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                        <Camera size={12} /> {record.photo_count}
                      </span>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div style={{ display: 'flex', gap: 4, padding: '6px 12px 0' }}>
                      {photos.slice(-5).map((u, i) => (
                        <img key={u} src={u} alt="" loading="lazy" onClick={() => setViewer({ photos: photos.map((x, j) => ({ url: x, label: `${record.tree_code} · photo ${j + 1}` })), start: photos.indexOf(u) })}
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid #EEE9E1', cursor: 'zoom-in' }} />
                      ))}
                    </div>
                  )}

                  {/* Info */}
                  <div className="tr-card-body">
                    <div className="tr-card-top">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#2B5341' }}>{record.tree_code}</div>
                        <h3 className="tr-species">{record.species}</h3>
                      </div>
                      {cond && <span className="tr-health-badge" style={{ background: tone.bg, color: tone.fg }}>{capitalise(cond)}</span>}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
                      {record.stage && <span style={{ fontSize: 11, fontWeight: 700, background: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: 999 }}>{record.stage}</span>}
                      {record.health_status && record.health_status.toLowerCase() !== cond.toLowerCase() && (() => { const t = conditionTone(record.health_status); return <span style={{ fontSize: 11, fontWeight: 700, background: t.bg, color: t.fg, padding: '2px 8px', borderRadius: 999 }}>{capitalise(record.health_status)}</span> })()}
                    </div>

                    {record.notes && <p className="tr-notes">"{record.notes}"</p>}

                    <div className="tr-meta">
                      {/* Desk-entered trees can be saved without coordinates */}
                      {hasPoint(record) ? (
                        <>
                          <span className="tr-meta-item">📍 {Number(record.latitude).toFixed(4)}, {Number(record.longitude).toFixed(4)}</span>
                          <a href={`https://www.openstreetmap.org/?mlat=${record.latitude}&mlon=${record.longitude}&zoom=17`} target="_blank" rel="noopener noreferrer" className="tr-map-link">View on Map ↗</a>
                        </>
                      ) : (
                        <span className="tr-meta-item">📍 No GPS location</span>
                      )}
                    </div>

                    {record.project_name && (
                      <div className="tr-project" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: record.project_color || DEFAULT_PROJECT_COLOR }} /> {record.project_name}
                      </div>
                    )}

                    {/* Latest audit, highlighted */}
                    <div style={{ borderRadius: 10, padding: '8px 10px', margin: '8px 0', background: la ? '#F5FAF2' : '#FAF8F4', border: `1px solid ${la ? '#CFE5C9' : '#EEE9E1'}` }}>
                      {la && laStatus ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1C2B22' }}>
                            ★ Latest: Audit {la.round}
                            <span style={{ marginLeft: 'auto', background: laStatus.bg, color: laStatus.fg, padding: '1px 7px', borderRadius: 999, fontSize: 10.5 }}>{laStatus.label}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 3 }}>
                            {formatDate(la.date)}{la.condition ? ` · ${la.condition}` : ''}{la.survival ? ` · ${capitalise(la.survival)}` : ''}{record.audit_count > 1 ? ` · ${record.audit_count} audits` : ''}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 11.5, color: '#9AA79C' }}>No audit submitted yet</div>
                      )}
                    </div>

                    <button type="button" onClick={() => setDetailId(record.id)} className="tr-refresh-btn" style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Eye size={14} /> Full details &amp; audit history
                    </button>
                    <div className="tr-date" style={{ marginTop: 8 }}>{formatDate(record.submitted_at, true)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!loading && view === 'cards' && <Pagination {...pg} noun="record" />}

        {detailId && <TreeDetailModal historyUrl={`${API}/api/admin/tree-records/${detailId}/history`} onClose={() => setDetailId(null)} />}
        {viewer && <PhotoLightbox photos={viewer.photos} start={viewer.start} onClose={() => setViewer(null)} />}
      </div>
    </AdminLayout>
  )
}

const selectCss: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#fff', outline: 'none', fontFamily: 'inherit',
}

/** Partner "Audit schedule": audits that are coming up, and trees found dead or missing (their audits stop). */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { formatDate } from '../../components/tree/treeLabels'
import '../Partner/Partner.css'

type LayoutProps = { title: string; subtitle?: string; children: React.ReactNode }

interface Upcoming {
  id: string
  round: number
  /** planned: opens later · open: already in Tasks, not done yet */
  state: 'planned' | 'open'
  taskCode: string | null
  dueAt: string
  plannedAt: string
  treeId: string
  treeCode: string | null
  species: string | null
  projectId: string
  project: string
}

interface Gone {
  treeId: string
  treeCode: string | null
  species: string | null
  projectId: string
  project: string
  status: 'dead' | 'missing'
  round: number | null
  foundAt: string | null
  foundBy: string | null
  notes: string | null
}

type Tab = 'upcoming' | 'gone'

const field: React.CSSProperties = { height: 34, padding: '0 10px', borderRadius: 8, border: '1.5px solid #E0D9D0', fontFamily: 'inherit', fontSize: 13, background: '#fff' }
const GONE_CHIP = {
  dead:    { label: 'Dead',    bg: '#EDE7E7', fg: '#5E2B2B' },
  missing: { label: 'Missing', bg: '#FFF4E0', fg: '#8B5A00' },
}

/** "in 12 days", "today", "3 days late" */
function dueText(iso: string) {
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000)
  if (days === 0) return 'today'
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`
  return `${-days} day${days === -1 ? '' : 's'} late`
}

/** Audit schedule: audits still to come and dead/missing trees. `role` picks a partner's own projects or everyone's. */
export default function AuditSchedule({ Layout, role }: { Layout: React.ComponentType<LayoutProps>; role: 'partner' | 'admin' }) {
  const { session } = useAuth()
  const token = session?.access_token || ''

  const [tab, setTab] = useState<Tab>('upcoming')
  const [projectId, setProjectId] = useState('')
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [upcoming, setUpcoming] = useState<Upcoming[]>([])
  const [gone, setGone] = useState<Gone[]>([])
  const [total, setTotal] = useState(4)
  const [months, setMonths] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/${role}/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProjects((d.projects || []).map((p: { id: string; name?: string; title?: string }) => ({ id: p.id, name: p.name || p.title || p.id }))))
      .catch(() => setProjects([]))
  }, [token, role])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    const qs = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    fetch(`${API}/api/${role}/audit-schedule${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load the audit schedule')
        setUpcoming(d.upcoming || [])
        setGone(d.deadOrMissing || [])
        setTotal(d.total || 4)
        setMonths(d.intervalMonths || 3)
      })
      .catch(e => { setUpcoming([]); setGone([]); setError(e.message) })
      .finally(() => setLoading(false))
  }, [projectId, token, role])
  useEffect(() => { load() }, [load])

  const dueSoon = useMemo(() => upcoming.filter(u => new Date(u.dueAt).getTime() - Date.now() <= 30 * 86400000).length, [upcoming])
  const upPg = usePagination(upcoming, 10, `${projectId}|up`)
  const gonePg = usePagination(gone, 10, `${projectId}|gone`)

  const tabBtn = (key: Tab, label: string, n: number) => (
    <button key={key} type="button" onClick={() => setTab(key)}
      style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 999, background: tab === key ? '#2B5341' : 'transparent', color: tab === key ? '#fff' : '#6B7B6E' }}>
      {label} <span style={{ opacity: 0.8, fontWeight: 600 }}>({n})</span>
    </button>
  )

  return (
    <Layout title="Audit schedule" subtitle={`Every tree gets ${total} audits, ${months} months apart`}>
      <div style={role === 'admin' ? { padding: 24 } : undefined}>
      <div className="pl-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 999, background: '#F2EFEA' }}>
          {tabBtn('upcoming', 'Upcoming audits', upcoming.length)}
          {tabBtn('gone', 'Dead & missing', gone.length)}
        </div>
        <select aria-label="Project" style={{ ...field, marginLeft: 'auto' }} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {error && <div className="pl-card" style={{ padding: 14, marginBottom: 16, color: '#A32020' }}>{error}</div>}

      <div className="pl-stats" style={{ marginBottom: 16, flexShrink: 0 }}>
        <div className="pl-stat"><div className="pl-stat__num">{loading ? '–' : upcoming.length}</div><div className="pl-stat__label">Audits to come</div></div>
        <div className="pl-stat"><div className="pl-stat__num">{loading ? '–' : dueSoon}</div><div className="pl-stat__label">Due in 30 days</div></div>
        <div className="pl-stat"><div className="pl-stat__num">{loading ? '–' : gone.filter(g => g.status === 'dead').length}</div><div className="pl-stat__label">Dead trees</div></div>
        <div className="pl-stat"><div className="pl-stat__num">{loading ? '–' : gone.filter(g => g.status === 'missing').length}</div><div className="pl-stat__label">Missing trees</div></div>
      </div>

      <div className="pl-card" style={{ padding: 0, flexShrink: 0 }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="pl-skel" style={{ height: 40, borderRadius: 8 }} />)}
          </div>
        ) : tab === 'upcoming' ? (
          upcoming.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">🗓️</div>
              <div className="pl-empty__title">No audits planned yet</div>
              <div className="pl-empty__sub">When an audit is approved, the next one is planned for {months} months later and appears here. It moves to Tasks on that date, and you assign it to a field operator.</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="pl-table">
                  <thead><tr><th>Tree</th><th>Project</th><th>Audit</th><th>Task ID</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {upPg.items.map(u => (
                      <tr key={u.id}>
                        <td>
                          {u.treeCode && <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2B5341' }}>{u.treeCode}</span>}
                          {u.species && <div style={{ fontSize: 11.5, color: '#7A867C' }}>{u.species}</div>}
                        </td>
                        <td style={{ color: '#6B7B6E' }}>{u.project}</td>
                        <td style={{ fontWeight: 700 }}>Audit {u.round} of {total}</td>
                        <td>{u.taskCode ? <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#185FA5' }}>{u.taskCode}</span> : '—'}</td>
                        <td>
                          {u.state === 'open'
                            ? <span style={{ background: '#E8F1FB', color: '#185FA5', padding: '2px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>In Tasks</span>
                            : <span style={{ background: '#FFF4E0', color: '#8B5A00', padding: '2px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>Opens later</span>}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {formatDate(u.dueAt)}
                          <div style={{ fontSize: 11.5, color: new Date(u.dueAt).getTime() <= Date.now() ? '#8B5A00' : '#9AA79C' }}>{dueText(u.dueAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '0 12px 14px' }}><Pagination {...upPg} noun="audit" /></div>
            </>
          )
        ) : gone.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">🌳</div>
            <div className="pl-empty__title">No dead or missing trees</div>
            <div className="pl-empty__sub">A tree found dead or missing in an audit is listed here, and its remaining audits are not scheduled.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="pl-table">
                <thead><tr><th>Tree</th><th>Project</th><th>Status</th><th>Found in</th><th>Date</th><th>Reported by</th><th>Notes</th></tr></thead>
                <tbody>
                  {gonePg.items.map(g => {
                    const chip = GONE_CHIP[g.status]
                    return (
                      <tr key={g.treeId}>
                        <td>
                          {g.treeCode && <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2B5341' }}>{g.treeCode}</span>}
                          {g.species && <div style={{ fontSize: 11.5, color: '#7A867C' }}>{g.species}</div>}
                        </td>
                        <td style={{ color: '#6B7B6E' }}>{g.project}</td>
                        <td><span style={{ background: chip.bg, color: chip.fg, padding: '2px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>{chip.label}</span></td>
                        <td>{g.round ? `Audit ${g.round}` : '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', color: '#6B7B6E' }}>{g.foundAt ? formatDate(g.foundAt) : '—'}</td>
                        <td>{g.foundBy || '—'}</td>
                        <td style={{ color: '#6B7B6E', maxWidth: 260 }}>{g.notes || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 12px 14px' }}><Pagination {...gonePg} noun="tree" /></div>
          </>
        )}
      </div>
      </div>
    </Layout>
  )
}

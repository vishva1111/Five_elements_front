/** Partner "Activity" report: what the field app has been doing, filtered by date, with a CSV download. */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PartnerLayout from './PartnerLayout'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { formatDate } from '../../components/tree/treeLabels'
import './Partner.css'

interface ActivityEvent {
  at: string
  type: string
  label: string
  projectId: string
  project: string
  personId: string | null
  person: string
  treeCode: string | null
  species: string | null
  taskCode: string | null
  detail: string | null
  status: string | null
}

/** The kinds of activity, in the order the filter shows them. */
const TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'tree_added',     label: 'Trees added',        icon: '🌳' },
  { key: 'task_created',   label: 'Tasks created',      icon: '📌' },
  { key: 'task_completed', label: 'Tasks completed',    icon: '✅' },
  { key: 'task_approved',  label: 'Tasks approved',     icon: '👍' },
  { key: 'task_rejected',  label: 'Tasks rejected',     icon: '↩️' },
  { key: 'audit_round',    label: 'Audit rounds',       icon: '🔍' },
  { key: 'fence_locked',   label: 'Land fence locked',  icon: '🔒' },
  { key: 'fence_request',  label: 'Fence requests',     icon: '✋' },
  { key: 'fence_decided',  label: 'Fence decisions',    icon: '⚖️' },
]
const TYPE_ICON = Object.fromEntries(TYPES.map(t => [t.key, t.icon]))

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d) }

type Preset = 'today' | '7' | '30' | 'custom'

function csvCell(v: unknown) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(rows: ActivityEvent[], from: string, to: string) {
  const head = ['Date', 'Time', 'Project', 'Person', 'Activity', 'Task ID', 'Tree ID', 'Species', 'Detail', 'Status']
  const lines = rows.map(e => {
    const d = new Date(e.at)
    return [
      d.toLocaleDateString('en-GB'),
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      e.project, e.person, e.label, e.taskCode, e.treeCode, e.species, e.detail, e.status,
    ].map(csvCell).join(',')
  })
  // The leading BOM keeps Excel from garbling non-English names.
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `activity-report_${from}_to_${to}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const field: React.CSSProperties = { height: 34, padding: '0 10px', borderRadius: 8, border: '1.5px solid #E0D9D0', fontFamily: 'inherit', fontSize: 13, background: '#fff' }

export default function ActivityReport() {
  const { session } = useAuth()
  const token = session?.access_token || ''

  const [preset, setPreset] = useState<Preset>('30')
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(iso(new Date()))
  const [projectId, setProjectId] = useState('')
  const [person, setPerson] = useState('')
  const [types, setTypes] = useState<string[]>([])         // empty = every kind
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProjects((d.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
      .catch(() => setProjects([]))
  }, [token])

  const load = useCallback(() => {
    if (from > to) { setError('The start date is after the end date.'); return }
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({ from, to })
    if (projectId) qs.set('project_id', projectId)
    fetch(`${API}/api/partner/activity?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load the report')
        setEvents(d.events || [])
        setTruncated(!!d.truncated)
      })
      .catch(e => { setEvents([]); setError(e.message) })
      .finally(() => setLoading(false))
  }, [from, to, projectId, token])
  useEffect(() => { load() }, [load])

  function pickPreset(p: Preset) {
    setPreset(p)
    if (p === 'today') { setFrom(iso(new Date())); setTo(iso(new Date())) }
    if (p === '7') { setFrom(daysAgo(6)); setTo(iso(new Date())) }
    if (p === '30') { setFrom(daysAgo(29)); setTo(iso(new Date())) }
  }

  const people = useMemo(() => [...new Set(events.map(e => e.person).filter(p => p && p !== '—'))].sort(), [events])
  const shown = useMemo(
    () => events.filter(e => (!person || e.person === person) && (types.length === 0 || types.includes(e.type))),
    [events, person, types],
  )
  const count = (k: string) => shown.filter(e => e.type === k).length

  // Per person: what each field user did in this period.
  const perPerson = useMemo(() => {
    const m = new Map<string, { person: string; trees: number; done: number; audits: number; rejected: number }>()
    for (const e of shown) {
      if (!e.person || e.person === '—') continue
      const row = m.get(e.person) || { person: e.person, trees: 0, done: 0, audits: 0, rejected: 0 }
      if (e.type === 'tree_added') row.trees++
      if (e.type === 'task_completed') row.done++
      if (e.type === 'audit_round') row.audits++
      if (e.type === 'task_rejected') row.rejected++
      m.set(e.person, row)
    }
    return [...m.values()].sort((a, b) => b.trees + b.done + b.audits - (a.trees + a.done + a.audits))
  }, [shown])

  const pg = usePagination(shown, 20, `${from}|${to}|${projectId}|${person}|${types.join()}`)
  const toggleType = (k: string) => setTypes(t => t.includes(k) ? t.filter(x => x !== k) : [...t, k])

  const tiles = [
    { label: 'Trees added', value: count('tree_added') },
    { label: 'Tasks completed', value: count('task_completed') },
    { label: 'Tasks approved', value: count('task_approved') },
    { label: 'Tasks rejected', value: count('task_rejected') },
    { label: 'Audit rounds', value: count('audit_round') },
    { label: 'Fence events', value: count('fence_locked') + count('fence_request') + count('fence_decided') },
  ]

  return (
    <PartnerLayout title="Activity" subtitle="What your field team has been doing in the app">

      {/* Filters */}
      <div className="pl-card" style={{ padding: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 999, background: '#F2EFEA' }}>
          {([['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['custom', 'Custom']] as [Preset, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => pickPreset(k)}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, padding: '5px 13px', borderRadius: 999, background: preset === k ? '#2B5341' : 'transparent', color: preset === k ? '#fff' : '#6B7B6E' }}>
              {label}
            </button>
          ))}
        </div>
        <input type="date" aria-label="From date" style={field} value={from} max={to} onChange={e => { setFrom(e.target.value); setPreset('custom') }} />
        <span style={{ color: '#9AA79C' }}>to</span>
        <input type="date" aria-label="To date" style={field} value={to} min={from} max={iso(new Date())} onChange={e => { setTo(e.target.value); setPreset('custom') }} />

        <select aria-label="Project" style={field} value={projectId} onChange={e => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Person" style={field} value={person} onChange={e => setPerson(e.target.value)}>
          <option value="">Everyone</option>
          {people.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button type="button" className="pl-btn pl-btn--primary" style={{ marginLeft: 'auto', height: 34 }} disabled={loading || shown.length === 0}
          onClick={() => downloadCsv(shown, from, to)}>
          ⬇ Download CSV
        </button>
      </div>

      {/* Kinds of activity */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TYPES.map(t => {
          const on = types.includes(t.key)
          return (
            <button key={t.key} type="button" onClick={() => toggleType(t.key)} aria-pressed={on}
              style={{ cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999, border: `1.5px solid ${on ? '#2B5341' : '#E0D9D0'}`, background: on ? '#EAF3DE' : '#fff', color: on ? '#1C3A2B' : '#6B7B6E' }}>
              {t.icon} {t.label}
            </button>
          )
        })}
        {types.length > 0 && (
          <button type="button" onClick={() => setTypes([])} style={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, color: '#2B5341', fontWeight: 700 }}>Show all</button>
        )}
      </div>

      {error && <div className="pl-card" style={{ padding: 14, marginBottom: 16, color: '#A32020' }}>{error}</div>}

      {/* Summary */}
      <div className="pl-stats" style={{ marginBottom: 16, flexShrink: 0 }}>
        {tiles.map(t => (
          <div key={t.label} className="pl-stat">
            <div className="pl-stat__num">{loading ? '–' : t.value.toLocaleString('en-IN')}</div>
            <div className="pl-stat__label">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Per person */}
      {!loading && perPerson.length > 0 && (
        <div className="pl-card" style={{ padding: 0, marginBottom: 16, flexShrink: 0 }}>
          <div style={{ padding: '14px 16px 6px', fontWeight: 700, fontSize: 13.5 }}>By person</div>
          <div style={{ overflowX: 'auto' }}>
          <table className="pl-table">
            <thead><tr><th>Person</th><th>Trees added</th><th>Tasks completed</th><th>Audit rounds</th><th>Tasks rejected</th></tr></thead>
            <tbody>
              {perPerson.map(r => (
                <tr key={r.person}>
                  <td style={{ fontWeight: 600 }}>{r.person}</td><td>{r.trees}</td><td>{r.done}</td><td>{r.audits}</td><td>{r.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="pl-card" style={{ padding: 0, flexShrink: 0 }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="pl-skel" style={{ height: 40, borderRadius: 8 }} />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">📊</div>
            <div className="pl-empty__title">No activity in this period</div>
            <div className="pl-empty__sub">Try a longer date range, or clear the filters.</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
            <table className="pl-table">
              <thead><tr><th>When</th><th>Activity</th><th>Person</th><th>Project</th><th>Task ID</th><th>Tree</th><th>Detail</th></tr></thead>
              <tbody>
                {pg.items.map((e, i) => (
                  <tr key={`${e.at}-${e.type}-${i}`}>
                    <td style={{ whiteSpace: 'nowrap', color: '#6B7B6E' }}>
                      {formatDate(e.at)} · {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{TYPE_ICON[e.type]} {e.label}</td>
                    <td>{e.person}</td>
                    <td style={{ color: '#6B7B6E' }}>{e.project}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {e.taskCode ? <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#185FA5' }}>{e.taskCode}</span> : '—'}
                    </td>
                    <td>
                      {e.treeCode && <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2B5341' }}>{e.treeCode}</span>}
                      {e.species && <div style={{ fontSize: 11.5, color: '#7A867C' }}>{e.species}</div>}
                    </td>
                    <td style={{ color: '#6B7B6E', maxWidth: 280 }}>{e.detail || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div style={{ padding: '0 12px 14px' }}>
              <Pagination {...pg} noun="event" />
            </div>
          </>
        )}
      </div>
      {truncated && (
        <div style={{ fontSize: 12, color: '#8B5A00', marginTop: 10 }}>
          Showing the newest 5,000 events. Choose a shorter date range to see everything.
        </div>
      )}
    </PartnerLayout>
  )
}

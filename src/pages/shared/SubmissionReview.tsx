/**
 * Submission Task Review — what field users have submitted, one tab for
 * Planting and one for Audit. Open a submission to see the full tree details
 * (photos, before/after, measurements, history) and Approve or Reject it.
 *
 * Creating, assigning and deleting tasks stays on the Tasks page (TaskBoard).
 * "Reject" stores tasks.status = 'rejected': that is the value the mobile app
 * reads to show its Edit button, so the field user fixes the same task and
 * resubmits it.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Camera, Inbox, Sprout, Search, MapPin, Leaf, Clock, CheckCircle2, XCircle, Hourglass, ArrowRight, ArrowDownUp, List, LayoutGrid } from 'lucide-react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { TreeHistoryView, useTreeHistory } from '../../components/tree/TreeHistory'
import PhotoLightbox from '../../components/tree/PhotoLightbox'
import { taskStatus, formatDate, conditionTone, capitalise } from '../../components/tree/treeLabels'
import './SubmissionReview.css'

interface Task {
  id: string
  task_code: string | null
  name: string
  project_id: string | null
  project_name: string
  assignee_id: string
  assignee_name: string
  /** field | partner | admin — who the action is with. */
  assignee_role?: string | null
  created_by?: string | null
  target_count: number
  captured?: number | null
  location: string | null
  status: string
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  reviewed_at?: string | null
  created_at: string
  tree_id: string | null
  review_notes: string | null
  audit_round?: number | null
  // Joined from the linked tree record — this is what the field user actually captured
  photo_url: string | null
  /** Human-readable tree ID (TREE-…) of the linked tree record. */
  tree_code?: string | null
  tree_species: string | null
  /** planting — put the tree in the ground; audit — verify it for the ledger. */
  task_type?: 'planting' | 'audit'
  /** Stage of the linked tree — the board lists tasks for planted trees only. */
  tree_stage?: string | null
  tree_health: string | null
  progress?: { pct: number; step: number; label: string }
}

interface Project {
  id: string
  title: string
  treeCount: number
}

// Location is the field operator's GPS at completion — shown only once the task is done.
const LOCATION_VISIBLE = ['completed', 'approved', 'rejected']

type LayoutProps = { title: string; subtitle?: string; children: React.ReactNode }

interface SubmissionReviewProps {
  Layout: React.ComponentType<LayoutProps>
}

export default function SubmissionReview({ Layout }: SubmissionReviewProps) {
  const { session } = useAuth()
  const toast = useToast()
  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [tab, setTab]               = useState<'planting' | 'audit'>('planting')
  const [reviewFilter, setReviewFilter] = useState<'completed' | 'rejected' | 'approved'>('completed')
  const [search, setSearch] = useState('')
  const [oldestFirst, setOldestFirst] = useState(true)
  // Listing (table) is the default; the choice is remembered on this browser.
  const [view, setView] = useState<'table' | 'cards'>(() => {
    try { return localStorage.getItem('fe.review.view') === 'cards' ? 'cards' : 'table' } catch { return 'table' }
  })
  useEffect(() => { try { localStorage.setItem('fe.review.view', view) } catch { /* private mode */ } }, [view])
  const [filterProject, setFilterProject] = useState('all')

  const [projects, setProjects]     = useState<Project[]>([])

  // The submission open for review
  const [reviewingId,     setReviewingId]     = useState<string | null>(null)

  const token = session?.access_token
  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  // Always fetches the FULL task list, unfiltered — filtering is client-side so
  // the counts always show true totals whichever filter is selected.
  const loadTasks = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/tasks`, { headers: authHeaders() })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load tasks')
      setTasks(json.tasks || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, authHeaders])

  useEffect(() => { loadTasks() }, [loadTasks])
  // Only the project names are needed here, for the project filter.
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/admin/projects`, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setProjects(j.projects || []))
      .catch(() => {})
  }, [token, authHeaders])

  // Everything a field user has submitted from the app is reviewable here — planting or audit,
  // whatever stage its tree record currently shows.
  const boardTasks = tasks
  const projectTasks = filterProject === 'all' ? boardTasks : boardTasks.filter(t => t.project_id === filterProject)

  // ── Submission review (one tab per kind of task) ──
  const typeOf = (t: Task) => t.task_type || 'audit'
  const reviewKind: 'planting' | 'audit' = tab === 'planting' ? 'planting' : 'audit'
  const kindTasks = projectTasks.filter(t => typeOf(t) === reviewKind)
  const awaiting = { planting: projectTasks.filter(t => typeOf(t) === 'planting' && t.status === 'completed').length,
                     audit:    projectTasks.filter(t => typeOf(t) === 'audit' && t.status === 'completed').length }
  const q = search.trim().toLowerCase()
  const when = (t: Task) => String((reviewFilter === 'completed' ? t.completed_at : (t.reviewed_at || t.completed_at)) || t.created_at)
  const reviewList = kindTasks
    .filter(t => t.status === reviewFilter)
    .filter(t => !q || [t.name, t.task_code, t.tree_code, t.tree_species, t.assignee_name, t.project_name].some(v => (v || '').toLowerCase().includes(q)))
    .sort((a, b) => oldestFirst ? when(a).localeCompare(when(b)) : when(b).localeCompare(when(a)))
  const reviewCounts = {
    completed: kindTasks.filter(t => t.status === 'completed').length,
    rejected:  kindTasks.filter(t => t.status === 'rejected').length,
    approved:  kindTasks.filter(t => t.status === 'approved').length,
  }

  const reviewPg = usePagination(reviewList, 10, `${reviewKind}|${reviewFilter}|${filterProject}|${q}|${oldestFirst}`)

  const reviewing = reviewingId ? tasks.find(t => t.id === reviewingId) || null : null

  const STATS = [
    { key: 'completed' as const, label: 'Awaiting review', hint: 'Needs your decision', Icon: Hourglass, fg: '#185FA5', bg: '#E8F1FB' },
    { key: 'rejected'  as const, label: 'Rejected',        hint: 'Sent back to the field user', Icon: XCircle, fg: '#A32020', bg: '#FBE9E9' },
    { key: 'approved'  as const, label: 'Approved',        hint: 'Done', Icon: CheckCircle2, fg: '#1C6B33', bg: '#E4F3E6' },
  ]
  const kindLabel = reviewKind === 'planting' ? 'planting' : 'audit'

  return (
    <Layout title="Submission Task Review" subtitle="Review what field users submit — plantings and audits — and approve or reject each one.">
      <div className="sr-page">

        {/* Tabs, search and project */}
        <div className="sr-toolbar">
          <div role="tablist" className="sr-tabs">
            {([
              ['planting', <Sprout size={16} key="i" />, 'Planting', awaiting.planting],
              ['audit', <ClipboardCheck size={16} key="i" />, 'Audit', awaiting.audit],
            ] as const).map(([key, icon, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key}
                className={`sr-tab${tab === key ? ' sr-tab--on' : ''}`}
                onClick={() => { setTab(key); setReviewFilter('completed') }}
                title={`${n} ${key} submission${n === 1 ? '' : 's'} waiting for review`}
              >
                {icon}{label}
                <span className={`sr-tab__count${n > 0 ? ' sr-tab__count--hot' : ''}`}>{n}</span>
              </button>
            ))}
          </div>

          <div className="sr-search">
            <Search size={16} />
            <input className="sr-input" type="search" aria-label="Search submissions" placeholder="Search tree, species, task or person" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="sr-toolbar__end">
            <select className="sr-select" aria-label="Project" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <div className="sr-viewswitch" role="tablist" aria-label="View">
              <button type="button" role="tab" aria-selected={view === 'table'} className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}><List size={15} /> List</button>
              <button type="button" role="tab" aria-selected={view === 'cards'} className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}><LayoutGrid size={15} /> Cards</button>
            </div>
            <button type="button" className="sr-select" onClick={() => setOldestFirst(v => !v)} title="Change the order" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 600 }}>
              <ArrowDownUp size={14} /> {oldestFirst ? 'Oldest first' : 'Newest first'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Status cards */}
        <div className="sr-stats">
          {STATS.map(({ key, label, hint, Icon, fg, bg }) => {
            const on = reviewFilter === key
            return (
              <button key={key} type="button" aria-pressed={on} onClick={() => setReviewFilter(key)}
                className={`sr-stat${on ? ' sr-stat--on' : ''}`} style={{ borderColor: on ? fg : undefined }}>
                <span className="sr-stat__icon" style={{ background: bg, color: fg }}><Icon size={21} /></span>
                <span>
                  <div className="sr-stat__num" style={{ color: fg }}>{reviewCounts[key]}</div>
                  <div className="sr-stat__label">{label}</div>
                  <div className="sr-stat__hint">{key === 'completed' && reviewCounts[key] === 0 ? 'All caught up' : hint}</div>
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="sr-grid">{[1, 2, 3].map(i => <div key={i} className="sr-skel" />)}</div>
        ) : reviewList.length === 0 ? (
          <div className="sr-empty">
            <div className="sr-empty__icon"><Inbox size={30} strokeWidth={1.6} /></div>
            <div className="sr-empty__title">
              {q ? 'Nothing matches your search'
                : reviewFilter === 'completed' ? `No ${kindLabel} waiting for review`
                : reviewFilter === 'rejected' ? `No rejected ${kindLabel} submissions`
                : `No ${kindLabel} approved yet`}
            </div>
            <div className="sr-empty__sub">
              {q ? 'Try a different word, or clear the search.'
                : reviewFilter === 'completed' ? `When a field user submits a ${kindLabel} in the app, it shows up here.`
                : 'Submissions move here once they are reviewed.'}
            </div>
          </div>
        ) : (
          <>
            {view === 'cards' ? (
              <div className="sr-grid">
                {reviewPg.items.map(task => <SubmissionCard key={task.id} task={task} onOpen={() => setReviewingId(task.id)} />)}
              </div>
            ) : (
              <SubmissionTable tasks={reviewPg.items} reviewFilter={reviewFilter} onOpen={id => setReviewingId(id)}
                footer={<Pagination {...reviewPg} noun="submission" />} />
            )}
            {view === 'cards' && <div className="sr-pager"><Pagination {...reviewPg} noun="submission" /></div>}
          </>
        )}
      </div>

      {/* Review a submission */}
      {reviewing && (
        <ReviewModal
          task={reviewing}
          token={token}
          onClose={() => setReviewingId(null)}
          onDone={(status, notes) => {
            setTasks(prev => prev.map(t => t.id === reviewing.id ? { ...t, status, review_notes: notes, reviewed_at: new Date().toISOString() } : t))
            setReviewingId(null)
            loadTasks()
          }}
        />
      )}

    </Layout>
  )
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function TypeBadge({ task }: { task: Task }) {
  const planting = (task.task_type || 'audit') === 'planting'
  return planting
    ? <span className="sr-chip" style={{ background: '#FFF4E0', color: '#8B5A00' }}><Sprout size={12} /> Planting</span>
    : <span className="sr-chip" style={{ background: '#E8F1FB', color: '#185FA5' }}><ClipboardCheck size={12} /> Audit{task.audit_round ? ` ${task.audit_round} of 4` : ''}</span>
}

const initials = (name: string) => {
  const p = (name || '').trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'
}

/** "2 days ago", "3 h ago", "just now". */
function ago(iso: string | null | undefined) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (!Number.isFinite(mins) || mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`
  const d = Math.round(mins / 1440)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

/** The same submissions as a listing: one row each, click a row to review it. */
function SubmissionTable({ tasks, reviewFilter, onOpen, footer }: { tasks: Task[]; reviewFilter: string; onOpen: (id: string) => void; footer?: React.ReactNode }) {
  const dateHead = reviewFilter === 'completed' ? 'Submitted' : 'Reviewed'
  return (
    <div className="sr-tablewrap">
      <div className="sr-tablescroll">
      <table className="sr-table">
        <thead>
          <tr>
            <th style={{ width: 84 }}>Photo</th>
            <th>Tree ID</th>
            <th>Task</th>
            <th>Species</th>
            <th>Submitted by</th>
            <th>Project</th>
            <th>{dateHead}</th>
            <th>Status</th>
            <th aria-label="Action"></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const st = taskStatus(task.status)
            const waiting = task.status === 'completed'
            const at = waiting ? task.completed_at : (task.reviewed_at || task.completed_at)
            const days = at ? Math.floor((Date.now() - new Date(at).getTime()) / 86400000) : 0
            const cond = task.tree_health ? conditionTone(task.tree_health) : null
            return (
              <tr key={task.id} onClick={() => onOpen(task.id)}>
                <td className="sr-c-photo">
                  {task.photo_url
                    ? <img className="sr-thumb" src={task.photo_url} alt="" loading="lazy" />
                    : <div className="sr-thumb sr-thumb--empty"><Camera size={18} /></div>}
                </td>
                <td data-label="Tree ID">{task.tree_code ? <span className="sr-code">{task.tree_code}</span> : <span style={{ color: '#B5BDB6' }}>—</span>}</td>
                <td className="sr-c-task">
                  <div className="sr-cell-title" title={task.name}>{task.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <TypeBadge task={task} />
                    <span className="sr-cell-sub">{task.task_code || task.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  {task.status === 'rejected' && task.review_notes && (
                    <div style={{ fontSize: 11.5, color: '#7A1F1F', marginTop: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.review_notes}>✕ {task.review_notes}</div>
                  )}
                </td>
                <td data-label="Species">
                  <div style={{ fontWeight: 600 }}>{task.tree_species || '—'}</div>
                  {cond && task.tree_health && <span className="sr-chip" style={{ background: cond.bg, color: cond.fg, padding: '1px 8px', fontSize: 11, marginTop: 4 }}>{capitalise(task.tree_health)}</span>}
                </td>
                <td data-label="Submitted by">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                    <span className="sr-avatar">{initials(task.assignee_name)}</span>{task.assignee_name}
                  </span>
                </td>
                <td data-label="Project" style={{ color: '#4A5A4E', maxWidth: 200 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.project_name}>{task.project_name || '—'}</div>
                </td>
                <td data-label={dateHead} style={{ whiteSpace: 'nowrap' }}>
                  <div>{formatDate(at, true)}</div>
                  <div style={{ fontSize: 11.5, color: waiting && days >= 2 ? '#8B5A00' : '#9AA79C', fontWeight: waiting && days >= 2 ? 700 : 400, marginTop: 2 }}>
                    {waiting && days >= 2 ? `Waiting ${days} days` : ago(at)}
                  </div>
                </td>
                <td className="sr-c-status"><span className="sr-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                <td className="sr-c-action" style={{ textAlign: 'right' }}>
                  <button type="button" className={`sr-rowbtn ${waiting ? 'sr-rowbtn--primary' : 'sr-rowbtn--quiet'}`} onClick={e => { e.stopPropagation(); onOpen(task.id) }}>
                    {waiting ? 'Review' : 'View'} <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
      {footer && <div className="sr-tablefoot">{footer}</div>}
    </div>
  )
}

function SubmissionCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const st = taskStatus(task.status)
  const waiting = task.status === 'completed'
  const at = waiting ? task.completed_at : (task.reviewed_at || task.completed_at)
  const days = at ? Math.floor((Date.now() - new Date(at).getTime()) / 86400000) : 0
  const cond = task.tree_health ? conditionTone(task.tree_health) : null
  return (
    <div className="sr-card">
      <button type="button" className="sr-card__photo" onClick={onOpen} aria-label="Open submission">
        {task.photo_url
          ? <img src={task.photo_url} alt="Field capture" loading="lazy" />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5AEA4', gap: 8, fontSize: 13 }}><Camera size={20} /> No photo</div>}
        <span className="sr-card__top">
          <span className="sr-chip" style={{ background: st.bg, color: st.fg, boxShadow: '0 1px 4px rgba(0,0,0,.18)' }}>{st.label}</span>
          {waiting && days >= 2 && (
            <span className="sr-chip" style={{ background: '#FFF4E0', color: '#8B5A00', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }}><Clock size={12} /> Waiting {days} days</span>
          )}
        </span>
        {task.tree_code && <span className="sr-card__code">{task.tree_code}</span>}
      </button>

      <div className="sr-card__body">
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
            <TypeBadge task={task} />
          </div>
          <div className="sr-card__title">{task.name}</div>
          <div className="sr-card__sub">{task.task_code || task.id.slice(0, 8).toUpperCase()}</div>
        </div>

        <div className="sr-meta">
          {task.tree_species && (
            <div className="sr-meta__row">
              <Leaf size={15} />
              <span style={{ fontWeight: 600, color: '#1C2B22' }}>{task.tree_species}</span>
              {cond && task.tree_health && <span className="sr-chip" style={{ background: cond.bg, color: cond.fg, padding: '1px 8px', fontSize: 11 }}>{capitalise(task.tree_health)}</span>}
            </div>
          )}
          <div className="sr-meta__row"><span className="sr-avatar">{initials(task.assignee_name)}</span><span>{task.assignee_name}</span></div>
          {task.project_name && task.project_name !== '—' && <div className="sr-meta__row"><MapPin size={15} /><span>{task.project_name}</span></div>}
          <div className="sr-meta__row" title={formatDate(at, true)}>
            <Clock size={15} /><span>{waiting ? 'Submitted' : st.label} {ago(at)} · {formatDate(at, true)}</span>
          </div>
        </div>

        {task.status === 'rejected' && task.review_notes && <div className="sr-note"><strong>Rejected:</strong> {task.review_notes}</div>}

        <button type="button" className={`sr-btn ${waiting ? 'sr-btn--primary' : 'sr-btn--quiet'}`} onClick={onOpen}>
          {waiting ? 'Review submission' : 'View details'} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}

/** Full details for one submission, with Approve / Reject. */
function ReviewModal({ task, token, onClose, onDone }: {
  task: Task
  token: string | undefined
  onClose: () => void
  onDone: (status: string, notes: string | null) => void
}) {
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<'approve' | 'changes' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const { data, loading, error: loadError } = useTreeHistory(task.tree_id ? `${API}/api/admin/tree-records/${task.tree_id}/history` : null)
  const planting = (task.task_type || 'audit') === 'planting'
  const canDecide = task.status === 'completed'

  async function decide(kind: 'approve' | 'changes') {
    if (kind === 'changes' && !notes.trim()) { setError('Write why you are rejecting it — the field user sees this note.'); return }
    setBusy(kind)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/tasks/${task.id}/${kind === 'approve' ? 'approve' : 'request-changes'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ review_notes: notes.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save the review')
      toast.success(kind === 'approve'
        ? (planting ? 'Planting approved — the tree is now Planted and its audit task is open.' : 'Audit approved — published to the ledger.')
        : 'Rejected — sent back to the field user with your note.')
      onDone(kind === 'approve' ? 'approved' : 'rejected', notes.trim() || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const st = taskStatus(task.status)
  return (
    <Modal
      icon={<ClipboardCheck size={18} />}
      title={`${planting ? 'Planting' : 'Audit'} submission · ${task.tree_code || task.task_code || task.id.slice(0, 8).toUpperCase()}`}
      subtitle={`${task.name} · ${task.assignee_name} · ${task.project_name}`}
      error={error || loadError}
      onClose={onClose}
      width={1000}
      footer={canDecide ? (
        <>
          <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '9px 18px' }}>Cancel</button>
          <button type="button" disabled={!!busy} onClick={() => decide('changes')} style={{ background: '#fff', color: '#9A4A00', border: '1.5px solid #F0B98A', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {busy === 'changes' ? 'Rejecting…' : '✕ Reject'}
          </button>
          <button type="button" disabled={!!busy} onClick={() => decide('approve')} style={{ ...btnPrimary, padding: '9px 22px', background: '#22a052' }}>
            {busy === 'approve' ? 'Approving…' : '✓ Approve'}
          </button>
        </>
      ) : (
        <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '9px 18px' }}>Close</button>
      )}
    >
      {/* Who, when and the decision note */}
      <div className="sr-summary">
        <div>
          <div className="sr-summary__who">
            <span className="sr-summary__avatar">{initials(task.assignee_name)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#1C2B22' }}>{task.assignee_name}</div>
              <div style={{ fontSize: 12, color: '#7A867C' }}>Field user · {planting ? 'planted' : 'audited'} this tree</div>
            </div>
          </div>
          <div className="sr-meta">
            <div className="sr-meta__row"><span className="sr-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span><TypeBadge task={task} /></div>
            {task.completed_at && <div className="sr-meta__row"><Clock size={15} /><span>Submitted {formatDate(task.completed_at, true)} ({ago(task.completed_at)})</span></div>}
            {task.location && <div className="sr-meta__row"><MapPin size={15} /><span>{task.location}</span></div>}
            {task.reviewed_at && task.status !== 'completed' && <div className="sr-meta__row"><CheckCircle2 size={15} /><span>Reviewed {formatDate(task.reviewed_at, true)}</span></div>}
          </div>
          {task.review_notes && task.status !== 'completed' && <div className="sr-note" style={{ marginTop: 10 }}><strong>Note:</strong> {task.review_notes}</div>}
        </div>
        {canDecide ? (
          <div>
            <label style={labelStyle}>Note to the field user</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Optional when approving. Required to reject — say exactly what is wrong."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
            />
            <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 6 }}>
              Approve publishes it. Reject sends it back to {task.assignee_name} to fix and resubmit in the app.
            </div>
          </div>
        ) : (
          <div style={{ alignSelf: 'center', fontSize: 13, color: '#6B7B6E', lineHeight: 1.5 }}>
            {task.status === 'rejected' ? 'Rejected — waiting for the field user to fix and resubmit this in the app.' : 'This submission has been approved.'}
          </div>
        )}
      </div>

      {task.tree_id && !(loadError && !data) ? (
        loading && !data ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#888' }}>Loading the full audit details…</div>
        ) : data ? (
          <TreeHistoryView data={data} focusTaskId={task.id} />
        ) : null
      ) : task.photo_url ? (
        <>
          <button type="button" onClick={() => setPhotoOpen(true)} style={{ padding: 0, border: '1px solid #e8f0e8', borderRadius: 10, overflow: 'hidden', width: '100%', maxHeight: 360, cursor: 'zoom-in', display: 'block', marginTop: 14 }}>
            <img src={task.photo_url} alt="Field capture" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
          </button>
          {photoOpen && <PhotoLightbox photos={[{ url: task.photo_url, label: 'Field capture' }]} onClose={() => setPhotoOpen(false)} />}
        </>
      ) : (
        <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>This action is not linked to a tree and has no photo.</div>
      )}
    </Modal>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' }
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }
const btnPrimary: React.CSSProperties = { background: '#1a5c2a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { background: '#f5f5f5', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const fieldGroup: React.CSSProperties = { marginBottom: 16 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

/**
 * Submission Task Review — the Tasks page for admins and partners.
 *
 *   Submission review — what field users have submitted, oldest first. Open
 *                       one to see the full tree + audit details (photos,
 *                       before/after, measurements, history) and Approve it
 *                       or Request changes.
 *   Action list       — every task (action): who it is assigned to (a field
 *                       user or a partner), its status and its progress.
 *
 * "Request changes" stores tasks.status = 'rejected': that is the value the
 * mobile app reads to show its Edit button, so the field user fixes the same
 * task and resubmits it.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, ListChecks, Camera, Inbox } from 'lucide-react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import Modal from '../../components/ui/Modal'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { TreeHistoryView, useTreeHistory } from '../../components/tree/TreeHistory'
import PhotoLightbox from '../../components/tree/PhotoLightbox'
import { taskStatus, formatDate } from '../../components/tree/treeLabels'

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

interface AssignableUser {
  auth_id: string
  display_name: string
  role: string
}

interface Project {
  id: string
  title: string
  treeCount: number
}

type AssignPool = 'field' | 'partner' | 'owner'

// Location is the field operator's GPS at completion — shown only once the task is done.
const LOCATION_VISIBLE = ['completed', 'approved', 'rejected']
const STATUS_ORDER = ['assigned', 'in_progress', 'completed', 'rejected', 'approved']

type LayoutProps = { title: string; subtitle?: string; children: React.ReactNode }

interface TaskBoardProps {
  Layout: React.ComponentType<LayoutProps>
  roleLabel: string // shown in the assignee dropdown, e.g. "Admin / Partner"
  /** Admin view: also lists planting tasks and can assign actions to partners. */
  showPlanting?: boolean
}

const emptyForm = () => ({
  name: '', project_id: '', assignee_id: '', tree_id: '',
  target_count: 1, location: '', due_date: '', pool: 'field' as AssignPool,
})

export default function TaskBoard({ Layout, roleLabel, showPlanting = false }: TaskBoardProps) {
  const { session } = useAuth()
  const toast = useToast()
  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [tab, setTab]               = useState<'review' | 'actions'>('review')
  const [reviewFilter, setReviewFilter] = useState<'completed' | 'rejected' | 'approved'>('completed')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [filterWho, setFilterWho]   = useState<'all' | 'field' | 'partner' | 'unassigned'>('all')

  const [showModal, setShowModal]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; totalTrees: number } | null>(null)

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [fieldUsers, setFieldUsers] = useState<AssignableUser[]>([])
  const [partners, setPartners]     = useState<AssignableUser[]>([])
  const [projects, setProjects]     = useState<Project[]>([])
  const [treeRecords, setTreeRecords] = useState<{ id: string; species: string; project_id: string | null }[]>([])

  // Per-row "assign to someone" state
  const [reassigningId,   setReassigningId]   = useState<string | null>(null)
  const [reassignUserId,  setReassignUserId]  = useState('')
  const [reassigning,     setReassigning]     = useState(false)

  // The submission open for review
  const [reviewingId,     setReviewingId]     = useState<string | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [bulkForm, setBulkForm] = useState({ project_id: '', assignee_id: '' })

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

  const loadFormData = useCallback(async () => {
    if (!token) return
    try {
      const [usersRes, fieldRes, partnerRes, projRes] = await Promise.all([
        fetch(`${API}/api/admin/tasks/assignable-users`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/tasks/assignable-users?pool=field`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/tasks/assignable-users?pool=partner`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/projects`, { headers: authHeaders() }),
      ])
      const [usersJson, fieldJson, partnerJson, projJson] = await Promise.all([usersRes.json(), fieldRes.json(), partnerRes.json(), projRes.json()])
      setAssignableUsers(usersJson.users || [])
      setFieldUsers(fieldJson.users || [])
      setPartners(partnerJson.users || [])
      setProjects(projJson.projects || [])
    } catch {
      // non-critical
    }
  }, [token, authHeaders])

  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => { loadFormData() }, [loadFormData])

  // Load trees for the selected project in the single-task modal
  useEffect(() => {
    if (!token || !form.project_id) { setTreeRecords([]); return }
    fetch(`${API}/api/admin/tree-records?project_id=${form.project_id}&limit=500`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { records: [] })
      .then(j => setTreeRecords(j.records || []))
      .catch(() => setTreeRecords([]))
  }, [form.project_id, token, authHeaders])

  const poolUsers = (pool: AssignPool) => pool === 'field' ? fieldUsers : pool === 'partner' ? partners : assignableUsers

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.assignee_id) return
    setSubmitting(true)
    try {
      const body: Record<string, any> = {
        name:         form.name,
        assignee_id:  form.assignee_id,
        target_count: form.target_count,
      }
      if (form.project_id)  body.project_id  = form.project_id
      if (form.tree_id)     body.tree_id     = form.tree_id
      if (form.location)    body.location    = form.location
      if (form.due_date)    body.due_date    = form.due_date

      const res = await fetch(`${API}/api/admin/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create the action')
      toast.success('Action created and assigned.')
      setShowModal(false)
      setForm(emptyForm())
      loadTasks()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkForm.project_id || !bulkForm.assignee_id) return
    setBulkSubmitting(true)
    setBulkResult(null)
    try {
      const res = await fetch(`${API}/api/admin/tasks/bulk-generate`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(bulkForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to generate tasks')
      setBulkResult(json)
      toast.success(`${json.created ?? 0} task${json.created === 1 ? '' : 's'} created.`)
      loadTasks()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBulkSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      const res = await fetch(`${API}/api/admin/tasks/${id}`, { method: 'DELETE', headers: authHeaders() })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to delete')
      toast.success('Deleted.')
      loadTasks()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleReassign = async (taskId: string) => {
    if (!reassignUserId) return
    setReassigning(true)
    try {
      const res = await fetch(`${API}/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ assignee_id: reassignUserId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to assign')

      // Update the row immediately — the background re-fetch can lag a moment behind.
      const person = [...fieldUsers, ...partners, ...assignableUsers].find(u => u.auth_id === reassignUserId)
      const role = fieldUsers.some(u => u.auth_id === reassignUserId) ? 'field' : partners.some(u => u.auth_id === reassignUserId) ? 'partner' : person?.role
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, assignee_id: reassignUserId, assignee_name: person?.display_name || reassignUserId, assignee_role: role } : t
      ))

      toast.success(`Assigned to ${person?.display_name || 'them'}.`)
      setReassigningId(null)
      setReassignUserId('')
      loadTasks()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setReassigning(false)
    }
  }

  // An auto-created task sits on the partner who owns the tree until someone is picked.
  const needsAssignee = (t: Task) => t.status === 'assigned' && !!t.created_by && t.assignee_id === t.created_by && t.assignee_role !== 'field'
  const whoOf = (t: Task): 'field' | 'partner' | 'unassigned' | 'other' =>
    needsAssignee(t) ? 'unassigned' : t.assignee_role === 'field' ? 'field' : t.assignee_role === 'partner' ? 'partner' : 'other'

  // Audits only belong here once their tree is planted. Planting tasks are
  // reviewed on Assign action by partners; admins (showPlanting) review them here.
  const boardTasks = tasks.filter(t => (t.task_type || 'audit') === 'planting'
    ? showPlanting
    : (!t.tree_id || (t.tree_stage || 'Under plantation') !== 'Under plantation'))
  const projectTasks = filterProject === 'all' ? boardTasks : boardTasks.filter(t => t.project_id === filterProject)

  // ── Submission review ──
  const reviewList = projectTasks
    .filter(t => t.status === reviewFilter)
    .sort((a, b) => reviewFilter === 'completed'
      ? String(a.completed_at || a.created_at).localeCompare(String(b.completed_at || b.created_at))
      : String(b.reviewed_at || b.completed_at || '').localeCompare(String(a.reviewed_at || a.completed_at || '')))
  const reviewCounts = {
    completed: projectTasks.filter(t => t.status === 'completed').length,
    rejected:  projectTasks.filter(t => t.status === 'rejected').length,
    approved:  projectTasks.filter(t => t.status === 'approved').length,
  }

  // ── Action list ──
  const actionList = projectTasks.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (filterWho === 'all' || whoOf(t) === filterWho))
  const statusCounts = projectTasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {} as Record<string, number>)

  const selectedBulkProject = projects.find(p => p.id === bulkForm.project_id)
  const reviewPg = usePagination(reviewList, 12, `${reviewFilter}|${filterProject}`)
  const actionPg = usePagination(actionList, 10, `${filterStatus}|${filterProject}|${filterWho}`)

  // Esc closes the open pop-up; the page behind stays put.
  useModalBehavior(() => setShowModal(false), showModal)
  useModalBehavior(() => setShowBulkModal(false), showBulkModal)

  const reviewing = reviewingId ? tasks.find(t => t.id === reviewingId) || null : null

  return (
    <Layout title="Submission Task Review" subtitle={showPlanting
      ? 'Review what field users submit — approve it or request changes. Track every action and who it is with.'
      : 'Review audits your field users submit — approve them or request changes. Track every action and its progress.'}>
      <div style={{ padding: '24px' }}>

        {/* Tabs + project scope */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div role="tablist" style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#EFEAE3', borderRadius: 12 }}>
            {([
              ['review', <ClipboardCheck size={15} key="i" />, 'Submission review', reviewCounts.completed],
              ['actions', <ListChecks size={15} key="i" />, 'Action list', projectTasks.length],
            ] as const).map(([key, icon, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 9, border: 'none',
                  background: tab === key ? '#fff' : 'transparent', boxShadow: tab === key ? '0 1px 3px rgba(17,33,33,0.12)' : 'none',
                  color: tab === key ? '#1C2B22' : '#6B7B6E', fontFamily: 'inherit', fontSize: 13, fontWeight: tab === key ? 700 : 600, cursor: 'pointer',
                }}
              >
                {icon}{label}
                <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: key === 'review' && n > 0 ? '#185FA5' : '#E3DDD4', color: key === 'review' && n > 0 ? '#fff' : '#7A867C' }}>{n}</span>
              </button>
            ))}
          </div>

          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={selectStyle}>
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>

          {tab === 'actions' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
              <button onClick={() => { setBulkResult(null); setBulkForm({ project_id: '', assignee_id: '' }); setShowBulkModal(true) }} style={btnSecondary}>
                🌳 Generate from project trees
              </button>
              <button onClick={() => { setForm(emptyForm()); setShowModal(true) }} style={btnPrimary}>+ Create action</button>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {tab === 'review' ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              {([
                ['completed', 'Awaiting review'],
                ['rejected', 'Changes requested'],
                ['approved', 'Approved'],
              ] as const).map(([key, label]) => {
                const st = taskStatus(key)
                const on = reviewFilter === key
                return (
                  <button key={key} type="button" onClick={() => setReviewFilter(key)} style={{
                    background: '#fff', border: `2px solid ${on ? st.fg : st.fg + '22'}`, borderRadius: 10,
                    padding: '10px 18px', minWidth: 140, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: st.fg }}>{reviewCounts[key]}</div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#666' }}>{label}</div>
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>Loading submissions…</div>
            ) : reviewList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888', background: '#fff', borderRadius: 12 }}>
                <Inbox size={36} strokeWidth={1.5} color="#9AA79C" />
                <div style={{ fontWeight: 600, marginTop: 10 }}>
                  {reviewFilter === 'completed' ? 'Nothing waiting for review' : reviewFilter === 'rejected' ? 'No submissions waiting on changes' : 'Nothing approved yet'}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  {reviewFilter === 'completed' ? 'When a field user submits a task in the app it shows up here.' : 'Submissions move here once they are reviewed.'}
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                  {reviewPg.items.map(task => <SubmissionCard key={task.id} task={task} onOpen={() => setReviewingId(task.id)} />)}
                </div>
                <div style={{ marginTop: 12 }}><Pagination {...reviewPg} noun="submission" /></div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Status cards — click to filter */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              {['all', ...STATUS_ORDER].map(s => {
                const st = s === 'all' ? { label: 'All actions', fg: '#112121' } : taskStatus(s)
                const n = s === 'all' ? projectTasks.length : (statusCounts[s] || 0)
                return (
                  <div key={s} style={{
                    background: '#fff', border: `2px solid ${st.fg}22`, borderRadius: 10,
                    padding: '10px 18px', minWidth: 110, cursor: 'pointer',
                    outline: filterStatus === s ? `2px solid ${st.fg}` : 'none',
                  }} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: st.fg }}>{n}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>{st.label}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#777', fontWeight: 600 }}>Assigned to:</span>
              {([['all', 'Everyone'], ['field', 'Field users'], ...(showPlanting ? [['partner', 'Partners']] : []), ['unassigned', 'Needs someone']] as [typeof filterWho, string][]).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setFilterWho(k)} style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${filterWho === k ? '#1a5c2a' : '#e0e0e0'}`, background: filterWho === k ? '#eef6ee' : '#fff', color: filterWho === k ? '#1a5c2a' : '#555',
                }}>{label}</button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>Loading actions…</div>
            ) : actionList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600 }}>No actions found</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Create an action, or generate one per tree for a whole project</div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8faf8', borderBottom: '2px solid #e8f0e8' }}>
                      {['Code', 'Tree', 'Action', 'Assigned to', 'Project', 'Progress', 'Status', 'Due', ''].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actionPg.items.map((task, i) => {
                      const st = taskStatus(task.status)
                      const who = whoOf(task)
                      const overdue = task.due_date && !['approved', 'completed'].includes(task.status) && new Date(task.due_date) < new Date(new Date().toDateString())
                      return (
                        <tr key={task.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f0f7f0', color: '#1a5c2a', padding: '2px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {task.task_code || task.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {task.tree_code ? (
                              <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#F2F6EE', border: '1px solid #DCE8D3', color: '#2B5341', padding: '2px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {task.tree_code}
                              </span>
                            ) : <span style={{ color: '#bbb' }}>—</span>}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 260 }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</div>
                            <TypeBadge task={task} />
                            {task.location && LOCATION_VISIBLE.includes(task.status) && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {task.location}</div>}
                          </td>
                          <td style={tdStyle}>
                            {reassigningId === task.id ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 240 }}>
                                <select value={reassignUserId} onChange={e => setReassignUserId(e.target.value)} style={{ ...selectStyle, padding: '4px 8px', fontSize: 12, maxWidth: 200 }}>
                                  <option value="">Choose who…</option>
                                  <optgroup label="Field users">
                                    {fieldUsers.map(u => <option key={u.auth_id} value={u.auth_id}>{u.display_name}</option>)}
                                  </optgroup>
                                  {showPlanting && partners.length > 0 && (
                                    <optgroup label="Partners">
                                      {partners.map(u => <option key={u.auth_id} value={u.auth_id}>{u.display_name}</option>)}
                                    </optgroup>
                                  )}
                                </select>
                                <button disabled={reassigning || !reassignUserId} onClick={() => handleReassign(task.id)} style={{ background: '#1a5c2a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}>
                                  {reassigning ? '…' : 'OK'}
                                </button>
                                <button onClick={() => { setReassigningId(null); setReassignUserId('') }} style={{ background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11.5 }}>✕</button>
                              </div>
                            ) : who === 'unassigned' ? (
                              <span style={{ background: '#FFF4E0', color: '#8B5A00', padding: '3px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>Needs someone</span>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 600 }}>{task.assignee_name}</div>
                                <span style={{ fontSize: 10.5, fontWeight: 700, color: who === 'partner' ? '#6A1B9A' : who === 'field' ? '#1a5c2a' : '#777', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                  {who === 'partner' ? 'Partner' : who === 'field' ? 'Field user' : task.assignee_role || ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12, color: '#555' }}>{task.project_name || '—'}</td>
                          <td style={{ ...tdStyle, minWidth: 150 }}>
                            <ProgressBar task={task} />
                          </td>
                          <td style={tdStyle}>
                            <span style={{ background: st.bg, color: st.fg, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{st.label}</span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12, color: overdue ? '#C62828' : '#666', fontWeight: overdue ? 700 : 400, whiteSpace: 'nowrap' }}>
                            {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : '—'}{overdue ? ' · late' : ''}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {['completed', 'rejected', 'approved'].includes(task.status) && (
                                <button onClick={() => setReviewingId(task.id)} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  🔍 {task.status === 'completed' ? 'Review' : 'View'}
                                </button>
                              )}
                              {['assigned', 'in_progress', 'rejected'].includes(task.status) && reassigningId !== task.id && (
                                <button
                                  onClick={() => { setReassigningId(task.id); setReassignUserId(who === 'unassigned' ? '' : task.assignee_id) }}
                                  title="Assign to a field user or partner"
                                  style={{ background: '#eef6ee', color: '#1a5c2a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}
                                >
                                  👤 {who === 'unassigned' ? 'Assign' : 'Reassign'}
                                </button>
                              )}
                              {task.status !== 'approved' && (
                                <button onClick={() => handleDelete(task.id, task.name)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '0 16px 12px' }}>
                  <Pagination {...actionPg} noun="action" />
                </div>
              </div>
            )}
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

      {/* Create single action */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a5c2a' }}>Create action</h2>
              <button onClick={() => setShowModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={fieldGroup}>
                <label style={labelStyle}>What needs doing *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Re-measure the trees by the north fence" style={inputStyle} />
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Assign to *</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {([['field', 'Field user'], ...(showPlanting ? [['partner', 'Partner']] : []), ['owner', roleLabel]] as [AssignPool, string][]).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setForm(f => ({ ...f, pool: k, assignee_id: '' }))} style={{
                      flex: 1, padding: '7px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${form.pool === k ? '#1a5c2a' : '#e0e0e0'}`, background: form.pool === k ? '#eef6ee' : '#fff', color: form.pool === k ? '#1a5c2a' : '#555',
                    }}>{label}</button>
                  ))}
                </div>
                <select required value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))} style={inputStyle}>
                  <option value="">Select…</option>
                  {poolUsers(form.pool).map(u => (
                    <option key={u.auth_id} value={u.auth_id}>{u.display_name}{form.pool === 'owner' ? ` (${u.role})` : ''}</option>
                  ))}
                </select>
                {poolUsers(form.pool).length === 0 && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                    {form.pool === 'field' ? 'No field users yet — add one in Team first.' : 'No accounts available to assign.'}
                  </div>
                )}
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Project</label>
                <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value, tree_id: '' }))} style={inputStyle}>
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Link to a tree (optional)</label>
                <select value={form.tree_id} onChange={e => setForm(f => ({ ...f, tree_id: e.target.value }))} style={inputStyle}>
                  <option value="">No tree linked (auto-generate code)</option>
                  {treeRecords.map(t => (
                    <option key={t.id} value={t.id}>{t.id.slice(0, 8).toUpperCase()} — {t.species || 'Unknown species'}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Target count</label>
                  <input type="number" min={1} value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: parseInt(e.target.value) || 1 }))} style={inputStyle} />
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Progress is counted against this</div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Due date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Enter location" style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1 }}>{submitting ? 'Creating…' : 'Create action'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk-generate-from-project modal */}
      {showBulkModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a5c2a' }}>Generate Tasks From Project Trees</h2>
              <button onClick={() => setShowBulkModal(false)} style={closeBtnStyle}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#666', marginTop: 0, marginBottom: 20 }}>
              Creates one task per tree already recorded under the chosen project, all assigned to the same {roleLabel} account.
              Trees that already have a task are skipped — safe to run again after new trees are added.
            </p>

            {bulkResult ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a5c2a' }}>
                  {bulkResult.created} task{bulkResult.created !== 1 ? 's' : ''} created
                </div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>
                  {bulkResult.skipped} tree{bulkResult.skipped !== 1 ? 's' : ''} already had a task, out of {bulkResult.totalTrees} total.
                </div>
                <button type="button" style={{ ...btnPrimary, marginTop: 20 }} onClick={() => { setShowBulkModal(false); setBulkForm({ project_id: '', assignee_id: '' }) }}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBulkGenerate}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Project *</label>
                  <select required value={bulkForm.project_id} onChange={e => setBulkForm(f => ({ ...f, project_id: e.target.value }))} style={inputStyle}>
                    <option value="">Select project…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  {selectedBulkProject && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Target tree count on record: {selectedBulkProject.treeCount}</div>
                  )}
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Assign all to ({roleLabel}) *</label>
                  <select required value={bulkForm.assignee_id} onChange={e => setBulkForm(f => ({ ...f, assignee_id: e.target.value }))} style={inputStyle}>
                    <option value="">Select user…</option>
                    {assignableUsers.map(u => (
                      <option key={u.auth_id} value={u.auth_id}>{u.display_name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowBulkModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={bulkSubmitting} style={{ ...btnPrimary, flex: 1 }}>
                    {bulkSubmitting ? 'Generating…' : 'Generate Tasks'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function TypeBadge({ task }: { task: Task }) {
  const planting = (task.task_type || 'audit') === 'planting'
  return planting
    ? <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: '#FFF4E0', color: '#8B5A00' }}>🌱 Planting</span>
    : <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 999, background: '#E8F1FB', color: '#185FA5' }}>🔍 Audit{task.audit_round ? ` ${task.audit_round}` : ''}</span>
}

function ProgressBar({ task }: { task: Task }) {
  const p = task.progress || { pct: 0, step: 1, label: taskStatus(task.status).label }
  const color = task.status === 'approved' ? '#2E9E4F' : task.status === 'rejected' ? '#E07A1F' : task.status === 'completed' ? '#185FA5' : '#1a5c2a'
  return (
    <div title={`Step ${p.step} of 4 · ${p.label}`}>
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ flex: 1, height: 6, borderRadius: 3, background: s <= p.step ? color : '#EAE5DE', opacity: s === p.step && task.status !== 'approved' ? 0.75 : 1 }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#777', marginTop: 4, whiteSpace: 'nowrap' }}>{p.pct}% · {p.label}</div>
    </div>
  )
}

function SubmissionCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const st = taskStatus(task.status)
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #EEE9E1', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button type="button" onClick={onOpen} style={{ position: 'relative', height: 140, border: 'none', padding: 0, background: '#F2EFEA', cursor: 'pointer' }}>
        {task.photo_url
          ? <img src={task.photo_url} alt="Field capture" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5AEA4', gap: 6, fontSize: 12.5 }}><Camera size={18} /> No photo</div>}
        <span style={{ position: 'absolute', top: 8, left: 8, background: st.bg, color: st.fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{st.label}</span>
      </button>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f0f7f0', color: '#1a5c2a', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{task.task_code || task.id.slice(0, 8).toUpperCase()}</span>
          {task.tree_code && <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#F2F6EE', border: '1px solid #DCE8D3', color: '#2B5341', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{task.tree_code}</span>}
          <TypeBadge task={task} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#112121', lineHeight: 1.3 }}>{task.name}</div>
        <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.55 }}>
          {task.tree_species && <div>🌳 {task.tree_species}{task.tree_health ? ` · ${task.tree_health}` : ''}</div>}
          <div>👤 {task.assignee_name} · 🌿 {task.project_name}</div>
          <div>{task.status === 'completed' ? '📥 Submitted' : '🗓 Reviewed'} {formatDate(task.status === 'completed' ? task.completed_at : (task.reviewed_at || task.completed_at), true)}</div>
        </div>
        {task.status === 'rejected' && task.review_notes && (
          <div style={{ fontSize: 12, background: '#FDEEE3', color: '#7A3B00', borderRadius: 8, padding: '6px 9px' }}>✏️ {task.review_notes}</div>
        )}
        <button type="button" onClick={onOpen} style={{ ...btnPrimary, marginTop: 'auto', padding: '8px 14px', fontSize: 13 }}>
          {task.status === 'completed' ? 'Review submission' : 'View details'}
        </button>
      </div>
    </div>
  )
}

/** Full audit details for one submission, with Approve / Request changes. */
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
    if (kind === 'changes' && !notes.trim()) { setError('Write what needs to change — the field user sees this note.'); return }
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
        : 'Changes requested — sent back to the field user with your note.')
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
            {busy === 'changes' ? 'Sending…' : '✏️ Request changes'}
          </button>
          <button type="button" disabled={!!busy} onClick={() => decide('approve')} style={{ ...btnPrimary, padding: '9px 22px', background: '#22a052' }}>
            {busy === 'approve' ? 'Approving…' : planting ? '✓ Confirm planted' : '✓ Approve'}
          </button>
        </>
      ) : (
        <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '9px 18px' }}>Close</button>
      )}
    >
      {/* Decision panel first, so the note is where the cursor lands */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, background: '#FAF8F4', border: '1px solid #EEE9E1', borderRadius: 12, padding: 14, marginBottom: 6 }}>
        <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.7 }}>
          <div><span style={{ background: st.bg, color: st.fg, padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{st.label}</span></div>
          <div>👤 Submitted by <strong>{task.assignee_name}</strong></div>
          {task.completed_at && <div>📥 {formatDate(task.completed_at, true)}</div>}
          {task.location && <div>📍 {task.location}</div>}
          {task.reviewed_at && task.status !== 'completed' && <div>🗓 Reviewed {formatDate(task.reviewed_at, true)}</div>}
          {task.review_notes && task.status !== 'completed' && <div style={{ marginTop: 4 }}>📝 {task.review_notes}</div>}
        </div>
        {canDecide ? (
          <div>
            <label style={labelStyle}>Note to the field user</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional when approving. Required to request changes — say exactly what to fix."
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
            />
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: '#777', alignSelf: 'center' }}>
            {task.status === 'rejected' ? 'Waiting for the field user to fix and resubmit this in the app.' : 'This submission has been approved.'}
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

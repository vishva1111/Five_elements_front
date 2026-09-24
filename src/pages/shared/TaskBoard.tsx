import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'

interface Task {
  id: string
  task_code: string | null
  name: string
  project_id: string | null
  project_name: string
  assignee_id: string
  assignee_name: string
  target_count: number
  location: string | null
  priority: 'high' | 'medium' | 'low'
  status: string
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  tree_id: string | null
  review_notes: string | null
  // Joined from the linked tree record — this is what the field user actually captured
  photo_url: string | null
  tree_species: string | null
  tree_health: string | null
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

const STATUS_COLORS: Record<string, string> = {
  assigned:    '#1a5c2a',
  in_progress: '#f59e0b',
  completed:   '#3b82f6',
  approved:    '#8b5cf6',
  rejected:    '#ef4444',
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

type LayoutProps = { title: string; subtitle?: string; children: React.ReactNode }

interface TaskBoardProps {
  Layout: React.ComponentType<LayoutProps>
  roleLabel: string // shown in the assignee dropdown, e.g. "Admin / Partner"
}

export default function TaskBoard({ Layout, roleLabel }: TaskBoardProps) {
  const { session } = useAuth()
  const [tasks, setTasks]           = useState<Task[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProject, setFilterProject] = useState('all')

  const [showModal, setShowModal]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [showBulkModal, setShowBulkModal] = useState(false)
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number; totalTrees: number } | null>(null)

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])
  const [fieldUsers, setFieldUsers] = useState<AssignableUser[]>([])
  const [projects, setProjects]     = useState<Project[]>([])
  const [treeRecords, setTreeRecords] = useState<{ id: string; species: string; project_id: string | null }[]>([])

  // Per-row "assign to field user" state
  const [reassigningId,   setReassigningId]   = useState<string | null>(null)
  const [reassignUserId,  setReassignUserId]  = useState('')
  const [reassigning,     setReassigning]     = useState(false)

  // Per-row "approve/reject a completed task" state
  const [reviewingId,     setReviewingId]     = useState<string | null>(null)
  const [reviewAction,    setReviewAction]    = useState<'approve' | 'reject' | null>(null)
  const [reviewNotes,     setReviewNotes]     = useState('')
  const [reviewing,       setReviewing]       = useState(false)

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [form, setForm] = useState({
    name: '', project_id: '', assignee_id: '', tree_id: '',
    target_count: 10, location: '', priority: 'medium', due_date: '',
  })
  const [bulkForm, setBulkForm] = useState({ project_id: '', assignee_id: '', priority: 'medium' })

  const token = session?.access_token
  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  // Always fetches the FULL task list, unfiltered. Status/project filtering happens
  // entirely client-side (see filteredTasks below) — this is what lets the summary
  // cards always show true totals across every status, regardless of which filter
  // is currently selected for the table.
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
      const [usersRes, fieldRes, projRes] = await Promise.all([
        fetch(`${API}/api/admin/tasks/assignable-users`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/tasks/assignable-users?pool=field`, { headers: authHeaders() }),
        fetch(`${API}/api/admin/projects`, { headers: authHeaders() }),
      ])
      const usersJson = await usersRes.json()
      const fieldJson = await fieldRes.json()
      const projJson  = await projRes.json()
      setAssignableUsers(usersJson.users || [])
      setFieldUsers(fieldJson.users || [])
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.assignee_id) return
    setSubmitting(true)
    try {
      const body: Record<string, any> = {
        name:         form.name,
        assignee_id:  form.assignee_id,
        target_count: form.target_count,
        priority:     form.priority,
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
      if (!res.ok) throw new Error(json.error || 'Failed to create task')
      setShowModal(false)
      setForm({ name: '', project_id: '', assignee_id: '', tree_id: '', target_count: 10, location: '', priority: 'medium', due_date: '' })
      loadTasks()
    } catch (e: any) {
      alert(e.message)
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
      loadTasks()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBulkSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete task "${name}"?`)) return
    try {
      const res = await fetch(`${API}/api/admin/tasks/${id}`, { method: 'DELETE', headers: authHeaders() })
      if (!res.ok) throw new Error('Failed to delete')
      loadTasks()
    } catch (e: any) {
      alert(e.message)
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

      // Update the row immediately — don't rely solely on the background re-fetch below,
      // which can lag a moment behind the click.
      const newName = [...assignableUsers, ...fieldUsers].find(u => u.auth_id === reassignUserId)?.display_name
        || reassignUserId
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, assignee_id: reassignUserId, assignee_name: newName } : t
      ))

      setReassigningId(null)
      setReassignUserId('')
      loadTasks() // background refresh, keeps everything else (counts etc.) in sync
    } catch (e: any) {
      alert(e.message)
    } finally {
      setReassigning(false)
    }
  }

  const handleReview = async (taskId: string, action: 'approve' | 'reject') => {
    setReviewing(true)
    setReviewAction(action) // so the button that was pressed shows its own busy label
    try {
      const res = await fetch(`${API}/api/admin/tasks/${taskId}/${action}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ review_notes: reviewNotes }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit review')

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: action === 'approve' ? 'approved' : 'rejected', review_notes: reviewNotes || null } : t
      ))

      setReviewingId(null)
      setReviewAction(null)
      setReviewNotes('')
      loadTasks()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setReviewing(false)
    }
  }

  const isFieldAssigned = (t: Task) => fieldUsers.some(u => u.auth_id === t.assignee_id)

  // The project selector sits above the summary cards, so it scopes everything below it —
  // the card counts included, not just the table.
  const projectTasks = filterProject === 'all'
    ? tasks
    : tasks.filter(t => t.project_id === filterProject)

  const filteredTasks = projectTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    // "Assigned" means handed off to a real field user — tickets still sitting with
    // Admin/Partner (not yet delegated) only show under "All tasks", not here.
    if (filterStatus === 'assigned' && !isFieldAssigned(t)) return false
    return true
  })

  const statusCounts = projectTasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const selectedBulkProject = projects.find(p => p.id === bulkForm.project_id)

  // ── Pagination ──────────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(filteredTasks.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart   = (currentPage - 1) * pageSize
  const pagedTasks  = filteredTasks.slice(pageStart, pageStart + pageSize)

  // Jump back to page 1 whenever the filters change the result set
  useEffect(() => { setPage(1) }, [filterStatus, filterProject, pageSize])

  return (
    <Layout title="Task Management" subtitle="One task per tree — assign to Admin or Partner accounts">
      <div style={{ padding: '24px' }}>

        {/* Project selector — scopes everything below it (cards + table).
            Status filtering is done by clicking the summary cards. */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={selectStyle}>
            <option value="all">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button onClick={() => { setBulkResult(null); setShowBulkModal(true) }} style={btnSecondary}>
              🌳 Generate from project trees
            </button>
            <button onClick={() => setShowModal(true)} style={btnPrimary}>+ Create Task</button>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{
            background: '#fff', border: `2px solid #11212122`, borderRadius: 10,
            padding: '12px 20px', minWidth: 110, cursor: 'pointer',
            outline: filterStatus === 'all' ? '2px solid #112121' : 'none',
          }} onClick={() => setFilterStatus('all')}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#112121' }}>{projectTasks.length}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>All tasks</div>
          </div>
          {['assigned', 'completed', 'approved', 'rejected'].map(s => (
            <div key={s} style={{
              background: '#fff', border: `2px solid ${STATUS_COLORS[s]}22`, borderRadius: 10,
              padding: '12px 20px', minWidth: 110, cursor: 'pointer',
              outline: filterStatus === s ? `2px solid ${STATUS_COLORS[s]}` : 'none',
            }} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}>
              <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_COLORS[s] }}>
                {s === 'assigned'
                  ? projectTasks.filter(t => t.status === 'assigned' && isFieldAssigned(t)).length
                  : (statusCounts[s] || 0)}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#666', textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>Loading tasks…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#888' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600 }}>No tasks found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Create a task, or generate one per tree for a whole project</div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8faf8', borderBottom: '2px solid #e8f0e8' }}>
                  {['Task Code', 'Name', 'Assigned To', 'Project', 'Priority', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedTasks.map((task, i) => (
                  <tr key={task.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f0f7f0', color: '#1a5c2a', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        {task.task_code || task.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 240 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</div>
                        {task.location && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {task.location}</div>}
                      </div>
                    </td>
                    <td style={tdStyle}>{task.assignee_name}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#555' }}>{task.project_name || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ background: PRIORITY_COLORS[task.priority] + '18', color: PRIORITY_COLORS[task.priority], padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                        {task.priority}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: (STATUS_COLORS[task.status] || '#888') + '18', color: STATUS_COLORS[task.status] || '#888', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#666' }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={tdStyle}>
                      {task.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setReviewingId(task.id); setReviewAction(null); setReviewNotes('') }}
                            title="Review this completed task"
                            style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                          >
                            🔍 Review
                          </button>
                          <button onClick={() => handleDelete(task.id, task.name)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            Delete
                          </button>
                        </div>
                      ) : reassigningId === task.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 220 }}>
                          <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                            Now: <strong style={{ color: '#1a5c2a' }}>{task.assignee_name}</strong> →
                          </span>
                          <select
                            value={reassignUserId}
                            onChange={e => setReassignUserId(e.target.value)}
                            style={{ ...selectStyle, padding: '4px 8px', fontSize: 12 }}
                          >
                            <option value="">Select field user…</option>
                            {fieldUsers.map(u => (
                              <option key={u.auth_id} value={u.auth_id}>{u.display_name}</option>
                            ))}
                          </select>
                          <button
                            disabled={reassigning || !reassignUserId}
                            onClick={() => handleReassign(task.id)}
                            style={{ background: '#1a5c2a', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11.5, fontWeight: 700 }}
                          >
                            {reassigning ? '…' : 'OK'}
                          </button>
                          <button
                            onClick={() => { setReassigningId(null); setReassignUserId('') }}
                            style={{ background: '#f5f5f5', color: '#555', border: '1px solid #ddd', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11.5 }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : fieldUsers.some(u => u.auth_id === task.assignee_id) ? (
                        // Already handed off to a field user — show who has it, not the button
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: '#eef6ee', color: '#1a5c2a', borderRadius: 6,
                            padding: '4px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                          }}>
                            ✓ {task.assignee_name}
                          </span>
                          <button
                            onClick={() => { setReassigningId(task.id); setReassignUserId(task.assignee_id) }}
                            title="Change assigned user"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', padding: '4px 2px' }}
                          >
                            ✎
                          </button>
                          <button onClick={() => handleDelete(task.id, task.name)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setReassigningId(task.id); setReassignUserId('') }}
                            title="Hand this ticket off to a real TreeApp field user"
                            style={{ background: '#eef6ee', color: '#1a5c2a', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                          >
                            👤 Assign to user
                          </button>
                          <button onClick={() => handleDelete(task.id, task.name)} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, flexWrap: 'wrap', padding: '12px 16px',
              borderTop: '1px solid #f0f0f0', background: '#fafafa',
            }}>
              <div style={{ fontSize: 12.5, color: '#666' }}>
                Showing <strong>{pageStart + 1}–{Math.min(pageStart + pageSize, filteredTasks.length)}</strong> of{' '}
                <strong>{filteredTasks.length}</strong> task{filteredTasks.length !== 1 ? 's' : ''}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  style={{ ...selectStyle, padding: '4px 8px', fontSize: 12 }}
                  title="Rows per page"
                >
                  {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>

                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ ...pagerBtn, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  ‹ Prev
                </button>

                {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  p === '…' ? (
                    <span key={`gap-${idx}`} style={{ fontSize: 12, color: '#aaa', padding: '0 4px' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      style={{
                        ...pagerBtn,
                        background: p === currentPage ? '#1a5c2a' : '#fff',
                        color:      p === currentPage ? '#fff' : '#333',
                        fontWeight: p === currentPage ? 700 : 500,
                      }}
                    >
                      {p}
                    </button>
                  )
                )}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ ...pagerBtn, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review (approve/reject) modal */}
      {reviewingId && (() => {
        const task = tasks.find(t => t.id === reviewingId)
        if (!task) return null
        const closeReview = () => { setReviewingId(null); setReviewAction(null); setReviewNotes('') }
        return (
          <div style={overlayStyle} onClick={closeReview}>
            <div style={{ ...modalStyle, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#1a5c2a' }}>Review task</h2>
                <button onClick={closeReview} style={closeBtnStyle} title="Close">✕</button>
              </div>

              {/* Photo the field user captured in the app */}
              {task.photo_url && (
                <a href={task.photo_url} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 14 }}>
                  <img
                    src={task.photo_url}
                    alt="Field capture"
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 10, border: '1px solid #e8f0e8', display: 'block' }}
                  />
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Tap to open full size ↗</div>
                </a>
              )}

              <div style={{ marginBottom: 18 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, background: '#f0f7f0', color: '#1a5c2a', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                  {task.task_code || task.id.slice(0, 8).toUpperCase()}
                </span>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#112121', marginTop: 8 }}>{task.name}</div>
                {(task.tree_species || task.tree_health) && (
                  <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
                    🌳 {task.tree_species || 'Unknown species'}
                    {task.tree_health ? ` · ${task.tree_health}` : ''}
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
                  👤 {task.assignee_name}
                  {task.project_name && task.project_name !== '—' ? ` · 🌿 ${task.project_name}` : ''}
                </div>
                {task.location && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>📍 {task.location}</div>
                )}
                {task.completed_at && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    ✅ Completed {new Date(task.completed_at).toLocaleString('en-GB')}
                  </div>
                )}
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note about this decision…"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  disabled={reviewing}
                  onClick={() => handleReview(task.id, 'approve')}
                  style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1 }}
                >
                  {reviewing && reviewAction === 'approve' ? 'Approving…' : '✓ Approve'}
                </button>
                <button
                  disabled={reviewing}
                  onClick={() => handleReview(task.id, 'reject')}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', flex: 1 }}
                >
                  {reviewing && reviewAction === 'reject' ? 'Rejecting…' : '✕ Reject'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Create single task modal */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a5c2a' }}>Create New Task</h2>
              <button onClick={() => setShowModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            <form onSubmit={handleCreate}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Task Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tree Survey — Phase 1" style={inputStyle} />
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Assign To ({roleLabel}) *</label>
                <select required value={form.assignee_id} onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))} style={inputStyle}>
                  <option value="">Select user…</option>
                  {assignableUsers.map(u => (
                    <option key={u.auth_id} value={u.auth_id}>{u.display_name} ({u.role})</option>
                  ))}
                </select>
                {assignableUsers.length === 0 && (
                  <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>No Admin/Partner accounts available to assign.</div>
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
                <label style={labelStyle}>Link to Tree Record (optional)</label>
                <select value={form.tree_id} onChange={e => setForm(f => ({ ...f, tree_id: e.target.value }))} style={inputStyle}>
                  <option value="">No tree linked (auto-generate code)</option>
                  {treeRecords.map(t => (
                    <option key={t.id} value={t.id}>{t.id.slice(0, 8).toUpperCase()} — {t.species || 'Unknown species'}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Task ID will be generated as TRK-XXXX-T001 based on tree ID</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Target Count</label>
                  <input type="number" min={1} value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: parseInt(e.target.value) || 1 }))} style={inputStyle} />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Sector 12, Ahmedabad" style={inputStyle} />
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1 }}>{submitting ? 'Creating…' : 'Create Task'}</button>
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
                <button
                  type="button"
                  style={{ ...btnPrimary, marginTop: 20 }}
                  onClick={() => { setShowBulkModal(false); setBulkForm({ project_id: '', assignee_id: '', priority: 'medium' }) }}
                >
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
                  <label style={labelStyle}>Assign All To ({roleLabel}) *</label>
                  <select required value={bulkForm.assignee_id} onChange={e => setBulkForm(f => ({ ...f, assignee_id: e.target.value }))} style={inputStyle}>
                    <option value="">Select user…</option>
                    {assignableUsers.map(u => (
                      <option key={u.auth_id} value={u.auth_id}>{u.display_name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div style={fieldGroup}>
                  <label style={labelStyle}>Priority</label>
                  <select value={bulkForm.priority} onChange={e => setBulkForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
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

// Builds a compact page list like [1, '…', 4, 5, 6, '…', 12] around the current page.
function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('…')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push('…')
  pages.push(total)

  return pages
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pagerBtn: React.CSSProperties = {
  minWidth: 30, padding: '4px 9px', borderRadius: 6,
  border: '1.5px solid #e0e0e0', background: '#fff', color: '#333',
  fontSize: 12.5, cursor: 'pointer', lineHeight: 1.6,
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520,
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }
const tdStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#333', verticalAlign: 'middle' }
const selectStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#fff', cursor: 'pointer', outline: 'none' }
const btnPrimary: React.CSSProperties = { background: '#1a5c2a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { background: '#f5f5f5', color: '#333', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const fieldGroup: React.CSSProperties = { marginBottom: 16 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }

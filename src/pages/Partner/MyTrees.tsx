/**
 * MyTrees — Read, Update and Delete for tree records recorded under this
 * partner's own team (Add Tree / bulk import write these; this is where they
 * get reviewed and corrected afterward).
 *
 * Editing is deliberately narrow — see TREE_EDITABLE_FIELDS in partner.js:
 * species, counts and descriptive fields can be fixed, but who/where/which
 * project cannot, and nothing can change once its verification task is
 * approved (it's already on the public ledger by then).
 */
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, Lock, TreePine, X, Sprout, Loader2, ChevronDown, Check, Leaf, UserCog, Search, ArrowRight, Eye, LayoutGrid, List, Map as MapIcon, Camera } from 'lucide-react'
import PartnerLayout from './PartnerLayout'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import RecordModal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/Toast'
import { TREE_STAGES, DEFAULT_STAGE, STAGE_STYLE } from '../../constants/treeStages'
import { useSpecies, type TreeSpecies } from '../../constants/treeSpecies'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import TreeDetailModal from '../../components/tree/TreeHistory'
import TreeMap from '../../components/map/TreeMap'
import { taskStatus, conditionTone, conditionColor, capitalise, formatDate, DEFAULT_PROJECT_COLOR } from '../../components/tree/treeLabels'
import './Partner.css'

interface TreeRow {
  id: string
  treeCode?: string
  stage?: string
  species: string
  scientificName: string | null
  quantity: number
  eventType: string | null
  healthStatus: string | null
  condition: string | null
  latitude: number
  longitude: number
  photoUrl: string | null
  notes: string | null
  projectId: string
  projectName: string
  userId: string
  recordedFor: string
  surveyor: string | null
  submittedAt: string
  surveyDate?: string | null
  taskStatus: string | null
  taskNeedsAssignee?: boolean
  /** planting | audit — which task the Task column is about. */
  taskType?: string | null
  taskAssigneeId?: string | null
  taskAssignee?: string | null
  /** Photo + location of the field capture that completed the current task. */
  capturePhoto?: string | null
  captureLocation?: string | null
  /** Older record with nobody named on it — its person can still be set. */
  canSetAssignee?: boolean
  taskId: string | null
  projectColor?: string | null
  /** Every photo of the tree (record, planting capture, audits), newest audit last. */
  photoUrls?: string[]
  photoCount?: number
  auditCount?: number
  latestAudit?: {
    round: number
    status: string
    date: string | null
    condition: string | null
    health: string | null
    survival: string | null
    photo: string | null
  } | null
}

// Under plantation → Planted (task created) → Field Operator assigned → in
// progress → completed → approved (ledger) / rejected (redo).
const TASK_STATUS_LABEL: Record<string, { label: string; badge: string }> = {
  assigned:    { label: 'Assigned to field operator', badge: 'pending' },
  in_progress: { label: 'Survey in progress', badge: 'progress' },
  completed:   { label: 'Awaiting your review', badge: 'info' },
  approved:    { label: 'Verified · on ledger', badge: 'approved' },
  rejected:    { label: 'Rejected', badge: 'rejected' },
}

// Planting task while the tree is under plantation; audit task once it's planted.
const PLANTING_STATUS_LABEL: Record<string, { label: string; badge: string }> = {
  assigned:    { label: 'Planting assigned', badge: 'pending' },
  in_progress: { label: 'Planting in progress', badge: 'progress' },
  completed:   { label: 'Planted · awaiting your review', badge: 'info' },
  approved:    { label: 'Planting approved', badge: 'approved' },
  rejected:    { label: 'Planting rejected', badge: 'rejected' },
}

/**
 * One-word status for where the tree is in its whole life cycle:
 * Pending → In planting → Planting review → In audit → Audit review → Verified.
 */
function overallStatus(t: { taskStatus: string | null; taskType?: string | null; taskNeedsAssignee?: boolean; stage?: string }) {
  const stage = t.stage || DEFAULT_STAGE
  if (stage === 'Dead') return { label: 'Dead', bg: '#F4E4E4', fg: '#A32020' }
  if (t.taskStatus === 'rejected') return { label: 'Rejected', bg: '#FBE9E9', fg: '#A32020' }
  if (t.taskType === 'planting' || (!t.taskType && stage === DEFAULT_STAGE)) {
    if (!t.taskStatus || t.taskNeedsAssignee) return { label: 'Pending', bg: '#F2EFEA', fg: '#6B7B6E' }
    if (t.taskStatus === 'completed')          return { label: 'Planting review', bg: '#E8F1FB', fg: '#185FA5' }
    return { label: 'In planting', bg: '#FFF4E0', fg: '#8B5A00' }
  }
  if (t.taskStatus === 'approved')  return { label: 'Verified', bg: '#D9EBD2', fg: '#1C3A2B' }
  if (t.taskStatus === 'completed') return { label: 'Audit review', bg: '#E8F1FB', fg: '#185FA5' }
  if (!t.taskStatus || t.taskNeedsAssignee) return { label: 'Planted', bg: '#EAF3DE', fg: '#27500A' }
  return { label: 'In audit', bg: '#EFE9FB', fg: '#5B3FA8' }
}

function verificationLabel(t: { taskStatus: string | null; taskNeedsAssignee?: boolean; taskType?: string | null; stage?: string }) {
  const planting = t.taskType === 'planting'
  if (!t.taskStatus) {
    return (t.stage || DEFAULT_STAGE) === DEFAULT_STAGE
      ? { label: 'No planting task', badge: '' }
      : { label: 'No audit task', badge: '' }
  }
  if (t.taskStatus === 'assigned' && t.taskNeedsAssignee) {
    return { label: planting ? 'Planting · needs field operator' : 'Audit · needs field operator', badge: 'pending' }
  }
  const map = planting ? PLANTING_STATUS_LABEL : TASK_STATUS_LABEL
  return map[t.taskStatus] || { label: t.taskStatus, badge: '' }
}

export default function MyTrees({ title = 'Tree listing', showAdd = false, compact = false }: { title?: string; showAdd?: boolean; compact?: boolean }) {
  const { session } = useAuth()
  const token = session?.access_token
  const { species: speciesList, find: findSpecies, add: addSpecies } = useSpecies()

  const [trees,   setTrees]   = useState<TreeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const toast = useToast()
  // Success messages show as a snackbar; partial successes as a warning.
  const setNotice = (m: string | null) => {
    if (!m) return
    if (/\bbut\b|not (saved|uploaded)/i.test(m)) toast.warning(m)
    else toast.success(m)
  }

  const [editing,    setEditing]    = useState<TreeRow | null>(null)
  const [editForm,   setEditForm]   = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError,  setEditError]  = useState<string | null>(null)

  const [plantingId,    setPlantingId]    = useState<string | null>(null)
  // Assign action: filter by stage, and select several trees to mark planted at once.
  const [stageFilter,   setStageFilter]   = useState<string>('all')
  const [search,        setSearch]        = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [bulkPlanting,  setBulkPlanting]  = useState(false)
  // "Assign planting" pop-up: which trees, which field operator.
  const [plantFor,      setPlantFor]      = useState<string[] | null>(null)
  // Reviewing a completed planting (Confirm planted / Reject).
  const [reviewing,     setReviewing]     = useState<TreeRow | null>(null)
  const [reviewNote,    setReviewNote]    = useState('')
  const [reviewBusy,    setReviewBusy]    = useState<'approve' | 'reject' | null>(null)
  const [plantAssignee, setPlantAssignee] = useState('')
  const [plantError,    setPlantError]    = useState<string | null>(null)
  const [fieldOps,      setFieldOps]      = useState<{ auth_id: string; display_name: string }[]>([])
  const [confirmDelete, setConfirmDelete] = useState<TreeRow | null>(null)
  const [deleting,      setDeleting]      = useState(false)
  // Tree details pop-up, extra filters, and how the list is shown.
  const [detailId,        setDetailId]        = useState<string | null>(null)
  const [conditionFilter, setConditionFilter] = useState('all')
  const [statusFilter,    setStatusFilter]    = useState('all')
  const [auditFilter,     setAuditFilter]     = useState('all')
  const [view,            setView]            = useState<'table' | 'cards' | 'map'>(() => {
    try { const v = localStorage.getItem('fe.trees.view'); return v === 'cards' || v === 'map' ? v : 'table' } catch { return 'table' }
  })
  useEffect(() => { try { localStorage.setItem('fe.trees.view', view) } catch { /* private mode */ } }, [view])

  // ── Add record (Action listing) ────────────────────────────────────────────
  const today = () => new Date().toISOString().slice(0, 10)
  const emptyAdd = () => ({ userId: '', projectId: '', species: '', scientific: '', co2: '', date: today() })
  const [adding,    setAdding]    = useState(false)
  const [addForm,   setAddForm]   = useState(emptyAdd)
  const [addError,  setAddError]  = useState<string | null>(null)
  const [savingAdd, setSavingAdd] = useState(false)
  const [teamUsers, setTeamUsers] = useState<{ effectiveId: string; teamMemberId: string; name: string; email: string; projectId?: string | null }[]>([])
  const [projects,  setProjects]  = useState<{ id: string; name: string }[]>([])

  async function openAdd() {
    setAddError(null)
    setAdding(true)
    try {
      const headers = { Authorization: `Bearer ${token || ''}` }
      const [u, p] = await Promise.all([
        fetch(`${API}/api/partner/team-users`, { headers }).then(r => r.json()),
        fetch(`${API}/api/partner/projects`,   { headers }).then(r => r.json()),
      ])
      const users = (u.users || []).filter((x: { canRecord: boolean }) => x.canRecord)
      const projs = (p.projects || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name }))
      setTeamUsers(users)
      setProjects(projs)
      const defaultProjectId = projs[0]?.id || ''
      // Auto-pick the user assigned to this project; fall back to first user
      const defaultUser = users.find((x: { projectId?: string | null }) => x.projectId === defaultProjectId) || users[0]
      setAddForm({ ...emptyAdd(), userId: defaultUser?.effectiveId || '', projectId: defaultProjectId })
    } catch {
      setAddError('Could not load your team or projects.')
      setAddForm(emptyAdd())
    }
  }

  function onAddSpecies(value: string) {
    const match = findSpecies(value)
    setAddForm(f => ({
      ...f,
      species:    value,
      scientific: match ? match.scientific : f.scientific,
      co2:        match ? String(match.co2PerYear) : f.co2,
    }))
  }

  async function saveAdd() {
    const species = addForm.species.trim()
    if (!species)           return setAddError('Species is required')
    const co2 = Number(addForm.co2)
    if (addForm.co2 !== '' && (!Number.isFinite(co2) || co2 < 0)) return setAddError('CO₂ must be a number')

    setSavingAdd(true)
    setAddError(null)
    try {
      const form = new FormData()
      form.append('user_id', addForm.userId)
      form.append('project_id', addForm.projectId)
      form.append('species', species)
      form.append('quantity', '1')
      form.append('event_type', 'Planting')
      form.append('health_status', 'healthy')
      form.append('tree_condition', 'Healthy')
      if (addForm.scientific.trim()) form.append('scientific_name', addForm.scientific.trim())
      if (addForm.date) form.append('survey_date', addForm.date)

      const res = await fetch(`${API}/api/partner/trees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to add record')

      // A species that is not in the list yet: add it (with its CO₂) to the species API.
      let notice = 'Record added.'
      if (addForm.co2 !== '' && !findSpecies(species)) {
        try {
          await addSpecies({ name: species, scientific: addForm.scientific.trim(), co2PerYear: co2 })
        } catch (e: unknown) {
          notice = `Record added, but the species was not saved: ${e instanceof Error ? e.message : 'unknown error'}`
        }
      }
      setAdding(false)
      setNotice(notice)
      load()
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Failed to add record')
    } finally {
      setSavingAdd(false)
    }
  }

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/partner/trees`, { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load')
      setTrees(d.trees || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trees')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  function openEdit(t: TreeRow) {
    setEditing(t)
    setEditError(null)
    // Records with nobody named on them can be given their person — load the team for that.
    if (t.canSetAssignee && teamUsers.length === 0) {
      fetch(`${API}/api/partner/team-users`, { headers: { Authorization: `Bearer ${token || ''}` } })
        .then(r => r.json())
        .then(u => setTeamUsers(u.users || []))
        .catch(() => {})
    }
    setEditForm({
      species: t.species || '',
      scientific_name: t.scientificName || '',
      quantity: String(t.quantity || 1),
      event_type: t.eventType || 'Planting',
      health_status: t.healthStatus || 'healthy',
      tree_condition: t.condition || '',
      stage: t.stage || DEFAULT_STAGE,
      notes: t.notes || '',
      co2: String(findSpecies(t.species)?.co2PerYear ?? ''),
      survey_date: (t.surveyDate || t.submittedAt || '').slice(0, 10),
      team_member_id: '',
    })
  }

  function onEditSpecies(value: string) {
    const match = findSpecies(value)
    setEditForm(f => ({
      ...f,
      species:         value,
      scientific_name: match ? match.scientific : f.scientific_name,
      co2:             match ? String(match.co2PerYear) : f.co2,
    }))
  }

  const codeOf = (t: TreeRow) => t.treeCode || `TREE-${t.id.slice(0, 8).toUpperCase()}`

  async function patchStage(id: string, stage: string) {
    const res = await fetch(`${API}/api/partner/trees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stage }),
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Failed to update stage')
    return d as { taskCreated?: unknown }
  }

  /** Changes one tree's stage; Planted creates its verification task on the server. */
  async function changeStage(t: TreeRow, stage: string) {
    if ((t.stage || DEFAULT_STAGE) === stage) return
    setPlantingId(t.id)
    try {
      const d = await patchStage(t.id, stage)
      setNotice(d.taskCreated
        ? `${codeOf(t)} marked ${stage.toLowerCase()} — its verification task is now in Tasks. Assign a field operator there.`
        : `${codeOf(t)} moved to ${stage}.`)
      setSelected(prev => { const n = new Set(prev); n.delete(t.id); return n })
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update stage')
    } finally {
      setPlantingId(null)
    }
  }

  /**
   * A tree becomes Planted only through the field: pick a field operator, they
   * plant it and capture it in the app, you confirm it in Tasks, then its audit opens.
   */
  async function openAssignPlanting(ids: string[]) {
    if (ids.length === 0) return
    setPlantFor(ids)
    setPlantAssignee('')
    setPlantError(null)
    if (fieldOps.length === 0) {
      try {
        const res = await fetch(`${API}/api/admin/tasks/assignable-users?pool=field`, { headers: { Authorization: `Bearer ${token || ''}` } })
        const d = await res.json()
        setFieldOps(d.users || [])
      } catch {
        setPlantError('Could not load field operators.')
      }
    }
  }

  async function reviewPlanting(action: 'approve' | 'reject') {
    if (!reviewing?.taskId) return
    if (action === 'reject' && !reviewNote.trim()) { toast.error('Say why the planting is rejected'); return }
    setReviewBusy(action)
    try {
      const res = await fetch(`${API}/api/admin/tasks/${reviewing.taskId}/${action === 'approve' ? 'approve' : 'request-changes'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ review_notes: reviewNote.trim() || null }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to submit review')
      toast.success(action === 'approve'
        ? `${codeOf(reviewing)} is now Planted — its audit task is in Tasks.`
        : `Rejected — sent back to ${reviewing.taskAssignee || 'the field operator'}.`)
      setReviewing(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit review')
    } finally {
      setReviewBusy(null)
    }
  }

  async function assignPlanting() {
    if (!plantFor || !plantAssignee) { setPlantError('Choose a field operator'); return }
    setBulkPlanting(true)
    setPlantError(null)
    try {
      const res = await fetch(`${API}/api/partner/trees/assign-planting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ tree_ids: plantFor, assignee_id: plantAssignee }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to assign planting')
      toast.success(`${d.assigned} planting task${d.assigned === 1 ? '' : 's'} assigned to ${d.assignee}. The tree${d.assigned === 1 ? ' becomes' : 's become'} Planted when you confirm the planting in Tasks.`)
      setPlantFor(null)
      setSelected(new Set())
      await load()
    } catch (e: unknown) {
      setPlantError(e instanceof Error ? e.message : 'Failed to assign planting')
    } finally {
      setBulkPlanting(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`${API}/api/partner/trees/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify((({ co2: _co2, ...rest }) => rest)(editForm)),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save')

      // CO₂ lives on the species — add a species that is not in the list yet.
      const co2 = Number(editForm.co2)
      let notice = d.taskCreated
        ? 'Record updated — the tree is planted, so its verification task is now in Tasks.'
        : 'Record updated.'
      if (editForm.co2 !== '' && Number.isFinite(co2) && !findSpecies(editForm.species)) {
        try {
          await addSpecies({ name: editForm.species.trim(), scientific: editForm.scientific_name.trim(), co2PerYear: co2 })
        } catch (e: unknown) {
          notice = `Record updated, but the species was not saved: ${e instanceof Error ? e.message : 'unknown error'}`
        }
      }
      setEditing(null)
      setNotice(notice)
      await load()
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSavingEdit(false)
    }
  }

  async function doDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/partner/trees/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to delete')
      setNotice(d.taskRemoved ? 'Record deleted, along with its unverified task.' : 'Record deleted.')
      setConfirmDelete(null)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const locked = (t: TreeRow) => t.taskStatus === 'approved'

  // Records first, then (on Action listing) the built-in species — one list, one pager.
  type Row = { kind: 'tree'; t: TreeRow } | { kind: 'default'; s: TreeSpecies }
  const stageOf = (t: TreeRow) => t.stage || DEFAULT_STAGE
  const co2Of = (t: TreeRow) => { const sp = findSpecies(t.species); return sp ? sp.co2PerYear * t.quantity : 0 }
  const q = search.trim().toLowerCase()
  // Search + project narrow the list first; the stage tabs count within that.
  const conditionOf = (t: TreeRow) => (t.latestAudit?.condition || t.condition || '').trim()
  const auditKey = (t: TreeRow) => t.latestAudit ? t.latestAudit.status : 'none'
  const searchedTrees = compact ? trees : trees.filter(t =>
    (projectFilter === 'all' || t.projectId === projectFilter) &&
    (conditionFilter === 'all' || conditionOf(t).toLowerCase() === conditionFilter || (t.healthStatus || '').toLowerCase() === conditionFilter) &&
    (statusFilter === 'all' || overallStatus(t).label === statusFilter) &&
    (auditFilter === 'all' || auditKey(t) === auditFilter) &&
    (!q || [codeOf(t), t.species, t.scientificName || '', t.recordedFor, t.projectName].some(v => v.toLowerCase().includes(q)))
  )
  // Filter choices come from the data, so only values that exist are offered.
  const conditionOptions = [...new Set(trees.flatMap(t => [conditionOf(t), t.healthStatus || '']).map(v => v.toLowerCase()).filter(Boolean))].sort()
  const statusOptions = [...new Set(trees.map(t => overallStatus(t).label))].sort()
  const auditOptions = [...new Set(trees.map(auditKey))]
  const filtersOn = conditionFilter !== 'all' || statusFilter !== 'all' || auditFilter !== 'all' || projectFilter !== 'all' || !!q
  const clearFilters = () => { setSearch(''); setProjectFilter('all'); setStageFilter('all'); setConditionFilter('all'); setStatusFilter('all'); setAuditFilter('all') }
  const visibleTrees = compact || stageFilter === 'all' ? searchedTrees : searchedTrees.filter(t => stageOf(t) === stageFilter)
  const projectOptions = [...new Map(trees.map(t => [t.projectId, t.projectName])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const summary = {
    trees:     trees.reduce((n, t) => n + (t.quantity || 1), 0),
    records:   trees.length,
    planted:   trees.filter(t => stageOf(t) !== DEFAULT_STAGE).length,
    co2:       Math.round(trees.reduce((n, t) => n + co2Of(t), 0) * 10) / 10,
    needsOp:   trees.filter(t => t.taskNeedsAssignee).length,
    toReview:  trees.filter(t => t.taskStatus === 'completed').length,
  }
  const stageCounts = TREE_STAGES.map(st => ({ st, n: searchedTrees.filter(t => stageOf(t) === st).length })).filter(x => x.n > 0)
  const rows: Row[] = [
    ...visibleTrees.map(t => ({ kind: 'tree' as const, t })),
    ...(compact ? speciesList.map(s => ({ kind: 'default' as const, s })) : []),
  ]
  const pg = usePagination(rows)

  return (
    <PartnerLayout title={title} subtitle={compact ? "Tree species and the CO₂ each one absorbs per year" : "Trees assigned to your users, by project — fix mistakes before they're verified"}>
      <div>
        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!compact && !loading && trees.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
            <SummaryCard icon={<TreePine size={18} />} label="Total trees" value={summary.trees.toLocaleString('en-IN')} hint={`${summary.records} record${summary.records === 1 ? '' : 's'}`} />
            <SummaryCard icon={<Sprout size={18} />} label="Planted" value={`${summary.planted} / ${summary.records}`} hint={`${summary.records - summary.planted} under plantation`} />
            <SummaryCard icon={<Leaf size={18} />} label="CO₂ absorbed" value={summary.co2.toLocaleString('en-IN')} unit="kg/yr" hint="from species in Action listing" />
            <SummaryCard
              icon={<UserCog size={18} />}
              label="Need a field operator"
              value={String(summary.needsOp)}
              hint={summary.toReview > 0 ? `${summary.toReview} awaiting your review` : 'Assign them in Tasks'}
              tone={summary.needsOp > 0 ? 'warn' : 'default'}
              to="/partner/tasks"
            />
          </div>
        )}

        {!compact && trees.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9AA79C', pointerEvents: 'none' }} />
              <input
                type="search"
                className="sp-input"
                aria-label="Search trees"
                placeholder="Search by tree ID, species, user or project"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(new Set()) }}
                style={{ width: '100%', paddingLeft: 36 }}
              />
            </div>
            {projectOptions.length > 1 && (
              <select
                className="sp-select"
                aria-label="Filter by project"
                value={projectFilter}
                onChange={e => { setProjectFilter(e.target.value); setSelected(new Set()) }}
                style={{ flex: '0 1 260px', minWidth: 180 }}
              >
                <option value="all">All projects</option>
                {projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            )}
            <select className="sp-select" aria-label="Filter by condition" value={conditionFilter} onChange={e => { setConditionFilter(e.target.value); setSelected(new Set()) }} style={{ flex: '0 1 180px', minWidth: 150 }}>
              <option value="all">Any condition</option>
              {conditionOptions.map(c => <option key={c} value={c}>{capitalise(c)}</option>)}
            </select>
            <select className="sp-select" aria-label="Filter by status" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setSelected(new Set()) }} style={{ flex: '0 1 180px', minWidth: 150 }}>
              <option value="all">Any status</option>
              {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="sp-select" aria-label="Filter by latest audit" value={auditFilter} onChange={e => { setAuditFilter(e.target.value); setSelected(new Set()) }} style={{ flex: '0 1 200px', minWidth: 160 }}>
              <option value="all">Any audit</option>
              {auditOptions.map(a => <option key={a} value={a}>{a === 'none' ? 'No audit yet' : `Latest audit: ${taskStatus(a).label}`}</option>)}
            </select>
            {filtersOn && (
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => { clearFilters(); setSelected(new Set()) }} style={{ height: 38 }}>
                <X size={14} /> Clear
              </button>
            )}
            <div role="tablist" aria-label="View" style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2, padding: 3, background: '#EFEAE3', borderRadius: 10 }}>
              {([['table', <List size={15} key="i" />, 'Table'], ['cards', <LayoutGrid size={15} key="i" />, 'Cards'], ['map', <MapIcon size={15} key="i" />, 'Map']] as const).map(([v, icon, label]) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: 'none',
                    background: view === v ? '#fff' : 'transparent', boxShadow: view === v ? '0 1px 3px rgba(17,33,33,0.12)' : 'none',
                    color: view === v ? '#1C2B22' : '#6B7B6E', fontFamily: 'inherit', fontSize: 12.5, fontWeight: view === v ? 700 : 600, cursor: 'pointer',
                  }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showAdd && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {!compact && trees.length > 0 ? (
              <div role="tablist" aria-label="Filter by stage" style={{ display: 'inline-flex', gap: 4, padding: 4, background: '#EFEAE3', borderRadius: 12, flexWrap: 'wrap' }}>
                {[{ st: 'all', n: searchedTrees.length }, ...stageCounts].map(({ st, n }) => {
                  const on = stageFilter === st
                  const c  = st === 'all' ? null : STAGE_STYLE[st]
                  return (
                    <button
                      key={st}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => { setStageFilter(st); setSelected(new Set()) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9, border: 'none',
                        background: on ? '#fff' : 'transparent', boxShadow: on ? '0 1px 3px rgba(17,33,33,0.12)' : 'none',
                        color: on ? '#1C2B22' : '#6B7B6E', fontFamily: 'inherit', fontSize: 12.5, fontWeight: on ? 700 : 600, cursor: 'pointer',
                      }}
                    >
                      {c && <span style={{ width: 8, height: 8, borderRadius: 4, background: c.fg }} />}
                      {st === 'all' ? 'All' : st}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999, background: on ? '#EAF3DE' : '#E3DDD4', color: on ? '#27500A' : '#7A867C' }}>{n}</span>
                    </button>
                  )
                })}
              </div>
            ) : <span />}
            <Link to="/partner/actions/new" className="pl-btn pl-btn--primary">+ Add trees</Link>
          </div>
        )}

        {!compact && selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#1C3A2B', color: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{selected.size} tree{selected.size > 1 ? 's' : ''} selected</span>
            <button
              type="button"
              onClick={() => openAssignPlanting([...selected])}
              disabled={bulkPlanting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: 'none', background: '#8FD19E', color: '#10301E', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {bulkPlanting ? <Loader2 size={15} className="spin" /> : <Sprout size={15} />}
              Assign planting
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={bulkPlanting}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        )}
        {compact && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" className="pl-btn pl-btn--primary" onClick={openAdd}>+ Add</button>
          </div>
        )}

        <div className="pl-card">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 44 }} />)}
            </div>
          ) : !compact && trees.length > 0 && visibleTrees.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">🔍</div>
              <div className="pl-empty__title">No trees match</div>
              <div className="pl-empty__sub">Try another search, project, stage, condition, status or audit.</div>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={clearFilters}>Clear filters</button>
            </div>
          ) : trees.length === 0 && !compact ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">🌳</div>
              <div className="pl-empty__title">No trees recorded yet</div>
              <div className="pl-empty__sub">Trees added for your team — one at a time or by spreadsheet — show up here.</div>
              {showAdd && <Link to="/partner/actions/new" className="pl-btn pl-btn--primary">Add tree</Link>}
            </div>
          ) : !compact && view === 'map' ? (
            <div>
              <TreeMap
                height={520}
                points={visibleTrees.map(t => ({
                  id: t.id,
                  latitude: t.latitude,
                  longitude: t.longitude,
                  color: conditionColor(conditionOf(t) || t.healthStatus),
                  label: `${codeOf(t)} · ${t.species}`,
                  sublabel: `${t.projectName} · ${overallStatus(t).label}${conditionOf(t) ? ` · ${conditionOf(t)}` : ''}`,
                }))}
                onPointClick={setDetailId}
                emptyText="None of these trees has a GPS location yet."
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#6B7B6E', marginTop: 10 }}>
                {['Healthy', 'Average', 'Poor', 'Dead'].map(c => (
                  <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 5, background: conditionColor(c) }} />{c}
                  </span>
                ))}
                <span style={{ marginLeft: 'auto' }}>
                  {visibleTrees.filter(t => Number(t.latitude) && Number(t.longitude)).length} of {visibleTrees.length} trees have a location · click a dot for details
                </span>
              </div>
            </div>
          ) : !compact && view === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
              {(pg.items.filter(r => r.kind === 'tree') as { kind: 'tree'; t: TreeRow }[]).map(({ t }) => (
                <TreeCard
                  key={t.id}
                  t={t}
                  code={codeOf(t)}
                  status={overallStatus(t)}
                  task={verificationLabel(t)}
                  condition={conditionOf(t)}
                  onOpen={() => setDetailId(t.id)}
                  onEdit={locked(t) ? undefined : () => openEdit(t)}
                />
              ))}
            </div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  {compact ? (
                    <>
                      <th>Species</th>
                      <th>Scientific name</th>
                      <th>CO₂ (kg/yr)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: 36 }}>
                        {(() => {
                          const selectable = pg.items.filter(r => r.kind === 'tree' && stageOf(r.t) === DEFAULT_STAGE).map(r => (r as { t: TreeRow }).t.id)
                          if (selectable.length === 0) return null
                          const all = selectable.every(id => selected.has(id))
                          return (
                            <input
                              type="checkbox"
                              aria-label="Select all trees under plantation on this page"
                              title="Select all under plantation"
                              checked={all}
                              onChange={() => setSelected(prev => {
                                const n = new Set(prev)
                                selectable.forEach(id => all ? n.delete(id) : n.add(id))
                                return n
                              })}
                              style={{ width: 16, height: 16, accentColor: '#2B5341', cursor: 'pointer' }}
                            />
                          )
                        })()}
                      </th>
                      <th>Tree ID</th>
                      <th>Assigned to · Project</th>
                      <th>Species</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>CO₂ (kg/yr)</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Current task</th>
                    </>
                  )}
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pg.items.map(row => {
                  if (row.kind === 'default') {
                    const s = row.s
                    return (
                      <tr key={`species-${s.id || s.name}`}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{s.scientific}</td>
                        <td>{s.co2PerYear}</td>
                        <td style={{ color: '#9AA79C', fontSize: 12 }}>—</td>
                        <td><span className="pl-badge" style={{ fontSize: 11 }}>{s.isDefault === false ? 'Added' : 'Default'}</span></td>
                      </tr>
                    )
                  }
                  const t = row.t
                  const st  = verificationLabel(t)
                  const sp  = findSpecies(t.species)
                  const sci = t.scientificName || sp?.scientific || '—'
                  const co2 = sp ? +(sp.co2PerYear * t.quantity).toFixed(1) : undefined
                  return (
                    <tr key={t.id}>
                      {compact ? (
                        <>
                          <td style={{ fontWeight: 600 }}>{t.species}</td>
                          <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{sci}</td>
                          <td>{co2 ?? '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            {stageOf(t) === DEFAULT_STAGE ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${codeOf(t)}`}
                                checked={selected.has(t.id)}
                                onChange={() => setSelected(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n })}
                                style={{ width: 16, height: 16, accentColor: '#2B5341', cursor: 'pointer' }}
                              />
                            ) : (
                              <input type="checkbox" disabled aria-label={`${codeOf(t)} is already planted`} title="Already planted" style={{ width: 16, height: 16, opacity: 0.35 }} />
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setDetailId(t.id)}
                              title="Photos, location and audit history"
                              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, fontWeight: 700, color: '#2B5341', background: '#F2F6EE', border: '1px solid #DCE8D3', borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                            >
                              {t.treeCode || `TREE-${t.id.slice(0, 8).toUpperCase()}`}
                            </button>
                            {(t.photoCount ?? 0) > 0 && (
                              <div style={{ fontSize: 11, color: '#7A867C', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Camera size={11} /> {t.photoCount} · {t.auditCount ? `${t.auditCount} audit${t.auditCount === 1 ? '' : 's'}` : 'no audit'}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 30, height: 30, borderRadius: 15, background: '#EAF3DE', color: '#2B5341', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {initials(t.recordedFor)}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#1C2B22', whiteSpace: 'nowrap' }}>{t.recordedFor}</div>
                                <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 1 }}>{t.projectName}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1C2B22' }}>{t.species}</div>
                            {sci !== '—' && <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 1 }}>{sci}</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.quantity}</td>
                          <td style={{ textAlign: 'right' }}>
                            {co2 ?? <span title="This species is not in Action listing — add it there to see its CO₂" style={{ color: '#B5BDB6', cursor: 'help' }}>—</span>}
                          </td>
                          <td>
                            {(() => {
                              const stg = t.stage || DEFAULT_STAGE
                              const c   = STAGE_STYLE[stg] || { bg: '#F2EFEA', fg: '#6B7B6E' }
                              return (
                                <div>
                                  <StageMenu
                                    value={stg}
                                    busy={plantingId === t.id}
                                    // Verified records are locked; once field work starts it can't go back.
                                    disabled={locked(t)}
                                    // Planting is one-way — a planted tree never goes back.
                                    blocked={stg !== DEFAULT_STAGE ? [DEFAULT_STAGE] : []}
                                    // Under plantation → Planted happens through a field operator.
                                    onChange={next => stg === DEFAULT_STAGE ? openAssignPlanting([t.id]) : changeStage(t, next)}
                                    colors={c}
                                  />
                                </div>
                              )
                            })()}
                          </td>
                          <td>
                            {(() => {
                              const os = overallStatus(t)
                              return (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: os.bg, color: os.fg, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  <span style={{ width: 7, height: 7, borderRadius: 4, background: os.fg }} />
                                  {os.label}
                                </span>
                              )
                            })()}
                          </td>
                          <td>
                            {t.taskType === 'planting' && t.taskId ? (
                              // Planting is handled here, not on the Tasks page.
                              t.taskStatus === 'completed' ? (
                                <button type="button" onClick={() => { setReviewing(t); setReviewNote('') }}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, border: '1.5px solid #C9DDF2', background: '#E8F1FB', color: '#185FA5', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  <Check size={13} /> Review planting
                                </button>
                              ) : t.taskNeedsAssignee || t.taskStatus === 'rejected' ? (
                                <button type="button" onClick={() => openAssignPlanting([t.id])}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, border: 'none', background: '#2B5341', color: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                  <UserCog size={13} /> {t.taskStatus === 'rejected' ? 'Reassign planting' : 'Assign field operator'}
                                </button>
                              ) : (
                                <div>
                                  <span className={`pl-badge pl-badge--${st.badge || 'pending'}`} style={{ whiteSpace: 'nowrap' }}>{st.label}</span>
                                  <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 4, whiteSpace: 'nowrap' }}>
                                    {t.taskAssignee || 'Field operator'}
                                    {t.taskStatus === 'assigned' && (
                                      <button type="button" onClick={() => openAssignPlanting([t.id])}
                                        style={{ marginLeft: 6, background: 'none', border: 'none', padding: 0, color: '#185FA5', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                                        Change
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            ) : t.taskId && (t.taskNeedsAssignee || t.taskStatus === 'completed') ? (
                              <Link
                                to="/partner/tasks"
                                className={`pl-badge pl-badge--${st.badge || 'pending'}`}
                                title={t.taskNeedsAssignee ? 'Open Tasks to assign a field operator' : 'Open Tasks to review'}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', textDecoration: 'none' }}
                              >
                                {st.label} <ArrowRight size={12} />
                              </Link>
                            ) : st.badge ? (
                              <span className={`pl-badge pl-badge--${st.badge}`} style={{ whiteSpace: 'nowrap' }}>{st.label}</span>
                            ) : (
                              <span className="pl-badge" style={{ background: '#F2EFEA', color: '#6B7B6E', whiteSpace: 'nowrap' }}>{st.label}</span>
                            )}
                          </td>
                        </>
                      )}
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{new Date(t.surveyDate || t.submittedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {!compact && (
                            <button
                              type="button"
                              className="pl-btn pl-btn--ghost"
                              style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => setDetailId(t.id)}
                              title="View photos, location and audit history"
                              aria-label="View details"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="pl-btn pl-btn--ghost"
                            style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => openEdit(t)}
                            disabled={locked(t)}
                            title={locked(t) ? 'Already verified — no longer editable' : 'Edit'}
                            aria-label={locked(t) ? 'Locked' : 'Edit'}
                          >
                            {locked(t) ? <Lock size={14} /> : <Pencil size={14} />}
                          </button>
                          {!locked(t) && (
                            <button
                              type="button"
                              className="pl-btn pl-btn--ghost"
                              style={{ height: 30, width: 30, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#A32020' }}
                              onClick={() => setConfirmDelete(t)}
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {!loading && !(view === 'map' && !compact) && <Pagination {...pg} noun="record" />}
        </div>
      </div>

      {detailId && (
        <TreeDetailModal historyUrl={`${API}/api/partner/trees/${detailId}/history`} onClose={() => setDetailId(null)} />
      )}

      {/* Review a completed planting */}
      {reviewing && (
        <RecordModal
          icon={<Sprout size={18} />}
          title="Review planting"
          subtitle={`${codeOf(reviewing)} · ${reviewing.species} · ${reviewing.projectName}`}
          onClose={() => setReviewing(null)}
          width={520}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" style={{ color: '#A32020' }} onClick={() => reviewPlanting('reject')} disabled={!!reviewBusy}>
              {reviewBusy === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => reviewPlanting('approve')} disabled={!!reviewBusy}>
              {reviewBusy === 'approve' ? 'Confirming…' : '✓ Confirm planted'}
            </button>
          </>}
        >
          {reviewing.capturePhoto ? (
            <a href={reviewing.capturePhoto} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: 14 }}>
              <img src={reviewing.capturePhoto} alt="Planting capture" style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12, border: '1px solid #EEE9E1', display: 'block' }} />
            </a>
          ) : (
            <div style={{ padding: 16, borderRadius: 12, background: '#FAF8F4', color: '#9AA79C', fontSize: 12.5, textAlign: 'center', marginBottom: 14 }}>No photo was captured.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5, marginBottom: 14 }}>
            <div><div style={{ color: '#9AA79C' }}>Planted by</div><div style={{ fontWeight: 600, color: '#1C2B22' }}>{reviewing.taskAssignee || '—'}</div></div>
            <div><div style={{ color: '#9AA79C' }}>Location</div><div style={{ fontWeight: 600, color: '#1C2B22' }}>{reviewing.captureLocation || '—'}</div></div>
          </div>
          <div className="sp-field">
            <label className="sp-label" htmlFor="rp-note">Note</label>
            <textarea id="rp-note" className="sp-textarea" rows={2} style={FULL} placeholder="Why is it rejected? (required to reject)" value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
          </div>
          <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 10, lineHeight: 1.5 }}>
            Confirming makes the tree <strong>Planted</strong> and opens its <strong>audit task</strong> in Tasks. Rejecting sends it back to the field operator with your note.
          </div>
        </RecordModal>
      )}

      {/* Assign planting */}
      {plantFor && (
        <RecordModal
          icon={<Sprout size={18} />}
          title={plantFor.length === 1 ? 'Assign planting' : `Assign planting · ${plantFor.length} trees`}
          subtitle={plantFor.length === 1
            ? (() => { const t = trees.find(x => x.id === plantFor[0]); return t ? `${codeOf(t)} · ${t.species} · ${t.projectName}` : '' })()
            : 'The same field operator plants all of them.'}
          error={plantError}
          onClose={() => setPlantFor(null)}
          width={520}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setPlantFor(null)}>Cancel</button>
            <button type="button" className="pl-btn pl-btn--primary" onClick={assignPlanting} disabled={bulkPlanting || !plantAssignee}>
              {bulkPlanting ? 'Assigning…' : 'Assign planting'}
            </button>
          </>}
        >
          <div className="sp-field">
            <label className="sp-label sp-label--required" htmlFor="ap-user">Field operator</label>
            <select id="ap-user" className="sp-select" style={FULL} value={plantAssignee} onChange={e => setPlantAssignee(e.target.value)}>
              <option value="">Select a field operator…</option>
              {fieldOps.map(u => <option key={u.auth_id} value={u.auth_id}>{u.display_name}</option>)}
            </select>
            {fieldOps.length === 0 && !plantError && (
              <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 6 }}>No field operators yet — add one in Team first.</div>
            )}
          </div>

          <ol style={{ margin: '16px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.7 }}>
            <li>They get a <strong>planting task</strong> in the app.</li>
            <li>They plant the tree and capture it (photo + GPS) to complete the task.</li>
            <li>You confirm it in <strong>Tasks</strong> → the tree becomes <strong>Planted</strong> and its <strong>audit task</strong> opens.</li>
          </ol>
        </RecordModal>
      )}

      {/* Add record modal */}
      {adding && (
        <RecordModal
          icon={<TreePine size={20} />}
          title="Add record"
          subtitle="Pick a species from the list to fill the scientific name and CO₂ for you."
          error={addError}
          onClose={() => setAdding(false)}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button type="button" className="pl-btn pl-btn--primary" onClick={saveAdd} disabled={savingAdd}>
              {savingAdd ? 'Saving…' : 'Add record'}
            </button>
          </>}
        >
          <SectionLabel>Tree</SectionLabel>
          <SpeciesFields
            list={speciesList}
            idPrefix="ar"
            species={addForm.species}
            scientific={addForm.scientific}
            co2={addForm.co2}
            date={addForm.date}
            onSpecies={onAddSpecies}
            onChange={(k, v) => setAddForm(f => ({ ...f, [k]: v }))}
          />
        </RecordModal>
      )}

      {/* Edit modal */}
      {editing && (
        <RecordModal
          icon={<Pencil size={18} />}
          title="Edit record"
          subtitle={`${editing.treeCode || `TREE-${editing.id.slice(0, 8).toUpperCase()}`} · ${editing.projectName}`}
          error={editError}
          onClose={() => setEditing(null)}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="button" className="pl-btn pl-btn--primary" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
          </>}
        >
          {editing.canSetAssignee && !compact && (
            <div style={{ marginBottom: 18, padding: 14, borderRadius: 12, background: '#FFF8EC', border: '1px solid #F5D9A8' }}>
              <label className="sp-label" htmlFor="er-assignee">Assigned to</label>
              <select id="er-assignee" className="sp-select" style={FULL} value={editForm.team_member_id} onChange={e => setEditForm(f => ({ ...f, team_member_id: e.target.value }))}>
                <option value="">Not set — shows as {editing.recordedFor}</option>
                {teamUsers.map(u => <option key={u.teamMemberId} value={u.teamMemberId}>{u.name || u.email}</option>)}
              </select>
              <div style={{ fontSize: 11.5, color: '#8B5A00', marginTop: 6, lineHeight: 1.45 }}>
                This tree was added before assignments were saved, so nobody is named on it. Pick the person it was recorded for.
              </div>
            </div>
          )}
          <SectionLabel>Tree</SectionLabel>
          <SpeciesFields
            list={speciesList}
            idPrefix="er"
            species={editForm.species}
            scientific={editForm.scientific_name}
            co2={editForm.co2}
            date={editForm.survey_date}
            onSpecies={onEditSpecies}
            onChange={(k, v) => setEditForm(f => ({ ...f, [k === 'scientific' ? 'scientific_name' : k === 'date' ? 'survey_date' : k]: v }))}
          />

          {!compact && (
            <>
              <SectionLabel>Details</SectionLabel>
              <FieldGrid>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="er-stage">Stage</label>
                  <select id="er-stage" className="sp-select" style={FULL} value={editForm.stage} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                    {TREE_STAGES.map(v => (
                      <option key={v} disabled={
                        (v === DEFAULT_STAGE && (editing.stage || DEFAULT_STAGE) !== DEFAULT_STAGE) ||
                        // Under plantation → planted only through a field operator (Stage menu → Assign planting).
                        ((editing.stage || DEFAULT_STAGE) === DEFAULT_STAGE && v !== DEFAULT_STAGE)
                      }>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="er-event">Event type</label>
                  <select id="er-event" className="sp-select" style={FULL} value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))}>
                    {['Planting', 'Restoration', 'Measurement', 'Survey', 'Maintenance'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="er-health">Health</label>
                  <select id="er-health" className="sp-select" style={FULL} value={editForm.health_status} onChange={e => setEditForm(f => ({ ...f, health_status: e.target.value }))}>
                    {['healthy', 'moderate', 'poor'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                  </select>
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="er-cond">Condition</label>
                  <select id="er-cond" className="sp-select" style={FULL} value={editForm.tree_condition} onChange={e => setEditForm(f => ({ ...f, tree_condition: e.target.value }))}>
                    <option value="">Not specified</option>
                    {['Healthy', 'Diseased', 'Damaged', 'Dead'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </FieldGrid>
              <div className="sp-field">
                <label className="sp-label" htmlFor="er-notes">Notes</label>
                <textarea id="er-notes" className="sp-textarea" rows={2} style={FULL} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </>
          )}

          <p style={{ fontSize: 11.5, color: '#9AA79C', margin: '14px 0 0', lineHeight: 1.5 }}>
            Project and GPS location cannot be changed here — if one of those is wrong, delete this record and add a new one.
          </p>
        </RecordModal>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <RecordModal
          icon={<Trash2 size={18} />}
          tone="danger"
          title="Delete this record?"
          subtitle="This cannot be undone."
          onClose={() => setConfirmDelete(null)}
          width={440}
          footer={<>
            <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button
              type="button"
              className="pl-btn pl-btn--primary"
              style={{ background: '#A32020', borderColor: '#A32020' }}
              onClick={doDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </>}
        >
          <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: 0 }}>
            <strong style={{ color: '#1C2B22' }}>{confirmDelete.species}</strong> · {confirmDelete.projectName}
          </p>
          {confirmDelete.taskId && (
            <p style={{ fontSize: 12.5, color: '#8B3A00', background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 9, padding: '9px 12px', margin: '12px 0 0' }}>
              Its pending verification task will be removed too.
            </p>
          )}
        </RecordModal>
      )}
    </PartnerLayout>
  )
}

const FULL: React.CSSProperties = { width: '100%', minWidth: 0 }

function SummaryCard({ icon, label, value, unit, hint, tone = 'default', to }: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
  hint?: string
  tone?: 'default' | 'warn'
  to?: string
}) {
  const warn = tone === 'warn'
  const body = (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 14, height: '100%',
      background: warn ? '#FFF8EC' : '#fff', border: `1px solid ${warn ? '#F5D9A8' : '#EEE9E1'}`,
    }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: warn ? '#FFE9C2' : '#EAF3DE', color: warn ? '#8B5A00' : '#2B5341' }}>
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#7A867C' }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1C2B22', lineHeight: 1.2, marginTop: 2 }}>
          {value}{unit && <span style={{ fontSize: 12, fontWeight: 600, color: '#7A867C', marginLeft: 4 }}>{unit}</span>}
        </div>
        {hint && <div style={{ fontSize: 11.5, color: warn ? '#8B5A00' : '#9AA79C', marginTop: 2 }}>{hint}{to && ' →'}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{body}</Link> : body
}

/** Stage badge that opens a small menu to move the tree to another stage. */
function StageMenu({ value, colors, onChange, busy, disabled, blocked }: {
  value: string
  colors: { bg: string; fg: string }
  onChange: (stage: string) => void
  busy: boolean
  disabled: boolean
  blocked: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey  = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title={disabled ? 'Verified — the stage can no longer change' : 'Change stage'}
        className="pl-badge"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, background: colors.bg, color: colors.fg, whiteSpace: 'nowrap',
          border: 'none', fontFamily: 'inherit', cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {value}
        {!disabled && (busy ? <Loader2 size={12} className="spin" /> : <ChevronDown size={12} />)}
      </button>

      {open && (
        <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30, minWidth: 190, background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(17,33,33,0.18)', border: '1px solid #EEE9E1', padding: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9AA79C', padding: '6px 10px 4px' }}>Move to stage</div>
          {TREE_STAGES.map(st => {
            const c = STAGE_STYLE[st]
            const isCurrent = st === value
            const isBlocked = blocked.includes(st)
            return (
              <button
                key={st}
                type="button"
                role="menuitem"
                disabled={isCurrent || isBlocked}
                title={isBlocked ? 'Already planted — it cannot go back to Under plantation' : undefined}
                onClick={() => { setOpen(false); onChange(st) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: isCurrent ? '#F5F2EC' : 'transparent', fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                  color: isBlocked ? '#B5BDB6' : '#1C2B22', fontWeight: isCurrent ? 700 : 500,
                  cursor: isCurrent || isBlocked ? 'default' : 'pointer',
                }}
                onMouseEnter={e => { if (!isCurrent && !isBlocked) e.currentTarget.style.background = '#F7F5F0' }}
                onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? '#F5F2EC' : 'transparent' }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 5, background: c?.fg || '#9AA79C', opacity: isBlocked ? 0.4 : 1 }} />
                <span style={{ flex: 1 }}>{st}</span>
                {isCurrent && <Check size={14} style={{ color: '#2B5341' }} />}
              </button>
            )
          })}
          <div style={{ fontSize: 11, color: '#9AA79C', padding: '6px 10px 4px', borderTop: '1px solid #F0ECE6', marginTop: 4, lineHeight: 1.4 }}>
            {value === DEFAULT_STAGE
              ? 'Choosing Planted asks you for a field operator to plant it. It becomes Planted when you confirm their planting in Tasks.'
              : 'A planted tree has an audit task in Tasks.'}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9AA79C', marginBottom: 10 }}>{children}</div>
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>{children}</div>
}

/** Species, scientific name, CO₂ and date — the same four fields in add and edit. */
function SpeciesFields({ list, idPrefix, species, scientific, co2, date, onSpecies, onChange }: {
  list: TreeSpecies[]
  idPrefix: string
  species: string
  scientific: string
  co2: string
  date: string
  onSpecies: (v: string) => void
  onChange: (key: 'scientific' | 'co2' | 'date', value: string) => void
}) {
  return (
    <FieldGrid>
      <div className="sp-field" style={{ minWidth: 0 }}>
        <label className="sp-label sp-label--required" htmlFor={`${idPrefix}-species`}>Species</label>
        <input id={`${idPrefix}-species`} className="sp-input" style={FULL} list={`${idPrefix}-species-list`} placeholder="Enter or select species" value={species} onChange={e => onSpecies(e.target.value)} />
        <datalist id={`${idPrefix}-species-list`}>
          {list.map(s => <option key={s.name} value={s.name}>{s.scientific}</option>)}
        </datalist>
      </div>
      <div className="sp-field" style={{ minWidth: 0 }}>
        <label className="sp-label" htmlFor={`${idPrefix}-sci`}>Scientific name</label>
        <input id={`${idPrefix}-sci`} className="sp-input" style={FULL} placeholder="Enter scientific name" value={scientific} onChange={e => onChange('scientific', e.target.value)} />
      </div>
      <div className="sp-field" style={{ minWidth: 0 }}>
        <label className="sp-label" htmlFor={`${idPrefix}-co2`}>CO₂ absorbed</label>
        <div style={{ position: 'relative' }}>
          <input id={`${idPrefix}-co2`} type="number" min={0} step="0.1" className="sp-input" style={{ ...FULL, paddingRight: 64 }} placeholder="Enter CO₂" value={co2} onChange={e => onChange('co2', e.target.value)} />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9AA79C', pointerEvents: 'none' }}>kg / yr</span>
        </div>
      </div>
      <div className="sp-field" style={{ minWidth: 0 }}>
        <label className="sp-label" htmlFor={`${idPrefix}-date`}>Date</label>
        <input id={`${idPrefix}-date`} type="date" className="sp-input" style={FULL} value={date} onChange={e => onChange('date', e.target.value)} />
      </div>
    </FieldGrid>
  )
}

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0 || name === '—') return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/** One tree as a card: photo strip, identity, status, condition and its latest audit. */
function TreeCard({ t, code, status, task, condition, onOpen, onEdit }: {
  t: TreeRow
  code: string
  status: { label: string; bg: string; fg: string }
  task: { label: string; badge: string }
  condition: string
  onOpen: () => void
  onEdit?: () => void
}) {
  const photos = t.photoUrls && t.photoUrls.length > 0 ? t.photoUrls : (t.photoUrl ? [t.photoUrl] : [])
  const cover = t.latestAudit?.photo || photos[photos.length - 1] || null
  const la = t.latestAudit
  const laStatus = la ? taskStatus(la.status) : null
  const hasPoint = Number(t.latitude) && Number(t.longitude)
  return (
    <div className="pl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button type="button" onClick={onOpen} style={{ position: 'relative', height: 150, border: 'none', padding: 0, background: '#F2EFEA', cursor: 'pointer', display: 'block' }}>
        {cover
          ? <img src={cover} alt={t.species} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B5AEA4', fontSize: 30 }}>🌳</div>}
        <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: status.bg, color: status.fg, padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: status.fg }} />{status.label}
        </span>
        {(t.photoCount ?? photos.length) > 0 && (
          <span style={{ position: 'absolute', bottom: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(17,33,33,0.72)', color: '#fff', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
            <Camera size={12} /> {t.photoCount ?? photos.length}
          </span>
        )}
      </button>
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 10px 0', overflow: 'hidden' }}>
          {photos.slice(-5).map(u => <img key={u} src={u} alt="" loading="lazy" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #EEE9E1' }} />)}
        </div>
      )}
      <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11.5, fontWeight: 700, color: '#2B5341', background: '#F2F6EE', border: '1px solid #DCE8D3', borderRadius: 6, padding: '2px 6px' }}>{code}</span>
          <span style={{ fontSize: 11.5, color: '#7A867C', marginLeft: 'auto' }}>{t.stage || DEFAULT_STAGE}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#1C2B22', fontSize: 14.5 }}>{t.species}</div>
          {t.scientificName && <div style={{ fontSize: 11.5, color: '#9AA79C', fontStyle: 'italic' }}>{t.scientificName}</div>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {condition && (() => { const c = conditionTone(condition); return <span style={{ background: c.bg, color: c.fg, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{condition}</span> })()}
          {t.healthStatus && (() => { const c = conditionTone(t.healthStatus); return <span style={{ background: c.bg, color: c.fg, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{capitalise(t.healthStatus)}</span> })()}
          <span className={`pl-badge pl-badge--${task.badge || 'pending'}`} style={{ fontSize: 11 }}>{task.label}</span>
        </div>
        <div style={{ fontSize: 12, color: '#6B7B6E', lineHeight: 1.55 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.projectColor || DEFAULT_PROJECT_COLOR }} />{t.projectName}
          </div>
          <div>👤 {t.recordedFor}{t.taskAssignee ? ` · field: ${t.taskAssignee}` : ''}</div>
          <div>📍 {hasPoint ? `${Number(t.latitude).toFixed(5)}, ${Number(t.longitude).toFixed(5)}` : 'No GPS yet'}</div>
        </div>
        {/* Latest audit, highlighted */}
        <div style={{ borderRadius: 10, padding: '8px 10px', background: la ? '#F5FAF2' : '#FAF8F4', border: `1px solid ${la ? '#CFE5C9' : '#EEE9E1'}` }}>
          {la && laStatus ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1C2B22' }}>
                ★ Latest: Audit {la.round}
                <span style={{ marginLeft: 'auto', background: laStatus.bg, color: laStatus.fg, padding: '1px 7px', borderRadius: 999, fontSize: 10.5 }}>{laStatus.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 3 }}>
                {formatDate(la.date)}{la.condition ? ` · ${la.condition}` : ''}{la.survival ? ` · ${capitalise(la.survival)}` : ''}
                {t.auditCount && t.auditCount > 1 ? ` · ${t.auditCount} audits` : ''}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11.5, color: '#9AA79C' }}>No audit submitted yet</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button type="button" className="pl-btn pl-btn--primary" style={{ flex: 1, height: 34, fontSize: 12.5 }} onClick={onOpen}>
            <Eye size={14} /> Details & history
          </button>
          {onEdit && (
            <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 34, width: 34, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={onEdit} title="Edit" aria-label="Edit">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

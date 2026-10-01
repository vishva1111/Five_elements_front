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
import { Pencil, Trash2, Lock, TreePine, X } from 'lucide-react'
import PartnerLayout from './PartnerLayout'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import RecordModal from '../../components/ui/Modal'
import { TREE_STAGES, DEFAULT_STAGE, STAGE_STYLE } from '../../constants/treeStages'
import { useSpecies, type TreeSpecies } from '../../constants/treeSpecies'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
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
  taskId: string | null
}

const TASK_STATUS_LABEL: Record<string, { label: string; badge: string }> = {
  assigned:    { label: 'Awaiting verification', badge: 'pending' },
  in_progress: { label: 'Verification in progress', badge: 'progress' },
  completed:   { label: 'Verified — awaiting approval', badge: 'info' },
  approved:    { label: 'On the ledger', badge: 'approved' },
  rejected:    { label: 'Verification rejected', badge: 'rejected' },
}

export default function MyTrees({ title = 'Action listing', showAdd = false, compact = false }: { title?: string; showAdd?: boolean; compact?: boolean }) {
  const { session } = useAuth()
  const token = session?.access_token
  const { species: speciesList, find: findSpecies, add: addSpecies } = useSpecies()

  const [trees,   setTrees]   = useState<TreeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [notice,  setNotice]  = useState<string | null>(null)

  const [editing,    setEditing]    = useState<TreeRow | null>(null)
  const [editForm,   setEditForm]   = useState<Record<string, string>>({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError,  setEditError]  = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<TreeRow | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  // ── Add record (Action listing) ────────────────────────────────────────────
  const today = () => new Date().toISOString().slice(0, 10)
  const emptyAdd = () => ({ userId: '', projectId: '', species: '', scientific: '', co2: '', date: today() })
  const [adding,    setAdding]    = useState(false)
  const [addForm,   setAddForm]   = useState(emptyAdd)
  const [addError,  setAddError]  = useState<string | null>(null)
  const [savingAdd, setSavingAdd] = useState(false)
  const [teamUsers, setTeamUsers] = useState<{ effectiveId: string; name: string; email: string }[]>([])
  const [projects,  setProjects]  = useState<{ id: string; name: string }[]>([])

  async function openAdd() {
    setAddForm(emptyAdd())
    setAddError(null)
    setAdding(true)
    if (teamUsers.length && projects.length) return
    try {
      const headers = { Authorization: `Bearer ${token || ''}` }
      const [u, p] = await Promise.all([
        fetch(`${API}/api/partner/team-users`, { headers }).then(r => r.json()),
        fetch(`${API}/api/partner/projects`,   { headers }).then(r => r.json()),
      ])
      setTeamUsers((u.users || []).filter((x: { canRecord: boolean }) => x.canRecord))
      setProjects((p.projects || []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name })))
    } catch {
      setAddError('Could not load your team or projects.')
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
    if (!addForm.userId)    return setAddError('Choose a user')
    if (!addForm.projectId) return setAddError('Choose a project')
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
      let notice = 'Record updated.'
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
      setError(e instanceof Error ? e.message : 'Failed to delete')
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const locked = (t: TreeRow) => t.taskStatus === 'approved'

  // Records first, then (on Action listing) the built-in species — one list, one pager.
  type Row = { kind: 'tree'; t: TreeRow } | { kind: 'default'; s: TreeSpecies }
  const rows: Row[] = [
    ...trees.map(t => ({ kind: 'tree' as const, t })),
    ...(compact ? speciesList.map(s => ({ kind: 'default' as const, s })) : []),
  ]
  const pg = usePagination(rows)

  return (
    <PartnerLayout title={title} subtitle={compact ? "Tree species and the CO₂ each one absorbs per year" : "Trees assigned to your users, by project — fix mistakes before they're verified"}>
      <div>
        {notice && (
          <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#27500A', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span>✓ {notice}</span>
            <button type="button" onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}
        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {showAdd && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link to="/partner/actions/new" className="pl-btn pl-btn--primary">+ Add trees</Link>
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
          ) : trees.length === 0 && !compact ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">🌳</div>
              <div className="pl-empty__title">No trees recorded yet</div>
              <div className="pl-empty__sub">Trees added for your team — one at a time or by spreadsheet — show up here.</div>
              {showAdd && <Link to="/partner/actions/new" className="pl-btn pl-btn--primary">Add tree</Link>}
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
                      <th>Tree ID</th>
                      <th>Assigned to</th>
                      <th>Project</th>
                      <th>Species</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>CO₂ (kg/yr)</th>
                      <th>Stage</th>
                      <th>Verification</th>
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
                        <td style={{ color: '#6B7B6E', fontSize: 12.5, fontStyle: 'italic' }}>{s.scientific}</td>
                        <td>{s.co2PerYear}</td>
                        <td style={{ color: '#9AA79C', fontSize: 12 }}>—</td>
                        <td><span className="pl-badge" style={{ fontSize: 11 }}>{s.isDefault === false ? 'Added' : 'Default'}</span></td>
                      </tr>
                    )
                  }
                  const t = row.t
                  const st  = t.taskStatus ? TASK_STATUS_LABEL[t.taskStatus] : null
                  const sp  = findSpecies(t.species)
                  const sci = t.scientificName || sp?.scientific || '—'
                  const co2 = sp ? +(sp.co2PerYear * t.quantity).toFixed(1) : undefined
                  return (
                    <tr key={t.id}>
                      {compact ? (
                        <>
                          <td style={{ fontWeight: 600 }}>{t.species}</td>
                          <td style={{ color: '#6B7B6E', fontSize: 12.5, fontStyle: 'italic' }}>{sci}</td>
                          <td>{co2 ?? '—'}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12, fontWeight: 700, color: '#2B5341', background: '#F2F6EE', border: '1px solid #DCE8D3', borderRadius: 6, padding: '3px 7px', whiteSpace: 'nowrap' }}>
                              {t.treeCode || `TREE-${t.id.slice(0, 8).toUpperCase()}`}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ width: 30, height: 30, borderRadius: 15, background: '#EAF3DE', color: '#2B5341', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {initials(t.recordedFor)}
                              </span>
                              <span style={{ fontWeight: 600, color: '#1C2B22' }}>{t.recordedFor}</span>
                            </div>
                          </td>
                          <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{t.projectName}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1C2B22' }}>{t.species}</div>
                            {sci !== '—' && <div style={{ fontSize: 11.5, color: '#9AA79C', fontStyle: 'italic', marginTop: 1 }}>{sci}</div>}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{co2 ?? '—'}</td>
                          <td>
                            {(() => {
                              const stg = t.stage || DEFAULT_STAGE
                              const c   = STAGE_STYLE[stg] || { bg: '#F2EFEA', fg: '#6B7B6E' }
                              return <span className="pl-badge" style={{ background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>{stg}</span>
                            })()}
                          </td>
                          <td>
                            {st ? (
                              <span className={`pl-badge pl-badge--${st.badge}`}>{st.label}</span>
                            ) : (
                              <span className="pl-badge" style={{ background: '#F2EFEA', color: '#6B7B6E' }}>Recorded</span>
                            )}
                          </td>
                        </>
                      )}
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{new Date(t.surveyDate || t.submittedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
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
          {!loading && <Pagination {...pg} noun="record" />}
        </div>
      </div>

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
          <SectionLabel>Who and where</SectionLabel>
          <FieldGrid>
            <div className="sp-field" style={{ minWidth: 0 }}>
              <label className="sp-label sp-label--required" htmlFor="ar-user">User</label>
              <select id="ar-user" className="sp-select" style={FULL} value={addForm.userId} onChange={e => setAddForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Select a user…</option>
                {teamUsers.map(u => <option key={u.effectiveId} value={u.effectiveId}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div className="sp-field" style={{ minWidth: 0 }}>
              <label className="sp-label sp-label--required" htmlFor="ar-project">Project</label>
              <select id="ar-project" className="sp-select" style={FULL} value={addForm.projectId} onChange={e => setAddForm(f => ({ ...f, projectId: e.target.value }))}>
                <option value="">Select a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </FieldGrid>

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
                    {TREE_STAGES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="er-qty">Quantity</label>
                  <input id="er-qty" type="number" min={1} className="sp-input" style={FULL} value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
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
        <input id={`${idPrefix}-sci`} className="sp-input" style={{ ...FULL, fontStyle: scientific ? 'italic' : 'normal' }} placeholder="Enter scientific name" value={scientific} onChange={e => onChange('scientific', e.target.value)} />
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

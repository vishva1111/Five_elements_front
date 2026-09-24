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
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface TreeRow {
  id: string
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

export default function MyTrees() {
  const { session } = useAuth()
  const token = session?.access_token

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
      notes: t.notes || '',
    })
  }

  async function saveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`${API}/api/partner/trees/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to save')
      setEditing(null)
      setNotice('Record updated.')
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

  return (
    <PartnerLayout title="My trees" subtitle="Tree records entered for your team — correct mistakes before they're verified">
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Link to="/partner/trees/new" className="pl-btn pl-btn--primary">+ Add tree</Link>
        </div>

        <div className="pl-card">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 44 }} />)}
            </div>
          ) : trees.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">🌳</div>
              <div className="pl-empty__title">No trees recorded yet</div>
              <div className="pl-empty__sub">Trees added for your team — one at a time or by spreadsheet — show up here.</div>
              <Link to="/partner/trees/new" className="pl-btn pl-btn--primary">Add tree</Link>
            </div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Species</th>
                  <th>Recorded for</th>
                  <th>Project</th>
                  <th>Qty</th>
                  <th>Verification</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trees.map(t => {
                  const st = t.taskStatus ? TASK_STATUS_LABEL[t.taskStatus] : null
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.species}</td>
                      <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{t.recordedFor}</td>
                      <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{t.projectName}</td>
                      <td>{t.quantity}</td>
                      <td>
                        {st ? (
                          <span className={`pl-badge pl-badge--${st.badge}`}>{st.label}</span>
                        ) : (
                          <span style={{ fontSize: 11.5, color: '#9AA79C' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: '#9AA79C', fontSize: 12 }}>{new Date(t.submittedAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="pl-btn pl-btn--ghost"
                            style={{ height: 28, fontSize: 11.5, padding: '0 10px' }}
                            onClick={() => openEdit(t)}
                            disabled={locked(t)}
                            title={locked(t) ? 'Already verified — no longer editable' : undefined}
                          >
                            {locked(t) ? '🔒 Locked' : 'Edit'}
                          </button>
                          {!locked(t) && (
                            <button
                              type="button"
                              className="pl-btn pl-btn--ghost"
                              style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: '#A32020' }}
                              onClick={() => setConfirmDelete(t)}
                            >
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
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(480px, 100%)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="pl-card__title">Edit tree record</div>
            <p style={{ fontSize: 11.5, color: '#9AA79C', margin: '0 0 14px', lineHeight: 1.5 }}>
              Owner, project and GPS location cannot be changed here — if one of those is wrong, delete this record and add a new one instead.
            </p>

            {editError && (
              <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 9, padding: '8px 12px', fontSize: 12.5, color: '#8B3A00', marginBottom: 12 }}>
                {editError}
              </div>
            )}

            <div className="sp-grid-2" style={{ marginBottom: 12 }}>
              <div className="sp-field">
                <label className="sp-label sp-label--required">Species</label>
                <input className="sp-input" value={editForm.species} onChange={e => setEditForm(f => ({ ...f, species: e.target.value }))} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Scientific name</label>
                <input className="sp-input" value={editForm.scientific_name} onChange={e => setEditForm(f => ({ ...f, scientific_name: e.target.value }))} />
              </div>
            </div>

            <div className="sp-grid-2" style={{ marginBottom: 12 }}>
              <div className="sp-field">
                <label className="sp-label">Quantity</label>
                <input type="number" min={1} className="sp-input" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="sp-field">
                <label className="sp-label">Event type</label>
                <select className="sp-select" value={editForm.event_type} onChange={e => setEditForm(f => ({ ...f, event_type: e.target.value }))}>
                  {['Planting', 'Restoration', 'Measurement', 'Survey', 'Maintenance'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="sp-grid-2" style={{ marginBottom: 12 }}>
              <div className="sp-field">
                <label className="sp-label">Health</label>
                <select className="sp-select" value={editForm.health_status} onChange={e => setEditForm(f => ({ ...f, health_status: e.target.value }))}>
                  {['healthy', 'moderate', 'poor'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                </select>
              </div>
              <div className="sp-field">
                <label className="sp-label">Condition</label>
                <select className="sp-select" value={editForm.tree_condition} onChange={e => setEditForm(f => ({ ...f, tree_condition: e.target.value }))}>
                  <option value="">Not specified</option>
                  {['Healthy', 'Diseased', 'Damaged', 'Dead'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="sp-field" style={{ marginBottom: 16 }}>
              <label className="sp-label">Notes</label>
              <textarea className="sp-textarea" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="pl-btn pl-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="pl-btn pl-btn--primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="pl-card" style={{ width: 'min(430px, 100%)' }}>
            <div className="pl-card__title">Delete this tree record?</div>
            <p style={{ fontSize: 13.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 8px' }}>
              <strong>{confirmDelete.species}</strong> recorded for {confirmDelete.recordedFor}. This cannot be undone.
            </p>
            {confirmDelete.taskId && (
              <p style={{ fontSize: 12.5, color: '#8B3A00', background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 9, padding: '9px 12px', margin: 0 }}>
                Its pending verification task will be removed too.
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
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
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  )
}

/**
 * The four pop-ups behind a partner's project card:
 *   EditProjectModal      — plain details, saved at once
 *   ColorRequestModal     — asks an admin to change the project's map colour
 *   FencingRequestModal   — asks an admin to update fencing details / boundary
 *   ProjectTreesModal     — every tree in the project, together on a map
 * Colour and fencing never change directly: they become a request that waits
 * on the admin's Approval page.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Pencil, Palette, Fence, TreePine, Wand2, Undo2, Trash2 } from 'lucide-react'
import Modal from '../ui/Modal'
import TreeMap, { hullAround, type LatLng } from '../map/TreeMap'
import TreeDetailModal from '../tree/TreeHistory'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import {
  DEFAULT_PROJECT_COLOR, PROJECT_COLOR_CHOICES, FENCING_STATUS, conditionColor, formatArea, formatLength,
  type Boundary, type Fencing,
} from '../tree/treeLabels'
import { polygonAreaSqM, polygonPerimeterM } from './geo'

export interface ProjectLite {
  id: string
  name: string
  description: string | null
  location: string
  category: string | null
  totalTrees: number | null
  mapColor: string | null
  fencing: Fencing | null
  boundary: Boundary | null
}

const FULL: React.CSSProperties = { width: '100%', minWidth: 0 }
const ghostBtn = 'pl-btn pl-btn--ghost'

function useAuthed() {
  const { session } = useAuth()
  const token = session?.access_token || ''
  return {
    token,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  }
}

// ── Edit details ─────────────────────────────────────────────────────────────
export function EditProjectModal({ project, onClose, onSaved, role = 'partner' }: { project: ProjectLite; onClose: () => void; onSaved: () => void; role?: 'partner' | 'admin' }) {
  const { headers } = useAuthed()
  const toast = useToast()
  const [form, setForm] = useState({
    name: project.name,
    location: project.location || '',
    category: project.category || '',
    totalTrees: project.totalTrees != null ? String(project.totalTrees) : '',
    description: project.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!form.name.trim()) return setError('Project name is required')
    if (!form.location.trim()) return setError('Location is required')
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { name: form.name, location: form.location, category: form.category, description: form.description }
      if (form.totalTrees !== '') body.totalTrees = Number(form.totalTrees)
      const res = await fetch(`${API}/api/${role}/projects/${project.id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not save')
      toast.success('Project updated.')
      onSaved()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      icon={<Pencil size={18} />}
      title="Edit project"
      subtitle={project.name}
      error={error}
      onClose={onClose}
      footer={<>
        <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
        <button type="button" className="pl-btn pl-btn--primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
      </>}
    >
      <div className="sp-field">
        <label className="sp-label sp-label--required" htmlFor="ep-name">Project name</label>
        <input id="ep-name" className="sp-input" style={FULL} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label sp-label--required" htmlFor="ep-loc">Location</label>
          <input id="ep-loc" className="sp-input" style={FULL} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        </div>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label" htmlFor="ep-cat">Category</label>
          <input id="ep-cat" className="sp-input" style={FULL} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        </div>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label" htmlFor="ep-trees">Target trees</label>
          <input id="ep-trees" type="number" min={0} className="sp-input" style={FULL} value={form.totalTrees} onChange={e => setForm(f => ({ ...f, totalTrees: e.target.value }))} />
        </div>
      </div>
      <div className="sp-field">
        <label className="sp-label" htmlFor="ep-desc">Description</label>
        <textarea id="ep-desc" className="sp-textarea" rows={4} style={FULL} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <p style={{ fontSize: 11.5, color: '#9AA79C', margin: '4px 0 0', lineHeight: 1.5 }}>
        The map colour and the fencing are not changed here — they need an admin's approval, so use <strong>Colour</strong> and <strong>Fencing</strong> on the card.
      </p>
    </Modal>
  )
}

// ── Colour request ───────────────────────────────────────────────────────────
export function ColorRequestModal({ project, onClose, onSent }: { project: ProjectLite; onClose: () => void; onSent: () => void }) {
  const { headers } = useAuthed()
  const toast = useToast()
  const current = project.mapColor || DEFAULT_PROJECT_COLOR
  const [color, setColor] = useState(current)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/projects/${project.id}/change-requests`, {
        method: 'POST', headers, body: JSON.stringify({ type: 'color', color, reason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not send the request')
      toast.success('Sent for approval — the colour changes once an admin approves it.')
      onSent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send the request')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      icon={<Palette size={18} />}
      title="Request a colour change"
      subtitle={project.name}
      error={error}
      onClose={onClose}
      width={480}
      footer={<>
        <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
        <button type="button" className="pl-btn pl-btn--primary" onClick={send} disabled={saving || color.toLowerCase() === current.toLowerCase()}>{saving ? 'Sending…' : 'Send for approval'}</button>
      </>}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 54, height: 54, borderRadius: 14, background: color, border: '1px solid rgba(0,0,0,0.15)' }} />
        <div style={{ fontSize: 12.5, color: '#6B7B6E' }}>
          <div>Now: <strong style={{ color: '#1C2B22' }}>{current.toUpperCase()}</strong></div>
          <div>New: <strong style={{ color: '#1C2B22' }}>{color.toUpperCase()}</strong></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PROJECT_COLOR_CHOICES.map(c => (
          <button
            key={c}
            type="button"
            aria-label={`Pick ${c}`}
            onClick={() => setColor(c)}
            style={{ width: 32, height: 32, borderRadius: 16, background: c, cursor: 'pointer', border: color.toLowerCase() === c.toLowerCase() ? '3px solid #1C2B22' : '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.18)' }}
          />
        ))}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7B6E', marginLeft: 6 }}>
          Custom <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 34, height: 28, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
        </label>
      </div>
      <div className="sp-field">
        <label className="sp-label" htmlFor="cr-reason">Why change it? (optional)</label>
        <textarea id="cr-reason" className="sp-textarea" rows={2} style={FULL} value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <p style={{ fontSize: 11.5, color: '#9AA79C', margin: '6px 0 0', lineHeight: 1.5 }}>
        The colour is used for this project on maps and cards. It stays as it is until an admin approves the change.
      </p>
    </Modal>
  )
}

// ── Fencing request ──────────────────────────────────────────────────────────
interface TreeDot { id: string; latitude: number; longitude: number }

export function FencingRequestModal({ project, trees, onClose, onSent }: { project: ProjectLite; trees: TreeDot[]; onClose: () => void; onSent: () => void }) {
  const { headers } = useAuthed()
  const toast = useToast()
  const f0 = project.fencing || {}
  const initial = useMemo(() => ({
    status: f0.status || 'not_started',
    type: f0.type || '',
    material: f0.material || '',
    length_m: f0.length_m != null ? String(f0.length_m) : '',
    height_m: f0.height_m != null ? String(f0.height_m) : '',
    gates: f0.gates != null ? String(f0.gates) : '',
    installed_on: f0.installed_on || '',
    contractor: f0.contractor || '',
    notes: f0.notes || '',
  }), [project.fencing])  // eslint-disable-line react-hooks/exhaustive-deps
  const [form, setForm] = useState(initial)
  const [drawing, setDrawing] = useState(false)
  const [ring, setRing] = useState<LatLng[]>(project.boundary?.coordinates || [])
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locked = !!project.boundary?.locked
  const ringChanged = JSON.stringify(ring) !== JSON.stringify(project.boundary?.coordinates || [])
  const area = useMemo(() => polygonAreaSqM(ring), [ring])
  const perimeter = useMemo(() => polygonPerimeterM(ring), [ring])

  async function send() {
    const fencing: Record<string, unknown> = {}
    // Only what the partner actually changed goes in the request.
    for (const [k, v] of Object.entries(form)) if (v !== '' && v !== initial[k as keyof typeof initial]) fencing[k] = v
    const sendRing = ringChanged && ring.length >= 3
    if (ringChanged && ring.length > 0 && ring.length < 3) return setError('A boundary needs at least 3 corners.')
    if (Object.keys(fencing).length === 0 && !sendRing) return setError('Change at least one fencing detail, or draw the boundary.')
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/projects/${project.id}/change-requests`, {
        method: 'POST', headers,
        body: JSON.stringify({ type: 'fencing', fencing, coordinates: sendRing ? ring : undefined, reason }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not send the request')
      toast.success('Sent for approval — the fencing updates once an admin approves it.')
      onSent()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send the request')
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const input = (id: string, label: string, k: keyof typeof form, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="sp-field" style={{ minWidth: 0 }}>
      <label className="sp-label" htmlFor={`fr-${id}`}>{label}</label>
      <input id={`fr-${id}`} className="sp-input" style={FULL} value={form[k]} onChange={set(k)} {...extra} />
    </div>
  )

  return (
    <Modal
      icon={<Fence size={18} />}
      title="Update fencing"
      subtitle={project.name}
      error={error}
      onClose={onClose}
      width={720}
      footer={<>
        <button type="button" className={ghostBtn} onClick={onClose}>Cancel</button>
        <button type="button" className="pl-btn pl-btn--primary" onClick={send} disabled={saving}>{saving ? 'Sending…' : 'Send for approval'}</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <div className="sp-field" style={{ minWidth: 0 }}>
          <label className="sp-label" htmlFor="fr-status">Fencing status</label>
          <select id="fr-status" className="sp-select" style={FULL} value={form.status} onChange={set('status')}>
            {Object.entries(FENCING_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {input('type', 'Fence type', 'type', { placeholder: 'e.g. Barbed wire, Live fence' })}
        {input('material', 'Material', 'material', { placeholder: 'e.g. GI wire, Concrete posts' })}
        {input('len', 'Length (m)', 'length_m', { type: 'number', min: 0, step: 'any' })}
        {input('h', 'Height (m)', 'height_m', { type: 'number', min: 0, step: 'any' })}
        {input('gates', 'Gates', 'gates', { type: 'number', min: 0 })}
        {input('on', 'Installed on', 'installed_on', { type: 'date' })}
        {input('who', 'Contractor', 'contractor')}
      </div>
      <div className="sp-field">
        <label className="sp-label" htmlFor="fr-notes">Notes</label>
        <textarea id="fr-notes" className="sp-textarea" rows={2} style={FULL} value={form.notes} onChange={set('notes')} />
      </div>

      <div style={{ margin: '16px 0 8px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9AA79C' }}>Land boundary</span>
        {ring.length >= 3 && <span style={{ fontSize: 12, color: '#2B5341', fontWeight: 600 }}>{formatArea(area)} · perimeter {formatLength(perimeter)}</span>}
        {locked && !drawing && <span style={{ fontSize: 11.5, color: '#8B5A00', background: '#FFF4E0', padding: '2px 8px', borderRadius: 999 }}>🔒 locked in the app — a new boundary needs approval</span>}
        <button type="button" className={ghostBtn} style={{ marginLeft: 'auto', height: 30, fontSize: 12 }} onClick={() => setDrawing(d => !d)}>
          {drawing ? 'Done drawing' : ring.length ? 'Redraw boundary' : 'Draw boundary'}
        </button>
      </div>
      {drawing && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button type="button" className={ghostBtn} style={{ height: 30, fontSize: 12 }} disabled={trees.length < 3} onClick={() => setRing(hullAround(trees))} title="Draw a boundary around all the project's trees">
            <Wand2 size={13} /> Around my trees
          </button>
          <button type="button" className={ghostBtn} style={{ height: 30, fontSize: 12 }} disabled={ring.length === 0} onClick={() => setRing(r => r.slice(0, -1))}><Undo2 size={13} /> Undo last corner</button>
          <button type="button" className={ghostBtn} style={{ height: 30, fontSize: 12, color: '#A32020' }} disabled={ring.length === 0} onClick={() => setRing([])}><Trash2 size={13} /> Clear</button>
          <span style={{ fontSize: 11.5, color: '#7A867C', alignSelf: 'center' }}>Click the map to add a corner · drag a corner to move it · click a corner to remove it</span>
        </div>
      )}
      <TreeMap
        height={drawing ? 360 : 240}
        points={trees.map(t => ({ id: t.id, latitude: t.latitude, longitude: t.longitude, color: '#2E9E4F' }))}
        boundary={ring}
        boundaryColor={project.mapColor || '#D97706'}
        editBoundary={drawing ? { coordinates: ring, onChange: setRing } : undefined}
        emptyText="No boundary drawn yet."
      />

      <div className="sp-field" style={{ marginTop: 14 }}>
        <label className="sp-label" htmlFor="fr-reason">Why is this changing? (optional)</label>
        <textarea id="fr-reason" className="sp-textarea" rows={2} style={FULL} value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <p style={{ fontSize: 11.5, color: '#9AA79C', margin: '6px 0 0', lineHeight: 1.5 }}>
        Nothing changes on the project until an admin approves it on their Approval page.
      </p>
    </Modal>
  )
}

// ── All trees of a project, on one map ───────────────────────────────────────
interface ProjectTree {
  id: string
  treeCode: string
  species: string
  stage?: string
  condition: string | null
  healthStatus: string | null
  latitude: number
  longitude: number
  recordedFor: string
  auditCount?: number
  latestAudit?: { condition: string | null } | null
}

export function ProjectTreesModal({ project, onClose, role = 'partner' }: { project: ProjectLite; onClose: () => void; role?: 'partner' | 'admin' }) {
  const { token } = useAuthed()
  const [trees, setTrees] = useState<ProjectTree[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    // The partner list and the admin list name their fields differently; both end up as ProjectTree.
    const url = role === 'admin'
      ? `${API}/api/admin/tree-records?with=audit&limit=1000&project_id=${encodeURIComponent(project.id)}`
      : `${API}/api/partner/trees?project_id=${encodeURIComponent(project.id)}`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load trees')
        setTrees(role === 'admin'
          ? (d.records || []).map((r: any) => ({
              id: r.id, treeCode: r.tree_code, species: r.species, stage: r.stage || undefined,
              condition: r.latest_audit?.condition || r.tree_condition, healthStatus: r.health_status,
              latitude: r.latitude, longitude: r.longitude, recordedFor: '', latestAudit: r.latest_audit,
            }))
          : d.trees || [])
      })
      .catch(e => setError(e.message))
  }, [project.id, token, role])

  const condOf = (t: ProjectTree) => t.latestAudit?.condition || t.condition || t.healthStatus
  const shown = (trees || []).filter(t => !q.trim() || [t.treeCode, t.species, t.recordedFor].some(v => (v || '').toLowerCase().includes(q.trim().toLowerCase())))
  const located = shown.filter(t => Number(t.latitude) && Number(t.longitude))

  return (
    <Modal
      icon={<TreePine size={18} />}
      title={`Trees in ${project.name}`}
      subtitle={trees ? `${trees.length} tree${trees.length === 1 ? '' : 's'} · ${(trees || []).filter(t => Number(t.latitude) && Number(t.longitude)).length} with a location` : 'Loading…'}
      error={error}
      onClose={onClose}
      width={900}
      footer={<button type="button" className={ghostBtn} onClick={onClose}>Close</button>}
    >
      <TreeMap
        height={380}
        points={located.map(t => ({
          id: t.id, latitude: t.latitude, longitude: t.longitude, color: conditionColor(condOf(t)),
          label: `${t.treeCode} · ${t.species}`, sublabel: [t.stage, condOf(t)].filter(Boolean).join(' · '),
        }))}
        boundary={project.boundary?.coordinates}
        boundaryColor={project.mapColor || DEFAULT_PROJECT_COLOR}
        onPointClick={setDetailId}
        emptyText={trees ? 'None of this project’s trees has a GPS location yet.' : 'Loading trees…'}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#6B7B6E', margin: '10px 0' }}>
        {['Healthy', 'Average', 'Poor', 'Dead'].map(c => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 5, background: conditionColor(c) }} />{c}</span>
        ))}
        {project.boundary && project.boundary.coordinates.length >= 3 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 0, borderTop: `3px solid ${project.mapColor || DEFAULT_PROJECT_COLOR}` }} />Land boundary</span>
        )}
      </div>

      <input className="sp-input" style={{ ...FULL, marginBottom: 10 }} type="search" placeholder="Search by tree ID, species or person" value={q} onChange={e => setQ(e.target.value)} />
      <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #EEE9E1', borderRadius: 10 }}>
        {trees === null ? (
          <div style={{ padding: 14, color: '#9AA79C', fontSize: 12.5 }}>Loading…</div>
        ) : shown.length === 0 ? (
          <div style={{ padding: 14, color: '#9AA79C', fontSize: 12.5 }}>No trees match.</div>
        ) : shown.map(t => (
          <button key={t.id} type="button" onClick={() => setDetailId(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #F4F0EA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: conditionColor(condOf(t)), flexShrink: 0 }} />
            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2B5341' }}>{t.treeCode}</span>
            <span style={{ fontSize: 13, color: '#1C2B22', fontWeight: 600 }}>{t.species}</span>
            <span style={{ fontSize: 11.5, color: '#7A867C' }}>{t.stage}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#7A867C' }}>
              {Number(t.latitude) && Number(t.longitude) ? `📍 ${Number(t.latitude).toFixed(4)}, ${Number(t.longitude).toFixed(4)}` : 'No location'}
            </span>
          </button>
        ))}
      </div>

      {detailId && <TreeDetailModal historyUrl={`${API}/api/${role === 'admin' ? 'admin/tree-records' : 'partner/trees'}/${detailId}/history`} onClose={() => setDetailId(null)} />}
    </Modal>
  )
}

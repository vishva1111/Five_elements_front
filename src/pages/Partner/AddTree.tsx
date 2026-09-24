/**
 * AddTree — a partner records a tree on behalf of one of their users.
 *
 * Deliberately not the old web "field capture": that was a generic offline
 * capture screen, and offline capture belongs on the device (TreeApp). This is
 * a back-office entry form — the partner is at a desk, online, filing work for
 * a named person. The record is owned by that person; the partner's own name is
 * kept as the surveyor so the entry is never silently misattributed.
 */
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'
import '../SubmitProject/SubmitProject.css'

const EVENT_TYPES  = ['Planting', 'Restoration', 'Measurement', 'Survey', 'Maintenance']
const HEALTH       = ['healthy', 'moderate', 'poor']
const CONDITIONS   = ['Healthy', 'Diseased', 'Damaged', 'Dead']
const LAND_TYPES   = ['Roadside', 'Farmland', 'Forest', 'Urban park', 'Riverbank', 'Community land']

interface TeamUser {
  teamMemberId: string
  authId:       string | null
  name:         string
  email:        string
  roleLabel:    string
  status:       string
  canRecord:    boolean
  /** Set for Users created under a specific project — their work stays there. */
  projectId?:   string | null
}

interface PartnerProject {
  id:   string
  name: string
}

interface ImportSummary {
  fileName:    string
  totalRows:   number
  validRows:   number
  errorRows:   number
  totalTrees:  number
  recordedFor: string
  columns:     string[]
  preview:     { line: number; species: string; quantity: number; latitude: number; longitude: number }[]
  errors:      { line: number; errors: string[] }[]
}

export default function AddTree() {
  const { session } = useAuth()
  const navigate    = useNavigate()
  const [searchParams] = useSearchParams()
  const fileRef     = useRef<HTMLInputElement>(null)
  const token       = session?.access_token

  const [users,    setUsers]    = useState<TeamUser[]>([])
  const [projects, setProjects] = useState<PartnerProject[]>([])
  const [loading,  setLoading]  = useState(true)

  const [userId,    setUserId]    = useState('')
  const [projectId, setProjectId] = useState('')
  const [species,   setSpecies]   = useState('')
  const [sciName,   setSciName]   = useState('')
  const [lat,       setLat]       = useState('')
  const [lng,       setLng]       = useState('')
  const [quantity,  setQuantity]  = useState('1')
  const [eventType, setEventType] = useState('Planting')
  const [health,    setHealth]    = useState('healthy')
  const [condition, setCondition] = useState('Healthy')
  const [landType,  setLandType]  = useState('')
  const [dbh,       setDbh]       = useState('')
  const [height,    setHeight]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [photo,     setPhoto]     = useState<File | null>(null)

  // ── bulk import ──────────────────────────────────────────────────────────
  const sheetRef = useRef<HTMLInputElement>(null)
  const [sheet,        setSheet]        = useState<File | null>(null)
  const [checking,     setChecking]     = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [summary,      setSummary]      = useState<ImportSummary | null>(null)
  const [importError,  setImportError]  = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)

  const [locating,  setLocating]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [success,   setSuccess]   = useState<string | null>(null)
  const [errors,    setErrors]    = useState<Record<string, string>>({})

  useEffect(() => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch(`${API}/api/partner/team-users`, { headers }).then(r => r.json()),
      fetch(`${API}/api/partner/projects`,   { headers }).then(r => r.json()),
    ])
      .then(([u, p]) => {
        const list: TeamUser[] = u.users || []
        setUsers(list)
        setProjects((p.projects || []).map((x: PartnerProject) => ({ id: x.id, name: x.name })))

        // Arriving from a team row — preselect that person, but only if they
        // really are on this partner's team and can own a record.
        const wanted = searchParams.get('user')
        if (wanted) {
          const match = list.find(m => m.authId === wanted && m.canRecord)
          if (match) {
            setUserId(wanted)
            if (match.projectId) setProjectId(match.projectId)
          }
        }
      })
      .catch(() => setError('Could not load your team or projects.'))
      .finally(() => setLoading(false))
  }, [token, searchParams])

  function useMyLocation() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      () => { setLocating(false); setError('Could not read your location — enter the coordinates manually.') }
    )
  }

  /** Server-side parse with nothing written, so the partner sees what will land. */
  async function checkSheet(file: File) {
    if (!userId || !projectId) {
      setImportError('Choose the user and project first — they apply to every row in the file.')
      return
    }
    setChecking(true)
    setImportError(null)
    setImportResult(null)
    setSummary(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('user_id', userId)
      form.append('project_id', projectId)
      form.append('dryRun', 'true')

      const res = await fetch(`${API}/api/partner/trees/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error || 'Could not read that file')
        if (data.summary) setSummary(data.summary)
        return
      }
      setSummary(data.summary)
    } catch {
      setImportError('Could not read that file')
    } finally {
      setChecking(false)
    }
  }

  async function runImport() {
    if (!sheet || !summary || summary.errorRows > 0) return
    setImporting(true)
    setImportError(null)
    try {
      const form = new FormData()
      form.append('file', sheet)
      form.append('user_id', userId)
      form.append('project_id', projectId)

      const res = await fetch(`${API}/api/partner/trees/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')

      setImportResult(
        data.message
          ? data.tasksCreated > 0
            ? `${data.message} ${data.tasksCreated} field verification task${data.tasksCreated > 1 ? 's were' : ' was'} created — assign them to a Field Operator from Team.`
            : data.message
          : `${data.imported} records imported.`
      )
      setSummary(null)
      setSheet(null)
      if (sheetRef.current) sheetRef.current.value = ''
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  async function downloadTemplate() {
    try {
      const res = await fetch(`${API}/api/partner/trees/import/template`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = 'tree-import-template.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setImportError('Could not download the template')
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!userId)         e.userId    = 'Required'
    if (!projectId)      e.projectId = 'Required'
    if (!species.trim()) e.species   = 'Required'
    const la = Number(lat), ln = Number(lng)
    if (!lat || !Number.isFinite(la) || la < -90  || la > 90)  e.lat = 'Enter a valid latitude'
    if (!lng || !Number.isFinite(ln) || ln < -180 || ln > 180) e.lng = 'Enter a valid longitude'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const form = new FormData()
      form.append('user_id', userId)
      form.append('project_id', projectId)
      form.append('species', species.trim())
      form.append('latitude', lat)
      form.append('longitude', lng)
      form.append('quantity', quantity || '1')
      form.append('event_type', eventType)
      form.append('health_status', health)
      form.append('tree_condition', condition)
      if (sciName.trim()) form.append('scientific_name', sciName.trim())
      if (landType)       form.append('land_type', landType)
      if (dbh)            form.append('dbh_cm', dbh)
      if (height)         form.append('height_m', height)
      if (notes.trim())   form.append('notes', notes.trim())
      if (photo)          form.append('photo', photo)

      const res = await fetch(`${API}/api/partner/trees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record tree')

      setSuccess(
        data.message
          ? data.tasksCreated > 0
            ? `${data.message} A field verification task was created — assign it to a Field Operator from Team.`
            : data.message
          : 'Tree recorded.'
      )
      // Keep user, project and event type — a partner usually files several in
      // a row for the same person. Clear what changes per tree.
      setSpecies(''); setSciName(''); setLat(''); setLng('')
      setQuantity('1'); setDbh(''); setHeight(''); setNotes(''); setPhoto(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record tree')
    } finally {
      setSaving(false)
    }
  }

  const recordable = users.filter(u => u.canRecord)
  const selectedUser = users.find(u => u.authId === userId)

  return (
    <PartnerLayout title="Add tree" subtitle="Record a tree on behalf of one of your users">
      <div style={{ maxWidth: 760 }}>

        {success && (
          <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '12px 16px', fontSize: 13.5, color: '#27500A', marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span>✓ {success} The form is ready for the next one.</span>
            <button type="button" onClick={() => navigate('/partner/projects')} style={{ background: 'none', border: 'none', color: '#27500A', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>
              View projects →
            </button>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!loading && recordable.length === 0 && (
          <div className="pl-card" style={{ marginBottom: 16 }}>
            <div className="pl-empty">
              <div className="pl-empty__icon">👥</div>
              <div className="pl-empty__title">No users to record for</div>
              <div className="pl-empty__sub">
                Add someone to your team first — a tree is always owned by the person it belongs to.
              </div>
              <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/team')}>
                Go to Team
              </button>
            </div>
          </div>
        )}

        {!loading && recordable.length > 0 && projects.length === 0 && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            You have no approved projects yet. A tree must belong to one — register a project and wait for approval.
          </div>
        )}

        {/* ── Who and where ─────────────────────────────────────────────── */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Who this is for</div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="at-user">User</label>
              <select
                id="at-user"
                className={`sp-select ${errors.userId ? 'sp-input--error' : ''}`}
                value={userId}
                onChange={e => {
                  const nextId = e.target.value
                  setUserId(nextId)
                  const chosen = recordable.find(u => u.authId === nextId)
                  // A User created for a project always stays on it here — the
                  // assignment made at creation time is what "assigned to a
                  // project" means; this form doesn't get to quietly override it.
                  if (chosen?.projectId) setProjectId(chosen.projectId)
                }}
                disabled={loading || recordable.length === 0}
              >
                <option value="">Select a user…</option>
                {recordable.map(u => (
                  <option key={u.teamMemberId} value={u.authId as string}>
                    {u.name} — {u.roleLabel}
                  </option>
                ))}
              </select>
              {errors.userId && <div className="sp-field-error">{errors.userId}</div>}
              {selectedUser && (
                <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 4 }}>
                  This tree will be owned by {selectedUser.email}. You'll be recorded as the surveyor.
                </div>
              )}
            </div>

            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="at-project">Project</label>
              <select
                id="at-project"
                className={`sp-select ${errors.projectId ? 'sp-input--error' : ''}`}
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                disabled={loading || projects.length === 0 || !!selectedUser?.projectId}
              >
                <option value="">Select a project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.projectId && <div className="sp-field-error">{errors.projectId}</div>}
              {selectedUser?.projectId && (
                <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 4 }}>
                  🔒 {selectedUser.name} was created for this project — their work stays here.
                </div>
              )}
            </div>
          </div>

          {users.some(u => !u.canRecord) && (
            <div style={{ fontSize: 11.5, color: '#9AA79C', lineHeight: 1.5 }}>
              {users.filter(u => !u.canRecord).length} team member(s) have no sign-in account yet, so work can't be
              recorded against them.
            </div>
          )}
        </div>

        {/* ── Bulk import ──────────────────────────────────────────────── */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            Import from a spreadsheet
            <button
              type="button"
              onClick={downloadTemplate}
              style={{ background: 'none', border: 'none', color: '#185FA5', fontWeight: 600, fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}
            >
              Download template ↓
            </button>
          </div>

          <p style={{ fontSize: 12.5, color: '#6B7B6E', lineHeight: 1.6, margin: '0 0 14px' }}>
            Already have the trees in Excel? Upload a <strong>.xlsx</strong> or <strong>.csv</strong> instead of typing
            them one by one. The <strong>user</strong> and <strong>project</strong> chosen above apply to every row.
            Required columns: <strong>Species, Latitude, Longitude</strong>.
          </p>

          {importResult && (
            <div style={{ background: '#EAF3DE', border: '1px solid #AACBA7', borderRadius: 10, padding: '11px 15px', fontSize: 13.5, color: '#27500A', marginBottom: 14 }}>
              ✓ {importResult}
            </div>
          )}

          {importError && (
            <div style={{ background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 10, padding: '11px 15px', fontSize: 13, color: '#8B3A00', marginBottom: 14 }}>
              {importError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="pl-btn pl-btn--ghost"
              style={{ fontSize: 12.5 }}
              onClick={() => sheetRef.current?.click()}
              disabled={checking || importing}
            >
              📄 {sheet ? sheet.name : 'Choose a file'}
            </button>
            <input
              ref={sheetRef}
              type="file"
              accept=".xlsx,.csv"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0] || null
                setSheet(f)
                setSummary(null)
                setImportResult(null)
                setImportError(null)
                if (f) checkSheet(f)
              }}
            />
            {checking && <span style={{ fontSize: 12.5, color: '#6B7B6E' }}>Checking…</span>}
          </div>

          {/* What the file actually contains, before anything is written */}
          {summary && (
            <div style={{ marginTop: 16, border: '1px solid #EDE6DF', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '12px 15px', background: '#F5F0EC', fontSize: 12.5 }}>
                <span><strong>{summary.totalRows}</strong> row{summary.totalRows === 1 ? '' : 's'}</span>
                <span style={{ color: '#27500A' }}><strong>{summary.validRows}</strong> ready</span>
                {summary.errorRows > 0 && (
                  <span style={{ color: '#8B3A00' }}><strong>{summary.errorRows}</strong> need fixing</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#6B7B6E' }}>
                  {summary.totalTrees} tree{summary.totalTrees === 1 ? '' : 's'} for {summary.recordedFor}
                </span>
              </div>

              {summary.errorRows > 0 && (
                <div style={{ padding: '12px 15px', borderTop: '1px solid #EDE6DF' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8B3A00', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
                    Fix these rows, then upload again
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#6B2E00', lineHeight: 1.7 }}>
                    {summary.errors.map(e => (
                      <li key={e.line}><strong>Row {e.line}:</strong> {e.errors.join('; ')}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 8 }}>
                    Nothing is imported while any row has a problem.
                  </div>
                </div>
              )}

              {summary.validRows > 0 && summary.errorRows === 0 && (
                <>
                  <table className="pl-table" style={{ margin: 0 }}>
                    <thead>
                      <tr><th>Row</th><th>Species</th><th>Qty</th><th>Location</th></tr>
                    </thead>
                    <tbody>
                      {summary.preview.map(r => (
                        <tr key={r.line}>
                          <td style={{ color: '#9AA79C', fontSize: 12 }}>{r.line}</td>
                          <td style={{ fontWeight: 600 }}>{r.species}</td>
                          <td>{r.quantity}</td>
                          <td style={{ color: '#6B7B6E', fontSize: 12 }}>{r.latitude}, {r.longitude}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {summary.validRows > summary.preview.length && (
                    <div style={{ padding: '8px 15px', fontSize: 11.5, color: '#9AA79C' }}>
                      …and {summary.validRows - summary.preview.length} more.
                    </div>
                  )}
                  <div style={{ padding: '12px 15px', borderTop: '1px solid #EDE6DF', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="pl-btn pl-btn--primary" onClick={runImport} disabled={importing}>
                      {importing ? 'Importing…' : `Import ${summary.validRows} record${summary.validRows === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── The tree ──────────────────────────────────────────────────── */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Or add one tree</div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="at-species">Species</label>
              <input id="at-species" type="text" className={`sp-input ${errors.species ? 'sp-input--error' : ''}`} placeholder="e.g. Neem" value={species} onChange={e => setSpecies(e.target.value)} />
              {errors.species && <div className="sp-field-error">{errors.species}</div>}
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-sci">Scientific name</label>
              <input id="at-sci" type="text" className="sp-input" placeholder="Azadirachta indica" value={sciName} onChange={e => setSciName(e.target.value)} />
            </div>
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-event">Event type</label>
              <select id="at-event" className="sp-select" value={eventType} onChange={e => setEventType(e.target.value)}>
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-qty">Quantity</label>
              <input id="at-qty" type="number" min={1} className="sp-input" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-health">Health</label>
              <select id="at-health" className="sp-select" value={health} onChange={e => setHealth(e.target.value)}>
                {HEALTH.map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
              </select>
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-cond">Condition</label>
              <select id="at-cond" className="sp-select" value={condition} onChange={e => setCondition(e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-dbh">DBH (cm)</label>
              <input id="at-dbh" type="number" min={0} step="0.1" className="sp-input" placeholder="optional" value={dbh} onChange={e => setDbh(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="at-height">Height (m)</label>
              <input id="at-height" type="number" min={0} step="0.1" className="sp-input" placeholder="optional" value={height} onChange={e => setHeight(e.target.value)} />
            </div>
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="at-land">Land type</label>
            <select id="at-land" className="sp-select" value={landType} onChange={e => setLandType(e.target.value)}>
              <option value="">Not specified</option>
              {LAND_TYPES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* ── Location and photo ────────────────────────────────────────── */}
        <div className="pl-card" style={{ marginBottom: 16 }}>
          <div className="pl-card__title">Location &amp; photo</div>

          <div className="sp-grid-2" style={{ marginBottom: 10 }}>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="at-lat">Latitude</label>
              <input id="at-lat" type="text" className={`sp-input ${errors.lat ? 'sp-input--error' : ''}`} placeholder="23.022500" value={lat} onChange={e => setLat(e.target.value)} />
              {errors.lat && <div className="sp-field-error">{errors.lat}</div>}
            </div>
            <div className="sp-field">
              <label className="sp-label sp-label--required" htmlFor="at-lng">Longitude</label>
              <input id="at-lng" type="text" className={`sp-input ${errors.lng ? 'sp-input--error' : ''}`} placeholder="72.571400" value={lng} onChange={e => setLng(e.target.value)} />
              {errors.lng && <div className="sp-field-error">{errors.lng}</div>}
            </div>
          </div>

          <button type="button" className="pl-btn pl-btn--ghost" style={{ fontSize: 12.5, marginBottom: 14 }} onClick={useMyLocation} disabled={locating}>
            {locating ? 'Getting location…' : '📍 Use my current location'}
          </button>

          <div style={{ fontSize: 11.5, color: '#9AA79C', marginBottom: 14, lineHeight: 1.5 }}>
            These are the tree's coordinates, not yours — only use the button above if you're standing at the tree.
          </div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label">Photo</label>
            <button type="button" className="pl-btn pl-btn--ghost" style={{ fontSize: 12.5 }} onClick={() => fileRef.current?.click()}>
              📷 {photo ? photo.name : 'Attach photo (optional)'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhoto(e.target.files?.[0] || null)} />
          </div>

          <div className="sp-field">
            <label className="sp-label" htmlFor="at-notes">Notes</label>
            <textarea id="at-notes" className="sp-textarea" rows={3} placeholder="Condition, surroundings, anything worth recording…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" className="pl-btn pl-btn--ghost" onClick={() => navigate('/partner/dashboard')}>Cancel</button>
          <button
            type="button"
            className="pl-btn pl-btn--primary"
            onClick={handleSubmit}
            disabled={saving || loading || recordable.length === 0 || projects.length === 0}
          >
            {saving ? 'Saving…' : 'Record tree'}
          </button>
        </div>
      </div>
    </PartnerLayout>
  )
}

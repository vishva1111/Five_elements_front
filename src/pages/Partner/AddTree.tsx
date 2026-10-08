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
import { useGoBack } from '../../hooks/useGoBack'
import PartnerLayout from './PartnerLayout'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { useSpecies } from '../../constants/treeSpecies'
import { TREE_STAGES, DEFAULT_STAGE, STAGE_STYLE } from '../../constants/treeStages'
import { Users, TreePine, FileSpreadsheet, Download, Upload, Leaf } from 'lucide-react'
import './Partner.css'
import '../SubmitProject/SubmitProject.css'


interface TeamUser {
  teamMemberId: string
  authId:       string | null
  /** authId when available, otherwise "member:<teamMemberId>" sentinel */
  effectiveId:  string
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
  const goBack      = useGoBack('/partner/actions')
  const [searchParams] = useSearchParams()
  const token       = session?.access_token
  const { species: speciesList, find: findSpecies, error: speciesError } = useSpecies()

  const [users,    setUsers]    = useState<TeamUser[]>([])
  const [projects, setProjects] = useState<PartnerProject[]>([])
  const [loading,  setLoading]  = useState(true)

  const [userId,    setUserId]    = useState('')
  const [projectId, setProjectId] = useState('')
  const [species,   setSpecies]   = useState('')
  const [sciName,   setSciName]   = useState('')
  const [quantity,  setQuantity]  = useState('1')
  const [stage,     setStage]     = useState<string>(DEFAULT_STAGE)

  // ── bulk import ──────────────────────────────────────────────────────────
  const sheetRef = useRef<HTMLInputElement>(null)
  const [sheet,        setSheet]        = useState<File | null>(null)
  const [checking,     setChecking]     = useState(false)
  const [importing,    setImporting]    = useState(false)
  const [summary,      setSummary]      = useState<ImportSummary | null>(null)
  const [importError,  setImportError]  = useState<string | null>(null)

  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const toast = useToast()
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
          const match = list.find(m => (m.authId === wanted || m.effectiveId === wanted) && m.canRecord)
          if (match) {
            setUserId(match.effectiveId)
            if (match.projectId) setProjectId(match.projectId)
          }
        }
      })
      .catch(() => setError('Could not load your team or projects.'))
      .finally(() => setLoading(false))
  }, [token, searchParams])

  /** Server-side parse with nothing written, so the partner sees what will land. */
  async function checkSheet(file: File) {
    if (!userId || !projectId) {
      setImportError('Choose the user and project first — they apply to every row in the file.')
      return
    }
    setChecking(true)
    setImportError(null)
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

      toast.success(
        (data.message || `${data.imported} records imported.`)
        + (data.tasksCreated > 0 ? ` ${data.tasksCreated} verification task${data.tasksCreated > 1 ? 's are' : ' is'} in Tasks.` : '')
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
    return e
  }

  async function handleSubmit() {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('user_id', userId)
      form.append('project_id', projectId)
      form.append('species', species.trim())
      form.append('quantity', quantity || '1')
      form.append('stage', stage)
      form.append('event_type', 'Planting')
      form.append('health_status', 'healthy')
      form.append('tree_condition', 'Healthy')
      if (sciName.trim()) form.append('scientific_name', sciName.trim())

      const res = await fetch(`${API}/api/partner/trees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to record tree')

      toast.success(
        (data.message || 'Tree recorded.')
        + (data.tasksCreated > 0 ? ' Its verification task is in Tasks — assign a field operator there.' : '')
      )
      // Keep user, project and event type — a partner usually files several in
      // a row for the same person. Clear what changes per tree.
      setSpecies(''); setSciName('')
      setQuantity('1')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record tree')
    } finally {
      setSaving(false)
    }
  }

  const recordable = users.filter(u => u.canRecord)
  const selectedUser = users.find(u => u.effectiveId === userId)

  const selectedProject = projects.find(p => p.id === projectId)
  const perTreeCo2 = findSpecies(species)?.co2PerYear
  const qtyNum     = Math.max(1, Number(quantity) || 1)
  const totalCo2   = perTreeCo2 !== undefined ? +(perTreeCo2 * qtyNum).toFixed(1) : undefined
  const canSubmit  = !saving && !loading && recordable.length > 0 && projects.length > 0

  return (
    <PartnerLayout title="Assign Tree" subtitle="Record a tree on behalf of one of your users">
      <div style={{ maxWidth: 1120 }}>

        {error && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
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
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
            You have no approved projects yet. A tree must belong to one — register a project and wait for approval.
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* ── Left: the form ─────────────────────────────────────────── */}
          <div style={{ flex: '1 1 520px', minWidth: 0 }}>

            {/* Step 1 — who and where */}
            <div className="pl-card" style={{ marginBottom: 16 }}>
              <StepHeader step={1} icon={<Users size={18} />} title="Who this is for" hint="The tree is owned by this user and counted under this project." />

              <div className="sp-grid-2">
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label sp-label--required" htmlFor="at-user">User</label>
                  <select
                    id="at-user"
                    className={`sp-select ${errors.userId ? 'sp-input--error' : ''}`}
                    style={{ width: '100%' }}
                    value={userId}
                    onChange={e => {
                      const nextId = e.target.value
                      setUserId(nextId)
                      const chosen = recordable.find(u => u.effectiveId === nextId)
                      // A User created for a project always stays on it here — the
                      // assignment made at creation time is what "assigned to a
                      // project" means; this form doesn't get to quietly override it.
                      if (chosen?.projectId) setProjectId(chosen.projectId)
                    }}
                    disabled={loading || recordable.length === 0}
                  >
                    <option value="">Select a user…</option>
                    {recordable.map(u => (
                      <option key={u.teamMemberId} value={u.effectiveId}>
                        {u.name} — {u.roleLabel}
                      </option>
                    ))}
                  </select>
                  {errors.userId && <div className="sp-field-error">{errors.userId}</div>}
                  {selectedUser && (
                    <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 4 }}>
                      Owned by {selectedUser.email}. You'll be recorded as the surveyor.
                    </div>
                  )}
                </div>

                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label sp-label--required" htmlFor="at-project">Project</label>
                  <select
                    id="at-project"
                    className={`sp-select ${errors.projectId ? 'sp-input--error' : ''}`}
                    style={{ width: '100%' }}
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

              {users.some(u => !u.authId) && (
                <div style={{ fontSize: 11.5, color: '#9AA79C', lineHeight: 1.5, marginTop: 12, paddingTop: 12, borderTop: '1px dashed #EEE9E1' }}>
                  {users.filter(u => !u.authId).length} team member(s) have no sign-in account yet — trees recorded for them will be attributed to the partner account.
                </div>
              )}
            </div>

            {/* Step 2 — one tree */}
            <div className="pl-card" style={{ marginBottom: 16 }}>
              <StepHeader step={2} icon={<TreePine size={18} />} title="Add one tree" hint="Pick a species — the scientific name and CO₂ fill in for you." />

              <div className="sp-grid-2" style={{ marginBottom: 14 }}>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label sp-label--required" htmlFor="at-species">Species</label>
                  <select id="at-species" className={`sp-select ${errors.species ? 'sp-input--error' : ''}`} style={{ width: '100%' }} value={species} onChange={e => {
                    setSpecies(e.target.value)
                    setSciName(findSpecies(e.target.value)?.scientific || '')
                  }}>
                    <option value="">Select a species…</option>
                    {speciesList.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                  </select>
                  {errors.species && <div className="sp-field-error">{errors.species}</div>}
                  {speciesError && <div className="sp-field-error">{speciesError}</div>}
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="at-sci">Scientific name</label>
                  <input id="at-sci" type="text" className="sp-input" placeholder="Filled from the species" value={sciName} readOnly style={{ width: '100%', background: '#FAF8F4' }} />
                </div>
              </div>

              <div className="sp-grid-2">
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="at-qty">Number of trees</label>
                  <input id="at-qty" type="number" min={1} max={500} className="sp-input" style={{ width: '100%' }} value={quantity} onChange={e => setQuantity(e.target.value)} />
                  <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 4 }}>
                    {qtyNum > 1 ? `${qtyNum} separate trees — each gets its own Tree ID and task.` : 'Each tree gets its own Tree ID.'}
                  </div>
                </div>
                <div className="sp-field" style={{ minWidth: 0 }}>
                  <label className="sp-label" htmlFor="at-co2">CO₂ absorbed</label>
                  <div style={{ position: 'relative' }}>
                    <input id="at-co2" type="text" className="sp-input" readOnly placeholder="Filled from the species"
                      value={totalCo2 !== undefined ? String(totalCo2) : ''}
                      style={{ width: '100%', background: '#FAF8F4', paddingRight: 64 }} />
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9AA79C', pointerEvents: 'none' }}>kg / yr</span>
                  </div>
                  {perTreeCo2 !== undefined && qtyNum > 1 && (
                    <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 4 }}>{perTreeCo2} kg per tree × {qtyNum}</div>
                  )}
                </div>
              </div>

              <div className="sp-field" style={{ marginTop: 14 }}>
                <label className="sp-label">Stage</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="radiogroup" aria-label="Stage">
                  {TREE_STAGES.map(st => {
                    const on = stage === st
                    const c  = STAGE_STYLE[st]
                    return (
                      <button
                        key={st}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setStage(st)}
                        style={{
                          padding: '7px 14px', borderRadius: 999, fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${on ? c.fg : '#E5DFD6'}`,
                          background: on ? c.bg : '#fff',
                          color: on ? c.fg : '#6B7B6E',
                        }}
                      >
                        {st}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Alternative — spreadsheet import */}
            <div className="pl-card" style={{ marginBottom: 16 }}>
              <StepHeader
                icon={<FileSpreadsheet size={18} />}
                title="Or import many from a spreadsheet"
                hint="The user and project from step 1 apply to every row."
                action={
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#185FA5', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0, whiteSpace: 'nowrap' }}
                  >
                    <Download size={14} /> Template
                  </button>
                }
              />


              {importError && (
                <div style={{ background: '#FEF0E3', border: '1px solid #F5C27A', borderRadius: 10, padding: '11px 15px', fontSize: 13, color: '#8B3A00', marginBottom: 14 }}>
                  {importError}
                </div>
              )}

              <button
                type="button"
                onClick={() => sheetRef.current?.click()}
                disabled={checking || importing}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  padding: '18px 16px', borderRadius: 12, border: '1.5px dashed #CFC6B8', background: '#FCFAF7',
                  color: '#2B5341', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600,
                  cursor: checking || importing ? 'not-allowed' : 'pointer',
                }}
              >
                <Upload size={18} />
                {checking ? 'Checking…' : sheet ? sheet.name : 'Choose an .xlsx or .csv file'}
              </button>
              <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 8 }}>
                Required columns: <strong>Species, Latitude, Longitude</strong>.
              </div>
              <input
                ref={sheetRef}
                type="file"
                accept=".xlsx,.csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0] || null
                  setSheet(f)
                  setSummary(null)
                                setImportError(null)
                  if (f) checkSheet(f)
                }}
              />

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
          </div>

          {/* ── Right: summary + actions ───────────────────────────────── */}
          <div style={{ flex: '1 1 280px', maxWidth: 360, position: 'sticky', top: 16 }}>
            <div className="pl-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #EEE9E1' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2B22' }}>Summary</div>
                <div style={{ fontSize: 12, color: '#7A867C', marginTop: 2 }}>Check before recording.</div>
              </div>

              <div style={{ padding: '6px 20px' }}>
                <SummaryRow label="User"            value={selectedUser?.name} />
                <SummaryRow label="Project"         value={selectedProject?.name} />
                <SummaryRow label="Species"         value={species || undefined} />
                <SummaryRow label="Scientific name" value={sciName || undefined} />
                <SummaryRow label="Trees"           value={`${qtyNum} (${qtyNum === 1 ? '1 Tree ID' : `${qtyNum} Tree IDs`})`} />
                <SummaryRow label="Stage"           value={stage} />
              </div>

              <div style={{ margin: '4px 20px 16px', padding: '14px 16px', borderRadius: 12, background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: '#27500A' }}>
                  <Leaf size={16} /> CO₂ absorbed
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#1C3A2B' }}>
                  {totalCo2 !== undefined ? totalCo2 : '—'}
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#5C7A5F', marginLeft: 4 }}>kg/yr</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid #EEE9E1', background: '#FAF8F4' }}>
                <button type="button" className="pl-btn pl-btn--ghost" style={{ flex: 1 }} onClick={goBack}>Cancel</button>
                <button
                  type="button"
                  className="pl-btn pl-btn--primary"
                  style={{ flex: 1.4 }}
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {saving ? 'Saving…' : qtyNum > 1 ? `Record ${qtyNum} trees` : 'Record tree'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PartnerLayout>
  )
}

function StepHeader({ step, icon, title, hint, action }: {
  step?: number
  icon: React.ReactNode
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
      <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: '#EAF3DE', color: '#2B5341', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
        {step !== undefined && (
          <span style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 9, background: '#2B5341', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
            {step}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1C2B22' }}>{title}</div>
        {hint && <div style={{ fontSize: 12.5, color: '#7A867C', marginTop: 2, lineHeight: 1.45 }}>{hint}</div>}
      </div>
      {action}
    </div>
  )
}

function SummaryRow({ label, value, italic }: { label: string; value?: string; italic?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px dashed #EEE9E1', fontSize: 13 }}>
      <span style={{ color: '#7A867C', flexShrink: 0 }}>{label}</span>
      <span style={{ color: value ? '#1C2B22' : '#B5BDB6', fontWeight: value ? 600 : 400, fontStyle: italic && value ? 'italic' : 'normal', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {value || 'Not chosen'}
      </span>
    </div>
  )
}

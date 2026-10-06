import React, { useCallback, useEffect, useState } from 'react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import { useNavigate } from 'react-router-dom'
import { Pencil, Palette, Fence, TreePine } from 'lucide-react'
import PartnerLayout from './PartnerLayout'
import FencingSummary from '../../components/project/FencingSummary'
import { EditProjectModal, ColorRequestModal, FencingRequestModal, ProjectTreesModal, type ProjectLite } from '../../components/project/ProjectModals'
import { DEFAULT_PROJECT_COLOR, formatDate, type Boundary, type Fencing } from '../../components/tree/treeLabels'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface ChangeRequestRow {
  id: string
  type: 'color' | 'fencing' | 'boundary'
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt: string | null
  reviewNotes: string | null
}

interface PartnerProject {
  id:               string
  name:             string
  element:          string
  category:         string | null
  location:         string
  description:      string | null
  totalTrees:       number | null
  /** Trees the partner has recorded in this project, and how many are planted. */
  treesRecorded?:   number
  treesPlanted?:    number
  fundedTrees:      number | null
  progressPct:      number
  tco2e:            number | null
  evidenceCount:    number
  fundersCount:     number
  status:           string
  active:           boolean
  coverImage:       string | null
  lastEvidenceDate: string | null
  approvedAt:       string | null
  mapColor:         string | null
  fencing:          Fencing | null
  boundary:         Boundary | null
  changeRequests:   ChangeRequestRow[]
}

type Dialog = { kind: 'edit' | 'color' | 'fencing' | 'trees'; project: PartnerProject } | null

const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, padding: '0 11px', fontSize: 12.5 }

export default function Projects() {
  const { session } = useAuth()
  const navigate     = useNavigate()

  const [projects, setProjects] = useState<PartnerProject[]>([])
  const [loading,  setLoading]  = useState(true)
  const [dialog,   setDialog]   = useState<Dialog>(null)
  // Trees (for drawing a boundary around them) are loaded when the fencing dialog opens.
  const [trees, setTrees] = useState<{ id: string; latitude: number; longitude: number }[]>([])

  const token = session?.access_token
  const load = useCallback(() => {
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (dialog?.kind !== 'fencing') return
    setTrees([])
    fetch(`${API}/api/partner/trees?project_id=${encodeURIComponent(dialog.project.id)}`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setTrees((d.trees || []).filter((t: { latitude: number; longitude: number }) => Number(t.latitude) && Number(t.longitude))))
      .catch(() => setTrees([]))
  }, [dialog, token])

  const pg = usePagination(projects, 12)
  const lite = (p: PartnerProject): ProjectLite => ({
    id: p.id, name: p.name, description: p.description, location: p.location, category: p.category,
    totalTrees: p.totalTrees, mapColor: p.mapColor, fencing: p.fencing, boundary: p.boundary,
  })
  const pendingOf = (p: PartnerProject, type: 'color' | 'fencing') => p.changeRequests.find(r => r.type === type && r.status === 'pending')
  const lastRejected = (p: PartnerProject) => p.changeRequests.find(r => r.status === 'rejected' && r.type !== 'boundary')
  const closeAndReload = () => { setDialog(null); load() }

  return (
    <PartnerLayout title="Projects" subtitle="Your approved, active projects and their live progress">

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/projects/new')}>
          + New project
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 180, borderRadius: 14 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="pl-card">
          <div className="pl-empty">
            <div className="pl-empty__icon">🌱</div>
            <div className="pl-empty__title">No approved projects yet</div>
            <div className="pl-empty__sub">
              Once admin approves one of your submissions, it'll show up here as a live project with tree progress and stats.
              Check the <strong>Submissions</strong> tab to see what's still pending.
            </div>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/projects/new')}>Register project</button>
          </div>
        </div>
      ) : (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {pg.items.map(p => {
            const color = p.mapColor || DEFAULT_PROJECT_COLOR
            const pendingColor = pendingOf(p, 'color')
            const pendingFence = pendingOf(p, 'fencing')
            const rejected = lastRejected(p)
            return (
              <div key={p.id} className="pl-card" style={{ padding: 0, overflow: 'hidden', borderTop: `5px solid ${color}` }}>
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5, color: '#112121', lineHeight: 1.3 }}>{p.name}</div>
                    <span className={`pl-badge pl-badge--${p.active ? 'approved' : 'pending'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9AA79C', marginBottom: 14 }}>
                    📍 {p.location} · <span style={{ textTransform: 'capitalize' }}>{p.element}</span>{p.category ? ` · ${p.category}` : ''}
                  </div>

                  {/* Progress bar — trees funded by funders plus trees actually planted
                      (still "Under plantation" doesn't count yet) */}
                  {(() => {
                    const count = (p.fundedTrees ?? 0) + (p.treesPlanted ?? 0)
                    const pct = p.totalTrees ? Math.min(100, Math.round((count / p.totalTrees) * 100)) : 0
                    return (
                      <>
                        <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7B6E' }}>
                          <span>{count.toLocaleString()} / {(p.totalTrees ?? 0).toLocaleString()} trees</span>
                          <span style={{ fontWeight: 700, color: '#2B5341' }}>{pct}%</span>
                        </div>
                        <div style={{ height: 8, background: '#EFEAE4', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
                        </div>
                      </>
                    )
                  })()}

                  {/* All the project's trees, together on a map */}
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'trees', project: p })}
                    title="See every tree in this project on a map"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 10, background: '#F5F8F1', border: '1px solid #E1EBD8', marginBottom: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                  >
                    <span style={{ fontSize: 16 }}>🌳</span>
                    <span style={{ fontSize: 12.5, color: '#2B5341' }}>
                      <strong style={{ fontSize: 14 }}>{(p.treesRecorded ?? 0).toLocaleString('en-IN')}</strong> trees added
                      <span style={{ color: '#7A867C' }}> · </span>
                      <strong>{(p.treesPlanted ?? 0).toLocaleString('en-IN')}</strong> planted
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#2B5341', fontWeight: 700 }}>View on map →</span>
                  </button>

                  {/* Fencing */}
                  <FencingSummary fencing={p.fencing} boundary={p.boundary} compact />

                  {(pendingColor || pendingFence || rejected) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      {pendingColor && <div style={{ fontSize: 11.5, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '5px 9px' }}>⏳ Colour change waiting for approval · asked {formatDate(pendingColor.createdAt)}</div>}
                      {pendingFence && <div style={{ fontSize: 11.5, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '5px 9px' }}>⏳ Fencing update waiting for approval · asked {formatDate(pendingFence.createdAt)}</div>}
                      {rejected && !pendingColor && !pendingFence && (
                        <div style={{ fontSize: 11.5, background: '#FBE9E9', color: '#A32020', borderRadius: 8, padding: '5px 9px' }}>
                          ✕ Your last {rejected.type === 'color' ? 'colour' : 'fencing'} request was not approved{rejected.reviewNotes ? `: ${rejected.reviewNotes}` : ''}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12, marginTop: 14 }}>
                    <div>
                      <div style={{ color: '#9AA79C', marginBottom: 2 }}>tCO2e</div>
                      <div style={{ fontWeight: 700, color: '#112121' }}>{p.tco2e?.toLocaleString() ?? '—'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#9AA79C', marginBottom: 2 }}>Evidence</div>
                      <div style={{ fontWeight: 700, color: '#112121' }}>{p.evidenceCount ?? 0}</div>
                    </div>
                    <div>
                      <div style={{ color: '#9AA79C', marginBottom: 2 }}>Funders</div>
                      <div style={{ fontWeight: 700, color: '#112121' }}>{p.fundersCount ?? 0}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #F0ECE6' }}>
                    <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} onClick={() => setDialog({ kind: 'edit', project: p })}><Pencil size={13} /> Edit</button>
                    <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} disabled={!!pendingColor} title={pendingColor ? 'A colour change is already waiting for approval' : 'Needs admin approval'} onClick={() => setDialog({ kind: 'color', project: p })}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,0.2)' }} /><Palette size={13} /> Colour
                    </button>
                    <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} disabled={!!pendingFence} title={pendingFence ? 'A fencing update is already waiting for approval' : 'Needs admin approval'} onClick={() => setDialog({ kind: 'fencing', project: p })}>
                      <Fence size={13} /> Fencing
                    </button>
                    <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} onClick={() => setDialog({ kind: 'trees', project: p })}><TreePine size={13} /> Trees</button>
                  </div>

                  {p.approvedAt && (
                    <div style={{ marginTop: 12, fontSize: 11, color: '#9AA79C' }}>
                      Approved {new Date(p.approvedAt).toLocaleDateString('en-GB')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Pagination {...pg} noun="project" />
        </>
      )}

      {dialog?.kind === 'edit'    && <EditProjectModal project={lite(dialog.project)} onClose={() => setDialog(null)} onSaved={closeAndReload} />}
      {dialog?.kind === 'color'   && <ColorRequestModal project={lite(dialog.project)} onClose={() => setDialog(null)} onSent={closeAndReload} />}
      {dialog?.kind === 'fencing' && <FencingRequestModal project={lite(dialog.project)} trees={trees} onClose={() => setDialog(null)} onSent={closeAndReload} />}
      {dialog?.kind === 'trees'   && <ProjectTreesModal project={lite(dialog.project)} onClose={() => setDialog(null)} />}
    </PartnerLayout>
  )
}

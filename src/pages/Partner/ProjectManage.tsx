/** A partner's project page: the land map, fencing status, fencing request history and trees. */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PartnerLayout from './PartnerLayout'
import FencingSummary from '../../components/project/FencingSummary'
import { FencingMapBlock, FencingRequestBanner } from '../../components/project/FencingCardParts'
import ProjectTreeList from '../../components/project/ProjectTreeList'
import { DEFAULT_PROJECT_COLOR, formatDate, type Boundary, type Fencing } from '../../components/tree/treeLabels'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface ChangeRequestRow {
  id: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt: string | null
  reviewNotes: string | null
  reason?: string | null
  requestedByName?: string | null
}

interface FullProject {
  id: string
  name: string
  element: string
  category: string | null
  location: string
  mapColor: string | null
  treesRecorded?: number
  treesPlanted?: number
  treePoints?: { id: string; latitude: number; longitude: number; condition?: string | null }[]
  fencing: Fencing | null
  boundary: Boundary | null
  changeRequests: ChangeRequestRow[]
}

const STATUS_CHIP: Record<string, { label: string; bg: string; fg: string }> = {
  pending:  { label: 'Pending',  bg: '#FFF4E0', fg: '#8B5A00' },
  approved: { label: 'Approved', bg: '#EAF3DE', fg: '#27500A' },
  rejected: { label: 'Rejected', bg: '#FBE9E9', fg: '#A32020' },
}

const backBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, padding: '0 14px', fontSize: 13, marginBottom: 16 }
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9AA79C', marginBottom: 8 }

export default function ProjectManage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const token = session?.access_token

  const [project, setProject] = useState<FullProject | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setProject((d.projects || []).find((p: FullProject) => p.id === id) || null))
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [token, id])
  useEffect(() => { load() }, [load])

  if (loading) {
    return <PartnerLayout title="Project"><div className="pl-skel" style={{ height: 240, borderRadius: 14 }} /></PartnerLayout>
  }
  if (!project) {
    return (
      <PartnerLayout title="Project">
        <div className="pl-card"><div className="pl-empty">
          <div className="pl-empty__title">Project not found</div>
          <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/projects')}>Back to projects</button>
        </div></div>
      </PartnerLayout>
    )
  }

  const p = project
  const color = p.mapColor || DEFAULT_PROJECT_COLOR
  // Every fencing request, whether it came from the app (boundary) or the panel (fencing).
  const requests = p.changeRequests.filter(r => r.type === 'fencing' || r.type === 'boundary')
  const pending = requests.find(r => r.status === 'pending')
  // A field-app request (type 'boundary') is decided right here; a panel fencing request waits for an admin.
  const decidable = pending?.type === 'boundary' ? pending : null

  return (
    <PartnerLayout title={p.name} subtitle={`${p.location} · ${p.element}${p.category ? ` · ${p.category}` : ''}`}>
      <button type="button" className="pl-btn pl-btn--ghost" style={backBtn} onClick={() => navigate('/partner/projects')}>
        <ArrowLeft size={14} /> All projects
      </button>

      <div className="pl-card" style={{ padding: 20, borderTop: `5px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FencingMapBlock boundary={p.boundary} trees={p.treePoints} height={300} oneLine />

        <div>
          <div style={sectionTitle}>Fencing</div>
          <FencingSummary fencing={p.fencing} boundary={p.boundary} />
        </div>

        {decidable ? (
          <FencingRequestBanner projectId={p.id} request={decidable} onDecided={load} />
        ) : pending && (
          <div style={{ fontSize: 12, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '6px 10px' }}>
            ⏳ Fencing update waiting for approval · asked {formatDate(pending.createdAt)}
          </div>
        )}

        <div>
          <div style={sectionTitle}>Fencing requests</div>
          {requests.length === 0 ? (
            <div style={{ fontSize: 12.5, color: '#9AA79C' }}>No fencing requests yet.</div>
          ) : (
            <div style={{ border: '1px solid #EEE9E1', borderRadius: 10, overflow: 'hidden' }}>
              {requests.map(r => {
                const chip = STATUS_CHIP[r.status]
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderBottom: '1px solid #F4F0EA', fontSize: 12.5 }}>
                    <span style={{ background: chip.bg, color: chip.fg, padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap', marginTop: 1 }}>{chip.label}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#1C2B22' }}>
                        Asked {formatDate(r.createdAt)}{r.requestedByName ? ` by ${r.requestedByName}` : ''}
                      </div>
                      {r.reason && <div style={{ color: '#6B7B6E' }}>“{r.reason}”</div>}
                      {r.status !== 'pending' && (
                        <div style={{ color: '#7A867C' }}>
                          {r.status === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(r.reviewedAt)}{r.reviewNotes ? ` — ${r.reviewNotes}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div style={sectionTitle}>Trees</div>
          <ProjectTreeList projectId={p.id} added={p.treesRecorded ?? 0} planted={p.treesPlanted ?? 0} />
        </div>
      </div>
    </PartnerLayout>
  )
}

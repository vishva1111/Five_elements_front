/** A partner's full project page: edit details, ask for a colour / fencing change, see every tree. */
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Pencil, Palette, Fence, TreePine, ArrowLeft } from 'lucide-react'
import PartnerLayout from './PartnerLayout'
import FencingSummary from '../../components/project/FencingSummary'
import { FencingMapBlock, FencingRequestBanner, boundaryRequests } from '../../components/project/FencingCardParts'
import { EditProjectModal, ColorRequestModal, FencingRequestModal, ProjectTreesModal, type ProjectLite } from '../../components/project/ProjectModals'
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
  description: string | null
  totalTrees: number | null
  mapColor: string | null
  fencing: Fencing | null
  boundary: Boundary | null
  changeRequests: ChangeRequestRow[]
}

type Dialog = 'edit' | 'color' | 'fencing' | 'trees' | null

const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 34, padding: '0 14px', fontSize: 13 }

export default function ProjectManage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const token = session?.access_token

  const [project, setProject] = useState<FullProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [trees, setTrees] = useState<{ id: string; latitude: number; longitude: number }[]>([])

  const load = useCallback(() => {
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setProject((d.projects || []).find((p: FullProject) => p.id === id) || null))
      .catch(() => setProject(null))
      .finally(() => setLoading(false))
  }, [token, id])
  useEffect(() => { load() }, [load])

  // Trees (for drawing a boundary around them) are loaded when the fencing dialog opens.
  useEffect(() => {
    if (dialog !== 'fencing' || !id) return
    setTrees([])
    fetch(`${API}/api/partner/trees?project_id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setTrees((d.trees || []).filter((t: { latitude: number; longitude: number }) => Number(t.latitude) && Number(t.longitude))))
      .catch(() => setTrees([]))
  }, [dialog, id, token])

  const closeAndReload = () => { setDialog(null); load() }

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
  const pendingColor = p.changeRequests.find(r => r.type === 'color' && r.status === 'pending')
  const pendingFence = p.changeRequests.find(r => r.type === 'fencing' && r.status === 'pending')
  const rejected = p.changeRequests.find(r => r.status === 'rejected' && (r.type === 'color' || r.type === 'fencing'))
  const pendingBoundary =boundaryRequests(p.changeRequests).find(r => r.status === 'pending')
  const lite: ProjectLite = {
    id: p.id, name: p.name, description: p.description, location: p.location, category: p.category,
    totalTrees: p.totalTrees, mapColor: p.mapColor, fencing: p.fencing, boundary: p.boundary,
  }

  return (
    <PartnerLayout title={p.name} subtitle={`${p.location} · ${p.element}${p.category ? ` · ${p.category}` : ''}`}>
      <button type="button" className="pl-btn pl-btn--ghost" style={{ ...iconBtn, marginBottom: 16 }} onClick={() => navigate('/partner/projects')}>
        <ArrowLeft size={14} /> All projects
      </button>

      <div className="pl-card" style={{ padding: 20, borderTop: `5px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FencingMapBlock boundary={p.boundary} height={280} />
        {pendingBoundary && <FencingRequestBanner projectId={p.id} request={pendingBoundary} onDecided={load} />}
        <FencingSummary fencing={p.fencing} boundary={p.boundary} />

        {!pendingColor && !pendingFence && rejected && (
          <div style={{ fontSize: 12, background: '#FBE9E9', color: '#A32020', borderRadius: 8, padding: '6px 10px' }}>
            ✕ Your last {rejected.type === 'color' ? 'colour' : 'fencing'} request was not approved{rejected.reviewNotes ? `: ${rejected.reviewNotes}` : ''}
          </div>
        )}

        {(pendingColor || pendingFence) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pendingColor && <div style={{ fontSize: 12, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '6px 10px' }}>⏳ Colour change waiting for approval · asked {formatDate(pendingColor.createdAt)}</div>}
            {pendingFence && <div style={{ fontSize: 12, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '6px 10px' }}>⏳ Fencing update waiting for approval · asked {formatDate(pendingFence.createdAt)}</div>}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 14, borderTop: '1px solid #F0ECE6' }}>
          <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} onClick={() => setDialog('edit')}><Pencil size={14} /> Edit details</button>
          <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} disabled={!!pendingColor} title={pendingColor ? 'A colour change is already waiting for approval' : 'Needs admin approval'} onClick={() => setDialog('color')}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid rgba(0,0,0,0.2)' }} /><Palette size={14} /> Colour
          </button>
          <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} disabled={!!pendingFence} title={pendingFence ? 'A fencing update is already waiting for approval' : 'Needs admin approval'} onClick={() => setDialog('fencing')}>
            <Fence size={14} /> Fencing
          </button>
          <button type="button" className="pl-btn pl-btn--ghost" style={iconBtn} onClick={() => setDialog('trees')}><TreePine size={14} /> Trees</button>
        </div>
      </div>

      {dialog === 'edit'    && <EditProjectModal project={lite} onClose={() => setDialog(null)} onSaved={closeAndReload} />}
      {dialog === 'color'   && <ColorRequestModal project={lite} onClose={() => setDialog(null)} onSent={closeAndReload} />}
      {dialog === 'fencing' && <FencingRequestModal project={lite} trees={trees} onClose={() => setDialog(null)} onSent={closeAndReload} />}
      {dialog === 'trees'   && <ProjectTreesModal project={lite} onClose={() => setDialog(null)} />}
    </PartnerLayout>
  )
}

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import FencingSummary from '../../components/project/FencingSummary'
import { FencingMapBlock } from '../../components/project/FencingCardParts'
import ChangeRequestReview, { type ChangeRequest } from '../../components/project/ChangeRequestReview'
import { EditProjectModal, ProjectTreesModal, type ProjectLite } from '../../components/project/ProjectModals'
import { useModalBehavior } from '../../hooks/useModalBehavior'
import { DEFAULT_PROJECT_COLOR, FENCING_STATUS, formatDate, type Boundary, type Fencing } from '../../components/tree/treeLabels'
import './Admin.css'

interface ProjectRow {
  id:          string
  title:       string
  element:     string
  location:    string
  submittedBy: string
  partnerName: string
  treeCount:   number
  status:      string
  submittedAt: string
  description?: string | null
  category?:    string | null
  mapColor?:    string | null
  fencing?:     Fencing | null
  boundary?:    Boundary | null
}

const ELEMENT_ICONS: Record<string, string> = {
  earth: '🌍', water: '💧', fire: '🔥', air: '💨', space: '✨',
}

export default function ProjectsOversight() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('pending_review')
  const [acting,   setActing]   = useState<string | null>(null)
  const [msg,      setMsg]      = useState('')
  const [dialog,   setDialog]   = useState<{ kind: 'edit' | 'trees' | 'fencing'; project: ProjectRow } | null>(null)

  // Fencing dialog: this project's fencing requests, and the one being reviewed.
  const [fenceReqs, setFenceReqs] = useState<ChangeRequest[] | null>(null)
  const [reviewing, setReviewing] = useState<ChangeRequest | null>(null)

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  const load = () => {
    fetch(`${API}/api/admin/projects`, { headers })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [session])

  const fenceProjectId = dialog?.kind === 'fencing' ? dialog.project.id : null
  const loadFenceReqs = () => {
    if (!fenceProjectId) return
    fetch(`${API}/api/admin/change-requests`, { headers })
      .then(r => r.json())
      .then(d => setFenceReqs((d.requests || []).filter((r: ChangeRequest) => r.projectId === fenceProjectId && (r.type === 'fencing' || r.type === 'boundary'))))
      .catch(() => setFenceReqs([]))
  }
  useEffect(() => { setFenceReqs(null); loadFenceReqs() }, [fenceProjectId])  // eslint-disable-line react-hooks/exhaustive-deps
  useModalBehavior(() => setDialog(null), dialog?.kind === 'fencing')
  const lite = (p: ProjectRow): ProjectLite => ({
    id: p.id, name: p.title, description: p.description || null, location: p.location, category: p.category || null,
    totalTrees: p.treeCount, mapColor: p.mapColor || null, fencing: p.fencing || null, boundary: p.boundary || null,
  })

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const pg = usePagination(filtered, 10, filter)

  async function approveProject(id: string) {
    setActing(id)
    setMsg('')
    try {
      const res = await fetch(`${API}/api/admin/projects/${id}/approve`, { method: 'POST', headers })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'approved' } : p))
      setMsg('✅ Project approved — now visible on the public marketplace.')
    } catch (e: any) {
      setMsg(e.message)
    } finally {
      setActing(null)
    }
  }

  async function rejectProject(id: string) {
    setActing(id)
    try {
      await fetch(`${API}/api/admin/projects/${id}/reject`, { method: 'POST', headers })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected' } : p))
      setMsg('❌ Project rejected.')
    } catch {
      setMsg('Action failed.')
    } finally {
      setActing(null)
    }
  }

  const counts = {
    pending_review: projects.filter(p => p.status === 'pending_review').length,
    approved:       projects.filter(p => p.status === 'approved').length,
    rejected:       projects.filter(p => p.status === 'rejected').length,
  }

  return (
    <AdminLayout title="Projects oversight" subtitle={`${counts.pending_review} pending`}>

      {msg && <div className={`ad-alert ${msg.startsWith('✅') ? 'ad-alert--success' : msg.startsWith('❌') ? 'ad-alert--warn' : 'ad-alert--danger'}`} style={{ cursor: 'pointer' }} onClick={() => setMsg('')}>{msg} ✕</div>}

      <div className="ad-stats ad-grid-3" style={{ marginBottom: 20 }}>
        <div className="ad-stat ad-stat--warn">
          <div className="ad-stat__num">{counts.pending_review}</div>
          <div className="ad-stat__label">Pending review</div>
        </div>
        <div className="ad-stat ad-stat--ok">
          <div className="ad-stat__num">{counts.approved}</div>
          <div className="ad-stat__label">Approved (live)</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat__num">{counts.rejected}</div>
          <div className="ad-stat__label">Rejected</div>
        </div>
      </div>

      <div className="ad-tabs">
        {(['pending_review', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} type="button" className={`ad-tab${filter === f ? ' ad-tab--active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${projects.length})` : f === 'pending_review' ? `Pending (${counts.pending_review})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      <div className="ad-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="ad-skel" style={{ height: 52 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">
            <div className="ad-empty__icon">🌿</div>
            <div className="ad-empty__title">No {filter === 'all' ? '' : filter.replace('_', ' ')} projects</div>
          </div>
        ) : (
        <>
          <table className="ad-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Element</th>
                <th>Location</th>
                <th>Fencing</th>
                <th>Partner</th>
                <th>Trees</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pg.items.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span title={`Map colour ${(p.mapColor || DEFAULT_PROJECT_COLOR).toUpperCase()}${p.mapColor ? '' : ' (default)'}`} style={{ width: 11, height: 11, borderRadius: 3, background: p.mapColor || DEFAULT_PROJECT_COLOR, flexShrink: 0, border: '1px solid rgba(0,0,0,0.15)' }} />
                      {p.title}
                    </div>
                    <div style={{ color: '#9AA79C', fontSize: 11.5 }}>by {p.submittedBy}</div>
                  </td>
                  <td style={{ fontSize: 18 }} title={p.element}>{ELEMENT_ICONS[p.element] || '🌿'}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{p.location}</td>
                  <td>
                    {(() => {
                      const st = p.fencing?.status ? FENCING_STATUS[p.fencing.status] : null
                      return (
                        <button type="button" onClick={() => setDialog({ kind: 'fencing', project: p })} title="Fencing details" style={{ border: 'none', background: st?.bg || '#F2EFEA', color: st?.fg || '#6B7B6E', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                          {st?.label || 'Not added'}
                        </button>
                      )
                    })()}
                  </td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{p.partnerName || 'Self'}</td>
                  <td style={{ fontWeight: 600 }}>{p.treeCount?.toLocaleString() || '—'}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{p.submittedAt}</td>
                  <td><span className={`ad-badge ad-badge--${p.status === 'pending_review' ? 'pending' : p.status}`}>{p.status.replace('_', ' ')}</span></td>
                  <td>
                    {p.status === 'pending_review' ? (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={acting === p.id} onClick={() => approveProject(p.id)}>
                          {acting === p.id ? '…' : 'Approve'}
                        </button>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" style={{ color: '#C62828' }} disabled={acting === p.id} onClick={() => rejectProject(p.id)}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setDialog({ kind: 'trees', project: p })}>Trees</button>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setDialog({ kind: 'edit', project: p })}>Edit</button>
                        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => navigate(`/projects/${p.id}`)}>View →</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination {...pg} noun="project" />
        </>
        )}
      </div>

      {dialog?.kind === 'edit'  && <EditProjectModal role="admin" project={lite(dialog.project)} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); load() }} />}
      {dialog?.kind === 'trees' && <ProjectTreesModal role="admin" project={lite(dialog.project)} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'fencing' && (
        <div onClick={() => setDialog(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="ad-card" onClick={e => e.stopPropagation()} style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{dialog.project.title} · fencing</div>
            <FencingMapBlock boundary={dialog.project.boundary} height={220} oneLine />
            <div style={{ marginTop: 12 }}>
              <FencingSummary fencing={dialog.project.fencing} boundary={dialog.project.boundary} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9AA79C', margin: '16px 0 8px' }}>Fencing requests</div>
            {fenceReqs === null ? (
              <div style={{ fontSize: 12.5, color: '#9AA79C' }}>Loading…</div>
            ) : fenceReqs.length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#9AA79C' }}>No fencing requests yet.</div>
            ) : (
              <div style={{ border: '1px solid #EEE9E1', borderRadius: 10, overflow: 'hidden' }}>
                {fenceReqs.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #F4F0EA', fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, color: r.status === 'pending' ? '#8B5A00' : r.status === 'approved' ? '#27500A' : '#A32020' }}>
                      {r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, color: '#6B7B6E' }}>
                      {formatDate(r.createdAt)}{r.requestedByName ? ` · ${r.requestedByName}` : ''}{r.reason ? ` — “${r.reason}”` : ''}
                    </span>
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setReviewing(r)}>{r.status === 'pending' ? 'Review' : 'View'}</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setDialog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {reviewing && (
        <ChangeRequestReview
          request={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); loadFenceReqs(); load() }}
        />
      )}
    </AdminLayout>
  )
}
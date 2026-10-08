import React, { useCallback, useEffect, useState } from 'react'
import Pagination, { usePagination } from '../../components/ui/Pagination'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { FencingMapBlock } from '../../components/project/FencingCardParts'
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
  treePoints?:      { id: string; latitude: number; longitude: number; condition?: string | null }[]
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

export default function Projects() {
  const { session } = useAuth()
  const navigate     = useNavigate()

  const [projects, setProjects] = useState<PartnerProject[]>([])
  const [loading,  setLoading]  = useState(true)

  const token = session?.access_token
  const load = useCallback(() => {
    fetch(`${API}/api/partner/projects`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [token])
  useEffect(() => { load() }, [load])

  const pg = usePagination(projects, 10)
  const open = (p: PartnerProject) => navigate(`/partner/projects/${p.id}`)

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
            const pending = p.changeRequests.find(r => r.status === 'pending' && (r.type === 'fencing' || r.type === 'boundary'))
            const count = (p.fundedTrees ?? 0) + (p.treesPlanted ?? 0)
            const pct = p.totalTrees ? Math.min(100, Math.round((count / p.totalTrees) * 100)) : 0
            return (
              <div key={p.id} className="pl-card" style={{ padding: 0, overflow: 'hidden', borderTop: `5px solid ${color}` }}>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* 1. Map — the land and its fencing */}
                  <FencingMapBlock boundary={p.boundary} trees={p.treePoints} />

                  {/* 2. A fencing update is waiting for approval */}
                  {pending && (
                    <div style={{ fontSize: 12, background: '#FFF4E0', color: '#8B5A00', borderRadius: 8, padding: '6px 10px' }}>
                      ⏳ Fencing update waiting for approval · asked {formatDate(pending.createdAt)}
                    </div>
                  )}

                  {/* 3. Project details */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 }}>
                      <button type="button" onClick={() => open(p)} title="Open the project page" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', fontWeight: 700, fontSize: 15.5, color: '#112121', lineHeight: 1.3 }}>
                        {p.name}
                      </button>
                      <span className={`pl-badge pl-badge--${p.active ? 'approved' : 'pending'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9AA79C', marginBottom: 12 }}>
                      📍 {p.location} · <span style={{ textTransform: 'capitalize' }}>{p.element}</span>{p.category ? ` · ${p.category}` : ''}
                    </div>

                    <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7B6E' }}>
                      <span>{count.toLocaleString()} / {(p.totalTrees ?? 0).toLocaleString()} trees</span>
                      <span style={{ fontWeight: 700, color: '#2B5341' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, background: '#EFEAE4', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
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

                    {p.approvedAt && (
                      <div style={{ marginTop: 10, fontSize: 11, color: '#9AA79C' }}>
                        Approved {formatDate(p.approvedAt)}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )
          })}
        </div>
        <Pagination {...pg} noun="project" />
        </>
      )}

    </PartnerLayout>
  )
}

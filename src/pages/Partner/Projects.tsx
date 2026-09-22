import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface PartnerProject {
  id:               string
  name:             string
  element:          string
  category:         string | null
  location:         string
  description:      string | null
  totalTrees:       number
  fundedTrees:      number
  progressPct:      number
  tco2e:            number
  evidenceCount:    number
  fundersCount:     number
  status:           string
  active:           boolean
  coverImage:       string | null
  lastEvidenceDate: string | null
  approvedAt:       string | null
}

export default function Projects() {
  const { session } = useAuth()
  const navigate     = useNavigate()

  const [projects, setProjects] = useState<PartnerProject[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch(`${API}/api/partner/projects`, {
      headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [session])

  return (
    <PartnerLayout title="Projects" subtitle="Your approved, active projects and their live progress">

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/projects/new')}>
          + New project
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} className="pl-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 15.5, color: '#112121', lineHeight: 1.3 }}>{p.name}</div>
                <span className={`pl-badge pl-badge--${p.active ? 'approved' : 'pending'}`}>{p.active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#9AA79C', marginBottom: 14 }}>
                📍 {p.location} · <span style={{ textTransform: 'capitalize' }}>{p.element}</span>{p.category ? ` · ${p.category}` : ''}
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7B6E' }}>
                <span>{p.fundedTrees.toLocaleString()} / {p.totalTrees.toLocaleString()} trees funded</span>
                <span style={{ fontWeight: 700, color: '#2B5341' }}>{p.progressPct}%</span>
              </div>
              <div style={{ height: 8, background: '#EFEAE4', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ height: '100%', width: `${p.progressPct}%`, background: '#2B5341', borderRadius: 999 }} />
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
                <div style={{ marginTop: 14, fontSize: 11, color: '#9AA79C' }}>
                  Approved {new Date(p.approvedAt).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PartnerLayout>
  )
}

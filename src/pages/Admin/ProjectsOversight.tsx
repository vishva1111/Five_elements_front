import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { useAuth } from '../../contexts/AuthContext'
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

  const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }

  useEffect(() => {
    fetch(`${API}/api/admin/projects`, { headers })
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

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
          <table className="ad-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Element</th>
                <th>Location</th>
                <th>Partner</th>
                <th>Trees</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                    <div style={{ color: '#9AA79C', fontSize: 11.5 }}>by {p.submittedBy}</div>
                  </td>
                  <td style={{ fontSize: 18 }} title={p.element}>{ELEMENT_ICONS[p.element] || '🌿'}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{p.location}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{p.partnerName || 'Self'}</td>
                  <td style={{ fontWeight: 600 }}>{p.treeCount?.toLocaleString() || '—'}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{p.submittedAt}</td>
                  <td><span className={`ad-badge ad-badge--${p.status === 'pending_review' ? 'pending' : p.status}`}>{p.status.replace('_', ' ')}</span></td>
                  <td>
                    {p.status === 'pending_review' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" disabled={acting === p.id} onClick={() => approveProject(p.id)}>
                          {acting === p.id ? '…' : '✅'}
                        </button>
                        <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" disabled={acting === p.id} onClick={() => rejectProject(p.id)}>
                          {acting === p.id ? '…' : '❌'}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => navigate(`/projects/${p.id}`)}>
                        View →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  )
}
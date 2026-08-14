import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

interface Submission {
  id:          string
  title:       string
  element:     string
  status:      string
  submittedAt: string
  updatedAt:   string
  reviewNotes?: string
  evidenceCount: number
}

const STATUS_ORDER = ['pending_review', 'in_review', 'needs_more_info', 'approved', 'rejected']

function statusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function badgeClass(s: string) {
  if (s === 'approved')        return 'approved'
  if (s === 'rejected')        return 'rejected'
  if (s === 'in_review')       return 'info'
  if (s === 'needs_more_info') return 'progress'
  return 'pending'
}

export default function SubmissionTracker() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/submissions`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false))
  }, [session])

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  return (
    <PartnerLayout title="Submission tracker">

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', ...STATUS_ORDER].map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 9999, fontSize: 12.5, fontWeight: filter === f ? 700 : 500,
              border: `1.5px solid ${filter === f ? '#2B5341' : '#D8CFC6'}`,
              background: filter === f ? '#EAF3DE' : '#fff',
              color: filter === f ? '#2B5341' : '#6B7B6E',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {f === 'all' ? 'All' : statusLabel(f)}
          </button>
        ))}
        <button type="button" className="pl-btn pl-btn--primary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/partner/projects/new')}>
          + New project
        </button>
      </div>

      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 48 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">📋</div>
            <div className="pl-empty__title">No submissions yet</div>
            <div className="pl-empty__sub">Register a project and submit it for admin review to see it here.</div>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/projects/new')}>Register project</button>
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Element</th>
                <th>Evidence</th>
                <th>Submitted</th>
                <th>Updated</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.title}</td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5, textTransform: 'capitalize' }}>{s.element}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{s.evidenceCount} file{s.evidenceCount !== 1 ? 's' : ''}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{s.submittedAt}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{s.updatedAt}</td>
                  <td>
                    <span className={`pl-badge pl-badge--${badgeClass(s.status)}`}>{statusLabel(s.status)}</span>
                  </td>
                  <td>
                    {s.status === 'needs_more_info' && (
                      <button type="button" className="pl-btn pl-btn--orange" style={{ height: 28, fontSize: 11.5, padding: '0 10px' }} onClick={() => navigate('/partner/evidence')}>
                        Add evidence
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review notes for rejected/needs_more_info */}
      {filtered.some(s => s.reviewNotes) && (
        <div className="pl-card" style={{ marginTop: 16 }}>
          <div className="pl-card__title">Review notes</div>
          {filtered.filter(s => s.reviewNotes).map(s => (
            <div key={s.id} style={{ marginBottom: 12, padding: '10px 14px', background: '#F5F0EC', borderRadius: 9 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121', marginBottom: 4 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.5 }}>{s.reviewNotes}</div>
            </div>
          ))}
        </div>
      )}
    </PartnerLayout>
  )
}
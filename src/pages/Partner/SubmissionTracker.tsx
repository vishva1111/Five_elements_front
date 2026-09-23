import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import './Partner.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

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

interface SubmissionDetail {
  id:              string
  title:           string
  element:         string
  category:        string | null
  projectType:     string | null
  description:     string | null
  location:        string | null
  startDate:       string | null
  endDate:         string | null
  treeCount:       number | null
  status:          string
  submittedAt:     string
  reviewedAt:       string | null
  reviewNotes:      string | null
  partnerReviewStatus: string | null
  partnerReviewNotes:  string | null
  moreInfoRequest:  string | null
}

interface EvidenceFileDetail {
  id:         string
  fileName:   string
  fileType:   string
  fileSize:   string
  uploadedAt: string
  status:     string
}

interface PendingTask {
  id:            string
  task_code:     string | null
  name:          string
  project_name:  string
  assignee_name: string
  target_count:  number
  location:      string | null
  priority:      string
  status:        string
  completed_at:  string | null
  created_at:    string
  tree_id:       string | null
  review_notes:  string | null
  photo_url:     string | null
  tree_species:  string | null
  tree_health:   string | null
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

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

export default function SubmissionTracker() {
  const { session } = useAuth()
  const navigate    = useNavigate()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState('all')

  // Detail modal state — opens in place instead of navigating anywhere
  const [detailId,      setDetailId]      = useState<string | null>(null)
  const [detail,        setDetail]        = useState<SubmissionDetail | null>(null)
  const [detailFiles,   setDetailFiles]   = useState<EvidenceFileDetail[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError,   setDetailError]   = useState<string | null>(null)

  // Task review state
  const [activeTab,      setActiveTab]      = useState<'submissions' | 'tasks'>('submissions')
  const [pendingTasks,   setPendingTasks]   = useState<PendingTask[]>([])
  const [tasksLoading,   setTasksLoading]   = useState(false)
  const [reviewingId,    setReviewingId]    = useState<string | null>(null)
  const [reviewNotes,    setReviewNotes]    = useState('')
  const [reviewAction,   setReviewAction]   = useState<'approve' | 'reject' | null>(null)
  const [submittingReview, setSubmittingReview] = useState(false)

  const token = session?.access_token

  useEffect(() => {
    fetch(
      `${API}/api/partner/submissions`,
      { headers: { Authorization: `Bearer ${token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setSubmissions(d.submissions || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false))
  }, [token])

  const openSubmission = useCallback(async (id: string) => {
    setDetailId(id)
    setDetail(null)
    setDetailFiles([])
    setDetailError(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`${API}/api/partner/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load project')
      setDetail(json.submission)
      setDetailFiles(json.evidenceFiles || [])
    } catch (e: any) {
      setDetailError(e.message || 'Failed to load project')
    } finally {
      setDetailLoading(false)
    }
  }, [token])

  const closeSubmission = () => {
    setDetailId(null)
    setDetail(null)
    setDetailFiles([])
    setDetailError(null)
  }

  const loadPendingTasks = useCallback(async () => {
    if (!token) return
    setTasksLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/tasks/pending-review`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setPendingTasks(json.tasks || [])
    } catch {
      setPendingTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (activeTab === 'tasks') loadPendingTasks()
  }, [activeTab, loadPendingTasks])

  const handleReview = async (taskId: string, action: 'approve' | 'reject') => {
    setSubmittingReview(true)
    try {
      const res = await fetch(`${API}/api/admin/tasks/${taskId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ review_notes: reviewNotes }),
      })
      if (!res.ok) throw new Error('Failed')
      setReviewingId(null)
      setReviewNotes('')
      setReviewAction(null)
      loadPendingTasks()
    } catch {
      alert('Failed to submit review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  return (
    <PartnerLayout title="Submission tracker">

      {/* Top-level tabs: Submissions | Task Review */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e8f0e8' }}>
        {[
          { key: 'submissions', label: '📋 Project Submissions' },
          { key: 'tasks',       label: `✅ Task Review${pendingTasks.length > 0 && activeTab !== 'tasks' ? ` (${pendingTasks.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'submissions' | 'tasks')}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #2B5341' : '3px solid transparent',
              background: 'none',
              color: activeTab === tab.key ? '#2B5341' : '#6B7B6E',
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Submissions Tab ── */}
      {activeTab === 'submissions' && (
        <>
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
                    <tr
                      key={s.id}
                      onClick={() => openSubmission(s.id)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view project details"
                    >
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
                          <button
                            type="button"
                            className="pl-btn pl-btn--orange"
                            style={{ height: 28, fontSize: 11.5, padding: '0 10px' }}
                            onClick={e => { e.stopPropagation(); navigate('/partner/evidence') }}
                          >
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
        </>
      )}

      {/* ── Task Review Tab ── */}
      {activeTab === 'tasks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#6B7B6E' }}>
              Tasks completed by field users — approve or reject each one.
            </div>
            <button type="button" className="pl-btn" style={{ fontSize: 12 }} onClick={loadPendingTasks}>
              ↻ Refresh
            </button>
          </div>

          {tasksLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 72 }} />)}
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="pl-card">
              <div className="pl-empty">
                <div className="pl-empty__icon">✅</div>
                <div className="pl-empty__title">No tasks pending review</div>
                <div className="pl-empty__sub">All completed tasks have been reviewed. Check back later.</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingTasks.map(task => (
                <div key={task.id} className="pl-card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    {/* Photo captured in the app */}
                    {task.photo_url && (
                      <a href={task.photo_url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                        <img
                          src={task.photo_url}
                          alt="Field capture"
                          style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid #e8f0e8', display: 'block' }}
                        />
                      </a>
                    )}
                    <div style={{ flex: 1 }}>
                      {/* Task code + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 11, background: '#f0f7f0',
                          color: '#1a5c2a', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                        }}>
                          {task.task_code || task.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{
                          background: (PRIORITY_COLORS[task.priority] || '#888') + '18',
                          color: PRIORITY_COLORS[task.priority] || '#888',
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                          textTransform: 'capitalize',
                        }}>
                          {task.priority}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#112121', marginBottom: 4 }}>{task.name}</div>
                      <div style={{ fontSize: 12, color: '#6B7B6E', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span>👤 {task.assignee_name}</span>
                        {task.tree_species && <span>🌳 {task.tree_species}{task.tree_health ? ` · ${task.tree_health}` : ''}</span>}
                        {task.project_name && <span>🌿 {task.project_name}</span>}
                        {task.location && <span>📍 {task.location}</span>}
                        {task.completed_at && (
                          <span>✅ Completed {new Date(task.completed_at).toLocaleDateString('en-GB')}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {reviewingId !== task.id ? (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => { setReviewingId(task.id); setReviewAction('approve'); setReviewNotes('') }}
                          style={{
                            background: '#22c55e', color: '#fff', border: 'none',
                            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReviewingId(task.id); setReviewAction('reject'); setReviewNotes('') }}
                          style={{
                            background: '#ef4444', color: '#fff', border: 'none',
                            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => { setReviewingId(null); setReviewAction(null) }}
                          style={{
                            background: '#f5f5f5', color: '#555', border: '1px solid #ddd',
                            borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline review form */}
                  {reviewingId === task.id && (
                    <div style={{ marginTop: 14, padding: '14px 16px', background: reviewAction === 'approve' ? '#f0fdf4' : '#fef2f2', borderRadius: 10, border: `1px solid ${reviewAction === 'approve' ? '#bbf7d0' : '#fecaca'}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: reviewAction === 'approve' ? '#15803d' : '#dc2626', marginBottom: 8 }}>
                        {reviewAction === 'approve' ? '✓ Approving task' : '✕ Rejecting task'} — add notes (optional)
                      </div>
                      <textarea
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        placeholder={reviewAction === 'approve' ? 'Well done! (optional)' : 'Reason for rejection…'}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1.5px solid #e0e0e0', fontSize: 13, resize: 'vertical',
                          boxSizing: 'border-box', fontFamily: 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          disabled={submittingReview}
                          onClick={() => handleReview(task.id, reviewAction!)}
                          style={{
                            background: reviewAction === 'approve' ? '#22c55e' : '#ef4444',
                            color: '#fff', border: 'none', borderRadius: 8,
                            padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {submittingReview ? 'Submitting…' : `Confirm ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Project detail modal — opens in place, no navigation ── */}
      {detailId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={closeSubmission}
        >
          <div
            className="pl-card"
            style={{ width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', padding: 28 }}
            onClick={e => e.stopPropagation()}
          >
            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="pl-skel" style={{ height: 24 }} />)}
              </div>
            ) : detailError ? (
              <div>
                <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: 12 }}>{detailError}</div>
                <button type="button" className="pl-btn" onClick={closeSubmission}>Close</button>
              </div>
            ) : detail ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#112121' }}>{detail.title}</h2>
                  <button type="button" onClick={closeSubmission} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888', lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ marginBottom: 18 }}>
                  <span className={`pl-badge pl-badge--${badgeClass(detail.status)}`}>{statusLabel(detail.status)}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
                  <DetailField label="Element" value={detail.element} />
                  <DetailField label="Category" value={detail.category} />
                  <DetailField label="Location" value={detail.location} />
                  <DetailField label="Target tree count" value={detail.treeCount != null ? String(detail.treeCount) : null} />
                  <DetailField label="Start date" value={detail.startDate ? new Date(detail.startDate).toLocaleDateString('en-GB') : null} />
                  <DetailField label="End date" value={detail.endDate ? new Date(detail.endDate).toLocaleDateString('en-GB') : null} />
                  <DetailField label="Submitted" value={new Date(detail.submittedAt).toLocaleDateString('en-GB')} />
                  <DetailField label="Reviewed" value={detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleDateString('en-GB') : 'Not yet reviewed'} />
                </div>

                {detail.description && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Description</div>
                    <div style={{ fontSize: 13.5, color: '#334', lineHeight: 1.6 }}>{detail.description}</div>
                  </div>
                )}

                {detail.reviewNotes && (
                  <div style={{ marginBottom: 18, padding: '10px 14px', background: '#F5F0EC', borderRadius: 9 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Admin review notes</div>
                    <div style={{ fontSize: 13, color: '#6B7B6E', lineHeight: 1.5 }}>{detail.reviewNotes}</div>
                  </div>
                )}

                {detail.moreInfoRequest && (
                  <div style={{ marginBottom: 18, padding: '10px 14px', background: '#FFF7E8', borderRadius: 9 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>More info requested</div>
                    <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>{detail.moreInfoRequest}</div>
                  </div>
                )}

                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                    Evidence ({detailFiles.length})
                  </div>
                  {detailFiles.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: '#9AA79C' }}>No evidence files uploaded yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {detailFiles.map(f => (
                        <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 10px', background: '#F7F5F2', borderRadius: 7 }}>
                          <span style={{ color: '#334' }}>{f.fileName}</span>
                          <span style={{ color: '#9AA79C' }}>{f.fileSize}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {detail.status === 'needs_more_info' && (
                  <button
                    type="button"
                    className="pl-btn pl-btn--orange"
                    style={{ marginTop: 18 }}
                    onClick={() => { closeSubmission(); navigate('/partner/evidence') }}
                  >
                    Add evidence
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </PartnerLayout>
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#112121', fontWeight: 600, textTransform: label === 'Element' || label === 'Category' ? 'capitalize' : 'none' }}>
        {value || '—'}
      </div>
    </div>
  )
}
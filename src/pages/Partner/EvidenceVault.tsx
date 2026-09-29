import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import './Partner.css'

interface EvidenceItem {
  id:          string
  fileName:    string
  fileType:    string
  fileSize:    string
  project:     string
  uploadedAt:  string
  status:      'pending' | 'in_review' | 'approved' | 'rejected'
  submissionId?: string
  /** Signed URL from the private evidence bucket; short-lived. */
  fileUrl?:    string | null
}

interface SubmissionOption { id: string; title: string }

function badgeClass(s: string) {
  if (s === 'approved')  return 'approved'
  if (s === 'rejected')  return 'rejected'
  if (s === 'in_review') return 'info'
  return 'pending'
}

function fileIcon(type: string) {
  if (type.startsWith('image/'))  return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('video/'))  return '🎥'
  if (type.includes('gpx') || type.includes('kml')) return '📍'
  return '📎'
}

export default function EvidenceVault() {
  const { session } = useAuth()
  const navigate    = useNavigate()
  const fileRef     = useRef<HTMLInputElement>(null)

  const [items,     setItems]     = useState<EvidenceItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [error,     setError]     = useState<string | null>(null)
  // Grid is the default: status must be readable without opening anything
  // (P6-02). The table stays available for dense scanning.
  const [view,      setView]      = useState<'grid' | 'list'>('grid')
  const [openItem,  setOpenItem]  = useState<EvidenceItem | null>(null)

  // Evidence must hang off a submission — the upload endpoint verifies ownership
  // by submission, so the partner picks which project the files belong to.
  const [submissions,  setSubmissions]  = useState<SubmissionOption[]>([])
  const [submissionId, setSubmissionId] = useState('')

  const token = session?.access_token

  const loadEvidence = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/partner/evidence`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load evidence')
      setItems(d.files || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load evidence')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadEvidence() }, [loadEvidence])

  useEffect(() => {
    fetch(`${API}/api/partner/submissions`, { headers: { Authorization: `Bearer ${token || ''}` } })
      .then(r => r.json())
      .then(d => setSubmissions((d.submissions || []).map((x: { id: string; title: string }) => ({ id: x.id, title: x.title }))))
      .catch(() => setSubmissions([]))
  }, [token])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    if (!submissionId) {
      setError('Choose which project these files belong to before uploading.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('submissionId', submissionId)
      Array.from(files).forEach(f => form.append('files', f))

      const res = await fetch(`${API}/api/submit-project/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || ''}` },
        body: form,
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Upload failed')
      await loadEvidence()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <PartnerLayout title="Evidence vault">

      {error && (
        <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          className="sp-input"
          style={{ maxWidth: 260, height: 38 }}
          value={submissionId}
          onChange={e => { setSubmissionId(e.target.value); setError(null) }}
          aria-label="Project this evidence belongs to"
        >
          <option value="">Choose a project…</option>
          {submissions.map(sub => <option key={sub.id} value={sub.id}>{sub.title}</option>)}
        </select>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => fileRef.current?.click()} disabled={uploading || !submissionId}>
          {uploading ? 'Uploading…' : '+ Upload evidence'}
        </button>
        <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.kml,.gpx" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
            {(['grid', 'list'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12.5,
                  fontWeight: view === v ? 700 : 500,
                  border: `1.5px solid ${view === v ? '#2B5341' : '#D8CFC6'}`,
                  background: view === v ? '#EAF3DE' : '#fff',
                  color: view === v ? '#2B5341' : '#6B7B6E',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {v === 'grid' ? '▦ Grid' : '☰ List'}
              </button>
            ))}
          </div>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
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
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="pl-card">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="pl-skel" style={{ height: 40 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">📁</div>
            <div className="pl-empty__title">No evidence files</div>
            <div className="pl-empty__sub">Upload geo-tagged photos, GPS tracks, PDFs, or video to support your project submissions.</div>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => fileRef.current?.click()} disabled={!submissionId}>
              {submissionId ? 'Upload evidence' : 'Choose a project first'}
            </button>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            {filtered.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setOpenItem(item)}
                style={{
                  textAlign: 'left', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                  background: '#fff', border: '1px solid #EDE6DF', borderRadius: 12, overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative', height: 120, background: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.fileType?.startsWith('image/') && item.fileUrl ? (
                    <img src={item.fileUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 34 }}>{fileIcon(item.fileType)}</span>
                  )}
                  {/* Corner status badge — readable at grid scale (P6-02) */}
                  <span
                    className={`pl-badge pl-badge--${badgeClass(item.status)}`}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.fileName}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#9AA79C', marginTop: 3 }}>{item.project}</div>
                  <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 2 }}>{item.uploadedAt} · {item.fileSize}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <table className="pl-table">
            <thead>
              <tr>
                <th>File</th>
                <th>Project</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <span style={{ marginRight: 6 }}>{fileIcon(item.fileType)}</span>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{item.fileName}</span>
                  </td>
                  <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{item.project}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{item.fileSize}</td>
                  <td style={{ color: '#9AA79C', fontSize: 12 }}>{item.uploadedAt}</td>
                  <td><span className={`pl-badge pl-badge--${badgeClass(item.status)}`}>{item.status.replace('_', ' ')}</span></td>
                  <td style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {item.submissionId && (
                      <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 28, fontSize: 11.5, padding: '0 10px' }} onClick={() => navigate(`/partner/submissions`)}>
                        View
                      </button>
                    )}
                    {item.status === 'rejected' && (
                      <button
                        type="button"
                        className="pl-btn pl-btn--primary"
                        style={{ height: 28, fontSize: 11.5, padding: '0 10px', background: '#e53e3e', borderColor: '#e53e3e' }}
                        onClick={() => fileRef.current?.click()}
                        title="Upload replacement evidence"
                      >
                        Re-upload
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer. Evidence is read-only after capture — corrections are
          new captures, never edits (P6-04). */}
      {openItem && (
        <div
          onClick={() => setOpenItem(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(17,33,33,0.45)',
            display: 'flex', justifyContent: 'flex-end', zIndex: 60,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(440px, 100%)', background: '#fff', height: '100%',
              padding: 24, overflowY: 'auto', boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#112121', lineHeight: 1.3 }}>
                {openItem.fileName}
              </h2>
              <button
                type="button"
                onClick={() => setOpenItem(null)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9AA79C' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <span className={`pl-badge pl-badge--${badgeClass(openItem.status)}`}>
                {openItem.status.replace('_', ' ')}
              </span>
            </div>

            {openItem.fileType?.startsWith('image/') && openItem.fileUrl && (
              <img
                src={openItem.fileUrl}
                alt=""
                style={{ width: '100%', borderRadius: 10, marginTop: 16, border: '1px solid #EDE6DF' }}
              />
            )}

            <dl style={{ margin: '18px 0 0', display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 10, fontSize: 13 }}>
              <dt style={{ color: '#9AA79C' }}>Project</dt>
              <dd style={{ margin: 0, color: '#112121' }}>{openItem.project}</dd>
              <dt style={{ color: '#9AA79C' }}>Uploaded</dt>
              <dd style={{ margin: 0, color: '#112121' }}>{openItem.uploadedAt}</dd>
              <dt style={{ color: '#9AA79C' }}>Size</dt>
              <dd style={{ margin: 0, color: '#112121' }}>{openItem.fileSize}</dd>
              <dt style={{ color: '#9AA79C' }}>Type</dt>
              <dd style={{ margin: 0, color: '#112121' }}>{openItem.fileType || '—'}</dd>
            </dl>

            {openItem.fileUrl && (
              <a
                href={openItem.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="pl-btn pl-btn--ghost"
                style={{ marginTop: 18, display: 'inline-flex' }}
              >
                Open original ↗
              </a>
            )}

            <div style={{ marginTop: 20, background: '#F5F0EC', borderRadius: 9, padding: '11px 14px', fontSize: 12, color: '#6B7B6E', lineHeight: 1.6 }}>
              This record is read-only. If something's wrong, log a new capture in the field app —
              corrections are new captures, never edits.
            </div>
          </div>
        </div>
      )}
    </PartnerLayout>
  )
}
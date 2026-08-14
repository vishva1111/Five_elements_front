import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
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

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/partner/evidence`,
      { headers: { Authorization: `Bearer ${session?.access_token || ''}` } }
    )
      .then(r => r.json())
      .then(d => setItems(d.files || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [session])

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    // In production: upload to Supabase Storage, then POST metadata to backend
    await new Promise(r => setTimeout(r, 1000))
    const newItems: EvidenceItem[] = Array.from(files).map(f => ({
      id:         `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName:   f.name,
      fileType:   f.type,
      fileSize:   f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      project:    'Unassigned',
      uploadedAt: 'Just now',
      status:     'pending',
    }))
    setItems(prev => [...newItems, ...prev])
    setUploading(false)
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  return (
    <PartnerLayout title="Evidence vault">

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button type="button" className="pl-btn pl-btn--primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : '+ Upload evidence'}
        </button>
        <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.mp4,.mov,.kml,.gpx" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files)} />

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
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
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => fileRef.current?.click()}>Upload evidence</button>
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
                  <td><span className={`pl-badge pl-badge--${item.status}`}>{item.status}</span></td>
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
    </PartnerLayout>
  )
}
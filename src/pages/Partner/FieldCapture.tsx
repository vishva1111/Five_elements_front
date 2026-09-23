import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { loadQueue, addEntry, CaptureEntry, fileToDataUrl } from '../../services/fieldCaptureQueue'
import './Partner.css'
import '../SubmitProject/SubmitProject.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

interface SubmissionOption { id: string; title: string }

export default function FieldCapture() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [entries, setEntries] = useState<CaptureEntry[]>([])
  const [submissions, setSubmissions] = useState<SubmissionOption[]>([])
  const [submissionId, setSubmissionId] = useState('')

  const [lat,     setLat]     = useState('')
  const [lng,     setLng]     = useState('')
  const [notes,   setNotes]   = useState('')
  const [photo,   setPhoto]   = useState<File | null>(null)
  const [locating, setLocating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEntries(loadQueue())
  }, [])

  useEffect(() => {
    const token = session?.access_token
    if (!token) return
    fetch(`${API}/api/partner/submissions`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSubmissions((d.submissions || []).map((s: any) => ({ id: s.id, title: s.title }))))
      .catch(() => setSubmissions([]))
  }, [session])

  function getLocation() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  async function addCapturePoint() {
    if (!lat || !lng || !submissionId) return
    setSaving(true)
    try {
      const photoDataUrl = photo ? await fileToDataUrl(photo) : null
      const submission = submissions.find(s => s.id === submissionId)
      const entry: CaptureEntry = {
        id:        `${Date.now()}`,
        lat, lng, notes,
        photoName: photo?.name || '',
        photoDataUrl,
        submissionId,
        submissionTitle: submission?.title || null,
        timestamp: new Date().toISOString(),
        status:    'queued',
      }
      const updated = addEntry(entry)
      setEntries(updated)
      setLat(''); setLng(''); setNotes(''); setPhoto(null)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setSaving(false)
    }
  }

  const pendingCount = entries.filter(e => e.status !== 'synced').length

  return (
    <PartnerLayout title="Field capture">
      <div style={{ maxWidth: 640 }}>

        {/* Sync queue badge */}
        {pendingCount > 0 && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{pendingCount}</strong> capture{pendingCount > 1 ? 's' : ''} saved on this device, waiting to sync</span>
            <button type="button" className="pl-btn pl-btn--orange" style={{ height: 32, fontSize: 12 }} onClick={() => navigate('/partner/sync')}>
              Go to sync queue
            </button>
          </div>
        )}

        {/* Capture form */}
        <div className="pl-card" style={{ marginBottom: 20 }}>
          <div className="pl-card__title">New capture point</div>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="fc-sub">Project submission *</label>
            <select id="fc-sub" className="sp-input" value={submissionId} onChange={e => setSubmissionId(e.target.value)}>
              <option value="">Select a submission…</option>
              {submissions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            {submissions.length === 0 && (
              <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 4 }}>
                No submissions yet — <a href="/partner/projects/new">register a project</a> first.
              </div>
            )}
          </div>

          <div className="sp-grid-2" style={{ marginBottom: 14 }}>
            <div className="sp-field">
              <label className="sp-label" htmlFor="fc-lat">Latitude</label>
              <input id="fc-lat" type="text" className="sp-input" placeholder="e.g. 18.520430" value={lat} onChange={e => setLat(e.target.value)} />
            </div>
            <div className="sp-field">
              <label className="sp-label" htmlFor="fc-lng">Longitude</label>
              <input id="fc-lng" type="text" className="sp-input" placeholder="e.g. 73.856744" value={lng} onChange={e => setLng(e.target.value)} />
            </div>
          </div>

          <button type="button" className="pl-btn pl-btn--ghost" style={{ marginBottom: 14, fontSize: 12.5 }} onClick={getLocation} disabled={locating}>
            {locating ? 'Getting location…' : '📍 Use my current location'}
          </button>

          <div className="sp-field" style={{ marginBottom: 14 }}>
            <label className="sp-label" htmlFor="fc-notes">Field notes</label>
            <textarea id="fc-notes" className="sp-textarea" rows={2} placeholder="Species, count, condition, observations…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="sp-field" style={{ marginBottom: 16 }}>
            <label className="sp-label">Photo</label>
            <button type="button" className="pl-btn pl-btn--ghost" style={{ fontSize: 12.5 }} onClick={() => fileRef.current?.click()}>
              📷 {photo ? photo.name : 'Attach photo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => setPhoto(e.target.files?.[0] || null)} />
          </div>

          <button type="button" className="pl-btn pl-btn--primary" onClick={addCapturePoint} disabled={!lat || !lng || !submissionId || saving}>
            {saving ? 'Saving…' : '+ Add capture point'}
          </button>
          <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 8 }}>
            Saved to this device — works offline. Sync to upload to the evidence vault when you're back online.
          </div>
        </div>

        {/* Capture list */}
        {entries.length > 0 && (
          <div className="pl-card">
            <div className="pl-card__title">Captured points ({entries.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entries.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '0.5px solid #F0EDE8' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121', marginBottom: 2 }}>
                      📍 {e.lat}, {e.lng}
                    </div>
                    {e.submissionTitle && <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>🌿 {e.submissionTitle}</div>}
                    {e.notes && <div style={{ fontSize: 12, color: '#6B7B6E', marginBottom: 2 }}>{e.notes}</div>}
                    {e.photoName && <div style={{ fontSize: 11.5, color: '#9AA79C' }}>📷 {e.photoName}</div>}
                    <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 2 }}>{new Date(e.timestamp).toLocaleString('en-IN')}</div>
                  </div>
                  <span className={`pl-badge pl-badge--${e.status === 'synced' ? 'approved' : e.status === 'failed' ? 'rejected' : 'pending'}`}>
                    {e.status === 'synced' ? 'Synced' : e.status === 'failed' ? 'Failed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {entries.length === 0 && (
          <div className="pl-empty">
            <div className="pl-empty__icon">📍</div>
            <div className="pl-empty__title">No captures yet</div>
            <div className="pl-empty__sub">Add GPS coordinates and photos from the field. They'll queue here until synced to the evidence vault.</div>
          </div>
        )}
      </div>
    </PartnerLayout>
  )
}

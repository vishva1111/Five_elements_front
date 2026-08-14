import React, { useState, useRef } from 'react'
import PartnerLayout from './PartnerLayout'
import './Partner.css'

interface CaptureEntry {
  id:        string
  lat:       string
  lng:       string
  notes:     string
  photoName: string
  timestamp: string
  synced:    boolean
}

export default function FieldCapture() {
  const [entries, setEntries] = useState<CaptureEntry[]>([])
  const [lat,     setLat]     = useState('')
  const [lng,     setLng]     = useState('')
  const [notes,   setNotes]   = useState('')
  const [photo,   setPhoto]   = useState<File | null>(null)
  const [locating, setLocating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  function addEntry() {
    if (!lat || !lng) return
    const entry: CaptureEntry = {
      id:        `${Date.now()}`,
      lat, lng, notes,
      photoName: photo?.name || '',
      timestamp: new Date().toLocaleString('en-IN'),
      synced:    false,
    }
    setEntries(prev => [entry, ...prev])
    setLat(''); setLng(''); setNotes(''); setPhoto(null)
  }

  function markSynced(id: string) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, synced: true } : e))
  }

  const pendingCount = entries.filter(e => !e.synced).length

  return (
    <PartnerLayout title="Field capture">
      <div style={{ maxWidth: 640 }}>

        {/* Sync queue badge */}
        {pendingCount > 0 && (
          <div style={{ background: '#FEF0E3', border: '0.5px solid #F5C27A', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#8B3A00', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{pendingCount}</strong> capture{pendingCount > 1 ? 's' : ''} pending sync</span>
            <button type="button" className="pl-btn pl-btn--orange" style={{ height: 32, fontSize: 12 }} onClick={() => entries.forEach(e => markSynced(e.id))}>
              Sync all
            </button>
          </div>
        )}

        {/* Capture form */}
        <div className="pl-card" style={{ marginBottom: 20 }}>
          <div className="pl-card__title">New capture point</div>

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

          <button type="button" className="pl-btn pl-btn--primary" onClick={addEntry} disabled={!lat || !lng}>
            + Add capture point
          </button>
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
                    {e.notes && <div style={{ fontSize: 12, color: '#6B7B6E', marginBottom: 2 }}>{e.notes}</div>}
                    {e.photoName && <div style={{ fontSize: 11.5, color: '#9AA79C' }}>📷 {e.photoName}</div>}
                    <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 2 }}>{e.timestamp}</div>
                  </div>
                  <span className={`pl-badge pl-badge--${e.synced ? 'approved' : 'pending'}`}>
                    {e.synced ? 'Synced' : 'Pending'}
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
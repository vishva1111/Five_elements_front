import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import { useAuth } from '../../contexts/AuthContext'
import { loadQueue, updateEntry, removeEntry, dataUrlToFile, CaptureEntry } from '../../services/fieldCaptureQueue'
import './Partner.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function SyncQueue() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CaptureEntry[]>([])
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setItems(loadQueue())
  }, [])

  const queued = items.filter(i => i.status !== 'synced')

  // Uploads one capture's photo (+ a small companion notes file, since evidence_files
  // has no gps/notes columns) to the real evidence-upload endpoint.
  async function syncOne(entry: CaptureEntry): Promise<{ ok: boolean; error?: string }> {
    const token = session?.access_token
    if (!token) return { ok: false, error: 'Not signed in' }
    if (!entry.submissionId) return { ok: false, error: 'No submission linked to this capture' }

    const form = new FormData()
    form.append('submissionId', entry.submissionId)

    if (entry.photoDataUrl) {
      form.append('files', dataUrlToFile(entry.photoDataUrl, entry.photoName || `capture-${entry.id}.jpg`))
    }
    const metaText = `GPS: ${entry.lat}, ${entry.lng}\nCaptured: ${entry.timestamp}\nNotes: ${entry.notes || '(none)'}`
    form.append('files', new File([metaText], `capture-${entry.id}-info.txt`, { type: 'text/plain' }))

    try {
      const res = await fetch(`${API}/api/submit-project/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const json = await res.json()
      if (!res.ok) return { ok: false, error: json.error || 'Upload failed' }
      return { ok: true }
    } catch (e: any) {
      return { ok: false, error: e.message || 'Network error' }
    }
  }

  async function syncAll() {
    setSyncing(true)
    for (const entry of queued) {
      setItems(updateEntry(entry.id, { status: 'syncing' }))
      const result = await syncOne(entry)
      if (result.ok) {
        setItems(removeEntry(entry.id))
      } else {
        setItems(updateEntry(entry.id, { status: 'failed', errorMessage: result.error }))
      }
    }
    setSyncing(false)
  }

  async function syncSingle(entry: CaptureEntry) {
    setItems(updateEntry(entry.id, { status: 'syncing' }))
    const result = await syncOne(entry)
    if (result.ok) {
      setItems(removeEntry(entry.id))
    } else {
      setItems(updateEntry(entry.id, { status: 'failed', errorMessage: result.error }))
    }
  }

  function discard(entry: CaptureEntry) {
    if (!window.confirm(`Discard this capture (${entry.lat}, ${entry.lng})? This cannot be undone.`)) return
    setItems(removeEntry(entry.id))
  }

  const failedCount = items.filter(i => i.status === 'failed').length

  return (
    <PartnerLayout title="Sync queue">
      <div style={{ maxWidth: 680 }}>

        {/* Summary */}
        <div className="pl-card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#6B7B6E' }}>
              {queued.length === 0
                ? 'Everything is synced.'
                : `${queued.length} capture${queued.length !== 1 ? 's' : ''} waiting to upload${failedCount > 0 ? ` (${failedCount} failed last attempt)` : ''}`}
            </div>
          </div>
          <button
            type="button"
            className="pl-btn pl-btn--primary"
            onClick={syncAll}
            disabled={syncing || queued.length === 0}
          >
            {syncing ? 'Syncing…' : `Sync all (${queued.length})`}
          </button>
        </div>

        {items.length === 0 ? (
          <div className="pl-empty">
            <div className="pl-empty__icon">✅</div>
            <div className="pl-empty__title">Nothing to sync</div>
            <div className="pl-empty__sub">Captures you add from Field Capture will show up here until they're uploaded.</div>
            <button type="button" className="pl-btn pl-btn--primary" onClick={() => navigate('/partner/field')}>Go to Field Capture</button>
          </div>
        ) : (
          <div className="pl-card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderBottom: '0.5px solid #F0EDE8' }}>
                  {e.photoDataUrl && (
                    <img src={e.photoDataUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#112121' }}>📍 {e.lat}, {e.lng}</div>
                    {e.submissionTitle && <div style={{ fontSize: 11.5, color: '#6B7B6E' }}>🌿 {e.submissionTitle}</div>}
                    {e.notes && <div style={{ fontSize: 12, color: '#6B7B6E' }}>{e.notes}</div>}
                    <div style={{ fontSize: 11, color: '#9AA79C', marginTop: 2 }}>{new Date(e.timestamp).toLocaleString('en-IN')}</div>
                    {e.status === 'failed' && e.errorMessage && (
                      <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠ {e.errorMessage}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    <span className={`pl-badge pl-badge--${e.status === 'failed' ? 'rejected' : e.status === 'syncing' ? 'progress' : 'pending'}`}>
                      {e.status === 'syncing' ? 'Syncing…' : e.status === 'failed' ? 'Failed' : 'Queued'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {e.status !== 'syncing' && (
                        <button type="button" onClick={() => syncSingle(e)} style={{ background: 'none', border: 'none', color: '#2B5341', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                          Retry
                        </button>
                      )}
                      {e.status !== 'syncing' && (
                        <button type="button" onClick={() => discard(e)} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                          Discard
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PartnerLayout>
  )
}

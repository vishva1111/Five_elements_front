import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PartnerLayout from './PartnerLayout'
import './Partner.css'

interface QueueItem {
  id:        string
  type:      'photo' | 'gps' | 'note'
  name:      string
  project:   string
  size:      string
  capturedAt: string
  status:    'queued' | 'syncing' | 'synced' | 'failed'
}

const DEMO_QUEUE: QueueItem[] = [
  { id: '1', type: 'photo', name: 'IMG_20260814_0832.jpg', project: 'Sahyadri Phase 2', size: '3.2 MB', capturedAt: 'Today 08:32', status: 'queued' },
  { id: '2', type: 'gps',   name: 'track_morning.gpx',    project: 'Sahyadri Phase 2', size: '12 KB',  capturedAt: 'Today 08:45', status: 'queued' },
  { id: '3', type: 'photo', name: 'IMG_20260814_0901.jpg', project: 'Sahyadri Phase 2', size: '2.8 MB', capturedAt: 'Today 09:01', status: 'synced' },
  { id: '4', type: 'note',  name: 'field_notes.txt',       project: 'Konkan Mangroves', size: '1 KB',   capturedAt: 'Yesterday',   status: 'failed' },
]

const typeIcon = (t: QueueItem['type']) => t === 'photo' ? '📷' : t === 'gps' ? '📍' : '📝'

export default function SyncQueue() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QueueItem[]>(DEMO_QUEUE)
  const [syncing, setSyncing] = useState(false)

  const queued = items.filter(i => i.status === 'queued' || i.status === 'failed')

  async function syncAll() {
    setSyncing(true)
    setItems(prev => prev.map(i => i.status !== 'synced' ? { ...i, status: 'syncing' } : i))
    await new Promise(r => setTimeout(r, 1800))
    setItems(prev => prev.map(i => ({ ...i, status: 'synced' })))
    setSyncing(false)
    navigate('/partner/evidence')
  }

  return (
    <PartnerLayout title="Sync queue">
      <div style={{ maxWidth: 680 }}>

        {/* Summary */}
        <div className="pl-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          <div className="pl-stat">
            <div className="pl-stat__num">{queued.length}</div>
            <div className="pl-stat__label">Pending sync</div>
          </div>
          <div className="pl-stat">
            <div className="pl-stat__num">{items.filter(i => i.status === 'synced').length}</div>
            <div className="pl-stat__label">Synced</div>
          </div>
          <div className="pl-stat">
            <div className="pl-stat__num">{items.filter(i => i.status === 'failed').length}</div>
            <div className="pl-stat__label">Failed</div>
          </div>
        </div>

        {queued.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" className="pl-btn pl-btn--primary" onClick={syncAll} disabled={syncing}>
              {syncing ? '⟳ Syncing…' : `↑ Sync ${queued.length} item${queued.length > 1 ? 's' : ''} to vault`}
            </button>
          </div>
        )}

        <div className="pl-card">
          <div className="pl-card__title">Queue ({items.length} items)</div>
          {items.length === 0 ? (
            <div className="pl-empty">
              <div className="pl-empty__icon">✅</div>
              <div className="pl-empty__title">Queue is empty</div>
              <div className="pl-empty__sub">All captures have been synced to the evidence vault.</div>
            </div>
          ) : (
            <table className="pl-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Project</th>
                  <th>Size</th>
                  <th>Captured</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ marginRight: 6 }}>{typeIcon(item.type)}</span>
                      <span style={{ fontWeight: 600, fontSize: 12.5 }}>{item.name}</span>
                    </td>
                    <td style={{ color: '#6B7B6E', fontSize: 12.5 }}>{item.project}</td>
                    <td style={{ color: '#9AA79C', fontSize: 12 }}>{item.size}</td>
                    <td style={{ color: '#9AA79C', fontSize: 12 }}>{item.capturedAt}</td>
                    <td>
                      <span className={`pl-badge pl-badge--${
                        item.status === 'synced'  ? 'approved' :
                        item.status === 'syncing' ? 'info' :
                        item.status === 'failed'  ? 'rejected' : 'pending'
                      }`}>
                        {item.status === 'syncing' ? '⟳ syncing' : item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PartnerLayout>
  )
}
/**
 * Review pop-up for a project change request: a colour change, a fencing
 * update (details and/or a new boundary), or the mobile app's boundary-unlock
 * request. Shows what it is now next to what is being asked for, then
 * Approve / Reject (a reason is required to reject).
 */
import React, { useEffect, useState } from 'react'
import { Palette, Fence, Map as MapIcon } from 'lucide-react'
import Modal from '../ui/Modal'
import TreeMap from '../map/TreeMap'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { DEFAULT_PROJECT_COLOR, formatArea, formatDate, formatLength, type Boundary, type Fencing } from '../tree/treeLabels'
import { FENCING_ROWS, fencingValue } from './FencingSummary'

export interface ChangeRequest {
  id: string
  source: 'project' | 'geofence'
  type: 'color' | 'fencing' | 'boundary'
  projectId: string
  projectName: string
  proposed: { color?: string; fencing?: Fencing; coordinates?: { latitude: number; longitude: number }[]; areaSqM?: number; perimeterM?: number }
  current: { color?: string | null; fencing?: Fencing | null; boundary?: Boundary | null }
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  requestedByName: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
  live?: { color: string | null; fencing: Fencing | null; boundary: Boundary | null }
}

export const CHANGE_LABEL: Record<string, string> = {
  color: 'Colour change',
  fencing: 'Fencing update',
  boundary: 'Boundary change (from the app)',
}

function Swatch({ color }: { color: string | null | undefined }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, background: color || DEFAULT_PROJECT_COLOR, border: '1px solid rgba(0,0,0,0.15)' }} />
      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{(color || DEFAULT_PROJECT_COLOR).toUpperCase()}</span>
      {!color && <span style={{ fontSize: 11.5, color: '#9AA79C' }}>(default)</span>}
    </span>
  )
}

export default function ChangeRequestReview({ request, onClose, onDone }: { request: ChangeRequest; onClose: () => void; onDone: () => void }) {
  const { session } = useAuth()
  const toast = useToast()
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(request.live || null)
  const pending = request.status === 'pending'

  // A list row may not carry the project as it is right now — fetch it so the comparison is true.
  useEffect(() => {
    if (request.live || !session?.access_token) return
    fetch(`${API}/api/admin/change-requests`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setLive((d.requests || []).find((r: ChangeRequest) => r.id === request.id)?.live || null))
      .catch(() => {})
  }, [request, session?.access_token])

  async function decide(decision: 'approve' | 'reject') {
    if (decision === 'reject' && !notes.trim()) { setError('Write why this is being rejected — the partner sees it.'); return }
    setBusy(decision)
    setError(null)
    try {
      const res = await fetch(`${API}/api/admin/change-requests/${request.source}/${request.id}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ review_notes: notes.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save the decision')
      toast.success(decision === 'approve' ? 'Approved — the change is live.' : 'Rejected — the partner has been told why.')
      onDone()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save the decision')
    } finally {
      setBusy(null)
    }
  }

  const p = request.proposed
  const nowColor = live?.color ?? request.current.color ?? null
  const nowFencing = live?.fencing ?? request.current.fencing ?? null
  const nowBoundary = live?.boundary ?? request.current.boundary ?? null
  const proposedRing = p.coordinates || []
  const changedRows = request.type === 'fencing' && p.fencing
    ? FENCING_ROWS.filter(r => (p.fencing as any)[r.key] !== undefined)
    : []

  return (
    <Modal
      icon={request.type === 'color' ? <Palette size={18} /> : request.type === 'fencing' ? <Fence size={18} /> : <MapIcon size={18} />}
      title={`${CHANGE_LABEL[request.type]} · ${request.projectName}`}
      subtitle={`Asked by ${request.requestedByName || 'a partner'} on ${formatDate(request.createdAt, true)}`}
      error={error}
      onClose={onClose}
      width={760}
      footer={pending ? (
        <>
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="ad-btn ad-btn--danger" disabled={!!busy} onClick={() => decide('reject')}>{busy === 'reject' ? 'Rejecting…' : 'Reject'}</button>
          <button type="button" className="ad-btn ad-btn--primary" disabled={!!busy} onClick={() => decide('approve')}>{busy === 'approve' ? 'Approving…' : '✓ Approve'}</button>
        </>
      ) : <button type="button" className="ad-btn ad-btn--ghost" onClick={onClose}>Close</button>}
    >
      {request.reason && (
        <div style={{ background: '#FAF8F4', border: '1px solid #EEE9E1', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9AA79C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Reason given</div>
          {request.reason}
        </div>
      )}

      {request.type === 'color' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 14, alignItems: 'center', padding: '8px 4px' }}>
          <div><div style={cap}>Now</div><Swatch color={nowColor} /></div>
          <div style={{ fontSize: 20, color: '#9AA79C' }}>→</div>
          <div><div style={cap}>Asked for</div><Swatch color={p.color} /></div>
        </div>
      )}

      {request.type === 'fencing' && (
        <>
          {changedRows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9AA79C', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <th style={th}>Fencing detail</th><th style={th}>Now</th><th style={th}>Asked for</th>
                </tr>
              </thead>
              <tbody>
                {changedRows.map(r => {
                  const was = fencingValue(nowFencing, r.key)
                  const will = fencingValue(p.fencing, r.key)
                  return (
                    <tr key={r.key} style={{ borderTop: '1px solid #F0ECE6' }}>
                      <td style={td}>{r.label}</td>
                      <td style={{ ...td, color: '#7A867C' }}>{was}</td>
                      <td style={{ ...td, fontWeight: 700, color: was !== will ? '#2B5341' : undefined }}>{will}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {proposedRing.length >= 3 && (
            <>
              <div style={cap}>New boundary · {formatArea(p.areaSqM)} · perimeter {formatLength(p.perimeterM)}{nowBoundary ? ` (now ${formatArea(nowBoundary.areaSqM)})` : ' (none drawn yet)'}</div>
              <TreeMap height={300} boundary={proposedRing} boundaryColor="#D97706" />
              {nowBoundary && nowBoundary.coordinates.length >= 3 && (
                <>
                  <div style={{ ...cap, marginTop: 12 }}>Current boundary</div>
                  <TreeMap height={220} boundary={nowBoundary.coordinates} boundaryColor="#2B5341" />
                </>
              )}
            </>
          )}
        </>
      )}

      {request.type === 'boundary' && (
        <div style={{ fontSize: 13, color: '#4A5A4E', lineHeight: 1.6 }}>
          The field team locked this project's land boundary in the app and now asks to redraw it.
          <br />Approving unlocks the boundary so it can be redrawn in the app. Nothing is deleted.
          {nowBoundary && nowBoundary.coordinates.length >= 3 && (
            <div style={{ marginTop: 12 }}>
              <div style={cap}>Current boundary · {formatArea(nowBoundary.areaSqM)}</div>
              <TreeMap height={260} boundary={nowBoundary.coordinates} boundaryColor="#2B5341" />
            </div>
          )}
        </div>
      )}

      {pending ? (
        <div style={{ marginTop: 16 }}>
          <label style={{ ...cap, display: 'block' }}>Note to the partner {request.type === 'color' || request.type === 'fencing' ? '(required to reject)' : '(required to reject)'}</label>
          <textarea className="ad-textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional when approving" style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1.5px solid #E0D9D0', fontFamily: 'inherit', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
      ) : (
        <div style={{ marginTop: 16, fontSize: 12.5, color: '#6B7B6E' }}>
          {request.status === 'approved' ? '✅ Approved' : '❌ Rejected'} by {request.reviewedByName || 'admin'} · {formatDate(request.reviewedAt, true)}
          {request.reviewNotes ? ` — “${request.reviewNotes}”` : ''}
        </div>
      )}
    </Modal>
  )
}

const cap: React.CSSProperties = { fontSize: 11, color: '#9AA79C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }
const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 700 }
const td: React.CSSProperties = { padding: '8px' }

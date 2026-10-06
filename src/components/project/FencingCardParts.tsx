/**
 * The land-fencing parts of a partner's project card:
 *   FencingMapBlock       — the land polygon (green when locked, amber otherwise) and its numbers
 *   FencingRequestBanner  — a field-app user's request to redraw the land, with Approve / Reject
 */
import React, { useState } from 'react'
import TreeMap from '../map/TreeMap'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import { formatArea, formatLength, formatDate, type Boundary } from '../tree/treeLabels'

export const LOCKED_GREEN = '#2E7D32'
export const UNLOCKED_AMBER = '#F59E0B'

/** The slice of a change request these parts need (the partner/projects list returns more). */
export interface BoundaryRequest {
  id: string
  source?: string
  type: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string | null
  requestedByName?: string | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}

export const boundaryRequests = (list: { type: string }[] | undefined) =>
  ((list || []) as BoundaryRequest[]).filter(r => r.type === 'boundary')

export function FencingMapBlock({ boundary, height = 190, onOpen }: { boundary: Boundary | null | undefined; height?: number; onOpen?: () => void }) {
  const has = !!boundary && boundary.coordinates.length >= 3
  if (!has) {
    return (
      <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: '#F5F3EE', border: '1px dashed #D9D2C7', color: '#7A867C', fontSize: 13 }}>
        📍 Land fencing not done
      </div>
    )
  }
  const color = boundary!.locked ? LOCKED_GREEN : UNLOCKED_AMBER
  return (
    <div>
      <div style={{ position: 'relative', isolation: 'isolate' }}>
        <TreeMap height={height} boundary={boundary!.coordinates} boundaryColor={color} interactive={false} />
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Open the full map"
            title="Open the full map"
            style={{ position: 'absolute', inset: 0, zIndex: 600, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 12 }}
          />
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#6B7B6E', lineHeight: 1.6 }}>
        <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 5, background: color, marginRight: 6 }} />
        <strong style={{ color: '#1C2B22' }}>{formatArea(boundary!.areaSqM)}</strong>
        {boundary!.areaSqM ? <span> · {Math.round(boundary!.areaSqM).toLocaleString('en-IN')} m²</span> : null}
        <span> · perimeter {formatLength(boundary!.perimeterM)}</span>
        <div>
          {boundary!.locked
            ? <>🔒 Locked{boundary!.lockedBy ? ` by ${boundary!.lockedBy}` : ''}{boundary!.lockedAt ? ` on ${formatDate(boundary!.lockedAt)}` : ''}</>
            : <>✏️ Open for redrawing in the app — waiting to be locked again</>}
        </div>
      </div>
    </div>
  )
}

export function FencingRequestBanner({ projectId, request, onDecided }: { projectId: string; request: BoundaryRequest; onDecided: () => void }) {
  const { session } = useAuth()
  const toast = useToast()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: 'approve' | 'reject') {
    if (decision === 'reject' && !note.trim()) return setError('Write a note for the field user.')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/partner/projects/${projectId}/fencing-requests/${request.id}/${decision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ review_notes: note }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not save the decision')
      toast.success(decision === 'approve' ? 'Approved — the field user can walk and lock the land again.' : 'Request rejected.')
      onDecided()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save the decision')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ borderRadius: 10, background: '#FFF4E0', border: '1px solid #F3D9A4', padding: '10px 12px' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8B5A00' }}>
        ⏳ Fencing update requested{request.requestedByName ? ` by ${request.requestedByName}` : ''}
      </div>
      {request.reason && <div style={{ fontSize: 12, color: '#6B5A2E', marginTop: 3 }}>“{request.reason}”</div>}

      {rejecting && (
        <textarea
          className="sp-textarea" rows={2} style={{ width: '100%', marginTop: 8 }}
          placeholder="Why is this not approved? (the field user will see this)"
          value={note} onChange={e => setNote(e.target.value)}
        />
      )}
      {error && <div style={{ fontSize: 11.5, color: '#A32020', marginTop: 6 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {!rejecting ? (
          <>
            <button type="button" className="pl-btn pl-btn--primary" style={{ height: 30, fontSize: 12.5, background: LOCKED_GREEN }} disabled={busy} onClick={() => decide('approve')}>
              {busy ? 'Saving…' : 'Approve'}
            </button>
            <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 30, fontSize: 12.5 }} disabled={busy} onClick={() => setRejecting(true)}>Reject</button>
          </>
        ) : (
          <>
            <button type="button" className="pl-btn pl-btn--primary" style={{ height: 30, fontSize: 12.5, background: '#A32020' }} disabled={busy} onClick={() => decide('reject')}>
              {busy ? 'Saving…' : 'Confirm reject'}
            </button>
            <button type="button" className="pl-btn pl-btn--ghost" style={{ height: 30, fontSize: 12.5 }} disabled={busy} onClick={() => { setRejecting(false); setError(null) }}>Back</button>
          </>
        )}
      </div>
    </div>
  )
}

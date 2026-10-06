/** The "Trees" part of a project card: counts, and (on request) a list of the project's trees. */
import React, { useState } from 'react'
import TreeDetailModal from '../tree/TreeHistory'
import { useAuth } from '../../contexts/AuthContext'
import { API_URL as API } from '../../config/api'
import type { Tone } from '../tree/treeLabels'

interface TreeRow {
  id: string
  treeCode: string
  species: string
  stage?: string
  taskType?: string | null
  taskStatus?: string | null
  auditCount?: number
}

const TONES: Record<string, Tone> = {
  Added:      { bg: '#F2EFEA', fg: '#6B7B6E' },
  Planted:    { bg: '#EAF3DE', fg: '#27500A' },
  'In audit': { bg: '#E8F1FB', fg: '#185FA5' },
  Approved:   { bg: '#D9EBD2', fg: '#1C3A2B' },
}

/** Added → Planted → In audit → Approved, from what the trees list already tells us. */
export function treeProgress(t: TreeRow): string {
  if (!t.stage || t.stage === 'Under plantation') return 'Added'
  if (t.taskType === 'audit' && t.taskStatus === 'approved') return 'Approved'
  if (t.taskType === 'audit' && t.taskStatus && ['assigned', 'in_progress', 'completed', 'submitted'].includes(t.taskStatus)) return 'In audit'
  return 'Planted'
}

export default function ProjectTreeList({ projectId, added, planted, onOpenMap }: { projectId: string; added: number; planted: number; onOpenMap?: () => void }) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [trees, setTrees] = useState<TreeRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && trees === null) {
      fetch(`${API}/api/partner/trees?project_id=${encodeURIComponent(projectId)}`, { headers: { Authorization: `Bearer ${session?.access_token || ''}` } })
        .then(async r => {
          const d = await r.json()
          if (!r.ok) throw new Error(d.error || 'Could not load trees')
          setTrees(d.trees || [])
        })
        .catch(e => setError(e.message))
    }
  }

  return (
    <div style={{ borderRadius: 10, background: '#F5F8F1', border: '1px solid #E1EBD8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <span style={{ fontSize: 16 }}>🌳</span>
        <span style={{ fontSize: 12.5, color: '#2B5341' }}>
          <strong style={{ fontSize: 14 }}>{added.toLocaleString('en-IN')}</strong> added
          <span style={{ color: '#7A867C' }}> · </span>
          <strong>{planted.toLocaleString('en-IN')}</strong> planted
        </span>
        <button type="button" onClick={toggle} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#2B5341' }}>
          {open ? 'Hide trees ▴' : 'Show trees ▾'}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid #E1EBD8', background: '#fff', borderRadius: '0 0 10px 10px' }}>
          {error ? (
            <div style={{ padding: 12, fontSize: 12.5, color: '#A32020' }}>{error}</div>
          ) : trees === null ? (
            <div style={{ padding: 12, fontSize: 12.5, color: '#9AA79C' }}>Loading…</div>
          ) : trees.length === 0 ? (
            <div style={{ padding: 12, fontSize: 12.5, color: '#9AA79C' }}>No trees added yet.</div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {trees.map(t => {
                const st = treeProgress(t)
                const tone = TONES[st]
                return (
                  <button key={t.id} type="button" onClick={() => setDetailId(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #F4F0EA', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#2B5341' }}>{t.treeCode}</span>
                    <span style={{ fontSize: 12.5, color: '#1C2B22', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.species}</span>
                    <span style={{ marginLeft: 'auto', background: tone.bg, color: tone.fg, padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{st}</span>
                  </button>
                )
              })}
            </div>
          )}
          {onOpenMap && (
            <button type="button" onClick={onOpenMap} style={{ width: '100%', padding: '8px 12px', border: 'none', background: '#FAFBF8', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#2B5341', borderRadius: '0 0 10px 10px' }}>
              See all trees on a map →
            </button>
          )}
        </div>
      )}

      {detailId && <TreeDetailModal historyUrl={`${API}/api/partner/trees/${detailId}/history`} onClose={() => setDetailId(null)} />}
    </div>
  )
}

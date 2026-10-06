import React from 'react'
import { FENCING_STATUS, formatArea, formatLength, formatDate, type Fencing, type Boundary } from '../tree/treeLabels'

/** The fencing fields people fill in, in display order. */
export const FENCING_ROWS: { key: keyof Fencing; label: string; show?: (v: any) => string }[] = [
  { key: 'status',       label: 'Status',       show: v => FENCING_STATUS[v]?.label || v },
  { key: 'type',         label: 'Fence type' },
  { key: 'material',     label: 'Material' },
  { key: 'length_m',     label: 'Length',       show: v => formatLength(Number(v)) },
  { key: 'height_m',     label: 'Height',       show: v => `${v} m` },
  { key: 'gates',        label: 'Gates' },
  { key: 'installed_on', label: 'Installed on', show: v => formatDate(v) },
  { key: 'contractor',   label: 'Contractor' },
  { key: 'notes',        label: 'Notes' },
]

export function fencingValue(f: Fencing | null | undefined, key: keyof Fencing) {
  const row = FENCING_ROWS.find(r => r.key === key)
  const v = f?.[key]
  if (v === undefined || v === null || v === '') return '—'
  return row?.show ? row.show(v) : String(v)
}

/** Compact fencing block for a project card. */
export default function FencingSummary({ fencing, boundary, compact = false }: { fencing: Fencing | null | undefined; boundary?: Boundary | null; compact?: boolean }) {
  const st = fencing?.status ? FENCING_STATUS[fencing.status] : null
  const hasAny = !!fencing && Object.keys(fencing).some(k => k !== 'updated_at' && (fencing as any)[k] !== '' && (fencing as any)[k] != null)
  return (
    <div style={{ borderRadius: 10, border: '1px solid #EEE9E1', background: '#FCFBF8', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasAny || boundary ? 6 : 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1C2B22' }}>🧱 Fencing</span>
        {st
          ? <span style={{ marginLeft: 'auto', background: st.bg, color: st.fg, padding: '1px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{st.label}</span>
          : <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9AA79C' }}>{hasAny ? '' : 'Not added yet'}</span>}
      </div>
      {hasAny && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 11.5 }}>
          {FENCING_ROWS.filter(r => r.key !== 'status' && r.key !== 'notes' && fencing?.[r.key] != null && fencing?.[r.key] !== '')
            .slice(0, compact ? 4 : 8)
            .map(r => (
              <div key={r.key} style={{ minWidth: 0 }}>
                <span style={{ color: '#9AA79C' }}>{r.label}: </span>
                <span style={{ color: '#1C2B22', fontWeight: 600 }}>{fencingValue(fencing, r.key)}</span>
              </div>
            ))}
        </div>
      )}
      {!compact && fencing?.notes && <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 4 }}>“{fencing.notes}”</div>}
      {boundary && boundary.coordinates.length >= 3 && (
        <div style={{ fontSize: 11.5, color: '#6B7B6E', marginTop: 6 }}>
          Boundary: <strong style={{ color: '#1C2B22' }}>{formatArea(boundary.areaSqM)}</strong> · perimeter {formatLength(boundary.perimeterM)}
          {boundary.locked ? ' · 🔒 locked' : ' · ✏️ being redrawn'}
        </div>
      )}
    </div>
  )
}

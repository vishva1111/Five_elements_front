/** Shared wording and colours for tree, audit and task states across the panel. */

export interface Tone { bg: string; fg: string }

/**
 * tasks.status → what the panel calls it. 'rejected' stays the stored value
 * because the mobile app reads it to show its Edit button, but to people it
 * means the submission was rejected and sent back to be fixed.
 */
export const TASK_STATUS: Record<string, { label: string } & Tone> = {
  assigned:    { label: 'Assigned',          bg: '#EEF3EA', fg: '#2B5341' },
  in_progress: { label: 'In progress',       bg: '#FFF4E0', fg: '#8B5A00' },
  completed:   { label: 'Awaiting review',   bg: '#E8F1FB', fg: '#185FA5' },
  approved:    { label: 'Approved',          bg: '#D9EBD2', fg: '#1C3A2B' },
  rejected:    { label: 'Rejected',          bg: '#FBE9E9', fg: '#A32020' },
  submitted:   { label: 'Submitted',         bg: '#E8F1FB', fg: '#185FA5' },
  pending:     { label: 'Not started',       bg: '#F2EFEA', fg: '#6B7B6E' },
}

export function taskStatus(status: string | null | undefined) {
  return TASK_STATUS[status || 'pending'] || { label: String(status), bg: '#F2EFEA', fg: '#6B7B6E' }
}

/** Tree condition / health / survival words → a colour that reads at a glance. */
export function conditionTone(value: string | null | undefined): Tone {
  const v = (value || '').toLowerCase()
  if (!v) return { bg: '#F2EFEA', fg: '#6B7B6E' }
  if (['healthy', 'alive', 'good'].includes(v)) return { bg: '#EAF3DE', fg: '#27500A' }
  if (['average', 'moderate', 'stressed', 'sick', 'fair'].includes(v)) return { bg: '#FFF4E0', fg: '#8B5A00' }
  if (['poor', 'diseased', 'damaged'].includes(v)) return { bg: '#FBE9E9', fg: '#A32020' }
  if (['dead', 'missing'].includes(v)) return { bg: '#EDE7E7', fg: '#5E2B2B' }
  return { bg: '#F2EFEA', fg: '#6B7B6E' }
}

/** Marker colour on maps. */
export function conditionColor(value: string | null | undefined): string {
  const v = (value || '').toLowerCase()
  if (['healthy', 'alive', 'good'].includes(v)) return '#2E9E4F'
  if (['average', 'moderate', 'stressed', 'sick', 'fair'].includes(v)) return '#E0A100'
  if (['poor', 'diseased', 'damaged'].includes(v)) return '#D9480F'
  if (['dead', 'missing'].includes(v)) return '#6B2C2C'
  return '#5B7A8C'
}

export const capitalise = (s: string | null | undefined) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : ''

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString('en-IN', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Default colour a project is drawn in until it has an approved one of its own. */
export const DEFAULT_PROJECT_COLOR = '#2B5341'

export const PROJECT_COLOR_CHOICES = [
  '#2B5341', '#2E9E4F', '#7CB342', '#00897B', '#1E88E5', '#3949AB',
  '#8E24AA', '#D81B60', '#E53935', '#F4511E', '#F09125', '#FDD835',
  '#6D4C41', '#546E7A',
]

export const FENCING_STATUS: Record<string, { label: string } & Tone> = {
  not_started: { label: 'Not started', bg: '#F2EFEA', fg: '#6B7B6E' },
  in_progress: { label: 'In progress', bg: '#FFF4E0', fg: '#8B5A00' },
  completed:   { label: 'Completed',   bg: '#EAF3DE', fg: '#27500A' },
  damaged:     { label: 'Damaged',     bg: '#FBE9E9', fg: '#A32020' },
}

export interface Fencing {
  status?: string
  type?: string
  material?: string
  length_m?: number
  height_m?: number
  gates?: number
  installed_on?: string
  contractor?: string
  notes?: string
  updated_at?: string
}

export interface Boundary {
  coordinates: { latitude: number; longitude: number }[]
  areaSqM: number
  perimeterM: number
  status: string
  locked: boolean
  lockedAt?: string | null
  lockedBy?: string | null
  updatedAt?: string | null
}

export function formatArea(sqm: number | null | undefined) {
  if (!sqm) return '—'
  const ha = sqm / 10000
  return ha >= 0.1 ? `${ha.toFixed(2)} ha (${(ha * 2.47105).toFixed(2)} acres)` : `${Math.round(sqm).toLocaleString('en-IN')} m²`
}

export function formatLength(m: number | null | undefined) {
  if (!m && m !== 0) return '—'
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m).toLocaleString('en-IN')} m`
}

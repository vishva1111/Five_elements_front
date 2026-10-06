/**
 * Everything about one tree: all its photos, where it is, its details, the
 * latest audit (highlighted) and the full audit history with before/after
 * photos. Data comes from …/trees/:id/history (backend services/treeHistory.js).
 *
 *   <TreeDetailModal historyUrl=… onClose=… />   — as a pop-up
 *   useTreeHistory(url) + <TreeHistoryView … />  — inside another view (task review)
 */
import React, { useCallback, useEffect, useState } from 'react'
import { TreePine, MapPin, Camera, History, Star, ArrowRight, User, CalendarDays, ClipboardCheck } from 'lucide-react'
import Modal from '../ui/Modal'
import TreeMap from '../map/TreeMap'
import PhotoLightbox, { type Photo } from './PhotoLightbox'
import { useAuth } from '../../contexts/AuthContext'
import { taskStatus, conditionTone, conditionColor, capitalise, formatDate, DEFAULT_PROJECT_COLOR } from './treeLabels'

export interface Measurements {
  dbhCm: number | null
  heightM: number | null
  crownDiameterM: number | null
  woodDensity: number | null
  ageYears: number | null
  multiStem: boolean | string | null
}

export interface HistoryStep {
  label: string
  status: string
  taskId: string | null
  taskCode: string | null
  taskName: string | null
  assigneeName: string | null
  assignedAt: string | null
  completedAt: string | null
  reviewedAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
  surveyDate: string | null
  surveyor: string | null
  condition: string | null
  health: string | null
  survival: string | null
  measurements: Measurements
  notes: string | null
  location: { latitude: number; longitude: number } | null
  photos: string[]
}

export interface AuditStep extends HistoryStep {
  round: number
  before: { url: string; label: string } | null
  after: { url: string; label: string } | null
  isLatest: boolean
}

export interface TreeHistoryData {
  tree: {
    id: string
    treeCode: string
    species: string
    scientificName: string | null
    stage: string
    healthStatus: string | null
    condition: string | null
    eventType: string | null
    landType: string | null
    quantity: number
    latitude: number | null
    longitude: number | null
    projectId: string
    projectName: string
    projectColor: string | null
    recordedFor: string
    surveyor: string | null
    surveyDate: string | null
    submittedAt: string
    notes: string | null
    measurements: Measurements
  }
  photos: Photo[]
  planting: HistoryStep | null
  audits: AuditStep[]
  latestAudit: AuditStep | null
}

export function useTreeHistory(url: string | null) {
  const { session } = useAuth()
  const token = session?.access_token
  const [data, setData] = useState<TreeHistoryData | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!url || !token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not load the tree history')
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the tree history')
    } finally {
      setLoading(false)
    }
  }, [url, token])

  useEffect(() => { setData(null); load() }, [load])
  return { data, loading, error, reload: load }
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function Pill({ text, tone }: { text: string; tone: { bg: string; fg: string } }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: tone.bg, color: tone.fg, padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: tone.fg }} />{text}
    </span>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '' || value === '—') return null
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: '#9AA79C', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1C2B22', marginTop: 2, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

function SectionTitle({ icon, children, extra }: { icon: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 10px' }}>
      <span style={{ color: '#2B5341', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#1C2B22', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</span>
      {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
    </div>
  )
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }

function measurementFacts(m: Measurements) {
  return (
    <>
      <Fact label="Trunk (DBH)" value={m.dbhCm !== null ? `${m.dbhCm} cm` : null} />
      <Fact label="Height" value={m.heightM !== null ? `${m.heightM} m` : null} />
      <Fact label="Crown" value={m.crownDiameterM !== null ? `${m.crownDiameterM} m` : null} />
      <Fact label="Wood density" value={m.woodDensity} />
      <Fact label="Age" value={m.ageYears !== null ? `${m.ageYears} yr` : null} />
      <Fact label="Multi-stem" value={m.multiStem === null || m.multiStem === undefined ? null : String(m.multiStem) === 'true' || m.multiStem === 'Yes' ? 'Yes' : 'No'} />
    </>
  )
}

function Thumb({ url, label, onOpen, size = 76 }: { url: string; label?: string; onOpen: () => void; size?: number }) {
  return (
    <button type="button" onClick={onOpen} title={label || 'Open photo'} style={{ padding: 0, border: '1px solid #E6E0D8', borderRadius: 10, overflow: 'hidden', width: size, height: size, cursor: 'zoom-in', background: '#F2EFEA', flexShrink: 0 }}>
      <img src={url} alt={label || 'Tree photo'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </button>
  )
}

/** Two photos side by side: the step before, and this audit. */
function BeforeAfter({ before, after, open }: { before: AuditStep['before']; after: AuditStep['after']; open: (url: string) => void }) {
  if (!before && !after) return null
  const cell = (p: { url: string; label: string } | null, title: string) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7B6E', marginBottom: 5 }}>{title}{p ? ` · ${p.label}` : ''}</div>
      {p ? (
        <button type="button" onClick={() => open(p.url)} style={{ padding: 0, border: '1px solid #E6E0D8', borderRadius: 10, overflow: 'hidden', width: '100%', aspectRatio: '4 / 3', cursor: 'zoom-in', background: '#F2EFEA', display: 'block' }}>
          <img src={p.url} alt={title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </button>
      ) : (
        <div style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 10, border: '1px dashed #D8CFC6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA79C', fontSize: 12 }}>No photo</div>
      )}
    </div>
  )
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
      {cell(before, 'Before')}
      <div style={{ display: 'flex', alignItems: 'center', color: '#9AA79C' }}><ArrowRight size={18} /></div>
      {cell(after, 'After')}
    </div>
  )
}

function StepPeople({ s }: { s: HistoryStep }) {
  const bits = [
    s.assigneeName && <span key="a"><User size={12} style={{ verticalAlign: -2 }} /> {s.assigneeName}</span>,
    (s.surveyDate || s.completedAt) && <span key="d"><CalendarDays size={12} style={{ verticalAlign: -2 }} /> {formatDate(s.surveyDate || s.completedAt)}</span>,
    s.surveyor && <span key="s">Surveyor: {s.surveyor}</span>,
    s.reviewedAt && <span key="r"><ClipboardCheck size={12} style={{ verticalAlign: -2 }} /> Reviewed {formatDate(s.reviewedAt)}{s.reviewedBy ? ` by ${s.reviewedBy}` : ''}</span>,
  ].filter(Boolean)
  if (bits.length === 0) return null
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: 12, color: '#6B7B6E' }}>{bits}</div>
}

function ReviewNote({ s }: { s: HistoryStep }) {
  if (!s.reviewNotes) return null
  const changes = s.status === 'rejected'
  return (
    <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.45, background: changes ? '#FDEEE3' : '#F2F6EE', color: changes ? '#7A3B00' : '#2B5341' }}>
      <strong>{changes ? 'Changes requested: ' : 'Reviewer note: '}</strong>{s.reviewNotes}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function TreeHistoryView({ data, focusTaskId }: { data: TreeHistoryData; focusTaskId?: string | null }) {
  const [viewer, setViewer] = useState<{ photos: Photo[]; start: number } | null>(null)
  const { tree, photos, planting, audits, latestAudit } = data
  const color = tree.projectColor || DEFAULT_PROJECT_COLOR
  const openAll = (url: string) => {
    const i = photos.findIndex(p => p.url === url)
    setViewer({ photos: i >= 0 ? photos : [{ url }], start: Math.max(0, i) })
  }
  const hasPoint = tree.latitude !== null && tree.longitude !== null
  // The step under review (task review) is shown first and open.
  const focused = focusTaskId ? audits.find(a => a.taskId === focusTaskId) || null : null
  const headline = focused || latestAudit

  return (
    <div>
      {/* Identity */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5, fontWeight: 700, color: '#2B5341', background: '#F2F6EE', border: '1px solid #DCE8D3', borderRadius: 6, padding: '3px 8px' }}>{tree.treeCode}</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#1C2B22' }}>{tree.species}</span>
        {tree.scientificName && <span style={{ fontSize: 12.5, color: '#7A867C', fontStyle: 'italic' }}>{tree.scientificName}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill text={tree.stage} tone={{ bg: '#EAF3DE', fg: '#27500A' }} />
          {tree.condition && <Pill text={tree.condition} tone={conditionTone(tree.condition)} />}
          {tree.healthStatus && <Pill text={capitalise(tree.healthStatus)} tone={conditionTone(tree.healthStatus)} />}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: '#6B7B6E', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
        {tree.projectName} · recorded for {tree.recordedFor}
      </div>

      {/* Photos + location */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 14 }}>
        <div>
          <SectionTitle icon={<Camera size={15} />}>All photos ({photos.length})</SectionTitle>
          {photos.length === 0 ? (
            <div style={{ height: 200, borderRadius: 12, border: '1px dashed #D8CFC6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9AA79C', fontSize: 12.5 }}>No photos yet</div>
          ) : (
            <>
              <button type="button" onClick={() => setViewer({ photos, start: 0 })} style={{ padding: 0, border: '1px solid #E6E0D8', borderRadius: 12, overflow: 'hidden', width: '100%', height: 200, cursor: 'zoom-in', background: '#F2EFEA', display: 'block', position: 'relative' }}>
                <img src={photos[photos.length - 1].url} alt="Latest" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(17,33,33,0.75)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>Latest · {photos[photos.length - 1].label}</span>
              </button>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {photos.map((p, i) => (
                  <div key={p.url} style={{ textAlign: 'center' }}>
                    <Thumb url={p.url} label={p.label} size={64} onOpen={() => setViewer({ photos, start: i })} />
                    <div style={{ fontSize: 10, color: '#7A867C', marginTop: 2, maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <SectionTitle
            icon={<MapPin size={15} />}
            extra={hasPoint ? (
              <a href={`https://www.google.com/maps?q=${tree.latitude},${tree.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#185FA5', fontWeight: 600 }}>Open in Google Maps ↗</a>
            ) : undefined}
          >Location</SectionTitle>
          <TreeMap
            height={200}
            points={hasPoint ? [{ id: tree.id, latitude: tree.latitude!, longitude: tree.longitude!, color: conditionColor(tree.condition || tree.healthStatus), label: tree.treeCode, sublabel: tree.species }] : []}
            emptyText="This tree has no GPS location yet."
          />
          {hasPoint && <div style={{ fontSize: 11.5, color: '#7A867C', marginTop: 6 }}>📍 {tree.latitude!.toFixed(6)}, {tree.longitude!.toFixed(6)}</div>}
        </div>
      </div>

      {/* Tree details */}
      <SectionTitle icon={<TreePine size={15} />}>Tree details</SectionTitle>
      <div style={grid}>
        <Fact label="Project" value={tree.projectName} />
        <Fact label="Recorded for" value={tree.recordedFor} />
        <Fact label="Event" value={tree.eventType} />
        <Fact label="Land type" value={tree.landType} />
        <Fact label="Quantity" value={tree.quantity > 1 ? tree.quantity : null} />
        <Fact label="Surveyor" value={tree.surveyor} />
        <Fact label="Survey date" value={tree.surveyDate ? formatDate(tree.surveyDate) : null} />
        <Fact label="Added" value={formatDate(tree.submittedAt)} />
        {measurementFacts(tree.measurements)}
      </div>
      {tree.notes && <div style={{ marginTop: 10, fontSize: 12.5, color: '#4A5A4E', background: '#FAF8F4', borderRadius: 10, padding: '8px 12px' }}>“{tree.notes}”</div>}

      {/* Latest audit, highlighted */}
      <SectionTitle icon={<Star size={15} />}>{focused ? `Under review · ${focused.label}` : 'Latest audit'}</SectionTitle>
      {headline ? (
        <div style={{ border: `2px solid ${focused ? '#185FA5' : '#2E9E4F'}`, background: focused ? '#F4F8FD' : '#F5FAF2', borderRadius: 14, padding: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1C2B22' }}>{headline.label}</span>
            <Pill text={taskStatus(headline.status).label} tone={taskStatus(headline.status)} />
            {headline.condition && <Pill text={headline.condition} tone={conditionTone(headline.condition)} />}
            {headline.survival && <Pill text={capitalise(headline.survival)} tone={conditionTone(headline.survival)} />}
            {!focused && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#2E9E4F', background: '#fff', border: '1px solid #BFE0C3', padding: '2px 8px', borderRadius: 999 }}>LATEST</span>}
          </div>
          <StepPeople s={headline} />
          <div style={{ ...grid, marginTop: 12 }}>{measurementFacts(headline.measurements)}<Fact label="Health" value={capitalise(headline.health)} /></div>
          {headline.notes && <div style={{ marginTop: 10, fontSize: 12.5, color: '#4A5A4E' }}>Field notes: “{headline.notes}”</div>}
          <ReviewNote s={headline} />
          <div style={{ marginTop: 14 }}><BeforeAfter before={headline.before} after={headline.after} open={openAll} /></div>
          {headline.photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {headline.photos.map(u => <Thumb key={u} url={u} onOpen={() => openAll(u)} size={58} />)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 14, borderRadius: 12, background: '#FAF8F4', color: '#7A867C', fontSize: 12.5 }}>
          No audit has been submitted for this tree yet.
        </div>
      )}

      {/* Full history */}
      <SectionTitle icon={<History size={15} />}>Audit history ({audits.length} round{audits.length === 1 ? '' : 's'})</SectionTitle>
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: '#E6E0D8' }} />
        {planting && <TimelineItem step={planting} open={openAll} dot="#C9A227" />}
        {audits.map(a => (
          <TimelineItem key={a.round} step={a} audit={a} open={openAll} dot={a.isLatest ? '#2E9E4F' : '#9AA79C'} focused={a.taskId === focusTaskId} />
        ))}
        {!planting && audits.length === 0 && (
          <div style={{ fontSize: 12.5, color: '#7A867C', padding: '4px 0' }}>Nothing recorded yet — tasks and audits show up here as they happen.</div>
        )}
      </div>

      {viewer && <PhotoLightbox photos={viewer.photos} start={viewer.start} onClose={() => setViewer(null)} />}
    </div>
  )
}

function TimelineItem({ step, audit, open, dot, focused }: { step: HistoryStep; audit?: AuditStep; open: (url: string) => void; dot: string; focused?: boolean }) {
  const st = taskStatus(step.status)
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <span style={{ position: 'absolute', left: -21, top: 6, width: 14, height: 14, borderRadius: 7, background: dot, border: '3px solid #fff', boxShadow: '0 0 0 1px #D8CFC6' }} />
      <div style={{ border: `1px solid ${focused ? '#A8C8E8' : '#EEE9E1'}`, background: focused ? '#F4F8FD' : '#fff', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: '#1C2B22' }}>{step.label}</span>
          <Pill text={st.label} tone={st} />
          {audit?.isLatest && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#2E9E4F' }}>LATEST</span>}
          {step.taskCode && <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 11, color: '#7A867C' }}>{step.taskCode}</span>}
        </div>
        <StepPeople s={step} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {step.condition && <Pill text={step.condition} tone={conditionTone(step.condition)} />}
          {step.health && <Pill text={capitalise(step.health)} tone={conditionTone(step.health)} />}
          {step.survival && <Pill text={capitalise(step.survival)} tone={conditionTone(step.survival)} />}
          {step.measurements.heightM !== null && <span style={{ fontSize: 12, color: '#4A5A4E' }}>Height {step.measurements.heightM} m</span>}
          {step.measurements.dbhCm !== null && <span style={{ fontSize: 12, color: '#4A5A4E' }}>· DBH {step.measurements.dbhCm} cm</span>}
          {step.measurements.crownDiameterM !== null && <span style={{ fontSize: 12, color: '#4A5A4E' }}>· Crown {step.measurements.crownDiameterM} m</span>}
        </div>
        {step.notes && <div style={{ marginTop: 6, fontSize: 12, color: '#4A5A4E' }}>“{step.notes}”</div>}
        <ReviewNote s={step} />
        {audit && (audit.before || audit.after) ? (
          <div style={{ marginTop: 10, maxWidth: 460 }}><BeforeAfter before={audit.before} after={audit.after} open={open} /></div>
        ) : step.photos.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {step.photos.map(u => <Thumb key={u} url={u} onOpen={() => open(u)} size={58} />)}
          </div>
        )}
        {audit && audit.photos.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {audit.photos.slice(1).map(u => <Thumb key={u} url={u} onOpen={() => open(u)} size={44} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TreeDetailModal({ historyUrl, onClose }: { historyUrl: string; onClose: () => void }) {
  const { data, loading, error } = useTreeHistory(historyUrl)
  return (
    <Modal
      icon={<TreePine size={18} />}
      title={data ? `${data.tree.treeCode} · ${data.tree.species}` : 'Tree details'}
      subtitle={data ? `${data.tree.projectName} · ${data.photos.length} photo${data.photos.length === 1 ? '' : 's'} · ${data.audits.length} audit round${data.audits.length === 1 ? '' : 's'}` : undefined}
      error={error}
      onClose={onClose}
      width={980}
      footer={<button type="button" onClick={onClose} style={{ height: 36, padding: '0 18px', borderRadius: 999, border: '1.5px solid #D8CFC6', background: '#fff', color: '#112121', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>}
    >
      {loading && !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[200, 60, 120, 90].map((h, i) => <div key={i} style={{ height: h, borderRadius: 12, background: 'linear-gradient(90deg,#F2EFEA,#FAF8F4,#F2EFEA)' }} />)}
        </div>
      ) : data ? <TreeHistoryView data={data} /> : null}
    </Modal>
  )
}

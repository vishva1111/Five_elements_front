/**
 * TreeMap — trees as dots on a street / satellite map, optionally with a
 * project's land boundary. With `editBoundary` the boundary can be drawn:
 * click the map to add a corner, drag a corner to move it, click a corner to
 * remove it.
 */
import React, { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Marker, Tooltip, LayersControl, useMap, useMapEvents } from 'react-leaflet'

export interface MapPoint {
  id: string
  latitude: number
  longitude: number
  color?: string
  label?: string
  sublabel?: string
}

export interface LatLng { latitude: number; longitude: number }

const INDIA: [number, number] = [22.5, 79]
const toLL = (c: LatLng): [number, number] => [c.latitude, c.longitude]

const valid = (p: { latitude?: number | null; longitude?: number | null } | null | undefined) =>
  !!p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
  && !(Number(p.latitude) === 0 && Number(p.longitude) === 0)

/** Re-frames the map when the set of things on it changes. */
function FitTo({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  const key = coords.map(c => c.join(',')).join('|')
  useEffect(() => {
    if (coords.length === 0) return
    if (coords.length === 1) map.setView(coords[0], 17)
    else map.fitBounds(L.latLngBounds(coords), { padding: [28, 28], maxZoom: 18 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

function ClickToAdd({ onAdd }: { onAdd: (p: LatLng) => void }) {
  useMapEvents({ click: e => onAdd({ latitude: e.latlng.lat, longitude: e.latlng.lng }) })
  return null
}

const cornerIcon = (color: string, n: number) => L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:11px;background:#fff;border:3px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.35);font:700 10px/16px system-ui;text-align:center;color:${color}">${n}</div>`,
})

/** A numbered corner of the land (P1, P2 …): a ring on the corner with a small label under it. */
const pointIcon = (color: string, n: number) => L.divIcon({
  className: '',
  iconSize: [34, 36],
  iconAnchor: [17, 11],
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:20px;height:20px;border-radius:10px;background:rgba(255,255,255,.9);border:3px solid ${color};box-shadow:0 1px 4px rgba(0,0,0,.4);box-sizing:border-box"></div>
    <div style="margin-top:2px;padding:1px 6px;border-radius:9px;background:#12332a;color:#fff;font:700 10px/14px system-ui;white-space:nowrap">P${n}</div>
  </div>`,
})

/** A tree badge like the field app's: a round colour-coded badge with a 🌳 in it. */
const treeIconCache = new Map<string, L.DivIcon>()
const treeIcon = (color: string) => {
  let icon = treeIconCache.get(color)
  if (!icon) {
    icon = L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      html: `<div style="width:28px;height:28px;border-radius:14px;background:${color};border:2.5px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.5);box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1">🌳</div>`,
    })
    treeIconCache.set(color, icon)
  }
  return icon
}

export default function TreeMap({
  points = [],
  boundary,
  boundaryColor = '#2B5341',
  editBoundary,
  compareBoundary,
  compareColor = '#D97706',
  onPointClick,
  height = 360,
  emptyText = 'No GPS locations recorded yet.',
  interactive = true,
  satellite,
  treeMarkers = false,
  cornerLabels = false,
  fitBoundaryOnly = false,
}: {
  points?: MapPoint[]
  boundary?: LatLng[] | null
  boundaryColor?: string
  /** When set, the boundary is drawn/edited instead of shown. */
  editBoundary?: { coordinates: LatLng[]; onChange: (c: LatLng[]) => void }
  /** A second, dashed outline drawn next to `boundary` (e.g. a proposed fence). */
  compareBoundary?: LatLng[] | null
  compareColor?: string
  onPointClick?: (id: string) => void
  height?: number | string
  emptyText?: string
  /** false = a still preview (no pan / zoom). */
  interactive?: boolean
  /** Set (true/false) to choose satellite or street yourself; leave out for the built-in layer switch. */
  satellite?: boolean
  /** Trees as 🌳 badges, like the field app, instead of plain dots. */
  treeMarkers?: boolean
  /** Number the boundary corners P1, P2 … like the field app. */
  cornerLabels?: boolean
  /** Frame the map on the boundary alone, even when trees stand far outside it. */
  fitBoundaryOnly?: boolean
}) {
  const shown = useMemo(() => points.filter(valid), [points])
  const ring = (editBoundary ? editBoundary.coordinates : boundary || []).filter(valid)
  // While drawing, frame the trees and the boundary as it was when drawing
  // started — re-framing on every corner added would make the map jump.
  const other = (compareBoundary || []).filter(valid)
  const startRing = useRef(ring)
  const framed = editBoundary ? startRing.current : ring
  const fit: [number, number][] = [
    ...(fitBoundaryOnly && framed.length >= 3 ? [] : shown.map(p => [p.latitude, p.longitude] as [number, number])),
    ...framed.map(c => [c.latitude, c.longitude] as [number, number]),
    ...other.map(c => [c.latitude, c.longitude] as [number, number]),
  ]
  const nothing = shown.length === 0 && ring.length === 0 && !editBoundary

  return (
    // isolation keeps Leaflet's own z-indexes (400–1000) from rising above the panel's pop-ups.
    <div style={{ position: 'relative', isolation: 'isolate', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #E6E0D8', background: '#EEF2EC' }}>
      <MapContainer
        center={INDIA} zoom={4} style={{ height: '100%', width: '100%' }} attributionControl
        scrollWheelZoom={interactive} dragging={interactive} doubleClickZoom={interactive}
        touchZoom={interactive} keyboard={interactive} zoomControl={interactive}
      >
        {satellite === undefined ? (
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Street">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                attribution="Map data &copy; Google"
                maxZoom={22}
                maxNativeZoom={20}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
        ) : satellite ? (
          <TileLayer
            key="sat"
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="Map data &copy; Google"
            maxZoom={22}
            maxNativeZoom={20}
          />
        ) : (
          <TileLayer
            key="osm"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        )}

        <FitTo coords={fit} />

        {ring.length >= 3 && !editBoundary && (
          <Polygon positions={ring.map(toLL)} pathOptions={{ color: boundaryColor, weight: 3, fillColor: boundaryColor, fillOpacity: 0.12 }} />
        )}

        {other.length >= 3 && !editBoundary && (
          <Polygon positions={other.map(toLL)} pathOptions={{ color: compareColor, weight: 3, dashArray: '6 6', fillColor: compareColor, fillOpacity: 0.12 }} />
        )}

        {editBoundary && (
          <>
            <ClickToAdd onAdd={p => editBoundary.onChange([...editBoundary.coordinates, p])} />
            {ring.length >= 3
              ? <Polygon positions={ring.map(toLL)} pathOptions={{ color: boundaryColor, weight: 3, dashArray: '6 6', fillColor: boundaryColor, fillOpacity: 0.15 }} />
              : ring.length === 2 && <Polyline positions={ring.map(toLL)} pathOptions={{ color: boundaryColor, weight: 3, dashArray: '6 6' }} />}
            {ring.map((c, i) => (
              <Marker
                key={`${i}-${c.latitude}-${c.longitude}`}
                position={[c.latitude, c.longitude]}
                icon={cornerIcon(boundaryColor, i + 1)}
                draggable
                eventHandlers={{
                  dragend: e => {
                    const ll = (e.target as L.Marker).getLatLng()
                    editBoundary.onChange(ring.map((x, j) => j === i ? { latitude: ll.lat, longitude: ll.lng } : x))
                  },
                  click: () => editBoundary.onChange(ring.filter((_, j) => j !== i)),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]}>Corner {i + 1} · drag to move, click to remove</Tooltip>
              </Marker>
            ))}
          </>
        )}

        {cornerLabels && !editBoundary && ring.map((c, i) => (
          <Marker key={`pc-${i}`} position={[c.latitude, c.longitude]} icon={pointIcon(boundaryColor, i + 1)} interactive={false} />
        ))}

        {treeMarkers && shown.map(p => (
          <Marker
            key={p.id}
            position={[p.latitude, p.longitude]}
            icon={treeIcon(p.color || '#16a34a')}
            eventHandlers={onPointClick ? { click: () => onPointClick(p.id) } : undefined}
          >
            {(p.label || p.sublabel) && (
              <Tooltip direction="top" offset={[0, -14]}>
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                {p.sublabel && <div style={{ fontSize: 11, color: '#555' }}>{p.sublabel}</div>}
              </Tooltip>
            )}
          </Marker>
        ))}

        {!treeMarkers && shown.map(p => (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: p.color || '#2E9E4F', fillOpacity: 0.95 }}
            eventHandlers={onPointClick ? { click: () => onPointClick(p.id) } : undefined}
          >
            {(p.label || p.sublabel) && (
              <Tooltip direction="top" offset={[0, -6]}>
                <div style={{ fontWeight: 700 }}>{p.label}</div>
                {p.sublabel && <div style={{ fontSize: 11, color: '#555' }}>{p.sublabel}</div>}
                {onPointClick && <div style={{ fontSize: 10.5, color: '#888', marginTop: 2 }}>Click for details</div>}
              </Tooltip>
            )}
          </CircleMarker>
        ))}
      </MapContainer>

      {nothing && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 500 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, color: '#6B7B6E', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            📍 {emptyText}
          </div>
        </div>
      )}
    </div>
  )
}

/** Smallest polygon around a set of points (Andrew's monotone chain) — "draw around my trees". */
export function hullAround(points: LatLng[]): LatLng[] {
  const pts = [...new Map(points.filter(valid).map(p => [`${p.latitude},${p.longitude}`, p])).values()]
    .sort((a, b) => a.longitude - b.longitude || a.latitude - b.latitude)
  if (pts.length < 3) return pts
  const cross = (o: LatLng, a: LatLng, b: LatLng) =>
    (a.longitude - o.longitude) * (b.latitude - o.latitude) - (a.latitude - o.latitude) * (b.longitude - o.longitude)
  const lower: LatLng[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: LatLng[] = []
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

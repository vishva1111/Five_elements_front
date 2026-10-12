import React, { useEffect, useRef, useState } from 'react'

export interface MonthDatum {
  key: string      // 'YYYY-MM'
  label: string    // 'Aug'
  full: string     // 'Aug 2026'
  trees: number
  amount: number
  fundings: number
}

const BAR       = '#40916C'   // single series — validated against the white card
const BAR_HOVER = '#2D6A4F'
const GRID      = '#EEE7DE'
const AXIS_TEXT = '#9AA79C'
const INK       = '#112121'

const H = 240, PAD_L = 40, PAD_R = 8, PAD_T = 22, PAD_B = 28

function niceMax(v: number): number {
  if (v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/** Barline path: square at the baseline, 4px rounded data-end on top. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
}

/**
 * Trees funded per month — single-series column chart. No legend (the card
 * title names the series); only the peak month is direct-labelled; every
 * column has a full-height hover target with a tooltip.
 */
export default function MonthlyColumns({ data }: { data: MonthDatum[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = Math.floor(entries[0].contentRect.width)
      if (w > 0) setWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const max     = Math.max(0, ...data.map(d => d.trees))
  const yMax    = niceMax(max)
  const ticks   = [0, yMax / 2, yMax]
  const plotW   = Math.max(1, width - PAD_L - PAD_R)
  const plotH   = H - PAD_T - PAD_B
  const band    = plotW / Math.max(1, data.length)
  const barW    = Math.max(4, Math.min(24, band - 2))   // capped at 24px, ≥2px surface gap
  const peakIdx = max > 0 ? data.findIndex(d => d.trees === max) : -1
  // Show every month label when there's room, otherwise every other / every third.
  const labelEvery = band >= 34 ? 1 : band >= 18 ? 2 : 3

  const y = (v: number) => PAD_T + plotH - (v / yMax) * plotH
  const hd = hover !== null ? data[hover] : null

  return (
    <div ref={wrapRef} className="mr-chart">
      <svg width={width} height={H} role="img" aria-label="Trees funded per month">
        {/* Gridlines + y ticks */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD_L} x2={width - PAD_R} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={PAD_L - 8} y={y(t) + 3.5} textAnchor="end" fontSize={10.5} fill={AXIS_TEXT}>
              {Math.round(t).toLocaleString('en-IN')}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const cx = PAD_L + band * i + band / 2
          const h  = d.trees > 0 ? Math.max(2, (d.trees / yMax) * plotH) : 0
          const x  = cx - barW / 2
          return (
            <g key={d.key}>
              {h > 0 && (
                <path d={columnPath(x, PAD_T + plotH - h, barW, h)} fill={hover === i ? BAR_HOVER : BAR} />
              )}
              {i === peakIdx && (
                <text x={cx} y={PAD_T + plotH - h - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
                  {d.trees.toLocaleString('en-IN')}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 9} textAnchor="middle" fontSize={10.5} fill={AXIS_TEXT}>{d.label}</text>
              )}
              {/* Hit target — the whole band, taller than the mark */}
              <rect
                x={PAD_L + band * i}
                y={PAD_T}
                width={band}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          )
        })}
      </svg>

      {hd && hover !== null && (
        <div
          className="mr-tooltip"
          style={{
            left: Math.min(Math.max(PAD_L + band * hover + band / 2, 80), width - 80),
            top: Math.max(0, y(hd.trees) - 70),
          }}
        >
          <div className="mr-tooltip__title">{hd.full}</div>
          <div className="mr-tooltip__row"><span className="mr-tooltip__key" />{hd.trees.toLocaleString('en-IN')} trees</div>
          <div className="mr-tooltip__sub">
            ₹{Math.round(hd.amount).toLocaleString('en-IN')} · {hd.fundings} funding{hd.fundings !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

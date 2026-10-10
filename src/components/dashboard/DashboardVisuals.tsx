import React from 'react'

// Shared pentagon visuals for the Business and Individual dashboards.

export function penta(cx: number, cy: number, r: number, rot = -Math.PI / 2) {
  const pts: [number, number][] = []
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

export function str(pts: [number, number][]) {
  return pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}

// Pentagon hero thumbnail for project cards
export function ProjectHero({ statusBg, status }: { statusBg: string; status: string }) {
  const cx = 200, cy = 96, R = 82
  const outer = str(penta(cx, cy, R))
  const inner = str(penta(cx, cy, R - 8))
  const svg = `<svg width="100%" viewBox="0 0 400 192" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="phGrad${cx}" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stop-color="#1a3330"/>
        <stop offset="100%" stop-color="#2B5341"/>
      </linearGradient>
      <clipPath id="phClip${cx}"><polygon points="${inner}"/></clipPath>
    </defs>
    <rect x="0" y="0" width="400" height="192" fill="#1a3330"/>
    <g clip-path="url(#phClip${cx})">
      <rect x="0" y="0" width="400" height="192" fill="url(#phGrad${cx})"/>
    </g>
    <polygon points="${outer}" fill="none" stroke="rgba(170,203,167,0.25)" stroke-width="2" stroke-linejoin="round"/>
  </svg>`
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
      <span
        className="db-project-card__status-badge"
        style={{ background: statusBg, position: 'absolute', top: 12, right: 12 }}
      >{status}</span>
    </div>
  )
}

// Five-element radar — only Earth is live today, so it's the one axis that fills.
export function RadarChart({ treesFunded }: { treesFunded: number }) {
  const S = 160, cx = 80, cy = 78, R = 54
  const order: [string, string, number][] = [
    ['Earth', '#2B5341', treesFunded > 0 ? 0.85 : 0],
    ['Water', '#185FA5', 0],
    ['Fire',  '#F09125', 0],
    ['Air',   '#534AB7', 0],
    ['Ether', '#112121', 0],
  ]
  let g = ''
  ;[0.25, 0.5, 0.75, 1].forEach(f => {
    g += `<polygon points="${str(penta(cx, cy, R * f))}" fill="none" stroke="rgba(43,83,65,0.13)" stroke-width="0.75" stroke-linejoin="round"/>`
  })
  const tips = penta(cx, cy, R)
  tips.forEach(p => {
    g += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="rgba(43,83,65,0.13)" stroke-width="0.75"/>`
  })
  tips.forEach((p, i) => {
    const el = order[i]
    const active = el[2] > 0
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const lx = cx + (R + 13) * Math.cos(a)
    const ly = cy + (R + 13) * Math.sin(a)
    g += `<text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-family="Inter,sans-serif" font-weight="${active ? '700' : '400'}" font-size="8.5" fill="${active ? '#2B5341' : '#9AA79C'}" opacity="${active ? '1' : '0.5'}">${el[0]}</text>`
  })
  const dp = order.map((el, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    const f = Math.max(el[2], 0.02)
    return [cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)] as [number, number]
  })
  g += `<polygon points="${str(dp)}" fill="#2B5341" fill-opacity="0.30" stroke="#2B5341" stroke-width="1.75" stroke-linejoin="round"/>`
  const et = dp[0]
  g += `<circle cx="${et[0].toFixed(1)}" cy="${et[1].toFixed(1)}" r="4" fill="#F09125"/><circle cx="${et[0].toFixed(1)}" cy="${et[1].toFixed(1)}" r="4" fill="none" stroke="#fff" stroke-width="1.4"/>`
  return (
    <div
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: `<svg width="100%" height="100%" viewBox="0 0 ${S} ${S}" preserveAspectRatio="xMidYMid meet">${g}</svg>` }}
    />
  )
}

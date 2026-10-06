/** Land area and perimeter of a drawn boundary (same maths as the backend and the mobile app). */
const R = 6378137
const rad = (d: number) => (d * Math.PI) / 180

interface P { latitude: number; longitude: number }

export function polygonAreaSqM(c: P[]): number {
  if (c.length < 3) return 0
  let a = 0
  for (let i = 0; i < c.length; i++) {
    const p1 = c[i], p2 = c[(i + 1) % c.length]
    a += rad(p2.longitude - p1.longitude) * (2 + Math.sin(rad(p1.latitude)) + Math.sin(rad(p2.latitude)))
  }
  return Math.abs((a * R * R) / 2)
}

function dist(a: P, b: P): number {
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function polygonPerimeterM(c: P[]): number {
  if (c.length < 2) return 0
  let t = 0
  for (let i = 0; i < c.length; i++) t += dist(c[i], c[(i + 1) % c.length])
  return t
}

// Same rules as the web app (src/narration/geofence.ts, src/features/map/campuses.ts).
export type GeoPoint = { lat: number; lng: number }

export const defaultTriggerRadius = 50
/** Up to this much of the reported GPS error is added to a place's radius. */
const maxAccuracyAllowance = 20

export function distanceMeters(first: GeoPoint, second: GeoPoint) {
  const radians = Math.PI / 180
  const dLat = (second.lat - first.lat) * radians
  const dLng = (second.lng - first.lng) * radians
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(first.lat * radians) * Math.cos(second.lat * radians) * Math.sin(dLng / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function effectiveRadius(place: { triggerRadius?: number }, accuracy: number | null) {
  const allowance = accuracy && Number.isFinite(accuracy) ? Math.min(Math.max(accuracy, 0), maxAccuracyAllowance) : 0
  return (place.triggerRadius ?? defaultTriggerRadius) + allowance
}

export function isInRange(position: GeoPoint | null, place: GeoPoint & { triggerRadius?: number }, accuracy: number | null) {
  return position ? distanceMeters(position, place) <= effectiveRadius(place, accuracy) : false
}

/** The closest place whose trigger radius contains the position, if any. */
export function findPlaceInRange<T extends GeoPoint & { triggerRadius?: number }>(position: GeoPoint | null, places: readonly T[], accuracy: number | null): T | null {
  if (!position) return null
  let best: T | null = null
  let bestDistance = Infinity
  for (const place of places) {
    const distance = distanceMeters(position, place)
    if (distance <= effectiveRadius(place, accuracy) && distance < bestDistance) {
      best = place
      bestDistance = distance
    }
  }
  return best
}

export type CrossingPoint<T> = GeoPoint & { first: T; second: T; kind: 'cross' | 'gap' | 'inside' }

/**
 * Where the scan circles of the two places closest to `position` cross (the crossing nearer
 * the visitor). If the circles do not touch: halfway across the gap; if one is inside the
 * other: midway between the two places. Same rule as src/features/map/crossing.ts.
 */
export function nearestPairCrossing<T extends GeoPoint & { radius?: number }>(position: GeoPoint | null, places: readonly T[]): CrossingPoint<T> | null {
  if (!position || places.length < 2) return null
  const [first, second] = [...places].sort((a, b) => distanceMeters(position, a) - distanceMeters(position, b))
  const r = Math.PI / 180
  const ky = 6_371_000 * r
  const kx = Math.cos(first.lat * r) * ky
  const toLatLng = (x: number, y: number) => ({ lat: first.lat + y / ky, lng: first.lng + x / kx })
  const bx = (second.lng - first.lng) * kx
  const by = (second.lat - first.lat) * ky
  const userX = (position.lng - first.lng) * kx
  const userY = (position.lat - first.lat) * ky
  const d = Math.hypot(bx, by)
  const r1 = first.radius ?? defaultTriggerRadius
  const r2 = second.radius ?? defaultTriggerRadius
  if (d < 1e-6) return { ...toLatLng(0, 0), first, second, kind: 'inside' }
  const ux = bx / d
  const uy = by / d
  if (d > r1 + r2) {
    const along = r1 + (d - r1 - r2) / 2
    return { ...toLatLng(ux * along, uy * along), first, second, kind: 'gap' }
  }
  if (d < Math.abs(r1 - r2)) return { ...toLatLng(bx / 2, by / 2), first, second, kind: 'inside' }
  const a = (d * d + r1 * r1 - r2 * r2) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const p1 = { x: ux * a - uy * h, y: uy * a + ux * h }
  const p2 = { x: ux * a + uy * h, y: uy * a - ux * h }
  const best = Math.hypot(p1.x - userX, p1.y - userY) <= Math.hypot(p2.x - userX, p2.y - userY) ? p1 : p2
  return { ...toLatLng(best.x, best.y), first, second, kind: 'cross' }
}

const compass = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
export function compassDirection(from: GeoPoint, to: GeoPoint) {
  const r = Math.PI / 180
  const y = Math.sin((to.lng - from.lng) * r) * Math.cos(to.lat * r)
  const x = Math.cos(from.lat * r) * Math.sin(to.lat * r) - Math.sin(from.lat * r) * Math.cos(to.lat * r) * Math.cos((to.lng - from.lng) * r)
  return compass[Math.round(((Math.atan2(y, x) / r + 360) % 360) / 45) % 8]
}

export const formatDistance = (meters: number) => (meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`)

export type Campus = { id: string; label: string; address: string; center: readonly [number, number] }
export const campuses: Campus[] = [
  { id: 'main', label: 'Main campus', address: '273 An Dương Vương, Chợ Quán, TP.HCM', center: [10.7598, 106.6822] },
  { id: 'campus-1', label: 'Campus 1', address: '105 Bà Huyện Thanh Quan, Xuân Hòa, TP.HCM', center: [10.7792, 106.6841] },
  { id: 'campus-2', label: 'Campus 2', address: '4 Tôn Đức Thắng, Sài Gòn, TP.HCM', center: [10.7832, 106.7063] },
]

export function campusDirectionsUrl(point: GeoPoint) {
  const campus = campuses.reduce((best, item) =>
    distanceMeters(point, { lat: item.center[0], lng: item.center[1] }) < distanceMeters(point, { lat: best.center[0], lng: best.center[1] }) ? item : best)
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`Trường Đại học Sài Gòn, ${campus.address}`)}`
}

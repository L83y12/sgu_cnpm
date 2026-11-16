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

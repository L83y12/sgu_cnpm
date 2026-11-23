import { defaultTriggerRadius } from '../../narration/geofence'
import { distanceMeters } from './campuses'

type GeoPoint = { lat: number; lng: number }
type RadiusPlace = GeoPoint & { id: number; name: string; radius?: number }

export type CrossingPoint<T extends RadiusPlace = RadiusPlace> = GeoPoint & {
  /** The two places nearest the visitor, nearest first. */
  first: T
  second: T
  /**
   * 'cross': a point where the two scan circles meet (the one closer to the visitor).
   * 'gap': the circles do not touch, so the point is halfway across the gap between them.
   * 'inside': one circle lies inside the other, so the point is midway between the two places.
   */
  kind: 'cross' | 'gap' | 'inside'
}

const earthRadius = 6_371_000
const radians = Math.PI / 180

/**
 * The crossing point of the scan circles of the two places closest to `position`.
 * Works in a flat metre grid around the first place, which is accurate at campus scale.
 */
export function nearestPairCrossing<T extends RadiusPlace>(position: GeoPoint | null, places: readonly T[]): CrossingPoint<T> | null {
  if (!position) return null
  const usable = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
  if (usable.length < 2) return null
  const [first, second] = [...usable]
    .map((place) => ({ place, distance: distanceMeters(position, place) }))
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.place)

  const scale = Math.cos(first.lat * radians) * earthRadius * radians
  const toXY = (point: GeoPoint) => ({ x: (point.lng - first.lng) * scale, y: (point.lat - first.lat) * earthRadius * radians })
  const toLatLng = (x: number, y: number) => ({ lat: first.lat + y / (earthRadius * radians), lng: first.lng + x / scale })

  const b = toXY(second)
  const user = toXY(position)
  const d = Math.hypot(b.x, b.y)
  const r1 = first.radius ?? defaultTriggerRadius
  const r2 = second.radius ?? defaultTriggerRadius
  if (d < 1e-6) return { ...toLatLng(0, 0), first, second, kind: 'inside' }
  const ux = b.x / d
  const uy = b.y / d

  if (d > r1 + r2) {
    const along = r1 + (d - r1 - r2) / 2
    return { ...toLatLng(ux * along, uy * along), first, second, kind: 'gap' }
  }
  if (d < Math.abs(r1 - r2)) return { ...toLatLng(b.x / 2, b.y / 2), first, second, kind: 'inside' }

  // Two circles meet at two points, mirrored across the line joining their centres.
  const a = (d * d + r1 * r1 - r2 * r2) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const mx = ux * a
  const my = uy * a
  const candidates = [
    { x: mx - uy * h, y: my + ux * h },
    { x: mx + uy * h, y: my - ux * h },
  ]
  const best = candidates.reduce((closest, point) =>
    Math.hypot(point.x - user.x, point.y - user.y) < Math.hypot(closest.x - user.x, closest.y - user.y) ? point : closest)
  return { ...toLatLng(best.x, best.y), first, second, kind: 'cross' }
}

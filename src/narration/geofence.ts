export type GeoPoint = { lat: number; lng: number }

export const defaultTriggerRadius = 50
/** Up to this much of the reported GPS error is added to a place's radius. */
const maxAccuracyAllowance = 20

function effectiveRadius(place: { triggerRadius?: number }, accuracy: number | null | undefined) {
  const allowance = accuracy && Number.isFinite(accuracy) ? Math.min(Math.max(accuracy, 0), maxAccuracyAllowance) : 0
  return (place.triggerRadius ?? defaultTriggerRadius) + allowance
}

/** Great-circle distance in metres. */
export function distanceMeters(first: GeoPoint, second: GeoPoint) {
  const radians = Math.PI / 180
  const latitudeDifference = (second.lat - first.lat) * radians
  const longitudeDifference = (second.lng - first.lng) * radians
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(first.lat * radians) * Math.cos(second.lat * radians) * Math.sin(longitudeDifference / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

type GeofencePlace = GeoPoint & { id: number; triggerRadius?: number }

export function isInRange(position: GeoPoint | null, place: GeofencePlace, accuracy?: number | null) {
  if (!position || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return false
  return distanceMeters(position, place) <= effectiveRadius(place, accuracy)
}

/** The closest place whose trigger radius contains the position, if any. */
export function findPlaceInRange<T extends GeofencePlace>(position: GeoPoint | null, places: readonly T[], accuracy?: number | null): T | null {
  if (!position) return null
  let best: T | null = null
  let bestDistance = Infinity
  for (const place of places) {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
    const distance = distanceMeters(position, place)
    if (distance <= effectiveRadius(place, accuracy) && distance < bestDistance) {
      best = place
      bestDistance = distance
    }
  }
  return best
}

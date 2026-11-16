import type { CampusId } from '../poi/data/demoPlaces'

export type Campus = {
  id: CampusId
  label: 'mainCampus' | 'campusOne' | 'campusTwo'
  address: string
  center: readonly [number, number]
}

export const campuses: Campus[] = [
  { id: 'main', label: 'mainCampus', address: '273 An Dương Vương, Chợ Quán, TP.HCM', center: [10.7598, 106.6822] },
  { id: 'campus-1', label: 'campusOne', address: '105 Bà Huyện Thanh Quan, Xuân Hòa, TP.HCM', center: [10.7792, 106.6841] },
  { id: 'campus-2', label: 'campusTwo', address: '4 Tôn Đức Thắng, Sài Gòn, TP.HCM', center: [10.7832, 106.7063] },
]

export function distanceMeters(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const radians = Math.PI / 180
  const latitudeDifference = (second.lat - first.lat) * radians
  const longitudeDifference = (second.lng - first.lng) * radians
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(first.lat * radians) * Math.cos(second.lat * radians) * Math.sin(longitudeDifference / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

/** Google Maps directions to the campus that contains this point. Google cannot route to a
 * spot inside the campus (it snaps to the university), so the link targets the campus itself. */
export function campusDirectionsUrl(point: { lat: number; lng: number }) {
  const campus = campuses.reduce((best, item) =>
    distanceMeters(point, { lat: item.center[0], lng: item.center[1] }) < distanceMeters(point, { lat: best.center[0], lng: best.center[1] }) ? item : best)
  const destination = `Trường Đại học Sài Gòn, ${campus.address}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

const compass = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

/** Compass direction (8 points) from one point to another. */
export function compassDirection(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radians = Math.PI / 180
  const y = Math.sin((to.lng - from.lng) * radians) * Math.cos(to.lat * radians)
  const x = Math.cos(from.lat * radians) * Math.sin(to.lat * radians)
    - Math.sin(from.lat * radians) * Math.cos(to.lat * radians) * Math.cos((to.lng - from.lng) * radians)
  const bearing = (Math.atan2(y, x) / radians + 360) % 360
  return compass[Math.round(bearing / 45) % 8]
}

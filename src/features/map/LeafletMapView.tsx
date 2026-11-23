import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { translate, type Locale, type TranslationKey } from '../../i18n/translations'
import { defaultTriggerRadius } from '../../narration/geofence'
import type { LatLng, LeafletCircleMarker, LeafletMap, LeafletMarker, LeafletPolyline } from './leafletLoader'
import { campusDirectionsUrl, compassDirection, distanceMeters, formatDistance } from './campuses'
import { nearestPairCrossing, type CrossingPoint } from './crossing'
import { loadLeaflet } from './leafletLoader'

export type MapPoi = {
  id: number
  name: string
  category: string
  location: string
  lat: number
  lng: number
  /** Scan (trigger) radius in metres; drawn as a ring around the pin. */
  radius?: number
}

const markerIcons: Record<string, string> = {
  'Kiến trúc': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01"/></svg>',
  'Học tập': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v17H5.5A2.5 2.5 0 0 0 3 22V5.5ZM21 5.5A2.5 2.5 0 0 0 18.5 3H12v17h6.5a2.5 2.5 0 0 1 2.5 2V5.5Z"/></svg>',
  'Ẩm thực': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v7m-3-7v4a3 3 0 0 0 6 0V2m-3 7v13m9-20v20m0-20c3 2 4 5 4 8h-4"/></svg>',
  'Không gian xanh': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22v-8m0 0c-6 0-9-4-9-9 5 0 9 3 9 9Zm0-4c0-6 3-10 9-11 0 6-3 10-9 11Z"/></svg>',
  'Thể thao': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 3 3.5 5.5-2 6.5h-6L5 9m10.5-.5L21 9m-7.5 6 4 5m-6-5-5 5"/></svg>',
  default: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>',
}

// POI categories come from the database in English; the icon sets are keyed by the original names.
const categoryAliases: Record<string, string> = {
  Architecture: 'Kiến trúc', Study: 'Học tập', Food: 'Ẩm thực', Sports: 'Thể thao', 'Green spaces': 'Không gian xanh',
}
const canonicalCategory = (category: string) => categoryAliases[category] ?? category

const markerClasses: Record<string, string> = {
  'Kiến trúc': 'architecture',
  'Học tập': 'study',
  'Ẩm thực': 'food',
  'Không gian xanh': 'green',
  'Thể thao': 'sports',
}

// Ring colours match the pin colours in App.css.
const circleColors: Record<string, string> = {
  architecture: '#2563a8', study: '#7042a6', food: '#c45a18', green: '#28734d', sports: '#bd4b25', default: '#397de0',
}

function circleStyle(place: MapPoi, variant: 'category' | 'guide', active: boolean) {
  const color = variant === 'guide'
    ? (active ? '#e0352b' : '#2f6fdb')
    : circleColors[markerClasses[canonicalCategory(place.category)] ?? 'default']
  return { color, fillColor: color, weight: active ? 2.5 : 1.5, opacity: 0.75, fillOpacity: active ? 0.14 : 0.07, dashArray: active ? undefined : '4 4' }
}


function makeCrossingContent(crossing: CrossingPoint<MapPoi>, language: Locale, userPosition: { lat: number; lng: number } | null) {
  const content = document.createElement('div')
  content.className = 'leaflet-map-info'
  const title = document.createElement('strong')
  title.textContent = translate(language, 'crossingTitle')
  const detail = document.createElement('span')
  const key = crossing.kind === 'cross' ? 'crossingMeet' : crossing.kind === 'gap' ? 'crossingGap' : 'crossingInside'
  detail.textContent = translate(language, key, { first: crossing.first.name, second: crossing.second.name })
  content.append(title, detail)
  if (userPosition) {
    const distance = document.createElement('span')
    distance.textContent = translate(language, 'crossingDistance', { distance: formatDistance(distanceMeters(userPosition, crossing)) })
    content.append(distance)
  }
  return content
}

const categoryTranslationKeys: Record<string, TranslationKey> = {
  'Kiến trúc': 'architecture',
  'Học tập': 'study',
  'Ẩm thực': 'food',
  'Không gian xanh': 'green',
  'Thể thao': 'sports',
}

function makeInfoContent(place: MapPoi, language: Locale) {
  const content = document.createElement('div')
  content.className = 'leaflet-map-info'
  const title = document.createElement('strong')
  title.textContent = place.name
  const category = document.createElement('span')
  const categoryKey = categoryTranslationKeys[canonicalCategory(place.category)]
  category.textContent = `${categoryKey ? translate(language, categoryKey) : place.category} · ${place.location}`
  const directions = document.createElement('a')
  directions.href = campusDirectionsUrl(place)
  directions.target = '_blank'
  directions.rel = 'noreferrer'
  directions.textContent = translate(language, 'directions')
  content.append(title, category, directions)
  return content
}

function makePlaceIcon(L: NonNullable<typeof window.L>, place: MapPoi, variant: 'category' | 'guide', active: boolean) {
  if (variant === 'guide') {
    return L.divIcon({
      className: `leaflet-poi-icon leaflet-poi-icon--guide${active ? ' is-active' : ''}`,
      html: `<span><b>${markerIcons.default}</b></span>`,
      iconSize: active ? [44, 50] : [34, 40],
      iconAnchor: active ? [22, 48] : [17, 38],
      popupAnchor: [0, -34],
    })
  }
  const markerClass = markerClasses[canonicalCategory(place.category)] ?? 'default'
  return L.divIcon({
    className: `leaflet-poi-icon leaflet-poi-icon--${markerClass}`,
    html: `<span><b>${markerIcons[canonicalCategory(place.category)] ?? markerIcons.default}</b></span>`,
    iconSize: [38, 44],
    iconAnchor: [19, 42],
    popupAnchor: [0, -38],
  })
}

export function LeafletMapView({ places, selectedPlaceId, onSelectPlace, center, language, userPosition, userAccuracy, tracking, geoMessage, onToggleLocate, variant = 'category', activePlaceId = null, routeTarget = null }: {
  places: readonly MapPoi[]
  selectedPlaceId: number | null
  onSelectPlace: (place: MapPoi) => void
  center: LatLng
  language: Locale
  userPosition: { lat: number; lng: number } | null
  userAccuracy: number | null
  tracking: boolean
  geoMessage: string
  onToggleLocate: () => void
  /** 'guide': every pin is blue, and the active place (activePlaceId) is red. */
  variant?: 'category' | 'guide'
  activePlaceId?: number | null
  /** Draws a straight line from the visitor to this place (until they are within its radius). */
  routeTarget?: { lat: number; lng: number; name: string; radius: number } | null
}) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LeafletMap | null>(null)
  const markers = useRef(new Map<number, LeafletMarker>())
  const circles = useRef(new Map<number, LeafletCircleMarker>())
  const crossingMarker = useRef<LeafletMarker | null>(null)
  const userMarker = useRef<LeafletCircleMarker | null>(null)
  const accuracyCircle = useRef<LeafletCircleMarker | null>(null)
  const centeredOnUser = useRef(false)
  const variantRef = useRef(variant)
  const activeRef = useRef(activePlaceId)
  const lastActive = useRef<number | null>(null)
  const syncUserRef = useRef<() => void>(() => {})
  const languageRef = useRef(language)
  const onSelectPlaceRef = useRef(onSelectPlace)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    languageRef.current = language
    onSelectPlaceRef.current = onSelectPlace
  }, [language, onSelectPlace])

  useEffect(() => {
    let cancelled = false
    let activeMap: LeafletMap | null = null
    const activeMarkers = markers.current
    const activeCircles = circles.current
    void loadLeaflet().then((L) => {
      if (cancelled || !mapElement.current) return
      const map = L.map(mapElement.current, {
        scrollWheelZoom: true,
        attributionControl: false,
      }).setView(center, 18)
      activeMap = map
      mapInstance.current = map
      L.control.attribution({ prefix: false }).addTo(map)
      L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · <a href="https://tile.openstreetmap.de/" target="_blank" rel="noreferrer">tiles</a>',
      }).addTo(map)
      L.control.scale({ imperial: false }).addTo(map)

      places.forEach((place) => {
        const isActive = place.id === activeRef.current
        const circle = L.circle([place.lat, place.lng], { radius: place.radius ?? defaultTriggerRadius, interactive: false, ...circleStyle(place, variantRef.current, isActive) })
          .addTo(map)
        activeCircles.set(place.id, circle)
        const icon = makePlaceIcon(L, place, variantRef.current, isActive)
        const marker = L.marker([place.lat, place.lng], { title: place.name, icon, zIndexOffset: isActive ? 1000 : 0 })
          .addTo(map)
          .bindPopup(makeInfoContent(place, languageRef.current))
          .on('click', () => onSelectPlaceRef.current(place))
        activeMarkers.set(place.id, marker)
      })
      lastActive.current = activeRef.current
      setStatus('ready')
      syncUserRef.current()
    }).catch(() => {
      if (cancelled) return
      setMessage(translate(languageRef.current, 'mapLoadError'))
      setStatus('error')
    })

    return () => {
      cancelled = true
      if (mapInstance.current === activeMap) mapInstance.current = null
      activeMarkers.clear()
      activeCircles.clear()
      crossingMarker.current = null
      userMarker.current = null
      accuracyCircle.current = null
      activeMap?.remove()
    }
  }, [center, places])

  useEffect(() => {
    if (status !== 'ready') return
    places.forEach((place) => {
      markers.current.get(place.id)?.setPopupContent(makeInfoContent(place, language))
    })
  }, [language, places, status])

  useEffect(() => {
    if (!selectedPlaceId || !mapInstance.current) return
    const place = places.find((item) => item.id === selectedPlaceId)
    if (!place) return
    mapInstance.current.panTo([place.lat, place.lng])
    if (variantRef.current !== 'guide') markers.current.get(place.id)?.openPopup()
  }, [places, selectedPlaceId, status])

  // Guide map: recolor the pins when the active place changes, without rebuilding the map.
  useEffect(() => {
    activeRef.current = activePlaceId
    const L = window.L
    if (status !== 'ready' || !L || variantRef.current !== 'guide') return
    for (const id of [lastActive.current, activePlaceId]) {
      if (id === null) continue
      const place = places.find((item) => item.id === id)
      const marker = markers.current.get(id)
      if (!place || !marker) continue
      const active = id === activePlaceId
      marker.setIcon(makePlaceIcon(L, place, 'guide', active)).setZIndexOffset(active ? 1000 : 0)
      circles.current.get(id)?.setStyle(circleStyle(place, 'guide', active))
    }
    lastActive.current = activePlaceId
  }, [activePlaceId, places, status])

  // Draw (or move) the visitor's marker and accuracy circle. The position itself is
  // tracked by the app shell, so it keeps updating while other pages are open.
  const syncUserMarker = useCallback(() => {
    const map = mapInstance.current
    const L = window.L
    if (!map || !L) return
    if (!userPosition) {
      if (userMarker.current) map.removeLayer(userMarker.current)
      if (accuracyCircle.current) map.removeLayer(accuracyCircle.current)
      userMarker.current = null
      accuracyCircle.current = null
      return
    }
    const point: LatLng = [userPosition.lat, userPosition.lng]
    const label = userAccuracy === null
      ? translate(language, 'currentLocation')
      : `${translate(language, 'currentLocation')} · ${translate(language, 'accuracy', { meters: Math.round(userAccuracy) })}`
    if (userAccuracy !== null) {
      if (accuracyCircle.current) accuracyCircle.current.setLatLng(point).setRadius(userAccuracy)
      else accuracyCircle.current = L.circle(point, { radius: userAccuracy, color: '#4285f4', weight: 1, fillColor: '#4285f4', fillOpacity: 0.12, interactive: false }).addTo(map)
    }
    if (userMarker.current) {
      userMarker.current.setLatLng(point).setPopupContent(label)
    } else {
      userMarker.current = L.circleMarker(point, { radius: 8, color: '#fff', weight: 4, fillColor: '#4285f4', fillOpacity: 1 })
        .addTo(map)
        .bindPopup(label)
    }
    if (!centeredOnUser.current) {
      centeredOnUser.current = true
      map.setView(point, 18)
      userMarker.current.openPopup()
    }
  }, [language, userAccuracy, userPosition])

  useEffect(() => { syncUserRef.current = syncUserMarker }, [syncUserMarker])
  useEffect(() => { if (tracking) centeredOnUser.current = false }, [tracking])
  useEffect(() => { if (status === 'ready') syncUserMarker() }, [status, syncUserMarker, tracking])

  // In-campus guidance: dashed line from the visitor to the target place.
  const routeLine = useRef<LeafletPolyline | null>(null)
  const route = userPosition && routeTarget
    ? { distance: distanceMeters(userPosition, routeTarget), direction: compassDirection(userPosition, routeTarget) }
    : null
  const showRoute = Boolean(route && routeTarget && route.distance > routeTarget.radius && route.distance < 5000)
  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (status !== 'ready' || !map || !L) return
    if (!showRoute || !userPosition || !routeTarget) {
      if (routeLine.current) map.removeLayer(routeLine.current)
      routeLine.current = null
      return
    }
    const points: LatLng[] = [[userPosition.lat, userPosition.lng], [routeTarget.lat, routeTarget.lng]]
    if (routeLine.current) routeLine.current.setLatLngs(points)
    else routeLine.current = L.polyline(points, { color: '#e0352b', weight: 4, opacity: 0.85, dashArray: '8 8', interactive: false }).addTo(map)
  }, [routeTarget, showRoute, status, userPosition])

  // Yellow POI pin: where the scan circles of the two places nearest the visitor's GPS cross.
  const crossing = useMemo(() => nearestPairCrossing(userPosition, places), [places, userPosition])
  useEffect(() => {
    const map = mapInstance.current
    const L = window.L
    if (status !== 'ready' || !map || !L) return
    if (!crossing) {
      if (crossingMarker.current) map.removeLayer(crossingMarker.current)
      crossingMarker.current = null
      return
    }
    const point: LatLng = [crossing.lat, crossing.lng]
    const content = makeCrossingContent(crossing, language, userPosition)
    if (crossingMarker.current) {
      crossingMarker.current.setLatLng(point).setPopupContent(content)
    } else {
      crossingMarker.current = L.marker(point, {
        title: translate(language, 'crossingTitle'),
        zIndexOffset: 2000,
        // Same pin as the other POIs, in yellow, because it is a POI of its own.
        icon: L.divIcon({ className: 'leaflet-poi-icon leaflet-poi-icon--crossing', html: `<span><b>${markerIcons.default}</b></span>`, iconSize: [38, 44], iconAnchor: [19, 42], popupAnchor: [0, -38] }),
      }).addTo(map).bindPopup(content)
    }
  }, [crossing, language, status, userPosition])

  return <div className="leaflet-map-shell">
    <div className="leaflet-map-canvas" ref={mapElement} aria-label={translate(language, 'mapTitle')} />
    {status !== 'ready' && <div className="leaflet-map-placeholder" role={status === 'error' ? 'alert' : 'status'}>
      <span className="leaflet-map-placeholder-icon">{status === 'loading' ? '…' : '◎'}</span>
      <strong>{status === 'loading' ? translate(language, 'placesLoading') : translate(language, 'loadError')}</strong>
      {status === 'error' && <p>{message}</p>}
      {status === 'error' && <button onClick={() => window.location.reload()}>{translate(language, 'retry')}</button>}
    </div>}
    <button className={`leaflet-map-locate${tracking ? ' is-tracking' : ''}`} onClick={onToggleLocate} aria-label={translate(language, tracking ? 'stopTracking' : 'locateMeAria')} aria-pressed={tracking}>⌖ <span>{translate(language, tracking ? 'geoTracking' : 'locateMe')}</span></button>
    {geoMessage && status === 'ready' && <div className="leaflet-map-message" role="status">{geoMessage}</div>}
    {showRoute && route && routeTarget && status === 'ready' && <div className="leaflet-route-label" role="status">{translate(language, 'routeHint', { distance: formatDistance(route.distance), direction: translate(language, `dir_${route.direction.replace('-', '_')}` as TranslationKey), name: routeTarget.name })}</div>}
  </div>
}

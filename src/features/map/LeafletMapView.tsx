import { useEffect, useRef, useState } from 'react'
import { translate, type Locale, type TranslationKey } from '../../i18n/translations'

export type MapPoi = {
  id: number
  name: string
  category: string
  location: string
  lat: number
  lng: number
}

type LatLng = readonly [number, number]
type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker
  bindPopup: (content: HTMLElement | string) => LeafletMarker
  setPopupContent: (content: HTMLElement | string) => LeafletMarker
  openPopup: () => LeafletMarker
  on: (event: 'click', listener: () => void) => LeafletMarker
}
type LeafletCircleMarker = {
  addTo: (map: LeafletMap) => LeafletCircleMarker
  bindPopup: (content: HTMLElement | string) => LeafletCircleMarker
  setLatLng: (position: LatLng) => LeafletCircleMarker
  openPopup: () => LeafletCircleMarker
}
type LeafletMap = {
  setView: (center: LatLng, zoom: number) => LeafletMap
  panTo: (center: LatLng) => LeafletMap
  setZoom: (zoom: number) => LeafletMap
  remove: () => void
  removeLayer: (layer: LeafletCircleMarker) => LeafletMap
}
type LeafletApi = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  marker: (position: LatLng, options?: Record<string, unknown>) => LeafletMarker
  circleMarker: (position: LatLng, options?: Record<string, unknown>) => LeafletCircleMarker
  divIcon: (options: Record<string, unknown>) => unknown
  control: {
    attribution: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
    scale: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  }
}

const markerIcons: Record<string, string> = {
  'Kiến trúc': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01"/></svg>',
  'Học tập': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H12v17H5.5A2.5 2.5 0 0 0 3 22V5.5ZM21 5.5A2.5 2.5 0 0 0 18.5 3H12v17h6.5a2.5 2.5 0 0 1 2.5 2V5.5Z"/></svg>',
  'Ẩm thực': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v7m-3-7v4a3 3 0 0 0 6 0V2m-3 7v13m9-20v20m0-20c3 2 4 5 4 8h-4"/></svg>',
  'Không gian xanh': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22v-8m0 0c-6 0-9-4-9-9 5 0 9 3 9 9Zm0-4c0-6 3-10 9-11 0 6-3 10-9 11Z"/></svg>',
  'Thể thao': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m12 3 3.5 5.5-2 6.5h-6L5 9m10.5-.5L21 9m-7.5 6 4 5m-6-5-5 5"/></svg>',
  default: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>',
}

const markerClasses: Record<string, string> = {
  'Kiến trúc': 'architecture',
  'Học tập': 'study',
  'Ẩm thực': 'food',
  'Không gian xanh': 'green',
  'Thể thao': 'sports',
}

declare global {
  interface Window { L?: LeafletApi }
}

let leafletLoader: Promise<LeafletApi> | null = null

function loadLeaflet(): Promise<LeafletApi> {
  if (window.L) return Promise.resolve(window.L)
  if (leafletLoader) return leafletLoader

  const loading = new Promise<LeafletApi>((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const stylesheet = document.createElement('link')
      stylesheet.rel = 'stylesheet'
      stylesheet.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      stylesheet.dataset.leafletCss = 'true'
      document.head.appendChild(stylesheet)
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-leaflet-js]')
    if (existingScript) {
      existingScript.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('Leaflet chưa sẵn sàng.')), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Không tải được thư viện bản đồ. Hãy kiểm tra kết nối mạng.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.dataset.leafletJs = 'true'
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Leaflet đã tải nhưng chưa sẵn sàng.'))
    script.onerror = () => reject(new Error('Không tải được thư viện bản đồ. Hãy kiểm tra kết nối mạng.'))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    leafletLoader = null
    throw error
  })
  leafletLoader = loading
  return loading
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
  category.textContent = `${translate(language, categoryTranslationKeys[place.category] ?? 'category')} · ${place.location}`
  const directions = document.createElement('a')
  directions.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  directions.target = '_blank'
  directions.rel = 'noreferrer'
  directions.textContent = translate(language, 'directions')
  content.append(title, category, directions)
  return content
}

export function LeafletMapView({ places, selectedPlaceId, onSelectPlace, center, language, onLocate }: {
  places: readonly MapPoi[]
  selectedPlaceId: number | null
  onSelectPlace: (place: MapPoi) => void
  center: LatLng
  language: Locale
  onLocate: (position: { lat: number; lng: number }) => void
}) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LeafletMap | null>(null)
  const markers = useRef(new Map<number, LeafletMarker>())
  const userMarker = useRef<LeafletCircleMarker | null>(null)
  const userPosition = useRef<LatLng | null>(null)
  const watchId = useRef<number | null>(null)
  const languageRef = useRef(language)
  const onSelectPlaceRef = useRef(onSelectPlace)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [tracking, setTracking] = useState(false)

  useEffect(() => {
    languageRef.current = language
    onSelectPlaceRef.current = onSelectPlace
  }, [language, onSelectPlace])

  useEffect(() => {
    let cancelled = false
    let activeMap: LeafletMap | null = null
    const activeMarkers = markers.current
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
        const markerClass = markerClasses[place.category] ?? 'default'
        const icon = L.divIcon({
          className: `leaflet-poi-icon leaflet-poi-icon--${markerClass}`,
          html: `<span><b>${markerIcons[place.category] ?? markerIcons.default}</b></span>`,
          iconSize: [38, 44],
          iconAnchor: [19, 42],
          popupAnchor: [0, -38],
        })
        const marker = L.marker([place.lat, place.lng], { title: place.name, icon })
          .addTo(map)
          .bindPopup(makeInfoContent(place, languageRef.current))
          .on('click', () => onSelectPlaceRef.current(place))
        activeMarkers.set(place.id, marker)
      })
      if (userPosition.current) {
        userMarker.current = L.circleMarker(userPosition.current, {
          radius: 8,
          color: '#fff',
          weight: 4,
          fillColor: '#4285f4',
          fillOpacity: 1,
        }).addTo(map).bindPopup(translate(languageRef.current, 'currentLocation'))
      }
      setStatus('ready')
    }).catch(() => {
      if (cancelled) return
      setMessage(translate(languageRef.current, 'mapLoadError'))
      setStatus('error')
    })

    return () => {
      cancelled = true
      if (mapInstance.current === activeMap) mapInstance.current = null
      activeMarkers.clear()
      userMarker.current = null
      activeMap?.remove()
    }
  }, [center, places])

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
  }, [])

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
    markers.current.get(place.id)?.openPopup()
  }, [places, selectedPlaceId, status])

  function locateMe() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
      setTracking(false)
      setMessage('')
      return
    }
    if (!window.isSecureContext) {
      setMessage(translate(language, 'geoSecureContext'))
      return
    }
    if (!navigator.geolocation) {
      setMessage(translate(language, 'geoUnsupported'))
      return
    }
    setMessage('')
    watchId.current = navigator.geolocation.watchPosition((position) => {
      const map = mapInstance.current
      const currentPosition: LatLng = [position.coords.latitude, position.coords.longitude]
      userPosition.current = currentPosition
      onLocate({ lat: position.coords.latitude, lng: position.coords.longitude })
      if (!map || !window.L) return
      if (userMarker.current) {
        userMarker.current.setLatLng(currentPosition).openPopup()
      } else {
        userMarker.current = window.L.circleMarker(currentPosition, {
          radius: 8,
          color: '#fff',
          weight: 4,
          fillColor: '#4285f4',
          fillOpacity: 1,
        }).addTo(map).bindPopup(translate(language, 'currentLocation')).openPopup()
      }
      map.panTo(currentPosition)
      map.setZoom(18)
      setMessage('')
    }, (error) => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
      setTracking(false)
      setMessage(error.code === error.PERMISSION_DENIED
        ? translate(language, 'geoPermission')
        : translate(language, 'geoError'))
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
    setTracking(true)
  }

  return <div className="leaflet-map-shell">
    <div className="leaflet-map-canvas" ref={mapElement} aria-label={translate(language, 'mapTitle')} />
    {status !== 'ready' && <div className="leaflet-map-placeholder" role={status === 'error' ? 'alert' : 'status'}>
      <span className="leaflet-map-placeholder-icon">{status === 'loading' ? '…' : '◎'}</span>
      <strong>{status === 'loading' ? translate(language, 'placesLoading') : translate(language, 'loadError')}</strong>
      {status === 'error' && <p>{message}</p>}
      {status === 'error' && <button onClick={() => window.location.reload()}>{translate(language, 'retry')}</button>}
    </div>}
    <button className={`leaflet-map-locate${tracking ? ' is-tracking' : ''}`} onClick={locateMe} aria-label={translate(language, tracking ? 'stopTracking' : 'locateMeAria')} aria-pressed={tracking}>⌖ <span>{translate(language, tracking ? 'geoTracking' : 'locateMe')}</span></button>
    {message && status === 'ready' && <div className="leaflet-map-message" role="status">{message}</div>}
  </div>
}

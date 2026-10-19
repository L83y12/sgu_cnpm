import { useEffect, useRef, useState } from 'react'

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
  openPopup: () => LeafletMarker
  on: (event: 'click', listener: () => void) => LeafletMarker
}
type LeafletMap = {
  setView: (center: LatLng, zoom: number) => LeafletMap
  panTo: (center: LatLng) => LeafletMap
  setZoom: (zoom: number) => LeafletMap
  remove: () => void
}
type LeafletApi = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  marker: (position: LatLng, options?: Record<string, unknown>) => LeafletMarker
  circleMarker: (position: LatLng, options?: Record<string, unknown>) => LeafletMarker
  divIcon: (options: Record<string, unknown>) => unknown
  control: { scale: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void } }
}

declare global {
  interface Window { L?: LeafletApi }
}

let leafletLoader: Promise<LeafletApi> | null = null

function loadLeaflet(): Promise<LeafletApi> {
  if (window.L) return Promise.resolve(window.L)
  if (leafletLoader) return leafletLoader

  leafletLoader = new Promise((resolve, reject) => {
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
  return leafletLoader
}

function makeInfoContent(place: MapPoi) {
  const content = document.createElement('div')
  content.className = 'leaflet-map-info'
  const title = document.createElement('strong')
  title.textContent = place.name
  const category = document.createElement('span')
  category.textContent = `${place.category} · ${place.location}`
  const directions = document.createElement('a')
  directions.href = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  directions.target = '_blank'
  directions.rel = 'noreferrer'
  directions.textContent = 'Chỉ đường ↗'
  content.append(title, category, directions)
  return content
}

export function LeafletMapView({ places, selectedPlaceId, onSelectPlace, center }: {
  places: readonly MapPoi[]
  selectedPlaceId: number | null
  onSelectPlace: (place: MapPoi) => void
  center: LatLng
}) {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<LeafletMap | null>(null)
  const markers = useRef(new Map<number, LeafletMarker>())
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    let activeMap: LeafletMap | null = null
    void loadLeaflet().then((L) => {
      if (cancelled || !mapElement.current) return
      const map = L.map(mapElement.current, { scrollWheelZoom: true }).setView(center, 18)
      activeMap = map
      mapInstance.current = map
      L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · <a href="https://tile.openstreetmap.de/" target="_blank" rel="noreferrer">OSM tile server</a>',
      }).addTo(map)
      L.control.scale({ imperial: false }).addTo(map)

      places.forEach((place, index) => {
        const icon = L.divIcon({
          className: 'leaflet-poi-icon',
          html: `<span><b>${index + 1}</b></span>`,
          iconSize: [38, 44],
          iconAnchor: [19, 42],
          popupAnchor: [0, -38],
        })
        const marker = L.marker([place.lat, place.lng], { title: place.name, icon })
          .addTo(map)
          .bindPopup(makeInfoContent(place))
          .on('click', () => onSelectPlace(place))
        markers.current.set(place.id, marker)
      })
      setStatus('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      setMessage(error instanceof Error ? error.message : 'Không tải được bản đồ.')
      setStatus('error')
    })

    return () => {
      cancelled = true
      if (mapInstance.current === activeMap) mapInstance.current = null
      markers.current.clear()
      activeMap?.remove()
    }
  }, [center, onSelectPlace, places])

  useEffect(() => {
    if (!selectedPlaceId || !mapInstance.current) return
    const place = places.find((item) => item.id === selectedPlaceId)
    if (!place) return
    mapInstance.current.panTo([place.lat, place.lng])
    markers.current.get(place.id)?.openPopup()
  }, [places, selectedPlaceId, status])

  function locateMe() {
    if (!navigator.geolocation) {
      setMessage('Trình duyệt này không hỗ trợ định vị.')
      return
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const map = mapInstance.current
      if (!map || !window.L) return
      const currentPosition: LatLng = [position.coords.latitude, position.coords.longitude]
      window.L.circleMarker(currentPosition, {
        radius: 8,
        color: '#fff',
        weight: 4,
        fillColor: '#4285f4',
        fillOpacity: 1,
      }).addTo(map).bindPopup('Vị trí hiện tại của bạn').openPopup()
      map.panTo(currentPosition)
      map.setZoom(18)
      setMessage('')
    }, (error) => {
      setMessage(error.code === error.PERMISSION_DENIED
        ? 'Bạn chưa cấp quyền truy cập vị trí cho trình duyệt.'
        : 'Không lấy được vị trí hiện tại. Hãy thử lại hoặc kiểm tra cài đặt vị trí.')
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 })
  }

  return <div className="leaflet-map-shell">
    <div className="leaflet-map-canvas" ref={mapElement} aria-label="Bản đồ OpenStreetMap khuôn viên SGU" />
    {status !== 'ready' && <div className="leaflet-map-placeholder" role={status === 'error' ? 'alert' : 'status'}>
      <span className="leaflet-map-placeholder-icon">{status === 'loading' ? '…' : '◎'}</span>
      <strong>{status === 'loading' ? 'Đang tải bản đồ thật…' : 'Chưa tải được bản đồ'}</strong>
      {status === 'error' && <p>{message}</p>}
      {status === 'error' && <button onClick={() => window.location.reload()}>Tải lại trang</button>}
    </div>}
    <button className="leaflet-map-locate" onClick={locateMe} aria-label="Dùng vị trí hiện tại">⌖ <span>Vị trí của tôi</span></button>
    {message && status === 'ready' && <div className="leaflet-map-message" role="status">{message}</div>}
  </div>
}

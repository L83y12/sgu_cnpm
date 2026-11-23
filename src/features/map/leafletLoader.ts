export type LatLng = readonly [number, number]
export type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker
  bindPopup: (content: HTMLElement | string) => LeafletMarker
  setPopupContent: (content: HTMLElement | string) => LeafletMarker
  openPopup: () => LeafletMarker
  setIcon: (icon: unknown) => LeafletMarker
  setZIndexOffset: (offset: number) => LeafletMarker
  setLatLng: (position: LatLng) => LeafletMarker
  on: (event: 'click', listener: () => void) => LeafletMarker
}
export type LeafletCircleMarker = {
  addTo: (map: LeafletMap) => LeafletCircleMarker
  bindPopup: (content: HTMLElement | string) => LeafletCircleMarker
  setLatLng: (position: LatLng) => LeafletCircleMarker
  setRadius: (radius: number) => LeafletCircleMarker
  setStyle: (style: Record<string, unknown>) => LeafletCircleMarker
  bringToBack: () => LeafletCircleMarker
  on: (event: 'click', listener: () => void) => LeafletCircleMarker
  bindTooltip: (content: string, options?: Record<string, unknown>) => LeafletCircleMarker
  setPopupContent: (content: string) => LeafletCircleMarker
  openPopup: () => LeafletCircleMarker
}
export type LeafletMap = {
  setView: (center: LatLng, zoom: number) => LeafletMap
  panTo: (center: LatLng) => LeafletMap
  setZoom: (zoom: number) => LeafletMap
  fitBounds: (points: readonly LatLng[], options?: Record<string, unknown>) => LeafletMap
  remove: () => void
  removeLayer: (layer: LeafletMarker | LeafletCircleMarker | LeafletPolyline) => LeafletMap
}
export type LeafletPolyline = {
  addTo: (map: LeafletMap) => LeafletPolyline
  setLatLngs: (points: readonly LatLng[]) => LeafletPolyline
}
export type LeafletApi = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap
  tileLayer: (url: string, options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  marker: (position: LatLng, options?: Record<string, unknown>) => LeafletMarker
  circleMarker: (position: LatLng, options?: Record<string, unknown>) => LeafletCircleMarker
  circle: (position: LatLng, options?: Record<string, unknown>) => LeafletCircleMarker
  divIcon: (options: Record<string, unknown>) => unknown
  polyline: (points: readonly LatLng[], options?: Record<string, unknown>) => LeafletPolyline
  control: {
    attribution: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
    scale: (options: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  }
}

declare global {
  interface Window { L?: LeafletApi }
}

let leafletLoader: Promise<LeafletApi> | null = null

export function loadLeaflet(): Promise<LeafletApi> {
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

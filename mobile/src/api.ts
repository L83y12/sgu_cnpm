// HTTP access to the SGU Go API (same server as the web app: server/index.mjs).
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Poi = {
  id: number
  name: string
  category: string
  description: string
  narration: string
  location: string
  campusId: string
  lat: number
  lng: number
  image: string
  triggerRadius: number
}

export type Analytics = { activeUsers: number; pois: Record<string, { heard: number; active: number; preview?: number }> }
export type AudioIndex = Record<string, number[]>

const visitorKey = 'sgu-go-visitor-id'
let visitorId: string | null = null

/** One random id per installed app, the same idea as the web app's localStorage id. */
export async function getVisitorId() {
  if (visitorId) return visitorId
  let id = await AsyncStorage.getItem(visitorKey)
  if (!id) {
    id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    await AsyncStorage.setItem(visitorKey, id)
  }
  visitorId = id
  return id
}

/** Accepts "https://xxx.trycloudflare.com", "…/sgu_cnpm/" or "http://192.168.1.4:5173". */
export function normalizeServer(input: string) {
  let value = input.trim().replace(/\/+$/, '')
  value = value.replace(/\/sgu_cnpm(\/.*)?$/, '')
  if (value && !/^https?:\/\//i.test(value)) value = `https://${value}`
  return value
}

async function getJson<T>(base: string, path: string): Promise<T> {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export async function fetchPois(base: string, lang: string): Promise<Poi[]> {
  type Raw = Omit<Poi, 'lat' | 'lng' | 'triggerRadius'> & { lat: number | null; lng: number | null; triggerRadius?: number }
  const items = await getJson<Raw[]>(base, `/api/pois?lang=${encodeURIComponent(lang)}`)
  return items
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng), triggerRadius: p.triggerRadius ?? 50, narration: p.narration || p.description }))
}

export async function fetchLanguages(base: string): Promise<string[]> {
  const body = await getJson<{ items: { code: string }[] }>(base, '/api/languages')
  return body.items.map((item) => item.code)
}

export const fetchAudioIndex = (base: string) => getJson<AudioIndex>(base, '/api/audio')
export const fetchAnalytics = (base: string) => getJson<Analytics>(base, '/api/analytics')

export const audioUrl = (base: string, lang: string, poiId: number) => `${base}/api/audio/${lang}/poi-${String(poiId).padStart(2, '0')}.mp3`

/** Photos: uploads are served by the API; bundled web assets via /api/assets. */
export function imageUrl(base: string, image: string) {
  if (!image) return ''
  if (/^https?:/i.test(image)) return image
  if (image.startsWith('/uploads/')) return `${base}${image}`
  const file = image.split(/[?#]/)[0].split('/').pop()
  return file ? `${base}/api/assets/${file}` : ''
}

async function post(base: string, path: string, data: Record<string, unknown>) {
  try {
    await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId: await getVisitorId(), ...data }),
    })
  } catch { /* Analytics must never block the guide. */ }
}

export const sendHeartbeat = (base: string, poiId: number | null) => post(base, '/api/analytics/heartbeat', { poiId })
export const sendLeave = (base: string) => post(base, '/api/analytics/leave', {})
export const reportListeningStart = (base: string, poiId: number, preview: boolean) => post(base, '/api/analytics/listen/start', { poiId, preview })
export const reportListeningEnd = (base: string, poiId: number) => post(base, '/api/analytics/listen/end', { poiId })

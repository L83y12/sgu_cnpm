const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const visitorKey = 'sgu-go-visitor-id'

export type AnalyticsSnapshot = {
  activeUsers: number
  pois: Record<string, { heard: number; active: number }>
}

export function getVisitorId() {
  let id = localStorage.getItem(visitorKey)
  if (!id) {
    id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(visitorKey, id)
  }
  return id
}

async function post(path: string, data: Record<string, unknown>) {
  try {
    await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), ...data }),
      keepalive: path.endsWith('/end'),
    })
  } catch { /* Analytics should not block the app when the API is offline. */ }
}

export async function sendHeartbeat() { await post('/api/analytics/heartbeat', {}) }
export async function reportListeningStart(poiId: number) { await post('/api/analytics/listen/start', { poiId }) }
export async function reportListeningEnd(poiId: number) { await post('/api/analytics/listen/end', { poiId }) }

export async function fetchAnalytics(): Promise<AnalyticsSnapshot> {
  const response = await fetch(`${apiBase}/api/analytics`)
  if (!response.ok) throw new Error('Không tải được số liệu hoạt động.')
  return response.json() as Promise<AnalyticsSnapshot>
}

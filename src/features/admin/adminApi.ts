import type { AdminPoi } from './AdminDashboard'

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const tokenKey = 'sgu-go-admin-token'

export function getAdminToken() { return sessionStorage.getItem(tokenKey) || '' }
export function saveAdminToken(token: string) { sessionStorage.setItem(tokenKey, token); sessionStorage.setItem('sgu-go-admin-session', 'signed-in') }
export function clearAdminToken() { sessionStorage.removeItem(tokenKey); sessionStorage.removeItem('sgu-go-admin-session') }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('content-type', 'application/json')
  const token = getAdminToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const response = await fetch(`${apiBase}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `Yêu cầu thất bại (${response.status}).`)
  return body as T
}

export type PoiPage = { items: (AdminPoi & { status: 'draft' | 'published' })[]; total: number; page: number; pageSize: number }

export const adminApi = {
  async login(email: string, password: string) {
    return request<{ token: string; admin: { name: string; email: string } }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  },
  listPois() { return request<PoiPage>('/api/admin/pois?page=1&pageSize=100') },
  bootstrapPois(items: AdminPoi[]) { return request<{ items: AdminPoi[] }>('/api/admin/pois/bootstrap', { method: 'POST', body: JSON.stringify({ items }) }) },
  updatePoi(id: number, patch: { status: 'draft' | 'published' }) { return request<AdminPoi & { status: string }>(`/api/admin/pois/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }) },
}

export async function fetchPublishedPois() {
  const response = await fetch(`${apiBase}/api/pois`)
  if (!response.ok) throw new Error('Không tải được các địa điểm đã đăng.')
  return response.json() as Promise<(AdminPoi & { status: string })[]>
}

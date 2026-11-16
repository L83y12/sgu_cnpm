const bundledPoiAssets = import.meta.glob('./*.{jpg,jpeg,png,webp,gif}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

const bundledPoiAssetsByName = new Map(
  Object.entries(bundledPoiAssets).map(([path, url]) => [path.split('/').pop()?.toLowerCase() || '', url]),
)
export const fallbackPoiImage = bundledPoiAssetsByName.get('sgu-building.png') || ''

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const apiBase = configuredApiBase || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '')

/** Resolve legacy database paths to Vite-managed assets and API-hosted uploads. */
export function resolvePoiImage(source?: string | null): string {
  const value = source?.trim()
  if (!value) return ''
  if (/^(?:https?:|data:)/i.test(value)) return value

  if (/^\/?(?:src\/assets|assets)\//i.test(value)) {
    const filename = value.split(/[?#]/, 1)[0].split('/').pop()?.toLowerCase() || ''
    return bundledPoiAssetsByName.get(filename) || ''
  }

  if (value.startsWith('/uploads/')) return `${apiBase}${value}`
  return value
}

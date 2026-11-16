// Recorded narration files. content/audio/poi-XX.mp3 is English; other languages go in
// content/audio/<code>/poi-XX.mp3 (for example content/audio/vi/poi-05.mp3). Vite bundles them;
// a place without a file in the chosen language falls back to the device's text-to-speech voice.
const files = import.meta.glob('/content/audio/**/poi-*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const byLanguage: Record<string, Record<number, string>> = {}
for (const [path, url] of Object.entries(files)) {
  const match = /\/content\/audio\/(?:([a-z]{2,3})\/)?poi-(\d+)\.mp3$/.exec(path)
  if (!match) continue
  const language = match[1] ?? 'en'
  ;(byLanguage[language] ??= {})[Number(match[2])] = url
}

export function narrationAudioUrl(poiId: number, language: string): string | null {
  return byLanguage[language]?.[poiId] ?? null
}

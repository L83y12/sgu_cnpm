import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState as RNAppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { audioUrl, fetchAnalytics, fetchAudioIndex, fetchLanguages, fetchPois, normalizeServer, sendHeartbeat, sendLeave, type Analytics, type AudioIndex, type Poi } from './api'
import { findPlaceInRange, isInRange } from './geo'
import { useLocation } from './useLocation'
import { useNarration } from './useNarration'
import { AppContext } from './appContext'

const serverKey = 'sgu-go-server'
const langKey = 'sgu-go-content-lang'
const autoKey = 'sgu-go-auto-play'
export type SharedState = ReturnType<typeof useSharedState>
export function AppStateProvider({ children }: { children: ReactNode }) { const value = useSharedState(); return <AppContext.Provider value={value}>{children}</AppContext.Provider> }

function useSharedState() {
  const [server, setServerState] = useState(normalizeServer(process.env.EXPO_PUBLIC_API_URL ?? ''))
  const [lang, setLangState] = useState('en')
  const [languages, setLanguages] = useState<string[]>(['en', 'vi'])
  const [places, setPlaces] = useState<Poi[]>([])
  // Loading is derived: the last finished request key differs from the wanted one.
  const [loaded, setLoaded] = useState<{ key: string; error: string }>({ key: '', error: '' })
  const [audioIndex, setAudioIndex] = useState<AudioIndex>({})
  const [analytics, setAnalytics] = useState<Analytics>({ activeUsers: 0, pois: {} })
  const [autoPlay, setAutoPlayState] = useState(true)
  const [version, setVersion] = useState(0)
  const location = useLocation()
  const narration = useNarration(server)

  // Restore the saved server address, language and auto-play choice.
  useEffect(() => {
    void (async () => {
      const [savedServer, savedLang, savedAuto] = await Promise.all([AsyncStorage.getItem(serverKey), AsyncStorage.getItem(langKey), AsyncStorage.getItem(autoKey)])
      if (savedServer) setServerState(savedServer)
      if (savedLang) setLangState(savedLang)
      if (savedAuto === '0') setAutoPlayState(false)
    })()
  }, [])

  const setServer = useCallback((value: string) => {
    const next = normalizeServer(value)
    setServerState(next)
    void AsyncStorage.setItem(serverKey, next)
  }, [])
  const { stop } = narration
  const setLang = useCallback((code: string) => { stop(); setLangState(code); void AsyncStorage.setItem(langKey, code) }, [stop])
  const setAutoPlay = useCallback((value: boolean) => { setAutoPlayState(value); void AsyncStorage.setItem(autoKey, value ? '1' : '0') }, [])
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!server) return
    let cancelled = false
    const key = `${server}|${lang}|${version}`
    Promise.all([fetchPois(server, lang), fetchLanguages(server).catch(() => ['en', 'vi']), fetchAudioIndex(server).catch(() => ({}))])
      .then(([items, codes, index]) => { if (!cancelled) { setPlaces(items); setLanguages(codes); setAudioIndex(index); setLoaded({ key, error: '' }) } })
      .catch(() => { if (!cancelled) { setPlaces([]); setLoaded({ key, error: 'Could not reach the SGU Go server. Check the address in Settings and that the API is running.' }) } })
    return () => { cancelled = true }
  }, [server, lang, version])

  // Heartbeat every 5 s while the app is open; leaving (background) frees the slot at once.
  const { getListeningPoiId } = narration
  const appActive = useRef(true)
  useEffect(() => {
    if (!server) return
    const tick = async () => {
      if (!appActive.current && getListeningPoiId() === null) return
      await sendHeartbeat(server, getListeningPoiId())
      fetchAnalytics(server).then(setAnalytics).catch(() => {})
    }
    void tick()
    const timer = setInterval(() => void tick(), 5000)
    const sub = RNAppState.addEventListener('change', (next) => {
      appActive.current = next === 'active'
      if (next === 'active') void tick()
      else if (getListeningPoiId() === null) void sendLeave(server)
    })
    return () => { clearInterval(timer); sub.remove() }
  }, [server, getListeningPoiId])

  const nearby = useMemo(() => findPlaceInRange(location.position, places, location.accuracy), [location.accuracy, location.position, places])
  const isNear = useCallback((id: number) => {
    const place = places.find((p) => p.id === id)
    return place ? isInRange(location.position, place, location.accuracy) : false
  }, [location.accuracy, location.position, places])

  const fileFor = useCallback((id: number) => (audioIndex[lang]?.includes(id) ? audioUrl(server, lang, id) : null), [audioIndex, lang, server])
  const { play } = narration
  const playPlace = useCallback((id: number) => {
    const place = places.find((p) => p.id === id)
    if (place) play(place, !isNear(id), lang, fileFor(id))
  }, [fileFor, isNear, lang, places, play])

  // Auto-play once per visit when walking into a place's radius (same rules as the web app).
  const announced = useRef<number | null>(null)
  const { state } = narration
  useEffect(() => {
    if (!nearby) { announced.current = null; return }
    if (announced.current === nearby.id || !autoPlay) return
    if (state.poiId === nearby.id && (state.playing || state.paused)) { announced.current = nearby.id; return }
    if (state.playing && !state.preview) return
    announced.current = nearby.id
    play(nearby, false, lang, fileFor(nearby.id))
  }, [autoPlay, fileFor, lang, nearby, play, state.paused, state.playing, state.poiId, state.preview])

  const loading = Boolean(server) && loaded.key !== `${server}|${lang}|${version}`
  const error = loading ? '' : loaded.error
  return { server, setServer, lang, setLang, languages, places, loading, error, reload, analytics, autoPlay, setAutoPlay, location, narration, nearby, isNear, playPlace, fileFor }
}

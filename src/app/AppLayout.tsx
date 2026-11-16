import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import sguBuilding from '../assets/sgu-building.png'
import { resolvePoiImage } from '../assets/poiImage'
import '../App.css'
import { fetchAnalytics, sendHeartbeat, sendLeave, type AnalyticsSnapshot } from '../analytics'
import { fetchLocaleOptions, translate, type Locale } from '../i18n/translations'
import { useUserLocation } from '../location/useUserLocation'
import { findPlaceInRange, isInRange } from '../narration/geofence'
import { useNarration, type NarrationState } from '../narration/useNarration'
import { NarrationDock } from './NarrationDock'
import { ShareQrDialog } from './ShareQrDialog'
import type { DemoPlace } from '../features/poi/data/demoPlaces'
import { fetchPublishedPois } from '../features/admin/adminApi'
import { Icon } from './Icon'

const sectionPaths = ['/', '/explore'] as const
export type SectionPath = (typeof sectionPaths)[number]


export interface SguAppContext {
  activeNav: 'guide' | 'explore'
  activePath: SectionPath
  language: Locale
  places: DemoPlace[]
  placesLoading: boolean
  placesError: string
  reloadPlaces: () => void
  analytics: AnalyticsSnapshot
  userPosition: { lat: number; lng: number } | null
  userAccuracy: number | null
  tracking: boolean
  geoMessage: string
  toggleLocate: () => void
  narration: NarrationState
  playNarration: (id: number) => void
  seekNarration: (seconds: number) => void
  seekNarrationTo: (seconds: number) => void
  getNarrationProgress: () => { current: number; duration: number } | null
  narrationSupported: boolean
  nearbyPlace: DemoPlace | null
  contentLang: string
  setContentLang: (code: string) => void
  languageOptions: { code: string; label: string }[]
  stopNarration: () => void
  pauseNarration: () => void
  isNearPlace: (id: number) => boolean
  autoPlay: boolean
  setAutoPlay: (value: boolean) => void
}

const autoPlayStorageKey = 'sgu-go-auto-play'
const contentLangStorageKey = 'sgu-go-content-lang'
const languageLabels: Record<string, string> = { en: 'English', vi: 'Tiếng Việt', ja: '日本語', ko: '한국어', zh: '中文' }
const languageOrder = ['en', 'vi', 'ja', 'ko', 'zh']
const defaultLanguageOptions = [{ code: 'en', label: languageLabels.en }, { code: 'vi', label: languageLabels.vi }]
function getReturnPath(state: unknown): SectionPath | undefined {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) {
    return undefined
  }

  const returnTo = state.returnTo
  return sectionPaths.find((path) => path === returnTo)
}

export function AppLayout() {
  const { pathname, state } = useLocation()
  const language: Locale = 'en' // The interface and POI content are English only.
  const [places, setPlaces] = useState<DemoPlace[]>([])
  const [placesLoading, setPlacesLoading] = useState(true)
  const [placesError, setPlacesError] = useState('')
  const [placesVersion, setPlacesVersion] = useState(0)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({ activeUsers: 0, pois: {} })
  const location = useUserLocation()
  const userPosition = location.position
  const narration = useNarration()
  const [qrOpen, setQrOpen] = useState(false)
  // Auto-play is the main feature, so it starts switched on unless the visitor turned it off.
  const [autoPlay, setAutoPlayState] = useState(() => window.localStorage.getItem(autoPlayStorageKey) !== '0')
  const [contentLang, setContentLangState] = useState(() => window.localStorage.getItem(contentLangStorageKey) || 'en')
  const [languageOptions, setLanguageOptions] = useState(defaultLanguageOptions)
  const returnPath = getReturnPath(state)
  const activePath = sectionPaths.find((path) => path === pathname) ?? returnPath ?? '/'
  const activeNav: SguAppContext['activeNav'] = activePath === '/explore' ? 'explore' : 'guide'

  useEffect(() => {
    document.title = translate(language, 'pageTitle')
  }, [language])

  const setAutoPlay = useCallback((value: boolean) => {
    setAutoPlayState(value)
    window.localStorage.setItem(autoPlayStorageKey, value ? '1' : '0')
  }, [])
  const { getListeningPoiId } = narration

  // Languages the narration can be played in, as stored in the database.
  useEffect(() => {
    let cancelled = false
    void fetchLocaleOptions().then((items) => {
      if (cancelled || items.length === 0) return
      const codes = items.map((item) => item.code).sort((a, b) => (languageOrder.indexOf(a) + 1 || 99) - (languageOrder.indexOf(b) + 1 || 99))
      setLanguageOptions(codes.map((code) => ({ code, label: languageLabels[code] ?? code })))
    }).catch(() => { /* Keep English and Vietnamese. */ })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      // A hidden page that is not playing audio has left; do not re-register it.
      if (document.visibilityState === 'hidden' && getListeningPoiId() === null) return
      await sendHeartbeat(getListeningPoiId())
      try {
        const result = await fetchAnalytics()
        if (!cancelled) {
          setAnalytics(result)
        }
      } catch {
        if (!cancelled) setAnalytics({ activeUsers: 0, pois: {} })
      }
    }
    void refresh()
    const interval = window.setInterval(() => void refresh(), 5_000)
    // Closing the page or leaving the tab frees this visitor's slot immediately.
    // A visitor who is listening keeps their slot while the page is merely hidden.
    const onPageHide = () => void sendLeave()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (getListeningPoiId() === null) void sendLeave()
      } else {
        void refresh()
      }
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [getListeningPoiId])

  useEffect(() => {
    let cancelled = false
    void fetchPublishedPois(contentLang).then((published) => {
      if (cancelled) return
      const databasePlaces: DemoPlace[] = published.map((poi) => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        description: poi.description,
        narration: poi.narration,
        distance: 'On campus',
        triggerRadius: poi.triggerRadius,
        walk: '—',
        rating: '—',
        image: resolvePoiImage(poi.image) || sguBuilding,
        tag: poi.category,
        localized: poi.localized,
        location: poi.location,
        lat: poi.lat === null || poi.lat === undefined ? Number.NaN : Number(poi.lat),
        lng: poi.lng === null || poi.lng === undefined ? Number.NaN : Number(poi.lng),
        campusId: poi.campusId === 'campus-1' || poi.campusId === 'campus-2' ? poi.campusId : 'main',
      }))
      setPlaces(databasePlaces)
    }).catch(() => {
      if (!cancelled) {
        setPlaces([])
        setPlacesError('Could not load places from the database. Check SQL Server and the API.')
      }
    }).finally(() => {
      if (!cancelled) setPlacesLoading(false)
    })
    return () => { cancelled = true }
  }, [contentLang, placesVersion])

  function reloadPlaces() {
    setPlacesLoading(true)
    setPlacesError('')
    setPlacesVersion((current) => current + 1)
  }

  const mappablePlaces = useMemo(
    () => places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)),
    [places],
  )
  const userAccuracy = location.accuracy
  const nearbyPlace = useMemo(() => findPlaceInRange(userPosition, mappablePlaces, userAccuracy), [mappablePlaces, userAccuracy, userPosition])
  const { play: startNarration, stop: stopNarration, pause: pauseNarration, seek: seekNarration, seekTo: seekNarrationTo, getProgress: getNarrationProgress, supported: narrationSupported, state: narrationState } = narration

  const setContentLang = useCallback((code: string) => {
    stopNarration()
    setContentLangState(code)
    window.localStorage.setItem(contentLangStorageKey, code)
  }, [stopNarration])

  const isNearPlace = useCallback((id: number) => {
    const place = mappablePlaces.find((item) => item.id === id)
    return place ? isInRange(userPosition, place, userAccuracy) : false
  }, [mappablePlaces, userAccuracy, userPosition])

  // Listening is a normal "heard" listen only when the visitor is within range of
  // the place; anywhere else it is a preview that is not counted.
  const playNarration = useCallback((id: number) => {
    const place = places.find((item) => item.id === id)
    if (!place) return
    startNarration(place, !isInRange(userPosition, place, userAccuracy), contentLang)
  }, [contentLang, places, startNarration, userAccuracy, userPosition])

  // Auto-play once per visit when the visitor walks into a place's range. Browsers only
  // allow speech after the visitor has interacted with the page, otherwise the
  // "listen now" prompt below stays available.
  const announcedPlaceId = useRef<number | null>(null)
  useEffect(() => {
    if (!nearbyPlace) {
      announcedPlaceId.current = null
      return
    }
    if (announcedPlaceId.current === nearbyPlace.id || !autoPlay) return
    // Browsers allow sound only after the visitor has touched the page (e.g. "Turn on location").
    // Until then nothing is marked, so it starts as soon as it is allowed.
    const userHasInteracted = navigator.userActivation?.hasBeenActive ?? true
    if (!userHasInteracted) return
    const loadedHere = narrationState.poiId === nearbyPlace.id && (narrationState.playing || narrationState.paused)
    if (loadedHere) { announcedPlaceId.current = nearbyPlace.id; return }
    // Do not cut off a narration the visitor is really listening to at a place; a preview of
    // somewhere else gives way to the place they just walked up to.
    if (narrationState.playing && !narrationState.preview) return
    announcedPlaceId.current = nearbyPlace.id
    startNarration(nearbyPlace, false, contentLang)
  }, [autoPlay, contentLang, nearbyPlace, narrationState.paused, narrationState.playing, narrationState.poiId, narrationState.preview, startNarration])

  const playingPlace = narrationState.playing
    ? places.find((place) => place.id === narrationState.poiId) ?? null
    : null

  const outletContext: SguAppContext = {
    activeNav,
    activePath,
    language,
    places,
    placesLoading,
    placesError,
    reloadPlaces,
    analytics,
    userPosition,
    userAccuracy: location.accuracy,
    tracking: location.tracking,
    geoMessage: location.message,
    toggleLocate: location.toggle,
    narration: narrationState,
    playNarration,
    seekNarration,
    seekNarrationTo,
    getNarrationProgress,
    narrationSupported,
    nearbyPlace,
    contentLang,
    setContentLang,
    languageOptions,
    stopNarration,
    pauseNarration,
    isNearPlace,
    autoPlay,
    setAutoPlay,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="SGU Go home">
          <span className="brand-mark"><img src={sguBuilding} alt="" /></span>
          <span className="brand-copy"><strong>sgu<span>go</span></strong><small>ĐI MỘT VÒNG, THẤY THÂN QUEN</small></span>
        </Link>
        <div className="side-label">{translate(language, 'navGroup')}</div>
        <nav className="main-nav" aria-label="Main navigation">
          {[
            { label: translate(language, 'guide'), icon: 'headphones', to: '/' as const },
            { label: translate(language, 'discover'), icon: 'compass', to: '/explore' as const },
          ].map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={`nav-item ${activePath === item.to ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-dot" /><div><strong>{translate(language, 'online')}</strong><small>{translate(language, 'mapReady')}</small></div><Icon name="map" size={17} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{translate(language, activePath === '/explore' ? 'discover' : 'guide')}</strong></div>
          <div className="top-actions"><span className="app-user-count" title="People using the app right now"><i />{analytics.activeUsers} <span>{translate(language, 'appUsersActive')}</span></span><button className="qr-button" onClick={() => setQrOpen(true)} aria-haspopup="dialog">{translate(language, 'showQr')}</button></div>
        </header>
        <div className="page-content">
          <Outlet context={outletContext} />
        </div>
      </main>
      {activePath !== '/' && <NarrationDock
        nearby={nearbyPlace}
        playingPlace={playingPlace}
        preview={narrationState.preview}
        error={narrationState.error}
        autoPlay={autoPlay}
        tracking={location.tracking}
        onListen={playNarration}
        onStop={stopNarration}
        onAutoPlayChange={setAutoPlay}
      />}
      {qrOpen && <ShareQrDialog onClose={() => setQrOpen(false)} />}
    </div>
  )
}

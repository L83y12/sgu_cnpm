import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import sguBuilding from '../assets/sgu-building.png'
import { resolvePoiImage } from '../assets/poiImage'
import '../App.css'
import { fetchAnalytics, sendHeartbeat, type AnalyticsSnapshot } from '../analytics'
import { translate, type Locale } from '../i18n/translations'
import { useUserLocation } from '../location/useUserLocation'
import { findPlaceInRange, isInRange } from '../narration/geofence'
import { useNarration, type NarrationState } from '../narration/useNarration'
import { NarrationDock } from './NarrationDock'
import { ShareQrDialog } from './ShareQrDialog'
import type { DemoPlace } from '../features/poi/data/demoPlaces'
import { fetchPublishedPois } from '../features/admin/adminApi'
import { Icon } from './Icon'

const sectionPaths = ['/', '/map', '/saved'] as const
export type SectionPath = (typeof sectionPaths)[number]

const savedPoisStorageKey = 'sgu-go:saved-poi-ids'
const initialSavedPoiIds = [2]

export interface SguAppContext {
  activeNav: 'Khám phá' | 'Bản đồ' | 'Đã lưu'
  activePath: SectionPath
  saved: number[]
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
  toggleSaved: (id: number) => void
  narration: NarrationState
  playNarration: (id: number) => void
  stopNarration: () => void
  isNearPlace: (id: number) => boolean
  autoPlay: boolean
  setAutoPlay: (value: boolean) => void
}

const autoPlayStorageKey = 'sgu-go-auto-play'
function getReturnPath(state: unknown): SectionPath | undefined {
  if (typeof state !== 'object' || state === null || !('returnTo' in state)) {
    return undefined
  }

  const returnTo = state.returnTo
  return sectionPaths.find((path) => path === returnTo)
}

function readSavedPoiIds(): number[] {
  const storedValue = window.localStorage.getItem(savedPoisStorageKey)

  if (storedValue === null) {
    return initialSavedPoiIds
  }

  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(storedValue)
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error
    }

    console.error('Saved POI data is not valid JSON; using the initial saved POIs.', error)
    return initialSavedPoiIds
  }

  if (!Array.isArray(parsedValue)) {
    console.error('Saved POI data has an invalid format; using the initial saved POIs.')
    return initialSavedPoiIds
  }

  const validPoiIds = parsedValue.filter(
    (poiId: unknown): poiId is number =>
      typeof poiId === 'number' && Number.isSafeInteger(poiId) && poiId > 0,
  )

  if (validPoiIds.length !== parsedValue.length) {
    console.error('Saved POI data has an invalid format; using the initial saved POIs.')
    return initialSavedPoiIds
  }

  return [...new Set(validPoiIds)]
}

export function AppLayout() {
  const { pathname, state } = useLocation()
  const [saved, setSaved] = useState<number[]>(readSavedPoiIds)
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
  const [autoPlay, setAutoPlayState] = useState(() => window.localStorage.getItem(autoPlayStorageKey) === '1')
  const returnPath = getReturnPath(state)
  const activePath = pathname.startsWith('/poi/')
    ? returnPath ?? '/'
    : sectionPaths.find((path) => path === pathname) ?? '/'
  const activeNav = activePath === '/map'
    ? 'Bản đồ'
    : activePath === '/saved'
      ? 'Đã lưu'
      : 'Khám phá'

  useEffect(() => {
    window.localStorage.setItem(savedPoisStorageKey, JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    document.title = translate(language, 'pageTitle')
  }, [language])

  const setAutoPlay = useCallback((value: boolean) => {
    setAutoPlayState(value)
    window.localStorage.setItem(autoPlayStorageKey, value ? '1' : '0')
  }, [])
  const { getListeningPoiId } = narration
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
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
    const interval = window.setInterval(() => void refresh(), 12_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [getListeningPoiId])

  useEffect(() => {
    let cancelled = false
    void fetchPublishedPois(language).then((published) => {
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
  }, [language, placesVersion])

  function reloadPlaces() {
    setPlacesLoading(true)
    setPlacesError('')
    setPlacesVersion((current) => current + 1)
  }

  function toggleSaved(id: number) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    )
  }

  const mappablePlaces = useMemo(
    () => places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng)),
    [places],
  )
  const nearbyPlace = useMemo(() => findPlaceInRange(userPosition, mappablePlaces), [mappablePlaces, userPosition])
  const { play: startNarration, stop: stopNarration, state: narrationState } = narration

  const isNearPlace = useCallback((id: number) => {
    const place = mappablePlaces.find((item) => item.id === id)
    return place ? isInRange(userPosition, place) : false
  }, [mappablePlaces, userPosition])

  // Listening is a normal "heard" listen only when the visitor is within range of
  // the place; anywhere else it is a preview that is not counted.
  const playNarration = useCallback((id: number) => {
    const place = places.find((item) => item.id === id)
    if (!place) return
    startNarration(place, !isInRange(userPosition, place))
  }, [places, startNarration, userPosition])

  // Auto-play once per visit when the visitor walks into a place's range. Browsers only
  // allow speech after the visitor has interacted with the page, otherwise the
  // "listen now" prompt below stays available.
  const announcedPlaceId = useRef<number | null>(null)
  useEffect(() => {
    if (!nearbyPlace) {
      announcedPlaceId.current = null
      return
    }
    if (announcedPlaceId.current === nearbyPlace.id) return
    announcedPlaceId.current = nearbyPlace.id
    const userHasInteracted = navigator.userActivation?.hasBeenActive ?? true
    if (autoPlay && userHasInteracted && !narrationState.playing) startNarration(nearbyPlace, false)
  }, [autoPlay, nearbyPlace, narrationState.playing, startNarration])

  const playingPlace = narrationState.playing
    ? places.find((place) => place.id === narrationState.poiId) ?? null
    : null

  const outletContext: SguAppContext = {
    activeNav,
    activePath,
    saved,
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
    toggleSaved,
    narration: narrationState,
    playNarration,
    stopNarration,
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
            { label: translate(language, 'discover'), icon: 'compass', to: '/' as const },
            { label: translate(language, 'map'), icon: 'map', to: '/map' as const },
            { label: translate(language, 'saved'), icon: 'heart', to: '/saved' as const },
          ].map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end
              className={`nav-item ${activePath === item.to ? 'active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === '/saved' && <span className="nav-count">{saved.length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-divider" />
        <div className="side-label">{translate(language, 'suggestions')}</div>
        <Link className="route-card" to="/">
          <span className="route-icon"><Icon name="sun" size={19} /></span>
          <span><strong>{translate(language, 'route')}</strong><small>{translate(language, 'routeDuration')}</small></span>
          <Icon name="chevron" size={16} />
        </Link>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-dot" /><div><strong>{translate(language, 'online')}</strong><small>{translate(language, 'mapReady')}</small></div><Icon name="map" size={17} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{translate(language, activePath === '/map' ? 'map' : activePath === '/saved' ? 'saved' : 'discover')}</strong></div>
          <div className="top-actions"><span className="app-user-count" title="People using the app right now"><i />{analytics.activeUsers} <span>{translate(language, 'appUsersActive')}</span></span><button className="qr-button" onClick={() => setQrOpen(true)} aria-haspopup="dialog">{translate(language, 'showQr')}</button></div>
        </header>
        <div className="page-content">
          <Outlet context={outletContext} />
        </div>
      </main>
      <NarrationDock
        nearby={nearbyPlace}
        playingPlace={playingPlace}
        preview={narrationState.preview}
        error={narrationState.error}
        autoPlay={autoPlay}
        tracking={location.tracking}
        onListen={playNarration}
        onStop={stopNarration}
        onAutoPlayChange={setAutoPlay}
      />
      {qrOpen && <ShareQrDialog onClose={() => setQrOpen(false)} />}
    </div>
  )
}

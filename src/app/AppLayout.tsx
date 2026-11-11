import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import sguBuilding from '../assets/sgu-building.png'
import { resolvePoiImage } from '../assets/poiImage'
import '../App.css'
import { fetchAnalytics, sendHeartbeat, type AnalyticsSnapshot } from '../analytics'
import { fetchLocaleOptions, localeOptions, translate, type Locale, type LocaleOption } from '../i18n/translations'
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
  toggleSaved: (id: number) => void
  onLocate: (position: { lat: number; lng: number }) => void
}

const languageStorageKey = 'sgu-go-language'
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
  const [language, setLanguage] = useState<Locale>(() => {
    const stored = window.localStorage.getItem(languageStorageKey)
    return localeOptions.find((option) => option.code === stored)?.code ?? 'vi'
  })
  const [availableLanguages, setAvailableLanguages] = useState<LocaleOption[]>(localeOptions)
  const [places, setPlaces] = useState<DemoPlace[]>([])
  const [placesLoading, setPlacesLoading] = useState(true)
  const [placesError, setPlacesError] = useState('')
  const [placesVersion, setPlacesVersion] = useState(0)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot>({ activeUsers: 0, pois: {} })
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
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
    window.localStorage.setItem(languageStorageKey, language)
  }, [language])

  useEffect(() => {
    document.title = translate(language, 'pageTitle')
  }, [language])
  useEffect(() => {
    let cancelled = false
    void fetchLocaleOptions().then((options) => {
      if (cancelled || !options.length) return
      setAvailableLanguages(options)
      const stored = window.localStorage.getItem(languageStorageKey)
      if (stored && options.some((option) => option.code === stored)) {
        setLanguage(stored)
        document.title = translate(stored, 'pageTitle')
      }
    }).catch(() => { /* Use the bundled languages when the API is offline. */ })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      await sendHeartbeat()
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
  }, [])

  useEffect(() => {
    let cancelled = false
    setPlacesLoading(true)
    setPlacesError('')
    void fetchPublishedPois(language).then((published) => {
      if (cancelled) return
      const databasePlaces: DemoPlace[] = published.map((poi) => ({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        description: poi.description,
        narration: poi.narration,
        distance: 'Trong khuôn viên',
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
        setPlacesError('Không tải được POI từ database. Hãy kiểm tra SQL Server và API.')
      }
    }).finally(() => {
      if (!cancelled) setPlacesLoading(false)
    })
    return () => { cancelled = true }
  }, [language, placesVersion])

  function reloadPlaces() {
    setPlacesVersion((current) => current + 1)
  }

  function toggleSaved(id: number) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id],
    )
  }

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
    toggleSaved,
    onLocate: setUserPosition,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="SGU Go trang chủ">
          <span className="brand-mark"><img src={sguBuilding} alt="" /></span>
          <span className="brand-copy"><strong>sgu<span>go</span></strong><small>ĐI MỘT VÒNG, THẤY THÂN QUEN</small></span>
        </Link>
        <div className="side-label">{translate(language, 'navGroup')}</div>
        <nav className="main-nav" aria-label="Điều hướng chính">
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
              {item.label === 'Đã lưu' && <span className="nav-count">{saved.length}</span>}
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
          <button className="profile-button"><span className="avatar">G</span><span><strong>{translate(language, 'guest')}</strong><small>{translate(language, 'guestMode')}</small></span><span className="more-dots">···</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{translate(language, activePath === '/map' ? 'map' : activePath === '/saved' ? 'saved' : 'discover')}</strong></div>
          <div className="top-actions"><span className="app-user-count" title="Người đang sử dụng ứng dụng"><i />{analytics.activeUsers} <span>{translate(language, 'appUsersActive')}</span></span><label className="language-select-label"><span className="visually-hidden">{translate(language, 'language')}</span><select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Locale)} aria-label={translate(language, 'language')}>{availableLanguages.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><span className="top-divider" /><button className="help-button">{translate(language, 'help')}</button><button className="top-avatar" aria-label={translate(language, 'guest')}>G</button></div>
        </header>
        <div className="page-content">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  )
}

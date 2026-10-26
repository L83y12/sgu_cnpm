import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import sguBuilding from '../assets/sgu-building.png'
import '../App.css'
import { fetchAnalytics, sendHeartbeat } from '../analytics'
import { localeOptions, translate, type Locale } from '../i18n/translations'
import { demoPlaces, type DemoPlace, type DemoPlaceCategory } from '../features/poi/data/demoPlaces'
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
  userPosition: { lat: number; lng: number } | null
  toggleSaved: (id: number) => void
  onLocate: (position: { lat: number; lng: number }) => void
}

const languageStorageKey = 'sgu-go-language'
const categories: DemoPlaceCategory[] = ['Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh', 'Thể thao']

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
  const [places, setPlaces] = useState(demoPlaces)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [activeUsers, setActiveUsers] = useState(0)
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
    const refresh = async () => {
      await sendHeartbeat()
      try {
        const result = await fetchAnalytics()
        if (!cancelled) setActiveUsers(result.activeUsers)
      } catch {
        if (!cancelled) setActiveUsers(0)
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
    void fetchPublishedPois().then((published) => {
      if (cancelled) return
      const additions: DemoPlace[] = published
        .filter((poi) => !demoPlaces.some((place) => place.id === poi.id))
        .flatMap((poi) => {
          const category = categories.find((item) => item === poi.category)
          if (!category) return []
          return [{
            id: poi.id,
            name: poi.name,
            category,
            description: poi.description,
            narration: poi.narration,
            distance: 'Trong khuôn viên',
            walk: '—',
            rating: '—',
            image: poi.image || sguBuilding,
            tag: 'Địa điểm mới',
            location: poi.location,
            lat: Number(poi.lat) || 0,
            lng: Number(poi.lng) || 0,
            campusId: poi.campusId === 'campus-1' || poi.campusId === 'campus-2' ? poi.campusId : 'main',
          }]
        })
      setPlaces([...demoPlaces, ...additions])
    }).catch(() => {
      if (!cancelled) setPlaces(demoPlaces)
    })
    return () => { cancelled = true }
  }, [])

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
          <div className="top-actions"><span className="app-user-count" title="Người đang sử dụng ứng dụng"><i />{activeUsers} <span>{translate(language, 'appUsersActive')}</span></span><label className="language-select-label"><span className="visually-hidden">{translate(language, 'language')}</span><select className="language-select" value={language} onChange={(event) => setLanguage(event.target.value as Locale)} aria-label={translate(language, 'language')}>{localeOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}</select></label><span className="top-divider" /><button className="help-button">{translate(language, 'help')}</button><button className="top-avatar" aria-label={translate(language, 'guest')}>G</button></div>
        </header>
        <div className="page-content">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import sguBuilding from '../assets/sgu-building.png'
import '../App.css'
import { Icon } from './Icon'

const sectionPaths = ['/', '/map', '/saved'] as const
export type SectionPath = (typeof sectionPaths)[number]

const savedPoisStorageKey = 'sgu-go:saved-poi-ids'
const initialSavedPoiIds = [2]

export interface SguAppContext {
  activeNav: 'Khám phá' | 'Bản đồ' | 'Đã lưu'
  activePath: SectionPath
  saved: number[]
  toggleSaved: (id: number) => void
}

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
  const [language, setLanguage] = useState('VI')
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
    toggleSaved,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="SGU Go trang chủ">
          <span className="brand-mark"><img src={sguBuilding} alt="" /></span>
          <span className="brand-copy"><strong>sgu<span>go</span></strong><small>ĐI MỘT VÒNG, THẤY THÂN QUEN</small></span>
        </Link>
        <div className="side-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {[
            { label: 'Khám phá', icon: 'compass', to: '/' as const },
            { label: 'Bản đồ', icon: 'map', to: '/map' as const },
            { label: 'Đã lưu', icon: 'heart', to: '/saved' as const },
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
        <div className="side-label">GỢI Ý CHO BẠN</div>
        <Link className="route-card" to="/">
          <span className="route-icon"><Icon name="sun" size={19} /></span>
          <span><strong>Một vòng quanh SGU</strong><small>4 điểm · khoảng 25 phút</small></span>
          <Icon name="chevron" size={16} />
        </Link>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-dot" /><div><strong>Bạn đang trực tuyến</strong><small>Bản đồ luôn sẵn sàng</small></div><Icon name="map" size={17} /></div>
          <button className="profile-button"><span className="avatar">L</span><span><strong>Khách tham quan</strong><small>Khám phá SGU</small></span><span className="more-dots">···</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{activeNav}</strong></div>
          <div className="top-actions"><button className="language-button" onClick={() => setLanguage(language === 'VI' ? 'EN' : 'VI')} aria-label="Đổi ngôn ngữ">{language}<span className="language-chevron">⌄</span></button><span className="top-divider" /><button className="help-button">Trợ giúp</button><button className="top-avatar" aria-label="Tài khoản">L</button></div>
        </header>
        <div className="page-content">
          <Outlet context={outletContext} />
        </div>
      </main>
    </div>
  )
}

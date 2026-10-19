import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import sguBuilding from './assets/sgu-building.png'
import { LeafletMapView, type MapPoi } from './features/map/LeafletMapView'
import './App.css'

type Category = 'Tất cả' | 'Kiến trúc' | 'Học tập' | 'Ẩm thực' | 'Không gian xanh'
type Place = {
  id: number
  name: string
  category: Exclude<Category, 'Tất cả'>
  description: string
  distance: string
  walk: string
  rating: string
  image: string
  tag: string
  location: string
  lat: number
  lng: number
}

const places: Place[] = [
  {
    id: 1,
    name: 'Tòa nhà chính SGU',
    category: 'Kiến trúc',
    description: 'Một góc Sài Gòn xưa giữa lòng khuôn viên đại học, nơi lưu giữ những câu chuyện của nhiều thế hệ sinh viên.',
    distance: '120 m', walk: '2 phút', rating: '4.9', tag: 'Biểu tượng SGU', location: '273 An Dương Vương, Quận 5', lat: 10.76002, lng: 106.68226,
    image: sguBuilding,
  },
  {
    id: 2,
    name: 'Thư viện trung tâm',
    category: 'Học tập',
    description: 'Không gian yên tĩnh để đọc, học nhóm và khám phá kho tài liệu dành cho sinh viên.',
    distance: '260 m', walk: '4 phút', rating: '4.8', tag: 'Góc yên tĩnh', location: 'Khu B, Trường Đại học Sài Gòn', lat: 10.75955, lng: 106.68262,
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 3,
    name: 'Sân trường thân quen',
    category: 'Không gian xanh',
    description: 'Hàng cây rợp bóng và những chiếc ghế đá quen thuộc — điểm hẹn giữa các tiết học.',
    distance: '340 m', walk: '5 phút', rating: '4.7', tag: 'Được yêu thích', location: 'Sân trung tâm, SGU', lat: 10.75936, lng: 106.68192,
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 4,
    name: 'Cà phê Góc Nhỏ',
    category: 'Ẩm thực',
    description: 'Cà phê rang thơm, món ăn nhẹ và một chỗ nghỉ chân dễ chịu sau vòng tham quan.',
    distance: '450 m', walk: '6 phút', rating: '4.6', tag: 'Sinh viên gợi ý', location: 'Nguyễn Trãi, Quận 5', lat: 10.76024, lng: 106.68155,
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85',
  },
]

const categories: Category[] = ['Tất cả', 'Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh']

function resolveQrPlace(value: string, places: readonly Place[]) {
  const normalized = value.trim().toLocaleLowerCase('vi')
  const id = value.match(/(?:poi|place)[=/:-]?(\d+)/i)?.[1]
    ?? value.match(/(?:^|\/)(\d+)\/?(?:\?.*)?$/)?.[1]
  return places.find((place) => String(place.id) === id || place.name.toLocaleLowerCase('vi') === normalized)
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.7 8.3-2.5 5-4.9 2.4 2.4-4.9 5-2.5Z" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15M15 6v15" /></>,
    heart: <path d="M20.8 8.8c0 4.3-8.8 10-8.8 10s-8.8-5.7-8.8-10A4.8 4.8 0 0 1 12 6.5a4.8 4.8 0 0 1 8.8 2.3Z" />,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    headphones: <><path d="M3 13v-1a9 9 0 0 1 18 0v1" /><path d="M5 13h2v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14 0h-2v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    play: <path d="m8 5 12 7-12 7V5Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [activeNav, setActiveNav] = useState('Khám phá')
  const [category, setCategory] = useState<Category>('Tất cả')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<number[]>([2])
  const [selected, setSelected] = useState<Place | null>(null)
  const [mapSelection, setMapSelection] = useState<Place | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrMessage, setQrMessage] = useState('Đưa mã QR địa điểm vào khung hình để quét.')
  const [qrCode, setQrCode] = useState('')
  const qrVideo = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [narrationMessage, setNarrationMessage] = useState('Chọn một địa điểm trên bản đồ để nghe thuyết minh.')
  const [language, setLanguage] = useState('VI')
  const [poiStatus, setPoiStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [poiItems, setPoiItems] = useState<Place[]>([])

  const handleMapSelect = useCallback((place: MapPoi) => {
    const matchingPlace = poiItems.find((item) => item.id === place.id)
    if (matchingPlace) {
      setMapSelection(matchingPlace)
      setNarrationMessage(language === 'VI' ? `${matchingPlace.name} sẵn sàng phát thuyết minh.` : 'Bản thuyết minh tiếng Anh chưa có; hiện có Tiếng Việt.')
    }
  }, [language, poiItems])

  function toggleMapNarration() {
    if (!mapSelection) return
    if (language !== 'VI') {
      setNarrationMessage('Bản thuyết minh tiếng Anh chưa có; hãy chọn Tiếng Việt để nghe.')
      return
    }
    if (playing) {
      window.speechSynthesis?.cancel()
      setPlaying(false)
      setNarrationMessage('Đã dừng thuyết minh.')
      return
    }
    if (!('speechSynthesis' in window)) {
      setNarrationMessage('Trình duyệt chưa hỗ trợ phát thuyết minh.')
      return
    }
    window.speechSynthesis.cancel()
    const narration = new SpeechSynthesisUtterance(`${mapSelection.name}. ${mapSelection.description}`)
    narration.lang = 'vi-VN'
    narration.rate = 0.95
    narration.onstart = () => { setPlaying(true); setNarrationMessage(`Đang thuyết minh: ${mapSelection.name}`) }
    narration.onend = () => { setPlaying(false); setNarrationMessage('Thuyết minh đã kết thúc.') }
    narration.onerror = () => { setPlaying(false); setNarrationMessage('Không phát được thuyết minh trên thiết bị này.') }
    window.speechSynthesis.speak(narration)
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  useEffect(() => {
    if (!qrOpen) return
    let stream: MediaStream | null = null
    let timer: number | null = null
    let scanning = false
    const Detector = (window as Window & {
      BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }
    }).BarcodeDetector

    async function startScanner() {
      if (!Detector) {
        setQrMessage('Trình duyệt chưa hỗ trợ đọc QR tự động. Nhập mã POI hoặc chọn địa điểm bên dưới.')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setQrMessage('Không thể mở camera trong trình duyệt này. Nhập mã POI hoặc chọn địa điểm bên dưới.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (!qrVideo.current) return
        qrVideo.current.srcObject = stream
        await qrVideo.current.play()
        setQrMessage('Camera đã sẵn sàng. Hướng mã QR vào giữa khung hình.')
        const detector = new Detector({ formats: ['qr_code'] })
        timer = window.setInterval(async () => {
          if (scanning || !qrVideo.current || qrVideo.current.readyState < 2) return
          scanning = true
          try {
            const codes = await detector.detect(qrVideo.current)
            const rawValue = codes[0]?.rawValue?.trim()
            if (rawValue) {
              const match = resolveQrPlace(rawValue, poiItems)
              if (match) {
                handleMapSelect(match)
                setQrMessage(`Đã nhận diện ${match.name}.`)
                setQrOpen(false)
              } else {
                setQrMessage(`Chưa khớp mã “${rawValue}” với POI hiện có. Hãy thử mã số hoặc tên địa điểm.`)
              }
            }
          } catch { setQrMessage('Không đọc được hình ảnh từ camera. Hãy thử lại.') }
          scanning = false
        }, 500)
      } catch {
        setQrMessage('Chưa cấp quyền camera. Bạn vẫn có thể nhập mã POI hoặc chọn địa điểm bên dưới.')
      }
    }
    void startScanner()
    return () => {
      if (timer !== null) window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (qrVideo.current) qrVideo.current.srcObject = null
    }
  }, [handleMapSelect, poiItems, qrOpen])

  useEffect(() => {
    const demoError = new URLSearchParams(window.location.search).get('poiState') === 'error'
    const timer = window.setTimeout(() => {
      if (demoError) {
        setPoiStatus('error')
      } else {
        setPoiItems(places)
        setPoiStatus('success')
      }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [])

  function retryLoadPlaces() {
    setPoiStatus('loading')
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`)
    window.setTimeout(() => {
      setPoiItems(places)
      setPoiStatus('success')
    }, 500)
  }

  const filteredPlaces = useMemo(() => poiItems.filter((place) => {
    const matchesCategory = category === 'Tất cả' || place.category === category
    const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery && (activeNav !== 'Đã lưu' || saved.includes(place.id))
  }), [activeNav, category, poiItems, query, saved])

  function toggleSaved(id: number) {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setActiveNav('Khám phá')} aria-label="SGU Go trang chủ">
          <span className="brand-mark"><img src={sguBuilding} alt="" /></span>
          <span className="brand-copy"><strong>sgu<span>go</span></strong><small>ĐI MỘT VÒNG, THẤY THÂN QUEN</small></span>
        </a>
        <div className="side-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {[
            { label: 'Khám phá', icon: 'compass' }, { label: 'Bản đồ', icon: 'map' }, { label: 'Đã lưu', icon: 'heart' },
          ].map((item) => <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><Icon name={item.icon} /><span>{item.label}</span>{item.label === 'Đã lưu' && <span className="nav-count">{saved.length}</span>}</button>)}
        </nav>
        <div className="side-divider" />
        <div className="side-label">GỢI Ý CHO BẠN</div>
        <button className="route-card" onClick={() => setActiveNav('Khám phá')}>
          <span className="route-icon"><Icon name="sun" size={19} /></span>
          <span><strong>Một vòng quanh SGU</strong><small>4 điểm · khoảng 25 phút</small></span>
          <Icon name="chevron" size={16} />
        </button>
        <div className="sidebar-bottom">
          <div className="offline-card"><span className="offline-dot" /><div><strong>Bạn đang trực tuyến</strong><small>Bản đồ luôn sẵn sàng</small></div><Icon name="map" size={17} /></div>
          <div className="profile-button"><span className="avatar">K</span><span><strong>Khách tham quan</strong><small>Khám phá SGU</small></span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{activeNav}</strong></div>
          <div className="top-actions"><button className="language-button" onClick={() => setLanguage(language === 'VI' ? 'EN' : 'VI')} aria-label="Đổi ngôn ngữ">{language}<span className="language-chevron">⌄</span></button><span className="top-divider" /><button className="help-button">Trợ giúp</button><div className="top-avatar" aria-label="Khách tham quan" title="Khách tham quan">K</div></div>
        </header>

        <div className="page-content">
          {activeNav === 'Bản đồ' ? <section className="map-page">
            <header className="map-page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> KHÔNG GIAN SGU</div><h1>Thuyết minh <em>khuôn viên</em></h1><p>Chọn một địa điểm trên bản đồ để xem thông tin và nghe câu chuyện về nơi đó.</p></div><button className="qr-scan-button" onClick={() => { setQrMessage('Đưa mã QR địa điểm vào khung hình để quét.'); setQrOpen(true) }}>▦ <span>Quét QR</span></button></header>
            <div className="map-utility-bar"><label>◎ <span>Ngôn ngữ:</span><select value={language} onChange={(event) => { setLanguage(event.target.value); if (event.target.value === 'EN') setNarrationMessage('Bản thuyết minh tiếng Anh chưa có; hiện có Tiếng Việt.') }} aria-label="Ngôn ngữ thuyết minh"><option value="VI">VI · Tiếng Việt</option><option value="EN">EN · English</option></select></label><span className="map-online"><i /> Trực tuyến · OpenStreetMap</span></div>
            <div className="map-workspace">
              <section className="hero-map map-screen-canvas" aria-label="Bản đồ khuôn viên SGU"><LeafletMapView places={poiItems} selectedPlaceId={mapSelection?.id ?? null} onSelectPlace={handleMapSelect} /></section>
              <aside className="map-side-panels" aria-label="Thuyết minh và địa điểm">
                <section className="map-panel audio-panel"><div className="map-panel-title"><span className="panel-icon">♫</span><h2>Thuyết minh âm thanh</h2></div><div className="narration-status"><span>✓</span><p>{narrationMessage}</p></div><div className="narration-controls"><button className="narration-play" onClick={toggleMapNarration} disabled={!mapSelection} aria-label={playing ? 'Dừng thuyết minh' : 'Phát thuyết minh'}>{playing ? 'Ⅱ' : '▶'}</button><div className="narration-track"><strong>{mapSelection ? mapSelection.name : 'Chưa chọn địa điểm'}</strong><span><i className={playing ? 'track-playing' : ''} /></span></div><small>{language === 'VI' ? 'Tiếng Việt' : 'EN chưa có'}</small></div></section>
                <section className="map-panel place-panel"><div className="map-panel-title"><span className="panel-icon">⌖</span><h2>{mapSelection ? 'Thông tin địa điểm' : 'Chọn địa điểm để khám phá'}</h2></div>{mapSelection ? <div className="map-selected-place"><span className="map-selected-category">{mapSelection.category} · {mapSelection.walk} đi bộ</span><h3>{mapSelection.name}</h3><p>{mapSelection.description}</p><small><Icon name="pin" size={14} /> {mapSelection.location}</small><div className="map-selected-actions"><button className="map-open-detail" onClick={() => setSelected(mapSelection)}>Xem chi tiết</button><a href={`https://www.google.com/maps/dir/?api=1&destination=${mapSelection.lat},${mapSelection.lng}`} target="_blank" rel="noreferrer">Chỉ đường ↗</a><button className="map-reset-selection" onClick={() => { setMapSelection(null); setNarrationMessage('Chọn một địa điểm trên bản đồ để nghe thuyết minh.') }}>Chọn nơi khác</button></div></div> : <><p className="map-select-hint">Chọn một ghim trên bản đồ hoặc trong danh sách để xem nội dung và nghe thuyết minh.</p><div className="map-place-list">{poiItems.map((place, index) => <button className="map-place-row" key={place.id} onClick={() => handleMapSelect(place)}><span className="map-place-number">{index + 1}</span><span className="map-place-copy"><strong>{place.name}</strong><small>{place.category} <i>·</i> {place.distance} <i>·</i> {place.walk} đi bộ</small></span><Icon name="chevron" size={17} /></button>)}</div></>}</section>
                <p className="map-coordinate-note">Các tọa độ POI hiện là dữ liệu minh họa, cần xác nhận thực tế.</p>
              </aside>
            </div>
          </section> : <>
            <section className="welcome-row">
              <div><div className="eyebrow"><span className="eyebrow-line" /> THỨ BẠN TÌM ĐANG Ở GẦN ĐÂY</div><h1>Mỗi góc nhỏ,<br /><em>một câu chuyện.</em></h1><p className="welcome-copy">Dạo một vòng quanh Đại học Sài Gòn — khám phá những nơi thân quen theo cách mới.</p></div>
              <div className="today-note"><span className="weather-icon"><Icon name="sun" size={24} /></span><div><strong>Một ngày đẹp để đi bộ</strong><small>Quận 5 · TP. Hồ Chí Minh</small></div></div>
            </section>

            <section className="hero-map" aria-label="Bản đồ minh họa khám phá quanh SGU">
              <div className="map-texture" /><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
              <span className="map-label map-label-one">AN DƯƠNG VƯƠNG</span><span className="map-label map-label-two">NGUYỄN TRÃI</span><span className="map-label map-label-three">KHUÔN VIÊN SGU</span>
              <div className="map-building building-one" /><div className="map-building building-two" /><div className="map-building building-three" /><div className="map-park"><span>🌿</span></div>
              <div className="map-pin pin-a"><span>1</span><i /></div><div className="map-pin pin-b"><span>2</span><i /></div><div className="map-pin pin-c"><span>3</span><i /></div>
              <div className="map-you"><span /><small>Vị trí mẫu</small></div>
              <div className="map-overlay-card"><span className="mini-map-icon"><Icon name="map" size={19} /></span><div><strong>Khám phá quanh bạn</strong><small>4 địa điểm mẫu · 500 m</small></div><button onClick={() => setActiveNav('Bản đồ')} aria-label="Mở bản đồ"><Icon name="arrow" size={18} /></button></div>
              <button className="map-expand" onClick={() => setActiveNav('Bản đồ')} aria-label="Xem bản đồ lớn"><Icon name="map" size={18} /></button>
            </section>

            <section className="places-section">
              <div className="section-heading"><div><div className="section-kicker">ĐIỂM ĐẾN GẦN BẠN</div><h2>{activeNav === 'Đã lưu' ? 'Nơi bạn muốn ghé lại' : 'Đi đâu một chút?'}</h2><p>{activeNav === 'Đã lưu' ? `${filteredPlaces.length} địa điểm đã lưu cho lần ghé thăm tiếp theo` : 'Những điểm thú vị chỉ cách bạn vài bước chân.'}</p></div><button className="view-all" onClick={() => setActiveNav('Bản đồ')}>Xem bản đồ <Icon name="arrow" size={16} /></button></div>
              <div className="toolbar"><div className="category-list" role="group" aria-label="Lọc theo danh mục">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item === 'Tất cả' && <span className="chip-dot" />}{item}</button>)}</div><div className="filter-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm..." aria-label="Tìm địa điểm" />{query && <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</label><button className="filter-button" aria-label="Bộ lọc"><Icon name="sliders" size={17} /></button></div></div>

              {poiStatus === 'loading' ? <div className="poi-grid" aria-label="Đang tải địa điểm" aria-busy="true">{[1, 2, 3, 4].map((item) => <article className="poi-skeleton" key={item}><div className="skeleton-image" /><div className="skeleton-body"><i className="skeleton-line short" /><i className="skeleton-line title" /><i className="skeleton-line" /><i className="skeleton-line medium" /><div className="skeleton-footer"><i /><i /></div></div></article>)}</div> : poiStatus === 'error' ? <div className="error-state" role="alert"><span className="error-icon"><Icon name="map" size={22} /></span><div className="error-copy"><strong>Chưa tải được địa điểm</strong><p>Đã có sự cố khi tải danh sách. Bạn thử lại sau một chút nhé.</p></div><button className="retry-button" onClick={retryLoadPlaces}><Icon name="arrow" size={15} /> Thử lại</button></div> : filteredPlaces.length > 0 ? <div className="poi-grid">{filteredPlaces.map((place) => <article className="poi-card" key={place.id}>
                <button className="poi-image-button" onClick={() => setSelected(place)} aria-label={`Xem ${place.name}`}><img className="poi-image" src={place.image} alt="" /><span className="image-tag">{place.tag}</span></button>
                <button className={`save-button ${saved.includes(place.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(place.id)} aria-label={saved.includes(place.id) ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}><Icon name="heart" size={18} /></button>
                <div className="poi-info"><div className="poi-meta"><span>{place.category}</span><span className="rating"><Icon name="star" size={13} /> {place.rating}</span></div><button className="poi-title" onClick={() => setSelected(place)}>{place.name}</button><p className="poi-description">{place.description}</p><div className="poi-footer"><span><Icon name="pin" size={14} /> {place.distance}</span><span className="footer-separator" /><span><Icon name="clock" size={14} /> {place.walk} đi bộ</span><button onClick={() => setSelected(place)} aria-label={`Chi tiết ${place.name}`}><Icon name="arrow" size={16} /></button></div></div>
              </article>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name={activeNav === 'Đã lưu' ? 'heart' : 'search'} size={24} /></span><strong>{activeNav === 'Đã lưu' ? 'Chưa có địa điểm nào được lưu' : 'Chưa tìm thấy địa điểm phù hợp'}</strong><p>{activeNav === 'Đã lưu' ? 'Chạm biểu tượng trái tim trên một địa điểm để lưu lại nhé.' : 'Thử một từ khóa khác hoặc chọn danh mục “Tất cả”.'}</p></div>}
            </section>
          </>}
          <footer className="page-footer"><span>SGU Go <span className="footer-bullet">·</span> Một vòng quanh ngôi trường thân quen</span><span>Được làm bằng <span className="footer-heart">♥</span> tại SGU</span></footer>
        </div>
      </main>

      {qrOpen && <div className="modal-backdrop" role="presentation" onClick={() => setQrOpen(false)}><section className="qr-modal" role="dialog" aria-modal="true" aria-labelledby="qr-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setQrOpen(false)} aria-label="Đóng"><Icon name="close" /></button><div className="qr-modal-heading"><span className="qr-modal-icon">▦</span><div><h2 id="qr-title">Quét mã QR địa điểm</h2><p>Cho phép camera để nhận diện mã QR của POI.</p></div></div><video className="qr-video" ref={qrVideo} muted playsInline /><p className="qr-message" role="status">{qrMessage}</p><form className="qr-manual-form" onSubmit={(event) => { event.preventDefault(); const match = resolveQrPlace(qrCode, poiItems); if (match) { handleMapSelect(match); setQrOpen(false); setQrCode('') } else setQrMessage('Chưa tìm thấy POI. Nhập số 1–4, tên địa điểm, hoặc chọn bên dưới.') }}><input value={qrCode} onChange={(event) => setQrCode(event.target.value)} placeholder="Nhập mã POI hoặc tên địa điểm" aria-label="Mã QR POI" /><button type="submit">Tìm địa điểm</button></form><div className="qr-place-options">{poiItems.map((place) => <button key={place.id} onClick={() => { handleMapSelect(place); setQrOpen(false) }}>{place.name}</button>)}</div></section></div>}

      {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Đóng"><Icon name="close" /></button><div className="detail-image-wrap"><img src={selected.image} alt="" /><span className="image-tag">{selected.tag}</span></div><div className="detail-content"><div className="poi-meta"><span>{selected.category}</span><span className="rating"><Icon name="star" size={13} /> {selected.rating}</span></div><h2 id="detail-title">{selected.name}</h2><p>{selected.description}</p><div className="detail-location"><Icon name="pin" size={17} /> {selected.location}<span>·</span>{selected.distance}</div><div className="audio-guide"><button className={`audio-play ${playing ? 'playing' : ''}`} onClick={() => setPlaying(!playing)}><Icon name={playing ? 'headphones' : 'play'} size={18} /></button><div className="audio-copy"><strong>{playing ? 'Đang phát thuyết minh' : 'Nghe câu chuyện nơi này'}</strong><small>Thuyết minh tiếng Việt · 1:24</small></div><div className={`audio-wave ${playing ? 'wave-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="detail-actions"><button className="primary-action" onClick={() => { setSelected(null); setActiveNav('Bản đồ') }}><Icon name="map" size={18} /> Chỉ đường đến đây</button><button className={`detail-save ${saved.includes(selected.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(selected.id)}><Icon name="heart" size={18} /> {saved.includes(selected.id) ? 'Đã lưu' : 'Lưu địa điểm'}</button></div></div></section></div>}

    </div>
  )
}

export default App

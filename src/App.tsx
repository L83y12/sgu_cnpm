import { useMemo, useState, type ReactNode } from 'react'
import sguBuilding from './assets/sgu-building.png'
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
}

const places: Place[] = [
  {
    id: 1,
    name: 'Tòa nhà chính SGU',
    category: 'Kiến trúc',
    description: 'Một góc Sài Gòn xưa giữa lòng khuôn viên đại học, nơi lưu giữ những câu chuyện của nhiều thế hệ sinh viên.',
    distance: '120 m', walk: '2 phút', rating: '4.9', tag: 'Biểu tượng SGU', location: '273 An Dương Vương, Quận 5',
    image: sguBuilding,
  },
  {
    id: 2,
    name: 'Thư viện trung tâm',
    category: 'Học tập',
    description: 'Không gian yên tĩnh để đọc, học nhóm và khám phá kho tài liệu dành cho sinh viên.',
    distance: '260 m', walk: '4 phút', rating: '4.8', tag: 'Góc yên tĩnh', location: 'Khu B, Trường Đại học Sài Gòn',
    image: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 3,
    name: 'Sân trường thân quen',
    category: 'Không gian xanh',
    description: 'Hàng cây rợp bóng và những chiếc ghế đá quen thuộc — điểm hẹn giữa các tiết học.',
    distance: '340 m', walk: '5 phút', rating: '4.7', tag: 'Được yêu thích', location: 'Sân trung tâm, SGU',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=85',
  },
  {
    id: 4,
    name: 'Cà phê Góc Nhỏ',
    category: 'Ẩm thực',
    description: 'Cà phê rang thơm, món ăn nhẹ và một chỗ nghỉ chân dễ chịu sau vòng tham quan.',
    distance: '450 m', walk: '6 phút', rating: '4.6', tag: 'Sinh viên gợi ý', location: 'Nguyễn Trãi, Quận 5',
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85',
  },
]

const categories: Category[] = ['Tất cả', 'Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh']

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
  const [playing, setPlaying] = useState(false)
  const [language, setLanguage] = useState('VI')

  const filteredPlaces = useMemo(() => places.filter((place) => {
    const matchesCategory = category === 'Tất cả' || place.category === category
    const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery && (activeNav !== 'Đã lưu' || saved.includes(place.id))
  }), [activeNav, category, query, saved])

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
          <button className="profile-button"><span className="avatar">L</span><span><strong>Khách tham quan</strong><small>Khám phá SGU</small></span><span className="more-dots">···</span></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>SGU Go</span><Icon name="chevron" size={14} /><strong>{activeNav}</strong></div>
          <div className="top-actions"><button className="language-button" onClick={() => setLanguage(language === 'VI' ? 'EN' : 'VI')} aria-label="Đổi ngôn ngữ">{language}<span className="language-chevron">⌄</span></button><span className="top-divider" /><button className="help-button">Trợ giúp</button><button className="top-avatar" aria-label="Tài khoản">L</button></div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> THỨ BẠN TÌM ĐANG Ở GẦN ĐÂY</div><h1>Mỗi góc nhỏ,<br /><em>một câu chuyện.</em></h1><p className="welcome-copy">Dạo một vòng quanh Đại học Sài Gòn — khám phá những nơi thân quen theo cách mới.</p></div>
            <div className="today-note"><span className="weather-icon"><Icon name="sun" size={24} /></span><div><strong>Một ngày đẹp để đi bộ</strong><small>Quận 5 · TP. Hồ Chí Minh</small></div></div>
          </section>

          <section className="hero-map" aria-label="Bản đồ khám phá quanh SGU">
            <div className="map-texture" />
            <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
            <span className="map-label map-label-one">AN DƯƠNG VƯƠNG</span><span className="map-label map-label-two">NGUYỄN TRÃI</span><span className="map-label map-label-three">KHUÔN VIÊN SGU</span>
            <div className="map-building building-one" /><div className="map-building building-two" /><div className="map-building building-three" /><div className="map-park"><span>🌿</span></div>
            <div className="map-pin pin-a"><span>1</span><i /></div><div className="map-pin pin-b"><span>2</span><i /></div><div className="map-pin pin-c"><span>3</span><i /></div>
            <div className="map-you"><span /><small>Bạn đang ở đây</small></div>
            <div className="map-overlay-card"><span className="mini-map-icon"><Icon name="map" size={19} /></span><div><strong>Khám phá quanh bạn</strong><small>4 địa điểm trong bán kính 500 m</small></div><button onClick={() => setActiveNav('Bản đồ')} aria-label="Mở bản đồ"><Icon name="arrow" size={18} /></button></div>
            <button className="map-expand" onClick={() => setActiveNav('Bản đồ')} aria-label="Xem bản đồ lớn"><Icon name="map" size={18} /></button>
          </section>

          <section className="places-section">
            <div className="section-heading"><div><div className="section-kicker">ĐIỂM ĐẾN GẦN BẠN</div><h2>{activeNav === 'Đã lưu' ? 'Nơi bạn muốn ghé lại' : activeNav === 'Bản đồ' ? 'Khám phá trên bản đồ' : 'Đi đâu một chút?'}</h2><p>{activeNav === 'Đã lưu' ? `${filteredPlaces.length} địa điểm đã lưu cho lần ghé thăm tiếp theo` : 'Những điểm thú vị chỉ cách bạn vài bước chân.'}</p></div><button className="view-all" onClick={() => setActiveNav('Bản đồ')}>Xem bản đồ <Icon name="arrow" size={16} /></button></div>
            <div className="toolbar"><div className="category-list" role="group" aria-label="Lọc theo danh mục">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item === 'Tất cả' && <span className="chip-dot" />}{item}</button>)}</div><div className="filter-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm địa điểm..." aria-label="Tìm địa điểm" />{query && <button aria-label="Xóa tìm kiếm" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}</label><button className="filter-button" aria-label="Bộ lọc"><Icon name="sliders" size={17} /></button></div></div>

            {filteredPlaces.length > 0 ? <div className="poi-grid">{filteredPlaces.map((place) => <article className="poi-card" key={place.id}>
              <button className="poi-image-button" onClick={() => setSelected(place)} aria-label={`Xem ${place.name}`}><img className="poi-image" src={place.image} alt="" /><span className="image-tag">{place.tag}</span></button>
              <button className={`save-button ${saved.includes(place.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(place.id)} aria-label={saved.includes(place.id) ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}><Icon name="heart" size={18} /></button>
              <div className="poi-info"><div className="poi-meta"><span>{place.category}</span><span className="rating"><Icon name="star" size={13} /> {place.rating}</span></div><button className="poi-title" onClick={() => setSelected(place)}>{place.name}</button><p className="poi-description">{place.description}</p><div className="poi-footer"><span><Icon name="pin" size={14} /> {place.distance}</span><span className="footer-separator" /><span><Icon name="clock" size={14} /> {place.walk} đi bộ</span><button onClick={() => setSelected(place)} aria-label={`Chi tiết ${place.name}`}><Icon name="arrow" size={16} /></button></div></div>
            </article>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name={activeNav === 'Đã lưu' ? 'heart' : 'search'} size={24} /></span><strong>{activeNav === 'Đã lưu' ? 'Chưa có địa điểm nào được lưu' : 'Chưa tìm thấy địa điểm phù hợp'}</strong><p>{activeNav === 'Đã lưu' ? 'Chạm biểu tượng trái tim trên một địa điểm để lưu lại nhé.' : 'Thử một từ khóa khác hoặc chọn danh mục “Tất cả”.'}</p></div>}
          </section>
          <footer className="page-footer"><span>SGU Go <span className="footer-bullet">·</span> Một vòng quanh ngôi trường thân quen</span><span>Được làm bằng <span className="footer-heart">♥</span> tại SGU</span></footer>
        </div>
      </main>

      {selected && <div className="modal-backdrop" role="presentation" onClick={() => setSelected(null)}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Đóng"><Icon name="close" /></button><div className="detail-image-wrap"><img src={selected.image} alt="" /><span className="image-tag">{selected.tag}</span></div><div className="detail-content"><div className="poi-meta"><span>{selected.category}</span><span className="rating"><Icon name="star" size={13} /> {selected.rating}</span></div><h2 id="detail-title">{selected.name}</h2><p>{selected.description}</p><div className="detail-location"><Icon name="pin" size={17} /> {selected.location}<span>·</span>{selected.distance}</div><div className="audio-guide"><button className={`audio-play ${playing ? 'playing' : ''}`} onClick={() => setPlaying(!playing)}><Icon name={playing ? 'headphones' : 'play'} size={18} /></button><div className="audio-copy"><strong>{playing ? 'Đang phát thuyết minh' : 'Nghe câu chuyện nơi này'}</strong><small>Thuyết minh tiếng Việt · 1:24</small></div><div className={`audio-wave ${playing ? 'wave-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="detail-actions"><button className="primary-action" onClick={() => { setSelected(null); setActiveNav('Bản đồ') }}><Icon name="map" size={18} /> Chỉ đường đến đây</button><button className={`detail-save ${saved.includes(selected.id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(selected.id)}><Icon name="heart" size={18} /> {saved.includes(selected.id) ? 'Đã lưu' : 'Lưu địa điểm'}</button></div></div></section></div>}
    </div>
  )
}

export default App

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { Icon } from '../../../app/Icon'
import type { SguAppContext } from '../../../app/AppLayout'
import { NotFoundPage } from '../../../app/NotFoundPage'
import {
  demoPlaces,
  type DemoPlace,
  type DemoPlaceCategory,
} from '../data/demoPlaces'

type Category = 'Tất cả' | DemoPlaceCategory
type SortOption = 'distance' | 'rating' | 'name'

const categories: Category[] = ['Tất cả', 'Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh']
const sortOptions: SortOption[] = ['distance', 'rating', 'name']
const minimumRatingOptions = [0, 4.5, 4.7, 4.8, 4.9]

export function PoiDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    activeNav,
    activePath,
    saved,
    toggleSaved: updateSaved,
  } = useOutletContext<SguAppContext>()
  const { poiId } = useParams()
  const selectedCategory = searchParams.get('category')
  const category = categories.find((item) => item === selectedCategory) ?? 'Tất cả'
  const query = searchParams.get('q') ?? ''
  const selectedSort = searchParams.get('sort')
  const sortBy = sortOptions.find((option) => option === selectedSort) ?? 'distance'
  const selectedMinimumRating = Number(searchParams.get('minRating') ?? 0)
  const minimumRating = minimumRatingOptions.includes(selectedMinimumRating)
    ? selectedMinimumRating
    : 0
  const demoError = searchParams.get('poiState') === 'error'
  const [playing, setPlaying] = useState(false)
  const [poiStatus, setPoiStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [poiItems, setPoiItems] = useState<DemoPlace[]>([])
  const modalRef = useRef<HTMLElement>(null)
  const modalCloseRef = useRef<HTMLButtonElement>(null)
  const selected = poiId ? poiItems.find((place) => String(place.id) === poiId) : undefined
  const focusedPoiId = activeNav === 'Bản đồ' ? searchParams.get('focus') : null
  const focusedPlace = poiItems.find((place) => String(place.id) === focusedPoiId)

  const closePoi = useCallback(() => {
    navigate(`${activePath}${location.search}`)
  }, [activePath, location.search, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (demoError) {
        setPoiStatus('error')
      } else {
        setPoiItems(demoPlaces)
        setPoiStatus('success')
      }
    }, 650)
    return () => window.clearTimeout(timer)
  }, [demoError])

  useEffect(() => {
    if (!selected) {
      return
    }

    const previouslyFocused = document.activeElement
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalCloseRef.current?.focus()

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closePoi()
        return
      }

      if (event.key !== 'Tab' || !modalRef.current) {
        return
      }

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      const firstElement = focusableElements.item(0)
      const lastElement = focusableElements.item(focusableElements.length - 1)

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleModalKeyDown)

    return () => {
      document.removeEventListener('keydown', handleModalKeyDown)
      document.body.style.overflow = previousBodyOverflow
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [closePoi, selected])

  function retryLoadPlaces() {
    setPoiStatus('loading')
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('poiState')
      return nextParams
    }, { replace: true })
  }

  const filteredPlaces = useMemo(() => {
    const matches = poiItems.filter((place) => {
      const matchesCategory = category === 'Tất cả' || place.category === category
      const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(query.toLowerCase())
      const matchesMinimumRating = Number(place.rating) >= minimumRating
      return matchesCategory
        && matchesQuery
        && matchesMinimumRating
        && (activeNav !== 'Đã lưu' || saved.includes(place.id))
    })

    return matches.sort((first, second) => {
      if (sortBy === 'rating') {
        return Number(second.rating) - Number(first.rating)
      }

      if (sortBy === 'name') {
        return first.name.localeCompare(second.name, 'vi')
      }

      return Number.parseInt(first.distance, 10) - Number.parseInt(second.distance, 10)
    })
  }, [activeNav, category, minimumRating, poiItems, query, saved, sortBy])

  function updateFilter(
    name: 'category' | 'q' | 'sort' | 'minRating',
    value: string,
  ) {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)

      if (value) {
        nextParams.set(name, value)
      } else {
        nextParams.delete(name)
      }

      return nextParams
    }, { replace: true })
  }

  function clearFilters() {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('category')
      nextParams.delete('q')
      nextParams.delete('sort')
      nextParams.delete('minRating')
      return nextParams
    }, { replace: true })
  }

  const hasActiveFilters = query !== ''
    || category !== 'Tất cả'
    || sortBy !== 'distance'
    || minimumRating > 0

  function openPoi(poiId: number) {
    navigate(`/poi/${poiId}${location.search}`, {
      state: { returnTo: activePath },
    })
  }

  function openPoiOnMap(poiId: number) {
    const nextParams = new URLSearchParams(location.search)
    nextParams.set('focus', String(poiId))
    navigate(`/map?${nextParams.toString()}`, {
      state: { returnTo: '/map' },
    })
  }

  if (poiId && poiStatus === 'success' && !selected) {
    return <NotFoundPage />
  }

  return (
    <>
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> THỨ BẠN TÌM ĐANG Ở GẦN ĐÂY</div><h1>Mỗi góc nhỏ,<br /><em>một câu chuyện.</em></h1><p className="welcome-copy">Dạo một vòng quanh Đại học Sài Gòn — khám phá những nơi thân quen theo cách mới.</p></div>
            <div className="today-note"><span className="weather-icon"><Icon name="sun" size={24} /></span><div><strong>Một ngày đẹp để đi bộ</strong><small>Quận 5 · TP. Hồ Chí Minh</small></div></div>
          </section>

          <section className="hero-map" aria-label="Bản đồ khám phá quanh SGU">
            <div className="map-texture" />
            <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
            <span className="map-label map-label-one">AN DƯƠNG VƯƠNG</span><span className="map-label map-label-two">NGUYỄN TRÃI</span><span className="map-label map-label-three">KHUÔN VIÊN SGU</span>
            <div className="map-building building-one" /><div className="map-building building-two" /><div className="map-building building-three" /><div className="map-park"><span>🌿</span></div>
            <button className={`map-pin pin-a ${focusedPoiId === '1' ? 'is-focused' : ''}`} onClick={() => openPoi(1)} aria-pressed={focusedPoiId === '1'} aria-label="Xem Tòa nhà chính SGU"><span>1</span><i /></button><button className={`map-pin pin-b ${focusedPoiId === '2' ? 'is-focused' : ''}`} onClick={() => openPoi(2)} aria-pressed={focusedPoiId === '2'} aria-label="Xem Thư viện trung tâm"><span>2</span><i /></button><button className={`map-pin pin-c ${focusedPoiId === '3' ? 'is-focused' : ''}`} onClick={() => openPoi(3)} aria-pressed={focusedPoiId === '3'} aria-label="Xem Sân trường thân quen"><span>3</span><i /></button><button className={`map-pin pin-d ${focusedPoiId === '4' ? 'is-focused' : ''}`} onClick={() => openPoi(4)} aria-pressed={focusedPoiId === '4'} aria-label="Xem Cà phê Góc Nhỏ"><span>4</span><i /></button>
            {focusedPlace && <div className="map-focus-notice" aria-live="polite"><span><Icon name="pin" size={14} /> Đang xem: {focusedPlace.name}</span><button onClick={() => setSearchParams((currentParams) => { const nextParams = new URLSearchParams(currentParams); nextParams.delete('focus'); return nextParams }, { replace: true })} aria-label="Bỏ chọn địa điểm trên bản đồ"><Icon name="close" size={14} /></button></div>}
            <div className="map-you"><span /><small>Bạn đang ở đây</small></div>
            <div className="map-overlay-card"><span className="mini-map-icon"><Icon name="map" size={19} /></span><div><strong>Khám phá quanh bạn</strong><small>4 địa điểm trong bán kính 500 m</small></div><button onClick={() => navigate('/map')} aria-label="Mở bản đồ"><Icon name="arrow" size={18} /></button></div>
            <button className="map-expand" onClick={() => navigate('/map')} aria-label="Xem bản đồ lớn"><Icon name="map" size={18} /></button>
          </section>

          <section className="places-section">
            <div className="section-heading"><div><div className="section-kicker">ĐIỂM ĐẾN GẦN BẠN</div><h2>{activeNav === 'Đã lưu' ? 'Nơi bạn muốn ghé lại' : activeNav === 'Bản đồ' ? 'Khám phá trên bản đồ' : 'Đi đâu một chút?'}</h2><p>{activeNav === 'Đã lưu' ? `${filteredPlaces.length} địa điểm đã lưu cho lần ghé thăm tiếp theo` : 'Những điểm thú vị chỉ cách bạn vài bước chân.'}</p></div><button className="view-all" onClick={() => navigate('/map')}>Xem bản đồ <Icon name="arrow" size={16} /></button></div>
            <div className="toolbar"><div className="category-list" role="group" aria-label="Lọc theo danh mục">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => updateFilter('category', item === 'Tất cả' ? '' : item)}>{item === 'Tất cả' && <span className="chip-dot" />}{item}</button>)}</div><div className="filter-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Tìm địa điểm..." aria-label="Tìm địa điểm" />{query && <button aria-label="Xóa tìm kiếm" onClick={() => updateFilter('q', '')}><Icon name="close" size={15} /></button>}</label><details className="filter-menu"><summary className={`filter-button ${sortBy !== 'distance' || minimumRating > 0 ? 'has-filters' : ''}`} aria-label="Mở bộ lọc" title="Bộ lọc"><Icon name="sliders" size={17} /></summary><div className="filter-panel"><label className="filter-field"><span>Sắp xếp theo</span><select aria-label="Sắp xếp theo" value={sortBy} onChange={(event) => updateFilter('sort', event.target.value === 'distance' ? '' : event.target.value)}><option value="distance">Gần nhất</option><option value="rating">Đánh giá cao nhất</option><option value="name">Tên A–Z</option></select></label><label className="filter-field"><span>Đánh giá tối thiểu</span><select aria-label="Đánh giá tối thiểu" value={minimumRating} onChange={(event) => updateFilter('minRating', event.target.value === '0' ? '' : event.target.value)}><option value="0">Tất cả mức đánh giá</option><option value="4.5">Từ 4.5 sao</option><option value="4.7">Từ 4.7 sao</option><option value="4.8">Từ 4.8 sao</option><option value="4.9">Từ 4.9 sao</option></select></label><p className="filter-result-count">{filteredPlaces.length} địa điểm phù hợp</p></div></details></div></div>

            {poiStatus === 'loading' ? <div className="poi-grid" aria-label="Đang tải địa điểm" aria-busy="true">{[1, 2, 3, 4].map((item) => <article className="poi-skeleton" key={item}><div className="skeleton-image" /><div className="skeleton-body"><i className="skeleton-line short" /><i className="skeleton-line title" /><i className="skeleton-line" /><i className="skeleton-line medium" /><div className="skeleton-footer"><i /><i /></div></div></article>)}</div> : poiStatus === 'error' ? <div className="error-state" role="alert"><span className="error-icon"><Icon name="map" size={22} /></span><div className="error-copy"><strong>Chưa tải được địa điểm</strong><p>Đã có sự cố khi tải danh sách. Bạn thử lại sau một chút nhé.</p></div><button className="retry-button" onClick={retryLoadPlaces}><Icon name="arrow" size={15} /> Thử lại</button></div> : filteredPlaces.length > 0 ? <div className="poi-grid">{filteredPlaces.map((place) => <article className="poi-card" key={place.id}>
              <button className="poi-image-button" onClick={() => openPoi(place.id)} aria-label={`Xem ${place.name}`}><img className="poi-image" src={place.image} alt="" /><span className="image-tag">{place.tag}</span></button>
              <button className={`save-button ${saved.includes(place.id) ? 'is-saved' : ''}`} onClick={() => updateSaved(place.id)} aria-label={saved.includes(place.id) ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}><Icon name="heart" size={18} /></button>
              <div className="poi-info"><div className="poi-meta"><span>{place.category}</span><span className="rating"><Icon name="star" size={13} /> {place.rating}</span></div><button className="poi-title" onClick={() => openPoi(place.id)}>{place.name}</button><p className="poi-description">{place.description}</p><div className="poi-footer"><span><Icon name="pin" size={14} /> {place.distance}</span><span className="footer-separator" /><span><Icon name="clock" size={14} /> {place.walk} đi bộ</span><button onClick={() => openPoi(place.id)} aria-label={`Chi tiết ${place.name}`}><Icon name="arrow" size={16} /></button></div></div>
            </article>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name={activeNav === 'Đã lưu' ? 'heart' : 'search'} size={24} /></span><strong>{activeNav === 'Đã lưu' ? saved.length === 0 ? 'Chưa có địa điểm nào được lưu' : 'Không tìm thấy địa điểm đã lưu phù hợp' : 'Chưa tìm thấy địa điểm phù hợp'}</strong><p>{activeNav === 'Đã lưu' ? saved.length === 0 ? 'Chạm biểu tượng trái tim trên một địa điểm để lưu lại nhé.' : 'Thử xóa bộ lọc hoặc thay đổi từ khóa tìm kiếm.' : 'Thử một từ khóa khác hoặc điều chỉnh bộ lọc.'}</p>{activeNav === 'Đã lưu' && saved.length === 0 ? <button className="clear-filters-button" onClick={() => navigate('/')}>Khám phá địa điểm</button> : hasActiveFilters && <button className="clear-filters-button" onClick={clearFilters}>Xóa bộ lọc</button>}</div>}
          </section>
          <footer className="page-footer"><span>SGU Go <span className="footer-bullet">·</span> Một vòng quanh ngôi trường thân quen</span><span>Được làm bằng <span className="footer-heart">♥</span> tại SGU</span></footer>
      {selected && <div className="modal-backdrop" role="presentation" onClick={closePoi}><section ref={modalRef} className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button ref={modalCloseRef} className="modal-close" onClick={closePoi} aria-label="Đóng"><Icon name="close" /></button><div className="detail-image-wrap"><img src={selected.image} alt="" /><span className="image-tag">{selected.tag}</span></div><div className="detail-content"><div className="poi-meta"><span>{selected.category}</span><span className="rating"><Icon name="star" size={13} /> {selected.rating}</span></div><h2 id="detail-title">{selected.name}</h2><p>{selected.description}</p><div className="detail-location"><Icon name="pin" size={17} /> {selected.location}<span>·</span>{selected.distance}</div><div className="audio-guide"><button className={`audio-play ${playing ? 'playing' : ''}`} onClick={() => setPlaying(!playing)}><Icon name={playing ? 'headphones' : 'play'} size={18} /></button><div className="audio-copy"><strong>{playing ? 'Đang phát thuyết minh' : 'Nghe câu chuyện nơi này'}</strong><small>Thuyết minh tiếng Việt · 1:24</small></div><div className={`audio-wave ${playing ? 'wave-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="detail-actions"><button className="primary-action" onClick={() => openPoiOnMap(selected.id)}><Icon name="map" size={18} /> Xem trên bản đồ</button><button className={`detail-save ${saved.includes(selected.id) ? 'is-saved' : ''}`} onClick={() => updateSaved(selected.id)}><Icon name="heart" size={18} /> {saved.includes(selected.id) ? 'Đã lưu' : 'Lưu địa điểm'}</button></div></div></section></div>}
    </>
  )
}

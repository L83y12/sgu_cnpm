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
import { reportListeningEnd, reportListeningStart } from '../../../analytics'
import { translate } from '../../../i18n/translations'
import { localizedPlace } from '../../../i18n/placeTranslations'
import {
  type DemoPlace,
  type DemoPlaceCategory,
} from '../data/demoPlaces'

type Category = 'Tất cả' | DemoPlaceCategory
type SortOption = 'distance' | 'rating' | 'name'
type Locale = SguAppContext['language']

const categories: Category[] = ['Tất cả', 'Kiến trúc', 'Học tập', 'Ẩm thực', 'Không gian xanh', 'Thể thao']
const sortOptions: SortOption[] = ['distance', 'rating', 'name']
const minimumRatingOptions = [0, 4.5, 4.7, 4.8, 4.9]
const categoryKeys: Record<Category, Parameters<typeof translate>[1]> = {
  'Tất cả': 'all',
  'Kiến trúc': 'architecture',
  'Học tập': 'study',
  'Ẩm thực': 'food',
  'Không gian xanh': 'green',
  'Thể thao': 'sports',
}

function distanceBetween(first: { lat: number; lng: number }, second: { lat: number; lng: number }) {
  const radians = Math.PI / 180
  const latitudeDifference = (second.lat - first.lat) * radians
  const longitudeDifference = (second.lng - first.lng) * radians
  const firstLatitude = first.lat * radians
  const secondLatitude = second.lat * radians
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function placeDistance(place: DemoPlace, position: { lat: number; lng: number } | null, language: Locale) {
  if (!position) return place.distance
  const distance = distanceBetween(position, place)
  const rounded = new Intl.NumberFormat(language, { maximumFractionDigits: distance >= 1000 ? 1 : 0 })
  return distance >= 1000
    ? `${rounded.format(distance / 1000)} ${translate(language, 'kilometers')}`
    : `${rounded.format(Math.round(distance))} ${translate(language, 'meters')}`
}

export function PoiDiscoveryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    activeNav,
    activePath,
    saved,
    language,
    places: poiItems,
    userPosition,
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
  const modalRef = useRef<HTMLElement>(null)
  const modalCloseRef = useRef<HTMLButtonElement>(null)
  const speakingPoiId = useRef<number | null>(null)
  const selected = poiId ? poiItems.find((place) => String(place.id) === poiId) : undefined
  const localizedSelected = selected ? localizedPlace(selected, language) : undefined
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

  function toggleNarration() {
    if (!selected || !('speechSynthesis' in window)) return
    if (playing) {
      window.speechSynthesis.cancel()
      void reportListeningEnd(selected.id)
      speakingPoiId.current = null
      setPlaying(false)
      return
    }
    const copy = localizedPlace(selected, language)
    const utterance = new SpeechSynthesisUtterance(copy.narration || copy.description)
    utterance.lang = language === 'en' ? 'en-US' : 'vi-VN'
    utterance.onend = () => {
      speakingPoiId.current = null
      setPlaying(false)
      void reportListeningEnd(selected.id)
    }
    utterance.onerror = () => {
      speakingPoiId.current = null
      setPlaying(false)
      void reportListeningEnd(selected.id)
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    speakingPoiId.current = selected.id
    setPlaying(true)
    void reportListeningStart(selected.id)
  }

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
    if (speakingPoiId.current !== null) void reportListeningEnd(speakingPoiId.current)
  }, [])

  const filteredPlaces = useMemo(() => {
    const matches = poiItems.filter((place) => {
      const matchesCategory = category === 'Tất cả' || place.category === category
      const matchesQuery = `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(query.toLowerCase())
      const matchesMinimumRating = minimumRating === 0 || Number(place.rating) >= minimumRating
      return matchesCategory
        && matchesQuery
        && matchesMinimumRating
        && (activeNav !== 'Đã lưu' || saved.includes(place.id))
    })

    return matches.sort((first, second) => {
    if (userPosition) {
      return distanceBetween(userPosition, first) - distanceBetween(userPosition, second)
    }
    if (sortBy === 'rating') {
        return Number(second.rating) - Number(first.rating)
      }

      if (sortBy === 'name') {
        return first.name.localeCompare(second.name, 'vi')
      }

      return Number.parseInt(first.distance, 10) - Number.parseInt(second.distance, 10)
    })
  }, [activeNav, category, minimumRating, poiItems, query, saved, sortBy, userPosition])

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
            <div><div className="eyebrow"><span className="eyebrow-line" /> {translate(language, 'homeEyebrow')}</div><h1>{translate(language, 'homeTitleFirst')}<br /><em>{translate(language, 'homeTitleSecond')}</em></h1><p className="welcome-copy">{translate(language, 'homeCopy')}</p></div>
            <div className="today-note"><span className="weather-icon"><Icon name="sun" size={24} /></span><div><strong>{translate(language, 'today')}</strong><small>{translate(language, 'district')}</small></div></div>
          </section>

          <section className="hero-map" aria-label={translate(language, 'homeMapAria')}>
            <div className="map-texture" />
            <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
            <span className="map-label map-label-one">AN DƯƠNG VƯƠNG</span><span className="map-label map-label-two">NGUYỄN TRÃI</span><span className="map-label map-label-three">KHUÔN VIÊN SGU</span>
            <div className="map-building building-one" /><div className="map-building building-two" /><div className="map-building building-three" /><div className="map-park"><span>🌿</span></div>
            <button className={`map-pin pin-a ${focusedPoiId === '1' ? 'is-focused' : ''}`} onClick={() => openPoi(1)} aria-pressed={focusedPoiId === '1'} aria-label={translate(language, 'placeDetails', { name: poiItems.find((place) => place.id === 1)?.name ?? '' })}><span>1</span><i /></button><button className={`map-pin pin-b ${focusedPoiId === '2' ? 'is-focused' : ''}`} onClick={() => openPoi(2)} aria-pressed={focusedPoiId === '2'} aria-label={translate(language, 'placeDetails', { name: poiItems.find((place) => place.id === 2)?.name ?? '' })}><span>2</span><i /></button><button className={`map-pin pin-c ${focusedPoiId === '5' ? 'is-focused' : ''}`} onClick={() => openPoi(5)} aria-pressed={focusedPoiId === '5'} aria-label={translate(language, 'placeDetails', { name: poiItems.find((place) => place.id === 5)?.name ?? '' })}><span>3</span><i /></button><button className={`map-pin pin-d ${focusedPoiId === '6' ? 'is-focused' : ''}`} onClick={() => openPoi(6)} aria-pressed={focusedPoiId === '6'} aria-label={translate(language, 'placeDetails', { name: poiItems.find((place) => place.id === 6)?.name ?? '' })}><span>4</span><i /></button>
            {focusedPlace && <div className="map-focus-notice" aria-live="polite"><span><Icon name="pin" size={14} /> {translate(language, 'placeInfo')}: {focusedPlace.name}</span><button onClick={() => setSearchParams((currentParams) => { const nextParams = new URLSearchParams(currentParams); nextParams.delete('focus'); return nextParams }, { replace: true })} aria-label={translate(language, 'close')}><Icon name="close" size={14} /></button></div>}
            <div className="map-you"><span /><small>{translate(language, 'currentLocation')}</small></div>
            <div className="map-overlay-card"><span className="mini-map-icon"><Icon name="map" size={19} /></span><div><strong>{translate(language, 'nearby')}</strong><small>{translate(language, 'placeCount', { count: poiItems.length })}</small></div><button onClick={() => navigate('/map')} aria-label={translate(language, 'openMap')}><Icon name="arrow" size={18} /></button></div>
            <button className="map-expand" onClick={() => navigate('/map')} aria-label={translate(language, 'expandMap')}><Icon name="map" size={18} /></button>
          </section>

          <section className="places-section">
            <div className="section-heading"><div><div className="section-kicker">{translate(language, 'nearbyHeading')}</div><h2>{activeNav === 'Đã lưu' ? translate(language, 'savedHeading') : translate(language, 'discoveryHeading')}</h2><p>{activeNav === 'Đã lưu' ? translate(language, 'savedCount', { count: filteredPlaces.length }) : userPosition ? translate(language, 'distanceMode') : translate(language, 'nearbyCopy')}</p></div><button className="view-all" onClick={() => navigate('/map')}>{translate(language, 'viewMap')} <Icon name="arrow" size={16} /></button></div>
            <div className="toolbar"><div className="category-list" role="group" aria-label={translate(language, 'filterCategories')}>{categories.map((item) => <button key={item} className={`category-chip ${category === item ? 'selected' : ''}`} onClick={() => updateFilter('category', item === 'Tất cả' ? '' : item)}>{item === 'Tất cả' && <span className="chip-dot" />}{translate(language, categoryKeys[item])}</button>)}</div><div className="filter-actions"><label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => updateFilter('q', event.target.value)} placeholder={translate(language, 'search')} aria-label={translate(language, 'search')} />{query && <button aria-label={translate(language, 'clearSearch')} onClick={() => updateFilter('q', '')}><Icon name="close" size={15} /></button>}</label><details className="filter-menu"><summary className={`filter-button ${sortBy !== 'distance' || minimumRating > 0 ? 'has-filters' : ''}`} aria-label={translate(language, 'filterCategories')} title={translate(language, 'filterCategories')}><Icon name="sliders" size={17} /></summary><div className="filter-panel"><label className="filter-field"><span>{translate(language, 'sortBy')}</span><select aria-label={translate(language, 'sortBy')} value={sortBy} onChange={(event) => updateFilter('sort', event.target.value === 'distance' ? '' : event.target.value)}><option value="distance">{translate(language, 'nearest')}</option><option value="rating">{translate(language, 'highestRated')}</option><option value="name">{translate(language, 'nameAZ')}</option></select></label><label className="filter-field"><span>{translate(language, 'minimumRating')}</span><select aria-label={translate(language, 'minimumRating')} value={minimumRating} onChange={(event) => updateFilter('minRating', event.target.value === '0' ? '' : event.target.value)}><option value="0">{translate(language, 'allRatings')}</option><option value="4.5">4.5+</option><option value="4.7">4.7+</option><option value="4.8">4.8+</option><option value="4.9">4.9+</option></select></label><p className="filter-result-count">{translate(language, 'matchingPlaces', { count: filteredPlaces.length })}</p></div></details></div></div>

            {poiStatus === 'loading' ? <div className="poi-grid" aria-label={translate(language, 'placesLoading')} aria-busy="true">{[1, 2, 3, 4].map((item) => <article className="poi-skeleton" key={item}><div className="skeleton-image" /><div className="skeleton-body"><i className="skeleton-line short" /><i className="skeleton-line title" /><i className="skeleton-line" /><i className="skeleton-line medium" /><div className="skeleton-footer"><i /><i /></div></div></article>)}</div> : poiStatus === 'error' ? <div className="error-state" role="alert"><span className="error-icon"><Icon name="map" size={22} /></span><div className="error-copy"><strong>{translate(language, 'loadError')}</strong><p>{translate(language, 'loadErrorCopy')}</p></div><button className="retry-button" onClick={retryLoadPlaces}><Icon name="arrow" size={15} /> {translate(language, 'retry')}</button></div> : filteredPlaces.length > 0 ? <div className="poi-grid">{filteredPlaces.map((place) => <article className="poi-card" key={place.id}>
              <button className="poi-image-button" onClick={() => openPoi(place.id)} aria-label={translate(language, 'placeDetails', { name: localizedPlace(place, language).name })}><img className="poi-image" src={place.image} alt="" /><span className="image-tag">{localizedPlace(place, language).tag}</span></button>
              <button className={`save-button ${saved.includes(place.id) ? 'is-saved' : ''}`} onClick={() => updateSaved(place.id)} aria-label={saved.includes(place.id) ? translate(language, 'removeSaved') : translate(language, 'savePlace')}><Icon name="heart" size={18} /></button>
              <div className="poi-info"><div className="poi-meta"><span>{translate(language, categoryKeys[place.category])}</span>{place.rating !== '—' && <span className="rating"><Icon name="star" size={13} /> {place.rating}</span>}</div><button className="poi-title" onClick={() => openPoi(place.id)}>{localizedPlace(place, language).name}</button><p className="poi-description">{localizedPlace(place, language).description}</p><div className="poi-footer"><span><Icon name="pin" size={14} /> {placeDistance(place, userPosition, language)}</span>{place.walk !== '—' && <><span className="footer-separator" /><span><Icon name="clock" size={14} /> {place.walk} {translate(language, 'walkLabel')}</span></>}<button onClick={() => openPoi(place.id)} aria-label={translate(language, 'placeDetails', { name: localizedPlace(place, language).name })}><Icon name="arrow" size={16} /></button></div></div>
            </article>)}</div> : <div className="empty-state"><span className="empty-icon"><Icon name={activeNav === 'Đã lưu' ? 'heart' : 'search'} size={24} /></span><strong>{activeNav === 'Đã lưu' && saved.length === 0 ? translate(language, 'noSaved') : translate(language, 'noMatches')}</strong><p>{activeNav === 'Đã lưu' && saved.length === 0 ? translate(language, 'noSavedCopy') : translate(language, 'noMatchesCopy')}</p>{activeNav === 'Đã lưu' && saved.length === 0 ? <button className="clear-filters-button" onClick={() => navigate('/')}>{translate(language, 'discover')}</button> : hasActiveFilters && <button className="clear-filters-button" onClick={clearFilters}>{translate(language, 'clearFilters')}</button>}</div>}
          </section>
          <footer className="page-footer"><span>SGU Go <span className="footer-bullet">·</span> {translate(language, 'footer')}</span><span>{translate(language, 'madeAtSgu').split('♥')[0]}<span className="footer-heart">♥</span>{translate(language, 'madeAtSgu').split('♥')[1]}</span></footer>
      {selected && localizedSelected && <div className="modal-backdrop" role="presentation" onClick={closePoi}><section ref={modalRef} className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}><button ref={modalCloseRef} className="modal-close" onClick={closePoi} aria-label={translate(language, 'close')}><Icon name="close" /></button><div className="detail-image-wrap"><img src={selected.image} alt="" /><span className="image-tag">{localizedSelected.tag}</span></div><div className="detail-content"><div className="poi-meta"><span>{translate(language, categoryKeys[selected.category])}</span>{selected.rating !== '—' && <span className="rating"><Icon name="star" size={13} /> {selected.rating}</span>}</div><h2 id="detail-title">{localizedSelected.name}</h2><p>{localizedSelected.description}</p><div className="detail-location"><Icon name="pin" size={17} /> {localizedSelected.location}<span>·</span>{placeDistance(selected, userPosition, language)}</div><div className="audio-guide"><button className={`audio-play ${playing ? 'playing' : ''}`} onClick={toggleNarration} aria-label={translate(language, playing ? 'stopNarration' : 'playNarration')}><Icon name={playing ? 'headphones' : 'play'} size={18} /></button><div className="audio-copy"><strong>{playing ? translate(language, 'narrationPlaying', { name: localizedSelected.name }) : translate(language, 'narrationIdle')}</strong><small>{translate(language, 'audioVietnamese')}</small></div><div className={`audio-wave ${playing ? 'wave-playing' : ''}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><div className="detail-actions"><button className="primary-action" onClick={() => openPoiOnMap(selected.id)}><Icon name="map" size={18} /> {translate(language, 'openMap')}</button><button className={`detail-save ${saved.includes(selected.id) ? 'is-saved' : ''}`} onClick={() => updateSaved(selected.id)}><Icon name="heart" size={18} /> {saved.includes(selected.id) ? translate(language, 'saved') : translate(language, 'savePlace')}</button></div></div></section></div>}
    </>
  )
}

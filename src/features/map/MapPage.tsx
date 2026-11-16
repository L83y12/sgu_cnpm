import { useMemo, useState } from 'react'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import { Icon } from '../../app/Icon'
import type { SguAppContext } from '../../app/AppLayout'
import { fallbackPoiImage } from '../../assets/poiImage'
import { translate } from '../../i18n/translations'
import { localizedCampusAddress } from '../../i18n/placeTranslations'
import type { CampusId, DemoPlace } from '../poi/data/demoPlaces'
import { campusDirectionsUrl, campuses, distanceMeters, formatDistance } from './campuses'
import { LeafletMapView, type MapPoi } from './LeafletMapView'

type MappablePlace = DemoPlace & { lat: number; lng: number }

/** Explore: pick a campus, filter its places, see them on the map and listen to any of them. */
export function MapPage() {
  const {
    language, places, userPosition, userAccuracy, tracking, geoMessage, toggleLocate,
    narration, playNarration, pauseNarration, analytics,
  } = useOutletContext<SguAppContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [campusId, setCampusId] = useState<CampusId>('main')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const campus = campuses.find((item) => item.id === campusId) ?? campuses[0]

  const campusPlaces = useMemo(() => places.filter((place): place is MappablePlace =>
    place.campusId === campusId && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat !== 0 && place.lng !== 0), [campusId, places])
  const categories = useMemo(() => [...new Set(campusPlaces.map((place) => place.category))], [campusPlaces])
  const activeCategory = categories.includes(category) ? category : ''
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return campusPlaces.filter((place) =>
      (!activeCategory || place.category === activeCategory)
      && (!needle || `${place.name} ${place.category} ${place.location}`.toLowerCase().includes(needle)))
  }, [activeCategory, campusPlaces, query])
  const mapPlaces = useMemo<MapPoi[]>(() => filtered.map((place) => ({
    id: place.id, name: place.name, category: place.category, location: place.location, lat: place.lat, lng: place.lng,
  })), [filtered])
  // Sorting by distance only reorders the list; it must not rebuild the map markers.
  const listPlaces = useMemo(() => userPosition
    ? [...filtered].sort((first, second) => distanceMeters(userPosition, first) - distanceMeters(userPosition, second))
    : filtered, [filtered, userPosition])

  const selectedPlaceId = Number(searchParams.get('focus')) || null
  const selected = filtered.find((place) => place.id === selectedPlaceId) ?? null

  function selectPlace(id: number | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (id) next.set('focus', String(id))
      else next.delete('focus')
      return next
    }, { replace: true })
  }

  function togglePlay(place: DemoPlace) {
    if (narration.playing && narration.poiId === place.id) pauseNarration()
    else playNarration(place.id)
  }
  const isPlaying = (id: number) => narration.playing && narration.poiId === id

  return (
    <section className="map-page" aria-labelledby="campus-map-heading">
      <header className="map-page-heading">
        <div>
          <div className="section-kicker">{translate(language, 'mapKicker')}</div>
          <h1 id="campus-map-heading">{translate(language, 'exploreTitle')}</h1>
          <p>{translate(language, 'exploreCopy')}</p>
        </div>
        <div className="map-demo-badge"><span />{translate(language, 'placeCount', { count: filtered.length })}</div>
      </header>
      <div className="campus-map-tabs" role="group" aria-label={translate(language, 'campusTabs')}>
        {campuses.map((item) => (
          <button
            className={`campus-map-tab${item.id === campusId ? ' is-active' : ''}`}
            key={item.id}
            onClick={() => { setCampusId(item.id); setCategory(''); setQuery(''); selectPlace(null) }}
            aria-pressed={item.id === campusId}
          >
            {translate(language, item.label)}
          </button>
        ))}
        <span className="campus-map-address">{localizedCampusAddress(campus.id, language, campus.address)}</span>
      </div>

      <div className="explore-filters">
        <div className="category-list" role="group" aria-label={translate(language, 'filterCategories')}>
          <button className={`category-chip ${activeCategory === '' ? 'selected' : ''}`} onClick={() => setCategory('')}>{translate(language, 'allCategories')}</button>
          {categories.map((item) => <button key={item} className={`category-chip ${activeCategory === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <label className="search-box"><Icon name="search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translate(language, 'searchPlaces')} aria-label={translate(language, 'searchPlaces')} /></label>
      </div>

      <div className="map-workspace">
        <div className="map-screen-canvas">
          <LeafletMapView
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={(place) => selectPlace(place.id)}
            center={campus.center}
            language={language}
            userPosition={userPosition}
            userAccuracy={userAccuracy}
            tracking={tracking}
            geoMessage={geoMessage}
            onToggleLocate={toggleLocate}
            routeTarget={selected ? { lat: selected.lat, lng: selected.lng, name: selected.name, radius: selected.triggerRadius ?? 50 } : null}
          />
        </div>
        <aside className="map-results">
          {selected && (
            <article className="explore-selected">
              <img src={selected.image} alt="" onError={(event) => { event.currentTarget.src = fallbackPoiImage }} />
              <div className="explore-selected-body">
                <strong>{selected.name}</strong>
                <small>{selected.category} · {selected.location}</small>
                <p>{selected.description}</p>
                <div className="explore-selected-actions">
                  <button className="nearest-listen" onClick={() => togglePlay(selected)}>{isPlaying(selected.id) ? translate(language, 'pause') : <><Icon name="play" size={14} /> {translate(language, 'play')}</>}</button>
                  <a className="nearest-details" href={campusDirectionsUrl(selected)} target="_blank" rel="noreferrer">{translate(language, 'directionsLink')}</a>
                </div>
                <small>{translate(language, 'heardCount', { count: analytics.pois[String(selected.id)]?.heard ?? 0 })} · {translate(language, 'previewCount', { count: analytics.pois[String(selected.id)]?.preview ?? 0 })} · {translate(language, 'currentlyListening', { count: analytics.pois[String(selected.id)]?.active ?? 0 })}</small>
              </div>
            </article>
          )}
          <div className="map-results-heading">
            <div><h2>{translate(language, 'placeInfo')}</h2><p>{translate(language, 'coordinateNote', { count: filtered.length })}</p></div>
            <span className="map-count">{filtered.length}</span>
          </div>
          {listPlaces.length ? (
            <div className="map-place-list">
              {listPlaces.map((place) => (
                <div className={`map-place-row${place.id === selectedPlaceId ? ' is-selected' : ''}`} key={place.id}>
                  <button className="map-place-main" onClick={() => selectPlace(place.id)}>
                    <img className="map-place-thumb" src={place.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = fallbackPoiImage }} />
                    <span className="map-place-copy"><strong>{place.name}</strong><small>{place.category}{userPosition ? <><i>·</i>{formatDistance(distanceMeters(userPosition, place))}</> : null}</small></span>
                  </button>
                  <button className={`map-place-play${isPlaying(place.id) ? ' is-playing' : ''}`} onClick={() => togglePlay(place)} aria-label={isPlaying(place.id) ? translate(language, 'stopNarration') : `${translate(language, 'playNarration')}: ${place.name}`}>
                    {isPlaying(place.id) ? <i className="stop-square" /> : <Icon name="play" size={15} />}
                  </button>
                </div>
              ))}
            </div>
          ) : <p className="map-empty">{query || activeCategory ? translate(language, 'noMatches') : translate(language, 'noCoordinates')}</p>}
        </aside>
      </div>
    </section>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import { Icon } from '../../app/Icon'
import type { SguAppContext } from '../../app/AppLayout'
import { translate } from '../../i18n/translations'
import { localizedCampusAddress } from '../../i18n/placeTranslations'
import type { CampusId, DemoPlace } from '../poi/data/demoPlaces'
import { LeafletMapView, type MapPoi } from './LeafletMapView'

const campuses: { id: CampusId; label: 'mainCampus' | 'campusOne' | 'campusTwo'; address: string; center: readonly [number, number] }[] = [
  { id: 'main', label: 'mainCampus', address: '273 An Dương Vương, Chợ Quán, TP.HCM', center: [10.7598, 106.6822] },
  { id: 'campus-1', label: 'campusOne', address: '105 Bà Huyện Thanh Quan, Xuân Hòa, TP.HCM', center: [10.7792, 106.6841] },
  { id: 'campus-2', label: 'campusTwo', address: '4 Tôn Đức Thắng, Sài Gòn, TP.HCM', center: [10.7832, 106.7063] },
]

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

export function MapPage() {
  const { language, places, onLocate, userPosition } = useOutletContext<SguAppContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [campusId, setCampusId] = useState<CampusId>('main')
  const campus = campuses.find((item) => item.id === campusId) ?? campuses[0]
  const mapPlaces = useMemo(() => places
    .filter((place): place is DemoPlace & { lat: number; lng: number } =>
      place.campusId === campusId && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat !== 0 && place.lng !== 0)
    .map((place): MapPoi => ({
      id: place.id,
      name: place.name,
      category: place.category,
      location: place.location,
      lat: place.lat,
      lng: place.lng,
    }))
    .sort((first, second) => userPosition
      ? distanceBetween(userPosition, first) - distanceBetween(userPosition, second)
      : 0), [campusId, places, userPosition])
  const selectedPlaceId = Number(searchParams.get('focus')) || null

  function selectPlace(place: MapPoi) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('focus', String(place.id))
      return next
    }, { replace: true })
  }

  return (
    <section className="map-page" aria-labelledby="campus-map-heading">
      <header className="map-page-heading">
        <div>
          <div className="section-kicker">{translate(language, 'mapKicker')}</div>
          <h1 id="campus-map-heading">{translate(language, 'mapTitle')}</h1>
          <p>{translate(language, 'mapDescription')}</p>
        </div>
        <div className="map-demo-badge"><span />{translate(language, 'placeCount', { count: mapPlaces.length })}</div>
      </header>
      <div className="campus-map-tabs" role="group" aria-label={translate(language, 'campusTabs')}>
        {campuses.map((item) => (
          <button
            className={`campus-map-tab${item.id === campusId ? ' is-active' : ''}`}
            key={item.id}
            onClick={() => {
              setCampusId(item.id)
              setSearchParams((current) => {
                const next = new URLSearchParams(current)
                next.delete('focus')
                return next
              }, { replace: true })
            }}
            aria-pressed={item.id === campusId}
          >
            {translate(language, item.label)}
          </button>
        ))}
        <span className="campus-map-address">{localizedCampusAddress(campus.id, language, campus.address)}</span>
      </div>
      <div className="map-workspace">
        <div className="map-screen-canvas">
          <LeafletMapView
            places={mapPlaces}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={selectPlace}
            center={campus.center}
            language={language}
            onLocate={onLocate}
          />
        </div>
        <aside className="map-results">
          <div className="map-results-heading">
            <div><h2>{translate(language, 'placeInfo')}</h2><p>{translate(language, 'coordinateNote', { count: mapPlaces.length })}</p></div>
            <span className="map-count">{mapPlaces.length}</span>
          </div>
          {mapPlaces.length ? (
            <div className="map-place-list">
              {mapPlaces.map((place, index) => (
                <button className="map-place-row" key={place.id} onClick={() => selectPlace(place)}>
                  <span className="map-place-number">{index + 1}</span>
                  <span className="map-place-copy"><strong>{place.name}</strong><small>{place.category}<i>·</i>{place.location}</small></span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
          ) : <p className="map-empty">{translate(language, 'noCoordinates')}</p>}
        </aside>
      </div>
    </section>
  )
}

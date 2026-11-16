import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CampusIllustration } from '../../app/CampusIllustration'
import { Icon } from '../../app/Icon'
import type { SguAppContext } from '../../app/AppLayout'
import { fallbackPoiImage } from '../../assets/poiImage'
import { translate } from '../../i18n/translations'
import { campuses, distanceMeters, formatDistance } from '../map/campuses'
import { LeafletMapView, type MapPoi } from '../map/LeafletMapView'
import type { DemoPlace } from '../poi/data/demoPlaces'

type MappablePlace = DemoPlace & { lat: number; lng: number }

/**
 * Main page: the automatic audio guide. The map marks the place being narrated in red
 * and the others in blue; the panel shows that place and the player controls.
 */
export function GuidePage() {
  const {
    language, places, placesLoading, placesError, reloadPlaces, userPosition, userAccuracy, tracking, geoMessage, toggleLocate,
    narration, playNarration, pauseNarration, seekNarration, seekNarrationTo, getNarrationProgress, narrationSupported, nearbyPlace, isNearPlace,
    autoPlay, setAutoPlay, contentLang, setContentLang, languageOptions, analytics,
  } = useOutletContext<SguAppContext>()
  // A manual pick only holds while the visitor stays at the same spot (same in-range place).
  const [picked, setPicked] = useState<{ id: number; nearbyAtPick: number | null } | null>(null)

  const mappable = useMemo(
    () => places.filter((place): place is MappablePlace => Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat !== 0 && place.lng !== 0),
    [places],
  )
  const nearest = useMemo(() => {
    if (!userPosition || mappable.length === 0) return null
    return mappable.reduce((best, place) => distanceMeters(userPosition, place) < distanceMeters(userPosition, best) ? place : best)
  }, [mappable, userPosition])

  const pickedId = picked && picked.nearbyAtPick === (nearbyPlace?.id ?? null) ? picked.id : null
  const activeId = (narration.playing || narration.paused ? narration.poiId : null) ?? pickedId ?? nearbyPlace?.id ?? nearest?.id ?? mappable[0]?.id ?? null
  const active = mappable.find((place) => place.id === activeId) ?? null
  const campus = campuses.find((item) => item.id === (active?.campusId ?? 'main')) ?? campuses[0]
  const campusPlaces = useMemo<MapPoi[]>(
    () => mappable.filter((place) => place.campusId === campus.id).map((place) => ({
      id: place.id, name: place.name, category: place.category, location: place.location, lat: place.lat, lng: place.lng,
    })),
    [campus.id, mappable],
  )

  const playingThis = Boolean(active) && narration.playing && narration.poiId === active?.id
  const pausedThis = Boolean(active) && narration.paused && narration.poiId === active?.id
  const inRange = active ? isNearPlace(active.id) : false
  const statusKey = playingThis ? 'statusPlaying' : inRange ? 'statusInRange' : userPosition ? 'statusOutOfRange' : 'statusNoGps'
  const distance = active && userPosition ? formatDistance(distanceMeters(userPosition, active)) : null
  const stats = active ? analytics.pois[String(active.id)] : undefined

  function togglePlay() {
    if (!active) return
    if (playingThis) pauseNarration()
    else playNarration(active.id)
  }

  return (
    <section className="guide-page">
      <section className="welcome-row guide-hero">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> {translate(language, 'guideKicker')}</div>
          <h1>{translate(language, 'guideTitleFirst')}<br /><em>{translate(language, 'guideTitleSecond')}</em></h1>
          <p className="welcome-copy">{translate(language, 'guideCopy')}</p>
        </div>
        <CampusIllustration />
      </section>

      {placesError ? (
        <div className="guide-error" role="alert"><strong>{translate(language, 'loadError')}</strong><span>{placesError}</span><button onClick={reloadPlaces}>{translate(language, 'retry')}</button></div>
      ) : placesLoading ? (
        <div className="guide-loading" role="status">{translate(language, 'placesLoading')}…</div>
      ) : !active ? (
        <div className="guide-loading">{translate(language, 'noCoordinates')}</div>
      ) : (
        <div className="guide-layout">
          <div className="guide-map-card">
            <div className="guide-map" aria-label={translate(language, 'guideMapLabel')}>
              <LeafletMapView
                places={campusPlaces}
                selectedPlaceId={active.id}
                onSelectPlace={(place) => setPicked({ id: place.id, nearbyAtPick: nearbyPlace?.id ?? null })}
                center={campus.center}
                language={language}
                userPosition={userPosition}
                userAccuracy={userAccuracy}
                tracking={tracking}
                geoMessage={geoMessage}
                onToggleLocate={toggleLocate}
                variant="guide"
                activePlaceId={active.id}
              />
            </div>
            <div className="guide-legend"><span><i className="dot red" />{translate(language, 'redNow')}</span><span><i className="dot blue" />{translate(language, 'blueOthers')}</span><span><i className="dot you" />{translate(language, 'currentLocation')}</span></div>
          </div>

          <article className="guide-panel">
            <img className="guide-photo" src={active.image} alt="" onError={(event) => { event.currentTarget.src = fallbackPoiImage }} />
            <div className={`guide-status ${playingThis ? 'is-playing' : inRange ? 'is-near' : ''}`} role="status">
              <i />{translate(language, statusKey)}
            </div>
            <h2>{active.name}</h2>
            <div className="guide-meta"><span>{active.category}</span>{distance && <span>{distance}</span>}<span>{translate(language, 'heardCount', { count: stats?.heard ?? 0 })}</span><span>{translate(language, 'currentlyListening', { count: stats?.active ?? 0 })}</span></div>
            <p className="guide-description">{active.description}</p>
            {active.narration && <details className="guide-transcript"><summary>{translate(language, 'transcript')}</summary><p>{active.narration}</p></details>}

            <label className="guide-language">
              <span>{translate(language, 'narrationLanguage')}</span>
              <select value={contentLang} onChange={(event) => setContentLang(event.target.value)}>
                {languageOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
            </label>

            <NarrationProgress active={playingThis || pausedThis} getProgress={getNarrationProgress} seekTo={seekNarrationTo} label={translate(language, 'audioPosition')} />
            <div className="guide-controls" role="group" aria-label={translate(language, 'narrationTitle')}>
              <button onClick={() => seekNarration(-5)} disabled={!playingThis && !pausedThis} aria-label={translate(language, 'back5')}>↺ <span>5s</span></button>
              <button className={`guide-play${playingThis ? ' is-playing' : ''}`} onClick={togglePlay} disabled={!narrationSupported} aria-label={playingThis ? translate(language, 'pause') : pausedThis ? translate(language, 'resume') : inRange ? translate(language, 'playNarration') : translate(language, 'previewListen')}>
                {playingThis ? <><i className="pause-bars" />{translate(language, 'pause')}</> : <><Icon name="play" size={18} />{pausedThis ? translate(language, 'resume') : inRange ? translate(language, 'play') : translate(language, 'preview')}</>}
              </button>
              <button onClick={() => seekNarration(5)} disabled={!playingThis && !pausedThis} aria-label={translate(language, 'forward5')}><span>5s</span> ↻</button>
            </div>
            {!narrationSupported && <p className="guide-note guide-note-warn">{translate(language, 'narrationUnsupportedBrowser')}</p>}
            {narration.error && <p className="guide-note guide-note-warn" role="alert">{narration.error}</p>}
            {!inRange && userPosition && <p className="guide-note">{translate(language, 'previewNote')}</p>}

            <div className="guide-auto">
              <label><input type="checkbox" checked={autoPlay} onChange={(event) => setAutoPlay(event.target.checked)} /> {translate(language, 'autoPlayHere')}</label>
              {!tracking && <button className="guide-locate" onClick={toggleLocate}><Icon name="pin" size={15} /> {translate(language, 'startLocation')}</button>}
              <small>{translate(language, 'autoPlayHint')}</small>
            </div>
          </article>
        </div>
      )}
    </section>
  )
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/** Playback bar: shows how far the narration has played and lets the visitor drag to any point. */
function NarrationProgress({ active, getProgress, seekTo, label }: {
  active: boolean
  getProgress: () => { current: number; duration: number } | null
  seekTo: (seconds: number) => void
  label: string
}) {
  const [progress, setProgress] = useState({ current: 0, duration: 0 })
  const [dragValue, setDragValue] = useState<number | null>(null)
  const seekTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    const tick = () => { const next = getProgress(); if (next) setProgress(next) }
    tick()
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [active, getProgress])

  useEffect(() => () => { if (seekTimer.current !== null) window.clearTimeout(seekTimer.current) }, [])

  // Seek while the dot is being moved (shortly after it stops), so it works for mouse, touch and keyboard alike.
  function moveTo(seconds: number) {
    setDragValue(seconds)
    if (seekTimer.current !== null) window.clearTimeout(seekTimer.current)
    seekTimer.current = window.setTimeout(() => {
      seekTimer.current = null
      seekTo(seconds)
      setProgress((old) => ({ ...old, current: seconds }))
      setDragValue(null)
    }, 120)
  }

  const duration = active ? progress.duration : 0
  const value = active ? Math.min(dragValue ?? progress.current, duration) : 0
  const percent = duration > 0 ? (value / duration) * 100 : 0

  return (
    <div className="guide-progress">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={value}
        disabled={!active || duration === 0}
        aria-label={label}
        aria-valuetext={`${formatTime(value)} / ${formatTime(duration)}`}
        style={{ '--progress': `${percent}%` } as CSSProperties}
        onChange={(event) => moveTo(Number(event.target.value))}
      />
      <div className="guide-progress-time"><span>{formatTime(value)}</span><span>{duration ? formatTime(duration) : '--:--'}</span></div>
    </div>
  )
}

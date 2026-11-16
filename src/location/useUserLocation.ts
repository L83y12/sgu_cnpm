import { useCallback, useEffect, useRef, useState } from 'react'
import { translate } from '../i18n/translations'

export type UserPosition = { lat: number; lng: number }

/** Live GPS tracking owned by the app shell so the position survives page changes. */
export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [tracking, setTracking] = useState(false)
  const [message, setMessage] = useState('')
  const watchId = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current)
    watchId.current = null
  }, [])

  const toggle = useCallback(() => {
    if (watchId.current !== null) {
      stopWatching()
      setTracking(false)
      setMessage('')
      return
    }
    if (!window.isSecureContext) { setMessage(translate('en', 'geoSecureContext')); return }
    if (!navigator.geolocation) { setMessage(translate('en', 'geoUnsupported')); return }
    setMessage('')
    watchId.current = navigator.geolocation.watchPosition((result) => {
      setPosition({ lat: result.coords.latitude, lng: result.coords.longitude })
      setAccuracy(Number.isFinite(result.coords.accuracy) ? result.coords.accuracy : null)
      setMessage('')
    }, (error) => {
      stopWatching()
      setTracking(false)
      setMessage(error.code === error.PERMISSION_DENIED
        ? translate('en', 'geoPermission')
        : translate('en', 'geoError'))
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
    setTracking(true)
  }, [stopWatching])

  useEffect(() => stopWatching, [stopWatching])

  return { position, accuracy, tracking, message, toggle }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import * as Location from 'expo-location'
import type { GeoPoint } from './geo'

/** Foreground GPS tracking that the visitor switches on and off. */
export function useLocation() {
  const [position, setPosition] = useState<GeoPoint | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [tracking, setTracking] = useState(false)
  const [message, setMessage] = useState('')
  const subscription = useRef<Location.LocationSubscription | null>(null)

  const stop = useCallback(() => {
    subscription.current?.remove()
    subscription.current = null
    setTracking(false)
  }, [])

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      setMessage('Location permission was not granted. You can still explore and preview places.')
      return
    }
    setMessage('')
    subscription.current?.remove()
    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 },
      (location) => {
        setPosition({ lat: location.coords.latitude, lng: location.coords.longitude })
        setAccuracy(location.coords.accuracy ?? null)
      },
      (error) => setMessage(String(error)),
    )
    setTracking(true)
  }, [])

  const toggle = useCallback(() => { if (subscription.current) stop(); else void start() }, [start, stop])

  useEffect(() => () => subscription.current?.remove(), [])

  return { position, accuracy, tracking, message, start, toggle }
}

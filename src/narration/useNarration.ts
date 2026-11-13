import { useCallback, useEffect, useRef, useState } from 'react'
import { reportListeningEnd, reportListeningStart } from '../analytics'
import { translate } from '../i18n/translations'

export type NarrationState = {
  poiId: number | null
  playing: boolean
  /** True when the visitor was not within range of the place (not counted as "heard"). */
  preview: boolean
  error: string
}

const idle: NarrationState = { poiId: null, playing: false, preview: false, error: '' }
const startTimeoutMs = 4000

export type NarrationSource = { id: number; narration?: string; description: string }

/**
 * Browser text-to-speech audio guide. One narration plays at a time and it keeps
 * playing across route changes. Listening is reported to the API only after the
 * browser really starts speaking, and always ended exactly once.
 */
export function useNarration() {
  const [state, setState] = useState<NarrationState>(idle)
  const token = useRef(0)
  const started = useRef(false)
  const current = useRef<number | null>(null)
  const startTimer = useRef<number | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const clearStartTimer = useCallback(() => {
    if (startTimer.current !== null) window.clearTimeout(startTimer.current)
    startTimer.current = null
  }, [])

  const end = useCallback((error = '') => {
    clearStartTimer()
    token.current += 1 // ignore late events of the utterance being ended
    if (supported) window.speechSynthesis.cancel()
    if (started.current && current.current !== null) void reportListeningEnd(current.current)
    started.current = false
    current.current = null
    setState({ ...idle, error })
  }, [clearStartTimer, supported])

  const play = useCallback((place: NarrationSource, preview: boolean) => {
    if (!supported) {
      setState({ ...idle, error: translate('en', 'narrationUnsupportedBrowser') })
      return
    }
    end()
    const myToken = token.current
    const utterance = new SpeechSynthesisUtterance((place.narration || place.description).trim())
    utterance.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
    if (englishVoice) utterance.voice = englishVoice
    current.current = place.id
    started.current = false
    utterance.onstart = () => {
      if (token.current !== myToken) return
      clearStartTimer()
      started.current = true
      void reportListeningStart(place.id, preview)
    }
    utterance.onend = () => { if (token.current === myToken) end() }
    utterance.onerror = (event) => {
      if (token.current !== myToken) return
      end(event.error === 'canceled' || event.error === 'interrupted' ? '' : translate('en', 'narrationError'))
    }
    setState({
      poiId: place.id,
      playing: true,
      preview,
      error: voices.length > 0 && !englishVoice ? translate('en', 'audioNoVoice') : '',
    })
    window.speechSynthesis.speak(utterance)
    // Some devices accept the request but never speak (no voice installed).
    startTimer.current = window.setTimeout(() => {
      if (token.current === myToken && !started.current) end(translate('en', 'narrationError'))
    }, startTimeoutMs)
  }, [clearStartTimer, end, supported])

  const stop = useCallback(() => end(), [end])

  /** The place that is audibly being listened to now (null while idle or still starting). */
  const getListeningPoiId = useCallback(() => (started.current ? current.current : null), [])

  useEffect(() => {
    const onPageHide = () => {
      if (started.current && current.current !== null) void reportListeningEnd(current.current)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      onPageHide()
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  return { state, supported, play, stop, getListeningPoiId }
}

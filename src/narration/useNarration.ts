import { useCallback, useEffect, useRef, useState } from 'react'
import { reportListeningEnd, reportListeningStart } from '../analytics'
import { translate } from '../i18n/translations'
import { narrationAudioUrl } from './audioFiles'

export type NarrationState = {
  poiId: number | null
  /** Sound is playing (or about to start). */
  playing: boolean
  /** Stopped part-way; play() on the same place continues from the same point. */
  paused: boolean
  /** True when the visitor was not within range of the place (not counted as "heard"). */
  preview: boolean
  error: string
}

const idle: NarrationState = { poiId: null, playing: false, paused: false, preview: false, error: '' }
const startTimeoutMs = 4000

export type NarrationSource = { id: number; narration?: string; description: string }

/** Speech language tags and rough reading speed (characters per second) per content language. */
const speech: Record<string, { tag: string; cps: number }> = {
  en: { tag: 'en-US', cps: 15 },
  vi: { tag: 'vi-VN', cps: 14 },
  ja: { tag: 'ja-JP', cps: 7 },
  ko: { tag: 'ko-KR', cps: 8 },
  zh: { tag: 'zh-CN', cps: 5 },
}
const fallbackSpeech = { tag: 'en-US', cps: 14 }

// Plain helpers for the <audio> element, kept outside the hook.
function loadAudio(element: HTMLAudioElement, url: string, on: { playing: () => void; ended: () => void; error: () => void }) {
  element.src = url
  element.onplaying = on.playing
  element.onended = on.ended
  element.onerror = on.error
}
function detachAudio(element: HTMLAudioElement) {
  element.onplaying = null
  element.onended = null
  element.onerror = null
  element.pause()
}
function setAudioTime(element: HTMLAudioElement, seconds: number) {
  const max = Number.isFinite(element.duration) ? Math.max(0, element.duration - 0.1) : seconds
  element.currentTime = Math.min(Math.max(0, seconds), max)
}

/**
 * Audio guide. Plays the recorded file for the place when there is one for the chosen
 * language (exact positions), otherwise the device's text-to-speech voice (positions are
 * estimated from an average reading speed, because speech cannot seek). One narration
 * plays at a time and keeps playing across route changes.
 *
 * Pausing keeps the position; play() on the same place and language continues from it.
 * "Listening" is reported while sound is actually playing and ended on pause or stop.
 */
export function useNarration() {
  const [state, setState] = useState<NarrationState>(idle)
  const token = useRef(0)
  const current = useRef<number | null>(null)
  const currentLang = useRef('en')
  const preview = useRef(false)
  const listening = useRef(false) // "listening" has been reported and not yet ended
  const mode = useRef<'tts' | 'audio'>('tts')
  const startTimer = useRef<number | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  // Text-to-speech position tracking
  const text = useRef('')
  const offset = useRef(0) // where the running utterance starts inside `text`
  const lastBoundary = useRef<number | null>(null) // absolute index of the last spoken word
  const startedAt = useRef(0)
  const pausedIndex = useRef(0)
  const isPaused = useRef(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const clearStartTimer = useCallback(() => {
    if (startTimer.current !== null) window.clearTimeout(startTimer.current)
    startTimer.current = null
  }, [])

  const markListening = useCallback((on: boolean) => {
    if (current.current === null || listening.current === on) return
    listening.current = on
    if (on) void reportListeningStart(current.current, preview.current)
    else void reportListeningEnd(current.current)
  }, [])

  /** Stops completely and forgets the position. */
  const end = useCallback((error = '') => {
    clearStartTimer()
    token.current += 1 // ignore late events of whatever was playing
    if (supported) window.speechSynthesis.cancel()
    if (audio.current) detachAudio(audio.current)
    markListening(false)
    current.current = null
    isPaused.current = false
    setState({ ...idle, error })
  }, [clearStartTimer, markListening, supported])

  const ttsIndex = useCallback(() => {
    if (isPaused.current) return pausedIndex.current
    const { cps } = speech[currentLang.current] ?? fallbackSpeech
    const index = lastBoundary.current ?? (offset.current + ((Date.now() - startedAt.current) / 1000) * cps)
    return Math.min(index, text.current.length)
  }, [])

  /** Starts the device voice at character `from`. Older utterances must already be invalidated. */
  const speakFrom = useCallback((from: number) => {
    const myToken = token.current
    const poiId = current.current
    if (poiId === null) return
    const { tag } = speech[currentLang.current] ?? fallbackSpeech
    const utterance = new SpeechSynthesisUtterance(text.current.slice(from))
    utterance.lang = tag
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith(tag.slice(0, 2).toLowerCase()))
    if (voice) utterance.voice = voice
    offset.current = from
    lastBoundary.current = null
    startedAt.current = Date.now()
    isPaused.current = false
    utterance.onstart = () => {
      if (token.current !== myToken) return
      clearStartTimer()
      startedAt.current = Date.now()
      markListening(true)
    }
    utterance.onboundary = (event) => { if (token.current === myToken) lastBoundary.current = from + event.charIndex }
    utterance.onend = () => { if (token.current === myToken) end() }
    utterance.onerror = (event) => {
      if (token.current !== myToken) return
      end(event.error === 'canceled' || event.error === 'interrupted' ? '' : translate('en', 'narrationError'))
    }
    setState({
      poiId, playing: true, paused: false, preview: preview.current,
      error: voices.length > 0 && !voice ? translate('en', 'audioNoVoice') : '',
    })
    window.speechSynthesis.speak(utterance)
    // Some devices accept the request but never speak (no voice installed).
    clearStartTimer()
    startTimer.current = window.setTimeout(() => {
      if (token.current === myToken && !listening.current) end(translate('en', 'narrationError'))
    }, startTimeoutMs)
  }, [clearStartTimer, end, markListening])

  const resumeAudio = useCallback(() => {
    const element = audio.current
    const poiId = current.current
    if (!element || poiId === null) return
    const myToken = token.current
    isPaused.current = false
    setState({ poiId, playing: true, paused: false, preview: preview.current, error: '' })
    element.play().catch(() => { if (token.current === myToken) end(translate('en', 'narrationError')) })
  }, [end])

  const play = useCallback((place: NarrationSource, isPreview: boolean, language = 'en') => {
    // Same place and language that was paused: continue where it stopped.
    if (isPaused.current && current.current === place.id && currentLang.current === language) {
      if (mode.current === 'audio') resumeAudio()
      else { token.current += 1; speakFrom(pausedIndex.current) }
      return
    }
    const fileUrl = narrationAudioUrl(place.id, language)
    if (!fileUrl && !supported) {
      setState({ ...idle, error: translate('en', 'narrationUnsupportedBrowser') })
      return
    }
    end()
    current.current = place.id
    currentLang.current = language
    preview.current = isPreview
    if (fileUrl) {
      mode.current = 'audio'
      const element = audio.current ?? new Audio()
      audio.current = element
      const myToken = token.current
      loadAudio(element, fileUrl, {
        playing: () => { if (token.current === myToken) markListening(true) },
        ended: () => { if (token.current === myToken) end() },
        error: () => { if (token.current === myToken) end(translate('en', 'narrationError')) },
      })
      resumeAudio()
      return
    }
    mode.current = 'tts'
    text.current = (place.narration || place.description).trim()
    speakFrom(0)
  }, [end, markListening, resumeAudio, speakFrom, supported])

  /** Stops the sound but keeps the position. */
  const pause = useCallback(() => {
    if (current.current === null || isPaused.current) return
    if (mode.current === 'audio' && audio.current) {
      audio.current.pause()
    } else {
      pausedIndex.current = ttsIndex()
      token.current += 1
      clearStartTimer()
      if (supported) window.speechSynthesis.cancel()
    }
    isPaused.current = true
    markListening(false)
    setState((old) => ({ ...old, playing: false, paused: true }))
  }, [clearStartTimer, markListening, supported, ttsIndex])

  const stop = useCallback(() => end(), [end])

  /** Moves to `seconds` from the start, whether playing or paused. */
  const seekTo = useCallback((seconds: number) => {
    if (current.current === null) return
    if (mode.current === 'audio' && audio.current) {
      setAudioTime(audio.current, seconds)
      return
    }
    const { cps } = speech[currentLang.current] ?? fallbackSpeech
    let target = Math.round(Math.max(0, seconds) * cps)
    target = Math.min(target, Math.max(0, text.current.length - 1))
    // Land on the start of a word for languages written with spaces.
    for (let steps = 0; steps < 24 && target > 0 && /\S/.test(text.current[target - 1] ?? '') && /\S/.test(text.current[target] ?? ''); steps += 1) target -= 1
    if (isPaused.current) { pausedIndex.current = target; return }
    token.current += 1 // drop events of the utterance that is being replaced
    window.speechSynthesis.cancel()
    speakFrom(target)
  }, [speakFrom])

  /** Where playback is, in seconds (null when nothing is loaded). Estimates for the device voice. */
  const getProgress = useCallback((): { current: number; duration: number } | null => {
    if (current.current === null) return null
    if (mode.current === 'audio' && audio.current) {
      const duration = Number.isFinite(audio.current.duration) ? audio.current.duration : 0
      return { current: audio.current.currentTime, duration }
    }
    const { cps } = speech[currentLang.current] ?? fallbackSpeech
    return { current: ttsIndex() / cps, duration: text.current.length / cps }
  }, [ttsIndex])

  /** Jumps `seconds` forward (positive) or back (negative). */
  const seek = useCallback((seconds: number) => {
    const progress = getProgress()
    if (progress) seekTo(progress.current + seconds)
  }, [getProgress, seekTo])

  /** The place that is audibly being listened to now (null while idle, paused or still starting). */
  const getListeningPoiId = useCallback(() => (listening.current ? current.current : null), [])

  useEffect(() => {
    const onPageHide = () => {
      if (listening.current && current.current !== null) void reportListeningEnd(current.current)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      onPageHide()
      if (supported) window.speechSynthesis.cancel()
      if (audio.current) detachAudio(audio.current)
    }
  }, [supported])

  return { state, supported, play, pause, stop, seek, seekTo, getProgress, getListeningPoiId }
}

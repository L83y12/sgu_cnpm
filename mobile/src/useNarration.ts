import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import * as Speech from 'expo-speech'
import { reportListeningEnd, reportListeningStart } from './api'

export type NarrationState = { poiId: number | null; playing: boolean; paused: boolean; preview: boolean; error: string }
const idle: NarrationState = { poiId: null, playing: false, paused: false, preview: false, error: '' }

/** Speech tags and average reading speed (characters per second), as in the web app. */
const speech: Record<string, { tag: string; cps: number }> = {
  en: { tag: 'en-US', cps: 15 }, vi: { tag: 'vi-VN', cps: 14 }, ja: { tag: 'ja-JP', cps: 7 }, ko: { tag: 'ko-KR', cps: 8 }, zh: { tag: 'zh-CN', cps: 5 },
}
const fallbackSpeech = { tag: 'en-US', cps: 14 }

/**
 * Audio guide for the phone. Plays the recorded mp3 from the API when there is one for the
 * chosen language, otherwise the phone's text-to-speech voice. Pause keeps the position;
 * play() on the same place and language continues from it. Listening is reported while
 * sound is actually playing, exactly like the web app.
 */
export function useNarration(server: string) {
  const [state, setState] = useState<NarrationState>(idle)
  const base = useRef(server)
  const player = useRef<AudioPlayer | null>(null)
  const token = useRef(0)
  const current = useRef<number | null>(null)
  const lang = useRef('en')
  const preview = useRef(false)
  const listening = useRef(false)
  const mode = useRef<'audio' | 'tts'>('tts')
  const isPaused = useRef(false)
  const text = useRef('')
  const offset = useRef(0)
  const lastBoundary = useRef<number | null>(null)
  const startedAt = useRef(0)
  const pausedIndex = useRef(0)

  useEffect(() => { base.current = server }, [server])

  const markListening = useCallback((on: boolean) => {
    if (current.current === null || listening.current === on) return
    listening.current = on
    if (on) void reportListeningStart(base.current, current.current, preview.current)
    else void reportListeningEnd(base.current, current.current)
  }, [])

  const end = useCallback((error = '') => {
    token.current += 1
    void Speech.stop()
    player.current?.pause()
    markListening(false)
    current.current = null
    isPaused.current = false
    setState({ ...idle, error })
  }, [markListening])

  const ttsIndex = useCallback(() => {
    if (isPaused.current) return pausedIndex.current
    const { cps } = speech[lang.current] ?? fallbackSpeech
    return Math.min(lastBoundary.current ?? offset.current + ((Date.now() - startedAt.current) / 1000) * cps, text.current.length)
  }, [])

  const speakFrom = useCallback(async (from: number) => {
    token.current += 1
    const myToken = token.current
    const poiId = current.current
    if (poiId === null) return
    const { tag } = speech[lang.current] ?? fallbackSpeech
    await Speech.stop()
    const voices = await Speech.getAvailableVoicesAsync().catch(() => [])
    const voice = voices.find((item) => item.language.toLowerCase().startsWith(tag.slice(0, 2)))
    mode.current = 'tts'
    offset.current = from
    lastBoundary.current = null
    startedAt.current = Date.now()
    isPaused.current = false
    setState({ poiId, playing: true, paused: false, preview: preview.current, error: voices.length && !voice ? 'No voice for this language on this phone; the narration may be silent.' : '' })
    Speech.speak(text.current.slice(from), {
      language: tag,
      voice: voice?.identifier,
      onStart: () => { if (token.current === myToken) { startedAt.current = Date.now(); markListening(true) } },
      onBoundary: (event: unknown) => {
        const index = (event as { charIndex?: number } | null)?.charIndex
        if (token.current === myToken && typeof index === 'number') lastBoundary.current = from + index
      },
      onDone: () => { if (token.current === myToken) end() },
      onError: () => { if (token.current === myToken) end('Could not play the narration on this phone.') },
    })
  }, [end, markListening])

  // One audio player for the whole app; its status drives the "listening" report and the end of a narration.
  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false })
    const instance = createAudioPlayer(null)
    player.current = instance
    const subscription = instance.addListener('playbackStatusUpdate', (status) => {
      if (mode.current !== 'audio' || current.current === null) return
      if (status.playing && !listening.current) markListening(true)
      if (status.didJustFinish) end()
    })
    return () => { subscription.remove(); instance.remove(); player.current = null }
  }, [end, markListening])

  const play = useCallback((place: { id: number; narration: string }, isPreview: boolean, language: string, fileUrl: string | null) => {
    if (isPaused.current && current.current === place.id && lang.current === language) {
      if (mode.current === 'audio') { isPaused.current = false; player.current?.play(); setState((old) => ({ ...old, playing: true, paused: false })) }
      else void speakFrom(pausedIndex.current)
      return
    }
    end()
    current.current = place.id
    lang.current = language
    preview.current = isPreview
    text.current = place.narration.trim()
    if (fileUrl && player.current) {
      mode.current = 'audio'
      player.current.replace(fileUrl)
      player.current.play()
      setState({ poiId: place.id, playing: true, paused: false, preview: isPreview, error: '' })
      return
    }
    void speakFrom(0)
  }, [end, speakFrom])

  const pause = useCallback(() => {
    if (current.current === null || isPaused.current) return
    if (mode.current === 'audio') player.current?.pause()
    else { pausedIndex.current = ttsIndex(); token.current += 1; void Speech.stop() }
    isPaused.current = true
    markListening(false)
    setState((old) => ({ ...old, playing: false, paused: true }))
  }, [markListening, ttsIndex])

  const seekTo = useCallback((seconds: number) => {
    if (current.current === null) return
    if (mode.current === 'audio' && player.current) { void player.current.seekTo(Math.max(0, seconds)); return }
    const { cps } = speech[lang.current] ?? fallbackSpeech
    const target = Math.min(Math.round(Math.max(0, seconds) * cps), Math.max(0, text.current.length - 1))
    if (isPaused.current) pausedIndex.current = target
    else void speakFrom(target)
  }, [speakFrom])

  const getProgress = useCallback((): { current: number; duration: number } | null => {
    if (current.current === null) return null
    if (mode.current === 'audio' && player.current) {
      const duration = Number.isFinite(player.current.duration) ? player.current.duration : 0
      return { current: player.current.currentTime, duration }
    }
    const { cps } = speech[lang.current] ?? fallbackSpeech
    return { current: ttsIndex() / cps, duration: text.current.length / cps }
  }, [ttsIndex])

  const seek = useCallback((delta: number) => {
    const progress = getProgress()
    if (progress) seekTo(Math.min(progress.current + delta, Math.max(0, progress.duration - 0.2)))
  }, [getProgress, seekTo])

  const getListeningPoiId = useCallback(() => (listening.current ? current.current : null), [])

  return { state, play, pause, stop: end, seek, seekTo, getProgress, getListeningPoiId }
}

import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'
import { colors } from './theme'

const time = (s: number) => { const w = Math.max(0, Math.floor(s)); return `${Math.floor(w / 60)}:${String(w % 60).padStart(2, '0')}` }

/** Progress bar (draggable) and the back 5 s / play-pause / forward 5 s buttons. */
export function Player({ active, playing, label, getProgress, seekTo, seek, onToggle }: {
  active: boolean
  playing: boolean
  label: string
  getProgress: () => { current: number; duration: number } | null
  seekTo: (s: number) => void
  seek: (delta: number) => void
  onToggle: () => void
}) {
  const [progress, setProgress] = useState({ current: 0, duration: 0 })
  const [drag, setDrag] = useState<number | null>(null)

  useEffect(() => {
    if (!active) return
    const tick = () => { const next = getProgress(); if (next) setProgress(next) }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [active, getProgress])

  const duration = active ? progress.duration : 0
  const value = active ? Math.min(drag ?? progress.current, duration || 0) : 0

  return (
    <View>
      <Slider
        minimumValue={0}
        maximumValue={duration || 1}
        value={value}
        disabled={!active || !duration}
        minimumTrackTintColor={colors.green}
        maximumTrackTintColor="#dfe7dc"
        thumbTintColor={colors.green}
        onValueChange={setDrag}
        onSlidingComplete={(v) => { seekTo(v); setProgress((old) => ({ ...old, current: v })); setDrag(null) }}
        accessibilityLabel="Narration position"
      />
      <View style={styles.times}><Text style={styles.time}>{time(value)}</Text><Text style={styles.time}>{duration ? time(duration) : '--:--'}</Text></View>
      <View style={styles.row}>
        <Pressable style={[styles.side, !active && styles.disabled]} disabled={!active} onPress={() => seek(-5)} accessibilityLabel="Back 5 seconds"><Text style={styles.sideText}>↺ 5s</Text></Pressable>
        <Pressable style={[styles.main, playing && styles.mainPlaying]} onPress={onToggle} accessibilityRole="button"><Text style={styles.mainText}>{label}</Text></Pressable>
        <Pressable style={[styles.side, !active && styles.disabled]} disabled={!active} onPress={() => seek(5)} accessibilityLabel="Forward 5 seconds"><Text style={styles.sideText}>5s ↻</Text></Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4, marginBottom: 8 },
  time: { fontSize: 12, color: colors.muted },
  row: { flexDirection: 'row', gap: 8 },
  side: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#d6e2d4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  sideText: { fontSize: 15, fontWeight: '700', color: '#3b5a45' },
  disabled: { opacity: 0.4 },
  main: { flex: 1.6, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.green },
  mainPlaying: { backgroundColor: colors.red },
  mainText: { fontSize: 16, fontWeight: '800', color: '#fff' },
})

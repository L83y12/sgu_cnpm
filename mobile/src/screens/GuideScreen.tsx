import { useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { imageUrl } from '../api'
import { languageLabels, useApp } from '../appContext'
import { campuses, compassDirection, distanceMeters, formatDistance } from '../geo'
import { MapView } from '../MapView'
import { Player } from '../Player'
import { colors } from '../theme'

/** Main tab: the automatic audio guide (red pin = current place, blue = others). */
export function GuideScreen() {
  const app = useApp()
  const { places, location, narration, nearby, analytics, lang, languages } = app
  const { state } = narration
  const [picked, setPicked] = useState<{ id: number; nearbyAt: number | null } | null>(null)

  const nearest = useMemo(() => {
    if (!location.position || !places.length) return null
    const here = location.position
    return places.reduce((best, p) => (distanceMeters(here, p) < distanceMeters(here, best) ? p : best))
  }, [location.position, places])
  const pickedId = picked && picked.nearbyAt === (nearby?.id ?? null) ? picked.id : null
  const loadedId = state.playing || state.paused ? state.poiId : null
  const activeId = pickedId ?? loadedId ?? nearby?.id ?? nearest?.id ?? places[0]?.id ?? null
  const active = places.find((p) => p.id === activeId) ?? null
  const elsewhere = loadedId !== null && loadedId !== activeId ? places.find((p) => p.id === loadedId) : null

  if (!active) {
    return <View style={styles.center}><Text style={styles.muted}>{app.loading ? 'Loading places…' : app.error || 'No places yet. Set the server address in Settings.'}</Text></View>
  }

  const playingThis = state.playing && state.poiId === active.id
  const pausedThis = state.paused && state.poiId === active.id
  const inRange = app.isNear(active.id)
  const distance = location.position ? distanceMeters(location.position, active) : null
  const showRoute = distance !== null && distance > active.triggerRadius && distance < 5000
  const stats = analytics.pois[String(active.id)]
  const status = playingThis ? 'Now playing' : inRange ? 'You are in range — it plays automatically' : location.position ? 'Out of range — you can still preview it' : 'Turn on your location to start the automatic guide'
  const mapPlaces = places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, radius: p.triggerRadius }))

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.kicker}>AUTOMATIC AUDIO GUIDE</Text>
      <Text style={styles.title}>Walk around, <Text style={styles.titleGreen}>and the campus talks.</Text></Text>

      <MapView places={mapPlaces} activeId={active.id} variant="guide" center={campuses[0].center}
        user={location.position ? { ...location.position, accuracy: location.accuracy } : null}
        route={showRoute ? active : null}
        onSelect={(id) => setPicked({ id, nearbyAt: nearby?.id ?? null })} />
      {showRoute && distance !== null && location.position && <Text style={styles.route}>≈ {formatDistance(distance)} {compassDirection(location.position, active)} to {active.name}</Text>}
      <View style={styles.legend}><Text style={styles.legendItem}><Text style={{ color: colors.red }}>●</Text> Current place</Text><Text style={styles.legendItem}><Text style={{ color: colors.blue }}>●</Text> Other places</Text><Text style={styles.legendItem}><Text style={{ color: '#4285f4' }}>●</Text> You</Text><Text style={styles.legendItem}><Text style={{ color: colors.blue }}>◌</Text> Scan radius</Text><Text style={styles.legendItem}><Text style={{ color: '#f5c400' }}>●</Text> Where the 2 nearest places meet</Text></View>
      {!!location.message && <Text style={styles.warn}>{location.message}</Text>}

      <View style={styles.card}>
        {!!active.image && <Image source={{ uri: imageUrl(app.server, active.image) }} style={styles.photo} />}
        <View style={[styles.status, playingThis ? styles.statusPlaying : inRange ? styles.statusNear : null]}><Text style={[styles.statusText, playingThis && { color: colors.red }, inRange && !playingThis && { color: colors.green }]}>{status}</Text></View>
        <Text style={styles.name}>{active.name}</Text>
        <Text style={styles.meta}>{active.category}{distance !== null ? ` · ${formatDistance(distance)}` : ''} · {stats?.heard ?? 0} heard · {stats?.preview ?? 0} previewed · {stats?.active ?? 0} listening</Text>
        <Text style={styles.desc}>{active.description}</Text>

        <Text style={styles.label}>Narration language</Text>
        <View style={styles.langs}>
          {languages.map((code) => (
            <Pressable key={code} onPress={() => app.setLang(code)} style={[styles.chip, code === lang && styles.chipOn]}><Text style={[styles.chipText, code === lang && styles.chipTextOn]}>{languageLabels[code] ?? code}</Text></Pressable>
          ))}
        </View>

        {elsewhere && (
          <View style={styles.elsewhere}><Text style={styles.elsewhereText}>{state.playing ? 'Now playing' : 'Paused'}: {elsewhere.name}</Text><Pressable onPress={() => setPicked(null)}><Text style={styles.link}>Show</Text></Pressable></View>
        )}
        <Player active={playingThis || pausedThis} playing={playingThis}
          label={playingThis ? 'Ⅱ Pause' : pausedThis ? '▶ Continue' : inRange ? '▶ Play' : '▶ Preview'}
          getProgress={narration.getProgress} seekTo={narration.seekTo} seek={narration.seek}
          onToggle={() => (playingThis ? narration.pause() : app.playPlace(active.id))} />
        {!!state.error && <Text style={styles.warn}>{state.error}</Text>}
        {!inRange && !!location.position && <Text style={styles.note}>Preview: you are not within range of this place, so this listen is counted as a preview.</Text>}

        <View style={styles.auto}>
          <View style={styles.autoRow}><Switch value={app.autoPlay} onValueChange={app.setAutoPlay} /><Text style={styles.autoText}>Auto-play when I arrive</Text></View>
          <Pressable style={styles.locate} onPress={location.toggle}><Text style={styles.locateText}>{location.tracking ? '◉ Location on — tap to stop' : '◎ Turn on location'}</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40, gap: 10, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  muted: { color: colors.muted, textAlign: 'center' },
  kicker: { fontSize: 11, letterSpacing: 1.5, color: colors.muted, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  titleGreen: { color: '#5e9b79' },
  route: { alignSelf: 'center', backgroundColor: colors.red, color: '#fff', fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { fontSize: 12, color: colors.muted },
  warn: { color: '#a5523a', fontSize: 12 },
  note: { color: colors.muted, fontSize: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10 },
  photo: { width: '100%', height: 170, borderRadius: 10, backgroundColor: '#eef2ec' },
  status: { alignSelf: 'flex-start', backgroundColor: '#f1f4ef', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  statusNear: { backgroundColor: colors.greenSoft },
  statusPlaying: { backgroundColor: colors.redSoft },
  statusText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  name: { fontSize: 21, fontWeight: '800', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  desc: { fontSize: 14, lineHeight: 21, color: '#46564b' },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted },
  langs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: '#d6e2d4', backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 13, color: '#3b5a45' },
  chipTextOn: { color: '#fff', fontWeight: '700' },
  elsewhere: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.redSoft, borderRadius: 9, padding: 9 },
  elsewhereText: { color: '#8a3a32', flex: 1 },
  link: { color: '#8a3a32', fontWeight: '700' },
  auto: { borderTopWidth: 1, borderTopColor: '#edf1ea', paddingTop: 10, gap: 8 },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoText: { fontSize: 14, fontWeight: '600', color: '#46564b' },
  locate: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#cfe0cf', backgroundColor: '#f2f8f2', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  locateText: { color: colors.green, fontWeight: '700' },
})

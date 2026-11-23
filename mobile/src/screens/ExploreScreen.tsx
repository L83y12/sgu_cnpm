import { useMemo, useState } from 'react'
import { FlatList, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { imageUrl } from '../api'
import { useApp } from '../appContext'
import { campusDirectionsUrl, campuses, distanceMeters, formatDistance } from '../geo'
import { MapView } from '../MapView'
import { colors } from '../theme'

/** Explore: one tab per campus, category filter, search, map and list. */
export function ExploreScreen() {
  const app = useApp()
  const { places, location, narration, analytics } = app
  const [campusId, setCampusId] = useState('main')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const campus = campuses.find((c) => c.id === campusId) ?? campuses[0]

  const inCampus = useMemo(() => places.filter((p) => p.campusId === campusId), [campusId, places])
  const categories = useMemo(() => [...new Set(inCampus.map((p) => p.category))], [inCampus])
  const needle = query.trim().toLowerCase()
  const filtered = inCampus.filter((p) => (!category || p.category === category) && (!needle || `${p.name} ${p.category}`.toLowerCase().includes(needle)))
  const list = location.position ? [...filtered].sort((a, b) => distanceMeters(location.position!, a) - distanceMeters(location.position!, b)) : filtered
  const selected = filtered.find((p) => p.id === selectedId) ?? null
  const isPlaying = (id: number) => narration.state.playing && narration.state.poiId === id
  const toggle = (id: number) => (isPlaying(id) ? narration.pause() : app.playPlace(id))

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Explore the campuses</Text>
      <View style={styles.row}>
        {campuses.map((c) => (
          <Pressable key={c.id} onPress={() => { setCampusId(c.id); setCategory(''); setSelectedId(null) }} style={[styles.tab, c.id === campusId && styles.tabOn]}><Text style={[styles.tabText, c.id === campusId && styles.tabTextOn]}>{c.label}</Text></Pressable>
        ))}
      </View>
      <Text style={styles.muted}>{campus.address}</Text>
      <View style={styles.row}>
        {['', ...categories].map((c) => (
          <Pressable key={c || 'all'} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}><Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c || 'All'}</Text></Pressable>
        ))}
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="Search places" style={styles.search} />
      <MapView places={filtered.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, radius: p.triggerRadius }))} activeId={selected?.id ?? null} variant="explore" center={campus.center}
        user={location.position ? { ...location.position, accuracy: location.accuracy } : null}
        route={selected && location.position && distanceMeters(location.position, selected) > selected.triggerRadius ? selected : null}
        onSelect={setSelectedId} />
      {selected && (
        <View style={styles.selected}>
          {!!selected.image && <Image source={{ uri: imageUrl(app.server, selected.image) }} style={styles.selectedImg} />}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{selected.name}</Text>
            <Text style={styles.muted}>{selected.category} · {analytics.pois[String(selected.id)]?.heard ?? 0} heard · {analytics.pois[String(selected.id)]?.preview ?? 0} previewed</Text>
            <Text numberOfLines={3} style={styles.desc}>{selected.description}</Text>
            <View style={styles.row}>
              <Pressable style={styles.play} onPress={() => toggle(selected.id)}><Text style={styles.playText}>{isPlaying(selected.id) ? 'Ⅱ Pause' : '▶ Play'}</Text></Pressable>
              <Pressable style={styles.outline} onPress={() => void Linking.openURL(campusDirectionsUrl(selected))}><Text style={styles.outlineText}>Directions to campus</Text></Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  )

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => String(p.id)}
      ListHeaderComponent={header}
      contentContainerStyle={styles.page}
      ListEmptyComponent={<Text style={styles.muted}>{app.loading ? 'Loading…' : app.error || 'No matching places.'}</Text>}
      renderItem={({ item }) => (
        <View style={[styles.item, item.id === selectedId && styles.itemOn]}>
          <Pressable style={styles.itemMain} onPress={() => setSelectedId(item.id)}>
            {!!item.image && <Image source={{ uri: imageUrl(app.server, item.image) }} style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.muted}>{item.category}{location.position ? ` · ${formatDistance(distanceMeters(location.position, item))}` : ''}</Text>
            </View>
          </Pressable>
          <Pressable style={[styles.round, isPlaying(item.id) && styles.roundOn]} onPress={() => toggle(item.id)} accessibilityLabel={`Play ${item.name}`}><Text style={[styles.roundText, isPlaying(item.id) && { color: '#fff' }]}>{isPlaying(item.id) ? 'Ⅱ' : '▶'}</Text></Pressable>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 40, gap: 8, backgroundColor: colors.bg },
  header: { gap: 10, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: '#d6e2d4', backgroundColor: '#fff' },
  tabOn: { backgroundColor: colors.green, borderColor: colors.green },
  tabText: { color: '#3b5a45', fontWeight: '600' },
  tabTextOn: { color: '#fff' },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#e1e8df', backgroundColor: '#fff' },
  chipOn: { backgroundColor: '#3b5a45', borderColor: '#3b5a45' },
  chipText: { fontSize: 12, color: '#3b5a45' },
  chipTextOn: { color: '#fff' },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e1e8df', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  muted: { fontSize: 12, color: colors.muted },
  selected: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#dbe8d8', backgroundColor: '#f7fbf6' },
  selectedImg: { width: 86, height: 86, borderRadius: 8 },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  desc: { fontSize: 12, color: '#55655a' },
  play: { backgroundColor: colors.green, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  playText: { color: '#fff', fontWeight: '700' },
  outline: { borderWidth: 1, borderColor: '#d6e2d4', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#fff' },
  outlineText: { color: '#3b5a45', fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemOn: { opacity: 1 },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 10, borderWidth: 1, borderColor: '#e6ede3', backgroundColor: '#fff' },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#eef2ec' },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  round: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#d6e2d4', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  roundOn: { backgroundColor: colors.red, borderColor: colors.red },
  roundText: { color: colors.green, fontSize: 16, fontWeight: '800' },
})

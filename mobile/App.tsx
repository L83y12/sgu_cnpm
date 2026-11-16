import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { AppStateProvider } from './src/AppState'
import { useApp } from './src/appContext'
import { ExploreScreen } from './src/screens/ExploreScreen'
import { GuideScreen } from './src/screens/GuideScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { colors } from './src/theme'

type Tab = 'guide' | 'explore' | 'settings'
const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'guide', label: 'Audio guide', icon: '🎧' },
  { id: 'explore', label: 'Explore', icon: '🧭' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function Shell() {
  const app = useApp()
  const [tab, setTab] = useState<Tab>(app.server ? 'guide' : 'settings')
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text style={styles.brand}>sgu<Text style={{ color: '#5e9b79' }}>go</Text></Text>
        <Text style={styles.users}>● {app.analytics.activeUsers} using now</Text>
      </View>
      <View style={styles.body}>
        {tab === 'guide' && <GuideScreen />}
        {tab === 'explore' && <ExploreScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <View style={styles.bar}>
        {tabs.map((t) => (
          <Pressable key={t.id} style={styles.barItem} onPress={() => setTab(t.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}>
            <Text style={styles.barIcon}>{t.icon}</Text>
            <Text style={[styles.barLabel, tab === t.id && styles.barLabelOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="dark" />
        <Shell />
      </AppStateProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#edf1ea' },
  brand: { fontSize: 22, fontWeight: '800', color: '#385b43' },
  users: { fontSize: 12, color: colors.green },
  body: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#edf1ea', backgroundColor: '#fff' },
  barItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  barIcon: { fontSize: 18 },
  barLabel: { fontSize: 11, color: colors.muted },
  barLabelOn: { color: colors.green, fontWeight: '700' },
})

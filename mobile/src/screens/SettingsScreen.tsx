import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useApp } from '../appContext'
import { colors } from '../theme'

/** Server address (the cloudflared HTTPS address or the computer's LAN address while testing). */
export function SettingsScreen() {
  const app = useApp()
  const [value, setValue] = useState(app.server)
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>SGU Go server</Text>
      <TextInput value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://xxxx.trycloudflare.com" style={styles.input} />
      <Text style={styles.help}>Use the same address the web app is opened with (for example the cloudflared https://…trycloudflare.com address). The phone needs internet access to that address.</Text>
      <Pressable style={styles.button} onPress={() => { app.setServer(value); app.reload() }}><Text style={styles.buttonText}>Save and reload</Text></Pressable>
      <View style={styles.box}>
        <Text style={styles.row}>Status: {app.loading ? 'loading…' : app.error ? 'cannot reach server' : `${app.places.length} places loaded`}</Text>
        <Text style={styles.row}>People using SGU Go now: {app.analytics.activeUsers}</Text>
        {!!app.error && <Text style={styles.error}>{app.error}</Text>}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 10, backgroundColor: colors.bg, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9e3d6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  help: { fontSize: 12, color: colors.muted },
  button: { alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { color: '#fff', fontWeight: '700' },
  box: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 },
  row: { color: colors.text },
  error: { color: '#a5523a', fontSize: 12 },
})

# SGU Go – mobile app (React Native, Expo SDK 58)

The phone version of SGU Go. It uses the same API and database as the web app.

| Tab | What it does |
| --- | --- |
| Audio guide | Map with every place (red = current place, blue = others), automatic narration when you walk into a place's radius, language picker, play / pause, back and forward 5 s, draggable progress bar, dashed line and distance to the place |
| Explore | One tab per campus, category filter, search, map and list, play / preview, directions to the campus in Google Maps |
| Settings | Address of the SGU Go server, connection status, people using the app now |

Narration plays the recorded mp3 from the server (`/api/audio/<lang>/poi-XX.mp3`, from `content/audio`). If a place has no file for the chosen language, the phone's own text-to-speech voice reads the narration instead. Listens, previews and "using now" are reported to the same API as the web app.

## Run on a phone (Expo Go)

1. Start the API and the web app on the computer (`npm run dev:api` and `npm run dev` in the project root) and, for phones on another network, the tunnel: `cloudflared tunnel --url http://localhost:5173`.
2. In this folder: `npm install`, then `npx expo start --tunnel` (or `npx expo start` when the phone is on the same Wi-Fi as the computer).
3. Install **Expo Go** on the phone and scan the QR code shown in the terminal.
4. In the app, open **Settings**, enter the server address (the `https://…trycloudflare.com` address, without `/sgu_cnpm`) and tap **Save and reload**. You can also put it in a `.env` file here as `EXPO_PUBLIC_API_URL=https://…`.
5. Allow location when asked, then tap **Turn on location** on the Audio guide tab.

## Checks

```bash
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

The CI workflow runs the type check and the Android bundle for every pull request.

## Code map

| File | Role |
| --- | --- |
| `App.tsx` | Tabs and safe area |
| `src/AppState.tsx`, `src/appContext.ts` | Shared state: server, places, language, location, narration, auto-play, heartbeat |
| `src/api.ts` | API calls, visitor id, audio and image URLs |
| `src/geo.ts` | Distance, radius check with GPS error allowance, campuses, directions (same rules as the web app) |
| `src/useLocation.ts` | GPS with expo-location |
| `src/useNarration.ts` | Player: expo-audio for mp3, expo-speech as fallback |
| `src/MapView.tsx` | Leaflet + OpenStreetMap in a WebView (no map API key needed) |
| `src/Player.tsx` | Progress bar and transport buttons |
| `src/screens/*` | Audio guide, Explore, Settings |

export type Locale = string

const translations = {
  en: {
    pageTitle: 'SGU Go — Explore nearby',
    navigation: 'Main navigation', navGroup: 'YOUR SPACE', suggestions: 'SUGGESTED FOR YOU',
    discover: 'Explore', map: 'Map', saved: 'Saved', route: 'A walk around SGU',
    routeDuration: '4 places · about 25 minutes', online: 'You are online', mapReady: 'The map is ready',
    guest: 'Visitor', guestMode: 'Explore now · no sign-in required', exploreSgu: 'Explore SGU',
    language: 'Interface language', help: 'Help', appUsersActive: 'using now', walkLabel: 'walk', home: 'SGU Go home',
    homeEyebrow: 'WHAT YOU ARE LOOKING FOR IS NEARBY', homeTitleFirst: 'Every little corner,', homeTitleSecond: 'a story to tell.',
    homeCopy: 'Take a walk around Saigon University and discover familiar places in a new way.',
    today: 'A lovely day for a walk', district: 'Ho Chi Minh City', homeMapAria: 'Explore around SGU map',
    nearby: 'Explore nearby', samplePlaces: '4 sample places · 500 m', openMap: 'Open map',
    expandMap: 'Expand map', nearbyHeading: 'PLACES NEAR YOU', savedHeading: 'Places to revisit',
    discoveryHeading: 'Where to next?', savedCount: '{count} saved places for your next visit',
    nearbyCopy: 'Interesting places just a few steps away.', distanceMode: 'Approximate straight-line distance from GPS; places are sorted nearest first.', viewMap: 'View map',
    mapKicker: 'SGU CAMPUS', mapTitle: 'Campus guide',
    mapDescription: 'Choose a place on the map to see its details and hear its story.',
    scanQr: 'Scan QR', campusTabs: 'Choose an SGU campus', mainCampus: 'Main campus', campusOne: 'Campus 1', campusTwo: 'Campus 2',
    narrationTitle: 'Audio guide', narrationIdle: 'Choose a place from the list to hear its audio guide.',
    selectedReady: '{name} is ready to play.', narrationUnsupported: 'Audio narration is available in English only.',
    narrationStopped: 'Narration stopped.', narrationUnsupportedBrowser: 'This browser does not support audio narration.',
    narrationPlaying: 'Playing narration: {name}', narrationFinished: 'Narration finished.',
    narrationError: 'Could not play narration on this device.', playNarration: 'Play narration',
    stopNarration: 'Stop narration', noPlaceSelected: 'No place selected', audioVietnamese: 'English narration',
    placeInfo: 'Place details', placeCount: 'Places · {count}', selectPlace: 'Choose a place to open its pin, view details, and hear its story.',
    noCoordinates: 'No POI coordinates for this campus yet. Share a place name and GPS coordinates to add a pin.',
    coordinateNote: 'Pins use verified GPS coordinates. {count} places are available at this campus.',
    details: 'View details', directions: 'Directions to campus ↗', otherPlace: 'Choose another place',
    filterCategories: 'Filter by category', search: 'Search places...', clearSearch: 'Clear search',
    sortBy: 'Sort by', nearest: 'Nearest', highestRated: 'Highest rated', nameAZ: 'Name A–Z',
    minimumRating: 'Minimum rating', allRatings: 'Any rating', matchingPlaces: '{count} matching places', clearFilters: 'Clear filters',
    all: 'All', architecture: 'Architecture', study: 'Study', food: 'Food & drink', green: 'Green spaces', sports: 'Sports',
    placesLoading: 'Loading places', loadError: 'Could not load places', mapLoadError: 'Could not load the map. Check your connection and try again.',
    loadErrorCopy: 'Something went wrong while loading the list. Please try again shortly.', retry: 'Try again',
    removeSaved: 'Remove saved place', savePlace: 'Save place', placeDetails: 'Details for {name}',
    noSaved: 'No saved places yet', noSavedCopy: 'Tap the heart on a place to save it.',
    noMatches: 'No matching places found', noMatchesCopy: 'Try another keyword or choose “All”.',
    footer: 'A walk around a familiar campus', madeAtSgu: 'Made with ♥ at SGU',
    close: 'Close', qrTitle: 'Scan a place QR code', qrDescription: 'Allow camera access to recognize a POI QR code.',
    qrInput: 'Enter a POI code or place name', findPlace: 'Find place',
    locateMe: 'My location', stopTracking: 'Stop location tracking', geoTracking: 'Updating GPS location',
    locateMeAria: 'Use my current location', geoUnsupported: 'This browser does not support geolocation.',
    geoSecureContext: 'Location access requires HTTPS or localhost.',
    geoPermission: 'You have not allowed this browser to access your location.',
    geoError: 'Could not get your current location. Try again or check your location settings.',
    currentLocation: 'Your current location', meters: 'm', kilometers: 'km',
    qrStart: 'Place a location QR code in the frame to scan it.',
    qrUnsupported: 'Automatic QR scanning is not supported. Enter a POI code or choose a place below.',
    cameraUnavailable: 'Camera is unavailable in this browser. Enter a POI code or choose a place below.',
    cameraReady: 'Camera ready. Point the QR code at the center of the frame.',
    cameraPermission: 'Camera access was not granted. You can still enter a POI code or choose a place below.',
    qrNotFound: 'POI not found. Enter a place number or name, or choose below.',
    category: 'Category', heardCount: '{count} heard', previewCount: '{count} previewed', currentlyListening: '{count} listening',
    showQr: 'Share QR', qrShareTitle: 'Open SGU Go on your phone', qrShareCopy: 'Scan this code with a phone camera to open the guide. No sign-in needed.',
    qrShareUrl: 'Page address', qrShareLocalhost: 'This address only works on this computer. Enter your network address or the deployed site URL so phones can open it.', qrShareFailed: 'Could not create the QR code.',
    nearPrompt: 'You are near {name}', listenNow: 'Listen now', nowPlaying: 'Now playing', stopAudio: 'Stop',
    autoPlay: 'Auto-play near places', autoPlayHint: 'Starts the audio guide when you walk into a place’s range.',
    previewListen: 'Preview audio', previewNote: 'Preview: you are not within range of this place, so this listen is not counted.',
    inRangeNote: 'You are within range of this place.', gpsNeeded: 'Turn on “My location” on the map to verify you are at this place.',
    audioNoVoice: 'No voice for this language was found on this device. Audio may be silent.',
    accuracy: 'accuracy ±{meters} m',
    guide: 'Audio guide', guideKicker: 'AUTOMATIC AUDIO GUIDE', guideTitleFirst: 'Walk around,', guideTitleSecond: 'and the campus talks.',
    guideCopy: 'Turn on your location and the guide tells you about the place you walk up to, in the language you pick.',
    narrationLanguage: 'Narration language', back5: 'Back 5 seconds', forward5: 'Forward 5 seconds',
    guideMapLabel: 'Guide map: red marks the current place, blue marks the others',
    statusPlaying: 'Now playing', statusInRange: 'You are in range — it plays automatically', statusOutOfRange: 'Out of range — you can still preview it', statusNoGps: 'Turn on your location to start the automatic guide',
    startLocation: 'Turn on location', redNow: 'Current place', blueOthers: 'Other places',
    autoPlayHere: 'Auto-play when I arrive', play: 'Play', preview: 'Preview', stop: 'Stop',
    exploreTitle: 'Explore the campuses', exploreCopy: 'Pick a campus, filter the places and listen to any of them.',
    searchPlaces: 'Search places', allCategories: 'All', directionsLink: 'Directions to campus', savedAdd: 'Save', savedRemove: 'Saved',
    routeHint: '≈ {distance} {direction} to {name}', dir_north: 'north', dir_north_east: 'north-east', dir_east: 'east', dir_south_east: 'south-east', dir_south: 'south', dir_south_west: 'south-west', dir_west: 'west', dir_north_west: 'north-west',
    pause: 'Pause', resume: 'Continue', pausedAt: 'Paused', showIt: 'Show', audioPosition: 'Narration position', transcript: 'Read the narration',
    heardShort: 'heard', listeningShort: 'listening now',
    radiusLegend: 'Scan radius', crossingLegend: 'Where the 2 nearest places meet', crossingTitle: 'Crossing of the 2 nearest places',
    crossingMeet: 'The scan circles of {first} and {second} cross here.',
    crossingGap: 'The circles of {first} and {second} do not touch; this is halfway across the gap between them.',
    crossingInside: 'One of the circles of {first} and {second} lies inside the other; this is midway between them.',
    crossingDistance: '≈ {distance} from you',
  },
} as const

export type TranslationKey = keyof typeof translations.en

export type LocaleOption = { code: Locale; label: string }

export const localeOptions: LocaleOption[] = [{ code: 'en', label: 'English' }]
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function fetchLocaleOptions(): Promise<LocaleOption[]> {
  const response = await fetch(`${apiBase}/api/languages`)
  if (!response.ok) throw new Error('Could not load language list.')
  const body = await response.json() as { items: { code: string; label: string }[] }
  return body.items.map((item) => ({ code: item.code, label: item.label }))
}

/** The interface is English only; the locale argument is kept for call-site compatibility. */
export function translate(_locale: Locale, key: TranslationKey, values?: Record<string, string | number>): string {
  let text: string = translations.en[key]
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

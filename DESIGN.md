# Map screen reference

## Source and capture

- Reference: user supplied screenshot of `https://pampered-knoll-guy.ngrok-free.dev` (captured 19 Oct 2026).
- The live URL initially showed the ngrok interstitial, so this note is based on the screenshot the user shared, not a direct inspection of the live page.
- Target: adapt the map interaction pattern to the existing SGU Go React/Vite application.

## Observed structure

- A compact white header introduces the guided-tour map, language selector, online status and QR action.
- The primary content uses a two-column layout: a large interactive map on the left and stacked information panels on the right.
- Map controls stay inside the map. Numbered POI markers identify places; a separate marker indicates the visitor's location.
- The first right panel contains connection/GPS feedback and audio controls. The second panel updates when a visitor chooses a POI.

## Visual guidance

Values below are visual estimates from the supplied screenshot, not measured source CSS.

- Surface: cool off-white page background, white cards, thin pale blue-gray borders and soft shadows.
- Accent: saturated blue for primary actions and map markers; green for online/GPS status.
- Typography: compact sans serif, bold dark headings, muted blue-gray helper text.
- Layout: rounded cards with roughly 14–16 px corners; generous map area; narrow gutters between map and sidebar.

## Implementation in SGU Go

- Preserve Leaflet and OpenStreetMap tiles, with visible OpenStreetMap attribution.
- Selecting a numbered campus POI updates the detail panel and centers its marker.
- The audio action uses browser speech synthesis for the available Vietnamese narration text.
- QR scanning uses the browser camera and `BarcodeDetector` when supported, with manual POI lookup as a fallback.
- Keep the existing note that campus coordinates are demo values until verified.

## Known gaps

- The screenshot depicts a city museum collection, while the target content is the SGU campus; map places and labels therefore remain SGU-specific.
- English narration content is not available yet.
- QR auto-detection depends on browser support for `BarcodeDetector` and camera permission; manual lookup remains available.
- POI coordinates still require confirmation against the actual campus layout.

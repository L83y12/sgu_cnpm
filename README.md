# SGU CNPM

Frontend application built with React, Vite, and TypeScript.

## Development

```sh
npm ci
npm run dev
```

### Campus map

The map uses Leaflet with OpenStreetMap data from the OSM tile server and does
not need an API key. Internet access is required to load the map library and
tiles. The map keeps visible OpenStreetMap attribution; do not use public tile
servers for bulk downloads or offline tile packages.

Campus POIs and coordinates are maintained in `src/App.tsx`; verify them
before using the map for campus navigation. Selecting **Vị trí của tôi** starts
high-accuracy browser location tracking, updates the map marker and nearby
distance ordering, and requires location permission in a secure context
(HTTPS or localhost). Select it again to stop tracking.

Before opening a pull request, run:

```sh
npm run lint
npm run typecheck
npm run build
```

## Git workflow

- `main` contains releasable code and deploys to GitHub Pages.
- `develop` is the integration branch.
- Create short-lived branches from `develop`: `feature/<description>`,
  `fix/<description>`, or `docs/<description>`.
- Open a pull request into `develop`; merge to `main` through a pull request
  after the integrated changes pass CI.
- Do not push feature work directly to `main` or `develop`.

The CI workflow checks pull requests targeting `main` and `develop`, and deploys
only pushes to `main`. Configure branch protection in GitHub repository settings
to require pull requests and passing checks; workflow files cannot enforce that
repository setting by themselves.

## Team responsibilities

Work is divided by primary ownership; coordinate interfaces and review changes
that affect both platforms.

| Stage | Linh | Nhung |
| --- | --- | --- |
| 1. Foundation | Repository architecture, React/Vite/TypeScript, Git strategy, CI foundation, code conventions, API contract | Environment setup, Git basics, repository orientation, CI and documentation support |
| 2. React Web | Web architecture, routing, layout, state, API layer | UI components, POI list/card, designed screens |
| 3. API, state, i18n, and Web audio | Axios/API integration, Zustand/store, i18n and audio architecture | Language switcher, audio UI, loading/error/empty states |
| 4. React Native | Mobile structure/navigation and shared API/store logic | Mobile screens, cards/lists/details, styling and components |
| 5. GPS, geofence, and offline | LocationService, GeofenceEngine, offline architecture, IndexedDB/Service Worker | GPS/permission states, map/markers and related screens |
| 6. Advanced audio and integration | NarrationEngine, audio fallback, Web/Mobile language and audio integration | Audio player UI, Mobile background audio, scenario testing |
| 7. CI/CD and integration | GitHub Actions, deployment, EAS build, environment/secrets, integration flow | Run tests/builds, verify and fix UI/integration issues |
| 8. Completion and report | Coordinate technical integration | Responsive/UI polish, test cases, screenshots/demo video, report support |

## API integration

The public API route inventory and items awaiting backend confirmation are
tracked in [docs/api-contract.md](./docs/api-contract.md). It is a draft based
on the lecturer-provided project material, which remains unchanged and is used
as the source of project requirements. It is not a replacement for the
backend's authoritative OpenAPI specification. Behavioral details stated in
the project material are captured there; only details not specified by the
material are marked for backend confirmation.

### Local admin API

The admin POI management screen has a small Node API for local development.
Run it and Vite in separate terminals from the repository root:

```sh
npm run dev:api
npm run dev
```

Open `/sgu_cnpm/admin`. The API creates `server/data/pois.json` and
`server/data/admins.json`, and stores uploaded pictures in `server/uploads/`;
these runtime files are ignored by Git. On the first admin dashboard load, the
existing demo POIs are imported into the API store. New POIs start as drafts;
use the row action to publish them to the guest map. The demo administrator is
`admin@sgu.edu.vn` / `sguadmin2026`. The admin screen has no self-registration;
configure the server account with `SGU_ADMIN_EMAIL` and `SGU_ADMIN_PASSWORD`.

This is a local development backend, not a GitHub Pages deployment. To share
admin changes with teammates or deploy them, host this Node API and its
persistent data storage, set `VITE_API_BASE_URL` to the API origin, and set
`SGU_ADMIN_EMAIL` and `SGU_ADMIN_PASSWORD` on the server. GitHub Pages serves
only the frontend and cannot persist these API records by itself.

## Web UI collaboration

- `src/app/` owns route configuration and the shared page layout.
- `src/features/poi/` owns POI pages and the shared UI model/props in
  `types.ts`.
- Routes use hash-based URLs so nested pages continue to work on GitHub Pages.
- Nhung can add POI card/list components under
  `src/features/poi/components/`, importing `Poi`, `PoiCardProps`, and
  `PoiListProps` from `types.ts`. The current `Poi` is a frontend display model,
  not the backend response DTO; API mapping belongs at the API boundary.

## Deployment

GitHub Actions deploys `main` to <https://l83y12.github.io/sgu_cnpm/>.

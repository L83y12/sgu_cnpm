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

Published campus POIs and coordinates are loaded from SQL Server through the
Node API. Selecting **Vị trí của tôi** starts high-accuracy browser location
tracking, updates the map marker and nearby distance ordering, and requires
location permission in a secure context (HTTPS or localhost). Select it again
to stop tracking.

### API configuration

The Node API reads SQL Server and administrator credentials from the root
`.env` file. The Vite frontend uses `VITE_API_BASE_URL` when the API is hosted
separately; leave it blank for the local Vite proxy.

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

### Local admin API and SQL Server

The Node API stores admin accounts, POIs, active visitor heartbeats, listening
analytics, and admin sessions in Microsoft SQL Server. The single authoritative
database setup is [`server/sql/sgu_go.sql`](./server/sql/sgu_go.sql). It creates
the database and tables, then inserts the SGU campus POIs and localization data
currently maintained by this project. The checked-in POI coordinates and
descriptions are project data and should be confirmed with SGU before production
use. MySQL Workbench is not a SQL Server client; use SQL Server Management
Studio (SSMS) or Azure Data Studio.

The schema follows the report ERD: `[POI]`, `[POI_LOCALIZATION]`, `[ROLE]`,
`[ADMIN_USER]`, `[POI_SUBMISSION]`, `[UI_TRANSLATION_BUNDLE]`,
`[CONTENT_DATASET_VERSION]`, and `[AUDIO_TASK]`. It also has
`[VISITOR_SESSION]`, `[POI_HEARD]`, and `[ADMIN_AUTH_SESSION]` for the current
app's active-user count, narration analytics, and admin login sessions. The
`[POI]` table has the report's nine columns; narration is stored in
`[POI_LOCALIZATION]`. The API exposes derived campus/address values through
`dbo.V_POI_API` without adding columns to the ERD table. `[ADMIN_USER]` includes
email, name, and password salt for SQL Authentication. The API reads/writes POI
localizations and UI translation bundles in SQL Server.

1. Enable TCP/IP and SQL Server Authentication (Mixed Mode) for the SQL Server
   instance. Restart SQL Server after changing the authentication mode. For a
   named instance, start SQL Server Browser; alternatively assign the instance
   a static TCP port and use `DB_PORT` instead of `DB_INSTANCE`.
2. Open `server/sql/sgu_go.sql` in SSMS, connect to the correct SQL Server
   instance, and execute it. It migrates rows from legacy `dbo.Places` into
   `dbo.POI`, then removes the duplicate table. This is the only setup/seed script
   to run. The older
   `schema.sql`, `seed.sql`, and `seed_poi_update.sql` files are retained as
   drafts and must not be run separately.
3. Create a SQL Server login in SSMS, map it to `SGUGo`, and grant the database
   roles `db_datareader` and `db_datawriter`.
4. `.env` is a local ignored file. Set `DB_SERVER`, `DB_INSTANCE` (or
   `DB_PORT`, but not both), `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in it to
   match your SQL Server login. Replace `CHANGE_ME` in `.env` before starting
   the API, and set a private `SGU_ADMIN_PASSWORD`. Never commit `.env`.

Run the API and Vite in separate terminals from the repository root:

```sh
npm run dev:api
npm run dev
```

Open `http://localhost:5173/sgu_cnpm/#/admin`. The admin dashboard can add/edit
POIs and save locale-specific content. On API startup, existing JSON
files in `server/data/` are imported into SQL Server once when their matching
tables are empty; the JSON files remain as backups. The API creates the account
configured by `SGU_ADMIN_EMAIL` and `SGU_ADMIN_PASSWORD` if missing. When an
explicit `SGU_ADMIN_PASSWORD` is configured, it also synchronizes that account's
password on API startup. New POIs start as drafts; use the row action to publish
them to the guest map. The admin screen has no self-registration.

To add an interface language, open **Ngôn ngữ giao diện** in the admin
dashboard, enter a locale such as `fr` or `pt-BR`, a display name, and its JSON
translation bundle, then save. The form provides the current translation keys
as a template. Blank or omitted values fall back to Vietnamese. The new locale
also appears in the POI editor, where translated names, categories,
descriptions, locations, and narration are stored in `dbo.POI_LOCALIZATION`.
The public app loads the ready language list and translation bundles from SQL
Server when it starts.

Uploaded image files stay under `server/uploads/`; SQL Server stores each
image's URL/path in `dbo.POI.image_url`. Back up that folder along with the
database if uploaded images need to persist across machines.

This is a local development backend, not a GitHub Pages deployment. To share
admin changes with teammates or deploy them, host this Node API and SQL Server,
set `VITE_API_BASE_URL` to the API origin, and configure the database/admin
environment variables on the server. GitHub Pages serves only the frontend
and cannot persist these API records by itself.

## Web UI collaboration

- `src/app/` owns route configuration and the shared page layout.
- `src/features/poi/` owns POI pages and the shared UI model/props in
  `types.ts`.
- Routes use hash-based URLs so nested pages continue to work on GitHub Pages.
- Nhung can add POI card/list components under
  `src/features/poi/components/`, importing `Poi`, `PoiCardProps`, and
  `PoiListProps` from `types.ts`. The current `Poi` is a frontend display model,
  not the backend response DTO; API mapping belongs at the API boundary.
- Campus map UI can use `MappablePoi` from `src/features/poi/types.ts` and
  `CampusMapProps` from `src/features/map/types.ts`. A map marker requires
  coordinates; POIs without coordinates remain valid for list-only UI.
- The shared Axios client lives in `src/api/`; POI endpoint calls live in
  `src/features/poi/api/`. The POI response remains `unknown` until backend
  field types are confirmed.

## Deployment

GitHub Actions deploys `main` to <https://l83y12.github.io/sgu_cnpm/>.

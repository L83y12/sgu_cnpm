# Public API contract (draft)

This inventory follows the lecturer-provided project presentation, which
remains unchanged. It records the methods, route behavior, and payload details
that the presentation actually specifies. It is not yet a complete
request/response contract: the presentation does not consistently define exact
field types, all query parameters, common error responses, or authentication
requirements. Confirm only those unspecified details against the backend's
OpenAPI document before treating this as an implementation contract.

Admin and owner APIs are intentionally out of scope for this first frontend
integration pass.

## Routes explicitly named in the project material

| Method | Path | Documented contract | Still unspecified |
| --- | --- | --- | --- |
| `GET` | `/api/v1/poi/load-all` | Full or delta POI sync. Delta uses `If-None-Match` and/or `updated_after`; response includes `dataset_version`, `sync_mode`, `removed_poi_ids`, and `sync_cursor`. Public results contain active POIs ready in English. `?lang=en` is shown in the startup loading flow; `?lang=<locale>` loads POI localization for a target locale. | Exact POI fields/types, precedence when both delta selectors are sent, and complete status/response schemas |
| `GET` | `/api/v1/poi/nearby` | Returns POIs in a radius for nearby discovery and localization hotset preparation. | Exact query names/types, defaults, bounds, and response schema |
| `GET` | `/api/v1/poi/{id}` | Public POI detail route. | ID format, not-found behavior, and response schema |
| `GET` | `/api/v1/maps/offline-manifest` | Compatibility manifest endpoint; always revalidate (`no-cache`). Primary static manifest is `/static/maps/packs/current/manifest.json`. | Manifest fields and exact caching headers |
| `GET` | `/api/v1/maps/offline-options` | Lists available offline packs by scope, label, version, source date, and size; documented as `no-cache`. | Exact query and response schemas |
| `GET` | `/static/maps/packs/{version}/{file}.pmtiles` | PMTiles map pack, supports HTTP Range Requests and immutable caching. | Exact range/error response details |
| `GET` | `/static/maps/styles/*.json` | Self-hosted style JSON and sprite resources; revalidate or immutable caching. | Exact asset inventory and cache headers |
| `GET` | `/static/maps/fonts/{fontstack}/{range}.pbf` | Self-hosted glyph PBF resources; immutable caching. | Exact cache headers and missing-resource behavior |
| `GET` | `/api/v1/audio/languages` | Available audio languages; used by startup probing. The frontend probe uses a 2.5-second timeout and at most two attempts in an 8-second window. | Response schema and status/error behavior |
| `GET` | `/api/v1/audio/voices` | Edge-TTS voice catalog; backend caches the catalog with TTL and stale fallback. | Response fields and cache/error status behavior |
| `GET` | `/api/v1/audio/pack-manifest` | For one language, returns `{lang, pack_version, total_files, total_bytes, files[]}`; computes a SHA-256 hash per audio file. | Exact `files[]` fields/types and error schema |
| `POST` | `/api/v1/audio/tts` | Streams synthesized MP3. `X-Cache` is `HIT`/`MISS`; `X-Static-Url` is a versioned URL suitable for Service Worker caching. | Request body, status/error responses, and exact header semantics |
| `POST` | `/api/v1/localizations/prepare-hotset` | Prepares at most 10 nearby POIs within 1.5 km. Language switching is ready when the 3 required POIs have content and audio in cache. | Request/response schema and how required POIs are selected |
| `POST` | `/api/v1/localizations/on-demand` | Reactively localizes a POI; translates and synthesizes audio, stores it, and returns a new `audio_url`. Rate-limited responses provide `Retry-After`. | Request/response field types and complete error/status schema |
| `POST` | `/api/v1/localizations/warmup` (shown as `POST /warmup` in the project flow) | Starts full-corpus background localization. Rate-limited responses provide `Retry-After`; frontend backs off. | Confirm the fully mounted path; request/response schema and job identifier |
| `GET` | `/api/v1/localizations/warmup/{locale}/status` | Checks localization warmup status; the presentation illustrates the Japanese status route. | Response schema and supported locale values |
| `GET` | `/api/v1/ui-bundles/{locale}` | Serves the `public-ui` namespace. `en`, `vi`, `zh`, `ja`, and `ko` have top-level bundles. Long-tail locales return English fallback with `status: pending` and `source_hash` while server translation runs. Language switching is ready only after both the POI content hotset and UI bundle are ready. | Full bundle schema, pending completion signaling, and error behavior |

The routes above use the `/api/v1` prefix as shown by the router mount and
frontend examples in the project material. The material also identifies
`/api/v1/ai` and analytics routes, but does not define them as part of the
customer-facing Web flow scoped for this draft. Admin and owner routes remain
out of scope.

## Required before treating this as final

- Backend base URL and deployment environment configuration.
- Exact field types and any request/response details not specified above.
- Error envelope, status codes, and authentication requirements for public routes.
- Exact POI delta-sync precedence and map/audio cache/header behavior.
- A backend-maintained OpenAPI document or an agreed generated client/types source.

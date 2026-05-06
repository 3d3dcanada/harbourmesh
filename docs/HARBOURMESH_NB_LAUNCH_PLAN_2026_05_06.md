# HarbourMesh New Brunswick Launch Plan

Date: 2026-05-06
Status: Source-of-truth planning draft
Scope: New Brunswick pilot first, international architecture second

## Executive Status

HarbourMesh is currently a React/Vite NB pilot app with an early Fastify backend for device registration, chart source catalog, chart package manifests, downloadable generated GeoJSON package artifacts, downloadable starter MBTiles vector-tile artifacts, downloadable starter PMTiles v3 MVT artifacts, optional capped GeoNB feature ingestion for CLI/API release generation, community sounding upload, governed community observation upload, community hazard upload, hazard review/history, review-operator API key identity, privacy-preserving aggregate GeoJSON, persisted aggregate release manifests/cells, and starter community aggregate GeoJSON/MBTiles/PMTiles artifact manifests/downloads. It still does not have a production chart engine, hardware ingest proof, AI runtime, weather-routing engine, full hydrography vector tile products, or production cloud mesh. The next goal is not a public launch. The next goal is a stable NB pilot foundation that is honest about what is implemented, legally clean around chart data, and ready for real vessel telemetry.

The product ambition is correct: a boat-first operating layer where charts, vessel telemetry, sonar soundings, radar-derived observations, hazards, weather, maintenance, and community-contributed local knowledge can become useful together. The implementation has to be phased carefully because official navigation charts, user-generated bathymetry, privacy, liability, and sensor quality are separate problems that should not be mixed into one ungoverned data pool.

## Non-Negotiable Product Boundaries

1. HarbourMesh must separate official navigation products from HarbourMesh community/reference data.
2. CHS products must not be copied, converted, republished, or redistributed unless HarbourMesh has a separate licence or authorized integration path.
3. Community sonar, radar, AIS, tracks, hazards, and conditions must carry consent, provenance, quality, timestamp, location precision, and confidence metadata.
4. User-contributed charting must begin as a reference overlay, not as a replacement for official charts.
5. Raw vessel data must never become public by default.
6. Users must be able to choose local-only, anonymized community contribution, or identified fleet/team contribution.
7. Every data product must show whether it is official, licensed, imported by the user, community-derived, simulated, stale, or unverified.

## Current Repository Reality

Active checkout:

```text
/home/wess/3d3d-platform/_deploy-review/harbourmesh
```

Observed state:

- Frontend: React/Vite app exists, with the community section now wired to local telemetry, AIS targets, soundings, governed observations, hazards, upload batches, local map overlay features, and NB reference mapping instead of hard-coded demo community data.
- Charts: NB pilot reference chart work has started with React Leaflet, OSM base tiles, legal GeoNB WMS overlays, a chart source catalog, NB offline package manifests, generated reference-only GeoJSON package artifacts, starter MBTiles vector-tile artifacts, starter PMTiles v3 MVT artifacts for package boundaries/source policy, API/UI download links for those artifacts, optional capped GeoNB ArcGIS feature ingestion for CLI/API release generation, a disk artifact writer, and a Navigation chart package panel; it is not a certified navigation chart system, and full uncapped hydrography vector tiles are not generated yet.
- Telemetry: recorded Signal K replay and live Signal K WebSocket wiring now exist; live hardware ingest remains unverified.
- Backend: a Fastify API now exists for NB chart source catalog, NB chart package manifests/artifact downloads, optional HMAC-signed artifact download headers, community sounding upload, governed community observation upload, community hazard upload, hazard review, community reference GeoJSON overlay, aggregate release publishing/history/cells/artifacts, optional aggregate release approval gates, device registration, and summary endpoints. JSONL remains the local fallback, and `HARBOURMESH_DATABASE_URL` now activates PostGIS runtime repositories for devices, soundings, observations, hazards, hazard review history, aggregate release manifests, and aggregate cells.
- Community mesh: local raw sounding capture, local hazard reporting, consent-safe offline upload queues, backend upload endpoints, pending-by-default hazard moderation, an operator review surface, review-operator API key identity, queryable review history, a raw reference overlay, privacy-preserving aggregate GeoJSON, persisted aggregate GeoJSON release products, and starter community aggregate MBTiles/PMTiles artifact manifests now exist.
- Security: docs no longer claim production readiness; the weak SHA-256 placeholder key derivation, token signing, and password hashing helpers have been replaced with PBKDF2-HMAC-SHA256/HMAC-SHA256 regressions, the pilot API now has configurable scoped API-key gates for write/device plus review-operator keys that override client-supplied reviewer names, hash-based API key configuration for deployments that should not store plaintext keys, optional HMAC-SHA256 artifact download signatures, and the web app can save pilot credentials in a local secret store excluded from data exports. Full user auth, production secret management, and fleet/team identity are still not implemented.
- CI/release: workflows have been adjusted to stop calling missing package scripts, use Node 22, run app/server checks, build the API container, and provide a manual Cloudflare Pages deploy path for the web build when Cloudflare repository secrets are configured.
- Testing: current tests now cover chart source metadata, Signal K mapping, community sounding extraction, local hazard reporting, device registration, store queue behavior, and crypto helper regressions; they still do not prove navigation safety, hardware ingest, production auth, browser layout, or security readiness.

## Current Verification Snapshot

Last light checks:

- `npm run test:run`: passing, 135 web tests.
- `npm test` in `server`: passing, 36 server tests.
- `npm run type-check`: passing.
- `npm run type-check` in `server`: passing.
- `npm run lint`: passing with 0 warnings.
- `npm audit --json`: 0 vulnerabilities.
- `npm run build`: passing for the web app.
- `npm run build`: section-level code splitting is active; the initial app JS chunk is 286.89 kB / 90.37 kB gzip, the Navigation section chunk is 30.75 kB / 7.22 kB gzip, the Settings section chunk is 44.44 kB / 9.01 kB gzip, the Community section chunk is 66.11 kB / 11.26 kB gzip, and the prior Vite oversized chunk warning is gone.
- `npm run build` in `server`: passing.
- `npm audit --json` in `server`: 0 vulnerabilities.
- Cloudflare Pages config exists at `app/wrangler.toml` with `pages_build_output_dir = "./dist"` and a manual GitHub deploy workflow at `.github/workflows/cloudflare-pages.yml`; no live Cloudflare deployment was run in this snapshot.
- API container packaging exists at `server/Dockerfile` with a non-root runner, `/health` healthcheck, and `/data` JSONL storage path; no live container registry push was run in this snapshot.
- API container smoke: `docker build -t harbourmesh-api:codex-smoke ./server` succeeded, the container started on local port 3106 with scoped SHA-256 smoke API key env values, `/health` returned `ok: true`, a protected sounding upload using the unhashed client key returned an accepted receipt, and the smoke container was stopped.
- API container artifact smoke on port 3109: `/api/charts/nb/package-artifacts` returned 6 artifacts from the rebuilt container, 2 GeoJSON, 2 MBTiles, and 2 PMTiles; MBTiles pending was false, PMTiles pending was false, and the MBTiles/PMTiles summaries reported z6-z8 with 20 coast tiles and 33 inland-waterway tiles.
- API container chart artifact download smoke on port 3123: a rebuilt `harbourmesh-api:codex-smoke` container served `/api/charts/nb/package-artifacts`, downloaded inland-waterway PMTiles and coast MBTiles from manifest `downloadPath` values, matched SHA-256 and official-chart exclusion headers, verified `PMTiles` and SQLite MBTiles signatures, and returned 404 for a missing package.
- API container live GeoNB artifact smoke on port 3125: a rebuilt `harbourmesh-api:codex-smoke` container ran with `HARBOURMESH_FETCH_GEONB_FEATURES=true` and `HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE=1`, fetched 3 capped live GeoNB coast source feature sets, generated coast GeoJSON/PMTiles artifacts with those features, downloaded PMTiles with a matching checksum, and was stopped after the pass.
- API container signed artifact smoke on port 3127: a rebuilt `harbourmesh-api:codex-smoke` container ran with `HARBOURMESH_ARTIFACT_SIGNING_KEY` and `HARBOURMESH_ARTIFACT_SIGNING_KEY_ID`, served signed chart PMTiles and signed community aggregate PMTiles downloads, matched checksums, verified `HMAC-SHA256` signature headers, and was stopped after the pass.
- API container aggregate release approval smoke on port 3129: a rebuilt `harbourmesh-api:codex-smoke` container ran with scoped write keys, review-operator keys, and `HARBOURMESH_REQUIRE_AGGREGATE_RELEASE_APPROVAL=true`; publishing without approval returned 428, publishing with the approval checklist returned 201, and the server-side review operator ID overrode the client approver.
- API container aggregate release smoke on port 3112: a rebuilt `harbourmesh-api:codex-smoke` container first failed closed without production API keys, then passed with scoped write/review keys; community sounding upload, governed observation upload, aggregate release publish, latest release, release history, and latest release cells all returned expected responses with 1 persisted cell and no raw IDs, vessel IDs, or official chart data.
- API container aggregate artifact smoke on port 3116: a rebuilt `harbourmesh-api:codex-smoke` container with scoped write/review keys published an aggregate release and returned latest release artifacts in GeoJSON, MBTiles, and PMTiles formats; PMTiles reported 6 tiles and `vectorTileGenerationPending` was false.
- API container aggregate artifact download smoke on port 3120: a rebuilt `harbourmesh-api:codex-smoke` container with scoped write/review keys published an aggregate release, fetched `/api/community/releases/aggregates/latest/artifacts`, downloaded the latest PMTiles bytes from the manifest `downloadPath`, matched the SHA-256 and privacy headers, verified the `PMTiles` magic bytes, and returned 404 for an unsupported `kml` artifact format.
- PostGIS container smoke: a throwaway `postgis/postgis:16-3.4-alpine` database plus `harbourmesh-api:codex-smoke` on port 3107 applied migrations with `HARBOURMESH_RUN_MIGRATIONS=true`; protected sounding, observation, hazard review, aggregate GeoJSON, and device registration flows all returned expected database-backed responses, then both containers and the smoke Docker network were stopped/removed.
- PostGIS aggregate release smoke on port 3113: a throwaway `postgis/postgis:16-3.4-alpine` database plus `harbourmesh-api:codex-smoke` applied migrations and persisted aggregate release manifests/cells through PostGIS; community sounding upload, governed observation upload, review-scoped aggregate release publish, latest release, release history, and latest release cells all returned expected responses with 1 persisted cell and no raw IDs, vessel IDs, or official chart data, then both containers and the smoke Docker network were stopped/removed.
- PostGIS aggregate artifact smoke on port 3117: a throwaway `postgis/postgis:16-3.4-alpine` database plus `harbourmesh-api:codex-smoke` applied migrations, published an aggregate release, and returned latest release artifacts in GeoJSON, MBTiles, and PMTiles formats; PMTiles reported 6 tiles, `vectorTileGenerationPending` was false, and both containers plus the smoke Docker network were stopped/removed.
- PostGIS aggregate artifact download smoke on port 3121: a throwaway `postgis/postgis:16-3.4` database plus `harbourmesh-api:codex-smoke` applied migrations, published an aggregate release, fetched the latest artifact manifest, downloaded the latest PMTiles bytes, matched the SHA-256 and official-chart privacy headers, verified the `PMTiles` magic bytes, returned 404 for unsupported `kml`, and then both containers plus the smoke Docker network were stopped/removed.
- Server API auth tests cover missing keys, accepted header keys, accepted Bearer keys, scoped write/review key separation, review-operator key parsing, reviewer identity override for audit history, protected device registry reads, and fail-closed production-style config.
- Server API auth tests cover SHA-256 hash-backed write keys and review-operator keys while clients continue sending normal API keys.
- Server hazard review tests cover pending hazards being withheld from public GeoJSON until accepted, accepted hazards becoming overlay-eligible, review history listing, and unknown hazard review returning 404.
- Server aggregate GeoJSON tests cover cell polygons, sounding depth averages, positioned observation counts, accepted-hazard counts, official chart exclusion, and raw vessel/source ID omission.
- Server aggregate release tests cover checksum manifests, persisted release history, persisted latest-release aggregate cells, aggregate release artifact manifests, review-scoped release publishing, optional approval checklist gating, review-operator approval identity override, and latest-release retrieval without embedded feature payloads, raw record IDs, vessel IDs, or official chart data.
- Server community aggregate artifact tests cover generated GeoJSON, SQLite MBTiles, PMTiles v3 MVT output opened through the official `pmtiles` reader, signed download headers, tile-summary metadata, and raw ID/vessel ID/official chart exclusion.
- Server chart package tests cover `/api/charts/nb/packages`, `/api/charts/nb/package-artifacts`, signed chart artifact downloads, NB coast and inland-waterway package definitions, generated GeoJSON/MBTiles/PMTiles artifact checksums, optional bounded GeoNB ArcGIS feature queries through CLI and runtime API paths, community-overlay inclusion, and official CHS exclusion.
- Server chart artifact writer tests cover compact GeoJSON output, SQLite MBTiles output, PMTiles v3 MVT output opened through the official `pmtiles` reader, checksum-matching bytes, `manifest.json` writing, release manifest content omission, tile-summary metadata, and official chart exclusion.
- Server observation tests cover protected upload of governed radar/weather-style observations, duplicate receipts, summary counts by type/region, raw sensor payload exclusion, and position-sharing policy rejection.
- Server PostGIS schema tests cover the NB pilot migration, spatial observation/hazard/aggregate columns, idempotent position-column/device-kind upgrades, position JSON round-trip storage, runtime device kind parity, GIST indexes, and schema-level exclusion of official chart data/raw identifiers from shared products.
- Server startup tests cover the PostGIS runtime mode switch staying health-checkable before the first database-backed data route runs.
- Web NMEA regression tests cover longitude degree-width parsing, 1990s RMC date handling, checksum rejection, DBT meter depth parsing, and legacy utility parser parity.
- Web demo-source notice tests cover accessible status rendering for simulated/demo data surfaces.
- Web local persistence tests cover vessel/items, documents, logs, and tasks writing to named local-first stores.
- Web local data portability tests cover export/import round trips and verify AI provider plus pilot API credential secret stores are excluded.
- Web pilot API credential tests cover local secret-store save/clear, trim behavior, explicit override precedence, stored API key resolution, and stored review-operator identity resolution.
- Web telemetry health tests cover fresh/stale/missing channel classification, compact age formatting, and `receivedAt`-based feed freshness while preserving observed telemetry timestamps.
- Web sounding quality tests cover abrupt depth-jump rejection before upload and slower depth changes outside the jump window staying valid.
- Web observation tests cover consent-safe telemetry observation derivation, raw sensor payload exclusion, AIS identifier omission from metrics, upload batch policy, local queue de-duplication, status tracking, and upload receipt validation.
- Web hazard moderation tests cover protected review-queue loading, review history loading, review receipt validation, API error handling, and invalid receipt rejection.
- Web aggregate overlay tests cover aggregate GeoJSON fetching, positioned observation counts, aggregate release manifest/history/cell/artifact fetching, release publishing, privacy metadata validation, and rejection when raw IDs or official chart data are exposed.
- Web chart artifact tests cover `/api/charts/nb/package-artifacts` client validation, GeoJSON, MBTiles, and PMTiles artifact manifest loading, generated-format media types, and rejection of artifacts that include official chart data.
- Local API smoke on port 3101: `/health`, `POST /api/community/soundings`, and `/api/community/soundings/summary` returned expected responses.
- Local API smoke on port 3102: `POST /api/devices/register` and `GET /api/devices` returned expected responses.
- Local API smoke on port 3103: `/health`, `POST /api/community/hazards`, and `/api/community/hazards/summary` returned expected responses.
- Local API smoke on port 3104: `/health` and `/api/charts/nb/catalog` returned expected responses with 6 sources, 4 GeoNB WMS layers, and CHS official products marked not uploadable.
- Local API smoke on port 3105: `/health`, community sounding upload, community hazard upload, and `/api/community/overlay.geojson` returned a 2-feature reference overlay with official chart data excluded.
- Local API smoke on port 3110 with a temporary data directory: community sounding upload, governed observation upload, review-scoped aggregate release publish, latest release retrieval, release history listing, and latest release cells all returned expected responses; the published release had 1 cell, source counts of 1 accepted sounding and 1 positioned observation, and no raw IDs, vessel IDs, or official chart data in the persisted cell GeoJSON.
- Local API smoke on port 3114 with a temporary data directory: community sounding upload, governed observation upload, review-scoped aggregate release publish, and `/api/community/releases/aggregates/latest/artifacts` returned GeoJSON, MBTiles, and PMTiles artifacts; PMTiles reported 6 tiles, `vectorTileGenerationPending` was false, and no raw vessel IDs were exposed.
- Local API smoke on port 3118 with a temporary data directory: community sounding upload, review-scoped aggregate release publish, latest artifact manifest fetch, PMTiles artifact download, checksum/privacy header checks, `PMTiles` magic-byte verification, and invalid-format 404 all returned expected responses.
- Local API smoke on port 3122: `/api/charts/nb/package-artifacts` returned 6 artifacts, the coast PMTiles download returned 10496 bytes with matching checksum/reference-only/official-chart-exclusion headers, the inland-waterway GeoJSON download matched checksum and official-chart exclusion metadata, and invalid `kml` returned 404.
- Local API live GeoNB smoke on port 3124: the API ran with `HARBOURMESH_FETCH_GEONB_FEATURES=true` and `HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE=1`, fetched 4 capped live GeoNB inland-waterway source feature sets, returned 5 GeoJSON features including the package boundary, and downloaded PMTiles with a matching checksum.
- Local API signed artifact smoke on port 3126: the API ran with scoped write/review keys plus `HARBOURMESH_ARTIFACT_SIGNING_KEY` and `HARBOURMESH_ARTIFACT_SIGNING_KEY_ID`; chart PMTiles and community aggregate PMTiles downloads both returned matching checksum headers plus `HMAC-SHA256` signature headers with the configured key ID.
- Local API aggregate release approval smoke on port 3128: the API ran with scoped write keys, review-operator keys, and `HARBOURMESH_REQUIRE_AGGREGATE_RELEASE_APPROVAL=true`; latest release returned 404 instead of auto-publishing, publish without approval returned 428, publish with checklist returned 201, and latest then matched the approved release with server-side approver identity.
- Local chart artifact smoke: `npm run charts:nb:artifacts -- ./tmp/nb-chart-artifacts-pmtiles-smoke` wrote `manifest.json`, two GeoJSON artifacts, two MBTiles artifacts, and two PMTiles artifacts; `nb-coast-reference.pmtiles` was 10496 bytes with 20 tile entries, `nb-inland-waterways-reference.pmtiles` was 18735 bytes with 33 tile entries, both opened as PMTiles v3 MVT archives with the `harbourmesh_reference` layer, and official chart data was excluded.
- Live GeoNB feature artifact smoke: `HARBOURMESH_FETCH_GEONB_FEATURES=true HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE=3 npm run charts:nb:artifacts -- ./tmp/nb-chart-artifacts-geonb-pmtiles-smoke` pulled capped GeoNB ArcGIS GeoJSON features into the release artifacts; coast output included 9 source features plus the package boundary, inland output included 12 source features plus the package boundary, generated MBTiles and PMTiles remained official-chart-free, and both PMTiles files opened as PMTiles v3 MVT archives with the `harbourmesh_reference` layer.
- Browser smoke on port 5175: Community map rendered at 1280x900 and 360x780 with seeded local sounding and hazard overlay markers.
- Browser smoke on port 5176: Dashboard and Community lazy-loaded through sidebar navigation at 1280x900 and the Community view rendered at 360x780.
- Browser smoke on port 5176: demo-data notices rendered on Inventory, Documents, Logs & Tasks, Vessel, and Boat Map after sidebar navigation.
- Browser smoke on port 5176: Settings Data & Storage rendered the Export All Data and Import Data controls at 1280x900.
- Browser smoke on port 5173: Settings Network rendered Pilot API Credentials, saved a test API key/operator ID into `harbormesh-pilot-api`, verified the local secret-store value, cleared it, and verified the key was removed; the Network tab also stayed contained at 360x800.
- Browser smoke on port 5173: Navigation rendered Sensor Health for GPS, Depth/Wx, AIS, and Engine; replay feed updates showed fresh channel states at 1280x900 and 360x800.
- Browser smoke on port 5176: Community Moderation rendered the Load Review Queue control at 1280x900 and the tab list stayed inside the 360x780 viewport.
- Browser smoke on port 5176: Community Moderation rendered the Review History card and Load History control at 1280x900 and 360x780.
- Browser smoke on port 5176: Community Map rendered the Load Aggregates control at 1280x900 and 360x780, with the map card contained at both sizes.
- Browser smoke on port 5173 with API on port 3001: Navigation Chart View rendered the Chart Packages panel, Load Artifacts returned `GET /api/charts/nb/package-artifacts => 200 OK`, two reference-only GeoJSON artifacts, two starter MBTiles artifacts, and two starter PMTiles artifacts rendered, no PMTiles pending badge remained, and the pass had no console errors after adding the app favicon.
- Browser smoke on port 5173 after restarting the local API from current source: Navigation Chart View and the loaded Chart Packages panel were checked at 1280x900 and 360x800; both sizes showed `2 GeoJSON`, `2 MBTiles`, `2 PMTiles`, no `PMTiles pending`, and z6-z8 MBTiles/PMTiles summaries, with body/document width equal to the viewport width and zero fresh console errors or warnings.
- Browser smoke on port 5173 with API on port 3001: Community Map loaded the latest aggregate release manifest and rendered checksum/file details at 1280x900; Community Conditions at 360x800 rendered observation queue controls with body width equal to viewport width.
- Browser smoke on port 5177 with a temporary API on port 3111: Community Map clicked Publish Release at 1280x900, rendered 1 aggregate cell, the persisted aggregate release card, file name, byte size, checksum, generated timestamp, and release history; the same state rendered at 360x800 without console errors or warnings.
- Browser smoke on port 5178 with a temporary API on port 3115: Community Map clicked Publish Release at 1280x900 and 360x800, rendered the persisted aggregate release card plus GeoJSON, MBTiles, and PMTiles artifact cards with z8-z12 / 6 tile summaries, and the pass had 0 console errors and 0 warnings.
- Browser smoke on port 5179 with a temporary API on port 3119: Community Map clicked Publish Release at 1280x900 and 360x800, rendered 1 aggregate cell, the persisted release card, release history, and GeoJSON/MBTiles/PMTiles artifact cards with `Download` links to `/api/community/releases/aggregates/latest/artifacts/:format`; the pass had 0 console errors and 0 warnings.
- Browser smoke on port 5180 with a temporary API on port 3122: Navigation Chart View loaded 2 GeoJSON, 2 MBTiles, and 2 PMTiles NB reference artifacts at 1280x900 and 360x800, rendered coast/inland `Download` links to `/api/charts/nb/package-artifacts/:packageId/:format`, and the pass had 0 console errors and 0 warnings.
- No live Signal K hardware test or real-vessel API load test was run for this snapshot.

## Implementation Progress On 2026-05-06

Completed in the active checkout:

- Stabilized the React/Vite source enough for tests, type-check, lint, and dependency audit to pass.
- Added a New Brunswick pilot chart source registry with GeoNB overlays and CHS local-only boundaries.
- Added a backend NB chart catalog endpoint at `/api/charts/nb/catalog` with GeoNB, CHS NONNA, and CHS official-product source policies.
- Added a backend NB chart package manifest endpoint at `/api/charts/nb/packages` for planned reference-only coast and inland-waterway offline packages.
- Added `/api/charts/nb/package-artifacts` to generate reference-only GeoJSON, starter MBTiles, and starter PMTiles package artifacts with bounds, source policy, byte sizes, tile summaries, and SHA-256 checksums while excluding official CHS data.
- Added `/api/charts/nb/package-artifacts/:packageId/:format` plus Navigation chart package download buttons so NB coast/inland reference GeoJSON, MBTiles, and PMTiles artifacts can be downloaded with checksum and reference-only headers.
- Added `npm run charts:nb:artifacts` to write NB reference package GeoJSON artifacts, starter MBTiles vector-tile archives, starter PMTiles v3 MVT archives, and a release `manifest.json` to disk with checksum-matching compact bytes.
- Added optional `HARBOURMESH_FETCH_GEONB_FEATURES=true` CLI/API release generation so eligible GeoNB ArcGIS MapServer layers can be queried as bounded GeoJSON and folded into the generated GeoJSON/MBTiles/PMTiles artifacts with per-source feature caps and source summaries.
- Replaced the navigation canvas demo with an NB pilot map component.
- Added Signal K URL building, delta mapping, recorded replay data, and telemetry mode settings.
- Added a persisted navigation planning store, route distance/course calculations, and an NB pilot reference route overlay.
- Added local raw depth sounding capture from telemetry with consent, position precision, quality flags, and transducer offsets.
- Added community sounding upload payloads and local offline sync batches that explicitly exclude official chart data and raw local positions.
- Added a Fastify community sounding API at `/api/community/soundings`, strict Zod validation, JSONL fallback storage, PostGIS runtime storage, summary endpoint, and frontend sync adapter.
- Added Boat Node device identity settings and `/api/devices/register` so contributed data can carry registered source provenance.
- Replaced the remaining demo community map, conditions, hazards, bathymetry stats, and contribution statistics with values derived from local telemetry, AIS targets, stored soundings, local hazards, and sync batches.
- Added a Fastify community hazard API at `/api/community/hazards`, strict Zod validation, JSONL fallback storage, PostGIS runtime storage, summary endpoint, frontend hazard queueing, receipt validation, and hazard status tracking.
- Added a reference-only community GeoJSON overlay at `/api/community/overlay.geojson` that emits accepted soundings and positioned hazards while marking official chart data as excluded.
- Added local community overlay feature generation and rendered local sounding and hazard markers on the NB community map.
- Replaced mislabeled SHA-256 security helpers with PBKDF2-HMAC-SHA256 key derivation/password hashing, HMAC-SHA256 token signatures, AES-GCM IV/tag validation, and regression tests.
- Split the frontend into lazy-loaded section chunks so the initial production bundle is smaller and the main app shell no longer trips Vite's oversized chunk warning.
- Added configurable pilot API-key enforcement for community uploads and device registry endpoints, with public chart catalog, summaries, and reference overlay endpoints left readable.
- Added pending-by-default hazard review for backend community hazards so public GeoJSON overlays only include accepted hazards.
- Added `/api/community/aggregates.geojson` for privacy-preserving community aggregate cells with depth averages and accepted hazard counts, without raw record IDs or vessel IDs.
- Wired aggregate GeoJSON loading into the Community map and rendered aggregate cells as reference polygons separate from local/raw overlay markers.
- Added NMEA 0183 parser regressions and fixed GGA field indexing, longitude degree parsing, RMC date/time handling, checksum rejection, and DBT offset handling.
- Added shared demo-data notices to vessel, boat map, inventory, documents, logs/tasks, and fleet surfaces, and stopped auto-saving demo documents/logs/tasks/vessel data into local stores.
- Added local-first persistence for user-owned vessel data, items, documents, logs, and tasks.
- Wired Settings data export/import to a versioned local-data bundle that excludes AI provider and pilot API credential secret storage.
- Added Settings Network controls for local pilot API key and review-operator ID storage so community upload, device registration, and hazard review clients can use beta credentials without hard-coding them in the build environment.
- Added Navigation Sensor Health with fresh/stale/missing states for GPS, Depth/Wx, AIS, and Engine channels, using `receivedAt` for feed freshness so recorded replay can prove active delivery without changing original observation timestamps.
- Added a sounding quality guard that flags abrupt sonar/depth jumps and rejects likely depth spikes before they enter community upload batches.
- Added a protected community observation API with JSONL fallback and PostGIS runtime repositories for governed radar, AIS, weather, track, condition, and system-health observations with consent, quality, raw-payload exclusion, duplicate handling, and summary metadata.
- Wired frontend community observation derivation, local persistence, offline queueing, upload receipt validation, and Community conditions controls for governed telemetry observations.
- Folded positioned governed observations into privacy-preserving aggregate GeoJSON cells and map popups without exposing raw record IDs, vessel IDs, or source device IDs.
- Added `/api/community/releases/aggregates/latest`, `/api/community/releases/aggregates/latest/cells.geojson`, `GET /api/community/releases/aggregates`, and review-scoped `POST /api/community/releases/aggregates` so aggregate products can be published, persisted, listed, and loaded as release-specific GeoJSON cells.
- Added `/api/community/releases/aggregates/latest/artifacts` so the latest persisted aggregate release exposes reference-only GeoJSON, MBTiles, and PMTiles artifact metadata with checksums, tile counts, privacy flags, and official chart exclusion.
- Added `/api/community/releases/aggregates/latest/artifacts/:format` plus Community artifact download buttons so pilots can download the latest reference-only GeoJSON, MBTiles, or PMTiles aggregate release artifact with checksum and privacy headers.
- Added Cloudflare Pages deployment configuration, environment examples, a manual deploy workflow, and a `npm run deploy:pages` script for the web app.
- Added API container packaging and CI/release Docker build steps for the Fastify pilot backend.
- Added an operator hazard moderation surface in Community with protected review-queue loading and accept/reject actions against the pilot API.
- Split pilot API keys into backward-compatible legacy keys plus scoped write keys and review keys so intake/device access can be separated from hazard moderation.
- Added `HARBOURMESH_REVIEW_OPERATOR_KEYS` support so review-scoped API keys can carry server-side operator IDs and override client-supplied reviewer names before moderation audit history is written.
- Added SHA-256 hash-backed API key env support for legacy, write, review, and review-operator keys so production deployments can avoid storing plaintext shared keys.
- Added optional `HARBOURMESH_ARTIFACT_SIGNING_KEY` and `HARBOURMESH_ARTIFACT_SIGNING_KEY_ID` support so chart package and community aggregate artifact downloads can include HMAC-SHA256 signature headers for client-side integrity verification.
- Added optional `HARBOURMESH_REQUIRE_AGGREGATE_RELEASE_APPROVAL=true` so production-style deployments can disable auto-publish and require a review-scoped approval checklist before aggregate release manifests are persisted.
- Added the first PostGIS migration for vessels, devices, soundings, hazards, reviews, aggregate cells, and release manifests with spatial indexes and legal/privacy checks.
- Added `HARBOURMESH_DATABASE_URL` PostGIS runtime repositories for devices, community soundings, governed observations, hazards, hazard review history, aggregate release manifests, and aggregate cells while preserving JSONL as the no-database local fallback.
- Hardened the first PostGIS migration so existing pilot databases can pick up position JSON columns and runtime device-kind parity without relying on a fresh schema.
- Added review-scoped `/api/community/hazards/reviews` so hazard moderation decisions are queryable as audit history.
- Wired hazard review history into the Community moderation tab with a protected history client and responsive review-history panel.
- Wired generated NB chart package artifacts into the web chart catalog client and Navigation Chart View so pilots can load reference-only GeoJSON, MBTiles, and PMTiles artifact manifests, byte sizes, checksums, tile counts, excluded official source IDs, and generated-format status.
- Replaced the route overlay React fragment inside the Leaflet pane with a `LayerGroup`, clearing the chart-view React console warning during browser smoke.
- Added an SVG favicon link so the browser smoke no longer carries a missing `/favicon.ico` error.

Still not done:

- No full production user auth, uncapped/full hydrography vector tile generation, permanent signed artifact object storage, or multi-step production release approval workflow exists.
- No full route-by-route browser/mobile visual verification has been run in this session.
- No real Signal K server, sonar, radar, AIS receiver, or Boat Node hardware has been tested.
- Community hazards can now be queued, uploaded to the pilot backend, reviewed through the API/UI with review-scoped keys or review-operator keys, listed through review history, included in the raw reference overlay only after acceptance, and counted in privacy-preserving aggregates; vector tile products are still not implemented.

## NB Data Strategy

### Official Navigation Layer

Purpose:

- Let users work with official chart products where legally allowed.
- Keep official products distinct from HarbourMesh-generated data.
- Avoid unauthorized redistribution or derived navigational products.

Canadian Hydrographic Service rules matter. CHS digital products are licensed to end users, and the EULA restricts extracting, adapting, publishing, redistributing, or deriving products for distribution, navigation, commercial use, or navigational services without a separate CHS licence.

Implementation direction:

- Support user-provided CHS chart packs only where licence terms allow local use.
- Store official chart files separately from community data.
- Never upload official chart data into the community mesh.
- Never generate shared tiles from CHS data unless a separate CHS licence authorizes it.
- Track chart edition, update date, source, licence scope, and local-only status.
- Display a clear source badge for official chart layers.

Useful official sources:

- CHS nautical charts: https://charts.gc.ca/charts-cartes/index-eng.html
- CHS digital products EULA: https://www.charts.gc.ca/copyright-droitdauteur/eula-aluf-eng.html
- CHS NONNA data portal: https://www.chs.gc.ca/data-gestion/nonna/index-eng.html

### HarbourMesh NB Reference Layer

Purpose:

- Build a community and reference layer for NB coastlines, harbours, rivers, lakes, ramps, hazards, tracks, depth observations, and local conditions.
- Treat it as non-official data with provenance and confidence.

Likely source families:

- GeoNB hydrography, shoreline, administrative, elevation, and LiDAR layers.
- CHS NONNA non-navigational bathymetry where useful.
- User sonar soundings from HarbourMesh vessel nodes.
- User hazards, route notes, anchorages, ramp reports, and conditions.
- Weather and marine forecasts from ECCC/MSC and NOAA where appropriate.

Implementation direction:

- Use GeoNB and open Canadian data for base reference layers.
- Keep community bathymetry separate from official chart layers.
- Store raw soundings before producing gridded products.
- Attach vessel sensor metadata, transducer offset, GNSS accuracy, timestamp, tide/water-level correction state, and quality flags.
- Publish only aggregated or intentionally shared datasets.

Useful sources:

- GeoNB: https://www.snb.ca/GeoNB/
- IHO crowdsourced bathymetry: https://iho.int/en/crowdsourced-bathymetry
- IHO DCDB at NOAA NCEI: https://www.ncei.noaa.gov/iho-data-centre-digital-bathymetry
- ECCC/MSC open data: https://eccc-msc.github.io/open-data/

## Target Architecture

### App Layer

- React/Vite or future PWA shell.
- Map/chart view with offline-capable layers.
- Vessel dashboard.
- Route, waypoint, and trip tools.
- Consent and privacy controls.
- Community observations and hazard review.
- Data-source badges and freshness indicators.

### Chart/Data Layer

- MapLibre GL or OpenLayers as the map engine.
- MBTiles, PMTiles, or local tile store for offline basemaps.
- MVT/vector tile support for community overlays.
- Raster support where legal/licensed data requires it.
- PostGIS-backed cloud indexes for shared data.
- Local-first cache for NB pilot areas.

### Boat Node Layer

- Signal K as the first-class marine data bus.
- NMEA 0183 through Signal K serial inputs.
- NMEA 2000 through Signal K/canboatjs-supported adapters.
- AIS through Signal K or receiver feed.
- Sonar/depth through Signal K depth paths first, raw vendor formats later where possible.
- Radar integration later, starting with metadata/events rather than raw radar video.

Signal K is the practical first bridge because it is a data standard, local hub, and plugin ecosystem for collecting and sharing boat data over NMEA, WiFi, mobile devices, and cloud services.

Source:

- Signal K: https://signalk.org/

### Cloud Mesh Layer

- API for device registration, sync, and community contribution.
- Postgres/PostGIS for spatial records.
- Object storage for raw files, uploads, chart packages, exports, and audit bundles.
- Queue workers for sounding cleanup, gridding, moderation, and exports.
- Access model for personal, vessel, fleet, beta-region, public, and research datasets.
- Moderation flow for hazards and shared local knowledge.

### Bathymetry Pipeline

Raw capture:

- vessel id
- device id
- timestamp
- latitude/longitude
- GNSS accuracy if available
- depth below transducer
- transducer offset
- water temperature if available
- source path and protocol
- raw sentence/message where legally and technically safe

Processing:

- normalize units and datum metadata
- reject impossible values
- remove duplicated points
- identify speed/turning noise
- apply tide/water-level correction when source data is available
- generate confidence score
- preserve raw data for audit
- produce gridded/community tiles only after QA

Output:

- private trip soundings
- vessel/fleet shared soundings
- NB beta aggregate layer
- public generalized layer
- optional IHO DCDB/Trusted Node compatible export path

## Completion Phases

### Phase 0: Stabilize Source And Truth

Goal: make the current checkout coherent enough to build on.

Tasks:

- Fix syntax and lint blockers.
- Add or remove CI scripts so workflows match reality.
- Fix production dependency advisories.
- Mark stale docs as aspirational or replace them with current-state docs.
- Recreate missing audit/roadmap artifacts if they are not recoverable.
- Add a no-simulation gate for future launch claims.
- Add tests for NMEA parsing, security helpers, and data consent state.

Exit criteria:

- Lint passes.
- Test suite passes.
- Dependency audit is clean or documented with accepted risk.
- CI references only scripts that exist.
- Docs no longer claim backend/chart/security/AI systems are production-ready.

### Phase 1: NB Pilot App Foundation

Goal: a stable local-first app that can hold real NB pilot workflows.

Tasks:

- Create a real NB pilot mode.
- Add local vessel profile persistence.
- Add route and waypoint persistence.
- Add consent model with local-only, anonymized community, and fleet/team sharing.
- Add data source badges.
- Add simulated-data banners where demo data remains.
- Add import/export for user-owned local data.

Exit criteria:

- A user can create a vessel, add waypoints/routes, save settings, and restart without losing local state.
- The app clearly distinguishes simulated and real data.
- Privacy settings are enforceable in code, not only UI.

### Phase 2: Chart Foundation

Goal: a real chart/map foundation for NB coastal and inland pilot areas.

Tasks:

- Choose map engine: MapLibre GL for vector-tile-first work, or OpenLayers for broader raster/projection support.
- Implement NB base map from legal open sources.
- Add GeoNB layer ingestion spike.
- Add local tile/cache storage.
- Add official chart import boundary for user-provided/licensed CHS products.
- Add layer source badges and stale-data warnings.
- Add waypoints, routes, bearings, distances, and simple measuring tools.

Exit criteria:

- NB pilot area renders from real geospatial layers.
- User-created routes and waypoints render on the map.
- Official chart data is isolated and never uploaded.
- Community/reference layers are separate from official layers.

### Phase 3: Boat Node And Hardware Ingest

Goal: bring real boat data into HarbourMesh without binding the app directly to every hardware protocol.

Tasks:

- Build a Signal K client.
- Read GPS, heading, speed, wind, depth, AIS, battery, and tank paths.
- Record sample Signal K streams for tests.
- Add replay mode for hardware-free development.
- Add source health and stale-sensor indicators.
- Validate NMEA 0183 longitude parsing, date parsing, and checksum handling.
- Defer direct NMEA 2000 work until Signal K/canboatjs path is proven.

Exit criteria:

- HarbourMesh can consume a recorded Signal K stream.
- HarbourMesh can consume a live Signal K server in a controlled test.
- Depth, position, heading, speed, and AIS can be displayed with freshness indicators.

### Phase 4: Community Mesh Backend

Goal: turn local data into opt-in shared NB intelligence.

Tasks:

- Add backend API.
- Add auth and device registration.
- Add per-dataset consent.
- Extend runtime PostGIS persistence to raw track products, source metadata/versioning, and aggregate vector-tile jobs.
- Add upload queue for offline-first sync.
- Add public/private/fleet visibility rules.
- Add operator identity, audit history, and review states for hazards and community map labels.
- Add geohash/grid aggregation so raw tracks are not exposed by default.

Exit criteria:

- A beta user can share selected data.
- Another beta user can receive aggregated shared data.
- Private vessel tracks are not exposed unless explicitly shared.
- Every shared point has provenance and confidence metadata.

### Phase 5: Sonar And Bathymetry

Goal: turn depth readings into useful community bathymetry without pretending it is official.

Tasks:

- Store raw soundings.
- Normalize depth source metadata.
- Add transducer offset handling.
- Add water-level/tide correction model where source data exists.
- Reject outliers and low-quality points.
- Generate private vessel depth trails.
- Generate beta-region aggregate grid.
- Create review tools for bad data and disputed hazards.
- Design IHO DCDB-compatible export path.

Exit criteria:

- NB beta can collect soundings.
- The system can create a confidence-scored community depth overlay.
- The overlay is source-labeled and legally distinct from official charts.

### Phase 6: Weather And Routing

Goal: add useful route context before advanced optimization.

Tasks:

- Add ECCC/MSC marine forecast ingestion.
- Add NOAA GRIB/forecast source spike for comparison.
- Add wind, wave, current, precipitation, visibility, and pressure overlays where data is available.
- Add route weather summary.
- Add departure-window scoring.
- Add isochrone/weather routing only after base overlays are stable.

Exit criteria:

- A route can display weather along the path.
- Data source and update time are visible.
- The app avoids claiming optimized routing until the routing engine is real.

### Phase 7: International Expansion

Goal: make HarbourMesh portable without violating chart/data licensing by region.

Tasks:

- Create a country/region data-source matrix.
- Separate official chart adapters by jurisdiction.
- Add source-specific licence handling.
- Add local language/unit conventions.
- Add regional weather providers.
- Add import/export adapters for common open formats.

Exit criteria:

- New regions can be added without changing core data governance.
- Official data cannot leak into public community layers by accident.

### Phase 8: Production Launch

Goal: launch NB beta, then public NB, then international open beta.

Tasks:

- Add Cloudflare deployment config.
- Add CI that runs lint, tests, type checks, and safe build.
- Add Playwright route and mobile checks.
- Add backup/restore plan.
- Add observability and error reporting.
- Add incident response flow.
- Add security review.
- Add privacy/export/delete workflow.
- Add beta feedback and data correction workflow.

Exit criteria:

- NB beta users can install/use the app.
- Pilot data can be safely collected, synced, reviewed, and rolled back.
- The system has documented operational ownership.

## First Implementation Sprint

Sprint goal: make the existing checkout truthful and buildable enough for chart work.

Tasks:

1. Fix `App.tsx` formatting and parse/lint visibility.
2. Fix `BoatMap.tsx` import parse error.
3. Add missing package scripts referenced by CI or update workflows to stop calling imaginary scripts.
4. Fix production dependency advisories.
5. Add the first NMEA parser regression tests for longitude and date handling.
6. Keep extending security tests around production auth, secret storage, session expiry, and API authorization.
7. Mark docs that describe unimplemented production systems as aspirational.

Do not begin real chart implementation until Phase 0 exits cleanly.

## Launch Definition

NB beta launch means:

- Real NB map/reference layers are visible.
- At least one real Signal K data stream has been ingested.
- Users can keep data local or opt into sharing.
- Shared data has provenance, consent, and confidence metadata.
- Official chart data is handled through a legal path.
- Community bathymetry is clearly marked as non-official/reference.
- The app passes lint, tests, type checks, browser smoke checks, and mobile layout checks.

Public launch means:

- NB beta data flow has been exercised by multiple users.
- Backend sync is stable.
- Privacy/export/delete flows work.
- Production monitoring and backups exist.
- Security review blockers are closed.
- Docs match the product that actually ships.

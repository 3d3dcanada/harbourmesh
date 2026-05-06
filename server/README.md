# HarbourMesh Server

Fastify API for NB pilot community data sync.

## Commands

```bash
npm ci
npm run dev
npm run charts:nb:artifacts -- ./data/chart-artifacts/nb-pilot
npm test
npm run type-check
npm run build
```

Default API:

- `GET /health`
- `POST /api/community/soundings`
- `GET /api/community/soundings/summary`
- `POST /api/community/observations`
- `GET /api/community/observations/summary`
- `POST /api/community/hazards`
- `GET /api/community/hazards/summary`
- `GET /api/community/hazards/review`
- `GET /api/community/hazards/reviews`
- `POST /api/community/hazards/:hazardId/review`
- `GET /api/community/overlay.geojson`
- `GET /api/community/aggregates.geojson`
- `GET /api/community/releases/aggregates/latest`
- `GET /api/community/releases/aggregates/latest/cells.geojson`
- `GET /api/community/releases/aggregates/latest/artifacts`
- `GET /api/community/releases/aggregates/latest/artifacts/:format`
- `GET /api/community/releases/aggregates`
- `POST /api/community/releases/aggregates`
- `GET /api/charts/nb/catalog`
- `GET /api/charts/nb/packages`
- `GET /api/charts/nb/package-artifacts`
- `GET /api/charts/nb/package-artifacts/:packageId/:format`
- `POST /api/devices/register`
- `GET /api/devices`
- `GET /api/devices/:deviceId`

Data is appended as JSONL under `./data` by default. Set `HARBOURMESH_DATA_DIR` to move it. Set `HARBOURMESH_DATABASE_URL` to use the PostGIS runtime repositories for devices, soundings, governed observations, hazards, hazard reviews, aggregate release manifests, and aggregate cells instead of JSONL. Set `HARBOURMESH_RUN_MIGRATIONS=true` only when the process should apply `db/migrations/0001_nb_pilot_community_mesh.sql` at startup.

## Container

```bash
docker build -t harbourmesh-api ./server
docker run --rm -p 3001:3001 \
  -e HARBOURMESH_WRITE_API_KEYS=change-me \
  -e HARBOURMESH_REVIEW_API_KEYS=change-me-too \
  harbourmesh-api
```

The container runs `node dist/index.js` as the non-root `node` user, stores pilot JSONL data under `/data`, and exposes `/health` for container health checks.

For PostGIS-backed runtime storage, run the container with `HARBOURMESH_DATABASE_URL=postgres://...` and set `HARBOURMESH_RUN_MIGRATIONS=true` only for a controlled migration pass.

NB reference chart package artifacts can be written to disk with `npm run charts:nb:artifacts -- <output-dir>`. The writer creates compact GeoJSON files, starter MBTiles vector-tile archives, PMTiles v3 MVT archives, and `manifest.json`; generated files are reference-only and exclude official CHS chart data. The API manifest at `GET /api/charts/nb/package-artifacts` includes deterministic download paths, and `GET /api/charts/nb/package-artifacts/:packageId/:format` serves `geojson`, `mbtiles`, or `pmtiles` artifact bytes with checksum and reference-only headers.

Set `HARBOURMESH_FETCH_GEONB_FEATURES=true` during CLI or API artifact generation to query eligible GeoNB ArcGIS MapServer layers into the generated GeoJSON, MBTiles, and PMTiles files. Use `HARBOURMESH_GEONB_MAX_FEATURES_PER_SOURCE=<number>` to cap each source during pilot runs.

Set `HARBOURMESH_ARTIFACT_SIGNING_KEY` to add HMAC-SHA256 signature headers to chart package and community aggregate artifact downloads. Use `HARBOURMESH_ARTIFACT_SIGNING_KEY_ID` to publish a stable key identifier for clients that verify artifact downloads.

The production persistence target starts in `db/migrations/0001_nb_pilot_community_mesh.sql`. With `HARBOURMESH_DATABASE_URL`, the current server writes devices, soundings, observations, hazards, reviews, aggregate release manifests, and aggregate cells to PostGIS. JSONL remains the no-database local fallback. `GET /api/community/releases/aggregates/latest` auto-publishes the first aggregate release when no release exists; review-scoped `POST /api/community/releases/aggregates` publishes a new release from the current governed community records. `GET /api/community/releases/aggregates/latest/artifacts` builds a reference-only artifact manifest for the latest release with GeoJSON plus MBTiles/PMTiles vector-tile products when aggregate cells exist. `GET /api/community/releases/aggregates/latest/artifacts/:format` downloads the latest release artifact bytes for `geojson`, `mbtiles`, or `pmtiles` with checksum and privacy headers.

Set `HARBOURMESH_API_KEYS` to a comma-separated list of legacy pilot API keys before exposing the server. Legacy keys can access every protected endpoint. For scoped keys, use `HARBOURMESH_WRITE_API_KEYS` for intake/device writes and `HARBOURMESH_REVIEW_API_KEYS` for hazard review operations. For deployments that should not store plaintext keys, use `HARBOURMESH_API_KEY_SHA256S`, `HARBOURMESH_WRITE_API_KEY_SHA256S`, and `HARBOURMESH_REVIEW_API_KEY_SHA256S` with comma-separated SHA-256 hex digests of the client keys. For auditable moderator identity, use `HARBOURMESH_REVIEW_OPERATOR_KEYS` with comma-separated `operator-id:key` entries, or `HARBOURMESH_REVIEW_OPERATOR_KEY_SHA256S` with `operator-id:sha256` entries; matching review keys override client-supplied `reviewedBy` values before writing review history. Protected endpoints accept either `X-HarbourMesh-API-Key: <key>` or `Authorization: Bearer <key>`.

Protected endpoints:

- `POST /api/community/soundings`
- `POST /api/community/observations`
- `POST /api/community/hazards`
- `POST /api/devices/register`
- `GET /api/devices`
- `GET /api/devices/:deviceId`

Review-scoped endpoints:

- `GET /api/community/hazards/review`
- `GET /api/community/hazards/reviews`
- `POST /api/community/hazards/:hazardId/review`
- `POST /api/community/releases/aggregates`

When `NODE_ENV=production`, pilot API auth is required and the protected endpoints fail closed with `503 api_auth_not_configured` if no key is configured.

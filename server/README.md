# HarbourMesh Server

Fastify API for NB pilot community data sync.

## Commands

```bash
npm ci
npm run dev
npm test
npm run type-check
npm run build
```

Default API:

- `GET /health`
- `POST /api/community/soundings`
- `GET /api/community/soundings/summary`
- `POST /api/community/hazards`
- `GET /api/community/hazards/summary`
- `GET /api/community/hazards/review`
- `POST /api/community/hazards/:hazardId/review`
- `GET /api/community/overlay.geojson`
- `GET /api/charts/nb/catalog`
- `POST /api/devices/register`
- `GET /api/devices`
- `GET /api/devices/:deviceId`

Data is appended as JSONL under `./data` by default. Set `HARBOURMESH_DATA_DIR` to move it.

Set `HARBOURMESH_API_KEYS` to a comma-separated list of pilot API keys before exposing the server. Protected endpoints accept either `X-HarbourMesh-API-Key: <key>` or `Authorization: Bearer <key>`.

Protected endpoints:

- `POST /api/community/soundings`
- `POST /api/community/hazards`
- `GET /api/community/hazards/review`
- `POST /api/community/hazards/:hazardId/review`
- `POST /api/devices/register`
- `GET /api/devices`
- `GET /api/devices/:deviceId`

When `NODE_ENV=production`, pilot API auth is required and the protected endpoints fail closed with `503 api_auth_not_configured` if no key is configured.

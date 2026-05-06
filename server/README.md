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

Data is appended as JSONL under `./data` by default. Set `HARBOURMESH_DATA_DIR` to move it.

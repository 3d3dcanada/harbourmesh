# HarbourMesh Completion Status And Launch Readiness

Date: 2026-05-06
Checkout: `/home/wess/3d3d-platform/_deploy-review/harbourmesh`
Scope: current readiness snapshot plus handoff notes for the HarbourMesh finish work

## Read This First

This document summarizes the current NB pilot state after the account-session web slice and additive account-ownership metadata slice. The original parallel docs pass was documentation-only; the implementation thread then reran current app/server checks plus targeted account and ownership smokes.

Account/session implementation now completed in these slices:

- `app/src/lib/local-data-portability.ts`
- `app/src/lib/local-data-portability.test.ts`
- `app/src/lib/account-session.ts`
- `app/src/lib/account-session.test.ts`
- `app/src/sections/Settings.tsx`
- `server/src/account-ownership.ts`
- community intake/review/release repositories and PostGIS migration ownership columns

Do not revert those files; they are the current account-session, ownership, and export-secret handling work.

## Current Truth Source

Use `docs/HARBOURMESH_NB_LAUNCH_PLAN_2026_05_06.md` as the current source-of-truth launch plan. It is more current than the February audit files and names both the implemented pilot surface and the remaining launch gaps.

Treat these older files as historical or aspirational unless revalidated against the source:

- `docs/ARCHITECTURE_AUDIT.md`: February baseline; still says testing/backend/database are not implemented even though this checkout now contains Vitest coverage and a Fastify server.
- `docs/SECURITY_AUDIT.md`: February baseline; makes stronger security-readiness claims than the current launch plan supports.
- `docs/DEPLOYMENT_GUIDE.md`: includes release-package/install flows that are not proven in this checkout.
- `docs/DZIP_FORMAT.md`: useful packaging specification, not proof that DZIP release packaging currently ships.

## Completion Status

HarbourMesh is no longer just a frontend shell. It is now a substantial NB pilot foundation with:

- React/Vite app with Navigation, Community, Settings, vessel/workflow sections, local persistence, local data export/import, demo-source notices, telemetry health, GPX route import/export, NB pilot mapping, local chart metadata, browser account session controls, and community review surfaces.
- Fastify API with health, account auth, operator sessions, device registration, NB chart catalog/package artifact endpoints, community sounding/observation/hazard intake, hazard and sounding review, privacy-scrubbed overlays, aggregate release publishing, aggregate cells, and artifact downloads.
- JSONL fallback persistence plus PostGIS runtime repositories behind `HARBOURMESH_DATABASE_URL`.
- Reference-only NB GeoJSON/MBTiles/PMTiles chart artifacts and community aggregate/hazard artifacts with checksums, optional HMAC download signatures, and explicit official-chart exclusion.
- API-key and review-key gates, hash-backed key configuration, invite-gated account registration/login on the server and web Settings tab, short-lived review sessions, optional account ownership context for community records, and local secret-store exclusions from export bundles.
- CI workflows for app lint/type/test/build, server test/type/build, Docker image build, dependency audit, release readiness, and manual Cloudflare Pages deployment.

Fresh verification recorded in these slices: full app tests passed 166 tests, app type-check passed, app lint passed, app build passed, app audit found 0 vulnerabilities, full server tests passed 49 tests, server type-check/build passed, server audit found 0 vulnerabilities, Settings account browser smoke passed, and local API ownership smoke proved private owner metadata plus public no-leak behavior.

## Launch Readiness

Current readiness: **NB pilot foundation nearing beta-readiness, not public-launch-ready.**

| Area | Status | Notes |
|---|---|---|
| Source buildability | Strong pilot baseline | Current app/server lint, tests, type-checks, builds, and high-severity audits passed for the account and ownership slices. |
| NB reference chart artifacts | Pilot-ready for reference use | GeoJSON, starter MBTiles, and starter PMTiles artifacts exist and are documented as official-chart-free. Full uncapped hydrography products remain unfinished. |
| Community mesh backend | Strong pilot foundation | Soundings, observations, hazards, reviews, aggregate releases, PostGIS, privacy-scrubbed artifacts, and approval gates exist. Multi-user beta flow still needs proof. |
| Account/auth | Pilot UI, backend, and ownership metadata exist | Server auth, Settings account session UI, and private account ownership metadata exist; fleet/team authorization and per-account/fleet access policies remain launch blockers. |
| Fleet/team authorization | Not ready | Fleet/team identity, authorization, sharing rules, and access policies are still missing. |
| Hardware ingest | Not launch-ready | Recorded Signal K path exists; no real Signal K server, sonar, radar, AIS receiver, or Boat Node hardware test is recorded. |
| Official charts | Not launch-ready | Local-only official chart metadata boundaries exist, but no official-chart rendering/parser path or licensed redistribution path is complete. |
| Weather routing | Not implemented | Weather overlays, route weather summaries, departure scoring, and routing engine remain future phases. |
| Browser/mobile verification | Partial | Targeted smoke checks are recorded, including the latest Settings account flow; no full route-by-route browser/mobile pass has been run. |
| Deployment | Partial | Cloudflare Pages config, manual workflow, server Dockerfile, and smoke evidence exist. No live Cloudflare deployment, registry push, production PostGIS, backups, monitoring, or incident flow is recorded. |

## Remaining Phases

| Phase | Current status | Next exit gate |
|---|---|---|
| Phase 0: Stabilize Source And Truth | Mostly complete, with doc cleanup still needed | Fresh app/server lint, tests, type checks, audits, builds, and docs aligned with source. |
| Phase 1: NB Pilot App Foundation | Mostly complete | Verify local persistence/export/import in broader browser flows and complete per-account/fleet access policy work. |
| Phase 2: Chart Foundation | Partial | Prove the chosen map stack can support offline packages beyond starter artifacts; keep official CHS data isolated. |
| Phase 3: Boat Node And Hardware Ingest | Partial | Run controlled live Signal K and real sensor tests for position, depth, AIS, and freshness indicators. |
| Phase 4: Community Mesh Backend | Strong partial | Prove two beta users/devices can share and receive aggregate data without exposing raw vessel tracks or official chart data. |
| Phase 5: Sonar And Bathymetry | Partial | Add confidence-scored community depth overlay pipeline with tide/water-level correction strategy and stronger review tooling. |
| Phase 6: Weather And Routing | Not started | Add ECCC/MSC or NOAA forecast ingestion, source/update labels, route weather summary, then later routing. |
| Phase 7: International Expansion | Not started | Build a region/source licence matrix after NB beta is safe. |
| Phase 8: Production Launch | Partial infrastructure only | Complete deployment, monitoring, backup/restore, privacy/export/delete, security review, incident response, and live beta operating proof. |

## Next Work Order

1. Preserve the account-session work in `app/src/lib/*account-session*`, `app/src/lib/*local-data-portability*`, and `app/src/sections/Settings.tsx`.
2. Add per-account/fleet access policies on top of the new ownership metadata without breaking the existing pilot API key path.
3. Rerun app/server verification after each implementation slice: app lint, app type-check, app tests, app build, app audit, server tests, server type-check, server build, server audit.
4. Run targeted browser checks for Settings export/import, Community moderation/release flow, Navigation chart package downloads, and 360px mobile containment.
5. Do not call NB beta ready until at least one live Signal K path and a two-user/device community sharing flow are exercised.
6. Do not call public launch ready until production deployment, monitoring, backups, security review, privacy/delete/export, official-chart legal handling, and real-vessel verification are complete.

## Final Launch Gate

HarbourMesh can be called NB beta ready only when the final implementation thread has fresh proof for:

- App and server checks passing from the current source tree.
- No active unreviewed implementation edits left in account/session/ownership/export/security/community flows.
- Browser smoke at desktop and 360px mobile for Navigation, Community, Settings, account flow, and moderation/release approval.
- Live Signal K or real vessel telemetry ingestion with GPS/depth/AIS freshness indicators.
- Two distinct users or devices contributing and receiving privacy-scrubbed aggregate community data.
- Production-like API config with scoped keys, review identity, signed artifacts where required, PostGIS migrations, and fail-closed behavior.
- Docs updated so they describe the product that actually ships.

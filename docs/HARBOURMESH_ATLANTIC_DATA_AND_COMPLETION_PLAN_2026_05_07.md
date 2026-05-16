# HarbourMesh Atlantic Data And Completion Plan

Date: 2026-05-07
Scope: New Brunswick first, then Nova Scotia and Prince Edward Island, with international architecture kept clean.
Working checkout: `/home/wess/3d3d-platform/_deploy-review/harbourmesh`

## Plain Status

HarbourMesh is a serious pilot foundation, but it is not yet a product I would put on a boat and trust for every workflow. The fastest path to something testable on a real vessel is not another prototype pass. It is a hard completion push around real data, real Signal K/NMEA ingress, full-screen navigation, explicit test harnesses, and a UI that turns every tab into an operating surface rather than a demo panel.

Current local work from this round:

- Atlantic data downloader added at `scripts/download-atlantic-open-data.mjs`.
- Atlantic data output target: `output/atlantic-open-data-2026-05-07`.
- Reference repos cloned under `tmp/reference-repos`.
- Navigation workspace sizing changed so the chart view uses the available application area instead of a small fixed panel.
- App type-check passed after the navigation workspace change.

## Non-Negotiable Product Boundary

Official CHS navigation products are not the same thing as open/reference/community data.

- CHS official RNC/ENC products can be supported only through a local user-provided/licensed chart path unless HarbourMesh gets a separate CHS licence.
- CHS official products must not be converted into shared HarbourMesh tiles, redistributed, or blended into community chart products.
- CHS sample Chart 9995 files are useful for parser/display tests only because they are fictitious training/sample products and not for navigation.
- CHS NONNA is useful for non-navigational bathymetry/reference layers. It is not an official navigation chart replacement.
- GeoNB, GeoNOVA/NSHN, PEI ArcGIS open services, OSM/Geofabrik, ECCC, and CHS tides/water-level APIs are valid foundation inputs when attribution/licence metadata is preserved.

## Data Sources Pulled Or Prepared

### New Brunswick

Primary baseline: GeoNB New Brunswick Hydrographic Network.

Endpoint: `https://geonb.snb.ca/arcgis/rest/services/GeoNB_DNR_NBHN/MapServer`

Useful layers now covered by the downloader:

- Named features: points, lines, polygons.
- Obstacles: points, lines, polygons.
- Man-made hydrographic features: points, lines, polygons.
- Water gauges.
- Water courses.
- Wetlands.
- Islands.
- Coastline.
- Coastal features.
- Water bodies.
- Watersheds.

Role in HarbourMesh:

- Baseline NB reference chart layer.
- Coast/inland waterway vector packages.
- Source-labeled non-official overlays.
- Community sounding/hazard aggregation grid boundaries.
- Starting point for route/ramp/local-knowledge enrichment.

### Nova Scotia

Primary baseline: Nova Scotia Hydrographic Network.

Open-data catalogue ID: `dk27-q8k2`

Useful endpoints:

- Socrata metadata: `https://data.novascotia.ca/api/views/dk27-q8k2`
- SHP download: `https://nsgi.novascotia.ca/WSF_DDS/DDS.svc/DownloadFile?tkey=fhrTtdnDvfytwLz6&id=38906`
- Map service: `https://nsgiwa.novascotia.ca/arcgis/rest/services/WTR/WTR_NSHN_UT83/MapServer`

Useful layers now covered by the downloader:

- Hydrography lines and polygons.
- Junction points and hydrography points.
- Flow direction.
- Delimiters and spines.
- Dry/wet feature lines.
- Toponymic objects.
- Rapids and wet polygons.

Role in HarbourMesh:

- Phase 2 Atlantic expansion after NB package generator is made region-generic.
- Shared hydrology schema validation against NBHN.
- Atlantic region map packs for beta users outside NB.

### Prince Edward Island

Primary baseline: PEI ArcGIS open services.

Useful endpoints now covered by the downloader:

- `PEI_Watercourse/FeatureServer`
- `Coastline/FeatureServer`
- `Wetlands_2023_10_16/FeatureServer`
- `Water_Names/FeatureServer`
- `WaterAccess/FeatureServer`
- `Buoys_march_2025/FeatureServer`
- `Leases_march_2025/FeatureServer`
- `License_march_2025/FeatureServer`
- `Fishing_Public/FeatureServer`
- `Stream_Flow_Site_Background/FeatureServer`
- `PondBoundaries/FeatureServer`

Role in HarbourMesh:

- Small-region proving ground for full data download/import because PEI is compact.
- Good beta test area for coastline, water access, buoys, fisheries, lease/conflict overlays, and community reporting.

### Federal And Shared Sources

CHS NONNA:

- Open Canada package: `d3881c4c-650d-4070-bf9b-1e00aabf0a1d`
- WMS: `https://nonna-geoserver.data.chs-shc.ca/geoserver/wms?request=GetCapabilities&service=WMS&version=1.3.0`
- WCS: `https://nonna-geoserver.data.chs-shc.ca/geoserver/wcs?request=GetCapabilities&service=WCS&version=2.0.1`
- Use: non-navigational bathymetry/reference only.

CHS tides, currents, and water levels:

- Atlantic stations endpoint used by downloader: `https://api-sine.dfo-mpo.gc.ca/api/v1/stations?chs-region-code=ATL&lang=en`
- Use: tide/water-level correction candidates, station selection, freshness/QC labeling.

ECCC/MSC GeoMet:

- Collections endpoint used by downloader: `https://api.weather.gc.ca/collections?f=json&limit=1000`
- Important collections: `marineweather-realtime`, `marine-standard-forecast-zones`, `swob-marine-stations`, `weather-alerts`, HRDPS/RDPS/GDPS families.
- Use: marine weather overlays, route weather summary, warning panels, future routing.

OpenStreetMap via Geofabrik:

- NB PBF: `https://download.geofabrik.de/north-america/canada/new-brunswick-latest.osm.pbf`
- NS PBF: `https://download.geofabrik.de/north-america/canada/nova-scotia-latest.osm.pbf`
- PEI PBF: `https://download.geofabrik.de/north-america/canada/prince-edward-island-latest.osm.pbf`
- Use: marinas, ramps, roads, amenities, POIs, place labels, offline geocoding/reference enrichment.

Natural Resources Canada hydrographic networks:

- Use as national fallback/schema reference, especially Canadian Hydrospatial Network and legacy NHN work units.
- Do not make this the first Atlantic implementation if provincial sources are fresher and closer to source.

## Reference Code Pulled Locally

Local path: `tmp/reference-repos`

| Repo | Local folder | Licence | Why it matters |
|---|---|---|---|
| `SignalK/signalk-server` | `SignalK_signalk-server` | Apache-2.0 | First-class boat data hub. HarbourMesh should connect to this instead of direct vendor chaos first. |
| `SignalK/freeboard-sk` | `SignalK_freeboard-sk` | Apache-2.0 | Real Signal K chartplotter UI: OpenLayers, routes, AIS, weather, chart resources, anchor alarms. |
| `SignalK/instrumentpanel` | `SignalK_instrumentpanel` | Apache-2.0 | KIP-style draggable/resizable marine instrument dashboards. |
| `SignalK/SensESP` | `SignalK_SensESP` | Apache-2.0 | ESP32 sensor framework for building HarbourMesh Boat Node devices. |
| `canboat/canboatjs` | `canboat_canboatjs` | Apache-2.0 | TypeScript NMEA 2000 parsing/encoding path. |
| `canboat/canboat` | `canboat_canboat` | other | NMEA 2000 discovery/decoder reference; review licence before copying. |
| `wellenvogel/avnav` | `wellenvogel_avnav` | MIT | Raspberry Pi nav computer architecture, browser chart UI, routes, AIS, offline operations. |
| `OpenCPN/OpenCPN` | `OpenCPN_OpenCPN` | GPL-2.0 | Deep chartplotter/nav reference only; do not copy into AGPL app without legal review. |
| `AK-Homberger/NMEA2000-SignalK-Gateway` | `AK-Homberger_NMEA2000-SignalK-Gateway` | GPL-3.0 | ESP32 N2K to Signal K gateway wiring and parts reference. |
| `dirkwa/sensesp-n2k-gateway` | `dirkwa_sensesp-n2k-gateway` | Apache-2.0 | 2026 small gateway project for SensESP/canboatjs candump-over-TCP. |
| `batuakan/ESPHomeSignalK` | `batuakan_ESPHomeSignalK` | MIT | ESPHome Signal K websocket component. |
| `SignalK/nmea0183-signalk` | `SignalK_nmea0183-signalk` | other | NMEA 0183 to Signal K parser reference. |
| `SignalK/maptracker` | `SignalK_maptracker` | Apache-2.0 | Small Signal K map tracking web app reference. |

## Competitor/Market Lessons To Build Into UI

The winning pattern is not "dashboard with a map card." It is a full-screen operating console.

- Orca: full navigation app, optional hardware core, NMEA 2000, AIS/autopilot/radar/wind/sensor bridge, sync across devices, modern route planning.
- Wavve: depth-aware/tide-aware routing, offline charts, community pins, simple recreational UX.
- Argo: Google-Maps-like boating navigation, autorouting, weather/tides/currents, GPX import/export, community reports, real-time location sharing/groups.
- Aqua Map: chart subscriptions, route explorer, hazards/bridges/marinas/fuel/anchorages, ActiveCaptain/Waterway Guide style overlays.
- Garmin/Navionics: official-ish chart consumer expectations, sonar/live bathymetry, community edits, MFD/mobile sync, offline packs.
- OpenCPN/AvNav/Signal K: open stack strength is local control, extensibility, protocols, and no vendor lock-in.
- BoatTender/DockOps/SeaVesselManager: inventory/maintenance works when it has dense tables, custom fields, recurring schedules, visual storage locations, crew roles, and usable search.

HarbourMesh must combine these into one boat-first app:

- Navigation uses the whole workspace.
- Instrument panels are movable and readable in sun/night modes.
- Every map layer has source/freshness/licence badges.
- Inventory, lockers, stores, safety gear, spares, fasteners, food, documents, and maintenance are table-first with custom fields and visual location binding.
- The boat map becomes a real spatial experience: blueprint now, 3D/digital-twin later.

## Completion Phases With Testable Exit Gates

### Phase 1: Data Foundation

Goal: NB/NS/PEI open data is downloaded, checksummed, source-labeled, and importable.

Work:

- Finish downloader and manifest.
- Normalize ArcGIS/SHP/OSM/CHS/ECCC metadata into `server/src/atlantic-data-sources.ts`.
- Convert selected layers into PMTiles/MBTiles per province and package type.
- Add checksums, source policy, licence labels, and generation timestamps.
- Keep official CHS chart products out of shared generation.

Exit gate:

- `npm run charts:atlantic:artifacts -- nb ns pei` writes GeoJSON, MBTiles, PMTiles, manifest, checksums.
- Server endpoint lists NB/NS/PEI packages.
- Web Navigation can load package manifests and show source counts.

### Phase 2: Full-Screen Navigation

Goal: nav becomes the first real operating surface.

Work:

- Move from fixed Leaflet map card to full workspace map shell.
- Add layer drawer, route drawer, telemetry drawer, AIS drawer, source ledger, night/day chart modes.
- Add GPS recenter, vessel-up/north-up mode, breadcrumb/tracks, waypoint editing, GPX import/export, distance/bearing tools.
- Add offline package loading for PMTiles/MBTiles.

Exit gate:

- Browser test at 360, 768, 1280, and 1920 widths proves chart fills available area minus sidebar/header.
- Recorded Signal K replay shows GPS/depth/AIS/engine freshness on map.
- Route import/export round trip passes with screenshot evidence.

### Phase 3: Hardware Ingest

Goal: plug a boat network in and see real data.

Work:

- Treat Signal K server as the first supported boat bus.
- Add Signal K connection wizard: host discovery/manual URL/token, websocket health, path subscription list.
- Add replay harness using recorded deltas from Signal K demo and local captures.
- Add canboatjs path for NMEA 2000 tests through Signal K/candump.
- Add NMEA 0183 serial/tcp/udp ingestion through Signal K.
- Add AIS targets, depth/sonar, wind, engine, tanks, battery, GPS, heading, temperature, bilge, and alarms.

Exit gate:

- Local Signal K server test passes with simulated streams.
- Recorded replay test passes deterministically in CI.
- Real boat or bench test proves GPS, depth, AIS, and one engine/tank/battery channel.

### Phase 4: Community Charting And Soundings

Goal: users contribute useful data without exposing raw private tracks.

Work:

- Store raw local soundings with transducer offset, GNSS accuracy, timestamp, tide/water-level correction state, source device, and quality flags.
- Add tide/water-level correction candidate from CHS IWLS station proximity.
- Add raw-to-aggregate pipeline with confidence scoring, outlier rejection, review queue, and privacy grid.
- Add community overlay tiles separate from official/reference layers.

Exit gate:

- Two devices contribute soundings.
- Review operator approves aggregate release.
- Public overlay shows cells/depth confidence and omits account/device/raw track IDs.
- Data export/delete/privacy flows pass.

### Phase 5: Boat Map, Inventory, And Operations UI

Goal: every boat-management tab becomes useful in real life.

Work:

- Boat map supports decks, lockers, cabinets, bins, tanks, systems, wiring/plumbing zones, sensors, and safety-equipment locations.
- Add blueprint upload/calibration and basic 3D/2.5D walkthrough.
- Inventory tables support parts, tools, safety gear, spares, fasteners, consumables, food stores, documents, expiry, quantities, custom fields, supplier, barcode/QR, location, and reorder thresholds.
- Logs/tasks support recurring maintenance by calendar/engine hours and evidence photos/documents.

Exit gate:

- User can add a locker, put items in it, search/filter/export/import, attach maintenance tasks, and view the same items from table and boat map.
- Mobile and desktop screenshots prove no cramped cards or overlapping controls.

### Phase 6: Auth, Teams, Fleet, And Sync

Goal: local-first single-user pilot becomes a real multi-user product.

Work:

- Fleet/team roles and sharing policies.
- Device ownership and account policies beyond private contribution history.
- Offline sync queue with conflict resolution.
- API keys replaced or wrapped by proper account/device tokens.
- Backups, restore, export/delete, audit logs, monitoring.

Exit gate:

- Two users on one vessel can share inventory and contribute community data with correct permissions.
- One private vessel/fleet cannot read another.
- Account export/delete works and leaves community aggregates privacy-safe.

### Phase 7: Production Launch

Goal: NB beta, then Atlantic, then international.

Work:

- Cloudflare Pages/app deployment.
- Production API/container deployment.
- PostGIS with backups.
- Object storage for packages/artifacts.
- Monitoring/Sentry/logs.
- Security review.
- Privacy/liability docs.
- Funding/sponsorship outreach pack.

Exit gate:

- Fresh app/server tests, type checks, lint, build, audits.
- Browser route sweep.
- Live Signal K/bench-vessel proof.
- Two-user/device community proof.
- Production deployment smoke.
- Launch docs match the actual app.

## Funding And Sponsorship Targets

Best-fit programs/partners:

- NRC IRAP for R&D and commercialization work around sensor fusion, quality scoring, offline sync, and community bathymetry.
- ACOA for Atlantic productivity/innovation, regional pilot, and ocean-tech commercialization.
- Canada’s Ocean Supercluster for collaborative ocean data/sensor/AI projects.
- NB/NS/PEI innovation agencies and marine associations for beta vessels.
- Marinas, chandlers, insurance, training schools, fishery/aquaculture operators, and local boatyards as pilot sponsors.

Positioning:

- HarbourMesh is not "selling charts." It is building a local-first vessel operations and community hydrospatial data platform.
- The community data angle needs careful privacy/liability language.
- Official chart licensing remains a separate integration/sponsorship/legal track.

## Immediate Next Build Order

1. Finish Atlantic downloader run and inspect `manifest.json`.
2. Convert downloader output into a typed source registry and region package generator.
3. Replace NB-only chart package code with Atlantic region/package abstractions.
4. Wire Navigation source/package selection to NB/NS/PEI.
5. Add Signal K server test harness and a connection wizard.
6. Expand the boat map/inventory UI with real tables and visual storage zones.
7. Run route-by-route browser verification.
8. Run real or bench Signal K hardware proof.

## What Codex Should Keep

- Backend/API/data pipelines.
- Source/legal boundaries and manifests.
- Signal K/NMEA/canboatjs integration.
- PostGIS/storage/sync/auth/fleet/team logic.
- Tests, fixtures, CI, deployment, verification.
- PMTiles/MBTiles generation and community aggregate pipeline.

## What A UI-Specialist Agent Should Take

- Full-screen visual shell for every tab.
- Navigation map layout, drawers, layer controls, instrument panels.
- Boat map/blueprint/3D storage experience.
- Dense but usable inventory/maintenance/documents tables.
- Mobile containment and touch ergonomics.
- Sunlight/night visual modes.
- Polished empty/loading/error states without placeholder/demo feel.

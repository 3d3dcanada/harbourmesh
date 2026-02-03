# HarbourMesh Navigation Charts & Weather Routing Specification

**Version:** 1.0.0  
**Date:** 2026-02-03  
**Author:** 3D3D.CA Engineering Team  
**Classification:** Engineering Specification

---

## Executive Summary

This specification defines the requirements, architecture, and testing protocols for the Navigation Charts and Weather Routing modules of HarbourMesh. These features transform HarbourMesh from a vessel management platform into a comprehensive navigational tool comparable to iBoat, Navionics, and PredictWind.

**Key Deliverables:**
1. Offline-capable vector/raster chart rendering (MBTiles + OpenLayers)
2. GRIB2 weather data parsing and visualization
3. Isochrone routing with weather optimization
4. Real-time weather overlay on navigation charts
5. Route planning with weather constraints

---

## 1. Navigation Charts Module

### 1.1 Requirements

#### 1.1.1 Chart Sources
| Source | Type | Offline | Licensing |
|--------|------|---------|-----------|
| OpenStreetMap | Vector | Yes | ODbL |
| ChartBundle | Raster | Yes | Commercial |
| NOAA ENC | Vector | Yes | Public Domain |
| Navionics | Vector | No | Commercial API |

#### 1.1.2 Chart Features
- [ ] Zoom levels 1-18 (vector), 1-15 (raster)
- [ ] Depth contours and soundings
- [ ] Navigation aids (buoys, beacons, lights)
- [ ] Anchorage areas and marinas
- [ ] Obstructions and hazards
- [ ] Course planning overlay
- [ ] User waypoints and routes
- [ ] AIS target overlay
- [ ] Weather overlay (wind, waves, current)

#### 1.1.3 Performance Requirements
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Tile load time | < 500ms | Network tab, p95 |
| Render time | < 100ms | Performance API |
| Memory usage | < 200MB | Chrome memory panel |
| Offline cache | 500MB max | Storage API |

### 1.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chart Module Architecture                 │
├─────────────────────────────────────────────────────────────┤
│  ChartView (React Component)                                 │
│  ├── MapContainer (OpenLayers Wrapper)                      │
│  ├── LayerManager                                           │
│  │   ├── BaseLayer (OSM/ENC/ChartBundle)                   │
│  │   ├── OverlayLayer (Weather, AIS, Routes)               │
│  │   └── UserLayer (Waypoints, Tracks)                     │
│  ├── InteractionHandler                                     │
│  │   ├── Pan/Zoom Controls                                 │
│  │   ├── Measure Tool                                      │
│  │   ├── Route Planner                                     │
│  │   └── Chart Settings                                    │
│  └── InfoPanel                                              │
│       ├── Chart Info                                        │
│       ├── Object Details                                    │
│       └── Weather Summary                                   │
├─────────────────────────────────────────────────────────────┤
│  ChartEngine (Service Layer)                                │
│  ├── TileLoader (MBTiles/Online)                           │
│  ├── StyleManager (SLD/Mapbox GL)                          │
│  ├── CoordinateTransform (WGS84, Web Mercator)             │
│  └── CacheManager (IndexedDB)                              │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── MBTiles Database (SQLite)                             │
│  ├── Chart Metadata (JSON)                                 │
│  ├── User Data (Waypoints, Routes, Tracks)                 │
│  └── Tiles Cache (IndexedDB)                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Data Structures

```typescript
// Chart Types
interface ChartSource {
  id: string;
  name: string;
  type: 'vector' | 'raster';
  format: 'mbtiles' | 'xyz' | 'wmts';
  url?: string;
  localPath?: string;
  minZoom: number;
  maxZoom: number;
  bounds: GeoBounds;
  attribution: string;
  license: string;
}

interface ChartMetadata {
  sourceId: string;
  title: string;
  scale: number;
  projection: 'EPSG:4326' | 'EPSG:3857';
  bounds: GeoBounds;
  depthUnits: 'm' | 'ft' | 'fathoms';
  lastUpdated: Date;
  version: string;
}

interface Waypoint {
  id: string;
  name: string;
  position: GeoPosition;
  symbol?: string;
  color?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Route {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
  avoidLand: boolean;
  avoidShallow: boolean;
  minDepth?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteWaypoint {
  id: string;
  waypointId: string;
  position: GeoPosition;
  order: number;
  courseToSteer?: number;
  distanceToNext?: number;
  eta?: Date;
  fuelToNext?: number;
}

interface Track {
  id: string;
  name: string;
  color: string;
  points: TrackPoint[];
  startTime: Date;
  endTime?: Date;
}

interface TrackPoint {
  position: GeoPosition;
  timestamp: Date;
  speed: number;
  course: number;
  depth?: number;
  engineRpm?: number;
  fuelRate?: number;
}

// Chart Settings
interface ChartSettings {
  defaultSource: string;
  showDepthContours: boolean;
  showSoundings: boolean;
  showNavAids: boolean;
  showLandFill: boolean;
  showGrid: boolean;
  gridInterval: number;
  depthUnit: 'm' | 'ft' | 'fathoms';
  safetyDepth: number;
  shallowDepth: number;
  nightMode: boolean;
  colors: ChartColorScheme;
}

interface ChartColorScheme {
  land: string;
  water: string;
  shallow: string;
  safetyDepth: string;
  deepWater: string;
  navAid: string;
  route: string;
  track: string;
  waypoint: string;
}
```

---

## 2. Weather Routing Module

### 2.1 Requirements

#### 2.1.1 Weather Data Sources
| Source | Format | Resolution | Update Frequency | Offline |
|--------|--------|------------|------------------|---------|
| NOAA GFS | GRIB2 | 0.25° / 6hr | 6hr | Yes (cached) |
| ECMWF | GRIB2 | 0.1° / 1hr | 12hr | No |
| PredictWind | JSON | 0.1° / 1hr | 6hr | No |
| OpenWeatherMap | JSON | 0.25° / 1hr | 1hr | No |

#### 2.1.2 Weather Parameters
| Parameter | Unit | GRIB2 ID | Description |
|-----------|------|----------|-------------|
| Wind Speed | m/s | 10U, 10V | 10m wind vector |
| Wind Gust | m/s | GUST | Maximum gust |
| Wave Height | m | HTSGW | Significant wave height |
| Wave Period | s | PERPW | Peak wave period |
| Wave Direction | deg | DIRPW | Wave direction |
| Current U | m/s | UOGRD | Eastward current |
| Current V | m/s | VOGRD | Northward current |
| Pressure | Pa | PRES | Mean sea level pressure |
| Precipitation | kg/m² | TP | Total precipitation |
| Cloud Cover | % | TCC | Total cloud cover |

#### 2.1.3 Routing Features
- [ ] Point-to-point routing
- [ ] Isochrone routing (time-constrained)
- [ ] Weather-avoidance routing
- [ ] Fuel-optimal routing
- [ ] Comfort optimization (wave avoidance)
- [ ] Multiple route comparison
- [ ] Route export (GPX, KML)
- [ ] ETA prediction with weather
- [ ] Weather alerts along route

#### 2.1.4 Performance Requirements
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| GRIB parse time | < 2s | Performance API |
| Route calculation | < 5s | Performance API |
| Isochrone generation | < 10s | Performance API |
| Weather overlay render | < 500ms | Performance API |
| Memory (GRIB cache) | < 100MB | Chrome memory panel |

### 2.2 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Weather Routing Architecture                │
├─────────────────────────────────────────────────────────────┤
│  WeatherView (React Component)                               │
│  ├── WeatherMap (Chart overlay)                             │
│  ├── WeatherPanel                                           │
│  │   ├── WindOverlay                                        │
│  │   ├── WaveOverlay                                        │
│  │   ├── CurrentOverlay                                     │
│  │   └── PressureOverlay                                    │
│  ├── RoutePlanner                                           │
│  │   ├── WaypointEditor                                     │
│  │   ├── ConstraintsPanel                                   │
│  │   └── RouteComparison                                    │
│  └── ConditionsPanel                                        │
│       ├── PointConditions                                   │
│       ├── RouteSummary                                      │
│       └── Alerts                                            │
├─────────────────────────────────────────────────────────────┤
│  WeatherEngine (Service Layer)                              │
│  ├── GRIBParser (grib2-js wrapper)                         │
│  ├── WeatherInterpolator                                    │
│  │   ├── Spatial (Bilinear)                                 │
│  │   └── Temporal (Linear)                                  │
│  ├── RoutingEngine                                          │
│  │   ├── IsochroneCalculator                                │
│  │   ├── CostFunction                                       │
│   │   └── PathOptimizer                                     │
│  └── WeatherAlerts                                          │
│       ├── ThresholdMonitor                                  │
│       └── AlertGenerator                                    │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── GRIB Cache (IndexedDB)                                 │
│  ├── Weather Models (JSON)                                  │
│  ├── Route History                                          │
│  └── Alerts (SQLite)                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Data Structures

```typescript
// Weather Data Types
interface GRIBData {
  referenceTime: Date;
  updateTime: Date;
  parameters: WeatherParameter[];
  bounds: GeoBounds;
  resolution: number;
  forecastHours: number[];
}

interface WeatherParameter {
  name: string;
  unit: string;
  level: string;
  data: Float32Array; // 2D grid flattened
  width: number;
  height: number;
  min: number;
  max: number;
}

interface WeatherPoint {
  position: GeoPosition;
  timestamp: Date;
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  waveHeight: number;
  wavePeriod: number;
  waveDirection: number;
  currentU: number;
  currentV: number;
  pressure: number;
  precipitation?: number;
  cloudCover?: number;
  visibility?: number;
}

interface WeatherGrid {
  bounds: GeoBounds;
  resolution: number;
  rows: number;
  cols: number;
  parameters: string[];
  data: Map<string, Float32Array>;
  referenceTime: Date;
  forecastHour: number;
}

// Routing Types
interface WeatherRoute {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  options: RouteOption[];
  selectedOption: string;
  departureTime: Date;
  arrivalTime: Date;
  totalDistance: number;
  totalTime: number;
  fuelEstimate: number;
  comfortScore: number;
  weatherAlerts: Alert[];
  createdAt: Date;
}

interface RouteOption {
  id: string;
  name: string;
  waypoints: RouteWaypoint[];
  distance: number;
  time: number;
  fuel: number;
  comfort: number;
  weather: RouteConditionsSummary;
  safetyScore: number;
}

interface RouteConditionsSummary {
  avgWindSpeed: number;
  maxWindSpeed: number;
  avgWaveHeight: number;
  maxWaveHeight: number;
  avgCurrentSpeed: number;
  roughWaterPercent: number;
  weatherWindows: WeatherWindow[];
}

interface WeatherWindow {
  startTime: Date;
  endTime: Date;
  conditions: string;
  recommendation: string;
}

interface VesselConstraints {
  maxSpeed: number;
  cruiseSpeed: number;
  maxWindSpeed: number;
  maxWaveHeight: number;
  maxCurrentCrossing: number;
  minComfortScore: number;
  fuelCapacity: number;
  fuelReserve: number;
  draft: number;
  beam: number;
  length: number;
}

// Alert Types
interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory' | 'info';
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  event: string;
  description: string;
  startTime: Date;
  endTime: Date;
  affectedArea: GeoPolygon;
  waypointsAffected: string[];
  recommendation: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Isochrone Types
interface Isochrone {
  timestamp: Date;
  points: GeoPosition[];
  distances: number[];
  bearings: number[];
}

interface IsochroneRequest {
  startPosition: GeoPosition;
  startTime: Date;
  maxTime: number; // minutes
  timeStep: number; // minutes
  vesselConstraints: VesselConstraints;
  weatherData: GRIBData;
  resolution: number;
}
```

---

## 3. Test Matrix

### 3.1 Navigation Charts Tests

#### 3.1.1 Unit Tests (Vitest)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CHART-UT-001 | Parse MBTiles metadata | Correct tile counts, bounds, zoom levels |
| CHART-UT-002 | Coordinate transformation WGS84 → Web Mercator | Accurate conversion within 0.001m |
| CHART-UT-003 | Waypoint distance calculation | Matches haversine formula |
| CHART-UT-004 | Route total distance | Sum of segment distances |
| CHART-UT-005 | Track point interpolation | Linear interpolation between points |
| CHART-UT-006 | Chart settings validation | Invalid values rejected |
| CHART-UT-007 | Waypoint name uniqueness | Duplicate names prevented |
| CHART-UT-008 | Route waypoint ordering | Sequential order maintained |
| CHART-UT-009 | Track time sorting | Points ordered by timestamp |
| CHART-UT-010 | GeoBounds intersection | Correct overlap detection |

#### 3.1.2 Integration Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CHART-IT-001 | Load MBTiles database | All tiles accessible, no corruption |
| CHART-IT-002 | Online tile fallback | Seamless switch to online tiles |
| CHART-IT-003 | Offline cache persistence | Tiles survive app restart |
| CHART-IT-004 | Chart layer switching | No memory leaks, smooth transition |
| CHART-IT-005 | User data sync | Waypoints/routes sync across devices |
| CHART-IT-006 | GPX import | Valid GPX parses correctly |
| CHART-IT-007 | GPX export | Generated GPX validates |
| CHART-IT-008 | Chart settings persistence | Settings survive restart |

#### 3.1.3 E2E Tests (Playwright)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| CHART-E2E-001 | Pan and zoom interaction | Smooth, responsive map |
| CHART-E2E-002 | Place waypoint | Waypoint appears at tap location |
| CHART-E2E-003 | Create route | Route draws correctly between waypoints |
| CHART-E2E-004 | Navigate route | Active navigation shows progress |
| CHART-E2E-005 | Measure tool | Accurate distance measurement |
| CHART-E2E-006 | Night mode toggle | Colors invert correctly |
| CHART-E2E-007 | Layer visibility toggle | Layers show/hide correctly |
| CHART-E2E-008 | Chart source switch | New tiles load without error |

### 3.2 Weather Routing Tests

#### 3.2.1 Unit Tests (Vitest)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| WX-UT-001 | GRIB2 header parsing | Correct identification of parameters |
| WX-UT-002 | GRIB2 data extraction | Values match expected ranges |
| WX-UT-003 | Bilinear interpolation | Smooth transitions between grid points |
| WX-UT-004 | Temporal interpolation | Linear between forecast hours |
| WX-UT-005 | Wind vector calculation | Correct magnitude/direction |
| WX-UT-006 | Wave height averaging | Correct statistical calculation |
| WX-UT-007 | Isochrone time calculation | Time matches distance/speed |
| WX-UT-008 | Cost function evaluation | Lower cost = better route |
| WX-UT-009 | Fuel consumption estimate | Reasonable values based on speed |
| WX-UT-010 | Comfort score calculation | 0-100 scale, reasonable distribution |
| WX-UT-011 | Alert threshold check | Alerts trigger at correct values |
| WX-UT-012 | Weather window detection | Correct identification of windows |

#### 3.2.2 Integration Tests

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| WX-IT-001 | GRIB download and parse | Complete parse, no errors |
| WX-IT-002 | Multi-parameter GRIB | All parameters accessible |
| WX-IT-003 | Weather cache persistence | Cached data survives restart |
| WX-IT-004 | Route calculation with weather | Route avoids bad weather |
| WX-IT-005 | Multiple route comparison | All routes generated |
| WX-IT-006 | ETA with weather | ETA accounts for conditions |
| WX-IT-007 | Weather alert generation | Alerts for affected waypoints |
| WX-IT-008 | GPX route export | Valid GPX with weather data |

#### 3.2.3 E2E Tests (Playwright)

| Test ID | Description | Expected Result |
|---------|-------------|-----------------|
| WX-E2E-001 | Load weather forecast | Weather data displays |
| WX-E2E-002 | Wind overlay toggle | Wind arrows display correctly |
| WX-E2E-003 | Wave overlay toggle | Wave heights display correctly |
| WX-E2E-004 | Create weather route | Route generated with weather |
| WX-E2E-005 | Compare routes | Comparison panel shows differences |
| WX-E2E-006 | Adjust departure time | Route recalculates |
| WX-E2E-007 | Set vessel constraints | Constraints applied to routing |
| WX-E2E-008 | Export route to GPX | Download succeeds, valid GPX |
| WX-E2E-009 | View weather alerts | Alerts display for route |
| WX-E2E-010 | Weather animation | Forecast plays correctly |

---

## 4. Implementation Tasks

### 4.1 Navigation Charts

| Task | Priority | Estimated Effort | Dependencies |
|------|----------|------------------|--------------|
| Create ChartStore (Zustand) | P0 | 4h | None |
| Implement MBTiles loader | P0 | 8h | ChartStore |
| Build OpenLayers integration | P0 | 12h | MBTiles loader |
| Create ChartView component | P0 | 8h | OpenLayers |
| Implement waypoint management | P1 | 6h | ChartStore |
| Implement route management | P1 | 8h | Waypoint mgmt |
| Add track recording | P1 | 6h | ChartStore |
| Build GPX import/export | P2 | 8h | Route mgmt |
| Implement chart settings | P2 | 4h | ChartView |
| Add offline tile caching | P1 | 8h | MBTiles loader |
| Create chart tests | P0 | 12h | All above |

### 4.2 Weather Routing

| Task | Priority | Estimated Effort | Dependencies |
|------|----------|------------------|--------------|
| Create WeatherStore (Zustand) | P0 | 4h | None |
| Implement GRIB2 parser | P0 | 16h | None |
| Build weather interpolation | P0 | 8h | GRIB parser |
| Create WeatherView component | P0 | 8h | Weather interpolation |
| Implement routing engine | P0 | 16h | Weather interpolation |
| Build isochrone calculator | P0 | 12h | Routing engine |
| Create RoutePlanner component | P0 | 12h | Routing engine |
| Implement weather overlays | P1 | 8h | WeatherView |
| Add alert system | P1 | 6h | WeatherStore |
| Build GPX export with weather | P2 | 8h | RoutePlanner |
| Create weather tests | P0 | 16h | All above |

---

## 5. SOLID Principles Compliance

### 5.1 Single Responsibility Principle

Each class/module has one responsibility:

```
ChartStore     → Chart state management only
WeatherStore   → Weather state management only
GRIBParser     → GRIB parsing only
RoutingEngine  → Route calculation only
ChartView      → Chart rendering only
WeatherView    → Weather rendering only
```

### 5.2 Open/Closed Principle

Extend via composition, not modification:

```typescript
// Good: Extend via strategy pattern
interface WeatherOverlay {
  render(ctx: CanvasRenderingContext2D, bounds: GeoBounds): void;
}

class WindOverlay implements WeatherOverlay { /* ... */ }
class WaveOverlay implements WeatherOverlay { /* ... */ }
class CurrentOverlay implements WeatherOverlay { /* ... */ }

// Add new overlays without modifying existing code
```

### 5.3 Liskov Substitution Principle

All implementations satisfy the interface contract:

```typescript
interface ChartSource {
  getTile(z: number, x: number, y: number): Promise<ImageBitmap>;
  getBounds(): GeoBounds;
  getAttribution(): string;
}

// All chart sources (OSM, ENC, MBTiles) implement this identically
```

### 5.4 Interface Segregation Principle

Small, focused interfaces:

```typescript
// Instead of one large interface
interface IChartManager {
  loadChart(): void;
  renderMap(): void;
  handlePan(): void;
  handleZoom(): void;
  saveWaypoint(): void;
  calculateRoute(): void;
}

// Use focused interfaces
interface IChartRenderer {
  renderMap(): void;
}

interface IWaypointManager {
  saveWaypoint(wp: Waypoint): void;
  deleteWaypoint(id: string): void;
}

interface IRoutingEngine {
  calculateRoute(start: GeoPosition, end: GeoPosition): Route;
}
```

### 5.5 Dependency Inversion Principle

Depend on abstractions, not concretions:

```typescript
// Good: Depend on interface
class WeatherService {
  constructor(private weatherApi: IWeatherApi) {}
}

// Bad: Depend on concrete implementation
class WeatherService {
  constructor(private gribParser: GRIBParser) {} // Tight coupling
```

---

## 6. Security Considerations

### 6.1 Chart Data Security
- Validate all chart file signatures
- Sanitize GPX/JSON imports (XXE prevention)
- Encrypt cached chart data at rest
- Rate-limit online tile requests

### 6.2 Weather Data Security
- Validate GRIB2 checksums
- Sanitize weather API responses
- Encrypt cached GRIB data at rest
- Secure weather API keys in environment

### 6.3 Route Security
- Validate all user inputs (XSS prevention)
- Sanitize GPX exports
- Encrypt route data at rest
- Rate-limit route calculations

---

## 7. Performance Budget

| Component | Budget | Monitoring |
|-----------|--------|------------|
| Chart tile load | < 500ms p95 | Network tab |
| Weather interpolation | < 100ms | Performance API |
| Route calculation | < 5s | Performance API |
| Memory (charts) | < 200MB | Chrome memory |
| Memory (weather) | < 100MB | Chrome memory |
| Cache size (offline) | < 500MB | Storage API |

---

## 8. Definition of Done

### Navigation Charts
- [ ] All unit tests pass (≥90% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] MBTiles loading works offline
- [ ] Waypoint CRUD operations work
- [ ] Route planning works
- [ ] GPX import/export works
- [ ] Performance budget met
- [ ] Security audit passed
- [ ] Documentation complete

### Weather Routing
- [ ] All unit tests pass (≥90% coverage)
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] GRIB2 parsing works
- [ ] Weather overlays render
- [ ] Route calculation works
- [ ] Isochrone generation works
- [ ] Alert system works
- [ ] Performance budget met
- [ ] Security audit passed
- [ ] Documentation complete

---

## 9. References

- [OpenLayers Documentation](https://openlayers.org/)
- [MBTiles Specification](https://github.com/mapbox/mbtiles-spec)
- [GRIB2 Format](https://www.nco.ncep.noaa.gov/pmb/docs/grib2/)
- [OGC SLD/SE Specification](https://www.ogc.org/standards/sld)
- [GPX 1.1 Schema](https://www.topografix.com/gpx.asp)
- [PredictWind Routing](https://www.predictwind.com/)
- [Navionics API](https://www.navionics.com/developers)

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-03  
**Next Review:** 2026-05-03  
**Owner:** 3D3D.CA Engineering Team

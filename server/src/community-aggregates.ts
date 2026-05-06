import type { StoredCommunityHazard } from './community-hazard-repository.js';
import type { StoredCommunityObservation } from './community-observation-repository.js';
import type { StoredCommunitySounding } from './community-sounding-repository.js';

type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [[
    [number, number],
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]];
};

type CommunityAggregateFeature = {
  type: 'Feature';
  id: string;
  geometry: PolygonGeometry;
  properties: {
    kind: 'aggregate_cell';
    cellId: string;
    cellSizeDegrees: number;
    region: string;
    soundingCount: number;
    observationCount: number;
    weatherObservationCount: number;
    conditionObservationCount: number;
    aisTargetObservationCount: number;
    radarContactObservationCount: number;
    healthObservationCount: number;
    hazardCount: number;
    highHazardCount: number;
    mediumHazardCount: number;
    lowHazardCount: number;
    minDepthMeters: number | null;
    maxDepthMeters: number | null;
    averageDepthMeters: number | null;
    averageConfidence: number | null;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    officialChartDataIncluded: false;
  };
};

export type CommunityAggregateGeoJson = {
  type: 'FeatureCollection';
  features: CommunityAggregateFeature[];
  metadata: {
    schemaVersion: 'harbourmesh.community-aggregates.v1';
    generatedAt: string;
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    communityProductsAreReferenceOnly: true;
    rawRecordIdsIncluded: false;
    vesselIdsIncluded: false;
    cellSizeDegrees: number;
    sourceRecordCounts: {
      soundings: number;
      acceptedSoundings: number;
      rejectedSoundings: number;
      observations: number;
      positionedObservations: number;
      hazards: number;
      publicHazards: number;
      aggregateCells: number;
    };
  };
};

type AggregateCell = {
  id: string;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  regions: Map<string, number>;
  soundingCount: number;
  depthSum: number;
  confidenceSum: number;
  minDepthMeters?: number;
  maxDepthMeters?: number;
  observationCount: number;
  weatherObservationCount: number;
  conditionObservationCount: number;
  aisTargetObservationCount: number;
  radarContactObservationCount: number;
  healthObservationCount: number;
  hazardCount: number;
  highHazardCount: number;
  mediumHazardCount: number;
  lowHazardCount: number;
};

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function getCellBounds(latitude: number, longitude: number, cellSizeDegrees: number) {
  const latMin = roundCoordinate(Math.floor(latitude / cellSizeDegrees) * cellSizeDegrees);
  const lonMin = roundCoordinate(Math.floor(longitude / cellSizeDegrees) * cellSizeDegrees);
  return {
    id: `${latMin.toFixed(4)}:${lonMin.toFixed(4)}`,
    latMin,
    latMax: roundCoordinate(latMin + cellSizeDegrees),
    lonMin,
    lonMax: roundCoordinate(lonMin + cellSizeDegrees),
  };
}

function getOrCreateCell(
  cells: Map<string, AggregateCell>,
  latitude: number,
  longitude: number,
  cellSizeDegrees: number
): AggregateCell {
  const bounds = getCellBounds(latitude, longitude, cellSizeDegrees);
  const existing = cells.get(bounds.id);
  if (existing) return existing;

  const cell: AggregateCell = {
    ...bounds,
    regions: new Map(),
    soundingCount: 0,
    depthSum: 0,
    confidenceSum: 0,
    observationCount: 0,
    weatherObservationCount: 0,
    conditionObservationCount: 0,
    aisTargetObservationCount: 0,
    radarContactObservationCount: 0,
    healthObservationCount: 0,
    hazardCount: 0,
    highHazardCount: 0,
    mediumHazardCount: 0,
    lowHazardCount: 0,
  };
  cells.set(bounds.id, cell);
  return cell;
}

function recordRegion(cell: AggregateCell, region: string) {
  cell.regions.set(region, (cell.regions.get(region) ?? 0) + 1);
}

function getDominantRegion(cell: AggregateCell): string {
  return [...cell.regions.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .at(0)?.[0] ?? 'unknown';
}

function addSounding(cell: AggregateCell, sounding: StoredCommunitySounding) {
  cell.soundingCount += 1;
  cell.depthSum += sounding.depthMeters;
  cell.confidenceSum += sounding.quality.confidence;
  cell.minDepthMeters = Math.min(cell.minDepthMeters ?? sounding.depthMeters, sounding.depthMeters);
  cell.maxDepthMeters = Math.max(cell.maxDepthMeters ?? sounding.depthMeters, sounding.depthMeters);
  recordRegion(cell, sounding.region);
}

function addHazard(cell: AggregateCell, hazard: StoredCommunityHazard) {
  cell.hazardCount += 1;
  if (hazard.severity === 'high') cell.highHazardCount += 1;
  if (hazard.severity === 'medium') cell.mediumHazardCount += 1;
  if (hazard.severity === 'low') cell.lowHazardCount += 1;
  recordRegion(cell, hazard.region);
}

function addObservation(cell: AggregateCell, observation: StoredCommunityObservation) {
  cell.observationCount += 1;
  if (observation.observationType === 'weather') cell.weatherObservationCount += 1;
  if (observation.observationType === 'condition') cell.conditionObservationCount += 1;
  if (observation.observationType === 'ais_target') cell.aisTargetObservationCount += 1;
  if (observation.observationType === 'radar_contact') cell.radarContactObservationCount += 1;
  if (observation.observationType === 'system_health') cell.healthObservationCount += 1;
  recordRegion(cell, observation.region);
}

function cellToFeature(cell: AggregateCell, cellSizeDegrees: number): CommunityAggregateFeature {
  return {
    type: 'Feature',
    id: `aggregate:${cell.id}`,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [cell.lonMin, cell.latMin],
        [cell.lonMax, cell.latMin],
        [cell.lonMax, cell.latMax],
        [cell.lonMin, cell.latMax],
        [cell.lonMin, cell.latMin],
      ]],
    },
    properties: {
      kind: 'aggregate_cell',
      cellId: cell.id,
      cellSizeDegrees,
      region: getDominantRegion(cell),
      soundingCount: cell.soundingCount,
      observationCount: cell.observationCount,
      weatherObservationCount: cell.weatherObservationCount,
      conditionObservationCount: cell.conditionObservationCount,
      aisTargetObservationCount: cell.aisTargetObservationCount,
      radarContactObservationCount: cell.radarContactObservationCount,
      healthObservationCount: cell.healthObservationCount,
      hazardCount: cell.hazardCount,
      highHazardCount: cell.highHazardCount,
      mediumHazardCount: cell.mediumHazardCount,
      lowHazardCount: cell.lowHazardCount,
      minDepthMeters: cell.soundingCount > 0 ? roundCoordinate(cell.minDepthMeters ?? 0) : null,
      maxDepthMeters: cell.soundingCount > 0 ? roundCoordinate(cell.maxDepthMeters ?? 0) : null,
      averageDepthMeters: cell.soundingCount > 0 ? roundCoordinate(cell.depthSum / cell.soundingCount) : null,
      averageConfidence: cell.soundingCount > 0 ? roundCoordinate(cell.confidenceSum / cell.soundingCount) : null,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      officialChartDataIncluded: false,
    },
  };
}

export function buildCommunityAggregateGeoJson(
  soundings: StoredCommunitySounding[],
  hazards: StoredCommunityHazard[],
  observations: StoredCommunityObservation[] = [],
  generatedAt = new Date().toISOString(),
  cellSizeDegrees = 0.01
): CommunityAggregateGeoJson {
  const cells = new Map<string, AggregateCell>();
  const acceptedSoundings = soundings.filter((sounding) => !sounding.quality.rejected);
  const positionedObservations = observations.filter((observation) => observation.position && !observation.quality.rejected);
  const publicHazards = hazards.filter((hazard) => hazard.publicOverlayEligible && hazard.position);

  for (const sounding of acceptedSoundings) {
    const cell = getOrCreateCell(cells, sounding.latitude, sounding.longitude, cellSizeDegrees);
    addSounding(cell, sounding);
  }

  for (const hazard of publicHazards) {
    if (!hazard.position) continue;
    const cell = getOrCreateCell(cells, hazard.position.latitude, hazard.position.longitude, cellSizeDegrees);
    addHazard(cell, hazard);
  }

  for (const observation of positionedObservations) {
    if (!observation.position) continue;
    const cell = getOrCreateCell(cells, observation.position.latitude, observation.position.longitude, cellSizeDegrees);
    addObservation(cell, observation);
  }

  const features = [...cells.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((cell) => cellToFeature(cell, cellSizeDegrees));

  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      schemaVersion: 'harbourmesh.community-aggregates.v1',
      generatedAt,
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      communityProductsAreReferenceOnly: true,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      cellSizeDegrees,
      sourceRecordCounts: {
        soundings: soundings.length,
        acceptedSoundings: acceptedSoundings.length,
        rejectedSoundings: soundings.length - acceptedSoundings.length,
        observations: observations.length,
        positionedObservations: positionedObservations.length,
        hazards: hazards.length,
        publicHazards: publicHazards.length,
        aggregateCells: features.length,
      },
    },
  };
}

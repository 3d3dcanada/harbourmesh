import type { CommunityAggregateGeoJson } from './community-aggregates.js';
import type { CommunityAggregateReleaseManifest } from './community-release-manifests.js';
import { appendJsonLine, readJsonLines, resolveDataFile } from './jsonl-store.js';

export type StoredCommunityAggregateCell = {
  releaseId: string;
  generatedAt: string;
  cellId: string;
  region: string;
  cellSizeDegrees: number;
  geometry: CommunityAggregateGeoJson['features'][number]['geometry'];
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

export type CommunityAggregateReleasePublishInput = {
  aggregate: CommunityAggregateGeoJson;
  manifest: CommunityAggregateReleaseManifest;
  generatedBy?: string;
};

export type CommunityAggregateReleaseRepository = {
  publishAggregateRelease: (
    input: CommunityAggregateReleasePublishInput
  ) => Promise<CommunityAggregateReleaseManifest>;
  getLatestAggregateRelease: () => Promise<CommunityAggregateReleaseManifest | null>;
  listAggregateReleases: () => Promise<CommunityAggregateReleaseManifest[]>;
  listAggregateCells: (releaseId: string) => Promise<StoredCommunityAggregateCell[]>;
};

type StoredCommunityAggregateRelease = {
  releaseId: string;
  region: CommunityAggregateReleaseManifest['region'];
  productKind: CommunityAggregateReleaseManifest['productKind'];
  generatedBy: string;
  generatedAt: string;
  storedAt: string;
  manifest: CommunityAggregateReleaseManifest;
};

function normalizeGeneratedBy(value: string | undefined): string {
  return value?.trim() || 'system:auto';
}

function featureToStoredCell(
  releaseId: string,
  generatedAt: string,
  feature: CommunityAggregateGeoJson['features'][number]
): StoredCommunityAggregateCell {
  return {
    releaseId,
    generatedAt,
    cellId: feature.properties.cellId,
    region: feature.properties.region,
    cellSizeDegrees: feature.properties.cellSizeDegrees,
    geometry: feature.geometry,
    soundingCount: feature.properties.soundingCount,
    observationCount: feature.properties.observationCount,
    weatherObservationCount: feature.properties.weatherObservationCount,
    conditionObservationCount: feature.properties.conditionObservationCount,
    aisTargetObservationCount: feature.properties.aisTargetObservationCount,
    radarContactObservationCount: feature.properties.radarContactObservationCount,
    healthObservationCount: feature.properties.healthObservationCount,
    hazardCount: feature.properties.hazardCount,
    highHazardCount: feature.properties.highHazardCount,
    mediumHazardCount: feature.properties.mediumHazardCount,
    lowHazardCount: feature.properties.lowHazardCount,
    minDepthMeters: feature.properties.minDepthMeters,
    maxDepthMeters: feature.properties.maxDepthMeters,
    averageDepthMeters: feature.properties.averageDepthMeters,
    averageConfidence: feature.properties.averageConfidence,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    officialChartDataIncluded: false,
  };
}

function cellToFeature(cell: StoredCommunityAggregateCell): CommunityAggregateGeoJson['features'][number] {
  return {
    type: 'Feature',
    id: `aggregate:${cell.cellId}`,
    geometry: cell.geometry,
    properties: {
      kind: 'aggregate_cell',
      cellId: cell.cellId,
      cellSizeDegrees: cell.cellSizeDegrees,
      region: cell.region,
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
      minDepthMeters: cell.minDepthMeters,
      maxDepthMeters: cell.maxDepthMeters,
      averageDepthMeters: cell.averageDepthMeters,
      averageConfidence: cell.averageConfidence,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      officialChartDataIncluded: false,
    },
  };
}

export function buildCommunityAggregateGeoJsonFromStoredRelease(
  manifest: CommunityAggregateReleaseManifest,
  cells: StoredCommunityAggregateCell[]
): CommunityAggregateGeoJson {
  const sortedCells = cells.slice().sort((left, right) => left.cellId.localeCompare(right.cellId));

  return {
    type: 'FeatureCollection',
    features: sortedCells.map(cellToFeature),
    metadata: {
      schemaVersion: 'harbourmesh.community-aggregates.v1',
      generatedAt: manifest.generatedAt,
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      communityProductsAreReferenceOnly: true,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      cellSizeDegrees: sortedCells[0]?.cellSizeDegrees ?? 0.01,
      sourceRecordCounts: manifest.product.sourceRecordCounts,
    },
  };
}

export function createCommunityAggregateReleaseRepository(dataDir: string): CommunityAggregateReleaseRepository {
  const releasesFile = resolveDataFile(dataDir, 'community-aggregate-releases.jsonl');
  const cellsFile = resolveDataFile(dataDir, 'community-aggregate-cells.jsonl');

  return {
    async publishAggregateRelease(input) {
      const releases = await readJsonLines<StoredCommunityAggregateRelease>(releasesFile);
      const existing = releases.find((release) => release.releaseId === input.manifest.id);
      if (existing) return existing.manifest;

      const storedAt = new Date().toISOString();
      const release: StoredCommunityAggregateRelease = {
        releaseId: input.manifest.id,
        region: input.manifest.region,
        productKind: input.manifest.productKind,
        generatedBy: normalizeGeneratedBy(input.generatedBy),
        generatedAt: input.manifest.generatedAt,
        storedAt,
        manifest: input.manifest,
      };

      await appendJsonLine(releasesFile, release);
      for (const feature of input.aggregate.features) {
        await appendJsonLine(cellsFile, featureToStoredCell(input.manifest.id, input.manifest.generatedAt, feature));
      }

      return input.manifest;
    },

    async getLatestAggregateRelease() {
      const releases = await readJsonLines<StoredCommunityAggregateRelease>(releasesFile);
      return releases
        .filter((release) => release.productKind === 'aggregate_geojson')
        .sort((left, right) => (
          right.generatedAt.localeCompare(left.generatedAt) ||
          right.releaseId.localeCompare(left.releaseId)
        ))
        .at(0)?.manifest ?? null;
    },

    async listAggregateReleases() {
      const releases = await readJsonLines<StoredCommunityAggregateRelease>(releasesFile);
      return releases
        .filter((release) => release.productKind === 'aggregate_geojson')
        .sort((left, right) => (
          right.generatedAt.localeCompare(left.generatedAt) ||
          right.releaseId.localeCompare(left.releaseId)
        ))
        .map((release) => release.manifest);
    },

    async listAggregateCells(releaseId) {
      const cells = await readJsonLines<StoredCommunityAggregateCell>(cellsFile);
      return cells
        .filter((cell) => cell.releaseId === releaseId)
        .sort((left, right) => left.cellId.localeCompare(right.cellId));
    },
  };
}

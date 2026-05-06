import { describe, expect, it, vi } from 'vitest';
import {
  fetchCommunityAggregateReleaseManifest,
  fetchCommunityAggregates,
  fetchCommunityOverlay,
  getCommunityOverlayFeaturesByKind,
  type CommunityAggregateReleaseManifest,
  type CommunityAggregateGeoJson,
  type CommunityGeoJsonOverlay,
} from './community-overlay';

const overlay: CommunityGeoJsonOverlay = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'sounding:sounding-1',
      geometry: {
        type: 'Point',
        coordinates: [-66.06, 45.27],
      },
      properties: {
        kind: 'sounding',
        depthMeters: 12.5,
        officialChartDataIncluded: false,
      },
    },
    {
      type: 'Feature',
      id: 'hazard:hazard-1',
      geometry: {
        type: 'Point',
        coordinates: [-66.06, 45.27],
      },
      properties: {
        kind: 'hazard',
        severity: 'medium',
        officialChartDataIncluded: false,
      },
    },
  ],
  metadata: {
    schemaVersion: 'harbourmesh.community-overlay.v1',
    generatedAt: '2026-05-06T12:12:00.000Z',
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    communityProductsAreReferenceOnly: true,
    sourceRecordCounts: {
      soundings: 1,
      hazards: 1,
      omittedUnpositionedHazards: 0,
    },
  },
};

const aggregate: CommunityAggregateGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'aggregate:45.2700:-66.0600',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-66.06, 45.27],
          [-66.05, 45.27],
          [-66.05, 45.28],
          [-66.06, 45.28],
          [-66.06, 45.27],
        ]],
      },
      properties: {
        kind: 'aggregate_cell',
        cellId: '45.2700:-66.0600',
        cellSizeDegrees: 0.01,
        region: 'NB_PILOT',
        soundingCount: 3,
        observationCount: 2,
        weatherObservationCount: 1,
        conditionObservationCount: 0,
        aisTargetObservationCount: 1,
        radarContactObservationCount: 0,
        healthObservationCount: 0,
        hazardCount: 1,
        highHazardCount: 0,
        mediumHazardCount: 1,
        lowHazardCount: 0,
        minDepthMeters: 12,
        maxDepthMeters: 14,
        averageDepthMeters: 13,
        averageConfidence: 0.82,
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
        officialChartDataIncluded: false,
      },
    },
  ],
  metadata: {
    schemaVersion: 'harbourmesh.community-aggregates.v1',
    generatedAt: '2026-05-06T12:13:00.000Z',
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    communityProductsAreReferenceOnly: true,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    cellSizeDegrees: 0.01,
    sourceRecordCounts: {
      soundings: 3,
      acceptedSoundings: 3,
      rejectedSoundings: 0,
      observations: 2,
      positionedObservations: 2,
      hazards: 1,
      publicHazards: 1,
      aggregateCells: 1,
    },
  },
};

const aggregateRelease: CommunityAggregateReleaseManifest = {
  id: 'community-aggregate-release:2026-05-06T12:13:00.000Z',
  schemaVersion: 'harbourmesh.community-aggregate-release.v1',
  generatedAt: '2026-05-06T12:13:00.000Z',
  region: 'NB_PILOT',
  productKind: 'aggregate_geojson',
  product: {
    fileName: 'community-aggregates-2026-05-06.geojson',
    mediaType: 'application/geo+json',
    byteLength: 1200,
    sha256: 'a'.repeat(64),
    sourceRecordCounts: aggregate.metadata.sourceRecordCounts,
    aggregateCells: 1,
  },
  rules: {
    intendedUse: 'community_reference_overlay',
    communityProductsAreReferenceOnly: true,
    officialChartDataIncluded: false,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
  },
};

describe('community overlay client', () => {
  it('fetches and validates the community GeoJSON overlay', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(overlay), { status: 200 }));

    await expect(fetchCommunityOverlay({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        officialChartDataIncluded: false,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/overlay.geojson', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('separates sounding and hazard features by kind', () => {
    expect(getCommunityOverlayFeaturesByKind(overlay, 'sounding').map((feature) => feature.id)).toEqual(['sounding:sounding-1']);
    expect(getCommunityOverlayFeaturesByKind(overlay, 'hazard').map((feature) => feature.id)).toEqual(['hazard:hazard-1']);
  });

  it('rejects overlay responses that include official chart data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...overlay,
      metadata: {
        ...overlay.metadata,
        officialChartDataIncluded: true,
      },
    }), { status: 200 }));

    await expect(fetchCommunityOverlay({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Community overlay response was not a HarbourMesh reference overlay');
  });

  it('fetches and validates aggregate community GeoJSON cells', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(aggregate), { status: 200 }));

    await expect(fetchCommunityAggregates({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      type: 'FeatureCollection',
      metadata: {
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/aggregates.geojson', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('rejects aggregate responses that expose raw IDs or official chart data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...aggregate,
      metadata: {
        ...aggregate.metadata,
        rawRecordIdsIncluded: true,
      },
    }), { status: 200 }));

    await expect(fetchCommunityAggregates({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Community aggregate response was not a HarbourMesh aggregate overlay');
  });

  it('fetches and validates aggregate release manifests', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(aggregateRelease), { status: 200 }));

    await expect(fetchCommunityAggregateReleaseManifest({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      schemaVersion: 'harbourmesh.community-aggregate-release.v1',
      rules: {
        officialChartDataIncluded: false,
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/releases/aggregates/latest', expect.objectContaining({
      method: 'GET',
    }));
  });
});

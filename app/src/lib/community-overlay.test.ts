import { describe, expect, it, vi } from 'vitest';
import {
  fetchCommunityAggregateReleaseArtifacts,
  fetchCommunityAggregateReleaseManifest,
  fetchCommunityAggregateReleaseHistory,
  fetchCommunityAggregates,
  fetchCommunityHazardArtifacts,
  fetchCommunityOverlay,
  fetchLatestCommunityAggregateReleaseCells,
  getCommunityOverlayFeaturesByKind,
  publishCommunityAggregateRelease,
  type CommunityAggregateReleaseArtifactManifest,
  type CommunityAggregateReleaseManifest,
  type CommunityAggregateGeoJson,
  type CommunityGeoJsonOverlay,
  type CommunityHazardArtifactManifest,
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

const aggregateReleaseArtifacts: CommunityAggregateReleaseArtifactManifest = {
  id: `community-aggregate-release-artifacts:${aggregateRelease.id}`,
  schemaVersion: 'harbourmesh.community-aggregate-release-artifacts.v1',
  releaseId: aggregateRelease.id,
  generatedAt: aggregateRelease.generatedAt,
  artifacts: [
    {
      id: `artifact:${aggregateRelease.id}:geojson`,
      releaseId: aggregateRelease.id,
      region: 'NB_PILOT',
      format: 'geojson',
      mediaType: 'application/geo+json',
      fileName: 'community-aggregates-2026-05-06.geojson',
      downloadPath: '/api/community/releases/aggregates/latest/artifacts/geojson',
      byteLength: 1200,
      sha256: 'b'.repeat(64),
      generatedAt: aggregateRelease.generatedAt,
      aggregateCells: 1,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      warnings: [],
      content: aggregate,
    },
    {
      id: `artifact:${aggregateRelease.id}:pmtiles`,
      releaseId: aggregateRelease.id,
      region: 'NB_PILOT',
      format: 'pmtiles',
      mediaType: 'application/vnd.pmtiles',
      fileName: 'community-aggregates-2026-05-06.pmtiles',
      downloadPath: '/api/community/releases/aggregates/latest/artifacts/pmtiles',
      byteLength: 4096,
      sha256: 'c'.repeat(64),
      generatedAt: aggregateRelease.generatedAt,
      aggregateCells: 1,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      warnings: [],
      tileSummary: {
        layerName: 'harbourmesh_community_aggregate',
        minZoom: 8,
        maxZoom: 12,
        tileCount: 5,
        bounds: {
          south: 45.27,
          west: -66.06,
          north: 45.28,
          east: -66.05,
        },
      },
    },
  ],
  rules: {
    artifactsAreReferenceOnly: true,
    officialChartDataExcluded: true,
    rawRecordIdsExcluded: true,
    vesselIdsExcluded: true,
    vectorTileGenerationPending: false,
  },
};

const hazardArtifacts: CommunityHazardArtifactManifest = {
  id: 'community-hazard-artifacts:2026-05-06T12:14:00.000Z',
  schemaVersion: 'harbourmesh.community-hazard-artifacts.v1',
  generatedAt: '2026-05-06T12:14:00.000Z',
  artifacts: [
    {
      id: 'artifact:community-hazards:2026-05-06T12:14:00.000Z:geojson',
      region: 'NB_PILOT',
      format: 'geojson',
      mediaType: 'application/geo+json',
      fileName: 'community-hazards-2026-05-06.geojson',
      downloadPath: '/api/community/hazards/artifacts/geojson?generatedAt=2026-05-06T12%3A14%3A00.000Z',
      byteLength: 1200,
      sha256: 'd'.repeat(64),
      generatedAt: '2026-05-06T12:14:00.000Z',
      hazardFeatures: 1,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      sourceDeviceIdsIncluded: false,
      warnings: [],
    },
    {
      id: 'artifact:community-hazards:2026-05-06T12:14:00.000Z:pmtiles',
      region: 'NB_PILOT',
      format: 'pmtiles',
      mediaType: 'application/vnd.pmtiles',
      fileName: 'community-hazards-2026-05-06.pmtiles',
      downloadPath: '/api/community/hazards/artifacts/pmtiles?generatedAt=2026-05-06T12%3A14%3A00.000Z',
      byteLength: 4096,
      sha256: 'e'.repeat(64),
      generatedAt: '2026-05-06T12:14:00.000Z',
      hazardFeatures: 1,
      officialChartDataIncluded: false,
      rawRecordIdsIncluded: false,
      vesselIdsIncluded: false,
      sourceDeviceIdsIncluded: false,
      warnings: [],
      tileSummary: {
        layerName: 'harbourmesh_community_hazards',
        minZoom: 8,
        maxZoom: 12,
        tileCount: 5,
        bounds: {
          south: 45.27,
          west: -66.06,
          north: 45.27,
          east: -66.06,
        },
      },
    },
  ],
  rules: {
    artifactsAreReferenceOnly: true,
    officialChartDataExcluded: true,
    rawRecordIdsExcluded: true,
    vesselIdsExcluded: true,
    sourceDeviceIdsExcluded: true,
    vectorTileGenerationPending: false,
  },
  sourceRecordCounts: {
    hazards: 2,
    publicHazards: 1,
    omittedPendingOrRejectedHazards: 1,
    omittedUnpositionedHazards: 0,
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

  it('fetches aggregate release cells from the persisted release product', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(aggregate), { status: 200 }));

    await expect(fetchLatestCommunityAggregateReleaseCells({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      metadata: {
        schemaVersion: 'harbourmesh.community-aggregates.v1',
      },
      features: expect.arrayContaining([
        expect.objectContaining({
          id: 'aggregate:45.2700:-66.0600',
        }),
      ]),
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/releases/aggregates/latest/cells.geojson', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('fetches persisted aggregate release history', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      releases: [aggregateRelease],
    }), { status: 200 }));

    await expect(fetchCommunityAggregateReleaseHistory({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      releases: [
        {
          id: aggregateRelease.id,
        },
      ],
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/releases/aggregates', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('fetches persisted aggregate release artifacts', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(aggregateReleaseArtifacts), { status: 200 }));

    await expect(fetchCommunityAggregateReleaseArtifacts({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      releaseId: aggregateRelease.id,
      rules: {
        vectorTileGenerationPending: false,
      },
      artifacts: expect.arrayContaining([
        expect.objectContaining({
          format: 'pmtiles',
          mediaType: 'application/vnd.pmtiles',
          tileSummary: expect.objectContaining({
            layerName: 'harbourmesh_community_aggregate',
          }),
        }),
      ]),
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/releases/aggregates/latest/artifacts', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('fetches accepted hazard artifact manifests', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(hazardArtifacts), { status: 200 }));

    await expect(fetchCommunityHazardArtifacts({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      rules: {
        vectorTileGenerationPending: false,
        sourceDeviceIdsExcluded: true,
      },
      artifacts: expect.arrayContaining([
        expect.objectContaining({
          format: 'pmtiles',
          mediaType: 'application/vnd.pmtiles',
          sourceDeviceIdsIncluded: false,
          tileSummary: expect.objectContaining({
            layerName: 'harbourmesh_community_hazards',
          }),
        }),
      ]),
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/hazards/artifacts', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('rejects hazard artifact manifests that expose vessel or source IDs', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...hazardArtifacts,
      artifacts: hazardArtifacts.artifacts.map((artifact) => ({
        ...artifact,
        vesselIdsIncluded: artifact.format === 'pmtiles' ? true : artifact.vesselIdsIncluded,
      })),
    }), { status: 200 }));

    await expect(fetchCommunityHazardArtifacts({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Community hazard artifacts response was not valid');
  });

  it('publishes aggregate releases with a pilot API key', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      release: aggregateRelease,
    }), { status: 201 }));

    const approval = {
      approvedBy: 'nb-pilot-reviewer',
      checklist: {
        referenceOnly: true,
        officialChartDataExcluded: true,
        rawRecordIdsExcluded: true,
        vesselIdsExcluded: true,
      },
    } as const;

    await expect(publishCommunityAggregateRelease(
      { generatedBy: 'nb-pilot-reviewer', approval },
      {
        apiBaseUrl: 'http://localhost:3001',
        apiKey: 'review-key',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }
    )).resolves.toMatchObject({
      id: aggregateRelease.id,
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/community/releases/aggregates', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'X-HarbourMesh-API-Key': 'review-key',
      }),
      body: JSON.stringify({
        generatedBy: 'nb-pilot-reviewer',
        approval,
      }),
    }));
  });
});

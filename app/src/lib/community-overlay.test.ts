import { describe, expect, it, vi } from 'vitest';
import {
  fetchCommunityOverlay,
  getCommunityOverlayFeaturesByKind,
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
});

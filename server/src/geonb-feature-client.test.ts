import { describe, expect, it, vi } from 'vitest';
import { NB_PILOT_CHART_SOURCES } from './chart-catalog.js';
import { fetchGeoNBSourceFeatures } from './geonb-feature-client.js';

describe('GeoNB feature client', () => {
  it('queries eligible ArcGIS MapServer layers as bounded GeoJSON and marks features reference-only', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 45,
          geometry: {
            type: 'LineString',
            coordinates: [[-66.01, 45.26], [-66.02, 45.27]],
          },
          properties: {
            OBJECTID: 45,
          },
        },
      ],
    }), { status: 200 }));

    const result = await fetchGeoNBSourceFeatures({
      source: NB_PILOT_CHART_SOURCES.find((source) => source.id === 'geonb-nbhn-watercourse')!,
      packageId: 'nb-coast-reference',
      bounds: {
        south: 45.2,
        west: -66.2,
        north: 45.4,
        east: -66,
      },
      maxFeatures: 10,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requestUrl.pathname).toContain('/OpenData/NBHN_Watercourse/MapServer/0/query');
    expect(requestUrl.searchParams.get('f')).toBe('geojson');
    expect(requestUrl.searchParams.get('geometry')).toBe('-66.2,45.2,-66,45.4');
    expect(result.collection.features[0]).toMatchObject({
      properties: {
        harbourmeshPackageId: 'nb-coast-reference',
        harbourmeshSourceId: 'geonb-nbhn-watercourse',
        harbourmeshReferenceOnly: true,
        officialChartDataIncluded: false,
      },
    });
  });
});

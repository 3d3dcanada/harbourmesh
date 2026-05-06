import { PMTiles, type Source } from 'pmtiles';
import { describe, expect, it } from 'vitest';
import type { CommunityAggregateGeoJson } from './community-aggregates.js';
import { buildCommunityAggregateReleaseArtifacts } from './community-aggregate-release-artifacts.js';
import { buildCommunityAggregateReleaseManifest } from './community-release-manifests.js';

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

class BufferPmTilesSource implements Source {
  constructor(private readonly bytes: Buffer) {}

  getKey(): string {
    return 'harbourmesh-community-aggregate-test.pmtiles';
  }

  async getBytes(offset: number, length: number) {
    return {
      data: toArrayBuffer(this.bytes.subarray(offset, Math.min(offset + length, this.bytes.byteLength))),
    };
  }
}

function lonToTileX(longitude: number, zoom: number): number {
  return Math.floor(((longitude + 180) / 360) * 2 ** zoom);
}

function latToTileY(latitude: number, zoom: number): number {
  const latRadians = latitude * Math.PI / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRadians) + 1 / Math.cos(latRadians)) / Math.PI) / 2) * 2 ** zoom
  );
}

function clampTile(value: number, zoom: number): number {
  return Math.max(0, Math.min(2 ** zoom - 1, value));
}

async function findFirstPmTilesVectorTile(
  archive: PMTiles,
  bounds: { south: number; west: number; north: number; east: number },
  minZoom: number,
  maxZoom: number
): Promise<ArrayBuffer | null> {
  for (let z = minZoom; z <= maxZoom; z += 1) {
    const minX = clampTile(lonToTileX(bounds.west, z), z);
    const maxX = clampTile(lonToTileX(bounds.east, z), z);
    const minY = clampTile(latToTileY(bounds.north, z), z);
    const maxY = clampTile(latToTileY(bounds.south, z), z);
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const tile = await archive.getZxy(z, x, y);
        if (tile?.data.byteLength) return tile.data;
      }
    }
  }

  return null;
}

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
        soundingCount: 2,
        observationCount: 1,
        weatherObservationCount: 0,
        conditionObservationCount: 0,
        aisTargetObservationCount: 0,
        radarContactObservationCount: 1,
        healthObservationCount: 0,
        hazardCount: 0,
        highHazardCount: 0,
        mediumHazardCount: 0,
        lowHazardCount: 0,
        minDepthMeters: 12.1,
        maxDepthMeters: 13.2,
        averageDepthMeters: 12.65,
        averageConfidence: 0.91,
        rawRecordIdsIncluded: false,
        vesselIdsIncluded: false,
        officialChartDataIncluded: false,
      },
    },
  ],
  metadata: {
    schemaVersion: 'harbourmesh.community-aggregates.v1',
    generatedAt: '2026-05-06T15:30:00.000Z',
    intendedUse: 'community_reference_overlay',
    officialChartDataIncluded: false,
    communityProductsAreReferenceOnly: true,
    rawRecordIdsIncluded: false,
    vesselIdsIncluded: false,
    cellSizeDegrees: 0.01,
    sourceRecordCounts: {
      soundings: 2,
      acceptedSoundings: 2,
      rejectedSoundings: 0,
      observations: 1,
      positionedObservations: 1,
      hazards: 0,
      publicHazards: 0,
      aggregateCells: 1,
    },
  },
};

describe('community aggregate release artifacts', () => {
  it('builds GeoJSON, MBTiles, and PMTiles artifacts without raw identifiers', async () => {
    const release = buildCommunityAggregateReleaseManifest(aggregate);
    const artifacts = await buildCommunityAggregateReleaseArtifacts(release, aggregate);

    expect(artifacts.map((artifact) => artifact.format)).toEqual(['geojson', 'mbtiles', 'pmtiles']);
    expect(artifacts.every((artifact) => artifact.officialChartDataIncluded === false)).toBe(true);
    expect(artifacts.every((artifact) => artifact.rawRecordIdsIncluded === false)).toBe(true);
    expect(artifacts.every((artifact) => artifact.vesselIdsIncluded === false)).toBe(true);
    expect(JSON.stringify(artifacts.map(({ bytes: _bytes, ...artifact }) => artifact))).not.toContain('vessel-1');

    const mbtiles = artifacts.find((artifact) => artifact.format === 'mbtiles');
    expect(mbtiles?.bytes.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
    expect(mbtiles?.tileSummary).toMatchObject({
      layerName: 'harbourmesh_community_aggregate',
      minZoom: 8,
      maxZoom: 12,
      tileCount: expect.any(Number),
    });
    expect(mbtiles?.tileSummary?.tileCount).toBeGreaterThan(0);

    const pmtiles = artifacts.find((artifact) => artifact.format === 'pmtiles');
    expect(pmtiles?.bytes.subarray(0, 7).toString('utf8')).toBe('PMTiles');
    expect(pmtiles?.tileSummary?.tileCount).toBeGreaterThan(0);

    const archive = new PMTiles(new BufferPmTilesSource(pmtiles!.bytes));
    const header = await archive.getHeader();
    const metadata = await archive.getMetadata() as {
      name?: string;
      vector_layers?: Array<{ id: string }>;
    };
    const firstTile = await findFirstPmTilesVectorTile(
      archive,
      pmtiles!.tileSummary!.bounds,
      pmtiles!.tileSummary!.minZoom,
      pmtiles!.tileSummary!.maxZoom
    );

    expect(header.specVersion).toBe(3);
    expect(header.tileType).toBe(1);
    expect(header.numTileEntries).toBe(pmtiles?.tileSummary?.tileCount);
    expect(metadata.name).toBe(release.id);
    expect(metadata.vector_layers?.[0]?.id).toBe('harbourmesh_community_aggregate');
    expect(firstTile?.byteLength).toBeGreaterThan(0);
  });
});

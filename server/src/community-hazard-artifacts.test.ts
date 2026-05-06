import { PMTiles, type Source } from 'pmtiles';
import { describe, expect, it } from 'vitest';
import { buildCommunityHazardArtifacts, getCommunityHazardArtifactManifest } from './community-hazard-artifacts.js';
import type { StoredCommunityHazard } from './community-hazard-repository.js';

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

class BufferPmTilesSource implements Source {
  constructor(private readonly bytes: Buffer) {}

  getKey(): string {
    return 'harbourmesh-community-hazards-test.pmtiles';
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

const hazards: StoredCommunityHazard[] = [
  {
    id: 'raw-hazard-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'boat-node-1',
    type: 'debris',
    severity: 'medium',
    description: 'Floating log near the ferry lane',
    position: {
      latitude: 45.27,
      longitude: -66.06,
      accuracy: 25,
      source: 'gps',
      timestamp: '2026-05-06T12:00:00.000Z',
    },
    reportedAt: '2026-05-06T12:01:00.000Z',
    sharingState: 'shareable_blurred',
    consentCapturedAt: '2026-05-06T12:01:05.000Z',
    batchId: 'hazard-batch-1',
    storedAt: '2026-05-06T12:02:00.000Z',
    region: 'NB_PILOT',
    reviewStatus: 'accepted',
    publicOverlayEligible: true,
    reviewedAt: '2026-05-06T12:10:00.000Z',
    reviewedBy: 'nb-reviewer',
  },
  {
    id: 'pending-hazard-2',
    vesselId: 'vessel-2',
    sourceDeviceId: 'boat-node-2',
    type: 'shoal',
    severity: 'high',
    description: 'Pending shoal report',
    position: {
      latitude: 45.28,
      longitude: -66.05,
      accuracy: 15,
      source: 'manual',
      timestamp: '2026-05-06T12:20:00.000Z',
    },
    reportedAt: '2026-05-06T12:21:00.000Z',
    sharingState: 'shareable_blurred',
    consentCapturedAt: '2026-05-06T12:21:05.000Z',
    batchId: 'hazard-batch-2',
    storedAt: '2026-05-06T12:22:00.000Z',
    region: 'NB_PILOT',
    reviewStatus: 'pending',
    publicOverlayEligible: false,
  },
  {
    id: 'accepted-unpositioned-3',
    vesselId: 'vessel-3',
    type: 'weather',
    severity: 'low',
    description: 'Accepted without shared position',
    reportedAt: '2026-05-06T12:31:00.000Z',
    sharingState: 'shareable_no_position',
    consentCapturedAt: '2026-05-06T12:31:05.000Z',
    batchId: 'hazard-batch-3',
    storedAt: '2026-05-06T12:32:00.000Z',
    region: 'NB_PILOT',
    reviewStatus: 'accepted',
    publicOverlayEligible: false,
    reviewedAt: '2026-05-06T12:40:00.000Z',
  },
];

describe('community hazard artifacts', () => {
  it('builds public GeoJSON, MBTiles, and PMTiles without raw vessel/source IDs', async () => {
    const generatedAt = '2026-05-06T16:20:00.000Z';
    const artifacts = await buildCommunityHazardArtifacts(hazards, generatedAt);

    expect(artifacts.map((artifact) => artifact.format)).toEqual(['geojson', 'mbtiles', 'pmtiles']);
    expect(artifacts.every((artifact) => artifact.officialChartDataIncluded === false)).toBe(true);
    expect(artifacts.every((artifact) => artifact.rawRecordIdsIncluded === false)).toBe(true);
    expect(artifacts.every((artifact) => artifact.vesselIdsIncluded === false)).toBe(true);
    expect(artifacts.every((artifact) => artifact.sourceDeviceIdsIncluded === false)).toBe(true);

    const publicBytes = JSON.stringify(artifacts.map(({ bytes: _bytes, ...artifact }) => artifact));
    expect(publicBytes).not.toContain('raw-hazard-1');
    expect(publicBytes).not.toContain('pending-hazard-2');
    expect(publicBytes).not.toContain('accepted-unpositioned-3');
    expect(publicBytes).not.toContain('vessel-1');
    expect(publicBytes).not.toContain('boat-node-1');
    expect(publicBytes).toContain('Floating log near the ferry lane');

    const geojson = artifacts.find((artifact) => artifact.format === 'geojson');
    expect(geojson?.content?.features).toHaveLength(1);
    expect(geojson?.content?.metadata.sourceRecordCounts).toMatchObject({
      hazards: 3,
      publicHazards: 1,
      omittedPendingOrRejectedHazards: 1,
      omittedUnpositionedHazards: 1,
    });

    const mbtiles = artifacts.find((artifact) => artifact.format === 'mbtiles');
    expect(mbtiles?.bytes.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
    expect(mbtiles?.tileSummary).toMatchObject({
      layerName: 'harbourmesh_community_hazards',
      minZoom: 8,
      maxZoom: 12,
      tileCount: expect.any(Number),
    });

    const pmtiles = artifacts.find((artifact) => artifact.format === 'pmtiles');
    expect(pmtiles?.bytes.subarray(0, 7).toString('utf8')).toBe('PMTiles');
    expect(pmtiles?.tileSummary?.tileCount).toBeGreaterThan(0);

    const archive = new PMTiles(new BufferPmTilesSource(pmtiles!.bytes));
    const header = await archive.getHeader();
    const metadata = await archive.getMetadata() as {
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
    expect(metadata.vector_layers?.[0]?.id).toBe('harbourmesh_community_hazards');
    expect(firstTile?.byteLength).toBeGreaterThan(0);
  });

  it('marks vector tiles pending when there are no accepted positioned hazards', async () => {
    const manifest = await getCommunityHazardArtifactManifest([
      {
        ...hazards[1],
        reviewStatus: 'pending',
        publicOverlayEligible: false,
      },
    ], '2026-05-06T16:21:00.000Z');

    expect(manifest.artifacts.map((artifact) => artifact.format)).toEqual(['geojson']);
    expect(manifest.rules.vectorTileGenerationPending).toBe(true);
    expect(manifest.sourceRecordCounts).toMatchObject({
      hazards: 1,
      publicHazards: 0,
      omittedPendingOrRejectedHazards: 1,
    });
  });
});

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PMTiles, type Source } from 'pmtiles';
import { describe, expect, it } from 'vitest';
import {
  getNBPilotChartPackageArtifactManifest,
  writeNBPilotChartPackageArtifacts,
} from './chart-package-artifacts.js';
import type { NBPilotChartPackage } from './chart-catalog.js';

async function createArtifactDir(): Promise<string> {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  return mkdtemp(join(testRoot, 'nb-chart-artifacts-'));
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

class BufferPmTilesSource implements Source {
  constructor(private readonly bytes: Buffer) {}

  getKey(): string {
    return 'harbourmesh-test.pmtiles';
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
  bounds: NBPilotChartPackage['bounds'],
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

describe('NB chart package artifact writer', () => {
  it('writes compact GeoJSON, MBTiles, and PMTiles artifact files with checksum-matching bytes', async () => {
    const outputDir = await createArtifactDir();
    const generatedAt = '2026-05-06T13:00:00.000Z';
    const release = await writeNBPilotChartPackageArtifacts({ outputDir, generatedAt });

    expect(release).toMatchObject({
      id: 'nb-pilot-chart-package-artifact-release',
      schemaVersion: 'harbourmesh.chart-package-artifact-release.v1',
      generatedAt,
      rules: {
        officialChartDataExcluded: true,
        pmtilesGenerationPending: false,
        mbtilesGenerationPending: false,
      },
    });
    expect(release.artifacts).toHaveLength(6);
    expect(release.artifacts.filter((artifact) => artifact.format === 'mbtiles')).toHaveLength(2);
    expect(release.artifacts.filter((artifact) => artifact.format === 'pmtiles')).toHaveLength(2);

    for (const artifact of release.artifacts) {
      const fileContents = await readFile(join(outputDir, artifact.relativePath));
      expect(Buffer.byteLength(fileContents)).toBe(artifact.byteLength);
      expect(createHash('sha256').update(fileContents).digest('hex')).toBe(artifact.sha256);

      if (artifact.format === 'geojson') {
        expect(JSON.parse(fileContents.toString('utf8'))).toMatchObject({
          type: 'FeatureCollection',
          metadata: {
            referenceOnly: true,
            officialChartDataIncluded: false,
          },
        });
      } else if (artifact.format === 'mbtiles') {
        expect(fileContents.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
        expect(artifact.tileSummary).toMatchObject({
          layerName: 'harbourmesh_reference',
          minZoom: 6,
          tileCount: expect.any(Number),
        });
        expect(artifact.tileSummary?.tileCount).toBeGreaterThan(0);
      } else {
        expect(fileContents.subarray(0, 7).toString('utf8')).toBe('PMTiles');
        expect(artifact.mediaType).toBe('application/vnd.pmtiles');
        expect(artifact.tileSummary).toMatchObject({
          layerName: 'harbourmesh_reference',
          minZoom: 6,
          tileCount: expect.any(Number),
        });

        const archive = new PMTiles(new BufferPmTilesSource(fileContents));
        const header = await archive.getHeader();
        const metadata = await archive.getMetadata() as {
          name?: string;
          vector_layers?: Array<{ id: string }>;
        };
        const firstTile = await findFirstPmTilesVectorTile(
          archive,
          artifact.tileSummary!.bounds,
          artifact.tileSummary!.minZoom,
          artifact.tileSummary!.maxZoom
        );

        expect(header.specVersion).toBe(3);
        expect(header.tileType).toBe(1);
        expect(header.internalCompression).toBe(1);
        expect(header.tileCompression).toBe(1);
        expect(header.minZoom).toBe(artifact.tileSummary?.minZoom);
        expect(header.maxZoom).toBe(artifact.tileSummary?.maxZoom);
        expect(header.numTileEntries).toBe(artifact.tileSummary?.tileCount);
        expect(metadata.name).toBe(artifact.packageId);
        expect(metadata.vector_layers?.[0]?.id).toBe('harbourmesh_reference');
        expect(firstTile?.byteLength).toBeGreaterThan(0);
      }
    }
  });

  it('writes a release manifest without embedding duplicate artifact content', async () => {
    const outputDir = await createArtifactDir();
    const release = await writeNBPilotChartPackageArtifacts({
      outputDir,
      generatedAt: '2026-05-06T13:10:00.000Z',
    });
    const manifestContents = await readFile(join(outputDir, 'manifest.json'), 'utf8');
    const writtenManifest = JSON.parse(manifestContents);
    const apiManifest = await getNBPilotChartPackageArtifactManifest('2026-05-06T13:10:00.000Z');

    expect(writtenManifest.artifacts[0].content).toBeUndefined();
    expect(writtenManifest.artifacts.map((artifact: { id: string }) => artifact.id)).toEqual(
      apiManifest.artifacts.map((artifact) => artifact.id)
    );
    expect(writtenManifest.artifacts.every((artifact: { officialChartDataIncluded: boolean }) => (
      artifact.officialChartDataIncluded === false
    ))).toBe(true);
  });
});

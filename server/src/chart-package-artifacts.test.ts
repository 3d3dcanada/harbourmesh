import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getNBPilotChartPackageArtifactManifest,
  writeNBPilotChartPackageArtifacts,
} from './chart-package-artifacts.js';

async function createArtifactDir(): Promise<string> {
  const testRoot = join(process.cwd(), 'tmp');
  await mkdir(testRoot, { recursive: true });
  return mkdtemp(join(testRoot, 'nb-chart-artifacts-'));
}

describe('NB chart package artifact writer', () => {
  it('writes compact GeoJSON and MBTiles artifact files with checksum-matching bytes', async () => {
    const outputDir = await createArtifactDir();
    const generatedAt = '2026-05-06T13:00:00.000Z';
    const release = await writeNBPilotChartPackageArtifacts({ outputDir, generatedAt });

    expect(release).toMatchObject({
      id: 'nb-pilot-chart-package-artifact-release',
      schemaVersion: 'harbourmesh.chart-package-artifact-release.v1',
      generatedAt,
      rules: {
        officialChartDataExcluded: true,
        pmtilesGenerationPending: true,
        mbtilesGenerationPending: false,
      },
    });
    expect(release.artifacts).toHaveLength(4);
    expect(release.artifacts.filter((artifact) => artifact.format === 'mbtiles')).toHaveLength(2);

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
      } else {
        expect(fileContents.subarray(0, 15).toString('utf8')).toBe('SQLite format 3');
        expect(artifact.tileSummary).toMatchObject({
          layerName: 'harbourmesh_reference',
          minZoom: 6,
          tileCount: expect.any(Number),
        });
        expect(artifact.tileSummary?.tileCount).toBeGreaterThan(0);
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

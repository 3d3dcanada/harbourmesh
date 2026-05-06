import { describe, expect, it, vi } from 'vitest';
import {
  LOCAL_CHART_LIBRARY_STORAGE_KEY,
  addLocalChartReference,
  buildLocalChartReference,
  detectLocalChartFormat,
  forgetLocalChartReference,
  loadLocalChartLibrary,
} from './local-chart-library';

function createStorage(seed: Record<string, string> = {}) {
  const store = { ...seed };
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    store,
  };
}

describe('local chart library', () => {
  it('detects common local chart and package formats', () => {
    expect(detectLocalChartFormat('CA376012.000')).toBe('s57-enc');
    expect(detectLocalChartFormat('CA376012.001')).toBe('s57-enc');
    expect(detectLocalChartFormat('NB-harbour.KAP')).toBe('bsb-rnc');
    expect(detectLocalChartFormat('planning.pdf')).toBe('pdf-chart');
    expect(detectLocalChartFormat('reference.pmtiles')).toBe('pmtiles');
    expect(detectLocalChartFormat('reference.mbtiles')).toBe('mbtiles');
    expect(detectLocalChartFormat('reference.geojson')).toBe('geojson');
    expect(detectLocalChartFormat('notes.txt')).toBe('unknown');
  });

  it('builds metadata-only local chart references with closed sharing policy', () => {
    const reference = buildLocalChartReference({
      name: 'CA376012.000',
      size: 123456,
      lastModified: Date.parse('2026-05-01T10:00:00.000Z'),
    }, {
      id: 'chart-1',
      addedAt: '2026-05-06T16:00:00.000Z',
    });

    expect(reference).toMatchObject({
      id: 'chart-1',
      fileName: 'CA376012.000',
      fileExtension: '000',
      byteLength: 123456,
      lastModified: '2026-05-01T10:00:00.000Z',
      addedAt: '2026-05-06T16:00:00.000Z',
      format: 's57-enc',
      source: 'user_supplied_local_chart',
      policy: {
        localOnly: true,
        fileBytesStoredByHarbourMesh: false,
        uploadToCommunityMeshAllowed: false,
        sharedTileGenerationAllowed: false,
        requiresSeparateLicenceForSharing: true,
      },
    });
    expect(reference).not.toHaveProperty('contents');
    expect(reference).not.toHaveProperty('path');
  });

  it('persists, de-duplicates, and forgets local chart metadata only', () => {
    const storage = createStorage();
    addLocalChartReference({
      name: 'CA376012.000',
      size: 100,
      lastModified: Date.parse('2026-05-01T10:00:00.000Z'),
    }, storage, {
      id: 'chart-1',
      addedAt: '2026-05-06T16:00:00.000Z',
    });
    addLocalChartReference({
      name: 'CA376012.000',
      size: 200,
      lastModified: Date.parse('2026-05-02T10:00:00.000Z'),
    }, storage, {
      id: 'chart-2',
      addedAt: '2026-05-06T17:00:00.000Z',
    });

    const saved = loadLocalChartLibrary(storage);
    expect(saved.charts).toHaveLength(1);
    expect(saved.charts[0]).toMatchObject({ id: 'chart-2', byteLength: 200 });
    expect(storage.store[LOCAL_CHART_LIBRARY_STORAGE_KEY]).not.toContain('officialChartBytes');

    const afterForget = forgetLocalChartReference('chart-2', storage, '2026-05-06T18:00:00.000Z');
    expect(afterForget.charts).toEqual([]);
    expect(loadLocalChartLibrary(storage).charts).toEqual([]);
  });

  it('drops malformed or unsafe saved chart references', () => {
    const storage = createStorage({
      [LOCAL_CHART_LIBRARY_STORAGE_KEY]: JSON.stringify({
        schemaVersion: 'harbourmesh.local-chart-library.v1',
        updatedAt: '2026-05-06T16:00:00.000Z',
        charts: [
          {
            id: 'chart-1',
            fileName: 'unsafe.000',
            fileExtension: '000',
            byteLength: 10,
            addedAt: '2026-05-06T16:00:00.000Z',
            format: 's57-enc',
            source: 'user_supplied_local_chart',
            policy: {
              localOnly: false,
              fileBytesStoredByHarbourMesh: true,
              uploadToCommunityMeshAllowed: true,
              sharedTileGenerationAllowed: true,
              requiresSeparateLicenceForSharing: false,
            },
          },
        ],
      }),
    });

    expect(loadLocalChartLibrary(storage).charts).toEqual([]);
  });

  it('falls back to an empty library when saved JSON is corrupted', () => {
    const storage = createStorage({
      [LOCAL_CHART_LIBRARY_STORAGE_KEY]: '{bad-json',
    });

    expect(loadLocalChartLibrary(storage)).toMatchObject({
      schemaVersion: 'harbourmesh.local-chart-library.v1',
      charts: [],
    });
  });
});

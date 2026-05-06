import { describe, expect, it, vi } from 'vitest';
import {
  fetchNBPilotChartPackageArtifacts,
  fetchNBPilotChartPackageManifest,
  fetchNBPilotChartCatalog,
  getCommunitySafeChartSources,
  getOfflineReadyChartPackages,
  getLocalOnlyOfficialChartSources,
  type NBPilotChartPackageArtifactManifest,
  type NBPilotChartCatalog,
  type NBPilotChartPackageManifest,
} from './chart-catalog';

const catalog: NBPilotChartCatalog = {
  id: 'nb-pilot-chart-catalog',
  schemaVersion: 'harbourmesh.chart-catalog.v1',
  generatedAt: '2026-05-06T12:10:00.000Z',
  bounds: {
    south: 44.47,
    west: -67.15,
    north: 48.08,
    east: -63.66,
  },
  sources: [
    {
      id: 'geonb-nbhn-watercourse',
      label: 'GeoNB NBHN watercourses',
      kind: 'wms',
      purpose: 'hydrography',
      region: 'NB_PILOT',
      sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Watercourse/MapServer',
      serviceUrl: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Watercourse/MapServer/WMSServer',
      layer: '0',
      attribution: 'GeoNB',
      status: 'active',
      sharePolicy: {
        handling: 'shareable-reference',
        mayUploadToCommunityMesh: true,
        mayCreateSharedTiles: true,
        requiresSeparateLicence: false,
      },
    },
    {
      id: 'chs-official-digital-products',
      label: 'CHS official digital nautical products',
      kind: 'licence-boundary',
      purpose: 'official-navigation-boundary',
      region: 'NB_PILOT',
      sourceUrl: 'https://www.charts.gc.ca/copyright-droitdauteur/eula-aluf-eng.html',
      attribution: 'Canadian Hydrographic Service',
      status: 'licence-boundary',
      sharePolicy: {
        handling: 'local-only-official',
        mayUploadToCommunityMesh: false,
        mayCreateSharedTiles: false,
        requiresSeparateLicence: true,
      },
    },
  ],
  rules: {
    officialChartDataMustRemainLocal: true,
    communityProductsAreReferenceOnly: true,
    nonNavigationalBathymetryMustBeLabelled: true,
  },
};

const packageManifest: NBPilotChartPackageManifest = {
  id: 'nb-pilot-chart-packages',
  schemaVersion: 'harbourmesh.chart-packages.v1',
  generatedAt: '2026-05-06T12:15:00.000Z',
  packages: [
    {
      id: 'nb-coast-reference',
      label: 'NB coast reference package',
      region: 'NB_PILOT',
      intendedUse: 'reference_only',
      status: 'planned',
      bounds: catalog.bounds,
      minZoom: 6,
      maxZoom: 15,
      formats: ['pmtiles', 'mbtiles', 'geojson'],
      sourceIds: ['geonb-nbhn-watercourse'],
      excludedSourceIds: ['chs-official-digital-products'],
      communityOverlayIncluded: true,
      officialChartDataIncluded: false,
      estimatedSizeMb: null,
      generatedAt: null,
      warnings: ['Manifest only'],
    },
    {
      id: 'nb-ready-reference',
      label: 'NB ready reference package',
      region: 'NB_PILOT',
      intendedUse: 'reference_only',
      status: 'ready',
      bounds: catalog.bounds,
      minZoom: 6,
      maxZoom: 15,
      formats: ['pmtiles'],
      sourceIds: ['geonb-nbhn-watercourse'],
      excludedSourceIds: ['chs-official-digital-products'],
      communityOverlayIncluded: true,
      officialChartDataIncluded: false,
      estimatedSizeMb: 12,
      generatedAt: '2026-05-06T12:14:00.000Z',
      warnings: [],
    },
  ],
  rules: {
    packagesAreReferenceOnly: true,
    officialChartDataExcluded: true,
    requiresRegenerationBeforeOfflineUse: true,
  },
};

const artifactManifest: NBPilotChartPackageArtifactManifest = {
  id: 'nb-pilot-chart-package-artifacts',
  schemaVersion: 'harbourmesh.chart-package-artifacts.v1',
  generatedAt: '2026-05-06T12:16:00.000Z',
  artifacts: [
    {
      id: 'artifact:nb-coast-reference:geojson',
      packageId: 'nb-coast-reference',
      region: 'NB_PILOT',
      format: 'geojson',
      mediaType: 'application/geo+json',
      fileName: 'nb-coast-reference.geojson',
      byteLength: 512,
      sha256: 'a'.repeat(64),
      generatedAt: '2026-05-06T12:16:00.000Z',
      officialChartDataIncluded: false,
      sourceIds: ['geonb-nbhn-watercourse'],
      excludedSourceIds: ['chs-official-digital-products'],
      warnings: ['GeoJSON reference artifact'],
      sourceFeatureCount: 3,
      sourceFeatureSummaries: [{
        sourceId: 'geonb-nbhn-watercourse',
        sourceLabel: 'GeoNB NBHN watercourses',
        fetchedFeatureCount: 3,
        maxFeatures: 10,
        truncated: false,
      }],
      content: {
        type: 'FeatureCollection',
        metadata: {
          schemaVersion: 'harbourmesh.chart-package-artifact-content.v1',
          officialChartDataIncluded: false,
          referenceOnly: true,
          sourceFeatureCount: 3,
        },
      },
    },
    {
      id: 'artifact:nb-coast-reference:mbtiles',
      packageId: 'nb-coast-reference',
      region: 'NB_PILOT',
      format: 'mbtiles',
      mediaType: 'application/x-sqlite3',
      fileName: 'nb-coast-reference.mbtiles',
      byteLength: 4096,
      sha256: 'b'.repeat(64),
      generatedAt: '2026-05-06T12:16:00.000Z',
      officialChartDataIncluded: false,
      sourceIds: ['geonb-nbhn-watercourse'],
      excludedSourceIds: ['chs-official-digital-products'],
      warnings: ['MBTiles reference artifact'],
      sourceFeatureCount: 3,
      sourceFeatureSummaries: [{
        sourceId: 'geonb-nbhn-watercourse',
        sourceLabel: 'GeoNB NBHN watercourses',
        fetchedFeatureCount: 3,
        maxFeatures: 10,
        truncated: false,
      }],
      tileSummary: {
        layerName: 'harbourmesh_reference',
        minZoom: 6,
        maxZoom: 8,
        tileCount: 7,
        bounds: {
          south: 44.47,
          west: -67.15,
          north: 47.25,
          east: -63.66,
        },
      },
    },
    {
      id: 'artifact:nb-coast-reference:pmtiles',
      packageId: 'nb-coast-reference',
      region: 'NB_PILOT',
      format: 'pmtiles',
      mediaType: 'application/vnd.pmtiles',
      fileName: 'nb-coast-reference.pmtiles',
      byteLength: 8192,
      sha256: 'c'.repeat(64),
      generatedAt: '2026-05-06T12:16:00.000Z',
      officialChartDataIncluded: false,
      sourceIds: ['geonb-nbhn-watercourse'],
      excludedSourceIds: ['chs-official-digital-products'],
      warnings: ['PMTiles reference artifact'],
      sourceFeatureCount: 3,
      sourceFeatureSummaries: [{
        sourceId: 'geonb-nbhn-watercourse',
        sourceLabel: 'GeoNB NBHN watercourses',
        fetchedFeatureCount: 3,
        maxFeatures: 10,
        truncated: false,
      }],
      tileSummary: {
        layerName: 'harbourmesh_reference',
        minZoom: 6,
        maxZoom: 8,
        tileCount: 7,
        bounds: {
          south: 44.47,
          west: -67.15,
          north: 47.25,
          east: -63.66,
        },
      },
    },
  ],
  rules: {
    artifactsAreReferenceOnly: true,
    officialChartDataExcluded: true,
    pmtilesGenerationPending: false,
    mbtilesGenerationPending: false,
  },
};

describe('NB pilot chart catalog client', () => {
  it('fetches and validates the chart catalog API response', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(catalog), { status: 200 }));

    await expect(fetchNBPilotChartCatalog({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      id: 'nb-pilot-chart-catalog',
      rules: {
        officialChartDataMustRemainLocal: true,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/charts/nb/catalog', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('separates community-safe sources from official local-only sources', () => {
    expect(getCommunitySafeChartSources(catalog).map((source) => source.id)).toEqual(['geonb-nbhn-watercourse']);
    expect(getLocalOnlyOfficialChartSources(catalog).map((source) => source.id)).toEqual(['chs-official-digital-products']);
  });

  it('fetches and validates the NB chart package manifest', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(packageManifest), { status: 200 }));

    await expect(fetchNBPilotChartPackageManifest({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      id: 'nb-pilot-chart-packages',
      rules: {
        officialChartDataExcluded: true,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/charts/nb/packages', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('fetches and validates generated NB chart package artifacts', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(artifactManifest), { status: 200 }));

    await expect(fetchNBPilotChartPackageArtifacts({
      apiBaseUrl: 'http://localhost:3001',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).resolves.toMatchObject({
      id: 'nb-pilot-chart-package-artifacts',
      rules: {
        officialChartDataExcluded: true,
        pmtilesGenerationPending: false,
        mbtilesGenerationPending: false,
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:3001/api/charts/nb/package-artifacts', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('lists only ready offline chart packages', () => {
    expect(getOfflineReadyChartPackages(packageManifest).map((chartPackage) => chartPackage.id)).toEqual([
      'nb-ready-reference',
    ]);
  });

  it('rejects malformed catalog responses', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(fetchNBPilotChartCatalog({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Chart catalog response was not a HarbourMesh NB catalog');
  });

  it('rejects package manifests that include official chart data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...packageManifest,
      packages: [
        {
          ...packageManifest.packages[0],
          officialChartDataIncluded: true,
        },
      ],
    }), { status: 200 }));

    await expect(fetchNBPilotChartPackageManifest({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Chart package response was not a HarbourMesh NB package manifest');
  });

  it('rejects package artifacts that include official chart data', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      ...artifactManifest,
      artifacts: [
        {
          ...artifactManifest.artifacts[0],
          officialChartDataIncluded: true,
        },
      ],
    }), { status: 200 }));

    await expect(fetchNBPilotChartPackageArtifacts({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })).rejects.toThrow('Chart package artifact response was not a HarbourMesh NB artifact manifest');
  });
});

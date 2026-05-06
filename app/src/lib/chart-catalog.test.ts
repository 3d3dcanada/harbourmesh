import { describe, expect, it, vi } from 'vitest';
import {
  fetchNBPilotChartPackageManifest,
  fetchNBPilotChartCatalog,
  getCommunitySafeChartSources,
  getOfflineReadyChartPackages,
  getLocalOnlyOfficialChartSources,
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
});

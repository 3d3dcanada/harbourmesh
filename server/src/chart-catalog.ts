export type ChartSourceKind = 'wms' | 'portal' | 'licence-boundary';
export type ChartSourcePurpose =
  | 'base-reference'
  | 'hydrography'
  | 'bathymetry-reference'
  | 'official-navigation-boundary';

export type ChartSourceSharePolicy = {
  handling: 'shareable-reference' | 'non-navigational-reference' | 'local-only-official';
  mayUploadToCommunityMesh: boolean;
  mayCreateSharedTiles: boolean;
  requiresSeparateLicence: boolean;
};

export type NBPilotChartSource = {
  id: string;
  label: string;
  kind: ChartSourceKind;
  purpose: ChartSourcePurpose;
  region: 'NB_PILOT';
  sourceUrl: string;
  serviceUrl?: string;
  layer?: string;
  attribution: string;
  status: 'active' | 'licence-boundary';
  sharePolicy: ChartSourceSharePolicy;
};

export type NBPilotChartCatalog = {
  id: 'nb-pilot-chart-catalog';
  schemaVersion: 'harbourmesh.chart-catalog.v1';
  generatedAt: string;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  sources: NBPilotChartSource[];
  rules: {
    officialChartDataMustRemainLocal: boolean;
    communityProductsAreReferenceOnly: boolean;
    nonNavigationalBathymetryMustBeLabelled: boolean;
  };
};

export type ChartPackageFormat = 'pmtiles' | 'mbtiles' | 'geojson';
export type ChartPackageStatus = 'planned' | 'generating' | 'ready';

export type NBPilotChartPackage = {
  id: string;
  label: string;
  region: 'NB_PILOT';
  intendedUse: 'reference_only';
  status: ChartPackageStatus;
  bounds: NBPilotChartCatalog['bounds'];
  minZoom: number;
  maxZoom: number;
  formats: ChartPackageFormat[];
  sourceIds: string[];
  excludedSourceIds: string[];
  communityOverlayIncluded: boolean;
  officialChartDataIncluded: false;
  estimatedSizeMb: number | null;
  generatedAt: string | null;
  warnings: string[];
};

export type NBPilotChartPackageManifest = {
  id: 'nb-pilot-chart-packages';
  schemaVersion: 'harbourmesh.chart-packages.v1';
  generatedAt: string;
  packages: NBPilotChartPackage[];
  rules: {
    packagesAreReferenceOnly: boolean;
    officialChartDataExcluded: boolean;
    requiresRegenerationBeforeOfflineUse: boolean;
  };
};

const SHAREABLE_REFERENCE_POLICY: ChartSourceSharePolicy = {
  handling: 'shareable-reference',
  mayUploadToCommunityMesh: true,
  mayCreateSharedTiles: true,
  requiresSeparateLicence: false,
};

const NON_NAVIGATIONAL_REFERENCE_POLICY: ChartSourceSharePolicy = {
  handling: 'non-navigational-reference',
  mayUploadToCommunityMesh: true,
  mayCreateSharedTiles: true,
  requiresSeparateLicence: false,
};

const LOCAL_ONLY_OFFICIAL_POLICY: ChartSourceSharePolicy = {
  handling: 'local-only-official',
  mayUploadToCommunityMesh: false,
  mayCreateSharedTiles: false,
  requiresSeparateLicence: true,
};

export const NB_PILOT_CHART_SOURCES: NBPilotChartSource[] = [
  {
    id: 'geonb-nbhn-waterbody',
    label: 'GeoNB NBHN waterbodies',
    kind: 'wms',
    purpose: 'hydrography',
    region: 'NB_PILOT',
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Waterbody/MapServer',
    serviceUrl: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Waterbody/MapServer/WMSServer',
    layer: '0',
    attribution: 'GeoNB',
    status: 'active',
    sharePolicy: SHAREABLE_REFERENCE_POLICY,
  },
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
    sharePolicy: SHAREABLE_REFERENCE_POLICY,
  },
  {
    id: 'geonb-nbhn-coast-lines',
    label: 'GeoNB NBHN coast lines',
    kind: 'wms',
    purpose: 'base-reference',
    region: 'NB_PILOT',
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/NBHN_Coast_Lines/MapServer',
    serviceUrl: 'https://gis-erd-der.gnb.ca/server/services/OpenData/NBHN_Coast_Lines/MapServer/WMSServer',
    layer: '0',
    attribution: 'GeoNB',
    status: 'active',
    sharePolicy: SHAREABLE_REFERENCE_POLICY,
  },
  {
    id: 'geonb-lake-depth-bathymetry-points',
    label: 'GeoNB lake depth points',
    kind: 'wms',
    purpose: 'bathymetry-reference',
    region: 'NB_PILOT',
    sourceUrl: 'https://gis-erd-der.gnb.ca/server/rest/services/OpenData/Lake_Depth_Bathymetry_Points/MapServer',
    serviceUrl: 'https://gis-erd-der.gnb.ca/server/services/OpenData/Lake_Depth_Bathymetry_Points/MapServer/WMSServer',
    layer: '0',
    attribution: 'GeoNB',
    status: 'active',
    sharePolicy: SHAREABLE_REFERENCE_POLICY,
  },
  {
    id: 'chs-nonna',
    label: 'CHS NONNA non-navigational bathymetry',
    kind: 'portal',
    purpose: 'bathymetry-reference',
    region: 'NB_PILOT',
    sourceUrl: 'https://www.chs.gc.ca/data-gestion/nonna/index-eng.html',
    attribution: 'Canadian Hydrographic Service',
    status: 'active',
    sharePolicy: NON_NAVIGATIONAL_REFERENCE_POLICY,
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
    sharePolicy: LOCAL_ONLY_OFFICIAL_POLICY,
  },
];

export function getNBPilotChartCatalog(generatedAt = new Date().toISOString()): NBPilotChartCatalog {
  return {
    id: 'nb-pilot-chart-catalog',
    schemaVersion: 'harbourmesh.chart-catalog.v1',
    generatedAt,
    bounds: {
      south: 44.47,
      west: -67.15,
      north: 48.08,
      east: -63.66,
    },
    sources: NB_PILOT_CHART_SOURCES,
    rules: {
      officialChartDataMustRemainLocal: true,
      communityProductsAreReferenceOnly: true,
      nonNavigationalBathymetryMustBeLabelled: true,
    },
  };
}

function buildReferencePackage(config: {
  id: string;
  label: string;
  bounds: NBPilotChartCatalog['bounds'];
  sourceIds: string[];
}): NBPilotChartPackage {
  const officialSourceIds = NB_PILOT_CHART_SOURCES
    .filter((source) => source.sharePolicy.handling === 'local-only-official')
    .map((source) => source.id);

  return {
    id: config.id,
    label: config.label,
    region: 'NB_PILOT',
    intendedUse: 'reference_only',
    status: 'planned',
    bounds: config.bounds,
    minZoom: 6,
    maxZoom: 15,
    formats: ['pmtiles', 'mbtiles', 'geojson'],
    sourceIds: config.sourceIds,
    excludedSourceIds: officialSourceIds,
    communityOverlayIncluded: true,
    officialChartDataIncluded: false,
    estimatedSizeMb: null,
    generatedAt: null,
    warnings: [
      'Package manifest only; tile artifacts must be generated from eligible sources before offline use.',
      'Official CHS digital chart products are excluded unless a separate licence authorizes packaging.',
    ],
  };
}

export function getNBPilotChartPackageManifest(
  generatedAt = new Date().toISOString()
): NBPilotChartPackageManifest {
  const catalog = getNBPilotChartCatalog(generatedAt);
  const eligibleSourceIds = catalog.sources
    .filter((source) => source.sharePolicy.mayCreateSharedTiles)
    .map((source) => source.id);

  return {
    id: 'nb-pilot-chart-packages',
    schemaVersion: 'harbourmesh.chart-packages.v1',
    generatedAt,
    packages: [
      buildReferencePackage({
        id: 'nb-coast-reference',
        label: 'NB coast reference package',
        bounds: {
          south: 44.47,
          west: -67.15,
          north: 47.25,
          east: -63.66,
        },
        sourceIds: eligibleSourceIds.filter((sourceId) => sourceId !== 'geonb-lake-depth-bathymetry-points'),
      }),
      buildReferencePackage({
        id: 'nb-inland-waterways-reference',
        label: 'NB inland waterways reference package',
        bounds: {
          south: 45.0,
          west: -68.0,
          north: 48.1,
          east: -64.2,
        },
        sourceIds: eligibleSourceIds,
      }),
    ],
    rules: {
      packagesAreReferenceOnly: true,
      officialChartDataExcluded: true,
      requiresRegenerationBeforeOfflineUse: true,
    },
  };
}

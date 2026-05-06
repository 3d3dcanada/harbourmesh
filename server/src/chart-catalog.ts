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

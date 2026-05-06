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

export type FetchNBPilotChartCatalogOptions = {
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
};

function resolveEndpoint(endpoint: string, apiBaseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (!apiBaseUrl) return endpoint;

  return `${apiBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
}

function isChartCatalog(value: unknown): value is NBPilotChartCatalog {
  const catalog = value as Partial<NBPilotChartCatalog>;
  return (
    catalog.id === 'nb-pilot-chart-catalog' &&
    catalog.schemaVersion === 'harbourmesh.chart-catalog.v1' &&
    typeof catalog.generatedAt === 'string' &&
    typeof catalog.bounds === 'object' &&
    Array.isArray(catalog.sources) &&
    catalog.sources.every((source) => (
      typeof source.id === 'string' &&
      typeof source.label === 'string' &&
      typeof source.sourceUrl === 'string' &&
      typeof source.sharePolicy?.mayUploadToCommunityMesh === 'boolean'
    ))
  );
}

export function getCommunitySafeChartSources(catalog: NBPilotChartCatalog): NBPilotChartSource[] {
  return catalog.sources.filter((source) => source.sharePolicy.mayUploadToCommunityMesh);
}

export function getLocalOnlyOfficialChartSources(catalog: NBPilotChartCatalog): NBPilotChartSource[] {
  return catalog.sources.filter((source) => source.sharePolicy.handling === 'local-only-official');
}

export async function fetchNBPilotChartCatalog(
  options: FetchNBPilotChartCatalogOptions = {}
): Promise<NBPilotChartCatalog> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = resolveEndpoint('/api/charts/nb/catalog', options.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL);
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? String(body.error) : response.statusText;
    throw new Error(error || `Chart catalog request failed with HTTP ${response.status}`);
  }

  if (!isChartCatalog(body)) {
    throw new Error('Chart catalog response was not a HarbourMesh NB catalog');
  }

  return body;
}
